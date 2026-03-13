# Roadmap de Execucao - Produto ClientIntelligence

## Objetivo

Manter um roadmap vivo, alinhado ao estado real do produto em 2026-03-11:

- o que ja foi entregue
- o que falta para operacao assistida de verdade
- o que entra na camada de escala

Este documento substitui o roadmap inicial de MVP puro e passa a refletir a maturidade atual do projeto.

---

## Resumo Executivo

Hoje o produto ja tem:

- base web estabilizada
- geracao end-to-end com worker Python
- entrega real de artefatos no dashboard
- camada de inteligencia contextual heuristica
- painel admin operacional
- billing e portfolio visiveis
- tracking de funil e de relatorios
- scheduler inicial
- health check, retry manual e recover automatico com backoff
- classificacao basica de falhas
- notificacao operacional via webhook
- email transacional basico a partir do worker
- telemetria basica de tempo e custo por job
- resumos operacionais de scheduler e recover
- painel de Ops com visibilidade de notificacoes enviadas e falhadas
- configuracao de scheduler por cliente na aplicacao
- historico dedicado de jobs de geracao
- politica recorrente com fallback por plano
- excecoes temporarias por cliente no scheduler
- politica do plano editavel pela aplicacao
- calendarios compartilhados e blackout por periodo
- internacionalizacao de plataforma e relatorios em `pt-BR` e `en-US`
- social publishing com aprovacao, agendamento, postagem e metricas
- camada retrospectiva de aprendizado dos relatorios
- inteligencia externa com RSS, curadoria, auditoria e suporte opcional a LLM
- camada forte de analytics e Revenue Ops

Hoje o produto ainda nao tem completamente fechado:

- canal conversacional e operacional por WhatsApp
- eventual aprovacao social pelo cliente final
- sofisticacao maior de score e coleta automatica em redes
- sinais externos mais amplos que RSS
- automacoes de escala e governanca de plataforma

Observacao executiva:

- o maior risco atual nao e mais de produto, e sim de consistencia entre schema, codigo e ambiente aplicado

---

## Fases Ja Entregues

### Fase 0 - Estabilizacao da Base

Status: concluida

Entregas-chave:

- lint e build corrigidos
- navegacao admin sem rotas quebradas
- middleware/proxy consolidados
- contratos basicos de API estabilizados

Documento relacionado:

- `docs/FASE_0_EXECUTADA_2026-03-11.md`

### Fase 1 - Geracao End-to-End

Status: concluida

Entregas-chave:

- worker Python HTTP
- `POST /api/reports/generate`
- upload para Supabase Storage
- `report_files`
- dashboard consumindo signed URLs reais

Documento relacionado:

- `docs/FASE_1_EXECUTADA_2026-03-11.md`

### Fase 2 - Inteligencia Contextual

Status: concluida

Entregas-chave:

- fim do placeholder puro
- motor heuristico baseado em onboarding e contexto do cliente
- top insights, alertas, oportunidades e recomendacoes Guilds

Documento relacionado:

- `docs/FASE_2_EXECUTADA_2026-03-11.md`

### Fase 3 - Operacao Admin

Status: concluida

Entregas-chave:

- dashboard admin executivo
- billing operacional
- portfolio operacional
- cadastro administrativo de clientes

Documento relacionado:

- `docs/FASE_3_EXECUTADA_2026-03-11.md`

### Fase 4 - Tracking e Scheduler Base

Status: concluida

Entregas-chave:

- tracking de onboarding, visualizacao e downloads
- helper compartilhado de geracao
- `POST /api/reports/schedule`
- base para cron externo

Documento relacionado:

- `docs/FASE_4_EXECUTADA_2026-03-11.md`

### Fase 5 - Observabilidade e Retry Manual

Status: concluida

Entregas-chave:

- tela de Ops
- health check do worker
- retry administrativo de relatorios com erro
- protecao contra billing duplicado

Documento relacionado:

- `docs/FASE_5_EXECUTADA_2026-03-11.md`

### Fase 6 - Recover Automatico e Alertas Ativos

Status: concluida

Entregas-chave:

- recover automatico com backoff
- limite de tentativas
- alertas ativos no painel
- base inicial de self-healing

Documento relacionado:

- `docs/FASE_6_EXECUTADA_2026-03-11.md`

