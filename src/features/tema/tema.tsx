"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type PreferenciaTema = "claro" | "escuro" | "sistema";
export type Tema = "claro" | "escuro";

const CHAVE = "pwex-tema";

/** Roda antes da página aparecer (no <head>), para não piscar o tema errado. */
export const scriptTema = `(function(){try{var p=localStorage.getItem('${CHAVE}')||'sistema';var t=p==='sistema'?(matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'):p;document.documentElement.dataset.tema=t;}catch(e){document.documentElement.dataset.tema='escuro';}})();`;

interface ContextoTema {
  preferencia: PreferenciaTema;
  tema: Tema;
  definir: (p: PreferenciaTema) => void;
  alternar: () => void;
}

const Contexto = createContext<ContextoTema>({ preferencia: "sistema", tema: "escuro", definir: () => {}, alternar: () => {} });
export const useTema = () => useContext(Contexto);

function resolver(p: PreferenciaTema): Tema {
  if (p !== "sistema") return p;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>("sistema");
  const [tema, setTema] = useState<Tema>("escuro");

  useEffect(() => {
    let p: PreferenciaTema = "sistema";
    try { p = (localStorage.getItem(CHAVE) as PreferenciaTema) || "sistema"; } catch {}
    setPreferencia(p);
    setTema(resolver(p));
  }, []);

  // acompanha o sistema quando a preferência é "sistema"
  useEffect(() => {
    if (preferencia !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoMudar = () => setTema(mq.matches ? "escuro" : "claro");
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, [preferencia]);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  const definir = useCallback((p: PreferenciaTema) => {
    try { localStorage.setItem(CHAVE, p); } catch {}
    setPreferencia(p);
    setTema(resolver(p));
  }, []);

  // ciclo: sistema → claro → escuro → sistema
  const alternar = useCallback(() => {
    definir(preferencia === "sistema" ? "claro" : preferencia === "claro" ? "escuro" : "sistema");
  }, [preferencia, definir]);

  return <Contexto.Provider value={{ preferencia, tema, definir, alternar }}>{children}</Contexto.Provider>;
}
