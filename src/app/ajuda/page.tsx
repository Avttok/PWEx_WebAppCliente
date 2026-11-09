import type { Metadata } from "next";
import { CentralAjuda } from "@/features/site/Ajuda";
import { RodapeSite, TopoSite } from "@/features/site/Topo";

export const metadata: Metadata = { title: "Ajuda · PW Express", description: "Como pedir coletas e entregas, acompanhar e pagar pelo site da PW Express." };
export default function Pagina() {
  return <CentralAjuda publicos={["cliente"]} topo={<TopoSite atual="ajuda" />} rodape={<RodapeSite />}
    lead="Como criar a conta, pedir coletas e entregas, acompanhar no mapa e ver suas faturas." />;
}
