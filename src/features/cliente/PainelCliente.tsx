"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Boxes, Building2, CalendarClock, CheckCircle2, Clock, CreditCard, FileText, FlaskConical, Lock, MapPinned, Package, PackagePlus, Plus, QrCode,
  Receipt, Trash2, Truck, UserRound, Wallet, X, Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { geo, type Referencia, type Rota } from "@/features/geo";
import { CampoEndereco } from "@/features/corridas/CampoEndereco";
import { CampoReferencias } from "@/features/corridas/CampoReferencias";
import { MapaCorridas, type PinoParada } from "@/features/corridas/MapaCorridas";
import { formatarDuracao, formatarKm } from "@/features/corridas/tipos";
import { paraCampo, sugestaoHorario } from "@/features/corridas/planejadas";
import { toast } from "@/features/ui/toast";
import { moedaBr, quando, traduzir, type Orcamento } from "@/features/pedidos/tipos";

// ------------------------------------------------------------------ dados

interface Conta {
  id: string; nome: string; tipo: "pj" | "pf"; documento: string | null; telefone: string | null; email: string | null;
  endereco: string | null; lat: number | null; lng: number | null; instrucoes_coleta: string | null;
  pode_express: boolean; ve_ao_vivo: boolean; cobranca: "credito" | "pre_pago"; fatura_ciclo: string; metodos: string[]; antecedencia_min: number;
  tipos_pedido: { chave: string; nome: string; descricao: string | null }[];
  categorias: { id: string; nome: string; descricao: string | null; perigoso: boolean; classe_risco: string | null; fragil: boolean }[];
  em_aberto: number;
}
type StatusP = "recebido" | "aprovado" | "roteirizado" | "em_rota" | "concluido" | "cancelado" | "recusado";
interface PedidoC {
  id: string; numero: number; tipo: "express" | "planejado"; tipo_pedido: string; quando: string | null; urgente: boolean; status: StatusP; valor: number | null;
  orcamento: Orcamento | null; cobranca: "credito" | "pre_pago"; pagamento_status: string; pagamento_metodo: string | null; fatura_id: string | null;
  observacoes: string | null; recusa_motivo: string | null; criado_em: string; concluido_em: string | null; cancelado_em: string | null;
  pontos: { id: string; tipo: "coleta" | "entrega"; endereco: string; lat: number; lng: number; contato_nome: string | null; status: string; concluido_em: string | null; recebedor_nome: string | null }[];
  itens: { descricao: string; quantidade: number; peso_kg: number | null; categoria: string | null; perigoso: boolean }[];
  motoboys: string[]; codigos: string[];
}
interface FaturaC {
  id: string; numero: number; inicio: string; fim: string; status: "emitida" | "paga"; subtotal: number; ajuste: number; ajuste_motivo: string | null; total: number;
  vencimento: string | null; emitida_em: string | null; paga_em: string | null; pedidos: { numero: number; concluido_em: string; valor: number; entregas: number }[];
}

