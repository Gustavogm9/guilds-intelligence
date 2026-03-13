# Pendencias Manuais e Operacionais - 2026-03-11

## Objetivo

Listar tudo o que ainda precisa de acao manual, configuracao externa ou validacao fora do codigo.

## Nota de uso

Este documento e um checklist operacional.

- ele nao substitui o schema real do banco
- ele nao substitui as migrations como source of truth
- para compatibilidade entre codigo e banco, usar tambem `docs/SCHEMA_COMPATIBILITY_MATRIX_2026-03-12.md`

## 1. Variaveis de ambiente da web

Configurar no ambiente da aplicacao web:

- `PYTHON_WORKER_URL`
- `PYTHON_WORKER_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REPORT_SCHEDULER_SECRET`
- `OPERATIONAL_WEBHOOK_URL` ou `SLACK_WEBHOOK_URL`
- `SOCIAL_PUBLISHER_SECRET`
- `SOCIAL_METRICS_SECRET`
- `WHATSAPP_WEBHOOK_SECRET`
- `WHATSAPP_PROCESS_SECRET`
- `WHATSAPP_OUTBOUND_WEBHOOK_URL`
- `WHATSAPP_OUTBOUND_SECRET` (opcional, recomendado)
- `WHATSAPP_AUTO_RESPONSE_INTENTS` (opcional)
- `WHATSAPP_DELIVERY_MODE` (`webhook` ou `dry_run`)
- cron externo para `POST /api/social/publish` com header `x-social-publisher-secret`
- `LINKEDIN_ACCESS_TOKEN`
- `LINKEDIN_AUTHOR_URN`
- `LINKEDIN_API_VERSION` (opcional)
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_IG_USER_ID`
- `INSTAGRAM_GRAPH_API_VERSION` (opcional)

Configurar no ambiente do worker, quando quiser ativar notificacoes:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_BASE_URL` ou `NEXT_PUBLIC_APP_URL` ou `NEXT_PUBLIC_SITE_URL`
- `OPS_ALERT_EMAIL` ou `ALERT_EMAIL`

Uso:

- a API `POST /api/reports/generate` agora depende dessas variaveis para acionar o worker Python
- a API `POST /api/reports/schedule` depende de `REPORT_SCHEDULER_SECRET`
- a API `POST /api/reports/recover` pode usar o mesmo segredo para recover automatico
- a API `POST /api/social/publish` pode usar `SOCIAL_PUBLISHER_SECRET` para rotina automatizada de publicacao
- a API `POST /api/social/metrics` pode usar `SOCIAL_METRICS_SECRET` para rotina automatizada de sincronizacao
- o scheduler administrativo depende de `SUPABASE_SERVICE_ROLE_KEY` para operar sem sessao de usuario
- notificacoes operacionais externas dependem de `OPERATIONAL_WEBHOOK_URL` ou `SLACK_WEBHOOK_URL`
- emails transacionais do worker dependem de `RESEND_API_KEY` e `EMAIL_FROM`
- o link do email de relatorio depende de `APP_BASE_URL` ou equivalente
- os resumos de scheduler e recover tambem passam a depender do webhook operacional configurado
- a publicacao social real depende das credenciais do LinkedIn e/ou Instagram configuradas
- o canal de WhatsApp via webhook depende de `WHATSAPP_WEBHOOK_SECRET`
- a fila de saida do WhatsApp depende de `WHATSAPP_OUTBOUND_WEBHOOK_URL`

## 2. Variaveis de ambiente do worker Python

Configurar no ambiente onde o worker rodar:

- `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PYTHON_WORKER_SECRET`

Observacao:

- o worker precisa de `SUPABASE_SERVICE_ROLE_KEY` para escrever em `reports`, `report_files` e `billing_log`

## 3. Deploy do worker

Ainda precisa ser feito manualmente:

- subir o `worker_server.py` em Railway, Cloud Run ou servidor equivalente
- expor o endpoint `/generate`
- validar o endpoint `/health`

## 3.1. Cron externo para scheduler

Ainda precisa ser feito manualmente:

- configurar um cron externo para chamar `POST /api/reports/schedule`
- enviar o header `x-scheduler-secret: <REPORT_SCHEDULER_SECRET>`
- definir a frequencia operacional desejada
- opcionalmente configurar um segundo cron para chamar `POST /api/reports/recover`
- opcionalmente configurar um terceiro cron para chamar `POST /api/social/publish`
- opcionalmente configurar um quarto cron para chamar `POST /api/social/metrics`

Sugestao inicial:

- rodar 1 vez por dia em horario comercial
- rodar o recover automatico algumas vezes ao dia, por exemplo a cada 1h
- rodar o social publish em janela curta, por exemplo a cada 15 ou 30 minutos, se houver posts agendados
- rodar o social metrics em janela mais espaçada, por exemplo a cada 6h ou 12h

## 4. Bucket e policies do Storage

Validar manualmente no Supabase:

- bucket `reports` criado
- bucket configurado como privado
- policies de acesso do admin e do cliente funcionando

