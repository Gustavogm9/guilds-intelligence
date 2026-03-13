# Remediacao da Auditoria de Schema - 2026-03-12

## Achado confirmado

O worker em `engine/supabase_worker.py` grava campos retrospectivos e externos em `public.reports`, mas a migration retrospectiva referenciada na documentacao nao existia no repositorio.

## Impacto operacional

Sem essas colunas no banco real, a finalizacao do relatorio pode falhar no Supabase e marcar a geracao como `error`, mesmo com frontend e worker compilando normalmente.

## Arquivos criados ou atualizados nesta remediacao

- `migrations/add_report_retrospective_fields.sql`
- `docs/SCHEMA_COMPATIBILITY_MATRIX_2026-03-12.md`
- `docs/PILOT_READINESS_CHECKLIST_2026-03-12.md`
- `docs/PENDENCIAS_MANUAIS_2026-03-11.md`
- `docs/ROADMAP_EXECUCAO_MVP.md`
- `DATABASE_SCHEMA.sql`

## Resultado esperado apos aplicar migrations

- `public.reports` passa a aceitar os campos retrospectivos e externos usados pelo codigo
- a trilha de schema deixa de depender de referencia fantasma em documentacao
- a equipe ganha uma matriz explicita para validar drift entre codigo e banco

## Proximos passos para homologacao

1. aplicar schema base e migrations em um banco limpo
2. confirmar as colunas de `reports` no banco
3. executar um relatorio end-to-end real
4. validar dashboard do cliente, storage e notificacoes
