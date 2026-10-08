# Plano de integração ponta a ponta da Agencia 3D

## Objetivo

Fazer uma venda cadastrada em **Pedidos** percorrer catálogo, produção, materiais, impressoras, conclusão, entrega, financeiro, dashboard e relatórios com os mesmos fatos e valores em todas as telas. O fluxo principal começa **depois da venda**: cliente + produto + quantidade. Oportunidades e orçamentos não são pré-requisitos.

Este plano foi elaborado em 7 de outubro de 2026 a partir do código, das migrations, dos testes e de `PRD.md`, `MVP-ROADMAP.md`, `ARQUITETURA.md`, `DATABASE.md` e `GUIA-DE-IMPLEMENTACAO.md`. A auditoria inicial foi complementada pela execução das migrations, pelos testes em banco limpo e por uma jornada autenticada no navegador. Os gaps abaixo registram o estado encontrado antes das mudanças; o resultado executado está no fim deste documento.

## Fluxo que precisa funcionar

```text
Cliente + produto (preço/custo) → pedido confirmado
→ ordem de produção por item → jobs com impressora e bobina
→ início → conclusão ou falha → peças boas suficientes
→ pronto para envio → expedição → entrega
→ recebimento → dashboard e relatório coerentes
```

Cada transição precisa ter um único comando no servidor, validação de permissão e tenant, operação transacional, auditoria e atualização das telas afetadas. Arrastar um card é uma forma de acionar esse comando; a coluna não pode contar uma história diferente do pedido e dos jobs.

## Gaps antes da execução

| Área | O que já existe | Gap e efeito observado | Prioridade |
|---|---|---|---|
| Pedido → produção | Criar pedido copia preço/custo do produto. Liberar pedido cria OPs vinculadas. | O seletor de status chama `set_sales_order_status`, que aceita avançar diretamente para `ready`, `shipped` ou `delivered` sem concluir produção nem registrar expedição. Também permite voltar entre estados já avançados, salvo retorno a `open` com OP. Pedidos, Produção e Financeiro podem divergir. | P0 |
| Pipeline de produção | Cards, drag and drop e coluna persistida em `production_orders.pipeline_stage`. | A RPC de movimento altera só `pipeline_stage`. Não cria/inicia/conclui job, não consome material e não atualiza OP nem pedido. Assim, um card pode ficar em “Concluído” com `0` peças prontas. As ações de job tampouco atualizam essa coluna. | P0 |
| Permissões da pipeline | Há checagens na Server Action e na RPC. | A ação exige `production.plan`; a RPC aceita também `operator`, que só tem `production.start` na matriz web. A interface exibe alça de arraste para todos que conseguem ver a página. Alinhar visibilidade, ação e banco por transição. | P0 |
| Produto → receita → job | Há receita versionada, revisão 3D e material; pedido direto copia a revisão ativa. | O material da OP é obtido da **receita ativa na criação da OP**, não de um snapshot completo feito na venda. Trocar a receita entre venda e produção pode misturar revisão antiga com material novo. Estimativas de gramas/tempo da receita não preenchem o job. | P1 |
| Produção → estoque e máquina | Criar job reserva gramas; iniciar ocupa impressora; concluir/falhar registra consumo, movimentos, tempo e libera máquina. | Faltam fluxos completos de cancelamento, liberação de reserva e replanejamento. Falhas não têm uma etapa de resolução explícita; uma OP pode ficar em coluna arbitrária. Materiais mostra peso físico sem descontar as reservas na tela, embora o planejamento desconte. | P1 |
| Produção → pronto | Peças boas dos jobs concluídos compõem o progresso; a RPC marca OP e pedido como prontos ao atingir a meta. | Isso pode ser contornado pelo seletor manual e pela coluna persistida. Para múltiplas OPs/jobs, a coluna e o rótulo precisam representar o conjunto corretamente. | P0 |
| Pronto → entrega | Há RPCs de expedição e entrega, com registro de envio. | O seletor manual permite marcar `shipped`/`delivered` sem usar essas RPCs, deixando `order_shipments` ausente. | P0 |
| Pedido → financeiro → gestão | Pagamentos parciais, despesas, saldo a receber, dashboard e relatório existem. | Dashboard usa custo **estimado do produto**. Relatório calcula material real pelo **preço atual** do material, sem snapshot histórico; não há conciliação formal entre custo previsto, custo real e margem. O painel deve deixar clara a origem de cada número. | P1 |
| Testes e documentação | Há testes unitários de preço/progresso e alguns scripts SQL de fluxo e isolamento. | Não há cobertura automatizada da pipeline, de transições inválidas, da jornada completa, de concorrência de reservas ou de papéis/tenants para as novas RPCs. `PRD.md` e `GUIA-DE-IMPLEMENTACAO.md` ainda descrevem passos anteriores à simplificação do produto. | P0/P1 |

