# Guilds Intelligence Engine — Technical Specification
> Versão 1.0 · Março 2026 · Para uso com Google Antigravity + Supabase

---

## 1. Visão Geral do Produto

O **Guilds Intelligence Engine** é uma plataforma SaaS B2B que automatiza a geração de relatórios personalizados de inteligência de mercado para clientes da Guilds. Gustavo (admin) cadastra clientes, configura perfis e planos. Os relatórios são gerados por scripts Python (IA + pesquisa web) e entregues em múltiplos formatos: PDF, WhatsApp copy, áudio MP3, e pack de social media (cards + story + copy).

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 14+ (App Router, TypeScript) | SSR, routing, DX |
| UI Components | shadcn/ui + Tailwind CSS | Design system pronto |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | BaaS completo, RLS nativo |
| Scripts de IA | Python 3.11+ (scripts existentes) | Já implementado |
| Bridge Python↔Supabase | Supabase Python Client (`supabase-py`) | Escrita direta no banco |
| File Storage | Supabase Storage | PDFs, áudios, imagens |
| Deploy Frontend | Vercel | CI/CD automático |
| Deploy Python Scripts | Railway ou Cloud Run | Container simples |
| Scheduled Jobs | Claude Scheduled Task (já existe) + pg_cron | Relatório diário às 8h |
| Email | Resend API | Transacional simples |

---

## 3. Roles e Autenticação

### 3.1 Roles

| Role | Quem | Acesso |
|---|---|---|
| `admin` | Gustavo (único) | Painel completo: clientes, relatórios, planos, billing |
| `client` | Empresa contratante | Apenas seus próprios relatórios e perfil |

### 3.2 Fluxo de Auth

- Supabase Auth com **email + senha**
- Admin é criado manualmente na primeira vez (seed)
- Clientes recebem convite por email (Supabase `inviteUserByEmail`)
- Role armazenada em `public.profiles.role` (enum: `admin`, `client`)
- RLS usa `auth.uid()` e `profiles.role` para isolar dados

### 3.3 Proteção de Rotas (Next.js)

```
/admin/*        → só role = admin
/dashboard/*    → só role = client
/login          → público
/invite/*       → público (aceitar convite)
```

---

## 4. Telas do Produto

### 4.1 Área Admin (`/admin`)

#### `/admin` — Dashboard
- MRR do mês atual
- Total de clientes ativos por plano
- Relatórios gerados no mês
- Custo estimado de tokens do mês
- Últimos 5 relatórios gerados (tabela)
- Botão: "Gerar relatório manual"

#### `/admin/clients` — Lista de Clientes
- Tabela: nome, empresa, plano, último relatório, status (ativo/inativo)
- Filtros: plano, setor, status
- Botão: "Novo cliente"

#### `/admin/clients/[id]` — Perfil do Cliente
- Visualização e edição de todos os campos do `profile.json`
- Nichos mapeados (editáveis como tags)
- Histórico de relatórios do cliente
- Botão: "Gerar relatório agora"
- Status do plano e data de renovação
- Botão: "Enviar relatório mais recente por email"

#### `/admin/clients/new` — Novo Cliente
- Formulário: nome do contato, empresa, email, plano
- Campo de texto livre: "Cole aqui qualquer informação sobre o cliente" (o agente mapeia os nichos automaticamente)
- Ao salvar: cria usuário Supabase Auth + convida por email + cria `profile.json`

#### `/admin/reports` — Todos os Relatórios
- Tabela: cliente, data, plano, arquivos gerados, custo de tokens
- Filtros: cliente, mês, plano
- Cada linha: links de download para PDF, áudio, social media zip

#### `/admin/reports/[id]` — Relatório Individual
- Preview do PDF One Page inline
- Botões de download para cada formato
- Custo de tokens detalhado
- Status de entrega (email enviado? WhatsApp enviado?)
- Botão: "Reenviar por email"

#### `/admin/plans` — Gerenciar Planos
- Tabela editável com os planos (nome, preço, limite de relatórios/mês, formatos incluídos)
- Toggle: plano ativo/inativo
- Os dados editados aqui atualizam a tabela `plans` no banco

#### `/admin/portfolio` — Produtos Guilds
- Visual editor para o `guilds_portfolio.json`
- Cards editáveis para cada produto (nome, descrição, público-alvo, ticket médio)
- Toggle: ativo/inativo

#### `/admin/billing` — Log de Cobrança
- Por cliente: relatórios gerados no mês, plano, valor a cobrar
- Export CSV para NF/faturamento
- Alertas: cliente perto do limite do plano

---

### 4.2 Área Cliente (`/dashboard`)

#### `/dashboard` — Dashboard do Cliente
- Último relatório: título, data, 3 insights destacados
- Botão: "Ver relatório completo"
- Botão: "Solicitar deep dive"
- Número de relatórios restantes no mês

