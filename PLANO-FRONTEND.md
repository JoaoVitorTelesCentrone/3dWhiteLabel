# Evolução do frontend da Agencia 3D

## Objetivo

Transformar o app da Agencia 3D em uma ferramenta de operação **profissional, elegante e minimalista**, com personalidade industrial própria. A interface deve permitir que alguém identifique o que exige atenção, encontre a próxima ação e conclua o trabalho com poucos passos, mesmo em uma bancada de produção.

**Direção visual:** precisão de instrumento, hierarquia editorial e baixo ruído. O elemento memorável será a leitura operacional da Agencia 3D: estados de produção claros e o padrão **Previsto × Real**. Laranja e âmbar representam marca e ação; cores semânticas representam estado. Espaço livre organiza informação, sem transformar telas de trabalho em páginas vazias.

## Base atual e decisões que prevalecem

- A aplicação já usa Next.js 15, React 19, Tailwind CSS 4, shadcn no estilo `base-nova` com Base UI e ícones Lucide. `apps/web/components.json` já configura o registro `@watermelon`.
- `apps/web/src/app/globals.css` contém a paleta Agencia 3D, tokens shadcn, estilos do app e um bloco de estilos globais legados. A ligação final dos tokens shadcn com a marca já existe no `body`; a evolução é consolidar essa fonte de verdade e retirar as regras legadas após migrar as rotas que dependem delas.
- `apps/web/src/app/layout.tsx` já carrega Sora, Inter e JetBrains Mono e injeta cor primária e cor de destaque do tenant. O plano deve preservar o white label e testar marcas com cores claras e escuras.
- Dashboard, navegação e páginas de operação já existem. `apps/web/src/components/card-split-accordian.tsx` é um componente animado associado ao Watermelon, usado em “O que acompanhar”. Ele será avaliado por utilidade, acessibilidade e coerência visual antes de expandir o mesmo padrão.
- A identidade em `IDENTIDADE-VISUAL.md` e o contexto em `apps/web/PRODUCT.md` são a fonte da marca. O arquivo `design-system/agencia3d/MASTER.md` contém sugestões geradas de cor e fonte que seu próprio aviso manda descartar; não copiar a paleta verde nem as fontes Fira para o produto.
- Este documento propõe trabalho futuro. Nenhuma etapa abaixo está declarada como implementada.

## Regras de design

1. **Uma ação principal por tela.** Cabeçalho com título direto, contexto curto e ação primária previsível. Ações secundárias ficam próximas do dado ao qual pertencem.
2. **Hierarquia antes de decoração.** Alinhamento, tipografia, respiro e divisórias comunicam estrutura. Cartões só agrupam informações relacionadas; listas e tabelas devem continuar fáceis de varrer.
3. **Densidade por contexto.** Visão geral equilibrada; tabelas e fila de produção compactas; formulários com espaço para leitura e validação. Não reduzir legibilidade para caber mais dados.
4. **Estado sempre explícito.** Cor vem junto de texto ou ícone; números têm unidade, período e significado. “Previsto × Real” mostra ambos os valores, delta e causa quando disponível.
5. **Interação discreta.** Movimento curto para abertura, confirmação e mudança de estado. Sem animação de entrada repetida em todas as seções, brilho decorativo ou efeitos que atrapalhem operação.
6. **Marca do tenant no app.** Nome, logo e cores do cliente governam a experiência interna. Cores de sucesso, alerta, erro e informação permanecem semânticas e independentes da marca.
7. **Texto útil em pt-BR.** Verbos concretos: “Criar orçamento”, “Reservar bobina”, “Iniciar impressão”. Estados vazios explicam a próxima ação; erros dizem o que falhou e como retomar.

## Sistema visual proposto

| Camada | Decisão | Implementação planejada |
| --- | --- | --- |
| Cores base | Manter a paleta escura documentada da Agencia 3D como padrão; preparar tema claro completo | Primitivos em CSS, tokens semânticos para superfície/texto/borda e tokens de componente mapeados para shadcn |
| Marca | `--brand-primary` e `--brand-accent` por tenant; contraste de texto calculado ou validado para cada cor | Revisar tokens `--primary-foreground`, `--accent-foreground`, foco e estados hover por combinação de marca |
| Tipografia | Sora para títulos e KPIs, Inter para UI, JetBrains Mono apenas para códigos e medidas | Escala consistente para título de página, seção, corpo, metadado e número; `tabular-nums` em métricas |
| Espaçamento | Base de 4 px com passos recorrentes de 8, 12, 16, 24 e 32 px | Definir espaçamento de página, seção, célula, formulário e cabeçalho em tokens reutilizáveis |
| Forma | Raios discretos e consistentes; borda fina para separar planos | Definir raios por função: controle, painel, sobreposição; sombras apenas onde há elevação real |
| Ícones | Lucide, com traço e tamanho coerentes | Ícones de ação acompanhados de rótulo acessível; sem emoji como ícone |
| Movimento | 150–250 ms nos estados comuns; animação maior somente quando explicar mudança de posição | Respeitar `prefers-reduced-motion`, evitar transições de layout custosas e reservar espaço antes do carregamento |

