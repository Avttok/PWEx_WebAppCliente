"use client";

import type { Map as Mapa, GeoJSONSource } from "maplibre-gl";

/** Um ping do motoboy (tabela localizacoes). */
export interface Ping { lat: number; lng: number; status: string; corrida_id?: string | null; registrado_em: string }

/**
 * Registro = um trecho contínuo do dia: "procurando" (disponível até aceitar) ou "corrida"
 * (a corrida inteira). Começa de novo ao mudar de status, de corrida, ou após 20 min sem ping.
 */
export interface Registro { tipo: "procurando" | "corrida"; corridaId: string | null; pontos: Ping[]; inicio: string; fim: string }

const LACUNA_MS = 20 * 60_000;

export function separarRegistros(pings: Ping[]): Registro[] {
  const ord = [...pings].sort((a, b) => a.registrado_em.localeCompare(b.registrado_em));
  const out: Registro[] = [];
  let atual: Registro | null = null;
  let anterior = 0;
  for (const p of ord) {
    if (p.status === "offline") { atual = null; continue; }
    const tipo = p.status === "em_corrida" ? "corrida" : "procurando";
    const corrida = tipo === "corrida" ? p.corrida_id ?? null : null;
    const t = new Date(p.registrado_em).getTime();
    if (!atual || atual.tipo !== tipo || atual.corridaId !== corrida || t - anterior > LACUNA_MS) {
      atual = { tipo, corridaId: corrida, pontos: [], inicio: p.registrado_em, fim: p.registrado_em };
      out.push(atual);
    }
    atual.pontos.push(p);
    atual.fim = p.registrado_em;
    anterior = t;
  }
  return out;
}

/**
 * Cores do percurso, do início ao mais recente.
 * Normal: vermelho → amarelo → verde (o mais recente). Teste: cinza → roxo → azul.
 */
export function coresPercurso(teste: boolean): string[] {
  return teste ? ["#8a8a93", "#9333ea", "#3b82f6"] : ["#ef4444", "#facc15", "#22c55e"];
}

function misturar(cores: string[], t: number): string {
  const n = cores.length - 1;
  const i = Math.min(n - 1, Math.floor(t * n));
  const f = t * n - i;
  const a = cores[i].match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const b = cores[i + 1].match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return "#" + a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, "0")).join("");
}

/** Cria as fontes e camadas dos percursos (linha em degradê + pings coloridos). */
export function criarCamadasPercurso(m: Mapa, teste: boolean) {
  if (m.getSource("percursos")) return;
  const cores = coresPercurso(teste);
  m.addSource("percursos", { type: "geojson", lineMetrics: true, data: { type: "FeatureCollection", features: [] } });
  m.addSource("pings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addLayer({ id: "percursos-contorno", type: "line", source: "percursos", layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#0a0a0a", "line-width": ["case", ["get", "destaque"], 8, 6], "line-opacity": 0.45 } });
  m.addLayer({ id: "percursos", type: "line", source: "percursos", layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-width": ["case", ["get", "destaque"], 5, 3.5],
      "line-opacity": ["case", ["get", "apagado"], 0.35, 1],
      "line-gradient": ["interpolate", ["linear"], ["line-progress"], ...cores.flatMap((c, i) => [i / (cores.length - 1), c])] as never,
    } });
  m.addLayer({ id: "pings", type: "circle", source: "pings",
    paint: { "circle-radius": ["case", ["get", "ponta"], 6, 3.4], "circle-color": ["get", "cor"], "circle-stroke-color": "#0a0a0a", "circle-stroke-width": 1,
      "circle-opacity": ["case", ["get", "apagado"], 0.35, 1] } });
}

/** Desenha os registros. `destaque` = índice do registro escolhido (os outros ficam apagados). */
export function desenharPercursos(m: Mapa, registros: Registro[], teste: boolean, destaque: number | null = null, comPings = true) {
  const cores = coresPercurso(teste);
  const linhas = registros.filter((r) => r.pontos.length >= 2).map((r) => {
    const i = registros.indexOf(r);
    return { type: "Feature" as const, properties: { destaque: destaque === i, apagado: destaque != null && destaque !== i },
      geometry: { type: "LineString" as const, coordinates: r.pontos.map((p) => [p.lng, p.lat]) } };
  });
  const pontos = comPings ? registros.flatMap((r, i) => r.pontos.map((p, k) => ({
    type: "Feature" as const,
    properties: { cor: misturar(cores, r.pontos.length < 2 ? 1 : k / (r.pontos.length - 1)), ponta: k === 0 || k === r.pontos.length - 1,
      apagado: destaque != null && destaque !== i },
    geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
  }))) : [];
  (m.getSource("percursos") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: linhas });
  (m.getSource("pings") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: pontos });
}

/** Mapa de calor (pedidos, pings ou rotas): pontos com peso 1. */
export function desenharCalor(m: Mapa, pontos: [number, number][] | null, cor: string) {
  if (!m.getSource("calor")) {
    m.addSource("calor", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    m.addLayer({ id: "calor", type: "heatmap", source: "calor", maxzoom: 17,
      paint: {
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 15, 28],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.8, 15, 1.6],
        "heatmap-opacity": 0.85,
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.2, "#3b82f6", 0.45, "#22c55e", 0.7, "#facc15", 1, cor],
      } });
  }
  (m.getSource("calor") as GeoJSONSource).setData({ type: "FeatureCollection",
    features: (pontos ?? []).map(([lat, lng]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [lng, lat] } })) });
}
