# IDENTIDADE-VISUAL.md — Brand book Agencia 3D

## 1. Nome e conceito

**Agencia 3D** — plataforma white label para operações de impressão 3D. O nome da plataforma aparece na administração interna; cada operação cliente usa sua própria marca e domínio.

**Tagline principal:**
> Do orçamento à peça entregue.

**Personalidade da marca:** clara, técnica e confiável. A comunicação explica o trabalho da operação sem competir com a marca do cliente nem recorrer a promessas genéricas.

## 2. Logo

Arquivo: `assets/agencia3d-logo.png` — símbolo abstrato em camadas, em gradiente laranja-âmbar.

**Regras de uso:**
- Versão primária: gradiente sobre fundo escuro (`--bg`).
- Versão monocromática: branco puro sobre laranja, ou grafite sobre claro.
- Área de respiro: altura da primeira camada do símbolo em todos os lados.
- Nunca: esticar, rotacionar, aplicar sombras, usar sobre fotos claras sem scrim.

**Por que o white label muda tudo:** o logo Agencia 3D aparece apenas no console admin interno, no site de vendas e no rodapé "Powered by" (removível no Business). Dentro do app do tenant, **a marca é sempre a do cliente** — o design system inteiro é tematizável por CSS vars.

## 3. Paleta

| Token | Hex | Uso |
|---|---|---|
| `--brand-primary` | `#FF5A1F` | Laranja filamento — ação principal, marca |
| `--brand-accent` | `#FFB25A` | Âmbar — gradientes, destaques |
| `--bg` | `#0E1013` | Fundo escuro (tema dark é o default da marca) |
| `--bg-surface` | `#1A1D23` | Cards, painéis |
| `--bg-elevated` | `#242832` | Modais, popovers |
| `--text-primary` | `#F4F5F7` | Texto principal |
| `--text-muted` | `#9BA1AB` | Texto secundário |
| `--success` | `#3DDC84` | Aprovado, máquina livre, OK |
| `--warning` | `#FFC53D` | Atenção, estoque baixo |
| `--danger` | `#FF4D4D` | Falha, ruptura, atraso |
| `--info` | `#4DA3FF` | Informativo, em produção |

**Status semânticos fixos** (não tematizáveis pelo tenant — consistência operacional): impressora imprimindo = info, livre = success, manutenção = warning, erro = danger.

### Tema claro

O tema escuro é o padrão; o usuário também pode escolher o tema claro. A preferência fica em cookie e vale para a próxima sessão. O tema claro preserva as cores do tenant e usa superfícies claras e estados semânticos com contraste adequado.

| Token | Tema claro | Uso |
|---|---|---|
| `--bg` | `#F4F5F7` | Fundo da aplicação |
| `--bg-surface` | `#FFFFFF` | Cards e painéis |
| `--bg-elevated` | `#EEF0F3` | Popovers e áreas elevadas |
| `--bg-inset` | `#F8F9FA` | Campos de entrada |
| `--text-primary` | `#17191D` | Texto principal |
| `--text-muted` | `#535A64` | Texto secundário |
| `--line` | `#D9DDE3` | Divisórias e bordas |
| `--line-strong` | `#ABB3BF` | Bordas de controle |

Os estados semânticos mantêm a mesma função nos dois temas. O token `--brand-accent-text` adapta a cor de destaque para leitura no tema claro; `--brand-accent` continua disponível para bordas e superfícies.

## 4. Tipografia

| Uso | Fonte | Fallback |
|---|---|---|
| Títulos / números de KPI | **Sora** (700/600) | system-ui |
| Corpo / UI | **Inter** (400/500/600) | system-ui |
| Dados técnicos, SKU, código de bobina, horas | **JetBrains Mono** | monospace |

Escala: 12 / 14 / 16 / 20 / 24 / 32 / 48. Números de dashboard sempre em Sora Bold com `tabular-nums`.

## 5. Design tokens (CSS vars — núcleo do white label)

```css
:root {
  --brand-primary: #FF5A1F;     /* sobrescrito por tenant */
  --brand-secondary: #1A1D23;
  --brand-accent: #FFB25A;
  --radius: 10px;
  --font-heading: 'Sora', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

`apps/web/src/app/layout.tsx` injeta os valores do tenant em runtime. **Regra de ouro do design system:** componentes consomem tokens semânticos; cores base vivem apenas na definição do tema.

## 6. Componentes e padrões de UI

- **Dark mode first.** Chão de fábrica e dashboards ficam melhor em fundo escuro; tema claro disponível.
- **Acessibilidade operacional.** Contraste mínimo de 4,5:1 para texto comum, foco visível, teclado completo, alvos de toque de 44 px em dispositivos móveis e respeito a `prefers-reduced-motion`.
- **Kanban é a linguagem do produto** (pipeline comercial e fila de produção): cards densos, drag-and-drop, badges de status semânticas.
- **Painel da fábrica:** grid de impressoras estilo "torre de controle" — pensado para TV na parede (auto-refresh via Realtime, alto contraste, sem interação).
- **Densidade:** UI compacta (14px base) — é ferramenta de trabalho, não site de marketing.
- **Previsto × Real:** padrão visual próprio — valores planejados e realizados juntos, com medida e contexto explícitos. Variação nunca depende apenas de verde/vermelho.
- **Ícones:** Lucide. Ilustrações: linhas isométricas de camadas de impressão.

## 7. Tom de voz

| Fazemos | Não fazemos |
|---|---|
| "PLA preto acaba em 4 dias. Comprar 20 kg?" | "Ops! Algo deu errado 😢" |
| "Margem caiu 11 p.p. por causa de falhas no lote X" | "Parabéns! Você é incrível!" |
| Verbos de ação: imprimir, reservar, aprovar | Jargão de SaaS: alavancar, sinergia |
| Erros explicam causa e próxima ação | Erros genéricos |

## 8. Aplicações

- **Site de vendas:** fundo escuro, gradiente laranja, screenshots do produto com dados reais de demo, CTA "Quero o sistema da minha empresa".
- **E-mails transacionais:** header com logo do **tenant**, nunca da Agencia 3D.
- **Favicon do tenant:** gerado automaticamente a partir do logo enviado (rota dinâmica).
- **QR Code das bobinas:** etiqueta 50×30mm, código `FIL-01382` em mono, borda laranja.
