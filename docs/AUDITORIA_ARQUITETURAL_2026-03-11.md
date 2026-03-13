# Auditoria Arquitetural - ClientIntelligence

Data: 2026-03-11

## Objetivo

Este documento consolida a avaliacao tecnica e de produto do projeto `ClientIntelligence`, com foco em:

- estado atual da implementacao
- aderencia entre codigo e visao de negocio
- riscos tecnicos e arquiteturais
- prioridades para transformar a base atual em um MVP SaaS funcional

## Resumo Executivo

O projeto tem uma tese de produto forte e um posicionamento muito claro: entregar inteligencia de mercado personalizada para clientes B2B em multiplos formatos.

Hoje, a base se divide em tres blocos:

1. `engine/`: geradores Python de PDF, audio, WhatsApp e social media
2. `web/`: aplicacao Next.js com auth, onboarding, dashboard e admin inicial
3. `DATABASE_SCHEMA.sql` + documentacao: desenho SaaS mais avancado do que a implementacao atual

Diagnostico geral:

- negocio: forte
- modelagem de dados: boa
- front-end: parcialmente funcional
- orquestracao backend: incompleta
- geracao de inteligencia real: ainda em fase de template
- prontidao de producao: nao pronta

## O Que Ja Existe de Valor Real

### 1. Motor de entrega multimodal

Os scripts em `engine/` ja geram artefatos tangiveis:

- PDF completo
- PDF executivo
- TXT para WhatsApp
- MP3
- cards e stories para social media

Isso reduz risco de produto, porque o formato final ja esta provado.

### 2. Estrutura de onboarding e consumo

A aplicacao web ja possui:

- landing page comercial
- signup e login
- onboarding guiado
- dashboard do cliente
- dashboard admin
- tracking inicial de funil

Isso mostra que a jornada comercial esta parcialmente montada.

### 3. Modelagem SaaS madura

O schema contempla os principais dominios:

- `profiles`
- `plans`
- `clients`
- `client_niches`
- `reports`
- `report_files`
- `deep_dive_requests`
- `billing_log`
- `portfolio_products`
- `funnel_events`

Para um MVP, a modelagem esta acima da media.

## Diagnostico por Camada

### Camada 1: Produto e negocio

Estado:

- muito bem definido
- coerente entre documentacao, schema e proposta comercial
- bom alinhamento entre formatos, planos e uso recorrente

Pontos fortes:

- produto vende clareza acionavel, nao apenas conteudo
- multiplos formatos aumentam perceived value
- onboarding rico favorece personalizacao
- deep dive e social pack aumentam expansao de ticket

Riscos:

- o valor central depende da qualidade da sintese, nao apenas da formatacao
- se a inteligencia continuar template, o produto perde credibilidade rapido
- ha risco de expandir demais antes de estabilizar o fluxo principal

### Camada 2: Front-end

Estado:

- funcional, mas inconsistente
- ha telas reais conectadas ao Supabase
- ha partes ainda sem fechamento operacional

Pontos fortes:

- App Router bem separado por area admin e cliente
- layouts por role
- onboarding com boa captura de contexto
- tracking de funil iniciado

Pontos fracos:

- `next build` falha porque existem `src/middleware.ts` e `src/proxy.ts` ao mesmo tempo
- ha links para rotas que nao existem
- ha paginas que prometem entrega de arquivos reais, mas ainda usam placeholders
- parte do fluxo usa dados reais e parte usa comportamento mockado

### Camada 3: API e orquestracao

Estado:

- incompleta
- principal gargalo para MVP

Pontos fortes:

- rotas simples e bem delimitadas
- auth via Supabase esta bem encaminhada
- billing e tracking ja foram considerados

Pontos fracos:

- a rota de geracao ainda nao chama o worker Python
- parte da regra de negocio esta duplicada ou distribuida entre frontend, API e documentacao
- falta uma camada de contrato clara para o ciclo `queued -> processing -> done`

### Camada 4: Python e geracao

Estado:

- forte em formatacao e saida
- fraca em inteligencia real

Pontos fortes:

- entrega multimodal ja funciona
- estrutura dos scripts e suficientemente clara para evolucao
- adaptacao para worker HTTP e viavel

Pontos fracos:

- `report_data` ainda e template
- dependencia atual do filesystem local
- pipeline ainda nao esta acoplada ao Supabase de ponta a ponta
- parte das fontes visuais pode falhar em ambiente Windows

### Camada 5: Dados e seguranca

Estado:

- boa base
- melhor que a implementacao que a consome

Pontos fortes:

- schema expressa bem o dominio
- RLS foi pensada desde o inicio
- billing, files e deep dive ja tem lugar definido

Pontos fracos:

- nem todas as queries parecem alinhadas com o schema atual
- parte da app assume relacionamentos que o schema nao expande diretamente
- ainda e preciso validar na pratica o vinculo entre signup, profile e client

## Achados Criticos

### Critico 1: O produto nao fecha o ciclo de geracao real

A plataforma cria registros de relatorio, mas nao dispara a geracao dos arquivos reais.

Impacto:

- o produto nao entrega o valor principal pelo fluxo web
- admin e cliente nao conseguem operar via plataforma completa

### Critico 2: O detalhe do relatorio ainda nao consome artefatos reais

O dashboard consulta `report_files`, mas ainda nao entrega downloads e players reais.

Impacto:

- a experiencia final do cliente ainda nao esta pronta
- storage e signed URLs ainda nao estao fechados no fluxo de uso

### Critico 3: O frontend nao esta buildando para producao

Conflito entre `middleware.ts` e `proxy.ts`.

Impacto:

- deploy de producao bloqueado

### Critico 4: Existem inconsistencias entre UI, API e schema

Exemplos:

- links admin para paginas ausentes
- `form POST` apontando para API que espera JSON
- consultas que presumem joins nao garantidos

Impacto:

- comportamento imprevisivel
- aumento de retrabalho

## Achados Importantes, Nao Criticos

### 1. Tracking ainda esta incompleto

Eventos previstos no tracking nao aparecem implementados em toda a jornada.

### 2. Billing esta mais pensado do que operacionalizado

O log existe, mas o fechamento de uso, cobranca e governanca admin ainda esta parcial.

### 3. Deep dive existe no cliente, mas nao esta fechado na operacao admin

Isso e uma oportunidade, mas ainda nao um modulo completo.

### 4. A documentacao esta na frente do sistema

Isso e positivo como visao, mas perigoso se a equipe comecar a tratar como funcionalidade pronta.

## Conclusao

O projeto esta mais perto de um MVP vendavel do que de um experimento, mas ainda nao chegou no ponto de operacao segura.

O caminho correto nao e ampliar escopo. O caminho correto e:

1. estabilizar a base
2. fechar a geracao end-to-end
3. conectar a entrega real no dashboard
4. substituir o conteudo template por inteligencia real

Quando essas quatro frentes forem resolvidas, o projeto deixa de ser uma boa promessa e passa a ser um produto SaaS inicial de verdade.
