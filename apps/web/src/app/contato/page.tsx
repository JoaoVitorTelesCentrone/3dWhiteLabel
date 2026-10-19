import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Solicitar demonstração | Sua Empresa 3D", description: "Peça acesso a uma demonstração guiada da plataforma Sua Empresa 3D." };

export default function ContactPage() {
  return <main className="legal-page contact-page"><header><h1>Veja o fluxo completo com dados de demonstração.</h1><p>Conte um pouco sobre sua operação. O acesso é preparado com dados fictícios para você avaliar pedidos, produção, materiais, entrega e resultados.</p></header><ContactForm /><p className="legal-return"><Link href="/">Voltar para a apresentação</Link></p></main>;
}