Sem isso:

- o upload pode falhar
- signed URLs podem nao refletir o comportamento esperado

## 5. Schema e migrations no banco

Confirmar manualmente que o banco de producao/homologacao tem:

- schema principal aplicado
- migration de `funnel_events` aplicada
- migration de `migrations/add_client_scheduler_settings.sql` aplicada
- migration de `migrations/create_report_jobs_table.sql` aplicada
- migration de `migrations/add_scheduler_policy_defaults.sql` aplicada
- migration de `migrations/add_scheduler_exceptions.sql` aplicada
- migration de `migrations/add_scheduler_calendars_and_periods.sql` aplicada
- migration de `migrations/create_social_publications_table.sql` aplicada
- migration de `migrations/add_social_publication_metrics.sql` aplicada
- migration de `migrations/add_social_publication_approvals.sql` aplicada
- migration de `migrations/add_report_retrospective_fields.sql` aplicada
- migration de `migrations/create_whatsapp_messages_table.sql` aplicada
- enums e tabelas realmente existentes

Itens criticos para a Fase 1 e Fase 2:

- `reports`
- `report_files`
- `billing_log`
- `clients`
- `client_niches`
- `profiles`
- `plans`
- `deep_dive_requests`

Itens criticos para a Camada 8:

- colunas de scheduler em `clients`
- constraints de janela horaria e preferencias do scheduler
- tabela `report_jobs` para historico dedicado da recorrencia
- defaults de scheduler em `plans`
- campos de pausa temporaria em `clients`
- datas bloqueadas e dias bloqueados do scheduler em `clients`
- blackout por periodo em `clients`
- tabela `scheduler_holidays` para feriados compartilhados
- tabela `social_publications` para aprovacao, agendamento e historico social
- colunas de metricas em `social_publications` para tentativas, erro e performance basica
- colunas de aprovacao em `social_publications` para trilha de revisao
- colunas retrospectivas em `reports` para hipoteses, itens retrospectivos e score

## 6. Conta admin real

Ainda precisa ser garantido manualmente:

- existencia de um usuario admin real no Supabase Auth
- `profiles.role = 'admin'` para esse usuario

## 7. Vinculo entre Auth e clients

Precisa ser validado manualmente no banco:

- se o signup atual esta gerando ou nao um `clients.user_id` coerente
- se o onboarding sempre encontra o cliente correto

Se isso nao estiver consistente:

- o dashboard do cliente quebra
- deep dive e relatorios ficam sem dono real

## 8. gTTS e conectividade

O audio MP3 depende de:

- biblioteca `gTTS`
- conectividade de rede no ambiente do worker

Se o ambiente bloquear esse acesso, o audio pode falhar mesmo com o restante funcionando.

## 9. Dependencias Python no ambiente de execucao

Garantir manualmente a instalacao das dependencias usadas pelo worker:

- `reportlab`
- `Pillow`
- `gTTS`
- `fastapi`
- `uvicorn`
- `supabase`
- `python-dotenv`

Observacao:

- durante a validacao local da Fase 2, o import de `reportlab` nao estava disponivel neste ambiente

## 10. Fontes e ambiente grafico do social media

Validar manualmente no ambiente do worker:

- fontes do Pillow disponiveis
- compatibilidade com o path de fontes usado pelo gerador

Observacao:

- em ambiente Linux isso tende a funcionar melhor
- em ambiente Windows/local pode haver diferenca de disponibilidade de fontes

## 11. Teste end-to-end real

Ainda precisa ser executado manualmente apos configurar ambiente:

1. criar ou escolher um cliente real no banco
2. gerar relatorio pelo painel admin
3. confirmar transicao `queued -> processing -> done`
4. validar uploads no bucket
5. abrir o dashboard do cliente
6. testar PDF, audio, WhatsApp e social pack

## 12. Observabilidade minima

Recomendado configurar manualmente:

- logs do worker
- logs da web
- alertas simples de erro de geracao
- validar recebimento dos webhooks operacionais de scheduler, recover e falha de worker
- validar email transacional real de sucesso e alerta de falha

Sem isso, o diagnostico de falhas operacionais fica caro.

## 13. Decisoes de negocio ainda abertas

Ainda precisam de definicao manual:

- frequencia real por plano no scheduler
- se o social pack sera sempre gerado ou condicionado ao plano
- se billing conta tentativa ou apenas sucesso
- se deep dive entra no limite do plano ou nao

## 14. Proxima camada de qualidade

Mesmo com Fase 1 pronta, ainda falta manualmente decidir:

- qual criterio de qualidade minima para um relatorio ser considerado entregavel
- quais fontes ou sinais de mercado devem ser priorizados
- como a equipe vai revisar ou aprovar casos sensiveis

## 15. Internacionalizacao operacional

Ainda precisa ser definido ou validado manualmente:

