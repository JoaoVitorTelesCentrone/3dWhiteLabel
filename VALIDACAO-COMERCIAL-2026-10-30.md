# Sua Empresa 3D — preparação do primeiro piloto

Data: 30/10/2026. Estado: preparação; nenhuma empresa foi contatada e a oferta não foi validada.

## Prontidão observada

- Branch `main`, acompanhando `origin/main`. Há alterações locais anteriores em código, documentação, migration e arquivos não versionados; foram preservadas.
- Docker local `forja-local` ativo. `npx supabase test db --local supabase/tests`: **passou**, 3 arquivos, 40 testes. Os testes incluem pedido, OP, job, reserva, falha, reposição, expedição, entrega e quatro asserções de isolamento. Não cobrem recebimento parcial nem tentativa cruzada completa de leitura, escrita e exportação pela aplicação.
- `pnpm` não estava no PATH. Via `corepack pnpm`, `typecheck`, `lint`, `test` e `build` **não chegaram à aplicação**: `EPERM` ao abrir o executável `node_modules/.pnpm/turbo@2.11.7/node_modules/turbo/bin/turbo`. `test:e2e` depende de `pnpm` no servidor Playwright e não foi executado. Nenhum defeito de fluxo foi demonstrado por esses erros.
- `release:check` **falhou** por configuração de produção ausente: URL/chaves Supabase, domínio/app/admin e Cloudflare. Nenhum valor secreto foi lido ou registrado.
- `db:reset` não foi executado porque o banco local já estava em funcionamento e não foi comprovado que seus dados poderiam ser descartados. Backup/restore, inclusive Storage, não foram ensaiados.

**Decisão:** não liberar piloto pago em produção nem afirmar demo ponta a ponta validada até concluir gates, isolamento, restore e capacidade de suporte. Não há base para corrigir código do fluxo principal neste momento; primeiro reproduzir um defeito real em ambiente isolado.

## Roteiro de demo de 10 minutos — somente após execução visual

Usar tenant e pessoas fictícios. Preparar cliente “Oficina Exemplo”, produto “Suporte de bancada”, pedido de 3 unidades e material fictício. Mostrar: (1) pedido aprovado e preço/custo registrados; (2) liberação para OP; (3) job e reserva; (4) falha em uma unidade e nova programação; (5) quantidade boa suficiente; (6) expedição e entrega; (7) recebimento parcial e saldo no financeiro. **Comprovação atual:** banco até entrega, sem demonstração visual ou recebimento parcial. Não gravar vídeo nem mostrar como executado até o teste real. Capturas devem ocultar dados locais e usar somente a ficção.

## Minuta da oferta: piloto pago assistido de 14 dias

**Público:** prestador de impressão 3D sob demanda com pedidos recorrentes, ao menos duas pessoas envolvidas e responsável disponível. Isso é critério de seleção, ainda não confirmado em conta alguma.

**Problema a confirmar:** passagem de informações do pedido aprovado à produção, reposição, entrega e recebimento pode consumir tempo ou criar retrabalho. Não pressupor que o prospect sofre disso.

**Escopo:** um tenant com marca, até dois operadores, cadastro manual de pequena amostra autorizada de clientes/produtos, acompanhamento de pedidos aprovados, OPs, jobs, falhas, entrega e recebimentos; uma sessão de implantação, uma de orientação, acompanhamento combinado durante 14 dias e reunião de aceite. Uma rodada de correção de configuração/dados da amostra; mudanças de produto exigem escopo novo.

**Exclusões:** orçamento automático por STL, WhatsApp, telemetria de impressoras, nota fiscal, marketplace, migração integral, integrações, customização de código, produção de peças e promessa de ganho de receita. Domínio próprio, caso solicitado, tem orçamento separado.

**Implantação e responsabilidades:** agência provisiona ambiente isolado, configura acessos e orienta a operação após gates P0. Cliente indica responsável e dois usuários, autoriza dados, fornece amostra pequena, valida permissões e opera pedidos reais durante o prazo. Início conta após ambiente e dados mínimos aceitos. Definir por escrito janela e canal de suporte, propriedade, exportação, retenção e encerramento antes da assinatura.

