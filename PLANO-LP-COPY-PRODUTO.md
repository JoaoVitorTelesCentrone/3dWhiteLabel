# Plano de revisão da LP, copy e jornada comercial

**Data:** 28/10/2026  
**Público:** donos e gestores de empresas de impressão 3D que chegam por prospecção direta.  
**Conversão principal:** pedido de demonstração guiada com um pedido típico do prospect.  
**Base da revisão:** LP e contato no código, inspeção visual local em desktop e celular, README, monetização, identidade visual, roteiro comercial e skill `lp-design`.

## Diagnóstico

| Prioridade | Achado | Evidência | Efeito |
| --- | --- | --- | --- |
| P0 | A prévia da primeira dobra mostra “3 impressoras livres” e “operação em tempo real”; o fluxo atual não exige nem acompanha impressoras. | `apps/web/src/app/page.tsx`; `README.md`, seção de fluxo atual. | Promessa comercial acima do produto entregue. |
| P0 | O quadro de resultados exibe taxa de conclusão, entregas no prazo e variação percentual sem correspondência clara com indicadores implementados. A nota “dados ilustrativos” aparece só nesse quadro. | `apps/web/src/app/page.tsx`; descrição do dashboard em `README.md`. | A ilustração pode ser confundida com uma tela e recursos reais. |
| P0 | “Ver o sistema em ação” abre um formulário; “Acessar demonstração” cai em `/login` quando não há URL configurada. O exemplo de configuração também aponta para um login. | `apps/web/src/app/page.tsx`; `PRODUCTION-CONFIG.example`. | A ação não corresponde ao texto; um visitante sem conta pode parar no login. Conferir a configuração de produção antes de afirmar o estado público. |
| P0 | “Implantação assistida” aparece como incluída no Start, mas a monetização também vende implantação com importação como serviço separado. | LP, `MONETIZACAO.md` e `ROTEIRO-APRESENTACAO-COMERCIAL.md`. | Escopo e preço ficam ambíguos durante a negociação. |
| P1 | A LP comunica os módulos, mas demonstra pouco do ganho concreto: o caminho de um pedido até a entrega, peças boas/faltantes, material reservado e margem **estimada**. | Sequência atual de seções e telas do produto descritas em `README.md`. | O visitante precisa imaginar como a solução se encaixa na rotina. |
| P1 | A composição é legível e segue a paleta da marca, mas a primeira dobra se parece com uma LP de SaaS genérica: grade, brilho e painel inventado. | Inspeção local em 1440×900 e 390×844; `IDENTIDADE-VISUAL.md`. | Falta uma assinatura visual ligada ao trabalho de impressão 3D e uma prova do produto. |
| P1 | No celular, o texto de contato diz “preencha os dados ao lado” e o formulário só começa abaixo da primeira tela. | `apps/web/src/app/contato/page.tsx`; inspeção local em 390×844. | Mais rolagem entre intenção e ação. |
| P1 | O formulário registra o lead e o admin lista solicitações, mas não há aviso automático nem agendamento no fluxo encontrado. | `apps/web/src/app/contato/actions.ts`; `apps/web/src/app/admin/page.tsx`. | Resposta depende de alguém abrir o admin; a promessa de demo não informa o próximo passo. |
| P2 | A documentação ainda usa “Do orçamento à peça entregue”, grade de impressoras e outras superfícies planejadas como identidade do produto, enquanto o fluxo atual começa no pedido confirmado. | `IDENTIDADE-VISUAL.md`, `apps/web/PRODUCT.md`, `README.md`. | A LP e o material comercial podem voltar a prometer o roadmap. |

## Direção criativa

**Intenção:** fazer o gestor reconhecer um pedido real e entender, em poucos segundos, qual decisão fica mais fácil.  
**Conceito:** **do pedido à peça entregue**. Um pedido conduz a narrativa; sua evolução mostra produção, material, expedição e resultado.  
**Assinatura:** uma trilha visual inspirada nas camadas de uma peça impressa, conectando recortes **reais** do sistema. A marca laranja sinaliza a próxima ação.  
**Sistema:** preservar Sora/Inter e as cores da identidade; trocar o brilho e a grade genéricos por mais espaço para tipografia, evidência do produto e detalhes materiais discretos.  
**Composição:** primeira dobra com promessa e captura real do fluxo; narrativa curta de um pedido; oferta com escopo claro; CTA consistente.  
**Movimento:** animar apenas a passagem de etapas e o destaque da próxima ação, com alternativa estática para `prefers-reduced-motion`. Usar o pacote `motion` já presente se houver necessidade; evitar animação que atrase a leitura.  
**Critério de aceitação:** a pessoa consegue dizer o que muda na sua rotina e o que acontece ao clicar na demo sem depender da conversa comercial.

