# Medição de navegação

O comando `pnpm bench:navigation` mede as rotas `/dashboard`, `/pedidos`, `/clientes` e `/materiais` com Playwright. Para cada rota, registra carregamento completo e navegação pelo menu. A primeira passagem é descartada para aquecer a compilação e as conexões. O resultado é JSON, sem dados da conta.

No PowerShell, dentro de `Agencia 3d/`:

```powershell
$env:AGENCIA3D_BENCH_EMAIL = "conta@exemplo.com"
$env:AGENCIA3D_BENCH_PASSWORD = "senha-da-conta"
pnpm bench:navigation -- --base-url http://127.0.0.1:3000 --runs 3 --output .tmp/performance-dev.json
```

Para comparar com a compilação de produção, aplique as migrations locais, defina `$env:AGENCIA3D_BENCH = "true"`, execute `pnpm --filter @agencia3d/web build` e inicie o Next em outra porta com `pnpm --filter @agencia3d/web exec next start --hostname 127.0.0.1 --port 3001`. Esse modo usa `.next-bench` para não interferir no servidor de desenvolvimento. Repita o comando acima com `--base-url http://127.0.0.1:3001` e outro arquivo de saída. Use a mesma conta, máquina e base de dados nas duas medições. Rode novamente após uma alteração e compare os valores de `visibleMs`, `ttfbMs` e `rscMs` por rota.

`visibleMs` mede até o título da página ficar visível. `ttfbMs` mede o início da resposta de uma navegação completa. `rscMs` mede a resposta dos dados de uma transição pelo menu quando o navegador registra essa requisição. O JSON contém amostras e percentis 50/95. Os números locais de `next dev` podem incluir compilação e não devem ser tratados como latência de produção.

## Amostra local de 08/10/2026

Medição manual no navegador conectado ao `next dev`, após uma passagem de aquecimento, com a base de demonstração de 97 pedidos. Cada linha abaixo é uma amostra, ainda não uma distribuição estatística:

| Rota | TTFB | Navegação completa |
| --- | ---: | ---: |
| Dashboard | 217 ms | 629 ms |
| Pedidos | 680 ms | 1.679 ms |
| Clientes | 198 ms | 849 ms |
| Materiais | 214 ms | 773 ms |

A primeira navegação completa para Pedidos após a alteração demorou 17.908 ms até o primeiro byte; a segunda caiu para 680 ms. Isso é compatível com custo de compilação e aquecimento do ambiente de desenvolvimento, mas precisa ser comparado com `next start` antes de concluir a causa. A paginação de Pedidos respondeu em 330 ms para a página 2, e a busca por cliente em 409 ms, medidas pela requisição RSC do navegador.
