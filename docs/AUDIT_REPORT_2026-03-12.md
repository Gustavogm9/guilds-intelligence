# Auditoria de Sistema: Guilds Client Intelligence Engine

**Data da Auditoria:** 12 de Março de 2026
**Escopo:** Frontend (Next.js), Engine Python, Banco de Dados (Supabase), Configurações e Checklist de Pendências Manuais.

---

## 🚀 1. Visão Geral da Arquitetura (Status Atual)

A arquitetura descrita no `TECH_SPEC.md` e no `INTEGRATION_GUIDE.md` está majoritariamente consolidada no código:
- **Frontend (Next.js 14+)**: Roteamento App Router dividido entre `(auth)`, `admin` e `dashboard`. Chamadas de API implementadas em `api/reports/generate/route.ts` utilizando um service especializado `report-generation.ts`.
- **Backend (Supabase)**: `DATABASE_SCHEMA.sql` possui um modelo de dados robusto, políticas RLS ativadas, relacionamentos bem estruturados entre clientes, relatórios, planos e eventos (`funnel_events`, `billing_log`).
- **Engine (Python)**: Submetido via `worker_server.py` (FastAPI), repassa a tarefa para `supabase_worker.py`, que faz download de dados, usa `gerar_relatorio_cliente.py`, faz upload para o Supabase Storage e interage com webhooks e Resend via `_post_json`.

O fluxo de dados da infraestrutura desenhada está íntegro e condizente com as regras de negócio.

---

## 🚨 2. Problemas Críticos Encontrados (Bugs Potenciais)

Ao auditar a interface entre os metadados do `supabase_worker.py` e a estrutura de tabelas, o Engine tentará salvar campos que **não existem** no Schema base, sendo dependentes de migrations. Achei uma discrepância fatal:

> [!WARNING]
> **Migration Faltando:** A task `PENDENCIAS_MANUAIS_2026-03-11.md` (Linha 120) exige a verificação temporal da migration `migrations/add_report_retrospective_fields.sql`. **Este arquivo SQL não existe no repositório!**

No arquivo `engine/supabase_worker.py` (linha 518 em diante), na hora de finalizar o relatório, o código tenta atualizar a tabela `reports` com os campos da retrospectiva que dependem desta migration inexistente:
```python
"hypotheses": report_data.get("hypotheses") or [],
"retrospective_items": (report_data.get("retrospective") or {}).get("items") or [],
"retrospective_summary": (report_data.get("retrospective") or {}).get("summary"),
"retrospective_score": (report_data.get("retrospective") or {}).get("score"),
```
Se a função tentar salvar estes campos no Supabase e a tabela `reports` não tiver essas colunas, **a API do Python Worker vai quebrar (`error` 400 da API Supabase) em TODA geração de relatório**, marcando o report como `error` e frustrando a operação.

---

## 🛠 3. Revisão do Checklist `PENDENCIAS_MANUAIS_2026-03-11.md`

Auditei o que consta nas pendências do projeto frente ao que está no código:

### ✅ O que está sólido no código:
- **Observabilidade & Alertas OPs**: `sendOperationalNotification` do frontend e `send_operational_webhook` do Python já recebem metadados super estruturados, prevendo severidades na taxonomia correta (warning, critical) e eventos em `funnel_events`.
- **Retry e Scheduler**: O arquivo `lib/report-generation.ts` implementa os retries exponenciais (`RETRY_BACKOFF_MINUTES = [15, 60, 360]`), provando que a "Camada 8" do sistema (recorrências e falhas) está coberta.
- **Social Zip**: O engine agrupa em ZIP os cards e faz upload como `social_zip` adequadamente. O i18n também é respeitado de acordo com `preferred_language`.

### ⚠️ O que de fato falta configurar/fazer (Action Items):

1. **Criar a migration faltante**: Precisamos criar `migrations/add_report_retrospective_fields.sql` contendo `ALTER TABLE public.reports ADD COLUMN hypotheses JSONB`, etc., para evitar a quebra do worker em produção.
2. **Setup do Supabase Storage**: Os buckets `reports` (privado) e `logos` (público) devem ser criados manualmente caso isso não esteja no processo de CI.
3. **Variáveis de Ambiente**: Nenhuma das integrações cruciais funcionará sem:
  - `PYTHON_WORKER_SECRET` & `PYTHON_WORKER_URL` (no Vercel)
  - Chaves Anthropic, Supabase `SERVICE_ROLE_KEY` e `RESEND_API_KEY` (no Railway/Run).
4. **Deploy e Cron Externos**: Hospedar o Worker Python exposto publicamente no Railway/Fly e assinar os eventos CRON diários nas rotas `scheduler`, `recover`, etc (no `web/src/app/api/reports/...`). É necessário ter um trigger temporal como Vercel Cron ou cron-job.org.
5. **Teste de Carga & Network (gTTS e ReportLab)**: Em ambientes headless Linux puros (como Railway), a geração de PDFs (ReportLab com fontes personalizadas) e a requisição do Google TTS (`gTTS`) costumam engasgar por timeouts de firewall ou falta de pacotes OS (embora o `Dockerfile` documentado preveja `fonts-liberation` e `libfreetype6-dev`, é bom testar na prática).

---

## 📊 4. Conclusão da Auditoria

### Pontos Fortes
- **Resiliência:** A adoção do `BackgroundTasks` no FastAPI (`worker_server.py`) somado aos retries do Frontend (`report-generation.ts`) cria um processo de job assíncrono extremamente seguro que não dará timeout em requests Vercel (limite de 10 a 60s).
- **Abstração Limpa:** Os padrões e isolamento de RLS estão de acordo com o `RULEBOOK — Engenharia Guilds`.

### Próximo Passo Recomendado
1. Escrever o SQL que adiciona os campos *Retrospective* e *External Intelligence* à tabela `reports` antes de sequer tentar rodar a geração (mesmo que em dev).
2. Proceder aos deploys com as variáveis populadas como descrito na Seção 1 e 2 das "Pendências".
3. Validar a primeira geração (End-to-End).
