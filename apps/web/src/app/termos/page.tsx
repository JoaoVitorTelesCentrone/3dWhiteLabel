import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Termos de Uso | Sua Empresa 3D" };

export default function TermsPage() {
  return <main className="legal-page"><header><p>Atualizados em 18 de outubro de 2026</p><h1>Termos de Uso</h1><p>Estes termos regem o acesso ao site, à demonstração e à plataforma Sua Empresa 3D.</p></header>
    <section><h2>Demonstração</h2><p>O ambiente demonstrativo contém dados fictícios, pode ser reiniciado e não deve receber dados pessoais, segredos comerciais ou arquivos de produção. O acesso pode ser revogado em caso de abuso ou tentativa de violação.</p></section>
    <section><h2>Licença e Care</h2><p>A licença concede à empresa contratante o direito de usar a versão e os módulos descritos na proposta. Hospedagem, backups, suporte e atualizações são prestados pelo Care ou por contrato específico. Preço, prazo, usuários, módulos e customizações constam da proposta aceita.</p></section>
    <section><h2>Responsabilidades</h2><p>A empresa cliente é responsável pela legitimidade dos dados cadastrados, pelos acessos que concede à equipe e pela conferência de valores, prazos e decisões operacionais. A plataforma apoia a gestão e não substitui obrigações fiscais, contábeis, trabalhistas ou de segurança industrial.</p></section>
    <section><h2>Disponibilidade e suporte</h2><p>Manutenções programadas e incidentes de fornecedores podem afetar temporariamente o serviço. Os canais, horários, níveis de serviço e procedimentos de recuperação aplicáveis são os definidos na proposta ou no contrato de Care.</p></section>
    <section><h2>Encerramento e dados</h2><p>No encerramento da hospedagem assistida, a empresa pode solicitar exportação em formato tecnicamente disponível dentro do prazo contratual. A exclusão ocorre após esse prazo, preservados registros necessários ao cumprimento de obrigações legais.</p></section>
    <p className="legal-return"><Link href="/contato">Falar com a equipe</Link> · <Link href="/privacidade">Política de Privacidade</Link> · <Link href="/">Voltar ao início</Link></p>
  </main>;
}
