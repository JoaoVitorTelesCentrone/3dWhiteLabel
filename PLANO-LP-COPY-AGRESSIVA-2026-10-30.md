# Plano da LP — copy mais incisiva, visual profissional

Data: 30/10/2026. Status: a proposta foi implementada na LP e inspecionada visualmente; este documento registra o plano e o resultado da execução.

## Objetivo e limite de verdade

Público inicial: donos e responsáveis pela operação de empresas brasileiras que imprimem peças sob demanda. Chegam por prospecção individual, conhecem sua própria rotina e precisam decidir se vale pedir uma demonstração. Conversão principal: pedido de demonstração guiada em `/contato`.

A página pode ser direta e provocativa, mas não pode afirmar que o prospect perde pedidos, usa planilhas, atrasa entregas ou tem prejuízo. A demo completa, os gates de aplicação, o isolamento visual e o restore ainda precisam ser concluídos; não escrever “testado em operações reais”, “pronto para implantar amanhã” ou números de ganho. Preços Start/Care e compromissos de suporte exigem confirmação operacional antes de permanecerem públicos.

## Tese de comunicação

**Ângulo:** o momento em que o orçamento vira trabalho real. O dono precisa saber o que foi aprovado, o que está produzindo, o que falhou, o que pode sair e o que foi recebido. O produto registra esse caminho em uma operação com a marca da empresa.

**Promessa editorial:** “O pedido foi aprovado. Agora acompanhe o que acontece com ele.” É uma afirmação sobre a função do produto, não sobre a dor comprovada de cada visitante. A agressividade vem do contraste visual, da especificidade e da clareza, sem fabricar urgência ou resultado.

**Hero recomendado:**

> **Pedido aprovado. Produção à vista.**
>
> Da primeira peça ao envio, acompanhe jobs, material, falhas e quantidades prontas no mesmo pedido. O sistema leva a marca da sua empresa.
>
> **Pedir demonstração guiada** · Ver um pedido em andamento

Alternativa para teste editorial: **“Pare de adivinhar o próximo passo de cada pedido.”** Usar somente como provocação geral, sem dizer que a empresa visitante hoje trabalha assim. A versão recomendada é mais fiel à prova disponível.

## Argumento da página, com prova por seção

| Ordem | Afirmação | Prova necessária | Ação de design/copy |
|---|---|---|---|
| 1 | Um pedido aprovado se torna trabalho acompanhável | Captura real da fila de produção com dados fictícios identificados | Hero com headline curta e tela grande; CTA direto |
| 2 | Falhas e reposições ficam ligadas ao pedido | Captura ou sequência real da OP e jobs, após teste visual | Mostrar um caso fictício, sem estatísticas inventadas |
| 3 | A expedição depende da quantidade boa | Estado de pedido “pronto para envio” e registro de entrega | Narrar uma decisão operacional, não listar módulos |
| 4 | Recebimento e margem prevista são coisas distintas | Tela real de financeiro/relatório, após verificação | Explicar a distinção em uma frase |
| 5 | O sistema usa a marca da empresa | Dois temas fictícios da mesma tela | Mostrar comparação honesta e avisar que domínio é separado |
| 6 | A conversa tem um próximo passo claro | Formulário funcional e processo de resposta definido | “Pedir demonstração guiada”, sem prometer prazo não assumido |

Retirar a seção de “fricções” escrita como diagnóstico do visitante (“pedido perdido”, “custo aparece tarde”). Substituir por um caso fictício narrado: **pedido de três peças → uma falha → reposição → envio → recebimento parcial**. Identificar o caso como exemplo, não história de cliente.

## Direção visual

Preservar a identidade existente: fundo `#0E1013`, laranja `#FF5A1F`, âmbar `#FFB25A`, texto claro, Sora para títulos e Inter para leitura. Usar o laranja para ação e estado de produção, não como brilho decorativo. A peça memorável será uma **linha de produção do pedido**, com a tela real ocupando a maior parte da primeira dobra e um único recorte ampliado de falha/reposição adiante. A linha visual pode remeter a filamento depositado em camadas; não repetir cards idênticos, gradientes genéricos ou índices sem significado.

