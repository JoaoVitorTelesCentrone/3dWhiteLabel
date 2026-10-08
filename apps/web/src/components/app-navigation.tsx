"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Factory, LayoutDashboard, Package, Settings2, UsersRound, Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { RouteProgress } from "@/components/route-progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

export type NavigationLink = { href: string; label: string };
export type NavigationGroup = {
  id: "overview" | "commercial" | "production" | "catalog" | "management";
  label: string;
  links: NavigationLink[];
};
const icons = {
  overview: LayoutDashboard,
  commercial: UsersRound,
  production: Factory,
  catalog: Package,
  management: Wallet,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isLinkActive(pathname: string, link: NavigationLink) {
  return isActive(pathname, link.href);
}

function BrandLink({ brandName, logo }: { brandName: string; logo: string | null }) {
  const { setOpenMobile } = useSidebar();
  return (
    <Link href="/dashboard" className="sidebar-brand" aria-label={`${brandName}: visão geral`} onClick={() => setOpenMobile(false)}>
      {logo ? <Image src={logo} alt="" width={40} height={40} unoptimized /> : <span className="brand-mark" aria-hidden="true">F</span>}
      <span className="sidebar-brand-name">{brandName}</span>
    </Link>
  );
}

function NavigationSections({ groups, settings, pathname, theme }: {
  groups: NavigationGroup[];
  settings: NavigationLink[];
  pathname: string;
  theme: "dark" | "light";
}) {
  const activeGroup = groups.find((group) => group.links.some((link) => isLinkActive(pathname, link)))?.id;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup ?? null);
  const [settingsOpen, setSettingsOpen] = useState(settings.some((link) => isActive(pathname, link.href)));
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);

  return (
    <>
      <SidebarContent className="agencia3d-sidebar-content">
        <nav aria-label="Áreas principais">
          <SidebarMenu>
            {groups.map((group) => {
              const Icon = icons[group.id];
              const active = group.links.some((link) => isLinkActive(pathname, link));
              const singleLink = group.links.length === 1 ? group.links[0] : null;

              return (
                <SidebarMenuItem key={group.id}>
                  {singleLink ? (
                    <SidebarMenuButton
                      render={<Link href={singleLink.href} onClick={closeMobile} />}
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      className="agencia3d-menu-button"
                    >
                      <Icon aria-hidden="true" />
                      <span>{group.id === "overview" ? group.label : singleLink.label}</span>
                    </SidebarMenuButton>
                  ) : (
                    <Collapsible open={openGroup === group.id} onOpenChange={(open) => setOpenGroup(open ? group.id : null)} className="agencia3d-menu-group">
                      <CollapsibleTrigger render={<SidebarMenuButton isActive={active} className="agencia3d-menu-button" />}>
                        <Icon aria-hidden="true" />
                        <span>{group.label}</span>
                        <ChevronDown className="agencia3d-menu-chevron" aria-hidden="true" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="agencia3d-menu-panel">
                        <SidebarMenuSub>
                          {group.links.map((link) => {
                            const linkActive = isLinkActive(pathname, link);
                            return (
                              <SidebarMenuSubItem key={link.href}>
                                <SidebarMenuSubButton
                                  render={<Link href={link.href} onClick={closeMobile} />}
                                  isActive={linkActive}
                                  aria-current={linkActive ? "page" : undefined}
                                  className="agencia3d-submenu-button"
                                >
                                  <span>{link.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
      </SidebarContent>
      <SidebarFooter className="agencia3d-sidebar-footer">
        {settings.length > 0 && (
          <SidebarMenu>
            <SidebarMenuItem>
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="agencia3d-menu-group">
                <CollapsibleTrigger render={<SidebarMenuButton isActive={settings.some((link) => isActive(pathname, link.href))} className="agencia3d-menu-button" />}>
                  <Settings2 aria-hidden="true" />
                  <span>Configurações</span>
                  <ChevronDown className="agencia3d-menu-chevron" aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent className="agencia3d-menu-panel">
                  <SidebarMenuSub>
                    {settings.map((link) => {
                      const linkActive = isActive(pathname, link.href);
                      return (
                        <SidebarMenuSubItem key={link.href}>
                          <SidebarMenuSubButton
                            render={<Link href={link.href} onClick={closeMobile} />}
                            isActive={linkActive}
                            aria-current={linkActive ? "page" : undefined}
                            className="agencia3d-submenu-button"
                          >
                            <span>{link.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <div className="sidebar-theme-control"><span>Aparência</span><ThemeToggle initialTheme={theme} /></div>
      </SidebarFooter>
    </>
  );
}

export function AppNavigation({ groups, settings, brandName, logo, fullName, theme, children }: {
  groups: NavigationGroup[];
  settings: NavigationLink[];
  brandName: string;
  logo: string | null;
  fullName: string;
  theme: "dark" | "light";
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <RouteProgress />
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      <Sidebar side="left" aria-label="Navegação da plataforma">
        <SidebarHeader className="agencia3d-sidebar-header">
          <BrandLink brandName={brandName} logo={logo} />
          <span className="sidebar-user" title={fullName}>{fullName}</span>
        </SidebarHeader>
        <NavigationSections key={pathname} pathname={pathname} groups={groups} settings={settings} theme={theme} />
      </Sidebar>
      <div className="workspace-content">
        <div className="mobile-navigation-bar">
          <SidebarTrigger />
          <span className="mobile-navigation-title">{brandName}</span>
          <ThemeToggle initialTheme={theme} />
        </div>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
