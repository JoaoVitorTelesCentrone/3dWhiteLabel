"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Database, LoaderCircle, Send, ShieldCheck, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/base-ui/button";
import type { AssistantMessage } from "@/lib/ai/schemas";

type ConversationMessage = AssistantMessage & { id: string; sources?: string[] };

const suggestions = [
  "Como estão as vendas nos últimos 30 dias?",
  "Quais pedidos precisam de atenção?",
  "Como está a produção agora?",
  "Há materiais ou produtos com estoque baixo?",
];

const sourceLabels: Record<string, string> = {
  overview: "Visão geral",
  orders: "Pedidos",
  customers: "Clientes",
  production: "Produção",
  inventory: "Estoque",
  finance: "Financeiro",
  catalog: "Catálogo",
  quotes: "Orçamentos",
};

function makeMessage(role: AssistantMessage["role"], content: string, sources?: string[]): ConversationMessage {
  return { id: crypto.randomUUID(), role, content, sources };
}

export function AssistantChat({ configured, companyName, firstName }: { configured: boolean; companyName: string; firstName: string }) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function send(content: string) {
    const question = content.trim();
    if (!question || loading || !configured) return;
    const nextMessages = [...messages, makeMessage("user", question)];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-16).map(({ role, content: text }) => ({ role, content: text })) }),
      });
      const data: unknown = await response.json().catch(() => null);
      const payload = data && typeof data === "object" ? data as { answer?: unknown; error?: unknown; sources?: unknown } : {};
      if (!response.ok || typeof payload.answer !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível obter uma resposta.");
      }
      const sources = Array.isArray(payload.sources) ? payload.sources.filter((item): item is string => typeof item === "string") : [];
      setMessages((current) => [...current, makeMessage("assistant", payload.answer as string, sources)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível consultar o assistente.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="assistant-shell" aria-label="Conversa com o assistente da empresa">
      <div className="assistant-workspace">
        <header className="assistant-toolbar">
          <div className="assistant-status"><span aria-hidden="true" /><strong>Dados de {companyName}</strong><small>consulta em tempo real</small></div>
          {messages.length > 0 ? <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setError(""); }} disabled={loading}><Trash2 /> Limpar conversa</Button> : null}
        </header>

        <div className="assistant-conversation" aria-live="polite">
          {messages.length === 0 ? (
            <div className="assistant-welcome">
              <span className="assistant-welcome-icon"><Bot aria-hidden="true" /></span>
              <p className="assistant-eyebrow">ASSISTENTE INTERNO</p>
              <h2>O que você quer entender, {firstName}?</h2>
              <p>Faço consultas de leitura nos dados que seu perfil já pode acessar e organizo a resposta para apoiar sua decisão.</p>
              <div className="assistant-suggestions">
                {suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void send(suggestion)} disabled={!configured}>{suggestion}<span aria-hidden="true">↗</span></button>)}
              </div>
            </div>
          ) : messages.map((message) => (
            <article key={message.id} className={`assistant-message assistant-message--${message.role}`}>
              <span className="assistant-message-author">{message.role === "user" ? "Você" : "Assistente IA"}</span>
              <div className="assistant-message-content">
                {message.role === "assistant" ? <ReactMarkdown>{message.content}</ReactMarkdown> : <p>{message.content}</p>}
              </div>
              {message.sources?.length ? <footer><Database aria-hidden="true" /> Consultado: {message.sources.map((source) => sourceLabels[source] ?? source).join(" · ")}</footer> : null}
            </article>
          ))}
          {loading ? <div className="assistant-thinking"><LoaderCircle aria-hidden="true" /><span>Consultando os dados da empresa…</span></div> : null}
          <div ref={conversationEnd} />
        </div>

        <div className="assistant-composer-wrap">
          {!configured ? <p className="assistant-config-warning" role="alert">Configure <code>OPENAI_API_KEY</code> no servidor para ativar o assistente.</p> : null}
          {error ? <p className="assistant-error" role="alert">{error}</p> : null}
          <form className="assistant-composer" onSubmit={submit}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} maxLength={4_000} rows={2} placeholder="Pergunte sobre a sua empresa…" aria-label="Mensagem para o Assistente IA" disabled={!configured || loading} />
            <Button type="submit" size="icon-lg" aria-label="Enviar pergunta" disabled={!configured || loading || !draft.trim()}><Send /></Button>
          </form>
          <p className="assistant-disclaimer">Enter envia · Shift + Enter quebra a linha · O assistente não altera registros.</p>
        </div>
      </div>

      <aside className="assistant-trust-panel" aria-label="Como o assistente usa seus dados">
        <p className="assistant-eyebrow">ACESSO CONTROLADO</p>
        <h2>Respostas com contexto do negócio.</h2>
        <div className="assistant-trust-item"><ShieldCheck aria-hidden="true" /><div><strong>Mesmas permissões do seu perfil</strong><span>Áreas e dados financeiros continuam protegidos pelas regras da plataforma.</span></div></div>
        <div className="assistant-trust-item"><Database aria-hidden="true" /><div><strong>Consulta somente leitura</strong><span>O agente pesquisa dados atuais, mas não cria, edita ou exclui registros.</span></div></div>
        <p className="assistant-privacy-note">Evite enviar senhas, documentos ou outros dados sensíveis na conversa.</p>
      </aside>
    </section>
  );
}
