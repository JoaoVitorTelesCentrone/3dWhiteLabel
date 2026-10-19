"use client";

import { useActionState } from "react";
import { Button } from "@/components/base-ui/button";
import { captureSalesLead, type ContactState } from "./actions";

const initial: ContactState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(captureSalesLead, initial);
  if (state.success) return <div className="panel contact-success" role="status"><h2>Solicitação recebida</h2><p>{state.success}</p></div>;
  return <form action={action} className="panel contact-form">
    <div className="form-grid"><label>Seu nome<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label><label>Empresa<input name="company" required minLength={2} maxLength={160} autoComplete="organization" /></label></div>
    <div className="form-grid"><label>E-mail<input name="email" type="email" required maxLength={254} autoComplete="email" /></label><label>WhatsApp ou telefone <span>(opcional)</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label></div>
    <label>O que você quer avaliar? <span>(opcional)</span><textarea name="message" rows={4} maxLength={2000} /></label>
    <label className="contact-honeypot" aria-hidden="true">Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="contact-consent"><input name="consent" type="checkbox" required /> Autorizo o uso destes dados para receber retorno sobre a demonstração, conforme a Política de Privacidade.</label>
    {state.error ? <p className="error" role="alert">{state.error}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Solicitar demonstração"}</Button>
  </form>;
}
