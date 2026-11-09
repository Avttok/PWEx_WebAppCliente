"use client";

import { useEffect, useRef, useState } from "react";
import { maplibregl } from "@/lib/mapa/maplibre";
import { useMapa } from "@/lib/mapa/useMapa";
import { corOuro } from "@/lib/mapa/cores";
import { decodificarPolyline } from "@/lib/geo/polyline";
import { geo } from "@/features/geo";
import { COR_STATUS, type StatusMotoboy } from "@/features/rastreamento/tipos";

export interface PinoParada {
  chave: string;
  lat: number;
  lng: number;
  tipo: "coleta" | "entrega";
  rotulo: string;
  concluida?: boolean;
}

export interface PinoMotoboy {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  status: StatusMotoboy;
  foto?: string | null;
}

interface Props {
  paradas?: PinoParada[];
  rotaPlanejada?: string | null;
  trilha?: [number, number][];
  motoboys?: PinoMotoboy[];
  aoClicar?: (lat: number, lng: number) => void;
  modoEscolha?: boolean;
  /** Quando muda, o mapa reenquadra tudo. */
  enquadrar?: string;
  /** Clique num endereço da lista: centraliza e aproxima nele (mude "vez" para repetir). */
  foco?: { lat: number; lng: number; vez: number } | null;
  /** Vários caminhos (polylines) de uma vez: as rotas ativas. */
  rotas?: string[];
  /** false: não traça sozinho o caminho entre as paradas. */
  caminhoAuto?: boolean;
}

const VAZIO = { type: "FeatureCollection" as const, features: [] };
const CACHE_CAMINHO = new Map<string, string>();

function linha(coords: [number, number][]) {
  return {
    type: "FeatureCollection" as const,
    features: coords.length < 2 ? [] : [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } }],
  };
}