No celular: headline em no máximo duas linhas, CTA visível sem rolar muito, captura legível ou recorte da informação central, sem texto miúdo. Movimento apenas se explicar a passagem de estados, respeitando `prefers-reduced-motion`. Contraste, foco visível, rótulos de formulário e áreas de toque de 44 px são critérios de aceite.

## Plano de execução

1. **Prova e oferta:** concluir gates P0 e executar o caso fictício completo; capturar as telas utilizáveis. Confirmar custo e capacidade de Start/Care. Se ainda não houver preço sustentado, trocar a tabela atual de valores por “preço definido em proposta após escopo”, sem esconder a composição licença, implantação, hospedagem e suporte.
2. **Copy em texto puro:** escrever hero, caso, diferenciais, FAQ e contato antes de alterar JSX. Revisar cada afirmação contra README, app e captura. Manter uma CTA principal consistente na LP e em `/contato`.
3. **Composição:** protótipo desktop e celular usando a linguagem atual da marca. Testar hierarquia em 390 e 1440 px antes de implementar. A primeira dobra precisa comunicar público, trecho do fluxo e ação em poucos segundos.
4. **Implementação:** editar `apps/web/src/app/page.tsx`, estilos da LP e, se necessário, a página de contato. Reaproveitar rastreamento de funil existente; não criar módulos novos. Garantir resposta clara após o formulário e responsável por acompanhar o lead.
5. **Verificação:** typecheck, lint, build e E2E quando o ambiente permitir; inspeção visual em 320, 390, 768 e 1440 px; teclado, foco, contraste, carregamento da imagem e CTA até confirmação de envio. Medir visualização → clique → início → envio → demo marcada, sem tratar clique como venda.

## Critério de pronto

A LP é publicável quando as afirmações têm prova, o visitante entende que o fluxo começa no pedido aprovado, o formulário funciona sem conta, o preço e o suporte têm escopo sustentável, e a revisão visual não encontra problemas críticos. A oferta só estará validada após conversas e compras reais.

## Registro da implementação — 30/10/2026

- Alterados `apps/web/src/app/page.tsx` e as regras da LP em `apps/web/src/app/globals.css`. A captura real do ambiente de demonstração continua identificada com dados fictícios.
- O hero agora põe em primeiro plano a capacidade distintiva: “Peça falhou? Replaneje.” A copy explica a gestão para impressão 3D, o registro de peças boas/defeituosas, o planejamento de reposições e o acompanhamento até a entrega. CTA principal permanece “Pedir demonstração”; no menu responsivo, o rótulo foi encurtado para “Demonstração”.
- A página foi reorganizada para explicar fluxo, escopo do produto, personalização de marca, demonstração, composição da proposta e perguntas frequentes. Valores de preço não verificados e promessas de suporte foram retirados da LP.
- A inspeção visual capturou desktop (1440), tablet (768) e mobile (390). O título ocupa duas linhas nos três tamanhos; o menu não quebra o nome da marca. O inspector reportou overflow horizontal zero e baixo contraste vazio nos três tamanhos. Ainda marcou sete heurísticas como “FAIL” (divisórias, contornos, uma fileira de quatro etapas, uma imagem, quatro textos abaixo de 13 px, espaços vazios e margem assimétrica) e seis como “WARN” (incluindo vídeo ausente). A imagem única é a captura do produto disponível e está identificada como demonstração fictícia; não foram inventadas fotos ou prova social. Linhas e contornos fazem parte da separação da interface. A revisão visual independente não encontrou defeito de alto impacto; recomendou trazer a função de reposição para o hero, ação aplicada.
- `pnpm --filter @agencia3d/web typecheck` passou. A página carregou nas três larguras durante a inspeção. O servidor local também registrou `POST /api/marketing-event` com resposta `403` durante os page views; o motivo ainda não foi determinado, então a coleta de eventos não foi validada e métricas de funil não devem ser inferidas dessa execução. Não rodei a suíte geral de testes nem lint para esta mudança editorial e responsiva. A oferta e a copy continuam hipóteses editoriais, não validação comercial. Não houve contato enviado, conversa com prospect ou venda como parte desta alteração.

**Próxima ação — 03/11/2026:** confirmar por que os eventos locais recebem 403 antes de confiar nos números do funil; depois, revisar a primeira dobra e apresentar a demo a empresas qualificadas, registrando as objeções literalmente. Só declarar a oferta validada após evidência de conversas ou vendas reais.