## Plano de execução

### 1. Corrigir confiança e conversão — P0

1. Definir uma matriz de afirmações: **disponível no Start**, **sob proposta** e **planejado**, usando o fluxo implementado como fonte. Revisar LP, FAQ, proposta e mensagens de prospecção com a mesma matriz. Usar “margem estimada” quando for previsão, sem chamar de lucro realizado.
2. Substituir os dois painéis ilustrados por capturas do ambiente demo atual, com dados fictícios identificados. Mostrar indicadores que o produto de fato calcula. Remover status de impressoras, “tempo real” e percentuais sem medição correspondente.
3. Unificar a ação principal em **“Agendar demonstração”** ou **“Solicitar demonstração”**, apontando para `/contato`. Trocar o link secundário por **“Ver como funciona”**, ancorado no fluxo real da página, até haver uma demo pública acessível. Se a demo exigir credenciais, explicar como o acesso é entregue.
4. Fechar a oferta comercial: especificar configuração inicial incluída no Start; separar importação, treinamento ampliado, hospedagem/Care, domínio e integrações quando cobrados à parte. Atualizar LP, `MONETIZACAO.md` e roteiro com a mesma redação.

**Saída:** nenhuma promessa visual ou textual sem correspondência no produto; visitante sem conta consegue concluir o pedido de demo.

### 2. Reescrever a LP em torno do resultado — P1

1. Fazer a primeira dobra responder: **para quem é, o que organiza e qual é o próximo passo**. Proposta inicial:

   > **Cada pedido no lugar. Da produção à entrega, tudo sob controle.**  
   > Veja o que precisa ser produzido, o que falta entregar e os custos previstos de cada pedido — em um sistema com a marca da sua empresa.  
   > **Agendar demonstração** · **Ver como funciona**

2. Trocar a repetição “problemas → três passos → lista de módulos” por uma história curta: **pedido confirmado → produção e material → peças prontas e entrega → visão financeira**. Em cada etapa, mostrar uma tela real e uma decisão concreta do gestor.
3. Mostrar o diferencial de marca com uma comparação visual do mesmo sistema configurado com duas identidades fictícias, sem sugerir domínio próprio no Start.
4. Criar um bloco “Como será a demo”: conversa breve, um pedido típico da empresa, fluxo guiado e proposta com escopo. Ajustar a FAQ para refletir esse processo.
5. Manter preço visível se R$ 1.497 e R$ 99/mês estiverem confirmados na oferta vigente; mostrar exatamente o que cada valor cobre.

**Saída:** uma única mensagem central e uma prova de produto por benefício principal. Não usar depoimento ou resultado de cliente sem autorização e fonte.

### 3. Reduzir atrito na página de contato — P1

1. No celular, encurtar a introdução e aproximar o formulário do topo. Trocar “ao lado” por texto que funcione em qualquer tela.
2. Alinhar a promessa: se a demo é guiada, trocar “Solicite seu acesso” por “Peça uma demonstração” e explicar o retorno após o envio. Dar prazo de resposta apenas quando a operação comercial conseguir cumpri-lo.
3. Considerar uma pergunta opcional estruturada sobre o principal gargalo ou um pedido típico; preservar poucos campos obrigatórios. No sucesso, explicar o próximo passo.
4. Definir quem recebe os novos leads e implementar aviso ou fila operacional com responsável e status. Vincular o lead à origem da campanha de prospecção sem guardar mais dados do que o necessário.

**Saída:** lead recebido, atribuído e respondido; usuário sabe o que esperar após enviar.

### 4. Preparar prova comercial e medir — P2

1. Preparar um caso demo coerente de ponta a ponta: pedido, OP, job, material reservado/consumido, peças aprovadas, expedição, recebimento e margem prevista. Capturar imagens na resolução necessária para desktop e celular.
2. Sincronizar `README.md`, `IDENTIDADE-VISUAL.md`, `apps/web/PRODUCT.md`, `MONETIZACAO.md` e roteiro. Separar estado atual de visão futura e retirar metas antigas de pré-venda como instrução comercial vigente, se já não se aplicarem.
3. Instrumentar o funil: visualização da LP, clique no CTA, início e envio do formulário, demo marcada e proposta. Avaliar conversão **lead → demo** e **demo → proposta**, não só cliques.
4. Depois dos primeiros pilotos, obter autorização para publicar uma prova real: contexto, mudança observada e imagem fiel do sistema. Só então incluir depoimentos ou números de resultado.