/** Mapa genérico das telas de corrida: paradas numeradas, rota planejada, trilha real e motoboys. */
export function MapaCorridas({ paradas = [], rotaPlanejada, trilha = [], motoboys = [], aoClicar, modoEscolha, enquadrar, foco, rotas = [], caminhoAuto = true }: Props) {
  // sem rota pronta: traça o caminho pelas ruas entre as paradas, na ordem
  const chaveParadas = paradas.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");
  const [caminho, setCaminho] = useState<string | null>(null);
  useEffect(() => {
    if (rotaPlanejada || paradas.length < 2 || !caminhoAuto) { setCaminho(null); return; }
    let vivo = true;
    const guardado = CACHE_CAMINHO.get(chaveParadas);
    if (guardado) { setCaminho(guardado); return; }
    geo.calcularRota(paradas.slice(0, 25).map((p) => ({ lat: p.lat, lng: p.lng }))).then((r) => {
      if (!vivo || !r) return;
      CACHE_CAMINHO.set(chaveParadas, r.polyline); setCaminho(r.polyline);
    }).catch(() => {});
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotaPlanejada, chaveParadas]);
  const rotaDesenhada = rotaPlanejada || caminho;
  const container = useRef<HTMLDivElement>(null);
  const { mapa, pronto } = useMapa(container);
  const pinos = useRef<Record<string, maplibregl.Marker>>({});
  const cliqueRef = useRef(aoClicar);
  cliqueRef.current = aoClicar;

  // camadas e clique
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    pinos.current = {}; // mapa (re)criado: pinos antigos pertenciam ao mapa anterior
    m.addSource("rota", { type: "geojson", data: VAZIO });
    m.addSource("trilha", { type: "geojson", data: VAZIO });
    m.addLayer({
      id: "rota", type: "line", source: "rota",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0a0a0a", "line-width": 3, "line-dasharray": [2, 1.5], "line-opacity": 0.6 },
    });
    m.addLayer({
      id: "trilha-contorno", type: "line", source: "trilha",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0a0a0a", "line-width": 7, "line-opacity": 0.5 },
    });
    m.addLayer({
      id: "trilha", type: "line", source: "trilha",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": corOuro(), "line-width": 4 },
    });
    const onClick = (e: maplibregl.MapMouseEvent) => cliqueRef.current?.(e.lngLat.lat, e.lngLat.lng);
    m.on("click", onClick);
    return () => {
      m.off("click", onClick);
    };
  }, [mapa, pronto]);

  useEffect(() => {
    const el = mapa.current?.getCanvas();
    if (el) el.style.cursor = modoEscolha ? "crosshair" : "";
  }, [mapa, pronto, modoEscolha]);

  useEffect(() => {
    if (!pronto) return;
    const fonte = mapa.current?.getSource("rota") as maplibregl.GeoJSONSource | undefined;
    const todas = [...(rotaDesenhada ? [rotaDesenhada] : []), ...rotas].map((r) => decodificarPolyline(r)).filter((c) => c.length >= 2);
    fonte?.setData({ type: "FeatureCollection", features: todas.map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: c } })) });
  }, [mapa, pronto, rotaDesenhada, rotas.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pronto) return;
    (mapa.current?.getSource("trilha") as maplibregl.GeoJSONSource | undefined)?.setData(linha(trilha));
  }, [mapa, pronto, trilha]);

  // pinos de paradas e motoboys
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto) return;
    const vistos = new Set<string>();

    for (const p of paradas) {
      const id = `p-${p.chave}`;
      vistos.add(id);
      let pino = pinos.current[id];
      if (!pino) {
        const el = document.createElement("div");
        el.className = "pino-parada";
        el.appendChild(document.createElement("span"));
        pino = new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -7] }).setLngLat([p.lng, p.lat]).addTo(m);
        pinos.current[id] = pino;
      }
      // classList (nunca className): o MapLibre usa classes próprias no mesmo elemento para posicioná-lo
      const el = pino.getElement();
      el.classList.toggle("coleta", p.tipo === "coleta");
      el.classList.toggle("entrega", p.tipo === "entrega");
      el.classList.toggle("concluida", Boolean(p.concluida));
      el.classList.toggle("largo", p.rotulo.length > 2);
      el.firstElementChild!.textContent = p.rotulo;
      pino.setLngLat([p.lng, p.lat]);
    }

    for (const mb of motoboys) {
      const id = `m-${mb.id}`;
      vistos.add(id);
      let pino = pinos.current[id];
      if (!pino) {
        const el = document.createElement("div");
        el.className = "marcador";
        pino = new maplibregl.Marker({ element: el }).setLngLat([mb.lng, mb.lat]).addTo(m);
        pinos.current[id] = pino;
      }
      const el = pino.getElement();
      el.dataset.status = mb.status;
      el.style.setProperty("--cor", COR_STATUS[mb.status]);
      el.textContent = mb.foto ? "" : mb.nome.trim().charAt(0).toUpperCase();
      el.style.backgroundImage = mb.foto ? `url("${mb.foto}")` : "";
      el.classList.toggle("com-foto", Boolean(mb.foto));
      el.title = mb.nome;
      pino.setLngLat([mb.lng, mb.lat]);
    }

    for (const id of Object.keys(pinos.current)) {
      if (!vistos.has(id)) {
        pinos.current[id].remove();
        delete pinos.current[id];
      }
    }
  }, [mapa, pronto, paradas, motoboys]);

  // enquadrar
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto || enquadrar === undefined) return;
    const b = new maplibregl.LngLatBounds();
    paradas.forEach((p) => b.extend([p.lng, p.lat]));
    motoboys.forEach((x) => b.extend([x.lng, x.lat]));
    trilha.forEach((c) => b.extend(c));
    if (!b.isEmpty()) m.fitBounds(b, { padding: 90, maxZoom: 15, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, pronto, enquadrar]);

  // foco num ponto da lista
  useEffect(() => {
    const m = mapa.current;
    if (!m || !pronto || !foco) return;
    container.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    m.flyTo({ center: [foco.lng, foco.lat], zoom: Math.max(m.getZoom(), 15.5), duration: 700 });
  }, [mapa, pronto, foco]);

  return <div ref={container} className="mapa" />;
}
