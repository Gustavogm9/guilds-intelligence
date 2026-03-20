# Estratégia de Evolução do Produto: Guilds Market Intelligence
**Visão Técnica e Roadmap de Engenharia**
**Data:** Março 2026

Este documento detalha o roadmap técnico completo para a evolução do sistema de inteligência de mercado da Guilds, traçando o caminho desde a ferramenta atual de geração sob demanda (Nível 1) até um Terminal de Inteligência em tempo real (Nível 3).

---

## Estrutura da Escada de Valor (Tiers de Produto)

O ecossistema será dividido em 3 Tiers, construídos sobre a mesma fundação técnica (Next.js + Python + Supabase), mas desbloqueando diferentes níveis de processamento assíncrono e acesso aos dados.

| Tier | Nome Comercial | Principal Proposta de Valor | Preço Alvo | Formato de Entrega | Motor de Dados |
|------|----------------|-----------------------------|------------|--------------------|----------------|
| **Nível 1** | **ClientIntelligence** | Captação rápida de leads / Raio-X instantâneo. | Free / Pay-per-report | PDF Estático + Dashboard Básico | LLM Knowledge (On-Demand) |
| **Nível 2** | **IntelMercado** | Inteligência mastigada recorrente. | R$ 497 - R$ 1.497/mês | PDF Premium + Áudio (TTS) + WhatsApp + Posts Redes Sociais | Web Search Direcionada (Scheduler) |
| **Nível 3** | **Painel Bloomberg** | Operar dados de mercado em tempo real. Alertas preditivos. | R$ 3.997+/mês | Dashboard 24/7 (Trend Radar) + Alertas por Produto | Global Intelligence Engine (Cron contínuo) |

---

## 📍 Fase 1: Finalização do Nível 1 (O Ímã de Leads)
*Objetivo: Tornar o relatório sob demanda atual o melhor possível e prepará-lo como funil de vendas para os Tiers 2 e 3.*

### 1.1 Seção de Upsell (Guilds Cross-sell)
**Requisito:** A última página do PDF gerado atualmente deve conectar as "dores" ou "oportunidades" descobertas pela IA com os serviços reais da Guilds.
- **Engenharia (Python/Gemini):**
  - Modificar o prompt do `report_generator.py` para incluir uma chave `"guilds_upsell"`.
  - Cruzar os top 3 insights do cliente com o portfólio de serviços da agência.
  - Renderizar no WeasyPrint uma página de fechamento com header Negro/Gold e CTAs dinâmicos clicáveis.

### 1.2 "Quick Wins" de Formato (Posts Prontos)
**Requisito:** O Payload que o Python devolve para o Next.js já deve entregar formatos menores de brinde para gerar percepção de valor na página de conclusão (`GenerateSuccess`).
- **Engenharia:**
  - O JSON de resposta do relatório deve incluir objetos `linkedin_post` e `instagram_carousel_text`.
  - Exibir esses textos no Dashboard logo após a geração do relatório, com botões "Copy to Clipboard".

### 1.3 Refinamento de Padrões Visuais
**Requisito:** Implementar identidade "nível McKinsey" no PDF gerado pela Engine atual (WeasyPrint).
- **Engenharia (CSS/HTML Templates):**
  - Fundo Navy na capa, barras separadoras Gold, tipografias consistentes.
  - Remover qualquer traço de "Relatório de Sistema" e dar cara de Documento Confidencial de Assessoria.

---

## 📍 Fase 2: Construção do Nível 2 (A Máquina Recorrente)
*Objetivo: Automatizar a entrega. O usuário não precisa mais fazer login para ganhar valor.*

### 2.1 The Invisible Worker (Cron Job Automático)
**Requisito:** Implementar a lógica onde a cota do plano não precisa de um clique do usuário para ser consumida.
- **Engenharia (Supabase/Python):**
  - Configurar um `crontab` real (via Supabase Edge Functions ou no Worker Python) que roda de madrugada.
  - **Query de Agendamento:** `SELECT * FROM clients c JOIN subscriptions s ON c.id = s.client_id WHERE s.status = 'active' AND should_generate_today(c, s)`.
  - Enfileirar na fila do RabbitMQ/Supabase Queue.
  - O script python processa e injeta os PDFs diretamente no Supabase Storage.

