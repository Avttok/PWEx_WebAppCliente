import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Histórico de percurso traçado pelas ruas.
 * Os pings chegam de tempos em tempos (45 s em corrida, minutos procurando corrida), então
 * a linha reta entre eles corta quarteirões. Aqui cada registro é casado com o mapa de ruas
 * (OSRM "match"), em trechos de até 50 pings; cada trecho fica guardado (trechos_ajustados)
 * e o app e o site reaproveitam. Sem resposta do mapa, o trecho fica com os próprios pings.
 *
 * Mesmo arquivo nos dois sites (gestor e cliente).
 */

const OSRM = "https://router.project-osrm.org";
const VERSAO = "v1";
const TAM_TRECHO = 50;
const LACUNA_MS = 20 * 60_000;
const MAX_TRECHOS_NOVOS = 30;

/** [motoboy, lat, lng, status, corrida, ms, precisão] — como o banco devolve. */
export type PingBruto = [string, number, number, string, string | null, number, number];
interface Legado { motoboy: string; corrida: string; trajeto: string; ini: number; fim: number }
export interface Ajuste { ate: number; caminho: [number, number][] }
export interface RespostaPercursos {
  pings: PingBruto[];
  /** chave "motoboy|inicioMs" de cada registro → caminho pelas ruas até o ping `ate` (ms). */
  ajustes: Record<string, Ajuste>;
  /** Linha única (lat, lng) de tudo, na ordem: útil para a trilha de uma corrida. */
  linha: [number, number][];
  /** Faltou ajustar algum trecho (o mapa demorou): vale pedir de novo daqui a pouco. */
  parcial: boolean;
}

const valida = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

function metros(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
const comprimento = (l: [number, number][]) => l.slice(1).reduce((s, p, i) => s + metros(l[i], p), 0);

function decodificar(s: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < s.length) {
    for (const k of [0, 1]) {
      let b, sh = 0, r = 0;
      do { b = s.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20 && i < s.length);
      const d = r & 1 ? ~(r >> 1) : r >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

/** Corrida compactada antes de guardarmos os pings: vira pings com horários distribuídos. */
function pingsDoLegado(l: Legado): PingBruto[] {
  const pts = decodificar(l.trajeto).filter(([a, b]) => valida(a, b));
  const passo = pts.length > 1 ? (l.fim - l.ini) / (pts.length - 1) : 0;
  return pts.map(([a, b], k) => [l.motoboy, a, b, "em_corrida", l.corrida, Math.round(l.ini + k * passo), 0]);
}

/** Mesma separação do app e do site: muda de status, de corrida ou fica 20 min sem ping. */
function registros(pings: PingBruto[]) {
  const out: PingBruto[][] = [];
  let atual: PingBruto[] | null = null;
  let tipo = "", corrida: string | null = null, ant = 0;
  for (const p of pings) {
    if (p[3] === "offline") { atual = null; continue; }
    const t = p[3] === "em_corrida" ? "corrida" : "procurando";
    const c = t === "corrida" ? p[4] ?? null : null;
    if (!atual || tipo !== t || corrida !== c || p[5] - ant > LACUNA_MS) { atual = []; out.push(atual); tipo = t; corrida = c; }
    atual.push(p); ant = p[5];
  }
  return out;
}

/** Tira o "tremido" de quem está parado: pula pings a menos de 15 m do último usado. */
function enxugar(pts: PingBruto[]) {
  const out: PingBruto[] = [];
  for (const p of pts) {
    const u = out[out.length - 1];
    if (u && metros([u[1], u[2]], [p[1], p[2]]) < 15) continue;
    if (u && p[6] > 120 && pts.length > 2) continue; // leitura ruim demais
    out.push(p);
  }
  const ult = pts[pts.length - 1];
  if (ult && out[out.length - 1] !== ult && out.length > 0 && metros([out[out.length - 1][1], out[out.length - 1][2]], [ult[1], ult[2]]) >= 15) out.push(ult);
  return out;
}

async function pedir(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "PWExpress (pwexpress.vercel.app)" }, signal: AbortSignal.timeout(7000), cache: "no-store" });
    if (!r.ok && r.status !== 400) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch { return null; }
}

/** Casa um trecho com as ruas. null = o mapa não respondeu (tenta de novo depois); [] = não deu (fica com os pings). */
async function casar(pts: PingBruto[]): Promise<[number, number][] | null> {
  const crus = pts.map((p) => [p[1], p[2]] as [number, number]);
  if (comprimento(crus) < 60) return [];
  const coords = pts.map((p) => `${p[2].toFixed(6)},${p[1].toFixed(6)}`).join(";");
  const ts: number[] = [];
  for (const p of pts) ts.push(Math.max(Math.round(p[5] / 1000), (ts[ts.length - 1] ?? 0) + 1));
  const raios = pts.map((p) => Math.min(60, Math.max(25, Math.round((p[6] || 20) * 1.5)))).join(";");
  const j = await pedir(`${OSRM}/match/v1/driving/${coords}?overview=full&geometries=geojson&gaps=ignore&tidy=true&timestamps=${ts.join(";")}&radiuses=${raios}`);
  if (!j) return null;
  let linha: [number, number][] = [];
  if (j.code === "Ok" && Array.isArray(j.matchings)) {
    for (const m of j.matchings as { geometry?: { coordinates?: [number, number][] } }[]) {
      for (const [lng, lat] of m.geometry?.coordinates ?? []) linha.push([+lat.toFixed(6), +lng.toFixed(6)]);
    }
  }
  if (linha.length < 2) {
    // sem casamento: a rota pelas ruas passando pelos pings (até 25 por vez)
    linha = [];
    for (let i = 0; i < pts.length - 1; i += 24) {
      const parte = pts.slice(i, i + 25);
      const r = await pedir(`${OSRM}/route/v1/driving/${parte.map((p) => `${p[2].toFixed(6)},${p[1].toFixed(6)}`).join(";")}?overview=full&geometries=geojson`);
      const cs = (r?.code === "Ok" ? (r.routes as { geometry: { coordinates: [number, number][] } }[])[0]?.geometry.coordinates : null);
      if (!cs) return r ? [] : null;
      for (const [lng, lat] of cs) linha.push([+lat.toFixed(6), +lng.toFixed(6)]);
    }
  }
  // traçado absurdo (desvio enorme perto do que os pings mostram): melhor ficar com os pings
  const real = comprimento(crus), casado = comprimento(linha);
  if (casado > real * 2.6 + 800) return [];
  return linha;
}

