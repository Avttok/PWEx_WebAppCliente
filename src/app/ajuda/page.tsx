import type { Metadata } from "next";
import { CentralAjuda } from "@/features/site/Ajuda";

export const metadata: Metadata = { title: "Ajuda · PW Express", description: "Como usar o site, o painel e o app da PW Express." };
export default function Pagina() { return <CentralAjuda />; }