#### `/dashboard/reports` — Meus Relatórios
- Lista de todos os relatórios do cliente
- Por relatório: data, título, formatos disponíveis para download
- Player de áudio inline para o MP3
- Preview do One Page PDF inline

#### `/dashboard/reports/[id]` — Relatório Completo
- PDF Completo em iframe ou embed
- Downloads: PDF One Page, Áudio MP3, Social Media Pack (zip)
- Cards de social media em preview (imagens)
- Copy para Instagram e WhatsApp em campos copiáveis

#### `/dashboard/deep-dive` — Solicitar Deep Dive
- Campo de texto: "Sobre qual tema do seu último relatório você quer aprofundar?"
- Select: relatório de referência
- Submit: cria `deep_dive_requests` com status `pending`
- Lista de deep dives anteriores com status (pending / em andamento / entregue)

#### `/dashboard/profile` — Meu Perfil
- Visualização do perfil da empresa (somente leitura para cliente)
- Para editar: "Envie uma mensagem para a Guilds" (abre WhatsApp ou email)

---

## 5. Schema do Banco de Dados

> Ver arquivo `DATABASE_SCHEMA.sql` para o SQL completo com RLS.

### Tabelas principais:

- `profiles` — extensão de `auth.users` com role e metadados
- `plans` — planos disponíveis (Essencial, Crescimento, Profissional, Studio)
- `clients` — perfil completo da empresa cliente
- `client_niches` — nichos mapeados por cliente (many-to-many)
- `reports` — metadados de cada relatório gerado
- `report_files` — arquivos individuais de cada relatório (PDF, áudio, imagens)
- `deep_dive_requests` — solicitações de deep dive pelos clientes
- `billing_log` — eventos de geração para controle de cobrança
- `portfolio_products` — produtos Guilds (sincronizado com portfolio.json)

---

## 6. Fluxo de Geração de Relatório

### 6.1 Gatilho Manual (Admin)

```
Admin clica "Gerar relatório" para cliente X
  → Frontend chama POST /api/reports/generate { client_id }
  → API valida plano e limites (billing_log do mês)
  → Insere reports row com status = "processing"
  → Chama Python worker via webhook (Railway/Cloud Run)
    → Worker lê client profile do Supabase
    → Executa gerar_relatorio_cliente.py
    → Executa gerar_social_media.py
    → Faz upload dos arquivos para Supabase Storage
    → Atualiza reports row com status = "done" + file_paths
    → Insere billing_log row
  → Frontend recebe status via Supabase Realtime
  → Se email configurado: Resend envia email com links de download
```

### 6.2 Gatilho Automático (Claude Scheduled Task)

O scheduled task existente (Claude Agent às 8h) continua funcionando. Após gerar os arquivos localmente, usa `supabase-py` para:
1. Criar row em `reports`
2. Fazer upload dos arquivos para Supabase Storage
3. Criar rows em `report_files`
4. Inserir em `billing_log`

### 6.3 Deep Dive

```
Cliente submete formulário
  → Cria deep_dive_requests row (status: pending)
  → Admin vê no painel (badge de notificação)
  → Admin executa manualmente o deep dive
  → Faz upload do resultado
  → Atualiza status → "delivered"
  → Cliente recebe notificação por email
```

---

## 7. Estrutura de Arquivos no Supabase Storage

```
reports/
  {client_id}/
    {report_id}/
      relatorio_completo.pdf
      relatorio_onepage.pdf
      audio_briefing.mp3
      whatsapp_copy.txt
      social_media/
        cover_card.png
        insight_1.png
        insight_2.png
        insight_3.png
        insight_4.png
        insight_5.png
        oportunidade_card.png
        alerta_card.png
        story.png
        copies_social_media.txt
```

Buckets:
- `reports` — privado, acesso via signed URLs (expiram em 24h)
- `logos` — público, logos dos clientes para os cards

---

## 8. API Endpoints (Next.js Route Handlers)

```
POST   /api/reports/generate          → dispara geração de relatório
GET    /api/reports/[id]/download     → retorna signed URL dos arquivos
POST   /api/clients                   → cria novo cliente + convida usuário
PATCH  /api/clients/[id]              → atualiza perfil do cliente
POST   /api/deep-dives                → cria solicitação de deep dive
PATCH  /api/deep-dives/[id]           → admin atualiza status do deep dive
GET    /api/billing/export            → CSV do log de cobrança do mês
POST   /api/reports/[id]/send-email   → reenviar relatório por email
```

Supabase Client (frontend direto, via RLS):
- Leitura de `reports`, `report_files`, `plans`, `clients` — sem passar pela API
- Realtime subscription em `reports.status` para live updates

---

## 9. Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # só no backend/scripts

