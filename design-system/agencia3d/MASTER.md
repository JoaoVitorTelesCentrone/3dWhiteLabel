# Design system da Agencia 3D

> Este arquivo descreve o sistema implementado em `apps/web/src/app/globals.css` e os componentes locais em `apps/web/src/components/ui`. A identidade documentada em `IDENTIDADE-VISUAL.md` prevalece sobre qualquer exemplo genérico do shadcn ou registro externo.

## Direção

Interface de operação industrial: precisa, discreta e rápida de ler. A informação tem prioridade sobre decoração. O dashboard e os fluxos operacionais usam densidade compacta, com respiro entre grupos e sem cartões para dados que podem ser lidos melhor em lista ou tabela.

- Tema escuro padrão; tema claro disponível e salvo no cookie `agencia3d-theme`.
- Marca, logo e cores do tenant aparecem dentro do espaço de trabalho.
- Cores de status mantêm significados fixos e não são alteradas pela marca do tenant.
- Sora para títulos e indicadores; Inter para interface; JetBrains Mono para códigos e medidas técnicas.
- Lucide para ícones; nenhum emoji como ícone.

## Tokens semânticos

### Escuro

| Papel | Valor | Token |
|---|---|---|
| Marca principal | `#FF5A1F` | `--brand-primary` |
| Destaque | `#FFB25A` | `--brand-accent` |
| Fundo | `#0E1013` | `--bg` |
| Superfície | `#1A1D23` | `--bg-surface` |
| Superfície elevada | `#242832` | `--bg-elevated` |
| Campo de entrada | `#101216` | `--bg-inset` |
| Texto principal | `#F4F5F7` | `--text-primary` |
| Texto secundário | `#9BA1AB` | `--text-muted` |
| Divisória | `#30343C` | `--line` |
| Borda de controle | `#454A54` | `--line-strong` |

### Claro

| Papel | Valor | Token |
|---|---|---|
| Fundo | `#F4F5F7` | `--bg` |
| Superfície | `#FFFFFF` | `--bg-surface` |
| Superfície elevada | `#EEF0F3` | `--bg-elevated` |
| Campo de entrada | `#F8F9FA` | `--bg-inset` |
| Texto principal | `#17191D` | `--text-primary` |
| Texto secundário | `#535A64` | `--text-muted` |
| Divisória | `#D9DDE3` | `--line` |
| Borda de controle | `#ABB3BF` | `--line-strong` |

### Estados e marca do tenant

| Estado | Escuro | Claro | Token |
|---|---|---|---|
| Sucesso | `#3DDC84` | `#167344` | `--success` |
| Atenção | `#FFC53D` | `#946100` | `--warning` |
| Erro | `#FF4D4D` | `#BD2929` | `--danger` |
| Informação | `#4DA3FF` | `#1764A0` | `--info` |
| Texto do botão de marca | `#140B07` | `#140B07` | `--on-brand` |

`--brand-primary` e `--brand-accent` vêm de `tenant_branding`. A ação primária usa texto `--on-brand`, validado ao salvar a marca. Texto de destaque usa `--brand-accent-text`, ajustado para manter leitura em cada tema. Componentes nunca espalham valores hexadecimais pela interface.

## Escalas e geometria

- Base de interface: 14 px; controles de texto: 14–16 px.
- Espaçamento: 4, 8, 12, 16, 24 e 32 px.
- Largura de conteúdo: 82 rem; o painel central pode ser mais estreito quando a tarefa pedir leitura focada.
- Bordas finas e raios pequenos e consistentes. Sombras aparecem apenas para sobreposição real.
- Números operacionais usam algarismos tabulares; moeda e datas seguem `pt-BR`.

## Padrões de produto

- **Cabeçalho de página:** contexto curto, título claro, descrição quando útil e ação primária identificável.
- **Indicador:** nome, valor, unidade ou período e destino relacionado.
- **Status:** texto mais cor; cor sozinha nunca comunica o estado.
- **Previsto × Real:** valores com mesma unidade e escopo, apresentados lado a lado; não calcular variação entre conjuntos que não sejam comparáveis.
- **Formulário:** rótulos visíveis, ajuda próxima ao campo, erro junto da causa, confirmação após salvar e estados pendentes no botão.
- **Lista e tabela:** valores alinhados, linhas fáceis de percorrer, filtro próximo aos resultados; tabela larga rola dentro do próprio contêiner em telas pequenas.
- **Estado vazio:** explica o que pode ser feito em seguida. Erro identifica o que falhou e a recuperação disponível.
- **Kanban:** pipeline comercial e produção. Rolagem horizontal fica confinada à área do quadro em mobile.
- **Movimento:** 150–250 ms para resposta a interação; animação não essencial é removida com `prefers-reduced-motion`.

## Componentes e distribuição

shadcn/ui no estilo `base-nova` com Base UI é a base editável de controles. Watermelon UI é uma fonte opcional de padrões e blocos por meio do registro `@watermelon` em `apps/web/components.json`. Cada peça importada deve ser revisada, adaptada aos tokens Agencia 3D e avaliada por acessibilidade, dependências, responsividade e custo de renderização.

Primitivos locais ficam em `apps/web/src/components/ui`; padrões do produto ficam em componentes próprios. Evite introduzir uma nova cópia de botão, campo, painel ou status quando um padrão compartilhado já existe.

## Acessibilidade e responsividade

- Contraste mínimo de 4,5:1 para texto normal.
- Estado de foco sempre visível; navegação e formulários operáveis por teclado.
- Alvos de toque com pelo menos 44 × 44 px em contextos móveis.
- Sem rolagem horizontal da página em 375 px. Conteúdo largo recebe solução dentro do componente.
- Revisar em 375, 768, 1280 e 1920 px.
- Tema, status e marca devem continuar legíveis em todas as combinações suportadas.
