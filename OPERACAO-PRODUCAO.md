# Operação de produção

## Objetivos do Care

- RPO do banco: até 24 horas no plano padrão.
- RTO inicial: até 8 horas úteis, sujeito à disponibilidade do provedor.
- Monitoramento: consultar `GET /api/health` a cada cinco minutos e alertar após duas falhas consecutivas.
- Incidentes: registrar início, tenants afetados, mitigação, restauração e encerramento.

Os valores comerciais definitivos devem constar no contrato. PITR pode reduzir o RPO, mas exige plano compatível no Supabase.

## Preparação do ambiente

1. Use projetos Supabase separados para preview, staging e produção.
2. Configure as variáveis de `PRODUCTION-CONFIG.example` no provedor, sem copiar `.env.local` para o deploy.
3. Execute `pnpm release:check` no ambiente de release.
4. Mantenha `AGENCIA3D_LOCAL_DEMO_AUTO_LOGIN` ausente em produção.
5. Configure no Supabase as URLs de redirect de cada subdomínio e domínio utilizado nos convites.
6. Restrinja o token Cloudflare à zona e à permissão `SSL and Certificates Write`.
7. Cadastre o secret `PRODUCTION_HEALTH_URL` no GitHub com a URL completa de `/api/health`; o workflow `Production health` fará a sonda a cada cinco minutos. Configure as notificações de falha do repositório para a equipe de suporte.

## Backup

Projetos pagos do Supabase oferecem backups diários do banco; eles não incluem os objetos do Storage. Além do backup gerenciado:

1. Agende `pnpm backup:database` diariamente com `SUPABASE_DB_URL` e `AGENCIA3D_BACKUP_DIR` apontando para volume protegido.
2. Agende `pnpm backup:verify` após o dump.
3. Copie o dump para armazenamento externo criptografado com retenção mínima de 30 dias.
4. Copie separadamente os buckets `forja-branding`, `forja-products` e `forja-designs` usando credenciais de serviço e preserve a mesma estrutura de caminhos.
5. Nunca mantenha backups com dados reais no repositório.

## Ensaio de restauração

Faça o ensaio mensalmente em um projeto Supabase vazio e isolado:

1. Pause integrações e notificações do destino.
2. Restaure o dump lógico no projeto de ensaio.
3. Reponha os objetos do Storage e confira as políticas dos buckets.
4. Configure chaves e URLs exclusivas do ensaio.
5. Valide login, tenant, pedido, produção, entrega, financeiro e exportação.
6. Registre duração, perda máxima observada, falhas e correções. Apague o ambiente conforme a política interna após o ensaio.

Uma restauração de produção exige janela comunicada porque o projeto fica indisponível durante o procedimento. Restaure em novo projeto para investigação quando for necessário preservar os dados recebidos depois do incidente.

## Domínios próprios

O console `/admin` cria o Custom Hostname na Cloudflare e mostra o CNAME e o TXT necessários. O domínio só passa a `active` quando hostname e certificado SSL estão ativos no provedor. Use **Verificar DNS e SSL** depois que o cliente publicar os registros.

## Liberação de cliente

- Termos, proposta e responsáveis pelo tratamento de dados aceitos.
- Owner recebeu e concluiu o convite.
- Marca e usuários revisados em `/configuracoes`.
- Backup recente verificado e monitor em `/api/health` ativo.
- Roteiro de aceite realizado com dados do tenant.
- Canal e horário de suporte informados.