const STATUS: Record<StatusP, { rotulo: string; cor: string; dica: string }> = {
  recebido: { rotulo: "Recebido", cor: "#f59e0b", dica: "A PW Express está conferindo o seu pedido." },
  aprovado: { rotulo: "Confirmado", cor: "#60a5fa", dica: "Confirmado. Estamos montando a rota." },
  roteirizado: { rotulo: "Em preparação", cor: "#a78bfa", dica: "A rota está pronta e um motoboy vai pegar." },
  em_rota: { rotulo: "A caminho", cor: "var(--ouro)", dica: "Um motoboy está com o seu pedido." },
  concluido: { rotulo: "Entregue", cor: "#2ecc71", dica: "Tudo entregue." },
  cancelado: { rotulo: "Cancelado", cor: "#8a8a8a", dica: "Pedido cancelado." },
  recusado: { rotulo: "Não aceito", cor: "#e5484d", dica: "A PW Express não pôde aceitar este pedido." },
};
const ATIVOS: StatusP[] = ["recebido", "aprovado", "roteirizado", "em_rota"];
const CICLO: Record<string, string> = { diario: "todo dia", semanal: "toda semana", quinzenal: "a cada 15 dias", mensal: "todo mês", manual: "quando combinado" };
const dataBr = (d: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");

type Aba = "pedidos" | "novo" | "faturas" | "conta";

/** Painel do cliente. */
export function PainelCliente() {
  const [conta, setConta] = useState<Conta | null | undefined>(undefined);
  const [pedidos, setPedidos] = useState<PedidoC[] | null>(null);
  const [faturas, setFaturas] = useState<FaturaC[]>([]);
  const [aba, setAba] = useState<Aba>("pedidos");
  const [aberto, setAberto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const sb = supabase();
    const [c, p, f] = await Promise.all([sb.rpc("minha_conta_cliente"), sb.rpc("meus_pedidos_cliente", { p_dias: 400 }), sb.rpc("minhas_faturas")]);
    setConta((c.data as Conta | null) ?? null);
    setPedidos((p.data as PedidoC[] | null) ?? []);
    setFaturas((f.data as FaturaC[] | null) ?? []);
  }, []);
  useEffect(() => { void carregar(); const t = setInterval(carregar, 15_000); return () => clearInterval(t); }, [carregar]);

  if (conta === undefined || pedidos === null) return <p className="subtitulo" style={{ padding: 24 }}>Carregando…</p>;
  if (!conta) return <div className="cliente-cartao vidro"><p className="erro">Sua conta ainda não está ligada a um cadastro de cliente. Fale com a PW Express.</p></div>;

  const pedido = pedidos.find((p) => p.id === aberto);
  const abertas = faturas.filter((f) => f.status === "emitida");
  return (
    <div className="cliente-painel entrar">
      <div className="cliente-cabeca">
        <div>
          <h1 className="display" style={{ margin: 0 }}>{conta.nome}</h1>
          <p className="dica" style={{ margin: 0 }}>
            {conta.pode_express ? <><Zap size={12} aria-hidden /> Peça na hora ou agende.</> : <><CalendarClock size={12} aria-hidden /> Pedidos agendados (o Express é liberado pela PW Express).</>}
            {" · "}{conta.cobranca === "credito" ? <>Fatura {CICLO[conta.fatura_ciclo] ?? ""}</> : <>Pagamento antes de sair</>}
          </p>
        </div>
        <button className="botao-ouro" onClick={() => { setAba("novo"); setAberto(null); }}><PackagePlus size={17} aria-hidden /> Novo pedido</button>
      </div>
      <div className="segmentado abas-cliente">
        {([["pedidos", "Pedidos", Package], ["novo", "Novo pedido", PackagePlus], ["faturas", conta.cobranca === "credito" ? "Faturas" : "Pagamentos", Receipt], ["conta", "Minha conta", Building2]] as [Aba, string, typeof Package][]).map(([k, r, I]) => (
          <button key={k} type="button" className={aba === k ? "ativo" : ""} onClick={() => { setAba(k); setAberto(null); }}>
            <I size={14} aria-hidden /> {r}{k === "faturas" && abertas.length > 0 && <span className="filtro-n">{abertas.length}</span>}
          </button>
        ))}
      </div>
      {aba === "pedidos" && (pedido
        ? <DetalhePedido pedido={pedido} conta={conta} onVoltar={() => setAberto(null)} onMudou={carregar} />
        : <ListaPedidos pedidos={pedidos} onAbrir={setAberto} onNovo={() => setAba("novo")} />)}
      {aba === "novo" && <NovoPedido conta={conta} onCriado={async (id) => { await carregar(); setAba("pedidos"); setAberto(id); }} />}
      {aba === "faturas" && <Faturas conta={conta} faturas={faturas} pedidos={pedidos} />}
      {aba === "conta" && <MinhaConta conta={conta} />}
    </div>
  );
}

function Selo({ s }: { s: StatusP }) {
  return <span className="selo" style={{ color: STATUS[s].cor }}>{STATUS[s].rotulo}</span>;
}

// ------------------------------------------------------------------ lista

function ListaPedidos({ pedidos, onAbrir, onNovo }: { pedidos: PedidoC[]; onAbrir: (id: string) => void; onNovo: () => void }) {
  const ativos = pedidos.filter((p) => ATIVOS.includes(p.status));
  const outros = pedidos.filter((p) => !ATIVOS.includes(p.status));
  if (!pedidos.length)
    return (
      <div className="cliente-cartao vidro vazio-cliente">
        <Package size={34} aria-hidden />
        <p>Você ainda não fez nenhum pedido.</p>
        <button className="botao-ouro" onClick={onNovo}><Plus size={16} aria-hidden /> Fazer o primeiro</button>
      </div>
    );
  const linha = (p: PedidoC) => {
    const ent = p.pontos.filter((x) => x.tipo === "entrega");
    const feitas = ent.filter((x) => x.status === "concluido").length;
    return (
      <button key={p.id} className="cliente-pedido vidro" onClick={() => onAbrir(p.id)}>
        <div className="cliente-pedido-topo">
          <strong>#{p.numero}</strong><Selo s={p.status} />
          {p.tipo === "planejado" ? <CalendarClock size={13} aria-label="Agendado" /> : <Zap size={13} aria-label="Express" />}
          <span className="espaco" /><strong>{moedaBr(p.valor)}</strong>
        </div>
        <span className="dica">{p.pontos.find((x) => x.tipo === "coleta")?.endereco} → {ent.length > 1 ? `${ent.length} entregas` : ent[0]?.endereco}</span>
        <span className="dica">{p.tipo === "planejado" ? `Agendado para ${quando(p.quando)}` : `Pedido ${quando(p.criado_em)}`}{ent.length > 1 && p.status === "em_rota" ? ` · ${feitas}/${ent.length} entregues` : ""}</span>
        {ent.length > 1 && <div className="progresso"><i style={{ width: `${(feitas / ent.length) * 100}%` }} /></div>}
      </button>
    );
  };
  return (
    <>
      {ativos.length > 0 && <><h3 className="rotulo">Em andamento</h3><div className="cliente-lista">{ativos.map(linha)}</div></>}
      {outros.length > 0 && <><h3 className="rotulo">Histórico</h3><div className="cliente-lista">{outros.map(linha)}</div></>}
    </>
  );
}