### Fase 7 - Operacao Assistida

Status: concluida

Entregas-chave:

- classificacao basica de falhas
- webhook operacional
- painel de Ops com contexto melhor de scheduler e falhas
- email transacional basico de sucesso e falha via worker
- telemetria basica de job no worker e no painel
- resumo operacional de scheduler e recover com notificacao externa
- painel de Ops com metricas e eventos recentes de notificacao

Documento relacionado:

- `docs/FASE_7_EXECUTADA_2026-03-11.md`
- `docs/FASE_8_EXECUTADA_2026-03-11.md`
- `docs/FASE_9_EXECUTADA_2026-03-11.md`
- `docs/FASE_10_EXECUTADA_2026-03-11.md`

---

## Roadmap Atual

## Camada 7 - Operacao Assistida de Verdade

Prioridade: muito alta

Status atual: concluida

### Objetivo

Tirar o produto da categoria "operacao inicial robusta" e levar para "operacao assistida confiavel", com menos dependencia de acompanhamento manual constante.

### Backlog executado

1. Implementar notificacoes externas de falha e sucesso.
2. Classificar falhas por tipo.
3. Criar prioridade operacional de alertas.
4. Melhorar o painel de Ops com sinais de saude e contexto operacional.
5. Registrar custo e tempo de execucao por relatorio de forma inicial.

### Ja entregue nesta camada

- webhook operacional basico
- classificacao basica de falhas
- categoria e severidade nas falhas recentes
- tempo medio de processamento no painel
- ultima execucao sem erro do scheduler no painel
- notificacoes de sucesso e falha a partir do worker
- classificacao mais profunda por etapa do worker
- custo por job registrado de forma heuristica
- resumo operacional de scheduler e recover
- metricas de notificacao no painel de Ops

### Observacoes

- custo por job ainda e heuristico e pode ser refinado nas proximas camadas
- a operacao assistida esta fechada para MVP, mas ainda pode evoluir em qualidade de observabilidade

### Criterio de saida

- equipe recebe sinais ativos quando algo quebra
- falhas deixam de depender de observacao manual do painel
- operacao diaria fica mais previsivel

---

## Camada 8 - Scheduler de Producao

Prioridade: muito alta

Status atual: concluida

### Objetivo

Transformar a geracao recorrente em um sistema realmente previsivel por plano, cliente e janela operacional.

### Backlog recomendado

1. Formalizar politica de frequencia por plano.
2. Adicionar configuracao por cliente para:
   - ativo para scheduler
   - janela de envio
   - timezone
3. Evoluir o scheduler para respeitar:
   - dia util
   - horario desejado
   - excecoes temporarias
4. Separar:
   - relatorio recorrente
   - relatorio sob demanda
   - retry
5. Criar uma job table dedicada para historico de execucao.

### Ja entregue nesta camada

- configuracao por cliente para:
  - ativo para scheduler
  - timezone
  - janela de envio
  - dias uteis
  - dia preferido da semana
  - dia preferido do mes
- scheduler da API respeitando regras por cliente antes de enfileirar relatorios
- tela admin para editar a configuracao recorrente por cliente
- migration versionada para adicionar os campos do scheduler em `clients`
- job table dedicada para separar recorrencia, sob demanda e retry
- painel admin de relatorios exibindo historico recente de jobs
- fallback da politica recorrente a partir do plano
- pausa temporaria por cliente sem desativacao definitiva
- datas bloqueadas por cliente
- dias da semana bloqueados por cliente
- edicao administrativa completa dos defaults do plano
- feriados compartilhados gerenciaveis pela aplicacao
- blackout por periodo no cliente

### Criterio de saida

- geracao recorrente confiavel sem operacao manual
- auditar por que cada job rodou, falhou ou foi pulado

---

## Camada 9 - Entrega e Retencao

Prioridade: alta

Status atual: concluida

### Objetivo

Aumentar valor percebido e reduzir churn melhorando a entrega ao cliente.

### Backlog recomendado

1. Email transacional para:
   - relatorio pronto
   - deep dive entregue
   - falha de processamento interna
2. Realtime ou polling refinado para status do relatorio no dashboard.
3. Melhorar dashboard cliente com:
   - historico mais rico
   - recomendacoes em destaque
   - proximos passos