**Aceite proposto:** dois usuários registram pelo menos um pedido real do início à entrega; uma falha e reposição são registradas quando ocorrerem (ou com caso fictício acordado); recebimento parcial e saldo são conferidos pelo cliente; ambos confirmam que os dados de outro tenant são inacessíveis. Registrar tempo de implantação, chamados, defeitos e decisão final. Os critérios devem ser ajustados ao processo confirmado na descoberta.

**Preço, hipótese para discussão, sem proposta firme:** piloto de 14 dias R$ 997 de serviço de implantação e acompanhamento; licença após aceite R$ 1.497 única; hospedagem e manutenção/Care separadas, com R$ 99/mês apenas como referência documental antiga. Domínio, infraestrutura externa, transações e suporte fora da janela são custos separados, a apurar. Não cobrar nem prometer esses valores antes de medir horas de suporte, custo de infraestrutura, backup/restore e termos de licença. O piloto não converte automaticamente em contrato contínuo.

## Dez contas revalidadas em fontes públicas

Leitura em 30/10/2026. A prioridade é de **pesquisa**, não de compra; equipe, volume, orçamento, ferramentas e dor são desconhecidos salvo declaração explícita. Canal significa canal corporativo público, não autorização para disparo.

| Conta | Sinal observado e fonte | Hipótese a perguntar | Canal corporativo | Prioridade e motivo |
|---|---|---|---|---|
| 048LAB | [Site](https://www.048lab.com.br/): farm FDM, fabricação sob demanda e produção em escala | Como passam o pedido aprovado à produção? | Botão “Entrar em contato” no site | A: operação sob demanda e escala declaradas |
| KeiMel 3D | [Orçamento](https://keimel.com.br/orcamento/): caminhos com e sem arquivo e vários materiais | Como registram a execução após a aprovação? | [Formulário de contato](https://keimel.com.br/contato/) | A: orçamento público e serviço sob encomenda |
| Maha 3D | [Brindes corporativos](https://maha3d.com/brindes-corporativos/): protótipo aprovado antes do lote | Como acompanham lote e reposição? | contato@maha3d.com publicado na página | A: etapa de aprovação e lote explícitas |
| PrintUp 3D | [Orçamento](https://printup3d.com/orcamento/): recebe arquivo, uso da peça e mensagem | Como acompanham o pedido depois da cotação? | Formulário da página | A: cotação técnica estruturada |
| BKreativeLab | [Contato](https://www.bkreativelab.com.br/contato): pedidos personalizados começam após pagamento e briefing; formulário pede quantidade e prazo | Como passam briefing aprovado à produção? | Formulário da página | A: marco de início e quantidade explícitos |
| Data Frontier 3D | [Serviço FDM](https://datafrontier3d.com.br/produto/impressao-3d-sob-encomenda-fdm): orçamento, impressão, conferência e envio | Há volume e mais de um operador para justificar piloto? | contato@datafrontier3d.com.br publicado na página | B: fluxo visível; mix amplo de produtos pode reduzir encaixe |
| inGenioUS | [Orçamento](https://ingeniouslabs.com.br/orcamento): upload, material, quantidade e cotação instantânea | O acompanhamento posterior é separado da cotação? | contato@ingeniouslabs.com.br publicado na página | B: fluxo digital anterior ao pedido pode limitar encaixe |
| ImaginaTech | [FAQ](https://imaginatech.com.br/faq/): orçamento online e pedidos em lote; [acompanhamento](https://imaginatech.com.br/acompanhar-pedido/) já existe | Há alguma lacuna operacional posterior ao orçamento? | contato@imaginatech.com.br no [site](https://imaginatech.com.br/) | C: acompanhamento próprio visível; pesquisar antes de abordar |
| 3D Bureau | [Site](https://3dbureau.com.br/): serviço FDM com máquinas de tamanhos variados | Há passagem entre pessoas e pedidos recorrentes? | Seção Contato no site; confirmar destino antes de enviar | B: serviço e máquinas declarados; canal precisa confirmação |
| Morph3D | [Site](https://www.morph3d.com.br/): farm e operação B2B; declara números extraídos de ERP próprio | Existe lacuna fora do ERP atual? | contato@morph3d.com.br na [cotação](https://www.morph3d.com.br/cotacao) | C: ERP próprio declarado reduz a prioridade |

## Cinco mensagens individuais, rascunhos não enviados

**048LAB — pelo contato do site**
> Olá, equipe 048LAB. Vi no site a farm FDM e a fabricação sob demanda em escala. Estou conversando com operações 3D para entender o que acontece depois que um pedido é aprovado: programação, falhas, entrega e recebimento. Construí um fluxo para esse trecho e queria saber se ele se parece com a rotina de vocês. Quem acompanha essa passagem poderia conversar por 20 minutos? Se não fizer sentido, me avisem e encerro o contato.

**KeiMel — formulário de contato**
> Olá, equipe KeiMel. Vi que o orçamento separa projetos com e sem arquivo 3D e contempla diferentes materiais. Minha pergunta é sobre a etapa seguinte: quando um orçamento é aprovado, como vocês acompanham produção e entrega? Estou testando um sistema para esse trecho e gostaria de ouvir quem opera os pedidos por 20 minutos. Se não for prioridade, tudo bem; não insistirei.

**Maha 3D — e-mail corporativo**
> Olá, equipe Maha 3D. Li que os brindes corporativos podem ter um protótipo aprovado antes do lote. Estou estudando como empresas registram o que acontece entre essa aprovação, a produção do lote e a entrega, inclusive quando uma peça precisa ser refeita. Tenho um fluxo de demonstração em preparação. Quem cuida dessa operação teria 20 minutos para me contar como funciona hoje? Se não fizer sentido, basta avisar.

**PrintUp 3D — formulário de orçamento/contato**
> Olá, equipe PrintUp 3D. Vi que o formulário de orçamento coleta arquivo e informações sobre o uso da peça. Estou pesquisando o acompanhamento que vem depois da cotação aprovada, da produção até a entrega e o recebimento. Construí uma ferramenta para esse trecho e queria conferir se a rotina de vocês tem encaixe. Poderiam encaminhar a pergunta a quem acompanha os pedidos? Uma conversa de 20 minutos seria suficiente. Se não houver interesse, encerro por aqui.

**BKreativeLab — formulário de contato**
> Olá, equipe BKreativeLab. Li que pedidos personalizados costumam entrar em produção após pagamento e briefing final; o formulário também pede quantidade e prazo. Estou estudando como essa informação passa para a produção e como vocês acompanham a entrega. Tenho um fluxo para testar essa etapa e gostaria de ouvir quem a coordena por 20 minutos. Se não for útil agora, me avisem e não insisto.

## Descoberta de 20 minutos

0–2 min: apresentar o objetivo e pedir um exemplo recente sem dados de clientes finais. 2–9 min: reconstruir último pedido aprovado: quem recebeu, onde registrou, quem produziu, como material e prazo foram acompanhados. 9–14 min: perguntar por falhas/reposições, entrega e recebimento; frequência, tempo e consequência **apenas se relatados**. 14–17 min: identificar usuários, responsável, prioridade, orçamento disponível e condição de teste. 17–20 min: resumir o que foi ouvido, perguntar o que ficou errado e combinar próximo passo com data. Registrar frases e números fornecidos, sem inferir ferramenta ou dor. Demo só se houver encaixe e gates concluídos.

## Próxima ação datada

**03/11/2026:** em ambiente local comprovadamente descartável, resolver o acesso ao Turbo, executar gates JavaScript/E2E, demo com recebimento parcial, teste cruzado A/B e restore com Storage. Então revisar preço e capacidade de suporte; depois enviar, mediante revisão de João, o primeiro lote das cinco mensagens. Nenhum envio ocorreu nesta preparação.