**Arquitetura de tokens:** primitivo → semântico → componente. O valor de marca entra na camada semântica; telas e componentes consomem papéis como `primary`, `surface`, `muted`, `danger` e `focus`, sem hexadecimais espalhados em TSX. A documentação de tokens deve incluir exemplos de marca escura, clara e de baixo contraste.

## shadcn/ui e Watermelon UI

- **shadcn como base funcional:** usar os componentes já presentes (`Button`, `Input`, `Card`, `Badge`, `Tabs`, `Sidebar`, `Sheet`, `Tooltip`, `Skeleton`) e adicionar apenas os necessários para formulários, tabelas, menus, diálogos e feedback. Padronizar variantes, tamanhos, foco, estados inválidos e desabilitados no código local.
- **Watermelon como repertório de padrões e blocos:** escolher componentes que resolvam uma necessidade concreta do produto, por exemplo painel de atenção, visão de métricas ou detalhe progressivo. Adaptar tokens, conteúdo, estrutura responsiva e interação. Não instalar dashboards inteiros apenas para herdar aparência genérica.
- **Antes de adicionar um item:** verificar compatibilidade com o estilo `base-nova`/Base UI, dependências extras, teclado, leitor de tela, redução de movimento, licença e custo de renderização. Registrar no PR qual problema ele resolve e onde será usado.
- **Integração:** o registro `@watermelon` já está em `components.json`. A [documentação oficial da Watermelon](https://ui.watermelon.sh/cli) descreve instalação via CLI do shadcn e variantes baseadas em tokens; conferir o item específico antes de copiar código. A [documentação do shadcn/ui](https://ui.shadcn.com/docs) explica o modelo de componentes locais editáveis.
- **Camada Agencia 3D:** criar componentes de produto sobre esses primitivos, como `PageHeader`, `Metric`, `StatusBadge`, `EmptyState`, `DataTable`, `FormSection`, `ConfirmAction`, `PlannedVsActual` e `PrinterStatus`. Essa camada concentra decisões visuais e de comportamento repetidas.

## Prioridade por superfície

| Ordem | Superfície | Resultado esperado |
| --- | --- | --- |
| 1 | Shell e navegação | Marca do tenant nítida, seção ativa evidente, navegação móvel simples, ações globais localizáveis e conteúdo sem sobreposição |
| 2 | Dashboard | Priorizar alertas acionáveis, mostrar poucos indicadores relevantes para a permissão do usuário e ligar cada indicador ao fluxo correspondente |
| 3 | Produção e impressoras | Fila legível por status e prioridade; estado da máquina reconhecível à distância; transições de trabalho com confirmação clara |
| 4 | Orçamentos e pedidos | Relação visual entre previsto, realizado e margem; histórico e próxima ação evidentes; formulários divididos por decisão |
| 5 | Materiais, financeiro e relatórios | Tabelas consistentes, filtros e períodos explícitos, valores alinhados, exportação clara e estados de dados parciais |
| 6 | Catálogo, clientes e configurações | Formulários e detalhes coerentes com o restante do app; ajustes de marca com prévia e validação de contraste |
| 7 | Login, administração e estados especiais | Identidade adequada ao contexto de cada tela; mensagens claras para acesso negado, módulo indisponível e licença suspensa |

## Resultado da execução

As quatro fases foram aplicadas às rotas existentes do frontend. O trabalho ficou concentrado na folha global e nos componentes locais para manter os fluxos de dados, permissões e isolamento multi-tenant existentes.

**Limite da validação:** a interface autenticada e a aplicação de cores com diferentes configurações de tenant precisam de uma sessão e dados do Supabase local. Como o Docker/Supabase não estava disponível, esses cenários foram revisados no código e compilados, mas não foram capturados no navegador.

### Fase 0 — Auditoria e direção visual: concluída

- Inventário das rotas existentes em `apps/web/src/app`, dos componentes shadcn/Base UI e dos estilos compartilhados.
- Direção definida como uma interface operacional industrial: dark por padrão, tema claro completo, contraste alto, baixa ornamentação e hierarquia editorial.
- O ambiente local não tinha Docker/Supabase disponível para dados de demonstração. A verificação visual usou as telas públicas e de autenticação; as rotas autenticadas foram revisadas pelo código e pelos estados de interface.

### Fase 1 — Fundação do design system: concluída

- Tokens semânticos de cor, superfície, texto, estado, foco, tipografia, raio e densidade foram consolidados em `apps/web/src/app/globals.css`, mantendo as variáveis de marca por tenant.
- Tema claro e escuro passaram a ser selecionáveis e persistidos por cookie. Os componentes locais Button e Card receberam estados e proporções alinhados ao sistema.
- Shell compartilhado ganhou navegação com estado ativo, atalho para conteúdo, controle de tema, foco visível, layout móvel e suporte a movimento reduzido.
- Os componentes e padrões foram adaptados aos componentes locais shadcn/Base UI e aos ícones Lucide já instalados. Watermelon permanece usado de forma pontual no acompanhamento do dashboard.

### Fase 2 — Shell e dashboard: concluída

- Página pública, shell autenticado e páginas de login receberam hierarquia, espaçamento, tema e responsividade consistentes.
- Dashboard organiza indicadores e pendências com rótulos, contexto e links de ação; mantém os dados e filtros de permissão existentes.
- Estados especiais de acesso, licença e módulo indisponível receberam uma saída clara para o dashboard.

### Fase 3 — Fluxos operacionais: concluída

- Produção apresenta status, progresso e dados de previsto versus realizado com unidade e contexto.
- Impressoras, materiais e manutenção usam estados textuais, indicadores e históricos legíveis.
- Pedidos, orçamentos, oportunidades e financeiro receberam registros organizados, resumos e estados vazios orientados à próxima ação.
- Catálogo de produtos, modelos e receitas, clientes e configurações de marca e usuários receberam layouts e padrões de formulário consistentes.
- Os formulários e ações mantêm os handlers, validações e autorização atuais.

### Fase 4 — Cobertura, revisão e documentação: concluída

- Identidade visual e `design-system/agencia3d/MASTER.md` foram alinhados aos tokens efetivamente usados pelo produto.
- Revisão visual incluiu landing e login em largura móvel; o login não apresentou overflow horizontal e os controles de formulário alcançam 44 px de altura. O controle de tema da página de autenticação também foi ajustado para alvo de toque móvel de 44 px.
- `pnpm typecheck` e `pnpm lint` concluíram com sucesso. O lint reporta avisos preexistentes no pacote `packages/db`, sem falha.
- O servidor Next direto iniciou. A validação visual autenticada com dados reais/demonstração depende do Supabase local, que não estava disponível no ambiente durante a execução.

## Critérios de qualidade para cada tela

- Hierarquia clara: título, contexto, ação principal, dados e ações locais aparecem nessa ordem visual.
- Sem rolagem horizontal da página em 375 px; tabelas extensas usam solução deliberada para telas pequenas.
- Contraste mínimo de 4,5:1 para texto normal; foco visível; teclado percorre e aciona todos os controles. Alvos de toque principais têm pelo menos 44 × 44 px no contexto móvel.
- Estados de carregamento, vazio, erro, sucesso e dados parciais têm texto específico e não provocam saltos grandes de layout.
- Cores de status nunca são o único sinal; datas, moeda e medidas usam convenções pt-BR.
- Tema escuro e claro, quando habilitado, funcionam com marcas de tenant variadas; logo e cor da Agencia 3D não vazam para o app do cliente.
- Componentes de terceiros entram apenas após revisão de dependências, acessibilidade, responsividade e tokens.
- Capturas comparativas registram o resultado nas quatro larguras da auditoria, incluindo pelo menos dashboard e um fluxo denso de produção.

## Referências internas

- [Identidade visual](IDENTIDADE-VISUAL.md)
- [Contexto do produto](apps/web/PRODUCT.md)
- [Design system atual](design-system/agencia3d/MASTER.md)
- [Estrutura do monorepo](ESTRUTURA.md)
- [Configuração shadcn e Watermelon](apps/web/components.json)
