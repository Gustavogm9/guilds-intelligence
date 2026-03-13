# Fase 41 Executada - 2026-03-11

## Camada

Camada 14 - Inteligencia Externa de Verdade

## Objetivo desta entrega

Aumentar a rastreabilidade dos insights externos e medir melhor o comportamento da camada de enriquecimento.

## O que foi entregue

- propagacao de origem do insight para as hipoteses:
  - `source_type`
  - `source_name`
  - `source_url`
  - `source_relevance`
- metricas externas persistidas em `reports`:
  - `external_feeds_considered`
  - `external_llm_used`
  - `external_estimated_cost_usd`
- detalhe do relatorio exibindo essas metricas e links de origem
- migration versionada para as novas colunas

## Arquivos principais

- `engine/external_intelligence.py`
- `engine/gerar_relatorio_cliente.py`
- `engine/supabase_worker.py`
- `migrations/add_report_external_metrics.sql`
- `web/src/app/dashboard/reports/[id]/page.tsx`
- `docs/ROADMAP_EXECUCAO_MVP.md`
- `docs/PENDENCIAS_MANUAIS_2026-03-11.md`

## Validacao executada

- `python -m py_compile worker_server.py engine/supabase_worker.py engine/gerar_relatorio_cliente.py engine/gerar_social_media.py engine/external_intelligence.py`
- `npm run lint`
- `npm run build`

## Resultado

A camada externa ficou mais auditavel, tanto do lado do conteudo quanto do custo e da origem, o que prepara bem a proxima evolucao de qualidade.
