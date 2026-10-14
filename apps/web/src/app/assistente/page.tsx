import { requireModulePermission } from "@/lib/auth/guards";
import { AssistantChat } from "./assistant-chat";

export default async function AssistantPage() {
  const context = await requireModulePermission("ai", "ai.use");

  return (
    <main className="management-page assistant-page">
      <header className="page-head management-page-head assistant-page-head">
        <div className="page-head-main">
          <p className="page-context">Inteligência operacional · {context.tenantName}</p>
          <h1 className="page-title">Assistente IA</h1>
          <p className="page-desc">Pergunte sobre vendas, clientes, produção, estoque, catálogo e finanças usando os dados atuais da empresa.</p>
        </div>
      </header>
      <AssistantChat
        configured={Boolean(process.env.OPENAI_API_KEY)}
        companyName={context.tenantName}
        firstName={context.fullName.trim().split(/\s+/, 1)[0] || "Olá"}
      />
    </main>
  );
}