- quais idiomas alem de `pt-BR` e `en-US` serao oficialmente suportados no produto
- qual deve ser o idioma padrao para clientes legados sem preferencia explicita
- quais trechos do relatorio exigem revisao humana antes de serem entregues em ingles
- se emails, WhatsApp e social pack devem sempre seguir `preferred_language` ou permitir override operacional
- glossario oficial de termos do negocio em ingles para evitar inconsistencias de traducao
- se o time quer uma rodada de QA editorial nos PDFs e no social pack em ingles antes do primeiro cliente externo

## 16. Social publishing operacional

Ainda precisa ser definido ou configurado manualmente:

- qual rede entra primeiro em producao: `Instagram`, `LinkedIn` ou ambas
- credenciais reais e permissoes da API da rede escolhida
- conta ou pagina oficial por cliente ou por operacao
- politica de aprovacao antes de publicar automaticamente
- formato minimo de caption por rede
- se a publicacao sera manual-assistida ou automatica apos `approved`
- regra de tratamento para falha de postagem e reenvio
- se o LinkedIn vai publicar inicialmente apenas texto ou se vamos evoluir para upload nativo de imagem na API
- validar que os assets do bucket privado continuam acessiveis ao Instagram durante a janela da signed URL
- se as metricas de performance serao alimentadas manualmente pela operacao ou sincronizadas automaticamente depois
- se `SOCIAL_REQUIRE_SECOND_REVIEW` vai ficar ativo por padrao em producao
- se a segunda aprovacao precisa obrigatoriamente ser de outra pessoa, como esta no fluxo atual
- revisar se o score oficial deve pesar mais clique, alcance ou interacao dependendo do objetivo comercial
- validar em ambiente real quais metricas o LinkedIn entrega de forma consistente para o tipo de post usado

## 17. Retrospectiva dos relatorios

Ainda precisa ser definido ou validado manualmente:

- qual regra de negocio define um insight como `confirmed`, `watching`, `pending` ou `rejected`
- quantos relatorios anteriores devem entrar oficialmente na comparacao em producao
- se a retrospectiva vai comparar apenas com relatorios anteriores ou tambem com sinais externos
- como a equipe vai revisar hipoteses antes de expor isso ao cliente final
- quais tipos de recomendacao merecem pesos de confianca diferentes
- se o score retrospectivo deve ter pesos diferentes por cliente, plano ou tipo de insight
- qual deve ser o piso e o teto oficiais da confianca calibrada no produto
- se a confianca vai alterar prioridade visual, CTA comercial ou apenas analise interna
- quais sinais operacionais internos devem pesar mais: performance social, deep dive, downloads ou consumo de audio
- quais fontes externas de mercado entrarao na proxima fase de confirmacao das hipoteses
- quem no time pode aprovar, sinalizar ou pedir ajuste em hipoteses sensiveis no fluxo admin
- se hipoteses com `flagged` devem ser ocultadas automaticamente do cliente em uma fase futura

## 18. Inteligencia externa

Ainda precisa ser definido ou configurado manualmente:

- aplicar a migration `migrations/add_report_external_sources.sql`
- aplicar a migration `migrations/add_report_external_summary.sql`
- aplicar a migration `migrations/add_report_external_metrics.sql`
- configurar `GUILDS_EXTERNAL_FEED_URLS` com feeds realmente relevantes para o negocio
- opcionalmente configurar `GUILDS_EXTERNAL_FEED_MAP` para curadoria por setor ou nicho
- decidir quais fontes entram oficialmente no produto e quais ficam apenas em teste
- validar politicas editoriais para exibir links externos ao cliente final
- decidir se a proxima etapa usa apenas RSS ou tambem LLM / pesquisa estruturada
- se a sintese LLM sera ativada, configurar `GUILDS_EXTERNAL_LLM_ENABLED`, `ANTHROPIC_API_KEY` e opcionalmente `GUILDS_EXTERNAL_LLM_MODEL`

## 19. WhatsApp conversacional

Ainda precisa ser definido ou configurado manualmente:

- aplicar a migration `migrations/create_whatsapp_messages_table.sql`
- escolher o provedor real de WhatsApp
- mapear o formato real do webhook do provedor para `POST /api/whatsapp/webhook`
- configurar `WHATSAPP_WEBHOOK_SECRET`
- mapear o formato de envio do provedor para `POST /api/whatsapp/process`
- configurar `WHATSAPP_OUTBOUND_WEBHOOK_URL`
- configurar `WHATSAPP_PROCESS_SECRET`
- decidir se o envio real vai sair por fila interna, cron ou worker dedicado
- decidir quais intents devem responder automaticamente em producao
- definir quais comandos entram primeiro no canal:
  - resumo
  - audio
  - pdf
  - deep dive
- decidir se respostas recebidas no WhatsApp vao criar automacoes reais ou ficar apenas como fila assistida no inicio
- validar o formato final das respostas com links assinados e a janela de expiracao desses links
- decidir se a automacao do WhatsApp vai responder imediatamente ao cliente ou depender de moderacao humana em alguns intents
- revisar os textos operacionais dos comandos `status`, `reenviar` e confirmacao de recebimento antes de producao