4. Fechar ciclo de `deep_dive_requests`:
   - solicitacao
   - fila admin
   - entrega
   - status visivel ao cliente
5. Instrumentar eventos de retencao:
   - retorno ao dashboard
   - consumo de audio
   - download do social pack
   - pedido de deep dive

### Ja entregue nesta camada

- dashboard cliente mais rico com historico recente, proximos passos e indicadores de deep dive
- lista de relatorios com status mais legivel e resumo curto
- pagina de relatorio com auto-refresh enquanto estiver processando
- tracking adicional de:
  - retorno ao dashboard
  - reproducao de audio
  - pedido de deep dive
- fluxo de deep dive com UX melhor e feedback de envio
- fila admin de deep dives com atualizacao de status e resposta operacional
- dashboard com auto-refresh quando houver fila ativa
- recomendacoes personalizadas baseadas em objetivos, dores e status da entrega
- inbox interna de novidades e entregas

### Criterio de saida

- cliente percebe continuidade de valor
- operacao tem sinais reais de engajamento e retencao

---

## Camada 10 - Internacionalizacao

Prioridade: alta

Status atual: concluida

### Objetivo

Preparar a plataforma para operar em mais de um idioma, com foco inicial em portugues e ingles, sem duplicar logica de negocio nem gerar inconsistencias entre UI e artefatos.

### Backlog recomendado

1. Definir estrategia de idioma para:
   - interface web
   - emails transacionais
   - relatorios
   - social pack
   - mensagens de WhatsApp
2. Adicionar preferencia de idioma por cliente.
3. Internacionalizar a interface com chaves e catalogos de traducao.
4. Adaptar o motor de geracao para produzir artefatos conforme o idioma do cliente.
5. Garantir fallback seguro:
   - idioma padrao da conta
   - idioma padrao do workspace
   - fallback para portugues quando faltar traducao
6. Revisar formatos sensiveis ao idioma:
   - datas
   - moeda
   - titulos
   - CTAs
   - emails

### Ja entregue nesta camada

- base de i18n leve em `web/src/lib/i18n.ts`
- helper publico de idioma em `web/src/lib/public-i18n.ts`
- suporte inicial a `pt-BR` e `en-US` com fallback seguro para portugues
- navegacao do dashboard do cliente internacionalizada
- dashboard, inbox, lista de relatorios, detalhe de relatorio e perfil internacionalizados
- deep dive internacionalizado no lado do cliente
- formatacao de datas e data/hora orientada ao idioma preferido do cliente
- landing internacionalizada com override por `?lang=`
- login, signup e onboarding internacionalizados
- fluxo publico preparado para carregar idioma desde a captacao ate a criacao da conta
- worker Python com emails transacionais sensiveis ao idioma do cliente
- titulo do relatorio persistido conforme idioma preferido do cliente
- geracao de WhatsApp TXT e audio MP3 sensivel a `preferred_language`
- camada heuristica principal do motor com sintese base em ingles para clientes `en-US`
- social pack alinhado ao idioma preferido do cliente
- copy, feed cards e stories do social pack localizados para `pt-BR` e `en-US`
- PDF completo com rotulos principais localizados para `pt-BR` e `en-US`
- PDF one-page com secoes principais localizadas para `pt-BR` e `en-US`
- header e footer dos PDFs coerentes com o idioma do cliente

### Criterio de saida

- usuario pode consumir o produto em portugues ou ingles
- relatorio, dashboard e emails ficam coerentes no mesmo idioma
- a operacao nao precisa manter fluxos separados por lingua

---

## Camada 11 - WhatsApp Conversacional

Prioridade: alta

Status atual: em andamento

### Objetivo

Transformar o WhatsApp no principal canal de entrega e conversa com o produto, permitindo nao so receber artefatos, mas tambem interagir com o sistema e com os relatorios no mesmo fluxo.

### Backlog recomendado

1. Definir integracao oficial de WhatsApp para:
   - envio de relatorios
   - envio de alertas de entrega
   - respostas do cliente
2. Criar uma camada conversacional para:
   - pedir resumo do ultimo relatorio
   - pedir aprofundamento de um insight
   - solicitar deep dive
   - confirmar recebimento
3. Registrar contexto da conversa no historico do cliente.
4. Permitir comandos operacionais simples:
   - reenviar relatorio
   - enviar audio
   - enviar one-page