// ------------------------------------------------------------------ detalhe

function DetalhePedido({ pedido: p, conta, onVoltar, onMudou }: { pedido: PedidoC; conta: Conta; onVoltar: () => void; onMudou: () => void }) {
  const [motoboys, setMotoboys] = useState<{ lat: number; lng: number; nome: string }[]>([]);
  useEffect(() => {
    if (!conta.ve_ao_vivo || p.status !== "em_rota") { setMotoboys([]); return; }
    let vivo = true;
    async function buscar() {
      const { data } = await supabase().rpc("acompanhar_pedido_cliente", { p_pedido: p.id });
      if (vivo) setMotoboys(((data ?? []) as { lat: number | null; lng: number | null; nome: string }[]).filter((m) => m.lat != null).map((m) => ({ lat: m.lat!, lng: m.lng!, nome: m.nome })));
    }
    void buscar();
    const t = setInterval(buscar, 10_000);
    return () => { vivo = false; clearInterval(t); };
  }, [p.id, p.status, conta.ve_ao_vivo]);

  async function cancelar() {
    if (!confirm(`Cancelar o pedido #${p.numero}?`)) return;
    const { error } = await supabase().rpc("cancelar_pedido", { p_pedido: p.id, p_motivo: "Cancelado pelo cliente" });
    if (error) return toast(traduzir(error.message), "erro");
    toast("Pedido cancelado.", "ok");
    onMudou();
  }
  const pinos: PinoParada[] = p.pontos.map((x, i) => ({ chave: x.id, lat: x.lat, lng: x.lng, tipo: x.tipo, rotulo: String(i + 1), concluida: x.status === "concluido" }));
  const podeCancelar = ["recebido", "aprovado", "roteirizado"].includes(p.status);

  return (
    <div className="cliente-detalhe">
      <button className="botao-texto" onClick={onVoltar}><ArrowLeft size={15} aria-hidden /> Pedidos</button>
      <div className="cliente-cartao vidro">
        <div className="cliente-pedido-topo">
          <h2 className="display" style={{ margin: 0 }}>Pedido #{p.numero}</h2><Selo s={p.status} /><span className="espaco" />
          <strong className="figura" style={{ fontSize: 24 }}>{moedaBr(p.valor)}</strong>
        </div>
        <p className="dica" style={{ margin: 0 }}>{STATUS[p.status].dica}{p.recusa_motivo ? ` Motivo: ${p.recusa_motivo}` : ""}</p>
        <div className="cliente-mapa">
          <MapaCorridas paradas={pinos} enquadrar={p.id}
            motoboys={motoboys.map((m, i) => ({ id: `m${i}`, nome: m.nome, lat: m.lat, lng: m.lng, status: "em_corrida" }))} />
        </div>
        {p.cobranca === "pre_pago" && p.pagamento_status === "pendente" && !["cancelado", "recusado"].includes(p.status) && (
          <div className="cliente-pagar">
            <Lock size={18} aria-hidden />
            <div><strong>Aguardando pagamento{p.pagamento_metodo ? ` (${p.pagamento_metodo === "pix" ? "PIX" : "cartão"})` : ""}</strong>
              <p className="dica" style={{ margin: 0 }}>O pedido sai depois de pago. Enquanto o pagamento online não é ligado, a PW Express confirma o recebimento por aqui.</p></div>
          </div>
        )}
        {p.codigos.length > 0 && <p className="cliente-codigo">Código de entrega: <strong>{p.codigos.join(" · ")}</strong> <span className="dica">passe só para quem vai receber</span></p>}
        <ol className="cliente-paradas">
          {p.pontos.map((x, i) => (
            <li key={x.id} className={x.status === "concluido" ? "feita" : ""}>
              <span className={`pino-mini ${x.tipo}`}>{i + 1}</span>
              <div><strong>{x.tipo === "coleta" ? "Coleta" : "Entrega"}</strong> · {x.endereco}
                {x.contato_nome && <span className="dica"> · {x.contato_nome}</span>}
                {x.concluido_em && <div className="dica"><CheckCircle2 size={12} aria-hidden /> {quando(x.concluido_em)}{x.recebedor_nome ? ` · recebido por ${x.recebedor_nome}` : ""}</div>}
              </div>
            </li>
          ))}
        </ol>
        {p.itens.length > 0 && (
          <div className="itens-lista">
            {p.itens.map((it, i) => (
              <span key={i} className="chip">{it.perigoso && <FlaskConical size={12} style={{ color: "var(--vermelho)" }} aria-label="Perigoso" />} {it.quantidade}× {it.descricao}{it.peso_kg ? ` · ${it.peso_kg} kg` : ""}</span>
            ))}
          </div>
        )}
        {p.orcamento && <details className="avancado"><summary>Como chegamos no valor</summary><Orcamento orc={p.orcamento} /></details>}
        <p className="dica" style={{ margin: 0 }}>
          {p.tipo === "planejado" ? `Agendado para ${quando(p.quando)}` : `Pedido em ${quando(p.criado_em)}`}
          {p.motoboys.length ? ` · motoboy ${p.motoboys.map((n) => n.split(" ")[0]).join(", ")}` : ""}
          {p.cobranca === "credito" ? (p.fatura_id ? " · já na fatura" : " · entra na próxima fatura") : p.pagamento_status === "pago" ? " · pago" : ""}
        </p>
        {podeCancelar && <button className="botao-perigo" onClick={cancelar}><X size={15} aria-hidden /> Cancelar pedido</button>}
      </div>
    </div>
  );
}

