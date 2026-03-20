# PRD — Plataforma de Inteligência de Mercado Global

**Guilds** · v2.0 · Março 2026 · Confidencial

---

**GUILDS**

Product Requirements Document

**Plataforma de Inteligência de Mercado Global para PMEs**

Cobertura global em 5 idiomas • Periodicidade flexível • Entrega multicanal • Nichos Ocultos

|                   |                                                                                                                                       |
|-------------------|-----------------------------------------------------|
| **Produto**       | Global Market Intelligence Platform                                                                                                   |
| **Versão**        | 2.0 — Revisão pós-simulação e validação de produto                                                                                    |
| **Data**          | Março 2026                                                                                                                            |
| **Autor**         | Gustavo — CEO, Guilds                                                                                                                 |
| **Status**        | Versão validada — pré-desenvolvimento                                                                                                 |
| **Mudanças v2**   | Seção de Nichos Ocultos; documento de fontes; identidade visual do relatório; onboarding de 14 perguntas; seção Guilds nos relatórios |
| **Classificação** | Confidencial — uso interno                                                                                                            |

## 1. Visão geral e objetivo estratégico
A Plataforma de Inteligência de Mercado Global da Guilds é um produto SaaS de inteligência competitiva e de mercado projetado especificamente para PMEs que não têm acesso a ferramentas profissionais — seja por custo, complexidade ou falta de equipe especializada.

O produto monitora fontes globais em **cinco idiomas** (inglês, espanhol, mandarim, alemão/francês, japonês/coreano), processa os dados via motor de análise com IA e entrega inteligência nicho-específica no idioma e periodicidade escolhidos pelo cliente — via relatório PDF com identidade Guilds, dashboard digital, áudio narrado, alertas WhatsApp, posts prontos para redes sociais e uma seção exclusiva de **Nichos e Oportunidades Ocultas**.

|              |                                                                                                                                                                                                                                                                                   |
|------------|------------------------------------------------------------|
| **Problema** | PMEs tomam decisões estratégicas sem dados. Gartner, Forrester e NielsenIQ custam US$ 50k–500k/ano e são construídas para enterprises. O mercado de inteligência acessível, nicho-específica, globalmente abrangente e com sinais não-óbvios para PMEs está essencialmente vazio. |

|             |                                                                                                                                                                                                                                                     |
|------------|------------------------------------------------------------|
| **Solução** | Produto de assinatura híbrida (base + add-ons) que entrega inteligência global no formato que o cliente realmente consome — mais uma seção exclusiva de oportunidades ocultas identificadas por cruzamento multilíngue de fontes não convencionais. |

### 1.1 Posicionamento competitivo
|                   |                                    |                                                             |
|-----------------|----------------------------|----------------------------|
| **Dimensão**      | **Concorrentes (Gartner/Nielsen)** | **Nossa plataforma**                                        |
| Preço             | US$ 50k–500k/ano                   | R$ 497–6.997/mês                                            |
| Público           | Enterprises com analistas internos | PMEs sem equipe de inteligência                             |
| Cobertura         | Global, mas genérica por setor     | Global + filtrada pelo nicho do cliente                     |
| Formato           | PDF de 80 páginas                  | PDF, áudio, WhatsApp, posts, dashboard                      |
| Idioma de entrega | Inglês predominante                | Cliente escolhe o idioma                                    |
| Periodicidade     | Mensal ou sob demanda              | Diária, semanal, quinzenal, mensal — cliente escolhe        |
| Nichos ocultos    | Não existe como produto            | Seção exclusiva de sinais fracos globais por nicho          |
| Identidade visual | Relatório genérico da plataforma   | Relatório com branding Guilds + co-branding do cliente      |
| Seção de serviços | Não existe                         | Seção Guilds em cada relatório — cross-sell contextualizado |

### 1.2 Métricas de sucesso
|                                                    |                                                           |
|----------------------------|--------------------------------------------|
| **Métrica**                                        | **Meta — 12 meses após lançamento**                       |
| **MRR**                                            | R$ 150.000/mês (≈ 80–100 clientes ativos)                 |
| **Churn mensal**                                   | &lt; 5%                                                   |
| **NPS**                                            | &gt; 50                                                   |
| **Tempo de onboarding**                            | &lt; 48h da contratação ao primeiro relatório             |
| **Fontes ativas**                                  | &gt; 500 fontes monitoradas em 5 idiomas                  |
| **Uptime do pipeline**                             | &gt; 99,5%                                                |
| **Taxa de conversão de cross-sell (seção Guilds)** | &gt; 15% dos clientes contratam serviço Guilds em 90 dias |

## 2. Usuários e personas
### 2.1 Perfis de usuário
|                               |                                                                 |                                                                |
|-----------------|----------------------------|----------------------------|
| **Persona**                   | **Características**                                             | **Job-to-be-done**                                             |
| Dono de PME (5–50 func.)      | Sem equipe de análise, decide sozinho, consome áudio e WhatsApp | Saber o que acontece no setor sem perder tempo pesquisando     |
| Diretor comercial / CMO       | Tem time, precisa embasar decisões com dados                    | Benchmark competitivo + tendências para reuniões de estratégia |
| Empresa com op. internacional | Exporta ou tem parceiros no exterior                            | Monitorar mercado global no idioma da diretoria                |
| Aceleradora / Investidor      | Acompanha múltiplas empresas de portfólio                       | Dashboard agregado de múltiplos nichos                         |

