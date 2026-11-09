import type { Metadata } from "next";
import { DownloadApp } from "@/features/site/Download";

export const metadata: Metadata = { title: "App do motoboy · PW Express", description: "Baixe e instale o app do motoboy da PW Express para Android." };
export default function Pagina() { return <DownloadApp />; }
