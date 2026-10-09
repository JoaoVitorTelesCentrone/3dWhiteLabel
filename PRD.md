# PRD.md — Requisitos do produto

## Visão

ERP + PCP/MES verticalizado para empresas de impressão 3D, vendido white label por licença. Fluxo central: **Cliente → Pedido → Produção → Qualidade → Estoque → Entrega → Financeiro → Relatórios.**

## ICP

Empresas de impressão 3D, bureaus, lojas e pequenos fabricantes com produção recorrente.

---

## Módulo 1 — Dashboard

**Objetivo:** responder em 10 segundos "como está minha operação hoje".

- KPIs: faturamento do mês, lucro estimado, pedidos abertos/atrasados, jobs em andamento, peças concluídas, taxa de falha, material disponível/reservado e estoque de acabados.
- Seção **"Precisa da sua atenção"**: alertas acionáveis gerados por regras:
  - "PLA preto acabará em 4 dias" (previsão de consumo × estoque)
  - "Pedido #184 próximo do prazo"
  - "3 falhas com a mesma bobina" (correlação)
  - "Margem do produto X caiu de 42% → 31%"

## Módulo 2 — Clientes

- Cadastro de cliente para identificar quem comprou: nome, contato, empresa e observações.
- Página do cliente: histórico, receita, lucro, ticket médio, última compra, frequência, produtos mais comprados, botão **"Repetir pedido"**.

## Módulo 3 — Pedidos

O usuário cria o pedido com **cliente, produto e quantidade**. O sistema lê o preço e o custo da variação de produto e grava uma cópia desses valores no pedido. Assim, vender 3 unidades registra três vezes o faturamento e três vezes o custo daquela variação; a diferença aparece como lucro estimado no painel.

O cálculo detalhado abaixo pertence à formação do custo do produto e pode evoluir sem tornar o cadastro de pedido mais complexo:

```text
Material        peso estimado × custo/kg (da bobina/material cadastrado)
Máquina         tempo de impressão × custo/hora (depreciação + energia + manutenção)
Energia         potência média × tempo × tarifa
Mão de obra     slicing, preparação, retirada, acabamento, pintura, montagem, embalagem
Consumíveis     cola, lixa, FEP, bico, caixa, etiquetas...
Depreciação     valor da impressora ÷ vida útil em horas
Risco           % baseado no histórico de falhas daquele produto/material/máquina
Taxas           marketplace, gateway, cartão, imposto, comissão
Margem          markup ou margem alvo configurável
```

- Status: open → in_production → ready → shipped → delivered.
- A lista de pedidos permite abrir os detalhes, editar cliente/produto/quantidade de um pedido direto ainda aberto e excluir esse pedido antes de produção, recebimento ou expedição. A exclusão é auditada.
- Um pedido gera 1..n ordens de produção. O MVP não mantém estoque de produtos acabados; quantidade boa concluída em jobs atende ao pedido e defeitos/faltas voltam ao planejamento.
- Enviar um pedido à produção cria ordens vinculadas aos seus itens e muda o status para “Em produção” nas duas páginas. O modelo 3D é opcional para essa etapa. As peças boas concluídas alimentam o progresso do pedido; ao concluir todas, o pedido fica “Pronto para envio”.
- Dashboard: faturamento, custo e lucro estimado do mês somados a partir dos pedidos não cancelados.

## Módulo 5 — Produção (PCP/MES)

No MVP, a pipeline tem etapas derivadas de jobs e quantidade boa: a planejar, na fila, imprimindo, concluído e atenção. Arrastar para outra etapa abre o comando necessário; apenas iniciar um job enfileirado executa diretamente. Produto sem receita pode ser vendido; planejamento coleta bobina e estimativas que faltarem. Um pedido só fica pronto quando todas as OPs atingem a quantidade boa solicitada.