function Orcamento({ orc }: { orc: Orcamento }) {
  return (
    <div className="orcamento">
      {orc.linhas.map((l, i) => <div key={i} className="orcamento-linha"><span>{l.rotulo}{l.detalhe && <small>{l.detalhe}</small>}</span><strong>{moedaBr(l.valor)}</strong></div>)}
      {orc.percentuais.map((x, i) => <div key={`p${i}`} className="orcamento-linha pct"><span>{x.rotulo}</span><strong>+{x.pct.toLocaleString("pt-BR")}%</strong></div>)}
      <div className="orcamento-linha total"><span>Total</span><strong>{moedaBr(orc.total)}</strong></div>
    </div>
  );
}

// ------------------------------------------------------------------ novo pedido

interface Ponto { chave: string; tipo: "coleta" | "entrega"; endereco: string; lat: number | null; lng: number | null; contato_nome: string; contato_telefone: string; instrucoes: string; referencias: Referencia[] }
interface Item { chave: string; descricao: string; categoria_id: string; quantidade: string; peso_kg: string; comprimento_cm: string; largura_cm: string; altura_cm: string; valor_declarado: string; coleta: string; entrega: string }
let seq = 0;
const ponto = (tipo: Ponto["tipo"], base: Partial<Ponto> = {}): Ponto => ({ chave: `p${++seq}`, tipo, endereco: "", lat: null, lng: null, contato_nome: "", contato_telefone: "", instrucoes: "", referencias: [], ...base });
const item = (): Item => ({ chave: `i${++seq}`, descricao: "", categoria_id: "", quantidade: "1", peso_kg: "", comprimento_cm: "", largura_cm: "", altura_cm: "", valor_declarado: "", coleta: "", entrega: "" });
const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function NovoPedido({ conta, onCriado }: { conta: Conta; onCriado: (id: string) => void }) {
  const [pontos, setPontos] = useState<Ponto[]>(() => [
    ponto("coleta", conta.endereco ? { endereco: conta.endereco, lat: conta.lat, lng: conta.lng, instrucoes: conta.instrucoes_coleta ?? "" } : {}), ponto("entrega"),
  ]);
  const [itens, setItens] = useState<Item[]>([item()]);
  const [agendar, setAgendar] = useState(!conta.pode_express);
  const [horario, setHorario] = useState(() => paraCampo(sugestaoHorario(Math.max(60, conta.antecedencia_min))));
  const [tipoPedido, setTipoPedido] = useState(conta.tipos_pedido[0]?.chave ?? "padrao");
  const [urgente, setUrgente] = useState(false);
  const [metodo, setMetodo] = useState(conta.metodos[0] ?? "pix");
  const [obs, setObs] = useState("");
  const [rota, setRota] = useState<Rota | null>(null);
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const atualizar = (k: string, d: Partial<Ponto>) => setPontos((l) => l.map((p) => (p.chave === k ? { ...p, ...d } : p)));
  const mudarItem = (k: string, d: Partial<Item>) => setItens((l) => l.map((x) => (x.chave === k ? { ...x, ...d } : x)));
  const coletas = pontos.map((p, i) => ({ p, i })).filter((x) => x.p.tipo === "coleta");
  const entregas = pontos.map((p, i) => ({ p, i })).filter((x) => x.p.tipo === "entrega");
  const ordenados = useMemo(() => [...pontos.filter((p) => p.tipo === "coleta"), ...pontos.filter((p) => p.tipo === "entrega")], [pontos]);
  const chaveRota = ordenados.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    const ok = ordenados.filter((p) => p.lat != null);
    if (ok.length < 2 || ok.length !== ordenados.length) { setRota(null); return; }
    const t = setTimeout(async () => setRota(await geo.calcularRota(ok.map((p) => ({ lat: p.lat!, lng: p.lng! }))).catch(() => null)), 500);
    return () => clearTimeout(t);
  }, [chaveRota]); // eslint-disable-line react-hooks/exhaustive-deps

  const dadosItens = itens.filter((x) => x.descricao.trim()).map((x) => ({
    descricao: x.descricao.trim(), categoria_id: x.categoria_id || null, quantidade: Math.max(1, Math.round(n(x.quantidade) ?? 1)), peso_kg: n(x.peso_kg),
    comprimento_cm: n(x.comprimento_cm), largura_cm: n(x.largura_cm), altura_cm: n(x.altura_cm), valor_declarado: n(x.valor_declarado),
    coleta: x.coleta === "" ? null : Number(x.coleta), entrega: x.entrega === "" ? null : Number(x.entrega),
  }));
  const quandoIso = agendar && horario ? new Date(horario).toISOString() : null;
  const chaveOrc = JSON.stringify([tipoPedido, urgente, quandoIso, rota?.distanciaM, pontos.map((p) => [p.tipo, p.lat, p.lng]), dadosItens]);
  useEffect(() => {
    if (pontos.some((p) => p.lat == null)) { setOrc(null); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase().rpc("orcar_previa", { dados: {
        tipo: agendar ? "planejado" : "express", tipo_pedido: tipoPedido, quando: quandoIso, urgente, distancia_m: rota?.distanciaM ?? null,
        pontos: pontos.map((p) => ({ tipo: p.tipo, lat: p.lat, lng: p.lng })), itens: dadosItens } });
      setOrc((data as Orcamento) ?? null);
    }, 400);
    return () => clearTimeout(t);
  }, [chaveOrc]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar() {
    if (pontos.some((p) => p.lat == null)) return toast("Localize todos os endereços (escolha da lista ou marque no mapa).", "aviso");
    if (itens.some((x) => !x.descricao.trim() && (x.peso_kg || x.categoria_id))) return toast("Diga o que é cada item.", "aviso");
    setEnviando(true);
    const { data, error } = await supabase().rpc("criar_pedido", { dados: {
      quando: quandoIso, urgente, tipo_pedido: tipoPedido, metodo: conta.cobranca === "pre_pago" ? metodo : null, observacoes: obs.trim() || null,
      distancia_m: rota?.distanciaM ?? null, pontos: pontos.map(({ chave, ...p }) => { void chave; return p; }), itens: dadosItens } });
    setEnviando(false);
    if (error) return toast(traduzir(error.message), "erro");
    toast("Recebemos o seu pedido. Você acompanha tudo por aqui.", "ok", { titulo: "Pedido enviado" });
    onCriado(data as string);
  }

  const pinos: PinoParada[] = pontos.filter((p) => p.lat != null).map((p, i) => ({ chave: p.chave, lat: p.lat!, lng: p.lng!, tipo: p.tipo, rotulo: String(i + 1) }));
  const perigoso = dadosItens.some((x) => conta.categorias.find((k) => k.id === x.categoria_id)?.perigoso);
  return (
    <div className="cliente-novo">
      <div className="cliente-coluna">
        <div className="cliente-cartao vidro">
          <span className="rotulo">Quando</span>
          <div className="segmentado" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <button type="button" className={!agendar ? "ativo" : ""} disabled={!conta.pode_express} onClick={() => setAgendar(false)}><Zap size={14} aria-hidden /> Agora (Express)</button>
            <button type="button" className={agendar ? "ativo" : ""} onClick={() => setAgendar(true)}><CalendarClock size={14} aria-hidden /> Agendar</button>
          </div>
          {!conta.pode_express && <p className="dica" style={{ margin: 0 }}><Lock size={11} aria-hidden /> Pedidos para agora são liberados pela PW Express. Agende com pelo menos {conta.antecedencia_min} min.</p>}
          {agendar && <input type="datetime-local" value={horario} onChange={(e) => setHorario(e.target.value)} />}
          {conta.tipos_pedido.length > 1 && (
            <>
              <span className="rotulo">Tipo de pedido</span>
              <div className="tipos-pedido">
                {conta.tipos_pedido.map((t) => (
                  <button key={t.chave} type="button" className={`tipo-pedido ${tipoPedido === t.chave ? "ativo" : ""}`} onClick={() => setTipoPedido(t.chave)}>
                    <strong>{t.nome}</strong>{t.descricao && <small>{t.descricao}</small>}
                  </button>
                ))}
              </div>
            </>
          )}
          <label className="opcao"><span><Zap size={14} aria-hidden style={{ color: "var(--vermelho)" }} /> Urgente<br /><span className="dica">Prioridade máxima (tem acréscimo).</span></span><input type="checkbox" role="switch" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} /></label>
        </div>

        <div className="cliente-cartao vidro">
          <span className="rotulo">Endereços</span>
          <p className="dica" style={{ margin: 0 }}>Uma ou várias coletas e entregas. Nós montamos as melhores rotas.</p>
          {pontos.map((p, i) => (
            <div key={p.chave} className={`parada-form ${p.tipo}`}>
              <div className="parada-topo">
                <span className={`pino-mini ${p.tipo}`}>{i + 1}</span>
                <select value={p.tipo} onChange={(e) => atualizar(p.chave, { tipo: e.target.value as Ponto["tipo"] })}><option value="coleta">Coleta</option><option value="entrega">Entrega</option></select>
                <span className="espaco" />
                {pontos.length > 2 && <button type="button" className="icone" title="Remover" onClick={() => setPontos((l) => l.filter((x) => x.chave !== p.chave))}><X size={14} /></button>}
              </div>
              <CampoEndereco valor={p.endereco} onTexto={(t) => atualizar(p.chave, { endereco: t, lat: null, lng: null })} onEscolher={(e) => atualizar(p.chave, { endereco: e.descricao, lat: e.lat, lng: e.lng })} />
              <div className="parada-acoes">
                <button type="button" className={`link ${escolhendo === p.chave ? "ativo" : ""}`} onClick={() => setEscolhendo(escolhendo === p.chave ? null : p.chave)}>
                  <MapPinned size={13} aria-hidden /> {escolhendo === p.chave ? "Clique no mapa…" : "Marcar no mapa"}
                </button>
                {p.lat != null ? <span className="ok"><CheckCircle2 size={13} aria-hidden /> Localizado</span> : <span className="pendente">Sem localização</span>}
                <button type="button" className="link" onClick={() => setAberto(aberto === p.chave ? null : p.chave)}><UserRound size={13} aria-hidden /> {aberto === p.chave ? "Menos" : "Contato e referências"}</button>
              </div>
              {aberto === p.chave && (
                <div className="parada-extra">
                  <input placeholder={p.tipo === "coleta" ? "Quem entrega ao motoboy" : "Quem recebe"} value={p.contato_nome} onChange={(e) => atualizar(p.chave, { contato_nome: e.target.value })} />
                  <input placeholder="Telefone" value={p.contato_telefone} onChange={(e) => atualizar(p.chave, { contato_telefone: e.target.value })} />
                  <input placeholder="Instruções (portaria, bloco, horário…)" value={p.instrucoes} onChange={(e) => atualizar(p.chave, { instrucoes: e.target.value })} />
                  <CampoReferencias valor={p.referencias} lat={p.lat} lng={p.lng} onMudar={(r) => atualizar(p.chave, { referencias: r })} />
                </div>
              )}
            </div>
          ))}
          <div className="linha-botoes">
            <button type="button" className="botao-texto" onClick={() => setPontos((l) => [...l, ponto("entrega")])}><Plus size={15} /> Entrega</button>
            <button type="button" className="botao-texto" onClick={() => setPontos((l) => [...l, ponto("coleta")])}><Plus size={15} /> Coleta</button>
          </div>
        </div>

        <div className="cliente-cartao vidro">
          <div className="titulo-linha"><span className="rotulo"><Boxes size={13} aria-hidden /> O que vai</span><button type="button" className="botao-texto" onClick={() => setItens((l) => [...l, item()])}><Plus size={15} /> Item</button></div>
          <p className="dica" style={{ margin: 0 }}>Peso e medidas deixam o valor certinho (cobramos o maior entre o peso real e o tamanho da caixa).</p>
          {itens.map((x) => (
            <div key={x.chave} className="item-form">
              <div className="item-linha">
                <input placeholder="Ex.: 1 caixa de celular" value={x.descricao} onChange={(e) => mudarItem(x.chave, { descricao: e.target.value })} />
                <select value={x.categoria_id} onChange={(e) => mudarItem(x.chave, { categoria_id: e.target.value })}>
                  <option value="">Tipo de produto…</option>{conta.categorias.map((k) => <option key={k.id} value={k.id}>{k.perigoso ? "⚠ " : ""}{k.nome}</option>)}
                </select>
                {itens.length > 1 && <button type="button" className="icone" aria-label="Remover item" onClick={() => setItens((l) => l.filter((y) => y.chave !== x.chave))}><Trash2 size={14} /></button>}
              </div>
              <div className="item-numeros">
                <label><span>Qtd.</span><input inputMode="numeric" value={x.quantidade} onChange={(e) => mudarItem(x.chave, { quantidade: e.target.value })} /></label>
                <label><span>Peso (kg)</span><input inputMode="decimal" placeholder="cada" value={x.peso_kg} onChange={(e) => mudarItem(x.chave, { peso_kg: e.target.value })} /></label>
                <label><span>C (cm)</span><input inputMode="decimal" value={x.comprimento_cm} onChange={(e) => mudarItem(x.chave, { comprimento_cm: e.target.value })} /></label>
                <label><span>L (cm)</span><input inputMode="decimal" value={x.largura_cm} onChange={(e) => mudarItem(x.chave, { largura_cm: e.target.value })} /></label>
                <label><span>A (cm)</span><input inputMode="decimal" value={x.altura_cm} onChange={(e) => mudarItem(x.chave, { altura_cm: e.target.value })} /></label>
                <label><span>Valor (R$)</span><input inputMode="decimal" placeholder="declarado" value={x.valor_declarado} onChange={(e) => mudarItem(x.chave, { valor_declarado: e.target.value })} /></label>
              </div>
              {(coletas.length > 1 || entregas.length > 1) && (
                <div className="item-numeros">
                  <label><span>Sai de</span><select value={x.coleta} onChange={(e) => mudarItem(x.chave, { coleta: e.target.value })}>
                    <option value="">Qualquer coleta</option>{coletas.map(({ p, i }) => <option key={p.chave} value={i}>{i + 1}. {p.endereco.split(",")[0] || "Coleta"}</option>)}</select></label>
                  <label><span>Vai para</span><select value={x.entrega} onChange={(e) => mudarItem(x.chave, { entrega: e.target.value })}>
                    <option value="">Todas as entregas</option>{entregas.map(({ p, i }) => <option key={p.chave} value={i}>{i + 1}. {p.endereco.split(",")[0] || "Entrega"}</option>)}</select></label>
                </div>
              )}
            </div>
          ))}
          {perigoso && <p className="alerta-perigo"><FlaskConical size={14} aria-hidden /> Produto perigoso: embale e identifique. Ele vai com cuidado especial e pode ter taxa própria.</p>}
          <textarea placeholder="Observações (opcional)" value={obs} maxLength={1000} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>

      <div className="cliente-lado">
        <div className="cliente-mapa vidro">
          <MapaCorridas paradas={pinos} rotaPlanejada={rota?.polyline} modoEscolha={escolhendo != null} enquadrar={chaveRota}
            aoClicar={async (lat, lng) => { const k = escolhendo; if (!k) return; setEscolhendo(null); atualizar(k, { lat, lng }); atualizar(k, { endereco: await geo.enderecoDoPonto(lat, lng) }); }} />
        </div>
        <div className="cliente-cartao vidro">
          <div className="resumo-rota">
            <div><span className="rotulo">Distância</span><strong>{formatarKm(rota?.distanciaM ?? orc?.distancia_m)}</strong></div>
            <div><span className="rotulo">Tempo</span><strong>{formatarDuracao(rota?.duracaoS)}</strong></div>
            <div><span className="rotulo">Valor</span><strong className="texto-grad">{orc ? moedaBr(orc.total) : "—"}</strong></div>
          </div>
          {orc ? <Orcamento orc={orc} /> : <p className="dica" style={{ margin: 0 }}>Localize os endereços para ver o valor.</p>}
          {conta.cobranca === "pre_pago" ? (
            <>
              <span className="rotulo">Pagamento</span>
              <div className="segmentado" style={{ gridTemplateColumns: `repeat(${Math.max(1, conta.metodos.length)}, 1fr)` }}>
                {conta.metodos.map((m) => (
                  <button key={m} type="button" className={metodo === m ? "ativo" : ""} onClick={() => setMetodo(m)}>
                    {m === "pix" ? <QrCode size={14} aria-hidden /> : <CreditCard size={14} aria-hidden />} {m === "pix" ? "PIX" : "Cartão"}
                  </button>
                ))}
              </div>
              <p className="dica" style={{ margin: 0 }}><Lock size={11} aria-hidden /> O pedido sai depois do pagamento confirmado.</p>
            </>
          ) : <p className="dica" style={{ margin: 0 }}><FileText size={11} aria-hidden /> Vai para a sua fatura ({CICLO[conta.fatura_ciclo] ?? "por ciclo"}). O valor pode ser revisado pela PW Express.</p>}
          <button className="botao-ouro" disabled={enviando} onClick={enviar}><Truck size={17} aria-hidden /> {enviando ? "Enviando…" : "Fazer pedido"}</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ faturas