### 2.2 Entrega Multicanal (WhatsApp e Email)
**Requisito:** O relatório não fica só no sistema. Ele *chega* até o cliente onde ele está.
- **Engenharia:**
  - Assim que o `reports(status)` mudar para `completed`, a Engine no Next.js (Webhook interno) dispara um e-mail com o anexo.
  - Integração com Evolution API (ou Twilio/Z-API) para disparar mensagem de WhatsApp para o número em `clients.whatsapp_number` com os 3 *bullet points* do mês e o link do PDF.

### 2.3 Áudio Narrado TTS (Text-to-Speech)
**Requisito:** Gerar um mini-podcast de 3 a 5 minutos resumindo as oportunidades para o cliente escutar no trânsito.
- **Engenharia (Python Worker):**
  - Pegar o `Executive Summary` gerado pelo LLM.
  - Enviar para a API OpenAI `tts-1` (`alloy` ou `echo` voice).
  - Salvar o arquivo gerado em `.mp3` no Supabase Storage e associar a `reports.audio_url`.
  - Tocar nativamente no painel Web e enviar o MP3 cru pelo WhatsApp.

### 2.4 Onboarding de 14 Perguntas
**Requisito:** Precisamos de sinais claros para pescar notícias com qualidade maior no próximo nível.
- **Engenharia (Frontend Next.js):**
  - Mudar o fluxo de setup do `ProfileEditor`. 
  - Coletar estruturadamente: "Concorrentes Exatos", "Áreas Excluídas", "Metas de 12 meses".

---

## 📍 Fase 3: Terminal Bloomberg & Global Engine (Nível 3)
*Objetivo: Desacoplar a Busca da Geração. O sistema passa a "ler a internet" o tempo inteiro para toda a base e exibe no Dashboard em Tempo Real.*

### 3.1 O "Cérebro" Global (Database Schema)
**Requisito:** Não buscar o mesmo tema duas vezes.
- **Engenharia (Tabelas Auxiliares):**
  - Criar `global_niche_topics`: Dicionário mestre. Ex: "B2B SaaS Security" mapeia os clientes A, B e C.
  - Criar `niche_intelligence_nodes`: Cada nó é uma notícía específica. Campo `predictive_score` (0-100) e `is_trend` (boolean).

### 3.2 Global Gatherer Pipeline
**Requisito:** Um worker totalmente avulso que mapeia a internet continuamente buscando sinais antes de fechar relatórios.
- **Engenharia:**
  - Script que usa `Tavily API` ou Spiders customizados consultando as keywords da tabela `global_niche_topics`.
  - A cada nova URL encontrada, usar Jina.ai para ler, passar no Claude-3 para resumir, traduzir para PT-BR e dar um score de "Sinal Fraco Oculto".
  - Salvar diretamente na `niche_intelligence_nodes`.

### 3.3 Dashboard Hub (A Tela do Terminal)
**Requisito:** O Front-end onde a mágica acontece.
- **Engenharia (Next.js):**
  - Criar o componente `TrendRadar` que lê da tabela via *Supabase Realtime*.
  - Timeline atualizada na hora que uma notícia é inserida no banco pelo worker.
  - Filtros por `Produto/Serviço Especifico`: O cliente de Nível 3 pode plugar os serviços dele da tabela `client_products` e filtrar as streams de nós apenas com relevância para aquele exato produto.

### 3.4 Alertas Baseados em Gatilho
**Requisito:** Pior que atraso é a demora em saber de uma crise.
- **Engenharia:**
  - Se um nó da inteligência atingir um `predictive_score > 85` (urgente) e bater com filtros geográficos do cliente, o Backend dispara Webhook de alerta para WhatsApp na mesma hora, justificando que não poderia esperar o ciclo do relatório normal.

---

## Sumário de Cronograma Recomendado
As Sprints para engenharia podem ser tratadas na seguinte ordem funcional sem quebrar o que já existe:
1. **Sprint 1 (Quick Wins - Atual):** Inserir Cross-sell Dinâmico (Seção Guilds) no final do PDF e posts em texto no Dashboard.
2. **Sprint 2 (Áudio e Automação):** Plugar TTS de Áudio (OpenAI) + Otimizar disparo transacional e WhatsApp.
3. **Sprint 3 (Motor Passivo):** Desenvolver cronjob que consome "credits" e processa usuários passivamente (Assinatura Recorrente).
4. **Sprint 4 (Brain Global):** Criação das tabelas e workers isolados rodando Scrapers/Tavily em background e populando os *Intelligence Nodes*.
5. **Sprint 5 (Dashboard Premium):** Refatoramento do Front-end do nível 3 para exibir dados em tempo real + Configuração de Alertas.