5. Medir engajamento do canal:
   - abertura implicita
   - resposta
   - pedido de aprofundamento

### Ja entregue nesta camada

- modelagem inicial do canal com tabela dedicada de mensagens
- inbox do cliente preparada para exibir mensagens do WhatsApp
- area admin dedicada para fila operacional do canal
- endpoint seguro para ingestao de eventos via webhook
- endpoint administrativo para registrar mensagens de saida
- heuristica inicial de intencao em mensagens recebidas
- intents iniciais conectadas a acoes reais:
  - resumo
  - pdf
  - audio
  - deep dive
- criacao automatica de resposta operacional a partir de mensagens recebidas
- pedido de deep dive via WhatsApp criando item real na fila do produto
- processador de fila de saida para mensagens `outbound`
- endpoint pronto para cron ou execucao manual da outbox do WhatsApp
- comandos adicionais de conversa:
  - confirmacao de recebimento
  - consulta de status
  - reenvio do ultimo relatorio
- politica inicial de auto-resposta por intent
- modo `dry_run` para homologacao do canal antes do provedor real

### Criterio de saida

- cliente consegue receber e conversar com o sistema pelo mesmo canal
- WhatsApp vira um canal real de retencao e operacao, nao apenas um formato exportado

---

## Camada 12 - Social Publishing

Prioridade: media-alta

Status atual: concluida

### Objetivo

Conectar o produto diretamente com redes sociais para aprovar, agendar e postar os materiais gerados, reduzindo a distancia entre insight e distribuicao.

### Backlog recomendado

1. Definir integracoes prioritarias:
   - Instagram
   - LinkedIn
   - outras redes relevantes para o cliente
2. Criar fluxo de aprovacao:
   - rascunho
   - aprovado
   - rejeitado
   - publicado
3. Permitir agendamento de postagem.
4. Registrar historico de aprovacao e publicacao.
5. Medir performance basica do social pack publicado.

### Ja entregue nesta camada

- fila inicial de social publishing no admin
- criacao de rascunhos para Instagram e LinkedIn a partir de relatórios com social pack
- fluxo de aprovacao com status:
  - `draft`
  - `approved`
  - `rejected`
  - `scheduled`
  - `published`
  - `failed`
- campo de legenda, notas operacionais e agendamento
- historico inicial de publicacoes na aplicacao
- camada de integracao isolada para LinkedIn e Instagram
- endpoint administrativo e automatizavel para publicar itens aprovados ou agendados
- publicacao organica no LinkedIn via Posts API
- publicacao de imagem + legenda no Instagram via fluxo `/media` e `/media_publish`
- persistencia de `external_post_id` e falha operacional no historico social
- telemetria operacional de tentativas, ultimo erro e ultima tentativa de publicacao
- metricas basicas de social publishing na aplicacao:
  - impressions
  - reactions
  - comments
  - shares
  - clicks
- painel admin com resumo de publicacoes que ja possuem metricas registradas
- dupla checagem operacional com trilha de aprovacao em uma ou duas etapas
- bloqueio de publicacao ate cumprir a regra de aprovacao exigida
- trilha visivel de primeira aprovacao, segunda aprovacao e rejeicao
- resumo operacional de lote manual e automatizado via notificacao externa
- painel social com leitura de fila pronta para rodar e itens aguardando segunda revisao
- analytics comparativos por plataforma no painel social
- analytics comparativos por cliente no painel social
- score oficial de performance social persistido por publicacao
- endpoint de sincronizacao de metricas sociais publicado
- sync manual e automatizavel de metricas para itens publicados

### Proximo foco dentro da camada

1. conectar credenciais reais de redes sociais
2. avaliar se a proxima etapa de aprovacao sera por cliente final ou apenas interna
3. sofisticar o score com pesos por plataforma e objetivo do cliente
4. expandir a coleta automatica quando houver mais campos disponiveis nas APIs

### Criterio de saida

- o social pack deixa de ser apenas arquivo entregue
- a operacao consegue aprovar e postar a partir do proprio sistema

---

## Camada 13 - Aprendizado Retrospectivo dos Relatorios

Prioridade: alta

Status atual: concluida

### Objetivo

Evoluir o algoritmo para que cada novo relatorio tambem olhe para tras e diga onde as leituras anteriores acertaram, erraram ou ficaram inconclusivas.

