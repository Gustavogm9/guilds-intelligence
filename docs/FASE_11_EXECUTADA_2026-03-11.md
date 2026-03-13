# Fase 11 Executada - 2026-03-11

## Escopo

Primeira entrega da Camada 8 - Scheduler de Producao.

Objetivo desta etapa:

- tirar o scheduler do modo puramente global
- adicionar configuracao recorrente por cliente
- fazer a API de scheduler respeitar regras reais antes de enfileirar jobs

## Entregas realizadas

### 1. Regras de scheduler por cliente

Arquivos principais:

- `web/src/lib/scheduler.ts`
- `web/src/app/api/reports/schedule/route.ts`

Foi implementado:

- avaliacao por timezone do cliente
- janela horaria de envio
- restricao opcional a dias uteis
- dia preferido da semana
- dia preferido do mes
- desativacao individual do scheduler por cliente

### 2. Tela administrativa para configuracao recorrente

Arquivo principal:

- `web/src/app/admin/clients/[id]/page.tsx`

Foi implementado:

- card com resumo do scheduler atual
- formulario para editar configuracao recorrente do cliente
- persistencia server-side com revalidacao da pagina

### 3. Cadastro administrativo com defaults de scheduler

Arquivo principal:

- `web/src/app/admin/clients/new/page.tsx`

Foi implementado:

- configuracao inicial de timezone
- janela padrao de envio
- opcao de restringir a dias uteis

### 4. Migration versionada para o banco

Arquivo principal:

- `migrations/add_client_scheduler_settings.sql`

Foi adicionado:

- campos de scheduler na tabela `clients`
- constraints de validacao
- indice para clientes ativos no scheduler

## Resultado de produto

Com esta entrega, o scheduler passa a respeitar mais o contexto operacional de cada cliente e fica menos dependente de uma unica regra global.

Isso melhora especialmente:

- previsibilidade da geracao recorrente
- controle operacional do time admin
- preparacao para a proxima etapa da Camada 8

## Validacao executada

### Web

- `npm run lint` -> OK
- `npm run build` -> OK

## Pendencia manual importante

Antes de usar essa camada em ambiente real, precisa aplicar:

- `migrations/add_client_scheduler_settings.sql`

Sem isso, a aplicacao fica pronta em codigo, mas o banco nao tera os campos necessarios para a configuracao por cliente.

## Documentacao atualizada

- `docs/ROADMAP_EXECUCAO_MVP.md`
- `docs/PENDENCIAS_MANUAIS_2026-03-11.md`
- `docs/FASE_11_EXECUTADA_2026-03-11.md`

## Leitura final

A Camada 8 agora entrou em andamento de verdade.

O proximo passo mais forte dentro dela e separar melhor a esteira recorrente da esteira sob demanda e criar historico dedicado de execucao.
