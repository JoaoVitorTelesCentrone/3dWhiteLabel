import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Layers3 } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Solicitar demonstração | Sua Empresa 3D",
  description: "Peça acesso a uma demonstração guiada da plataforma Sua Empresa 3D.",
};

export default function ContactPage() {
  return (
    <main className="contact-page-v2">
      <Link href="/" className="contact-back"><ArrowLeft /> Voltar para a apresentação</Link>
      <div className="contact-layout">
        <section className="contact-intro" aria-labelledby="contact-title">
          <div className="contact-brand"><span><Layers3 /></span> Sua Empresa 3D</div>
          <p className="contact-kicker">Demonstração do sistema</p>
          <h1 id="contact-title">Veja sua operação de impressão 3D em um só lugar.</h1>
          <p>Preencha os dados ao lado. Vamos entender sua rotina e preparar uma demonstração com o fluxo mais próximo do seu negócio.</p>
          <ul><li><Check /> Ambiente com dados fictícios</li><li><Check /> Visão completa dos módulos</li><li><Check /> Sem compromisso de contratação</li></ul>
          <div className="contact-time"><Clock3 /><span><strong>Leva menos de 2 minutos</strong><small>Pedimos apenas o necessário para entrar em contato.</small></span></div>
        </section>
        <section className="contact-form-card" aria-label="Formulário de demonstração">
          <div className="contact-form-head"><span>Solicite seu acesso</span><small>Campos com * são obrigatórios</small></div>
          <ContactForm />
        </section>
      </div>
    </main>
  );
}
