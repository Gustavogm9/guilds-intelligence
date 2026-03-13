# Fase 13 Executada - 2026-03-11

## Escopo

Terceira entrega da Camada 8 - Scheduler de Producao.

Objetivo desta etapa:

- formalizar politica recorrente por plano
- permitir pausa temporaria por cliente
- reduzir a necessidade de sobrescrever configuracoes cliente a cliente

## Entregas realizadas

### 1. Fallback de politica a partir do plano

Arquivo principal:

- `web/src/lib/scheduler.ts`

Foi implementado:

- timezone padrao do plano
- janela padrao do plano
- restricao padrao a dias uteis
- dia semanal padrao
- dia mensal padrao

Quando o cliente nao define override proprio, o scheduler agora usa a politica do plano.

### 2. Pausa temporaria por cliente

Arquivos principais:

- `web/src/lib/scheduler.ts`
- `web/src/app/admin/clients/[id]/page.tsx`

Foi implementado:

- `scheduler_paused_until`
- `scheduler_pause_reason`
- bloqueio temporario do scheduler sem desativacao definitiva
- formulario admin para editar a pausa diretamente no detalhe do cliente

### 3. Visibilidade da politica no admin

Arquivo principal:

- `web/src/app/admin/plans/page.tsx`

Foi implementado:

- exibicao da politica recorrente padrao por plano
- leitura operacional dos defaults que afetam a recorrencia

### 4. Migration do banco

Arquivo principal:

- `migrations/add_scheduler_policy_defaults.sql`

Foi adicionado:

- defaults de scheduler em `plans`
- campos de pausa temporaria em `clients`
- constraints de validacao para a politica recorrente

## Resultado de produto

Com esta entrega, a Camada 8 ganha um desenho mais maduro:

- o plano passa a carregar politica padrao
- o cliente pode sobrescrever ou pausar temporariamente
- a operacao consegue administrar excecoes sem quebrar a regra global

## Validacao executada

### Web

- `npm run lint` -> OK
- `npm run build` -> OK

## Pendencia manual importante

Antes de usar essa etapa em ambiente real, precisa aplicar:

- `migrations/add_scheduler_policy_defaults.sql`

Sem isso, o codigo continua funcional apenas com os campos antigos, mas sem o fallback por plano e sem a pausa temporaria persistida no banco.

## Documentacao atualizada

- `docs/ROADMAP_EXECUCAO_MVP.md`
- `docs/PENDENCIAS_MANUAIS_2026-03-11.md`
- `docs/FASE_13_EXECUTADA_2026-03-11.md`

## Leitura final

A Camada 8 esta mais proxima de fechamento.

O proximo passo mais forte dentro dela e evoluir excecoes temporarias e janelas sofisticadas, por exemplo:

1. feriados
2. blackout windows
3. regras especiais por cliente VIP
