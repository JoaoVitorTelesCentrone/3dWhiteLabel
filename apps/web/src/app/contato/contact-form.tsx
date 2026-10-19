"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/base-ui/button";
import { captureSalesLead, type ContactState } from "./actions";

const initial: ContactState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(captureSalesLead, initial);

  if (state.success) {
    return <div className="contact-success-v2" role="status"><span><CheckCircle2 /></span><h2>Solicitação recebida</h2><p>{state.success}</p><Link href="/">Voltar para o início</Link></div>;
  }

  return (
    <form action={action} className="contact-form-v2">
      <div className="contact-field-row"><label htmlFor="contact-name">Seu nome *</label><input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Como podemos chamar você?" /></div>
      <div className="contact-field-row"><label htmlFor="contact-company">Nome da empresa *</label><input id="contact-company" name="company" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Sua empresa de impressão 3D" /></div>
      <div className="contact-field-grid">
        <div className="contact-field-row"><label htmlFor="contact-email">E-mail *</label><input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="voce@empresa.com" /></div>
        <div className="contact-field-row"><label htmlFor="contact-phone">WhatsApp <span>opcional</span></label><input id="contact-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="(00) 00000-0000" /></div>
      </div>
      <div className="contact-field-row"><label htmlFor="contact-message">O que você quer organizar primeiro? <span>opcional</span></label><textarea id="contact-message" name="message" rows={3} maxLength={2000} placeholder="Ex.: pedidos, fila de produção, estoque de filamentos..." /></div>
      <label className="contact-honeypot" aria-hidden="true">Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <label className="contact-consent-v2"><input name="consent" type="checkbox" required /><span>Autorizo o contato sobre a demonstração e concordo com a <Link href="/privacidade">Política de Privacidade</Link>.</span></label>
      {state.error ? <p className="contact-error" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="contact-submit">{pending ? <><LoaderCircle className="contact-spinner" /> Enviando</> : <>Solicitar demonstração <ArrowRight /></>}</Button>
      <p className="contact-submit-note">Entraremos em contato usando os dados informados.</p>
    </form>
  );
}
