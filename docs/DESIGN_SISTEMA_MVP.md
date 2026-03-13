# Design de Sistema - MVP SaaS

## Objetivo

Definir o desenho minimo correto para o `ClientIntelligence` operar como SaaS B2B funcional, com o menor caminho entre o estado atual e um MVP vendavel.

## Principios

1. Fechar a linha principal antes de expandir modulos secundarios.
2. Usar o Supabase como source of truth para usuarios, clientes, relatorios e arquivos.
3. Deixar o Python responsavel pela geracao, nao pela orquestracao comercial.
4. Reduzir duplicacao de regras entre front-end, API e scripts.
5. Tratar relatorio como um job com estados claros.

## Linha Principal do Produto

O MVP precisa fechar este fluxo:

1. Lead entra pela landing
2. Faz signup
3. Ganha um registro `client` associado ao `auth.user`
4. Faz onboarding
5. Admin ou scheduler dispara geracao
6. Worker Python processa
7. Arquivos sobem para Storage
8. Dashboard cliente entrega os artefatos reais

Tudo fora dessa linha e secundario para o MVP.

## Dominios do Sistema

### 1. Acquisition

Responsabilidade:

- landing
- captura de lead
- tracking de conversao

Entradas:

- nome
- empresa
- email
- telefone
- plano de interesse

Saidas:

- lead salvo
- evento de funil salvo
- redirecionamento para signup

### 2. Identity and Onboarding

Responsabilidade:

- auth
- criacao de profile
- associacao de client com user
- enriquecimento do contexto de negocio

Entradas:

- signup do usuario
- callback de autenticacao
- formulario de onboarding

Saidas:

- `profiles`
- `clients.user_id`
- dados de negocio preenchidos

### 3. Report Orchestration

Responsabilidade:

- validar permissao
- validar limite do plano
- criar job de relatorio
- chamar worker
- monitorar status

Estados do relatorio:

- `queued`
- `processing`
- `done`
- `error`

### 4. Content Generation

Responsabilidade:

- ler contexto do cliente
- montar estrutura de inteligencia
- gerar artefatos
- subir arquivos
- atualizar metadados

Saidas esperadas:

- `reports`
- `report_files`
- arquivos em Storage
- `billing_log`

### 5. Delivery and Retention

Responsabilidade:

- dashboard cliente
- downloads
- audio
- historico
- deep dive
- operacao admin

## Desenho Recomendado

### Front-end

O front-end deve ter papel de:

- entrada de dados
- autenticacao
- leitura de estado
- consumo dos artefatos

O front-end nao deve:

- montar regra de billing complexa
- tentar inferir processo de geracao
- duplicar regra do worker

### API

A API Next.js deve ser fina, com foco em:

- validar identidade e role
- criar job
- chamar worker
- responder status

### Worker Python

O worker deve ser o executor do relatorio.

Responsabilidades:

- ler cliente e nichos
- gerar inteligencia
- gerar artefatos
- subir arquivos
- atualizar status

Nao deve ser responsabilidade do worker:

- login do usuario
- gestao de funil comercial
- roteamento de UI

## Contrato Minimo do Worker

Entrada:

```json
{
  "client_id": "uuid-do-cliente",
  "report_id": "uuid-do-relatorio"
}
```

Saida imediata:

```json
{
  "status": "queued"
}
```

Efeitos assincronos:

- `reports.status = processing`
- geracao de artefatos
- upload de arquivos
- criacao de `report_files`
- `reports.status = done` ou `error`

## Contrato Minimo de Dados

### `clients`

Deve ser a fonte primaria do contexto do cliente.

Campos obrigatorios para MVP:

- `id`
- `user_id`
- `plan_id`
- `company_name`
- `contact_name`
- `contact_email`
- `industry`
- `products_services`
- `target_audience`
- `goals_2026`
- `pain_points`
- `raw_onboarding_text`

### `reports`

Campos minimos relevantes:

- `id`
- `client_id`
- `status`
- `title`
- `summary`
- `insights_count`
- `niches_covered`
- `created_at`
- `completed_at`

### `report_files`

Campos minimos:

- `report_id`
- `file_type`
- `storage_path`

## Source of Truth

### Deve ficar no Supabase

- usuarios
- perfis
- clientes
- relatorios
- billing
- deep dives
- portfolio persistido
- arquivos e metadados

### Pode continuar local por enquanto

- templates visuais
- assets de geracao
- scripts Python

### Nao deve continuar local no medio prazo

- `profile.json` como fonte principal de cliente
- historico de relatorios salvo apenas no filesystem

## Riscos de Arquitetura

### Risco 1: duas fontes de verdade para cliente

Hoje existe `profile.json` local e `clients` no Supabase.

Decisao recomendada:

- o Supabase deve virar a fonte oficial
- os arquivos locais devem ser apenas cache ou artefato de trabalho

### Risco 2: camada web entregar promessa sem ativo real

A UI ja sugere uma plataforma pronta.

Decisao recomendada:

- so expor no dashboard o que realmente puder ser consumido

### Risco 3: evoluir features antes de consolidar o core

Rotas como portfolio, billing e outros modulos sao importantes, mas nao antes do core funcionar.

Decisao recomendada:

- fechar o fluxo de geracao primeiro

## Decisao de Produto para MVP

Escopo recomendado para a primeira versao vendavel:

- landing
- signup
- onboarding
- dashboard cliente
- dashboard admin basico
- gerar 1 relatorio real
- PDF + audio + WhatsApp + social pack
- historico de relatorios

Escopo que pode esperar:

- editor visual completo de portfolio
- billing sofisticado
- export CSV
- email transacional completo
- analytics avancado
- multiplos clientes por conta no plano Studio

## Criterios de Pronto do MVP

O MVP pode ser considerado pronto quando:

1. `npm run build` passa
2. admin consegue gerar relatorio de um cliente pelo painel
3. worker cria artefatos reais e faz upload
4. cliente loga e acessa o relatorio real no dashboard
5. relatorio mostra links reais de download
6. o onboarding influencia o conteudo do relatorio
7. o uso e o billing ficam rastreaveis no banco