**Saída:** demonstração repetível, comunicação consistente e dados para decidir a próxima iteração.

## Ordem e verificação

| Etapa | Dependência | Como conferir |
| --- | --- | --- |
| P0 — verdade do produto, oferta e CTA | Alinhamento da oferta Start/Care e acesso à demo | Revisão de cada afirmação contra o app; todos os CTAs chegam a uma ação possível sem conta. |
| P1 — copy, narrativa e contato | Telas reais e fluxo de demo definidos | Revisão visual em 320, 390 e 1440 px; leitura clara, formulário alcançável, sem rolagem horizontal. |
| P2 — prova e medição | Processo comercial operando | Lead aparece no admin, tem responsável, e etapas do funil podem ser contadas. |

## Execução visual — 28/10/2026

Implementado na LP e na página de demonstração:

- A primeira dobra usa uma captura real do quadro de produção, identifica o ambiente como demo e informa que os dados são fictícios.
- A copy e os CTAs agora explicam e levam a uma demonstração guiada; a rota de login não aparece como caminho de entrada.
- A narrativa acompanha um pedido confirmado até a entrega e separa margem estimada de recebimentos e despesas.
- A seção comercial descreve a licença Start, o Care opcional e serviços que precisam de escopo separado.
- A assinatura “Do pedido à peça entregue” foi sincronizada entre a identidade visual, o brief do produto e o README.
- O formulário usa a mesma promessa, pergunta qual pedido a empresa quer acompanhar e aparece mais cedo no celular.
- A direção visual usa uma linha de filamento entre as etapas, detalhes de camadas impressas, uma tela real do produto e movimento reduzido quando solicitado.

Revisto em 320, 390 e 1440 px; a página não apresentou rolagem horizontal nesses tamanhos. A CTA principal leva a `/contato` e a imagem de produto carrega.

## Execução do plano completo — 28/10/2026

- **Verdade do produto e oferta:** LP e FAQ descrevem o fluxo atualmente implementado, separam Start/Care de serviços sob proposta e distinguem margem estimada de recebimentos e despesas. README e `MONETIZACAO.md` foram alinhados; metas de pré-venda antigas agora estão identificadas como hipóteses históricas, sem alegar resultados.
- **Narrativa visual e demo:** foram incluídas duas identidades fictícias mostrando a mesma experiência com marcas diferentes e uma explicação em três passos de como a demonstração funciona. Não foram criados depoimentos nem resultados de clientes.
- **Contato e operação comercial:** o formulário mantém poucos campos obrigatórios, pergunta qual pedido seria útil acompanhar e explica o retorno. O `/admin` agora permite atribuir o responsável, atualizar lead → contato → demo marcada/realizada → proposta → encerramento e abrir WhatsApp com uma mensagem personalizada. Há contadores de novas solicitações e de leads sem responsável.
- **Atribuição e medição:** a LP registra visualização, clique para demo, início e envio do formulário, além de UTMs permitidas. A campanha acompanha o visitante até o cadastro do lead. O painel mostra métricas do site em 30 dias, etapas comerciais da mesma coorte e conversões lead → demo e demo → proposta. A tabela de eventos não guarda nome, contato, IP ou identificador de visitante; a política de privacidade foi atualizada.
- **Caso demonstrável:** o `pnpm demo:seed` já prepara histórico fictício com pedidos, jobs, material, entregas, recebimentos e despesas. O material público identifica os dados como fictícios.

### Dependências operacionais restantes

- Os novos campos/tabelas foram adicionados à migration `20261028155428_sales_funnel_tracking_and_lead_pipeline.sql`, mas não puderam ser aplicados nem consultados porque o Docker Desktop/Supabase local não está rodando neste ambiente. A migration precisa ser aplicada e conferida com `pnpm db:reset` quando Docker estiver disponível.
- O `/admin` funciona como fila de aviso e permite atribuição manual. Notificação por e-mail ou push não foi configurada porque o projeto não tem provedor, endereço de destino nem credenciais definidos; nenhum envio externo foi realizado.
- Depoimentos, resultados e prints de clientes reais continuam condicionados à execução de pilotos e autorização de publicação.
- O valor do Start e do Care está consistente com a oferta documentada no repositório; confirmar os valores antes de cada proposta comercial.

Verificação desta execução: `npx tsc --noEmit` concluiu sem erros. `pnpm typecheck` não estava disponível no shell; o Docker indisponível impediu aplicar a migration e rodar uma consulta local. Não foi executada suíte de testes.
