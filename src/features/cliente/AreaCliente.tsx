"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Heart, LogOut } from "lucide-react";
import { sair, supabase } from "@/lib/supabase/client";
import { LoginForm } from "@/features/auth/LoginForm";
import { Logo } from "@/features/marca/Logo";
import { BotaoTema } from "@/features/tema/BotaoTema";
import { Toasts } from "@/features/ui/toast";

type Acesso = "carregando" | "anonimo" | "negado" | "cliente" | "gestor";

/** Área do cliente: entra, pede, acompanha e vê as faturas. Contas de gestor vão para o painel delas. */
export function AreaCliente({ children }: { children: ReactNode }) {
  const [acesso, setAcesso] = useState<Acesso>("carregando");
  const [nome, setNome] = useState("");

  useEffect(() => {
    const sb = supabase();
    async function verificar(s: Session | null) {
      if (!s) return setAcesso("anonimo");
      const { data } = await sb.rpc("meu_perfil");
      const d = data as { nome?: string; papeis?: string[] } | null;
      setNome(d?.nome ?? s.user.email?.split("@")[0] ?? "");
      const p = d?.papeis ?? [];
      if (p.includes("cliente")) setAcesso("cliente");
      else if (p.includes("gestor") || p.includes("dev")) setAcesso("gestor");
      else setAcesso("negado");
    }
    sb.auth.getSession().then(({ data }) => verificar(data.session));
    const { data } = sb.auth.onAuthStateChange((ev, s) => { if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") verificar(s); });
    return () => data.subscription.unsubscribe();
  }, []);

  if (acesso === "carregando") return <main className="tela-login"><p className="subtitulo">Carregando…</p></main>;
  if (acesso === "anonimo") return <LoginForm />;
  if (acesso === "negado" || acesso === "gestor")
    return (
      <main className="tela-login">
        <div className="caixa-login vidro">
          <Logo />
          <p className="erro" style={{ textAlign: "center" }}>
            {acesso === "gestor" ? "Esta é uma conta da equipe PW Express. Use o painel do gestor." : "Esta conta não tem acesso de cliente. Fale com a PW Express."}
          </p>
          {acesso === "gestor" && process.env.NEXT_PUBLIC_SITE_GESTOR_URL && <a className="botao-ouro" href={process.env.NEXT_PUBLIC_SITE_GESTOR_URL}>Abrir o painel do gestor</a>}
          <button className="botao-texto" onClick={() => sair()}><LogOut size={15} aria-hidden /> Sair</button>
        </div>
      </main>
    );

  return (
    <div className="cliente-area">
      <header className="topo vidro">
        <a href="/" aria-label="PW Express, início"><Logo /></a>
        <span className="espaco" />
        <span className="cliente-ola">Olá, <strong>{nome.split(" ")[0]}</strong></span>
        <BotaoTema />
        <button className="botao-texto" onClick={() => sair()} title="Sair"><LogOut size={16} aria-hidden /> Sair</button>
      </header>
      <main className="cliente-corpo">{children}</main>
      <footer className="rodape">
        Um projeto de irmão para irmão! <Heart size={13} aria-label="com amor" className="coracao" fill="currentColor" />
      </footer>
      <Toasts />
    </div>
  );
}
