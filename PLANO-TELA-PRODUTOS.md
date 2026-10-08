# Plano de implementação — tela de Produtos

## Objetivo

Refazer `/catalogo/produtos` para mostrar **todos os produtos cadastrados** em uma lista fácil de percorrer. Cada item deve exibir **imagem, nome, preço e custo**. No cabeçalho, o botão **Cadastrar produto** abre um formulário com esses quatro dados. O fluxo precisa funcionar em desktop e celular, nos temas claro e escuro e com a marca do tenant.

## Leitura do sistema atual

- `products` guarda nome, categoria e descrição, mas não guarda imagem, preço ou custo.
- `product_variants` já guarda `price_cents`; os orçamentos usam variações. Ainda não há custo na variação nem indicação de qual é a variação principal.
- A página atual mostra blocos extensos e mantém o formulário de cadastro sempre aberto abaixo da lista. Isso alonga a tela e deixa a ação principal pouco clara.
- A stack já contém Next.js, Tailwind, shadcn/ui no estilo `base-nova` com Base UI, Lucide e o registro `@watermelon` em `apps/web/components.json`.

## Decisão para preço e custo

O cadastro simples cria o produto e uma **variação padrão** nos bastidores. O preço e o custo informados são os valores dessa variação; a lista mostra esses valores. Isso preserva o modelo usado por orçamentos sem pedir SKU ou configuração de variações a quem está apenas cadastrando um produto.

- Adicionar `cost_cents` à tabela `product_variants` e uma marcação de variação padrão, com no máximo uma por produto. Manter `price_cents` como fonte do preço.
- Adicionar `image_path` a `products`; guardar apenas o caminho do arquivo, nunca a URL temporária.
- Gerar automaticamente um SKU único para a variação padrão. Variações adicionais continuam acessíveis nos detalhes do produto e podem ter seus próprios preço e custo.
- Migrar produtos existentes escolhendo de forma determinística uma variação ativa como padrão. Se um produto não tiver variação, mostrar **Preço não informado**; custos antigos sem origem confiável aparecem como **Custo não informado**. Não inventar valores históricos.
- O formulário novo exige nome, preço, custo e imagem. Preço deve ser maior que zero; custo pode ser zero. Converter valores `pt-BR` em centavos inteiros no servidor, sem cálculo monetário em ponto flutuante.

## Interface proposta

```text
Produtos                                      [Cadastrar produto]
Produtos cadastrados na sua operação

Imagem   Produto                         Preço          Custo
[foto]   Suporte de parede               R$ 49,90       R$ 18,40
[foto]   Organizador de mesa              R$ 79,00       R$ 31,00
```

- Desktop: lista de linhas compactas, com miniatura uniforme, nome em destaque e valores alinhados à direita. Clique na linha ou ação **Ver detalhes** abre o produto e suas variações. Mostrar produtos ativos e inativos; indicar o estado com texto.
- Celular: cada produto vira uma linha de duas partes, com foto e nome acima de **Preço** e **Custo**. Nenhuma rolagem horizontal da página.
- Sem produtos: estado vazio curto, com o mesmo botão **Cadastrar produto**. Sem formulário gigante ocupando a página.
- Imagem ausente em registros antigos: placeholder discreto e identificável; nome, preço e custo permanecem legíveis.
- Erro de carregamento: mensagem específica e opção de tentar novamente. Durante carregamento, reservar espaço para as linhas com `Skeleton`.

### Cadastro

O botão superior abre um `Sheet` shadcn/Base UI à direita no desktop e em tela cheia no celular. O foco entra no título do painel e retorna ao botão ao fechar.

