import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de Privacidade | Sua Empresa 3D" };

export default function PrivacyPage() {
  return <main className="legal-page"><header><p>Atualizada em 18 de outubro de 2026</p><h1>Política de Privacidade</h1><p>Esta política explica como a Sua Empresa 3D trata dados no site comercial e na plataforma de gestão.</p></header>
    <section><h2>Dados tratados</h2><p>No pedido de demonstração, tratamos nome, empresa, e-mail, telefone opcional e a mensagem enviada. Na plataforma, tratamos dados de autenticação, equipe, clientes e registros operacionais inseridos pela empresa contratante.</p></section>
    <section><h2>Finalidades</h2><p>Usamos os dados comerciais para responder à solicitação e preparar a demonstração. Os dados da plataforma são usados para autenticar pessoas, executar os recursos contratados, proteger o ambiente, prestar suporte e manter registros de auditoria.</p></section>
    <section><h2>Papéis e compartilhamento</h2><p>A empresa cliente controla os dados que cadastra na própria operação. A Sua Empresa 3D atua como operadora desses dados na hospedagem assistida. Fornecedores de infraestrutura podem processar informações somente para autenticação, banco de dados, armazenamento, hospedagem, monitoramento e recursos contratados.</p></section>
    <section><h2>Retenção e segurança</h2><p>Solicitações comerciais são mantidas pelo período necessário à negociação e ao cumprimento de obrigações. Dados da plataforma seguem o contrato e o prazo de exportação ou exclusão após o encerramento. Aplicamos isolamento por empresa, políticas de acesso no banco, controle por papel, conexões criptografadas e backups definidos no plano contratado.</p></section>
    <section><h2>Direitos</h2><p>Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade quando aplicável, informação sobre compartilhamento, oposição ou exclusão, respeitadas as obrigações legais e contratuais. Use o formulário de contato e informe que o assunto é privacidade.</p></section>
    <section><h2>Cookies</h2><p>Usamos cookies estritamente necessários para sessão, segurança e preferência de aparência. Métricas opcionais só devem ser habilitadas com consentimento quando aplicável.</p></section>
    <p className="legal-return"><Link href="/contato">Falar sobre privacidade</Link> · <Link href="/">Voltar ao início</Link></p>
  </main>;
}
