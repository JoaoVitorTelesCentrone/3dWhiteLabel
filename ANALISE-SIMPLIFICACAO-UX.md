# Análise de simplificação da experiência

## Escopo observado

Revisão do código e dos documentos em 7 de outubro de 2026. Não houve entrevista com usuários nem teste de tarefas; as prioridades abaixo são hipóteses para validar com operadores de empresas de impressão 3D.

| Área disponível hoje | Tarefa do usuário | Observação |
|---|---|---|
| Visão geral e relatórios | Ver o que exige atenção e analisar um período | O painel repete alertas em indicador, selo e acordeão, inclusive quando nada está pendente. |
| Clientes e pedidos | Registrar quem comprou e a venda realizada | O cliente é um cadastro de apoio; a rotina começa no pedido, com produto e quantidade. |
| Produtos, modelos 3D e receitas | Preparar itens e parâmetros de fabricação | Três cadastros relacionados exigem entendimento prévio das diferenças entre produto, modelo, variante e receita. |
| Produção, impressoras e manutenção | Planejar impressões e registrar execução | Os conceitos de pedido, OP e job são necessários no banco, mas a interface pode explicar a ação antes do termo técnico. |
| Materiais | Cadastrar material, receber e ajustar bobinas | Há dois níveis, tipo de material e bobina individual, com ações diferentes na mesma área. |
| Financeiro | Registrar recebimentos e despesas | Depende do pedido e aparece como etapa separada da entrega. |
| Marca e usuários | Configurar identidade e acesso | Uso administrativo; faz sentido manter fora das tarefas diárias. |

## Mudanças aplicadas

1. A lateral usa Visão geral, Pedidos, Operação, Catálogo e Gestão. Clientes fica em Configurações como cadastro de apoio. Oportunidades e propostas saem do fluxo de uso.
2. O pedido é criado com cliente, produto e quantidade. Preço e custo são copiados da variação escolhida e ficam preservados no pedido.
3. A dashboard soma faturamento, custo e lucro estimado dos pedidos do mês. A venda de três unidades usa três vezes o preço e três vezes o custo cadastrados no produto.

## Próximas decisões, em ordem de impacto

1. **Validar o cadastro direto de pedidos com usuários reais.** Medir tempo para registrar cliente, produto e quantidade e confirmar que preço, custo e lucro são entendidos sem treinamento.
2. **Guiar o fluxo de pedido a entrega.** Em cada pedido, mostrar a próxima ação disponível e seu destino. A implementação deve respeitar os papéis e estados atuais; não criar transições implícitas.
3. **Validar o novo painel em uso.** Alertas aparecem só quando há pendência; a tela agora mostra fluxo e movimentações. Confirmar com operadores se as prioridades e os rótulos ajudam a decidir a próxima ação.
4. **Explicar cadastros dependentes.** Nos estados vazios, indicar a sequência mínima: cliente e produto com preço e custo para pedido; receita, impressora e bobina quando a produção os exigir.
5. **Avaliar a terminologia com operadores.** Testar se “OP”, “job”, “variante” e “receita” são termos familiares. Trocar apenas os rótulos que dificultarem a tarefa; manter a distinção dos registros no domínio.

O MVP não usa oportunidades nem orçamentos porque o processo informado começa depois da venda. Esses recursos podem voltar como módulo opcional se a operação passar a precisar registrar negociações antes do pedido.
