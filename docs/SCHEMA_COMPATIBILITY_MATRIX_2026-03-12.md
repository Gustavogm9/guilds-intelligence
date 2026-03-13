# Matriz de Compatibilidade de Schema - 2026-03-12

## Objetivo

Ser a referencia rapida entre:

- campos e tabelas usados pelo codigo
- migration que cria cada item
- status atual no repositorio

Observacao:

- `DATABASE_SCHEMA.sql` continua sendo o baseline documental
- o estado operacional real depende da aplicacao das migrations
- o status abaixo foi avaliado contra o repositorio, nao contra um banco de producao ja validado

| Entidade | Campo ou tabela usado pelo codigo | Arquivo que usa | Migration que cria | Status atual |
| --- | --- | --- | --- | --- |
| `reports` | `hypotheses` | `engine/supabase_worker.py` | `migrations/add_report_retrospective_fields.sql` | `precisa validar em producao` |
| `reports` | `retrospective_items` | `engine/supabase_worker.py` | `migrations/add_report_retrospective_fields.sql` | `precisa validar em producao` |
| `reports` | `retrospective_summary` | `engine/supabase_worker.py` | `migrations/add_report_retrospective_fields.sql` | `precisa validar em producao` |
| `reports` | `retrospective_score` | `engine/supabase_worker.py` | `migrations/add_report_retrospective_fields.sql` | `precisa validar em producao` |
| `reports` | `external_sources` | `engine/supabase_worker.py` | `migrations/add_report_external_sources.sql` | `precisa validar em producao` |
| `reports` | `external_signal_count` | `engine/supabase_worker.py` | `migrations/add_report_external_sources.sql` | `precisa validar em producao` |
| `reports` | `external_signal_summary` | `engine/supabase_worker.py` | `migrations/add_report_external_summary.sql` | `precisa validar em producao` |
| `reports` | `external_intelligence_mode` | `engine/supabase_worker.py` | `migrations/add_report_external_summary.sql` | `precisa validar em producao` |
| `reports` | `external_feeds_considered` | `engine/supabase_worker.py` | `migrations/add_report_external_metrics.sql` | `precisa validar em producao` |
| `reports` | `external_llm_used` | `engine/supabase_worker.py` | `migrations/add_report_external_metrics.sql` | `precisa validar em producao` |
| `reports` | `external_estimated_cost_usd` | `engine/supabase_worker.py` | `migrations/add_report_external_metrics.sql` | `precisa validar em producao` |
| `report_jobs` | tabela de historico de jobs | `web/src/lib/report-generation.ts` | `migrations/create_report_jobs_table.sql` | `precisa validar em producao` |
| `social_publications` | tabela de aprovacao, agendamento e metricas | `web/src/lib/social-publishing.ts` | `migrations/create_social_publications_table.sql` | `precisa validar em producao` |
| `whatsapp_messages` | tabela do canal conversacional | `web/src/lib/whatsapp.ts` | `migrations/create_whatsapp_messages_table.sql` | `precisa validar em producao` |
| `clients` | colunas de scheduler por cliente | `web/src/lib/scheduler.ts` | `migrations/add_client_scheduler_settings.sql` | `precisa validar em producao` |
| `clients` | excecoes, bloqueios e blackout do scheduler | `web/src/lib/scheduler.ts` | `migrations/add_scheduler_exceptions.sql` e `migrations/add_scheduler_calendars_and_periods.sql` | `precisa validar em producao` |
| `plans` | defaults de scheduler por plano | `web/src/lib/scheduler.ts` | `migrations/add_scheduler_policy_defaults.sql` | `precisa validar em producao` |

## Leitura rapida

- Nao ha mais referencia a migration retrospectiva faltando no repositorio
- Ainda e obrigatorio validar a aplicacao dessas migrations no banco real antes de qualquer piloto
- Se um item acima nao existir no banco, o worker e/ou o admin podem quebrar mesmo com `lint`, `build` e `py_compile` passando