### 2.2 Jornada de valor do cliente
1.  Contratação → formulário de onboarding com 14 perguntas estruturadas (ver seção 6).

2.  Configuração automática do pipeline no n8n com parâmetros armazenados no Supabase.

3.  Primeiro relatório entregue em até 48h — momento de WOW e percepção de valor imediata.

4.  Ciclo contínuo na periodicidade escolhida. Cliente recebe inteligência sem precisar pedir.

5.  Check-in automático D+7: email pedindo ajuste de palavras-chave e concorrentes.

6.  Seção Guilds no relatório gera oportunidade natural de cross-sell para outros serviços.

7.  Expansão para add-ons quando o cliente percebe o valor e quer mais profundidade.

## 3. Arquitetura funcional
### 3.1 Visão em camadas
O produto é organizado em cinco camadas funcionais. A Camada 5 (Nichos Ocultos) é nova na v2.

|                                         |                                                                                                                                                                       |
|----------------------|--------------------------------------------------|
| **Camada**                              | **Responsabilidade**                                                                                                                                                  |
| **Camada 1 — Coleta global**            | Ingestão contínua de fontes em 5 idiomas (news, governamental, social, competitivo, acadêmico, fóruns)                                                                |
| **Camada 2 — Normalização e tradução**  | LLM extrai, traduz, normaliza e classifica por relevância ao nicho (score 0–100). Sinais &lt; 50 são descartados                                                      |
| **Camada 3 — Análise e geração**        | Motor de análise: tendências, competitivo, consumidor, oportunidades, ameaças, nichos ocultos                                                                         |
| **Camada 4 — Delivery multicanal**      | PDF com identidade visual, dashboard, áudio narrado, WhatsApp, posts, arquivo de fontes separado                                                                      |
| **Camada 5 — Nichos Ocultos (NOVO v2)** | Motor de cruzamento multilíngue para identificar 2 sinais não-óbvios por ciclo: sinais fracos globais + adjacentes não monitorados + comportamento em fontes laterais |

### 3.2 Fontes de dados por idioma
|                           |                                           |                                                                               |
|-----------------|----------------------------|----------------------------|
| **Idioma**                | **Tipo de fonte**                         | **Exemplos**                                                                  |
| EN — Inglês               | News, financeiro, gov., social, fóruns    | Reuters, Bloomberg, FT, TechCrunch, SEC, USPTO, Reddit, LinkedIn, Hacker News |
| ES — Espanhol             | News LATAM e Ibérica, institucional       | El País, Expansión, Infobae, La Nación, CEPAL, bancos centrais LATAM          |
| ZH — Mandarim             | News econômica, gov., social, tendências  | Caixin, 36Kr, Sina Finance, PBOC, MIIT, Weibo trends                          |
| DE/FR — Alemão e Francês  | News europeia, institucional, regulatória | Handelsblatt, Les Échos, Eurostat, BCE, EUR-Lex, DIHK                         |
| JA/KO — Japonês e Coreano | News econômica, gov., corporate           | Nikkei, Chosun Ilbo, METI Japan, KOTRA, Yahoo Japan Finance, Naver            |

|                                   |                                                                                                                                                                                                                                                         |
|------------|------------------------------------------------------------|
| **Princípio de cobertura global** | Tendências de consumo e inovação surgem primeiro em mercados maduros (EUA, Japão, Alemanha) e chegam ao Brasil 12–36 meses depois. O cruzamento de idiomas é a principal fonte de oportunidades ocultas — sinais que nenhum concorrente local monitora. |

### 3.3 Periodicidades disponíveis por plano
|                   |                                                                                              |                                    |
|-----------------|----------------------------|----------------------------|
| **Periodicidade** | **O que entrega no ciclo**                                                                   | **Planos que incluem**             |
| Diária            | Alerta de 1–3 sinais críticos + score de relevância                                          | Growth, Advisory                   |
| Semanal           | Brief WhatsApp + áudio 5 min + 2 posts prontos                                               | Starter, Growth, Advisory          |
| Quinzenal         | Relatório completo + dashboard + 3 posts + áudio 10 min                                      | Growth, Advisory                   |
| Mensal            | Relatório completo + dashboard + áudio 15 min + 5 posts + nichos ocultos + arquivo de fontes | Starter (padrão), Growth, Advisory |

A periodicidade controla o gatilho do cron job no n8n. Cada cliente tem workflow próprio. O pipeline de coleta roda continuamente — a periodicidade define apenas quando a síntese e entrega ocorrem.

