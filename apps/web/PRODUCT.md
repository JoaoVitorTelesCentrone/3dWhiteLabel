# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: owners and operators of 3D-printing businesses (print farms and bureaus) — people who quote, produce, ship, and bill physical parts. They use the app at the factory, often standing at a machine, in a dark room, with gloves on. Secondary: Agencia 3D platform operators, who provision tenants and manage licenses through an internal console (`/admin`).

## Product Purpose

Agencia 3D is a multi-tenant, white-label ERP for 3D-printing businesses. It carries a sold item from direct order to delivered piece: catalog (products, 3D models, production recipes), customers, orders, production (jobs on printers), materials/spools, finance, and period reports. Success means the owner runs the whole business without spreadsheets, and the product carries the tenant's brand, not Agencia 3D's.

## Positioning

The mechanism a neighbor could not truthfully copy: every tenant gets the product as their own brand — the entire design system is themeable through CSS custom properties injected at runtime from `tenant_branding`, while Agencia 3D stays invisible except in the internal admin, the sales site, and a removable "Powered by" footer. The product speaks factory floor ("PLA preto acaba em 4 dias. Comprar 20 kg?"), not generic SaaS.

## Operating Context

- Dark-first UI: factory floor and wall-mounted dashboards favor dark backgrounds; light theme exists but dark is the brand default.
- Compact density (14px base) — it is a work tool, not a marketing site.
- The production queue is the product's board; the commercial pipeline is outside the MVP flow.
- "Previsto × Real" (planned vs. actual with colored delta) is the product's signature visual pattern.
- A wall-display "factory control tower" printer grid (auto-refresh, high contrast, no interaction) is a planned surface.
- pt-BR routes and user-facing copy; English for code, tables, and APIs.

## Capabilities and Constraints

- Next.js 15 (App Router, server components + server actions), React 19, Tailwind CSS v4 (CSS-first), shadcn-style components on @base-ui/react 1.8 (`components.json` style "base-nova"), pnpm + Turborepo.
- Supabase Postgres with RLS; every tenant-owned query filtered by `tenant_id`; access via `packages/db`.
- Module gating per tenant (catalog, crm, quotes, orders, production, printers, stock, finance, reports) plus role permissions; license states (active/suspended) gate the app.
- Brand tokens injected per request from host → `tenant_domains` + `tenant_branding` (name, primary/accent colors, logo from Supabase Storage).
- Hard rule: no hardcoded colors in UI — CSS custom properties only. Semantic status colors (success/warning/danger/info) are fixed and not tenant-themeable.
- Typefaces: Sora (headings/KPIs), Inter (body/UI), JetBrains Mono (codes, SKUs, spool labels).
- Icons: Lucide. No emoji as icons.
- Fonts must ship with the app (next/font); system-ui fallbacks required.

## Brand Commitments

`IDENTIDADE-VISUAL.md` is binding: token palette (`--brand-primary #FF5A1F`, `--brand-accent #FFB25A`, `--bg #0E1013`, `--bg-surface #1A1D23`, `--bg-elevated #242832`, `--text-primary #F4F5F7`, `--text-muted #9BA1AB`), tagline "Do orçamento à peça entregue.", industrial-direct voice, logo usage rules (`assets/agencia3d-logo.png`), dark mode first. Agencia 3D logo appears only in the internal admin, the sales site, and a removable "Powered by" footer.

## Evidence on Hand

- `assets/agencia3d-logo.png` — the anvil/3D-layers mark (orange-amber gradient).
- Product and architecture docs in the repo root (README, ARQUITETURA, DATABASE, PERMISSOES, ROADMAP, ESTRUTURA, IDENTIDADE-VISUAL).
- Local Supabase with a demo tenant for development; `dev-login` route for auth bypass in dev.
- No real customer testimonials, benchmarks, or pricing evidence — future work must not fabricate any.

## Product Principles

1. The tenant's brand always wins inside the tenant's app; Agencia 3D is the invisible engine.
2. Tokens, never hardcoded values — the golden rule of the design system.
3. Factory-floor clarity over marketing polish: dense, scannable, direct verbs.
4. Kanban and Previsto × Real are the product's native visual language.
5. Every number a worker trusts must be tenant-isolated, permission-checked, and explainable.

## Accessibility & Inclusion

Dark-first high-contrast UI; text contrast ≥ 4.5:1; visible focus states; 44px touch targets on interactive controls; `prefers-reduced-motion` respected.

---

Sources: product docs in the repository root and approved redesign plan 2026-02-28. Product truth was captured from repository evidence with the user's approved plan as the confirmation round.