1. **Imagem do produto:** área de upload de uma imagem com prévia e opção de substituir antes de salvar. PNG, JPG ou WebP, até 5 MB. Usar um bloco de File Upload da Watermelon como base visual e adaptar o código local para os tokens Agencia 3D, teclado, leitor de tela e apenas um arquivo.
2. **Nome do produto:** obrigatório, com limite e exemplo curto.
3. **Preço de venda** e **Custo:** campos lado a lado no desktop, empilhados no celular, com prefixo `R$` e validação junto ao campo.
4. Rodapé fixo do painel com **Cancelar** e **Cadastrar produto**. Durante o envio, bloquear duplicidade e informar o andamento. Em sucesso, fechar o painel, atualizar a lista e anunciar **Produto cadastrado**.

Categoria e descrição existentes continuam disponíveis na edição/detalhes, sem aumentar o cadastro inicial. A gestão de variações sai da listagem principal e fica no detalhe do produto.

## Componentes e arquitetura

- Usar `Button`, `Input`, `Sheet`, `Skeleton` e `Badge` locais do shadcn. Adicionar `Table`/`Field` pelo CLI apenas se a implementação precisar deles; para quatro colunas, uma tabela semântica simples basta e evita dependência de grade complexa.
- Usar Lucide apenas em ações identificáveis. A foto é o elemento visual da linha; nenhuma decoração compete com preço e custo.
- Adaptar o bloco Watermelon de upload, sem importar um dashboard inteiro. Confirmar antes a variante compatível com Base UI, dependências e licença do item escolhido.
- Manter `page.tsx` como carregamento no servidor, consultas com `tenant_id`, autorização `catalog.view` para a lista e `catalog.edit` para cadastro/edição. Uma licença suspensa mantém a leitura e oculta a ação de escrita.
- Criar bucket privado de imagens de produtos no Supabase Storage. Políticas de leitura e escrita devem verificar tenant, módulo, papel e licença. Gerar URLs temporárias no servidor para as miniaturas; o navegador nunca recebe a chave de serviço.
- Validar tamanho e tipo do arquivo também no servidor. Criar produto e variação padrão em uma transação; associar a imagem e limpar arquivo enviado caso o cadastro falhe.

## Sequência de implementação

1. **Dados:** migration para `cost_cents`, variação padrão, `image_path`, bucket e políticas de Storage; backfill dos produtos existentes. Atualizar tipos e `DATABASE.md`.
2. **Leitura:** consulta única por tenant para produtos e sua variação padrão; miniaturas, formatação monetária `pt-BR` e estados de valor ausente.
3. **Tela:** cabeçalho com CTA, lista responsiva, detalhes/edição preservados em superfície secundária, estados vazio/erro/carregando.
4. **Cadastro:** painel acessível, prévia da imagem, validações por campo, upload, criação transacional e feedback. Reaproveitar as verificações atuais de permissão.
5. **Verificação:** conferir 375, 768, 1280 e 1920 px; teclado e foco do painel; temas claro/escuro; cadastro válido e inválido; produtos antigos sem foto/custo; falha de upload; isolamento entre dois tenants. Rodar `pnpm typecheck`, `pnpm lint` e `pnpm build`.

## Critérios de aceite

- A lista mostra cada produto cadastrado do tenant, inclusive inativos, com imagem ou placeholder, nome, preço e custo ou indicação explícita de dado ausente.
- **Cadastrar produto** fica no topo para quem tem permissão e coleta exatamente os quatro dados pedidos.
- Após salvar, o produto aparece na lista com foto e valores corretos; a variação padrão pode ser usada no fluxo existente de orçamentos.
- Um usuário de outro tenant não lê produtos nem imagens; quem não tem `catalog.edit` não cadastra nem altera dados.
- O formulário cabe e funciona no celular, com erros por campo, foco visível, alvos de toque de pelo menos 44 px e sem rolagem horizontal.

## Referências de implementação

- [shadcn/ui: Sheet com Base UI](https://ui.shadcn.com/docs/components/base/sheet) e [componentes disponíveis](https://ui.shadcn.com/docs/components).
- [Watermelon UI: instalação pelo registro shadcn](https://ui.watermelon.sh/cli) e [blocos de File Upload](https://ui.watermelon.sh/blocks).
- [Supabase: buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals) e [controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control).
