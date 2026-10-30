import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Layers3 } from "lucide-react";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Solicitar demonstração | Sua Empresa 3D",
  description: "Peça uma demonstração guiada e veja como organizar pedidos, produção e entregas na Sua Empresa 3D.",
};

export default function ContactPage() {
  return (
    <main className="contact-page-v2">
      <Link href="/" className="contact-back"><ArrowLeft /> Voltar para a apresentação</Link>
      <div className="contact-layout">
        <section className="contact-intro" aria-labelledby="contact-title">
          <div className="contact-brand"><span><Layers3 /></span> Sua Empresa 3D</div>
          <p className="contact-kicker">Demonstração guiada</p>
          <h1 id="contact-title">Vamos acompanhar um pedido seu.</h1>
          <p>Preencha seus dados e combinamos uma demonstração com o fluxo mais próximo da sua rotina.</p>
        </section>
        <section className="contact-form-card" aria-label="Formulário de demonstração">
          <div className="contact-form-head"><span>Peça sua demonstração</span><small>Campos com * são obrigatórios</small></div>
          <ContactForm />
        </section>
        <aside className="contact-proof" aria-label="O que esperar da demonstração">
          <span><Check /> Ambiente com dados fictícios</span>
          <span><Check /> Sem compromisso de contratação</span>
          <small><Clock3 /> Leva menos de 2 minutos preencher. Vamos usar os dados informados para combinar o próximo passo.</small>
        </aside>
      </div>
    </main>
  );
}
