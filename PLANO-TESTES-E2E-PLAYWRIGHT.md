# Plano de cobertura E2E da Agencia 3D com Playwright

## Objetivo e estado atual

Cobrir, em um navegador real, os fluxos que um usuário percorre da venda até a entrega e a conferência financeira. Os testes devem confirmar a mesma informação em Pedidos, Produção, Materiais, Impressoras, Visão geral e Relatórios, além de verificar autenticação, permissões e isolamento entre empresas.

Já existem `playwright.config.ts`, o comando `pnpm test:e2e`, um setup/teardown que cria um tenant temporário e **um** teste em `apps/web/e2e/order-production-journey.spec.ts`. O CI atual executa lint, tipos, testes unitários, build e banco, mas não executa E2E. A jornada existente precisa ser atualizada: ainda procura uma alça de arraste, enquanto a interface atual muda a etapa pelo seletor do card. Não considerar essa jornada como cobertura válida até que passe novamente.

Uma inspeção de leitura pelo MCP do Playwright confirmou a demo local em `demo.localhost:3005`: dashboard, tabela de Pedidos com filtro/paginação e pipeline com as colunas **Na fila**, **Imprimindo** e **Concluído**. A demo serve para descobrir a interface; os testes automatizados devem escrever apenas em tenants temporários.

## Papel de cada ferramenta

- **MCP do Playwright:** explorar cada tela, obter a árvore de acessibilidade, confirmar nomes/locators, testar manualmente os caminhos antes de codificá-los e investigar console, rede e capturas quando um cenário falhar. Sempre usar um tenant E2E isolado para ações que gravam dados.
- **`@playwright/test`:** manter as jornadas versionadas em `apps/web/e2e/`, executadas por `pnpm test:e2e` localmente e no CI. O MCP não substitui essa suíte reproduzível.
- **Supabase local:** criar fixtures, conferir efeitos persistidos e limpar os dados. Verificações de RLS e concorrência continuam também nos testes SQL, pois a interface sozinha não prova essas garantias.

## Infraestrutura antes de ampliar a suíte

1. Corrigir o teste existente para o seletor atual da produção, inclusive a transição que abre os detalhes para informar os dados reais da conclusão. Confirmar que ele passa no banco local recriado.
2. Separar o setup em fixtures reutilizáveis: tenant A e tenant B, owner/admin, operador, vendedor e usuário sem permissão, com clientes, produtos, variantes, material, bobina e impressora identificados por um prefixo único por execução. Criar apenas a dependência necessária para cada cenário.
3. Tornar o teardown resiliente a falha no meio do setup e a execução interrompida. Evitar nome fixo de contêiner Docker e arquivo único compartilhado por testes paralelos. Antes de qualquer remoção, validar que o tenant e os registros pertencem ao prefixo da execução. Nunca limpar dados da demo.
4. Proteger os testes contra um alvo remoto acidental: setup com chave administrativa só pode rodar contra Supabase local; a chave permanece no processo Node, nunca no navegador, nos traces ou no repositório.
5. Ajustar `playwright.config.ts` para URL/porta configurável, Chromium instalável no CI, `trace`/captura em falha, timeout explícito e servidor reutilizado somente em execução local. Usar host de tenant consistente com o cookie de autenticação.
6. Criar helpers pequenos para login, abertura de painel, consulta de linha/card e leitura dos IDs da fixture. Preferir `getByRole`, `getByLabel` e textos acessíveis; adicionar `data-testid` só onde a semântica não identifica o elemento.
7. Adicionar `pnpm test:e2e` ao workflow de CI depois de iniciar/resetar o Supabase local e instalar o Chromium. Publicar relatório, trace e screenshot em falhas; não publicar fixture com senha.

## Matriz de cenários