**Evidências principais:** `apps/web/src/app/pedidos/actions.ts`, `apps/web/src/app/producao/actions.ts`, `apps/web/src/app/producao/page.tsx`, `apps/web/src/app/producao/production-pipeline-dnd.tsx`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/relatorios/page.tsx`, `supabase/migrations/20261007171235_order_status_controls.sql`, `supabase/migrations/20261007184500_production_pipeline.sql`, `supabase/migrations/20261007185500_fix_pipeline_move_audit.sql`, `supabase/migrations/20261007151007_direct_order_recipe_snapshot.sql` e `supabase/migrations/20261005215654_production_jobs.sql`.

## Contrato de estados proposto

| Registro | Estados/etapas | Regra para mudar |
|---|---|---|
| Pedido | Aberto → Em produção → Pronto para envio → Enviado → Entregue | Produção cria OPs; todas as quantidades boas liberam envio; expedição cria registro; entrega fecha esse registro. Correções excepcionais precisam de comando próprio e auditoria. |
| Job | Na fila → Imprimindo → Concluído **ou** Falhou/Cancelado | Início exige impressora livre e reserva ativa. Conclusão exige tempo, gramas e quantidades. Falha registra motivo e consumo. Cancelamento libera reserva e máquina quando aplicável. |
| OP | A planejar → Na fila → Imprimindo → Concluída; Atenção quando houver falha pendente | Etapa **derivada** de jobs, quantidade boa e pendências. “Concluída” exige peças boas suficientes. “Atenção” é uma exceção a resolver, não um atalho para conclusão. |

**Decisão de implementação recomendada:** substituir `pipeline_stage` editável livremente por uma projeção derivada do estado operacional, ou restringir sua gravação a comandos transacionais que façam a ação de domínio correspondente. O drag and drop deve abrir o formulário necessário antes de confirmar a mudança: planejar job (impressora, bobina, quantidade, previsão), iniciar job, concluir job (tempo, material, boas/defeituosas) ou registrar falha. Movimentos impossíveis devem explicar o motivo e manter o card na origem. Em uma OP com mais de um job, iniciar ou concluir um único job não significa necessariamente concluir a OP.

## Sequência de execução

### P0 — Unificar estados e impedir dados contraditórios

1. Definir uma matriz executável de transições de pedido, OP e job, incluindo falha, retrabalho, cancelamento e múltiplos jobs. Registrar quais ações são automáticas e quais exigem dados do operador.
2. Restringir ou substituir `set_sales_order_status`: o status na tabela de Pedidos deve acionar o comando correto e oferecer apenas destinos válidos. `shipped` exige `ship_order`; `delivered` exige `deliver_order`; `ready` exige produção concluída ou uma justificativa explícita para venda sem produção.
3. Fazer a pipeline refletir o estado real. Retirar a possibilidade de gravar “Concluído” sem peças boas ou “Imprimindo” sem job iniciado. O drop abre a ação necessária e só move o card depois do sucesso no banco. Disponibilizar a mesma ação por clique/teclado para quem não usa arraste.
4. Sincronizar projeções após `create_production_job`, `start_production_job`, `complete_production_job` e `fail_production_job`; alinhar papéis entre UI, Server Actions e RPCs. Atualizar Pedidos, Produção, Materiais, Impressoras, Dashboard e Relatórios após cada transição relevante.
5. Adicionar testes de banco para: salto inválido de pedido; drop inválido; início com máquina ocupada; conclusão parcial; múltiplas OPs; falha; status de pedido e pipeline iguais após recarregar; bloqueio entre tenants.

**Aceite P0:** ninguém consegue marcar o pedido como entregue sem expedição, nem colocar a OP como concluída com peças faltando. Arrastar e recarregar mostra a mesma etapa em Pedidos e Produção; um movimento recusado preserva os dados anteriores.

### P1 — Ligar catálogo, receita, materiais e execução

1. Definir um snapshot imutável na venda/liberação: variante, preço, custo previsto, revisão, versão da receita, material, gramas e minutos previstos. Produto sem receita continua vendável; ao planejar produção, a interface pede os dados técnicos que faltarem.
2. Preencher o planejamento de job a partir da receita, permitindo ajuste explícito pelo operador. Validar material compatível, bobina disponível, impressora ativa/livre e quantidade ainda não coberta.
3. Exibir em Materiais **físico, reservado e disponível** por bobina. Implementar cancelamento de job, liberação de reserva, reposição após falha e reconciliação com `spool_movements`.
4. Tratar concorrência e repetição de comandos: dupla submissão, dois operadores reservando a mesma bobina, início repetido e conclusão repetida não podem duplicar consumo, horas, auditoria ou peças boas.
5. Manter pedido, OP e job rastreáveis um ao outro na UI, mesmo quando um pedido tiver mais de um item e cada item tiver mais de um job.

**Aceite P1:** uma venda de 3 unidades gera demanda de 3; jobs podem dividir essa quantidade; reservas não excedem os gramas disponíveis; falha libera ou consome conforme o registro; a soma das peças boas determina o progresso em todas as telas.

### P2 — Fechar entrega, financeiro e indicadores

1. Deixar expedição e entrega acessíveis no detalhe do pedido e refletir seus registros reais na lista. Definir como registrar retirada local ou entrega sem transportadora, mantendo evidência de entrega.
2. Vincular recebimentos ao pedido em todas as visões. Explicitar “valor vendido”, “valor recebido”, “saldo a receber”, “custo previsto” e “custo real”; evitar chamar estimativa de lucro realizado.
3. Registrar custo de material em snapshot no consumo e escolher a composição mínima do custo real do MVP. Reconciliar o total exibido no pedido, Financeiro, Dashboard, Relatórios e CSV para o mesmo período e tenant.
4. Definir a regra de competência: venda pela data do pedido; recebimento pela data do pagamento; despesa pela data de ocorrência; produção pela data de conclusão. Fixar fuso `America/Sao_Paulo` e testar virada de dia/mês.
5. Criar alertas acionáveis para pedido parado, job com falha pendente, máquina ocupada e bobina insuficiente, cada um levando ao registro correto.

**Aceite P2:** o pedido entregue aparece com envio/entrega reais, pagamentos parciais e saldo correto. Os mesmos filtros de período produzem totais reconciliados no painel, no relatório e no CSV.

### P3 — Operação completa e prontidão para piloto

1. Decidir e documentar o mínimo de qualidade e pós-processamento para o MVP: aprovar/reprovar peças e registrar retrabalho antes de liberar expedição, ou retirar essas etapas do critério de pronto atual. Se houver estoque de acabados, implementar ledger e reserva antes de subtrair a demanda de produção.
2. Revisar onboarding e cadastros dependentes: cliente e produto para vender; receita opcional; impressora, material e bobina para planejar job. Mostrar na tela exatamente o que falta para a próxima ação.
3. Revisar RLS, grants, `SECURITY DEFINER`, escopos por `tenant_id`, papéis, licença suspensa, storage e auditoria nas novas rotas/RPCs. Cobrir dois tenants e papéis sem acesso em testes de banco e interface.
4. Automatizar a jornada principal no navegador e no banco recriado (`pnpm db:reset`), incluindo falha/retrabalho e retomada. Executar typecheck, lint, testes, build, validação do schema e advisors; executar ensaio de backup/restore como gate operacional antes do piloto.
5. Atualizar `README.md`, `PRD.md`, `DATABASE.md`, `ARQUITETURA.md`, `MVP-ROADMAP.md` e `GUIA-DE-IMPLEMENTACAO.md` para o fluxo direto de pedidos e a semântica final da pipeline.

**Aceite P3:** uma operação piloto registra vendas, produção, consumo, entrega, recebimentos e correções durante duas semanas sem depender de planilha paralela, respeitando isolamento por empresa.

## Cenários obrigatórios de ponta a ponta

| Cenário | Verificação |
|---|---|
| Venda simples | Produto de R$ 80 e custo previsto de R$ 27, vendido em 3 unidades: pedido, dashboard e relatório mostram R$ 240 vendidos, R$ 81 de custo previsto e R$ 159 de margem prevista. |
| Produção dividida | Pedido de 3 peças com jobs de 1 e 2; após o primeiro job, progresso é 1/3 e pedido segue em produção; após o segundo, fica pronto para envio. |
| Falha e reposição | Job falha após consumir material: bobina, máquina e auditoria mudam uma vez; a quantidade faltante pode ser planejada novamente; pedido não vira pronto. |
| Arraste válido/inválido | Drop em “Imprimindo” inicia o job após validar a máquina; drop em “Concluído” exige dados reais e quantidade suficiente; erro mantém coluna e status originais. |
| Expedição e recebimento | Envio gera registro; entrega fecha o envio; pagamento parcial reduz saldo sem alterar valor vendido. |
| Permissões e isolamento | Operador executa apenas o que seu papel permite; vendedor não consome bobina; usuário do tenant B não lê, move nem exporta dados do tenant A. |
| Contabilidade dos números | Dashboard, relatório e CSV concordam para mesmo tenant/período e distinguem estimativas de fatos realizados. |

## Ordem prática de entrega

As etapas abaixo foram executadas em 7 de outubro de 2026. Este registro substitui a auditoria estática inicial; os gaps acima descrevem o estado anterior às mudanças.

## Resultado da execução

### P0 — estados e permissões

- [x] Removida a gravação livre de `sales_orders.status` e da coluna artificial `production_orders.pipeline_stage`; o banco bloqueia saltos de status e exige OPs concluídas, expedição e confirmação de entrega.
- [x] Pedidos chama os comandos de produção/expedição/entrega e mostra apenas o status atual e o próximo destino permitido.
- [x] Pipeline deriva a etapa dos jobs e peças boas. Arrastar para imprimir inicia um job enfileirado; outras etapas abrem os detalhes para planejar, concluir, resolver falha ou cancelar. O drop concluído não altera estado sem dados reais.
- [x] Ações e RPCs alinham papéis e licenças; após operações, rotas afetadas são revalidadas.
- [x] Testes cobrem salto inválido, liberação sem receita, conclusão, envio/entrega, preço snapshot e tenant isolation.

### P1 — receita, material e execução

- [x] Item do pedido congela revisão, material, versão e estimativas da receita disponível na venda. Produto sem receita continua vendável; ao planejar, estimativas podem ser preenchidas manualmente.
- [x] Estimativas da receita preenchem o formulário em múltiplos de placas; material do job deve ser compatível com a OP.
- [x] Materiais exibe peso físico, reserva ativa e disponível. Cancelamento de job na fila libera sua reserva; falha libera ou consome a reserva conforme o uso registrado e permite replanejamento.
- [x] Criação de job usa chave idempotente por tenant/OP; início, conclusão, falha e cancelamento rejeitam repetição de estado.
- [x] Pedido, OP, job, bobina e impressora permanecem relacionados pelas telas e progresso comum.

### P2 — entrega, valores e períodos

- [x] Expedição e entrega seguem acessíveis no detalhe; o seletor da lista aciona as mesmas RPCs. Retirada local aceita transportadora/rastreio vazios e ainda cria o registro de expedição.
- [x] Dashboard e financeiro separam vendido, recebido e saldo; custo/margem são identificados como previstos. Relatório soma custo previsto dos pedidos diretos e calcula material com preço congelado no job.
- [x] Dashboard usa limites de mês em `America/Sao_Paulo`; relatório usa competência: venda/criação, pagamento/recebimento, despesa/ocorrência e produção/conclusão.
- [x] Alertas existentes levam a Pedidos, Produção, Materiais, Impressoras ou Manutenção.

### P3 — escopo do piloto, segurança e validação

- [x] Decisão do MVP: sem estoque de produtos acabados e sem etapa independente de pós-processamento/qualidade. O job registra peças boas e defeituosas; a produção restante pode ser refeita.
- [x] Documentação do fluxo direto e das semânticas foi alinhada em README, PRD, DATABASE, ARQUITETURA, MVP-ROADMAP e GUIA-DE-IMPLEMENTACAO.
- [x] Testes de banco criam seus próprios dados e passam após reset limpo: `npx supabase test db --local supabase/tests` (36 testes).
- [x] A jornada autenticada no navegador passou: login, pedido, liberação, criação do job, arraste de “Na fila” para “Imprimindo”, conclusão, expedição e entrega (`pnpm test:e2e`). O setup e teardown removem os dados temporários.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test` (4 testes), `pnpm build`, `npx supabase db lint --local` e `npx supabase db advisors --local --type all` executados sem erros; advisors não encontraram problemas. O build foi executado isoladamente após um conflito de arquivos gerados pelo Next.js nos checks concorrentes.

O reset local, os testes e a jornada autenticada validam a integração implementada no ambiente local. Um piloto com operadores reais, integração realtime e ensaio de backup/restore permanecem gates operacionais antes da produção; não bloqueiam o fluxo do MVP validado aqui.
