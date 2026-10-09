# MVP-ROADMAP.md — Escopo por fases

## Princípio

Decisão atual: o produto não cadastra nem controla impressoras ou manutenção. A produção acompanha pedidos, jobs, tempo, material e peças concluídas sem exigir uma máquina. Modelos 3D e receitas estão desativados, inclusive por URL direta; quando não há dados técnicos prévios, o planejamento do job solicita as estimativas necessárias. O estoque de produtos prontos é informado por contagem manual.

Não construir tudo. O MVP precisa ser **vendável** (licença Start), não completo. Multi-tenancy, branding, feature flags e RBAC nascem no primeiro commit — nunca depois.

---

## FASE 1 — MVP vendável (meta: 12–16 semanas)

| Semana | Entrega |
|---|---|
| 1–2 | Fundação: monorepo, auth, tenants, RLS, resolução por domínio, branding (logo/cores), RBAC, audit log |
| 3–4 | Cadastros base: clientes, produtos + variações, modelos 3D + revisões + upload de arquivos |
| 5–6 | Pedidos diretos: cliente, produto, quantidade, cópia de preço e custo, faturamento e lucro estimado |
| 7–8 | Materiais: materiais, bobinas individuais, movimentações, estoque comprometido |
| 9–10 | Produção: OPs, jobs (previsto × real), fila Kanban, painel da fábrica, falhas |
| 11–12 | Conexão entre produção, materiais e estoque de produtos prontos |
| 13–14 | Dashboard e relatórios essenciais (vendas e produção) |
| 15–16 | Console admin Agencia 3D (tenants, licenças, módulos), domínios customizados, seed demo, hardening, testes de vazamento multi-tenant |

**MVP inclui:** login, multi-tenant, white label, usuários/permissões, dashboard, cadastro de clientes, pedidos diretos, produtos, materiais, estoque, OPs, jobs, falhas e relatórios.

**MVP exclui (propositalmente):** QR Code, portal do cliente, integrações, IA, planner, multiunidade, fiscal.

**Critério de pronto:** um print farm real opera 2 semanas inteiras só no sistema (sem planilha paralela) e paga a licença.

## FASE 2 — Crescimento (após 5–10 clientes pagantes)

### Contrato vigente do fluxo MVP

O caminho obrigatório é venda direta → produção → expedição/entrega → recebimentos e gestão. Orçamentos são opcionais; produto sem receita continua vendável e recebe dados técnicos no planejamento. O estoque de acabados é ajustado manualmente e ainda não é atualizado automaticamente pela produção ou venda. Status de pedido é resultado de comandos auditáveis, e a pipeline deriva do estado de jobs e da quantidade boa. Consulte `PLANO-INTEGRACAO-PONTA-A-PONTA.md` para migrations, testes e critérios executáveis.

- QR Code de bobinas (scanner mobile)
- Previsão de estoque + reposição recomendada
- Estoque de produtos acabados com reserva automática
- Fornecedores + compras + histórico de preços
- Planner inteligente + planejamento noturno
- Portal do cliente (Business)
- Integrações: Mercado Livre, Shopee, Nuvemshop, WhatsApp
- OctoPrint + Moonraker (telemetria, progresso, controle)
- Notificações (e-mail/WhatsApp), API pública + webhooks
- Multiunidade (branches)

## FASE 3 — Expansão (produto maduro)

- Visualizador 3D + análise automática de arquivos (dimensões, volume, peso, tempo)
- Orçamentos e negociação para operações que precisarem vender antes da confirmação do pedido
- Orçamento automático a partir do upload STL
- Qualidade avançada / QMS / CAPA / passaporte da peça
- IA operacional (margem, compras, produção, manutenção)
- Scheduling avançado, OEE, telemetria
- Enterprise: deploy dedicado, SSO, audit log avançado

## Roadmap de receita paralelo

| Marco | Ação comercial |
|---|---|
| Semana 8 (alpha) | 3 print farms pilotos gratuitos em troca de feedback semanal |
| Semana 16 (MVP) | Primeiras 5 licenças Start com desconto de fundador (R$ 997) |
| Mês 5 | Preço cheio R$ 1.497 + plano Care R$ 99/mês |
| Mês 6–8 | Planos Pro/Business + catálogo de customizações (ver MONETIZACAO.md) |
| Mês 9+ | Integrações pagas + marketplace de templates/módulos |