| Prioridade | Área                      | Cenários E2E e resultado esperado                                                                                                                                                                                                                        |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0         | Acesso                    | Login válido chega ao dashboard do tenant correto; senha inválida mostra erro; sessão ausente redireciona; troca de host não expõe dados de outra empresa.                                                                                               |
| P0         | Produto → pedido          | Cadastrar cliente e produto/variante, criar pedido de 3 unidades, conferir preço/custo copiados, toast e fechamento do painel. Reabrir os detalhes pelo olho e pela linha.                                                                               |
| P0         | CRUD de pedidos           | Editar cliente/produto/quantidade de pedido aberto; excluir pedido aberto pela lixeira com confirmação; cancelar exclusão preserva o pedido; pedido em produção bloqueia edição/exclusão.                                                                |
| P0         | Status do pedido          | Seletor exibe estado atual primeiro e apenas a próxima ação permitida. Enviar à produção, depois expedir e entregar; nenhuma escolha pula a conclusão física ou cria envio fictício.                                                                     |
| P0         | Produção vinculada        | Pedido liberado aparece na pipeline e no detalhe de Pedidos; criar job com impressora e bobina reserva material; mudar de **Na fila** para **Imprimindo** pelo seletor inicia o job; conclusão com tempo, gramas e peças boas atualiza ambas as páginas. |
| P0         | Produção parcial e falha  | Dividir 3 peças em jobs de 1 + 2; após o primeiro, pedido segue em produção com 1/3. Falha registra motivo/consumo, libera o saldo adequado e permite reposição; cancelamento na fila devolve reserva.                                                   |
| P0         | Estoque e impressora      | Reserva reduz disponível sem mudar peso físico; início ocupa a impressora; conclusão/falha registra consumo e libera a máquina. Impedir início sem material disponível ou máquina livre, com mensagem legível.                                           |
| P0         | Financeiro e painel       | Registrar pagamento parcial e despesa; pedido mantém valor vendido, saldo cai uma vez, dashboard e Financeiro concordam; repetir envio do formulário não duplica lançamento.                                                                             |
| P0         | Isolamento e papéis       | Tenant B não encontra pedidos, produtos, arquivos ou relatórios do A por navegação ou URL direta. Operador não vê valores restritos; vendedor não consegue executar ações de estoque/produção; licença suspensa impede gravações.                        |
| P1         | Cadastros de apoio        | Clientes, produtos, variações, materiais, bobinas e impressoras: validação de campos, criação, toast, item na lista, edição/ajuste quando oferecido e estado vazio.                                                                                      |
| P1         | Modelos e receitas        | Criar modelo e revisão, enviar arquivo de tipo/tamanho permitido, criar receita e confirmar que uma nova versão preserva o histórico. Cobrir erro de arquivo inválido.                                                                                   |
| P1         | Tabelas e navegação       | Filtro sem acento/case, limpar filtro, zero resultado, paginação com mais de 10 registros, mudança de página, retorno após abrir detalhe e menus responsivos.                                                                                            |
| P1         | Relatórios                | Período e CSV mostram os mesmos totais de venda, recebimento e despesa que as telas de origem; testar virada de mês no fuso `America/Sao_Paulo`.                                                                                                         |
| P1         | Feedback e estabilidade   | Ações bem-sucedidas mostram toast; erro do servidor mantém o formulário e mostra mensagem; console sem erro de hidratação ou exceção, requisições críticas sem 5xx.                                                                                      |
| P2         | Configuração e plataforma | Convite e mudança de papel, marca/logo/cores, administração de tenant/módulos/licença/domínio; usar fixtures e conta de administrador separadas.                                                                                                         |
| P2         | Rotas históricas          | Oportunidades, propostas e manutenção ainda têm código/rotas, embora não façam parte do menu principal. Verificar acesso direto, permissões e ausência de erro; aprofundar somente se essas funcionalidades permanecerem no produto.                     |
| P2         | Acessibilidade e telas    | Teclado para abrir/fechar painéis, foco ao fechar, nomes nos botões de ícone, contraste básico e layout sem sobreposição em desktop e celular.                                                                                                           |

## Arquivos de teste propostos

```text
apps/web/e2e/
  fixtures/tenant.ts              # criação/limpeza segura e dados por teste
  fixtures/auth.ts                # sessões por papel e host
  helpers/ui.ts                   # ações pequenas e locators acessíveis
  auth.spec.ts
  catalog-and-orders.spec.ts
  order-crud.spec.ts
  production.spec.ts
  stock-and-printers.spec.ts
  finance-dashboard-reports.spec.ts
  tenant-permissions.spec.ts
  tables-and-responsive.spec.ts
  platform-and-legacy.spec.ts
```

Organizar os testes por jornada, não criar uma suíte que dependa da ordem de arquivos. Cenários que compartilham uma transação longa podem usar um grupo serial com fixture própria. Dados de preço, custo, quantidade e gramas devem ser fixos e ter uma conta esperada explícita; nunca comparar apenas “contém algum valor”.

## Sequência de implementação

### Fase 1 — base confiável

- Atualizar a jornada existente e estabilizar fixtures/limpeza/configuração.
- Automatizar login, CRUD de pedidos e pedido → job → conclusão → entrega.
- Ligar a suíte P0 ao CI. Critério: execução local e no CI sem depender da demo.

### Fase 2 — integridade da operação

- Cobrir produção parcial, falha, cancelamento, reservas, impressora e ações inválidas.
- Cobrir pagamento parcial, despesa e reconciliação de dashboard/relatórios.
- Cobrir dois tenants, papéis e licença suspensa. Critério: nenhuma mudança de estado ou leitura proibida passa pela UI.

### Fase 3 — superfície completa

- Cobrir cadastros de apoio, tabelas, modelos, receitas, upload, configuração e rotas históricas mantidas.
- Adicionar cenários de teclado, celular e console/hidratação. Critério: todos os fluxos acessíveis no menu têm pelo menos um cenário de sucesso e um de erro ou permissão.

## Método de trabalho com o MCP

Para cada cenário: abrir a página no tenant E2E pelo MCP → capturar snapshot de acessibilidade → executar o fluxo manual → observar console/rede e o estado em outra tela → escrever o teste Playwright com os nomes observados → rodar o spec isolado → rodar a suíte. Guardar screenshot/trace somente quando houver falha ou decisão visual relevante. Atualizar o teste sempre que o comportamento da interface mudar; o caso da alça de arraste antiga é a primeira correção.

## Comandos e critérios de pronto

Na raiz do repositório:

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm exec playwright install chromium
pnpm test:e2e
```

Um fluxo está coberto quando o teste parte de fixture independente, usa a UI real, confirma o efeito persistido na tela afetada, passa no CI e deixa o banco limpo. A suíte está pronta para servir como bloqueio de merge quando todos os P0 e P1 acima passarem, sem `test.only` ou skips silenciosos, e os artefatos de falha permitirem reproduzir o problema.
