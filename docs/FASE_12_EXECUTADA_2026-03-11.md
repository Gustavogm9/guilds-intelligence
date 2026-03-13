# Fase 12 Executada - 2026-03-11

## Escopo

Segunda entrega da Camada 8 - Scheduler de Producao.

Objetivo desta etapa:

- separar recorrencia, sob demanda e retry em historico proprio
- reduzir a dependencia de `reports` e `funnel_events` para auditoria operacional

## Entregas realizadas

### 1. Job table dedicada na orquestracao

Arquivo principal:

- `web/src/lib/report-generation.ts`

Foi implementado:

- criacao de jobs para geracao sob demanda
- criacao de jobs para retry
- atualizacao de status do job quando o worker e acionado
- registro de jobs rejeitados por limite mensal
- suporte a metadata de origem e contexto da tentativa

### 2. Scheduler registrando jobs pulados e jobs enfileirados

Arquivo principal:

- `web/src/app/api/reports/schedule/route.ts`

Foi implementado:

- job dedicado quando o scheduler pula cliente por janela
- job dedicado quando pula por capacidade mensal
- job dedicado quando pula por cadencia
- metadata com timezone, janela e contexto da decisao

### 3. Fluxos admin e retry alinhados

Arquivos principais:

- `web/src/app/api/reports/generate/route.ts`
- `web/src/app/api/reports/retry/route.ts`

Foi implementado:

- persistencia do usuario que iniciou a acao
- diferenciacao entre disparo admin e retry admin

### 4. Visualizacao do historico de jobs

Arquivo principal:

- `web/src/app/admin/reports/page.tsx`

Foi implementado:

- card com historico recente de jobs
- separacao visivel entre `on_demand`, `recurring` e `retry`
- exibicao de status, origem e motivo

### 5. Migration do banco

Arquivo principal:

- `migrations/create_report_jobs_table.sql`

Foi adicionado:

- tabela `report_jobs`
- indices principais
- RLS para operacao admin

## Resultado de produto

Com esta entrega, a Camada 8 sobe de maturidade porque a operacao passa a conseguir responder melhor:

- qual job foi tentado
- por que ele rodou
- por que ele foi pulado
- se ele veio de recorrencia, admin ou retry

## Validacao executada

### Web

- `npm run lint` -> OK
- `npm run build` -> OK

## Pendencia manual importante

Antes de usar essa camada completa em ambiente real, precisa aplicar:

- `migrations/create_report_jobs_table.sql`

Sem isso, a aplicacao continua funcionando, mas o historico dedicado de jobs nao fica persistido no banco.

## Documentacao atualizada

- `docs/ROADMAP_EXECUCAO_MVP.md`
- `docs/PENDENCIAS_MANUAIS_2026-03-11.md`
- `docs/FASE_12_EXECUTADA_2026-03-11.md`

## Leitura final

A Camada 8 agora ja tem dois pilares importantes:

1. configuracao recorrente por cliente
2. historico dedicado de execucao

O proximo passo natural dentro dela e formalizar politica por plano e adicionar excecoes temporarias ou janelas mais sofisticadas.