# Python Worker
PYTHON_WORKER_URL=                 # URL do serviço Railway/Cloud Run
PYTHON_WORKER_SECRET=              # HMAC secret para autenticar chamadas

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@guilds.com.br

# IA (para os scripts Python)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
ADMIN_EMAIL=                       # email do Gustavo para seed
```

---

## 10. Estrutura de Pastas do Projeto (Next.js)

```
guilds-intelligence/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── invite/page.tsx
│   ├── admin/
│   │   ├── layout.tsx             # guard: só admin
│   │   ├── page.tsx               # dashboard admin
│   │   ├── clients/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── plans/page.tsx
│   │   ├── portfolio/page.tsx
│   │   └── billing/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx             # guard: só client
│   │   ├── page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── deep-dive/page.tsx
│   │   └── profile/page.tsx
│   └── api/
│       ├── reports/
│       │   ├── generate/route.ts
│       │   └── [id]/
│       │       ├── download/route.ts
│       │       └── send-email/route.ts
│       ├── clients/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── deep-dives/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       └── billing/
│           └── export/route.ts
├── components/
│   ├── ui/                        # shadcn components
│   ├── admin/                     # componentes da área admin
│   └── client/                    # componentes da área cliente
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # browser client
│   │   ├── server.ts              # server client
│   │   └── middleware.ts          # auth middleware
│   ├── types/
│   │   └── database.ts            # tipos gerados pelo Supabase CLI
│   └── utils/
│       ├── billing.ts
│       └── plans.ts
├── python/                        # scripts existentes
│   ├── gerar_relatorio_cliente.py
│   ├── gerar_social_media.py
│   └── worker_server.py           # FastAPI wrapper para Railway
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
└── ...config files
```

---

## 11. Python Worker (Railway)

Os scripts Python existentes precisam de um wrapper HTTP simples para receber chamadas do Next.js:

```python
# worker_server.py — FastAPI mínimo
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import hmac, hashlib, asyncio

app = FastAPI()

class ReportRequest(BaseModel):
    client_id: str
    report_id: str

@app.post("/generate")
async def generate_report(
    req: ReportRequest,
    x_worker_secret: str = Header(...)
):
    # valida HMAC secret
    # chama gerar_relatorio_cliente.py com client_id
    # script já faz upload para Supabase Storage e atualiza reports table
    ...
```

Deploy: `Dockerfile` simples com Python 3.11 + dependências existentes + FastAPI.

---

## 12. Configuração Inicial (Seed)

Ao fazer o primeiro deploy:

```sql
-- seed.sql
-- Inserir planos padrão
INSERT INTO plans (name, price_monthly, reports_per_month, formats) VALUES
  ('Essencial',    297,  1, '{"pdf", "whatsapp"}'),
  ('Crescimento',  597,  2, '{"pdf", "whatsapp", "audio"}'),
  ('Profissional', 997,  4, '{"pdf", "whatsapp", "audio", "social_media"}'),
  ('Studio',      2197, 12, '{"pdf", "whatsapp", "audio", "social_media", "deep_dive_unlimited"}');
```

```bash
# Criar conta admin via Supabase CLI
supabase functions invoke create-admin --body '{"email":"gustavo@guilds.com.br"}'
```

---

## 13. Checklist de Entrega (para o Engenheiro)

- [ ] Supabase project criado e schema aplicado
- [ ] RLS policies testadas para admin e client
- [ ] Next.js scaffolded com shadcn/ui
- [ ] Auth funcionando (login, invite, guard de rotas)
- [ ] CRUD de clientes (admin)
- [ ] Geração de relatório disparando worker Python
- [ ] Upload de arquivos para Supabase Storage
- [ ] Downloads via signed URLs funcionando
- [ ] Dashboard do cliente com seus relatórios
- [ ] Área de deep dive (request + admin response)
- [ ] Billing log e export CSV
- [ ] Email transacional via Resend
- [ ] Deploy: Vercel (frontend) + Railway (Python worker)
- [ ] Variáveis de ambiente configuradas em produção

---

## 14. Referências de Arquivos Existentes

| Arquivo | Localização | Uso |
|---|---|---|
| Script de relatório | `python/gerar_relatorio_cliente.py` | Core da geração |
| Script social media | `python/gerar_social_media.py` | Cards e stories |
| Exemplo de perfil | `ClientIntelligence/clients/exemplo-cliente/profile.json` | Referência de schema |
| Portfolio de produtos | `ClientIntelligence/guilds_portfolio.json` | Seed da tabela `portfolio_products` |
| Fluxo do projeto | `ClientIntelligence/FLUXO_DO_PROJETO.html` | Contexto de negócio |
| Precificação | `ClientIntelligence/ESTRATEGIA_PRECIFICACAO.html` | Planos e preços |