- **Ordens de produção:** produto, quantidade, prioridade, prazo, materiais, instruções, responsável.
- **Jobs de produção:** execução real — material, previsto × real (consumo e tempo), resultado (peças boas/defeituosas).
- **Fila Kanban:** Aguardando → Preparação → Pronto → Imprimindo → Pós-processamento → Qualidade → Concluído (drag-and-drop, realtime).
- **Falhas:** registro do motivo, tempo e material consumido; peças faltantes voltam ao planejamento.

## Módulo 6 — Qualidade

- Checklist (dimensões, acabamento, cor, montagem, embalagem) com aprovado/reprovado/retrabalho.
- Fase 3: tolerâncias, medições, não conformidade, CAPA, **passaporte da peça** (rastreabilidade completa: produto → revisão → pedido → OP → job → máquina → bobina → lote → operador → data → resultado). Crítico para clientes B2B/industriais.

## Módulo 7 — Catálogo

- **Modelos 3D:** biblioteca com revisões (v1..vn), arquivos (STL/3MF/STEP/OBJ/GCODE), licença, autor, tags, thumbnail. Produção sempre sabe qual revisão foi usada.
- **Produtos:** item comercial com SKU, variações (tamanho/cor/kit), preço, custo, estoque e **receita de produção** (BOM + ficha técnica + roteiro): arquivo, impressora recomendada, perfil, material, gramas, tempo, unidades por placa, pós-processamento, embalagem.

## Módulo 8 — Materiais

- **Bobinas individuais** com código/QR: fabricante, material, cor/HEX, peso inicial/atual, tara do carretel, custo/kg, fornecedor, lote, localização. Status: lacrada → aberta → em uso → reservada/secando → vazia/descartada.
- Ações via QR: corrigir peso, atribuir à máquina, mover, secar, reservar, descartar.
- **Estoque comprometido:** total / reservado / disponível considerando pedidos e jobs futuros.
- **Previsão:** "reposição recomendada: 20 kg de PLA preto; risco de ruptura em 5 dias" (consumo histórico + pedidos + produção planejada + lead time).
- Genérico para FDM (filamento), SLA/MSLA (resina, lotes, validade), SLS/MJF (pó virgem/reutilizado, ciclos) e insumos (IPA, lixa, FEP, embalagens).

## Módulo 10 — Compras e fornecedores

- Fornecedores com lead time, pedido mínimo, histórico de preços por material ("PLA preto: Forn. A R$ 72 · B R$ 86 · C R$ 69").
- Pedidos de compra de filamentos, resinas, peças, equipamentos, embalagens.

## Módulo 11 — Financeiro operacional

- Receitas, despesas, custos, margens — por produto, cliente, canal e máquina.
- **Custo previsto × real** por job/OP com breakdown da divergência (falha +R$1,80; material +R$0,44; MO +R$1,35).
- **Lucro por hora de máquina** — KPI estrela: Produto A R$4/h vs Produto B R$10/h.
- Fiscal (NF-e, tributação): **fora de escopo** — integração Bling/Omie.

## Módulo 12 — Relatórios

Comercial (conversão, ticket, recorrência), Produção (utilização, throughput, lead time), Qualidade (falhas, retrabalho, custo do desperdício), Materiais (consumo, cobertura em dias, material parado), Financeiro (margem por produto/cliente/canal), Máquinas (horas, receita, R$/h).

## Módulo 13 — Portal do cliente (Business)

`cliente.empresa3d.com.br`: acompanhar pedidos, orçamentos, arquivos, status de produção, entregas e faturas — com a marca do tenant.

## Módulo 14 — IA (Business, fase 3)

Respostas baseadas nos dados do tenant, sem chatbot genérico:
- "Por que minha margem caiu?" → decomposição (material ↑, falhas ↑, mix de canal, MO)
- "Compre 12 kg de PLA preto até quinta"
- "Mova JOB-382 para A1 #07 para evitar atraso"
- "Produto ABC vende muito, mas lucra pouco por hora de máquina"

## Módulo 15 — Configurações (white label)

Empresa, marca (logo/cores/favicon/fontes/CSS), unidades, usuários, permissões, módulos, licença, domínio customizado.