### 3.4 Formatos de entrega
|                                 |                                                                                                                                                                                                                                                                                                                                                  |
|---------------------|---------------------------------------------------|
| **Canal**                       | **Especificação**                                                                                                                                                                                                                                                                                                                                |
| **Relatório PDF**               | LLM gera o conteúdo em texto estruturado → renderizado em PDF com identidade visual Guilds (logo no header/footer/capa, paleta navy/gold, seções em bandas). Estrutura: capa com métricas do ciclo, sumário executivo, tendências globais, mapa competitivo, sinais de consumidor, oportunidades, ameaças, nichos ocultos, seção Guilds, fontes. |
| **Arquivo de fontes (NOVO v2)** | Documento separado entregue junto ao relatório. Contém: todas as fontes do ciclo com score, título, veículo, idioma, tipo e URL clicável. Tabela de metodologia de scoring. Sinais descartados explicados. Fundamenta a credibilidade do relatório e aumenta percepção de valor.                                                                 |
| **Dashboard digital**           | React + Supabase Realtime. KPIs do setor, score por sinal, histórico de tendências, mapa competitivo, alertas. Acesso 24/7.                                                                                                                                                                                                                      |
| **Áudio narrado**               | Roteiro gerado pelo LLM → narrado via ElevenLabs ou OpenAI TTS → MP3 entregue via WhatsApp e link no dashboard.                                                                                                                                                                                                                                  |
| **Alertas WhatsApp**            | Evolution API + n8n. Estrutura: insight numerado, score, resumo em 3 linhas, link para o dashboard. Disparado no ciclo e em urgências (threshold).                                                                                                                                                                                               |
| **Posts para redes sociais**    | LLM gera posts formatados por plataforma (LinkedIn artigo, LinkedIn curto, Instagram carrossel, Twitter/X) a partir dos insights. Entregues prontos para publicar.                                                                                                                                                                               |

### 3.5 Estrutura do relatório PDF (v2 com identidade Guilds)
O relatório segue estrutura fixa para criar familiaridade, com design nível McKinsey — seções em bandas navy, tipografia Calibri, paleta navy/gold, logo Guilds no header de cada página.