### Backlog recomendado

1. Versionar hipoteses e recomendacoes emitidas em cada relatorio.
2. Criar uma secao retrospectiva no relatorio com:
   - o que se confirmou
   - o que nao se confirmou
   - o que ainda precisa de mais sinal
3. Medir acerto percebido por tema, nicho e recomendacao.
4. Alimentar o motor de geracao com esse historico para ajustar confianca futura.
5. Expor essa leitura retrospectiva no dashboard e no admin.

### Ja entregue nesta camada

- hipoteses iniciais geradas a partir dos principais insights do relatorio
- secao retrospectiva heuristica adicionada ao `report_data`
- persistencia de:
  - `hypotheses`
  - `retrospective_items`
  - `retrospective_summary`
  - `retrospective_score`
- detalhe do relatorio com bloco de leitura retrospectiva
- painel admin de relatorios exibindo score retrospectivo
- comparacao retrospectiva com ate 5 relatorios anteriores do mesmo cliente
- memoria de temas por titulo e tema para reaproveitar sinais historicos
- score retrospectivo recalculado a partir de status acumulado em vez de formula fixa
- confianca das hipoteses calibrada pelo historico retrospectivo recente
- metadado de motivo de confianca para auditoria futura do motor
- sinais operacionais internos conectados a retrospectiva:
  - performance social recente
  - demanda de deep dive
- retrospectiva e confianca agora consideram historico e evidencias operacionais
- detalhe do relatorio exibindo hipoteses, confianca, referencia historica e evidencia operacional
- admin de relatorios com leitura resumida de confianca media e status das hipoteses
- hipoteses agora carregam sensibilidade e necessidade de revisao humana
- fluxo admin para aprovar, sinalizar ou pedir ajuste em hipoteses sensiveis

### Criterio de saida

- o produto aprende com o proprio historico
- o cliente percebe evolucao de inteligencia, nao apenas repeticao de formato

---

## Camada 14 - Inteligencia Externa de Verdade

Prioridade: alta

Status atual: concluida

### Objetivo

Dar o salto de inteligencia contextual heuristica para inteligencia enriquecida por sinais externos e/ou LLM.

### Backlog recomendado

1. Definir pipeline de enriquecimento:
   - pesquisa web
   - curadoria de fontes
   - prompts estruturados
   - sintese final
2. Registrar confianca ou origem dos sinais usados.
3. Separar:
   - insight inferido do onboarding
   - insight apoiado por fonte externa
4. Versionar o formato de `report_data`.
5. Medir custo por camada da geracao.

### Criterio de saida

- relatorio combina contexto do cliente com sinais externos reais
- a qualidade percebida sobe de forma clara

### Ja entregue nesta camada

- base de inteligencia externa por feeds RSS configuraveis no worker
- filtro de relevancia por palavras-chave do cliente, nichos, objetivos e dores
- incorporacao de sinais externos no `top5_insights`
- persistencia de fontes externas em `reports.external_sources`
- detalhe do relatorio exibindo as fontes externas usadas
- curadoria opcional de feeds por segmento via configuracao de ambiente
- deduplicacao de sinais externos por titulo e origem
- sintese externa com fallback heuristico e suporte opcional a LLM
- persistencia de resumo externo e modo de sintese no relatorio
- hipoteses agora carregam rastreabilidade de origem do insight
- metricas da camada externa persistidas no relatorio:
  - feeds considerados
  - uso de LLM
  - custo externo estimado
- ranking externo agora prioriza alinhamento com objetivos do cliente
- deduplicacao externa agora reduz repeticao por tema, nao so por titulo
- sinais externos agora recebem classificacao tematica explicita
- detalhe do relatorio exibe tema e confianca tematica dos sinais externos
- admin de relatorios agora audita volume, tema, fonte, modo e custo da camada externa
- area admin dedicada para auditoria agregada de inteligencia externa

---

## Camada 15 - Dados, Analytics e Revenue Ops

Prioridade: media-alta

Status atual: concluida

### Objetivo

Transformar o produto tambem em uma maquina de aprendizado comercial.

### Backlog recomendado

1. Consolidar painel de:
   - MRR
   - uso por plano
   - taxa de onboarding
   - taxa de leitura do primeiro relatorio