const chaveTrecho = (pts: PingBruto[]) => `${pts[0][0]}|${pts[0][5]}|${pts[pts.length - 1][5]}|${pts.length}|${VERSAO}`;

/** Monta a resposta: pings (com os das corridas antigas) e o caminho de cada registro pelas ruas. */
export async function montarPercursos(sb: SupabaseClient, dados: { pings?: PingBruto[]; legado?: Legado[] }, ajustar = true): Promise<RespostaPercursos> {
  const pings = [...(dados.pings ?? []), ...(dados.legado ?? []).flatMap(pingsDoLegado)]
    .filter((p) => valida(p[1], p[2]))
    .sort((a, b) => (a[0] === b[0] ? a[5] - b[5] : a[0] < b[0] ? -1 : 1));
  const porMotoboy = new Map<string, PingBruto[]>();
  for (const p of pings) { const l = porMotoboy.get(p[0]); if (l) l.push(p); else porMotoboy.set(p[0], [p]); }

  // cada registro em trechos (o último ping de um é o primeiro do próximo)
  const regs = [...porMotoboy.values()].flatMap(registros).filter((r) => r.length >= 2);
  const trechosDe = regs.map((r) => {
    const e = enxugar(r);
    const t: PingBruto[][] = [];
    for (let i = 0; i < e.length - 1; i += TAM_TRECHO - 1) t.push(e.slice(i, i + TAM_TRECHO));
    return t.filter((x) => x.length >= 2);
  });

  const todas = trechosDe.flat().map(chaveTrecho);
  const guardados: Record<string, [number, number][]> = {};
  for (let i = 0; ajustar && i < todas.length; i += 300) {
    const { data } = await sb.rpc("ler_trechos", { p_chaves: todas.slice(i, i + 300) });
    Object.assign(guardados, (data ?? {}) as Record<string, [number, number][]>);
  }

  let parcial = false;
  const faltam = ajustar ? trechosDe.flat().filter((t) => !(chaveTrecho(t) in guardados)) : [];
  if (faltam.length > MAX_TRECHOS_NOVOS) parcial = true;
  const novos: { chave: string; motoboy: string; caminho: [number, number][] }[] = [];
  const fila = faltam.slice(-MAX_TRECHOS_NOVOS).reverse(); // os mais recentes primeiro (é o que se olha)
  const prazo = Date.now() + 18_000; // responde a tempo (o app espera até 30 s); o resto fica para a próxima
  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let t = fila.shift(); t; t = fila.shift()) {
      if (Date.now() > prazo) { parcial = true; break; }
      const c = await casar(t);
      if (c == null) { parcial = true; continue; }
      const chave = chaveTrecho(t);
      guardados[chave] = c;
      // o último trecho de um registro ainda em andamento muda: guarda só os trechos cheios
      if (t.length === TAM_TRECHO || Date.now() - t[t.length - 1][5] > 30 * 60_000) novos.push({ chave, motoboy: t[0][0], caminho: c });
    }
  }));
  if (novos.length) await sb.rpc("guardar_trechos", { p_itens: novos });

  const ajustes: Record<string, Ajuste> = {};
  const linha: [number, number][] = [];
  regs.forEach((r, i) => {
    const partes = trechosDe[i].map((t) => {
      const c = guardados[chaveTrecho(t)];
      return c && c.length >= 2 ? c : t.map((p) => [p[1], p[2]] as [number, number]);
    });
    const caminho = partes.flat();
    const final = trechosDe[i].length ? trechosDe[i][trechosDe[i].length - 1] : r;
    if (caminho.length >= 2 && partes.some((_, k) => (guardados[chaveTrecho(trechosDe[i][k])]?.length ?? 0) >= 2)) {
      ajustes[`${r[0][0]}|${r[0][5]}`] = { ate: final[final.length - 1][5], caminho };
    }
    const ultimo = final[final.length - 1][5];
    linha.push(...(caminho.length >= 2 ? caminho : r.map((p) => [p[1], p[2]] as [number, number])));
    // pings depois do último usado no caminho (ex.: parado no fim) entram crus
    for (const p of r) if (p[5] > ultimo) linha.push([p[1], p[2]]);
  });
  return { pings, ajustes, linha, parcial };
}