|                                  |                                                                                                                                                                   |
|----------------------|--------------------------------------------------|
| **Seção do relatório**           | **Conteúdo**                                                                                                                                                      |
| **Capa**                         | Capa full-bleed navy escuro com logo Guilds branco, barra gold, nome do cliente, métricas do ciclo em destaque (sinais coletados, score médio, idiomas cobertos). |
| **Sumário executivo**            | 3 insight cards coloridos + top 3 ações recomendadas em blocos numerados. Projetado para leitura em 2 minutos.                                                    |
| **1. Tendências globais**        | Tendências com scores individuais, callout de origem por idioma, bullets de dados.                                                                                |
| **2. Mapa competitivo**          | Tabela de movimentos de concorrentes + análise de posicionamento (matriz 2x2).                                                                                    |
| **3. Sinais de consumidor**      | Score de sentimento por tema + o que o cliente não está encontrando.                                                                                              |
| **4. Oportunidades**             | Callouts coloridos priorizados (Urgente / Alta / Média / Monitorar).                                                                                              |
| **5. Ameaças e alertas**         | Callouts coloridos por grau de risco (Crítica / Alta / Monitorar).                                                                                                |
| **5B. Nichos Ocultos (NOVO v2)** | Seção com design distinto (fundo escuro \#1A1A2E, badge OC, metadados de origem, conteúdo em 4 camadas). 2 oportunidades por ciclo.                               |
| **6. Como a Guilds pode ajudar** | Seção com header negro e barra gold Guilds, 5 serviços mapeados nos insights do relatório, CTA para contato.                                                      |
| **7. Fontes e metodologia**      | Tabela de fontes principais por tema + nota metodológica.                                                                                                         |

### 3.6 Seção de Nichos e Oportunidades Ocultas (NOVO v2)
**Definição:** Oportunidade oculta é aquela identificada pela combinação de três critérios: (1) sinal fraco global que ainda não chegou ao Brasil, (2) mercado adjacente que ninguém no setor local está olhando, ou (3) comportamento de consumidor identificado em fontes não-óbvias (fóruns, redes, dados laterais). Cada relatório entrega exatamente 2 oportunidades ocultas por ciclo, com profundidade — não quantidade.

|                                 |                                                                                                                                                                                                                  |
|---------------------|---------------------------------------------------|
| **Elemento**                    | **Especificação**                                                                                                                                                                                                |
| **Design visual**               | Fundo escuro \#1A1A2E, separado visualmente do restante do relatório. Badge 'OC 01/02', cor dourada \#E8D5A3, painel esquerdo escuro com metadados, painel direito cinza claro com análise.                      |
| **Painel esquerdo (metadados)** | Score de relevância (em verde-água), idiomas de origem, tipo de sinal (sinal fraco / mercado adjacente / comportamento lateral), janela de ação estimada em meses.                                               |
| **Painel direito (análise)**    | 4 blocos estruturados: O sinal (o que foi captado e de onde), Por que é oculto (por que nenhum concorrente local vê), A oportunidade concreta (números e contexto), Ação recomendada (próximo passo específico). |
| **Rodapé da seção**             | Nota escura confirmando que os temas não aparecem em publicações PT-BR convencionais — reforça o valor exclusivo do produto.                                                                                     |
| **Fonte dos sinais**            | Cruzamento obrigatório de pelo menos 2 idiomas diferentes + ao menos 1 fonte não-mainstream (fórum, dado lateral, fonte regulatória estrangeira).                                                                |

### 3.7 Idiomas de entrega
O cliente configura o idioma de entrega no onboarding. Todos os artefatos — PDF, áudio, WhatsApp, posts — são gerados no idioma escolhido, independentemente dos idiomas das fontes coletadas.

|                                                              |                                             |
|----------------------------|--------------------------------------------|
| **Idioma de entrega**                                        | **Disponibilidade**                         |
| **Português Brasileiro (PT-BR)**                             | Padrão — disponível em todos os planos      |
| **Inglês (EN)**                                              | Disponível em todos os planos               |
| **Espanhol (ES)**                                            | Disponível em todos os planos               |
| **Mandarim (ZH)**                                            | Disponível nos planos Growth e Advisory     |
| **Alemão (DE) / Francês (FR) / Japonês (JA) / Coreano (KO)** | Disponível no plano Advisory ou sob demanda |

## 4. Modelo comercial
### 4.1 Planos e precificação
|           |                    |                                                                                                                                                                                                                           |
|-----------------|----------------------------|----------------------------|
| **Plano** | **Preço mensal**   | **O que inclui**                                                                                                                                                                                                          |
| Starter   | R$ 497–797/mês     | 1 nicho, periodicidade semanal ou mensal, PDF com identidade Guilds, dashboard básico, brief WhatsApp, 5 posts, áudio mensal, arquivo de fontes. Nichos ocultos no ciclo mensal. PT-BR ou EN.                             |
| Growth    | R$ 1.497–2.497/mês | Tudo do Starter + até 3 nichos + periodicidade diária/semanal/quinzenal + dashboard avançado + áudio semanal + 1 relatório especial/trimestre. Todos os idiomas principais.                                               |
| Advisory  | R$ 3.997–6.997/mês | Tudo do Growth + todas as periodicidades + alertas em tempo real + call advisory mensal + pesquisa primária custom semestral + benchmark anual setorial. Revisão humana do relatório antes do delivery. Todos os idiomas. |

### 4.2 Add-ons disponíveis
|                                 |                                                                                                                   |
|----------------------|--------------------------------------------------|
| **Add-on**                      | **Preço e escopo**                                                                                                |
| **Relatório especial temático** | R$ 797–1.997 por relatório. Tema específico: análise de preços, regulação, fornecedores, entrada em novo mercado. |
| **Pesquisa primária (survey)**  | R$ 2.997–6.997. Survey com consumidores do nicho (n=100–500), análise e relatório com recomendações.              |
| **Benchmark setorial anual**    | R$ 1.997–3.997. Posicionamento do cliente vs. setor em 10–15 KPIs. Relatório + apresentação executiva.            |
| **Advisory call avulso**        | R$ 497–997/sessão de 60 min. Disponível para clientes Starter e Growth.                                           |
| **Nicho adicional**             | R$ 297–497/mês. Monitoramento de um nicho ou conjunto de concorrentes extra.                                      |
| **Idioma adicional de entrega** | R$ 197–397/mês. Segundo idioma além do configurado no onboarding.                                                 |

## 5. Stack técnico
### 5.1 Componentes principais
|                                |                                                                                                                                                                          |
|---------------------|---------------------------------------------------|
| **Componente**                 | **Tecnologia e papel**                                                                                                                                                   |
| **Orquestração e automação**   | n8n (self-hosted) — orquestra todos os workflows. Um cron job por cliente, controlado pela periodicidade contratada armazenada no Supabase.                              |
| **Banco de dados e perfis**    | Supabase (PostgreSQL + Realtime) — perfil de cada cliente, sinais coletados com score, histórico de relatórios, configurações de threshold de alerta.                    |
| **Motor de análise e geração** | Claude Sonnet (Anthropic) ou GPT-4o — extração multilíngue, scoring, síntese analítica, geração de relatório, posts, roteiro de áudio e identificação de nichos ocultos. |
| **Coleta de dados**            | Puppeteer/Playwright via n8n, RSS feeds, APIs públicas (IBGE, MDIC, News APIs), Google Trends API, SerpAPI para dados de concorrentes.                                   |
| **Geração de PDF**             | Puppeteer (headless Chrome) — renderiza HTML/CSS gerado pelo LLM em PDF de alta qualidade com identidade visual Guilds.                                                  |
| **Comunicação WhatsApp**       | Evolution API — envio de mensagens, áudio e alertas para o WhatsApp do cliente, integrado ao n8n via webhook.                                                            |
| **Geração de áudio (TTS)**     | ElevenLabs API ou OpenAI TTS — converte roteiro em MP3 no idioma de entrega do cliente.                                                                                  |
| **Dashboard frontend**         | React + Supabase Realtime — KPIs, histórico de tendências, mapa competitivo, alertas, acesso a relatórios anteriores.                                                    |

### 5.2 Fluxo de dados completo
1.  Cron job dispara no n8n conforme periodicidade configurada no Supabase para o cliente.

2.  Workflow de coleta busca fontes em todos os idiomas com palavras-chave e concorrentes do cliente.

3.  LLM processa cada sinal: extrai entidade, classifica tema, traduz para EN interno, atribui score 0–100. Sinais &lt; 50 são descartados.

4.  Motor de Nichos Ocultos cruza sinais de múltiplos idiomas buscando padrões fora do mainstream PT-BR. Identifica os 2 mais relevantes para o nicho do cliente.

5.  Sinais com score &gt; 85 (Advisory) disparam alerta imediato via WhatsApp, fora do ciclo padrão.

6.  No encerramento do ciclo, LLM sintetiza todos os sinais em análise estruturada completa incluindo a seção de Nichos Ocultos e a seção Guilds contextualizada ao nicho.

7.  Motor de geração produz: texto do relatório → PDF com identidade visual Guilds, roteiro → MP3 via TTS, posts por plataforma, brief WhatsApp, arquivo de fontes separado.

8.  n8n distribui artefatos: PDF por email + link no dashboard, MP3 via WhatsApp, posts em pasta compartilhada, brief via WhatsApp, dashboard atualizado via Supabase Realtime, arquivo de fontes em PDF separado.

### 5.3 Modelo de dados — Supabase
|                    |                                                                                                                                                                           |
|-------------------|-----------------------------------------------------|
| **Tabela**         | **Campos principais**                                                                                                                                                     |
| **clients**        | id, name, plan, niche\_keywords\[\], competitors\[\], delivery\_language, periodicity, alert\_threshold, whatsapp\_number, created\_at                                    |
| **signals**        | id, client\_id, source\_url, source\_language, raw\_content, translated\_content, theme, relevance\_score, is\_hidden\_niche, collected\_at, cycle\_id                    |
| **cycles**         | id, client\_id, period\_start, period\_end, status (collecting \| generating \| delivered), report\_url, audio\_url, sources\_doc\_url                                    |
| **reports**        | id, cycle\_id, client\_id, pdf\_url, audio\_url, sources\_pdf\_url, posts\_content, delivered\_at, delivery\_channels\[\]                                                 |
| **hidden\_niches** | id, cycle\_id, client\_id, oc\_number, title, signal\_text, why\_hidden, concrete\_opportunity, recommended\_action, score, source\_languages\[\], action\_window\_months |
| **alerts**         | id, client\_id, signal\_id, type (urgent \| weekly \| cycle), sent\_at, channel (whatsapp \| email \| dashboard)                                                          |

### 5.4 Integrações externas
|                                        |                                                  |                  |
|-----------------|----------------------------|----------------------------|
| **Integração**                         | **Finalidade**                                   | **Planos**       |
| News APIs (NewsAPI, GNews, TheNewsAPI) | Coleta de artigos em EN, ES, FR, DE              | Todos            |
| Google Trends API / SerpAPI            | Tendências de busca e dados de concorrentes      | Todos            |
| Weibo / Bilibili API (ZH)              | Sinais de tendência em mandarim                  | Growth, Advisory |
| RSS Feeds customizados                 | Fontes setoriais específicas por nicho           | Todos            |
| IBGE / MDIC / CVM APIs                 | Dados macroeconômicos e regulatórios BR          | Todos            |
| Eurostat / OECD / EUR-Lex APIs         | Dados econômicos e regulatórios europeus         | Growth, Advisory |
| ElevenLabs / OpenAI TTS                | Narração de áudio no idioma do cliente           | Todos            |
| Evolution API (WhatsApp)               | Delivery de alertas, briefs e áudio              | Todos            |
| Claude API / OpenAI API                | Motor de análise, tradução e geração             | Todos            |
| Puppeteer (headless Chrome)            | Renderização de PDF com identidade visual Guilds | Todos            |

## 6. Processo de onboarding — as 14 perguntas
O onboarding é completado pelo cliente em até 15 minutos via formulário estruturado. Define a qualidade de toda a inteligência gerada. O primeiro relatório é entregue em até 48h.

**Bloco 1 — Identidade do negócio (5 perguntas)**

|                                                                                         |                                                             |
|----------------------------|--------------------------------------------|
| **Pergunta**                                                                            | **O que captura**                                           |
| **Q1. Qual é o nome da sua empresa?**                                                   | Identificação e branding do relatório                       |
| **Q2. Qual é o setor principal em que você atua?**                                      | Anchor do nicho — ponto de partida para o motor de análise  |
| **Q3. Descreva em 2–3 frases o que você vende e para quem.**                            | Contexto de produto e público-alvo para calibrar relevância |
| **Q4. Qual é o tamanho da sua empresa (faturamento aproximado ou nº de funcionários)?** | Calibra profundidade e escopo das recomendações             |
| **Q5. Quais são suas 2–3 principais metas de negócio para os próximos 12 meses?**       | Ancora as recomendações estratégicas do relatório           |

**Bloco 2 — Parâmetros de monitoramento (5 perguntas)**

|                                                                             |                                                                                          |
|----------------------------|--------------------------------------------|
| **Pergunta**                                                                | **O que captura**                                                                        |
| **Q6. Liste até 10 palavras-chave que definem seu mercado e setor.**        | Seed do pipeline de coleta e scoring de relevância                                       |
| **Q7. Liste até 10 concorrentes que você quer monitorar (nome + site).**    | Parâmetros do mapa competitivo                                                           |
| **Q8. Há algum tema específico que você quer acompanhar com mais atenção?** | Boost de relevância para temas prioritários (regulação, pricing, tecnologia, consumidor) |
| **Q9. Em quais regiões geográficas você atua ou pretende atuar?**           | Filtro geográfico para scoring e fontes regionais                                        |
| **Q10. Há algum tema que você explicitamente NÃO quer no relatório?**       | Lista de exclusão para o pipeline de filtragem                                           |

**Bloco 3 — Preferências de entrega (4 perguntas)**

|                                                                         |                                                    |
|----------------------------|--------------------------------------------|
| **Pergunta**                                                            | **O que captura**                                  |
| **Q11. Com qual frequência você quer receber o relatório?**             | Periodicidade → configura cron job no n8n          |
| **Q12. Em qual idioma você quer receber?**                              | Idioma de entrega → configura templates de geração |
| **Q13. Qual é o seu número WhatsApp para receber os briefs e alertas?** | Canal de entrega de alertas e áudio                |
| **Q14. Qual é o melhor horário para receber as notificações?**          | Scheduling do envio WhatsApp no cron job           |

|                       |                                                                                                                                                                                                                               |
|------------|------------------------------------------------------------|
| **Fluxo de ativação** | Formulário preenchido → webhook dispara n8n → Supabase criado → pipeline configurado → primeira coleta das últimas 48–72h → relatório gerado → entrega com identidade Guilds → check-in D+7 automático para ajuste do perfil. |

## 7. Estrutura detalhada do relatório
### 7.1 Identidade visual do relatório
O relatório é o principal artefato do produto e funciona simultaneamente como entregável de inteligência e material de posicionamento da Guilds. Cada relatório deve ter aparência de documento de consultoria premium — nível McKinsey — com identidade visual consistente.

|                            |                                                                                                                                                                           |
|----------------------|--------------------------------------------------|
| **Elemento de identidade** | **Especificação**                                                                                                                                                         |
| **Header (toda página)**   | Logo Guilds preto (fundo branco) + nome do cliente + 'Produzido por Guilds' + data/ciclo/idioma                                                                           |
| **Footer (toda página)**   | Nome do cliente + 'Inteligência de Mercado' + 'Confidencial' + URL guilds.com.br + numeração de página                                                                    |
| **Capa**                   | Fundo navy escuro, logo Guilds branco centralizado, barra gold separadora, nome do cliente em destaque, métricas do ciclo (sinais / score / idiomas) em tipografia grande |
| **Seções**                 | Bandas navy sólidas com texto branco — identificação imediata de cada seção                                                                                               |
| **Insight cards**          | 3 cards coloridos por tema no sumário executivo (verde / navy / gold)                                                                                                     |
| **Callouts**               | Caixas com borda lateral colorida indicando urgência/prioridade                                                                                                           |
| **Nichos Ocultos**         | Seção com fundo escuro \#1A1A2E, badge OC, barra gold \#E8D5A3 — design radicalmente diferente do restante do relatório                                                   |
| **Seção Guilds**           | Header negro com logo Guilds branco e barra gold, tabela de serviços mapeados nos insights do cliente, CTA para contato                                                   |

### 7.2 Versão áudio
Roteiro gerado pelo LLM adaptado para linguagem oral. Estrutura: abertura (30s) → sumário executivo (2 min) → top 3 tendências (3–5 min) → mapa competitivo resumido (2 min) → nichos ocultos (2 min) → ações recomendadas (1 min) → encerramento Guilds (30s). Total: 10–15 minutos conforme periodicidade.

### 7.3 Posts para redes sociais
|                               |                                                                        |
|----------------------|--------------------------------------------------|
| **Formato**                   | **Especificação**                                                      |
| **LinkedIn — artigo/insight** | 400–800 palavras, tom profissional, dados citados, CTA para discussão  |
| **LinkedIn — post curto**     | 150–280 caracteres + 3–5 bullets, tom direto, hashtags do setor        |
| **Instagram — carrossel**     | Texto para 5–7 slides: hook, dados/insights, CTA                       |
| **Twitter/X**                 | 280 caracteres, dado mais impactante do relatório, hashtags relevantes |

## 8. Seção Guilds nos relatórios — cross-sell contextualizado
Cada relatório inclui uma seção final **'Como a Guilds pode potencializar \[nome do cliente\]'** — gerada automaticamente pelo LLM com base nos insights do próprio relatório. Não é um catálogo genérico de serviços: é uma proposta contextualizada que conecta explicitamente cada serviço Guilds a uma oportunidade ou ameaça identificada no ciclo.

### 8.1 Estrutura da seção
Header negro com logo Guilds branco + barra gold. Parágrafo de contexto (2 linhas). Tabela de 5 serviços com 4 colunas: ícone numérico, nome do serviço, descrição do que entregamos, conexão com o relatório (texto específico referenciando o insight). CTA de contato com email, URL e localização.

### 8.2 Serviços Guilds mapeáveis por tipo de cliente
|                                          |                                                                |                                                                                  |
|-----------------|----------------------------|----------------------------|
| **Serviço Guilds**                       | **Quando incluir**                                             | **Como conectar ao relatório**                                                   |
| Automação de processos                   | Quando relatório identifica demanda por eficiência operacional | Conectar à oportunidade de assessoria recorrente ou gap de processo identificado |
| Desenvolvimento de sistema customizado   | Quando cliente precisa de produto ou plataforma digital        | Conectar à oportunidade de produto novo ou gap de canal digital                  |
| Presença digital e marketing com IA      | Quando ameaça de concorrentes digitais é identificada          | Conectar explicitamente à ameaça de players digitais tomando espaço              |
| Agente de IA para atendimento            | Quando escala de atendimento é identificada como gargalo       | Conectar ao modelo de assinatura ou novo produto que precisa de suporte          |
| Dashboard de inteligência (este produto) | Sempre presente — upsell de periodicidade ou nicho adicional   | Conectar ao próximo ciclo e sugerir ajuste de configuração                       |

### 8.3 Lógica de geração automática
O LLM recebe o relatório completo e gera a seção Guilds com um prompt específico: identificar as 3 oportunidades ou ameaças mais urgentes do relatório e mapear qual serviço Guilds resolve diretamente cada uma. A conexão deve citar o número da seção e o título exato da oportunidade/ameaça — nunca texto genérico.

## 9. Requisitos não funcionais
### 9.1 Performance e escalabilidade
-   Pipeline de coleta: até 1.000 sinais por cliente por ciclo sem degradação.

-   Motor de Nichos Ocultos: máximo adicional de 3 minutos no tempo de geração do ciclo.

-   Geração de relatório PDF com identidade visual Guilds: máximo 10 minutos do início da síntese à entrega.

-   Geração de áudio: máximo 3 minutos para narração de até 15 minutos.

-   Dashboard: carregamento &lt; 2 segundos para 95% das requisições.

-   Escalabilidade horizontal: arquitetura suporta 500 clientes ativos sem refatoração maior.

### 9.2 Segurança e privacidade
-   Dados de cada cliente isolados no Supabase (Row Level Security habilitado).

-   Nenhum dado de cliente compartilhado com outros clientes, inclusive no processamento LLM.

-   Sinais armazenados com referência à origem — rastreabilidade total via arquivo de fontes.

-   PDFs entregues via link com token único de acesso. WhatsApp verificado por número cadastrado.

-   LGPD: política de privacidade clara, exclusão de dados sob demanda, retenção por plano.

### 9.3 Qualidade da inteligência
-   Score de relevância calibrado: &lt; 5% de falsos positivos (sinais irrelevantes como críticos).

-   Nichos Ocultos: exigem cruzamento de ao menos 2 idiomas + 1 fonte não-mainstream. Sem exceção.

-   Cobertura mínima: ao menos 3 fontes por idioma monitorado por ciclo.

-   Revisão humana obrigatória no Advisory tier antes do delivery.

-   Relevance loop: cliente pode marcar sinais como relevantes/irrelevantes para refinar scoring.

## 10. Roadmap de desenvolvimento
### 10.1 Fase 1 — MVP (semanas 1–8)
|              |                                                                                                                                                                                   |
|------------|------------------------------------------------------------|
| **Objetivo** | 5 clientes beta com coleta EN + PT-BR, periodicidade mensal, relatório PDF com identidade Guilds + WhatsApp + posts + arquivo de fontes. Validar ciclo completo antes de escalar. |

-   Configuração do ambiente n8n self-hosted e Supabase.

-   Workflow de coleta EN + PT-BR (News APIs + RSS + Google Trends).

-   Pipeline LLM: extração, scoring, síntese e geração de relatório.

-   Template de identidade visual Guilds para PDF (capa navy, header/footer com logo, seções em bandas).

-   Geração de arquivo de fontes separado com metodologia de scoring.

-   Integração WhatsApp (Evolution API).

-   Formulário de onboarding com 14 perguntas integrado ao Supabase.

-   Dashboard básico (React) com relatórios anteriores e KPIs simples.

-   Geração de posts LinkedIn e Instagram.

-   Seção Guilds no relatório — versão inicial com mapeamento manual.

-   Testes com 5 clientes beta em nichos variados.

### 10.2 Fase 2 — Nichos Ocultos + idiomas + periodicidades (semanas 9–16)
-   Motor de Nichos Ocultos: cruzamento multilíngue para identificar 2 sinais por ciclo.

-   Template visual distinto para seção de Nichos Ocultos (fundo escuro, badge OC, metadados).

-   Adição de fontes ES, ZH, DE/FR, JA/KO ao pipeline.

-   Idioma de entrega configurável (prompt template por idioma).

-   Periodicidade diária e semanal — cron jobs individuais por cliente no n8n.

-   Alertas urgentes em tempo real (score &gt; 85 dispara imediatamente).

-   Geração de áudio via ElevenLabs — integrado ao ciclo.

-   Dashboard avançado com histórico de tendências e mapa competitivo.

-   Seção Guilds com geração automática por LLM (mapeamento contextualizado).

-   Plano Growth lançado publicamente.

### 10.3 Fase 3 — Advisory e escala (semanas 17–24)
-   Plano Advisory com revisão humana antes do delivery.

-   Add-on de pesquisa primária (survey) integrado ao fluxo.

-   Benchmark setorial anual.

-   Refinamento do modelo de scoring via relevance loop de feedback dos clientes.

-   API pública para integração do dashboard ao BI do cliente (Power BI, Looker).

-   Portal do parceiro para revendedores (agências que querem oferecer o produto a seus clientes).

## 11. Riscos e mitigações
|                                                   |           |                                                                                                                                                             |
|-------------------|------------|-----------------------------------------|
| **Risco**                                         | **Prob.** | **Mitigação**                                                                                                                                               |
| Qualidade do scoring baixa nos primeiros ciclos   | Alta      | Beta fechado com 5 clientes supervisionados. Revisão manual dos primeiros 3 relatórios por nicho. Feedback loop ativo desde D+7.                            |
| Motor de Nichos Ocultos gerando sinais genéricos  | Média     | Prompt engineering rigoroso exigindo cruzamento de idiomas + fonte não-mainstream. Revisão humana dos Nichos Ocultos na Fase 1.                             |
| Custo de API de LLM escala além do projetado      | Média     | Modelagem de custo por cliente antes do lançamento. Cache de sinais processados. Testar modelos mais baratos para tarefas de baixa complexidade.            |
| Fontes ZH/JA/KO com baixa cobertura inicial       | Alta      | MVP foca EN + PT-BR. ZH, DE/FR, JA/KO adicionados na Fase 2 após validação.                                                                                 |
| Bloqueio de scraping por fontes premium           | Média     | Priorizar fontes com RSS e APIs públicas. Lista alternativa de fontes por idioma.                                                                           |
| Churn alto por falta de percepção de valor        | Média     | Momento WOW no primeiro relatório é prioritário. Check-in D+7 e D+30. NPS mensal.                                                                           |
| Seção Guilds percebida como publicidade intrusiva | Baixa     | A seção é sempre contextualizada nos insights do relatório — nunca genérica. Conexão explícita entre o serviço e a oportunidade identificada é obrigatória. |
| Dependência de único fornecedor LLM               | Baixa     | Camada de adaptador abstrai chamadas de LLM. Claude + OpenAI configurados em paralelo.                                                                      |

## 12. Glossário e definições
|                              |                                                                                                                                                                                 |
|---------------------|---------------------------------------------------|
| **Termo**                    | **Definição**                                                                                                                                                                   |
| **Sinal**                    | Qualquer unidade de informação coletada de uma fonte externa antes do processamento pelo LLM.                                                                                   |
| **Score de relevância**      | Número de 0 a 100 atribuído pelo LLM indicando a relevância do sinal para o nicho do cliente. Sinais abaixo de 50 são descartados.                                              |
| **Ciclo**                    | Período coberto por um relatório, definido pela periodicidade do cliente (1, 7, 15 ou 30 dias).                                                                                 |
| **Nicho oculto (OC)**        | Oportunidade identificada por cruzamento multilíngue de fontes não-convencionais — sinal fraco global, mercado adjacente não monitorado ou comportamento lateral de consumidor. |
| **Alert threshold**          | Score mínimo (padrão 85 para Advisory) que dispara alerta imediato fora do ciclo.                                                                                               |
| **Pipeline**                 | Sequência automatizada no n8n: coleta → normalização → scoring → análise → geração → distribuição.                                                                              |
| **Nicho**                    | Conjunto de palavras-chave, concorrentes e parâmetros que definem o escopo de monitoramento de cada cliente.                                                                    |
| **Relevance loop**           | Mecanismo de feedback pelo qual o cliente marca sinais como relevantes ou não, refinando o modelo de scoring.                                                                   |
| **TTS**                      | Text-to-Speech — converte roteiro em áudio MP3 narrado via ElevenLabs ou OpenAI TTS.                                                                                            |
| **Identidade visual Guilds** | Conjunto de elementos visuais do relatório PDF: logo Guilds, paleta navy/gold, seções em bandas, header/footer padronizados.                                                    |
| **Arquivo de fontes**        | Documento PDF separado entregue com cada relatório mensal. Contém todas as fontes com score, URL, idioma, tipo e metodologia de scoring.                                        |
| **Seção Guilds**             | Seção do relatório com header negro, logo Guilds branco e mapeamento contextualizado de serviços Guilds nos insights do ciclo — cross-sell integrado ao produto.                |

Guilds — Plataforma de Inteligência de Mercado Global \| PRD v2.0 \| Confidencial \| Março 2026 \| guilds.com.br
