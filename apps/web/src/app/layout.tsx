import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { roleAllows, type Permission } from "@/lib/auth/permissions";
import { getTenantContext, resolveRequestHost } from "@/lib/tenant/context";
import type { ModuleKey } from "@/lib/tenant/modules";
import { AppNavigation, type NavigationGroup, type NavigationLink } from "@/components/app-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastCenter } from "@/components/toast-center";
import "./globals.css";

const agencia3dHeading = Sora({ subsets: ["latin"], variable: "--font-agencia3d-heading", display: "swap" });
const agencia3dBody = Inter({ subsets: ["latin"], variable: "--font-agencia3d-body", display: "swap" });
const agencia3dMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-agencia3d-mono", display: "swap" });

type WorkspaceLink = NavigationLink & { module?: ModuleKey; permission: Permission };
type WorkspaceGroup = { id: string; label: string; links: WorkspaceLink[] };

const workspaceGroups: WorkspaceGroup[] = [
  { id: "products", label: "Produtos", links: [
    { href: "/catalogo/produtos", label: "Produtos", module: "catalog", permission: "catalog.view" },
    { href: "/catalogo/modelos", label: "Modelos 3D", module: "catalog", permission: "designs.view" },
    { href: "/catalogo/receitas", label: "Receitas", module: "catalog", permission: "catalog.view" },
  ] },
  { id: "agenda", label: "Agenda", links: [
    { href: "/clientes", label: "Clientes", module: "crm", permission: "crm.view" },
    { href: "/pedidos", label: "Pedidos", module: "orders", permission: "orders.view" },
    { href: "/producao", label: "Produção", module: "production", permission: "production.view" },
    { href: "/impressoras", label: "Impressoras", module: "printers", permission: "printers.view" },
  ] },
  { id: "reports", label: "Relatórios", links: [
    { href: "/relatorios", label: "Relatórios", permission: "reports.view" },
  ] },
  { id: "finance", label: "Financeiro", links: [
    { href: "/financeiro", label: "Financeiro", permission: "finance.view" },
  ] },
  { id: "materials", label: "Materiais", links: [
    { href: "/materiais", label: "Materiais", module: "stock", permission: "stock.view" },
  ] },
];

export const metadata: Metadata = {
  title: "Agencia 3D — Gestão para impressão 3D",
  description: "Do orçamento à peça entregue.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeCookie = (await cookies()).get("agencia3d-theme")?.value;
  const theme = themeCookie === "light" ? "light" : "dark";
  const host = resolveRequestHost(await headers());
  const supabase = await createClient();
  const { data: domain } = host
    ? await supabase.from("tenant_domains").select("tenant_id").eq("host", host).eq("status", "active").maybeSingle()
    : { data: null };
  const { data: branding } = domain
    ? await supabase.from("tenant_branding").select("display_name,primary_color,accent_color,logo_path").eq("tenant_id", domain.tenant_id).maybeSingle()
    : { data: null };
  const logo = branding?.logo_path
    ? supabase.storage.from("forja-branding").getPublicUrl(branding.logo_path).data.publicUrl
    : null;
  const { data: claims } = domain ? await supabase.auth.getClaims() : { data: null };
  const context = typeof claims?.claims?.sub === "string" ? await getTenantContext(claims.claims.sub) : null;
  const availableGroups = context ? workspaceGroups.map((group) => ({
    id: group.id,
    label: group.label,
    links: group.links.filter((link) => (!link.module || context.modules.includes(link.module)) && roleAllows(context.role, link.permission))
      .map(({ href, label }) => ({ href, label })),
  })).filter((group) => group.links.length > 0) : [];
  const availableLinks = availableGroups.flatMap((group) => group.links);
  const visibleLink = (href: string) => availableLinks.find((link) => link.href === href);
  const navigationLinks = (...links: (NavigationLink | null | undefined)[]) => links.filter((link): link is NavigationLink => Boolean(link));
  const groups: NavigationGroup[] = [
    { id: "overview", label: "Visão geral", links: [{ href: "/dashboard", label: "Visão geral" }] },
    { id: "commercial", label: "Comercial", links: navigationLinks(
      visibleLink("/pedidos"),
    ) },
    { id: "production", label: "Produção", links: navigationLinks(
    visibleLink("/producao"), visibleLink("/impressoras"), visibleLink("/materiais"),
    ) },
    { id: "catalog", label: "Catálogo", links: navigationLinks(
      visibleLink("/catalogo/produtos"), visibleLink("/catalogo/modelos"), visibleLink("/catalogo/receitas"),
    ) },
    { id: "management", label: "Gestão", links: navigationLinks(visibleLink("/financeiro"), visibleLink("/relatorios")) },
  ].filter((group) => group.links.length > 0) as NavigationGroup[];
  const settings: NavigationLink[] = context ? [
    ...(visibleLink("/clientes") ? [{ href: "/clientes", label: "Clientes" }] : []),
    ...(roleAllows(context.role, "branding.manage") ? [{ href: "/configuracoes/marca", label: "Marca" }] : []),
    ...(roleAllows(context.role, "users.manage") ? [{ href: "/configuracoes/usuarios", label: "Usuários" }] : []),
  ] : [];
  const brandStyle = {
    "--brand-primary": branding?.primary_color ?? "#ff5a1f",
    "--brand-accent": branding?.accent_color ?? "#ffb25a",
  } as CSSProperties;
  return (
    <html lang="pt-BR" className={`${theme} ${agencia3dHeading.variable} ${agencia3dBody.variable} ${agencia3dMono.variable}`}>
      <body style={brandStyle} className={context ? "workspace-shell" : undefined}>
        <ToastCenter />
        {context ? <AppNavigation groups={groups} settings={settings} brandName={branding?.display_name ?? "Agencia 3D"} logo={logo} fullName={context.fullName} theme={theme}>{children}</AppNavigation> : <>
          <header className="brand-header"><div className="brand-header-inner"><Link href="/" className="brand-link">
            {logo ? <Image src={logo} alt="" width={40} height={40} unoptimized /> : <span className="brand-mark" aria-hidden="true">A3</span>}
            <span>{branding?.display_name ?? "Agencia 3D"}</span>
          </Link><ThemeToggle initialTheme={theme} /></div></header>
          <div>{children}</div>
        </>}
      </body>
    </html>
  );
}