2. Medir gargalos do funil:
   - lead -> signup
   - signup -> onboarding
   - onboarding -> primeiro relatorio visto
3. Medir operacao:
   - taxa de erro
   - tempo medio ate `done`
   - retries por periodo
4. Cruzar business:
   - cliente que mais consome
   - plano com maior pressao operacional
   - relatorios que mais levam a deep dive

### Criterio de saida

- produto passa a ensinar a operacao sobre vendas, uso e custo

### Ja entregue nesta camada

- area dedicada de `Revenue Ops` no admin
- leitura consolidada de:
  - MRR
  - ARR estimado
  - onboarding rate
  - first report view rate
  - clientes com deep dive
  - tempo medio ate `done`
- cruzamento por plano de:
  - receita
  - volume de relatorios
  - deep dives
  - custo externo
- ranking de clientes com maior consumo
- funil por plano com signup, onboarding e primeira ativacao
- leitura inicial de contas com maior chance de expansao
- leitura inicial de contas com risco operacional ou baixa ativacao
- leitura executiva dos maiores gargalos do funil por plano
- destaque do plano com maior pressao operacional por cliente ativo
- destaque do plano com maior custo externo medio por relatorio
- comparativo temporal simples entre os ultimos 30 dias e o periodo anterior
- fila de acao por conta com prioridade operacional e comercial
- recomendacao automatica de proxima acao por conta
- leitura de eficiencia economica e operacional por plano
- cohort simples de ativacao por mes de signup

### Criterio de saida

- produto passa a ensinar a operacao sobre vendas, uso e custo
- time ganha uma fila mais clara de decisao comercial e operacional

---

## Camada 16 - Plataforma de Escala

Prioridade: media

### Objetivo

Preparar o produto para crescer sem fragilizar a operacao.

### Backlog recomendado

1. Job table dedicada ou fila externa.
2. Dead-letter flow para jobs esgotados.
3. Idempotencia forte em toda a esteira.
4. Logs estruturados.
5. Ambientes separados de staging e producao com validacao mais segura.
6. Testes automatizados de regressao para:
   - generate
   - retry
   - recover
   - scheduler

### Criterio de saida

- produto fica pronto para volume maior com menos risco operacional

---

## Prioridade Recomendada Agora

### Agora

- Camada 11 - WhatsApp Conversacional
- Camada 16 - Plataforma de Escala

### Em seguida

- refinamentos de Social Publishing
- expansao da Inteligencia Externa

### Depois

- aprovacao social pelo cliente final
- sofisticacao da camada retrospectiva
- revenue intelligence mais avancada

### Horizonte continuo

- refinamentos de produto e automacao de engajamento

---

## Dependencias Manuais Atuais

O documento de referencia continua sendo:

- `docs/PENDENCIAS_MANUAIS_2026-03-11.md`

Itens mais criticos neste momento:

- deploy do worker online
- variaveis de ambiente completas
- `SUPABASE_SERVICE_ROLE_KEY`
- `REPORT_SCHEDULER_SECRET`
- cron externo para `POST /api/reports/schedule`
- cron opcional para `POST /api/reports/recover`
- validar a matriz de compatibilidade em `docs/SCHEMA_COMPATIBILITY_MATRIX_2026-03-12.md`

---

## Definicao Atual de Produto em Operacao

Considerar o produto pronto para operacao assistida quando for possivel:

1. captar lead
2. criar conta
3. concluir onboarding
4. gerar relatorio real
5. entregar artefatos reais
6. monitorar saude do worker
7. reprocessar falhas
8. recuperar automaticamente erros simples
9. operar o ritmo recorrente por cron

Hoje os itens de 1 a 8 ja estao encaminhados ou implementados no codigo.
O item 9 depende principalmente de configuracao externa e refinamento do scheduler.

---

## Leitura Final

O projeto ja nao esta mais num roadmap de "MVP cru".

Ele entrou num estagio melhor descrito como:

- MVP operacional robusto
- com base real para SaaS
- caminhando agora para internacionalizacao, canais conversacionais, aprendizagem retrospectiva e escala

O principal risco daqui para frente nao e mais "conseguir gerar o produto".
O principal risco passa a ser:

- operar com consistencia
- aprender com uso real
- escalar sem criar fragilidade invisivel
