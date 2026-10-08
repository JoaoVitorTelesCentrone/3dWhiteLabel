# MONETIZACAO.md — Modelo de receita e plano de monetização rápida

## 1. Princípio

Não competir com SaaS de R$ 49/mês. Vender **software como ativo**: "o sistema da sua empresa". Licença única + recorrência de conveniência (Care) + serviços.

```text
Licença ≠ Hospedagem ≠ Manutenção   → 3 decisões, 3 receitas
```

## 2. Tabela de planos

| | **Start** | **Pro** | **Business** |
|---|---|---|---|
| Licença (única) | **R$ 1.497** | **R$ 2.497** | **R$ 4.997** |
| CRM, clientes, orçamentos, pedidos | ● | ● | ● |
| Produtos, modelos 3D, arquivos | ● | ● | ● |
| Estoque, filamentos, produção básica | ● | ● | ● |
| Impressoras, manutenção, fila, OPs, QR Code | | ● | ● |
| Custos reais, relatórios avançados, planner | | ● | ● |
| Portal do cliente, API, automações | | | ● |
| Integrações (marketplaces, ERP), IA | | | ● |
| Domínio customizado, multiunidade | | | ● |
| "Powered by Agencia 3D" removível | | | ● |

### Care (manutenção + hospedagem) — R$ 99/mês

Hospedagem, backup diário, monitoramento, atualizações, suporte, correções, recuperação de dados. Vendido como **conveniência**, nunca como obrigação para usar a licença. Sem Care: o cliente pode exportar dados e hospedar por conta (raro na prática — é o argumento que converte).

## 3. Catálogo de serviços (receita de margem alta)

| Serviço | Faixa |
|---|---|
| Implantação assistida (importação de dados + configuração + marca) | R$ 497–997 |
| Integração simples (WhatsApp, marketplace) | R$ 500–1.500 |
| Integração ERP (Bling, Omie) | R$ 1.500–3.000 |
| Relatório/dashboard customizado | R$ 300–800 |
| Automação específica | R$ 500–2.000 |
| Treinamento da equipe (2h, remoto) | R$ 397 |
| Módulo exclusivo | sob orçamento |

**Regra:** customização vira config/feature flag no core sempre que possível — nunca fork. Se 2 clientes pedem a mesma customização, ela vira módulo do produto.

## 4. Argumento de venda (âncora contra SaaS)

```text
Concorrente SaaS: R$ 59/mês × 5 anos = R$ 3.540  (e nunca é seu)
Agencia 3D Start:      R$ 1.497 único + R$ 99/mês opcional
```

Mensagem: *"Você não aluga mais uma ferramenta. Você compra o sistema da sua empresa, com a sua marca."*

## 5. Plano de monetização rápida (0–6 meses)

**Objetivo: primeira receita na semana 8, R$ 30 mil em 6 meses.**

### Semana 1–4 — Pré-venda antes do MVP pronto
- Landing page (marca Agencia 3D) + lista de espera.
- Mapear 50 print farms/bureaus brasileiros (Instagram, grupos de Facebook/WhatsApp de impressão 3D, feiras).
- Oferta de fundador: **licença Start por R$ 997** (33% off) para os 10 primeiros, com implantação gratuita. Meta: 5 pré-vendas = **R$ 4.985 antes do produto pronto** — valida o modelo e financia o desenvolvimento.

### Semana 5–8 — Pilotos
- 3 pilotos gratuitos (escolhidos entre os mais engajados, com 5+ impressoras) em troca de feedback semanal estruturado e permissão de case.
- Transformar cada piloto em **case público**: "Como a [empresa] saiu da planilha para o próprio sistema".

### Mês 3–4 — Lançamento do MVP
- Preço cheio R$ 1.497. Fundadores convertidos para Care desde o dia 1 (primeiro mês grátis).
- Canal principal: venda direta consultiva (demo ao vivo de 30 min com o tenant demo) — ticket de R$ 1.497 justifica vendas 1:1.
- Canal secundário: conteúdo (YouTube/Instagram) mostrando custo previsto × real e lucro/hora de máquina — conteúdo que nenhum concorrente mostra.

### Mês 5–6 — Recorrência e expansão
- Push de conversão para Care (meta: 60% dos licenciados).
- Lançar planos Pro/Business para upsell dos primeiros clientes.
- Primeiras customizações pagas (WhatsApp e Mercado Livre são as mais pedidas).

### Metas numéricas

| Marco | Clientes | Licenças | Care (MRR) | Acumulado |
|---|---|---|---|---|
| Mês 2 (pré-venda) | 5 | R$ 4.985 | — | R$ 5 mil |
| Mês 4 | 15 | R$ 21 mil | R$ 990 | R$ 27 mil |
| Mês 6 | 30 | R$ 45 mil | R$ 1.980 | R$ 50 mil |
| Mês 12 | 80–100 | R$ 140–170 mil | R$ 6–8 mil | R$ 200+ mil |

## 6. Unit economics

- Custo de infraestrutura por tenant (Supabase + Vercel + Cloudflare): **R$ 8–15/mês** no modelo compartilhado → Care tem margem de ~85%.
- CAC alvo: < R$ 400 (venda direta + conteúdo orgânico) → payback imediato na licença.
- LTV: R$ 1.497 + 24 meses de Care × 60% de adesão ≈ **R$ 2.900**, sem contar customizações.
- Regra de saúde: MRR de Care cobre toda a infraestrutura a partir de ~15 clientes; licenças e serviços são lucro/reinvestimento.

## 7. Motores de receita futuros

1. **Marketplace de módulos** — integrações e relatórios premium vendidos à la carte.
2. **Revenda/parceiros** — agências e consultorias de impressão 3D vendem a Agencia 3D com comissão de 20–30% na licença.
3. **Enterprise** — deploy dedicado + SSO + QMS para indústrias (R$ 2–5 mil/mês por contrato).
4. **Dados anonimizados de mercado** (média de falha por material/marca) como relatório pago — apenas com consentimento e agregação.

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Licença única sem recorrência suficiente | Care + customizações + upgrades; meta de 60% de adesão ao Care |
| Suporte consumir margem | Onboarding assíncrono (vídeos), base de conhecimento, Care pago, comunidade |
| Cliente querer "tudo customizado" | Catálogo de serviços com preços fechados; customização vira módulo do core |
| Concorrente copiar white label | Velocidade de nicho: custo previsto × real, planner e passaporte da peça exigem profundidade de domínio acumulada |