function Faturas({ conta, faturas, pedidos }: { conta: Conta; faturas: FaturaC[]; pedidos: PedidoC[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  if (conta.cobranca === "pre_pago") {
    const pagos = pedidos.filter((p) => p.pagamento_status === "pago");
    const pend = pedidos.filter((p) => p.pagamento_status === "pendente" && !["cancelado", "recusado"].includes(p.status));
    return (
      <>
        <div className="grade-3">
          <div className="bloco vidro"><span className="rotulo"><Wallet size={12} aria-hidden /> Pago</span><strong className="figura texto-grad" style={{ fontSize: 26 }}>{moedaBr(pagos.reduce((s, p) => s + Number(p.valor ?? 0), 0))}</strong></div>
          <div className="bloco vidro"><span className="rotulo"><Clock size={12} aria-hidden /> A pagar</span><strong className="figura" style={{ fontSize: 22 }}>{moedaBr(pend.reduce((s, p) => s + Number(p.valor ?? 0), 0))}</strong><span className="dica">{pend.length} pedido(s)</span></div>
        </div>
        <div className="cliente-cartao vidro">
          <table className="tabela"><thead><tr><th>Pedido</th><th>Data</th><th>Forma</th><th>Situação</th><th>Valor</th></tr></thead>
            <tbody>{[...pend, ...pagos].map((p) => <tr key={p.id}><td>#{p.numero}</td><td>{quando(p.criado_em)}</td><td>{p.pagamento_metodo === "pix" ? "PIX" : p.pagamento_metodo === "cartao" ? "Cartão" : "—"}</td><td>{p.pagamento_status === "pago" ? "Pago" : "Aguardando"}</td><td>{moedaBr(p.valor)}</td></tr>)}</tbody></table>
        </div>
      </>
    );
  }
  const abertas = faturas.filter((f) => f.status === "emitida");
  return (
    <>
      <div className="grade-3">
        <div className="bloco vidro"><span className="rotulo"><Receipt size={12} aria-hidden /> A pagar</span><strong className="figura texto-grad" style={{ fontSize: 26 }}>{moedaBr(abertas.reduce((s, f) => s + Number(f.total), 0))}</strong><span className="dica">{abertas.length} fatura(s)</span></div>
        <div className="bloco vidro"><span className="rotulo"><Clock size={12} aria-hidden /> Ainda sem fatura</span><strong className="figura" style={{ fontSize: 22 }}>{moedaBr(conta.em_aberto)}</strong><span className="dica">entra na próxima ({CICLO[conta.fatura_ciclo] ?? ""})</span></div>
        <div className="bloco vidro"><span className="rotulo"><CheckCircle2 size={12} aria-hidden /> Pagas</span><strong className="figura" style={{ fontSize: 22 }}>{faturas.filter((f) => f.status === "paga").length}</strong></div>
      </div>
      <div className="cliente-cartao vidro">
        {faturas.length === 0 ? <p className="vazio">Nenhuma fatura ainda.</p> : (
          <table className="tabela tabela-clicavel"><thead><tr><th>Fatura</th><th>Período</th><th>Vencimento</th><th>Situação</th><th>Total</th></tr></thead>
            <tbody>{faturas.map((f) => (
              <tr key={f.id} className={aberta === f.id ? "ativo" : ""} onClick={() => setAberta(aberta === f.id ? null : f.id)}>
                <td>{f.numero}</td><td>{dataBr(f.inicio)} – {dataBr(f.fim)}</td><td>{dataBr(f.vencimento)}</td>
                <td><span className="selo" style={{ color: f.status === "paga" ? "#2ecc71" : "#60a5fa" }}>{f.status === "paga" ? "Paga" : "Em aberto"}</span></td><td><strong>{moedaBr(f.total)}</strong></td>
              </tr>
            ))}</tbody></table>
        )}
      </div>
      {faturas.filter((f) => f.id === aberta).map((f) => (
        <div key={f.id} className="cliente-cartao vidro">
          <h3 className="display" style={{ margin: 0 }}>Fatura {f.numero}</h3>
          <table className="tabela"><thead><tr><th>Pedido</th><th>Entregue</th><th>Entregas</th><th>Valor</th></tr></thead>
            <tbody>{f.pedidos.map((p) => <tr key={p.numero}><td>#{p.numero}</td><td>{quando(p.concluido_em)}</td><td>{p.entregas}</td><td>{moedaBr(p.valor)}</td></tr>)}</tbody></table>
          <div className="orcamento">
            <div className="orcamento-linha"><span>Subtotal</span><strong>{moedaBr(f.subtotal)}</strong></div>
            {Number(f.ajuste) !== 0 && <div className="orcamento-linha"><span>Ajuste{f.ajuste_motivo && <small>{f.ajuste_motivo}</small>}</span><strong>{moedaBr(f.ajuste)}</strong></div>}
            <div className="orcamento-linha total"><span>Total</span><strong>{moedaBr(f.total)}</strong></div>
          </div>
          <p className="dica" style={{ margin: 0 }}>{f.status === "paga" ? `Paga em ${quando(f.paga_em)}.` : `Vence em ${dataBr(f.vencimento)}. Combine o pagamento com a PW Express (PIX ou cartão).`}</p>
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ conta

function MinhaConta({ conta }: { conta: Conta }) {
  return (
    <div className="cliente-cartao vidro">
      <h3 className="display" style={{ margin: 0 }}>{conta.nome}</h3>
      <div className="dados-conta">
        <div><span className="rotulo">{conta.tipo === "pf" ? "CPF" : "CNPJ"}</span><strong>{conta.documento ?? "—"}</strong></div>
        <div><span className="rotulo">Telefone</span><strong>{conta.telefone ?? "—"}</strong></div>
        <div><span className="rotulo">E-mail</span><strong>{conta.email ?? "—"}</strong></div>
        <div><span className="rotulo">Coleta padrão</span><strong>{conta.endereco ?? "—"}</strong></div>
        <div><span className="rotulo">Pedidos</span><strong>{conta.pode_express ? "Agora (Express) ou agendados" : "Agendados"}</strong></div>
        <div><span className="rotulo">Pagamento</span><strong>{conta.cobranca === "credito" ? `Fatura ${CICLO[conta.fatura_ciclo] ?? ""}` : `Antecipado (${conta.metodos.map((m) => (m === "pix" ? "PIX" : "Cartão")).join(" ou ")})`}</strong></div>
        <div><span className="rotulo">Acompanhar ao vivo</span><strong>{conta.ve_ao_vivo ? "Sim" : "Não"}</strong></div>
      </div>
      <p className="dica" style={{ margin: 0 }}>Para mudar algum dado, fale com a PW Express.</p>
    </div>
  );
}
