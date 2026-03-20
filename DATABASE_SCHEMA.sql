-- ============================================================
-- GUILDS INTELLIGENCE ENGINE — Supabase Database Schema
-- Versão 1.0 · Março 2026
-- Aplicar via: supabase/migrations/001_initial_schema.sql
-- Este arquivo representa o baseline documental do schema.
-- O estado operacional real depende tambem das migrations em /migrations.
-- Ver tambem: docs/SCHEMA_COMPATIBILITY_MATRIX_2026-03-12.md
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'client');
CREATE TYPE report_status AS ENUM ('queued', 'processing', 'done', 'error');
CREATE TYPE file_type AS ENUM ('pdf_full', 'pdf_onepage', 'audio_mp3', 'whatsapp_txt', 'social_card', 'social_story', 'social_copy_txt', 'social_zip');
CREATE TYPE deep_dive_status AS ENUM ('pending', 'in_progress', 'delivered', 'cancelled');
CREATE TYPE plan_format AS ENUM ('pdf', 'whatsapp', 'audio', 'social_media', 'deep_dive_unlimited');

-- ============================================================
-- TABELA: profiles
-- Extensão de auth.users com role e metadados
-- ============================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'client',
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-criar profile ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABELA: plans
-- Planos de assinatura disponíveis
-- ============================================================

CREATE TABLE public.plans (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL UNIQUE,           -- 'Essencial', 'Crescimento', etc.
  price_monthly        INTEGER NOT NULL,               -- em centavos (29700 = R$297)
  price_annual         INTEGER,                        -- desconto anual, em centavos
  reports_per_month    INTEGER NOT NULL,               -- limite de relatórios/mês
  max_niches           INTEGER NOT NULL DEFAULT 7,     -- max nichos mapeados
  max_client_profiles  INTEGER NOT NULL DEFAULT 1,     -- para plano Studio: múltiplos
  formats              plan_format[] NOT NULL,         -- formatos incluídos
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: coupons
-- Cupons de desconto para clientes
-- ============================================================

CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed_amount');

CREATE TABLE public.coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,               -- ex: 'GRUPO-NETWORKING', 'AMIGOS-GUILDS'
  description     TEXT,                               -- descrição interna do cupom
  discount_type   coupon_type NOT NULL DEFAULT 'percentage',
  discount_value  INTEGER NOT NULL,                   -- se percentage: 1-100, se fixed_amount: em centavos
  is_permanent    BOOLEAN NOT NULL DEFAULT TRUE,      -- desconto permanente (vale enquanto assinatura ativa)
  max_uses        INTEGER,                            -- NULL = ilimitado
  current_uses    INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,                        -- NULL = sem expiração
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: clients
-- Perfil completo da empresa contratante
-- ============================================================

CREATE TABLE public.clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- login do cliente
  plan_id             UUID NOT NULL REFERENCES public.plans(id),
  coupon_id           UUID REFERENCES public.coupons(id),  -- cupom aplicado

  -- Dados da empresa
  company_name        TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL UNIQUE,
  contact_phone       TEXT,
  logo_url            TEXT,                            -- Supabase Storage: logos/{client_id}/logo.png

  -- Perfil do negócio (equivale ao profile.json)
  industry            TEXT,                            -- ex: "HealthTech", "SaaS B2B"
  company_size        TEXT,                            -- ex: "10-50 funcionários"
  annual_revenue      TEXT,                            -- ex: "R$2M-R$10M"
  location            TEXT,
  description         TEXT,                            -- o que a empresa faz
  products_services   TEXT,                            -- produtos/serviços do cliente
  target_audience     TEXT,

  -- Objetivos e dores
  goals_2026          TEXT[],                          -- array de objetivos
  pain_points         TEXT[],                          -- array de dores

  -- Configurações
  preferred_language  TEXT NOT NULL DEFAULT 'pt-BR',
  content_tone        TEXT DEFAULT 'profissional',     -- 'profissional', 'direto', 'didático'
  raw_onboarding_text TEXT,                            -- texto bruto do onboarding (qualquer formato)

  -- Desconto
  discount_percent    INTEGER DEFAULT 0,               -- desconto permanente aplicado (0-100)

  -- Status
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  plan_started_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_renewed_at     DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: client_niches
-- Nichos mapeados pela IA para cada cliente
-- ============================================================

CREATE TABLE public.client_niches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  niche_name  TEXT NOT NULL,                           -- ex: "Tecnologia na Saúde"
  relevance   TEXT DEFAULT 'primary',                 -- 'primary', 'secondary', 'indirect'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (client_id, niche_name)
);

-- ============================================================
-- TABELA: deep_dive_requests
-- Solicitações de deep dive feitas pelos clientes
-- (CRIADA ANTES de reports para evitar dependência circular)
-- ============================================================

CREATE TABLE public.deep_dive_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  topic           TEXT NOT NULL,                      -- o que o cliente quer aprofundar
  context         TEXT,                               -- contexto adicional

  status          deep_dive_status NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,                               -- notas internas do admin

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ
);

-- ============================================================
-- TABELA: reports
-- Metadados de cada relatório gerado
-- ============================================================

CREATE TABLE public.reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Metadados
  title           TEXT,                               -- título gerado pelo agente
  summary         TEXT,                               -- resumo executivo (3-5 linhas)
  insights_count  INTEGER DEFAULT 0,
  niches_covered  TEXT[],                             -- nichos pesquisados neste relatório

  -- Status
  status          report_status NOT NULL DEFAULT 'queued',
  error_message   TEXT,                               -- se status = 'error'

  -- Uso e custos
  tokens_input    INTEGER DEFAULT 0,
  tokens_output   INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4) DEFAULT 0,

  -- Entrega
  email_sent_at   TIMESTAMPTZ,
  whatsapp_sent   BOOLEAN DEFAULT FALSE,

  -- Tipo
  is_deep_dive        BOOLEAN DEFAULT FALSE,
  deep_dive_request_id UUID REFERENCES public.deep_dive_requests(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- FK de deep_dive_requests referenciando reports (adicionada via ALTER para evitar referência circular)
ALTER TABLE public.deep_dive_requests
  ADD COLUMN reference_report_id UUID REFERENCES public.reports(id);

-- ============================================================
-- TABELA: report_files
-- Arquivos individuais de cada relatório no Supabase Storage
-- ============================================================

CREATE TABLE public.report_files (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  file_type   file_type NOT NULL,
  storage_path TEXT NOT NULL,                         -- ex: reports/{client_id}/{report_id}/relatorio_completo.pdf
  file_size   INTEGER,                                -- bytes
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: shared_reports
-- Links públicos gerados para relatórios (Fase 6.1)
-- ============================================================

CREATE TABLE public.shared_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela de Notificações In-App
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- TABELA: niche_intelligence_nodes
-- Armazena os hubs globais de inteligência
-- ============================================================

CREATE TABLE IF NOT EXISTS public.niche_intelligence_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    summary TEXT,
    source_name TEXT,
    region TEXT DEFAULT 'GLOBAL',
    language TEXT DEFAULT 'en',
    predictive_score INTEGER DEFAULT 50,
    is_trend BOOLEAN DEFAULT FALSE,
    theme TEXT,
    matched_keywords TEXT[],
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: billing_log
-- Eventos de geração para controle de cobrança
-- ============================================================

CREATE TABLE public.billing_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_id       UUID REFERENCES public.reports(id),
  plan_id         UUID NOT NULL REFERENCES public.plans(id),

  billing_month   DATE NOT NULL,                      -- primeiro dia do mês de referência
  event_type      TEXT NOT NULL DEFAULT 'report_generated',

  -- Para auditoria de faturamento
  plan_name       TEXT NOT NULL,                      -- snapshot do plano na época
  plan_price      INTEGER NOT NULL,                   -- snapshot do preço

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: portfolio_products
-- Produtos Guilds para recomendação nos relatórios
-- Espelha o guilds_portfolio.json
-- ============================================================

CREATE TABLE public.portfolio_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_key     TEXT NOT NULL UNIQUE,               -- ex: 'guilds_academy'
  name            TEXT NOT NULL,
  category        TEXT,
  description     TEXT,
  target_audience TEXT,
  use_cases       TEXT[],
  format          TEXT,
  avg_ticket      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- Resumo de uso mensal por cliente
CREATE VIEW public.monthly_usage AS
SELECT
  c.id AS client_id,
  c.company_name,
  p.name AS plan_name,
  p.reports_per_month AS plan_limit,
  DATE_TRUNC('month', NOW()) AS current_month,
  COUNT(r.id) FILTER (
    WHERE r.created_at >= DATE_TRUNC('month', NOW())
    AND r.status = 'done'
  ) AS reports_used,
  p.reports_per_month - COUNT(r.id) FILTER (
    WHERE r.created_at >= DATE_TRUNC('month', NOW())
    AND r.status = 'done'
  ) AS reports_remaining
FROM public.clients c
JOIN public.plans p ON c.plan_id = p.id
LEFT JOIN public.reports r ON c.id = r.client_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.company_name, p.name, p.reports_per_month;

-- MRR atual
CREATE VIEW public.current_mrr AS
SELECT
  SUM(p.price_monthly) / 100.0 AS mrr_brl,
  COUNT(c.id) AS active_clients
FROM public.clients c
JOIN public.plans p ON c.plan_id = p.id
WHERE c.is_active = TRUE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_dive_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_products ENABLE ROW LEVEL SECURITY;

-- Helper: checar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: pegar client_id do usuário logado
CREATE OR REPLACE FUNCTION public.my_client_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Funções Trend Radar
CREATE OR REPLACE FUNCTION public.get_client_niche_radar_data(p_client_niche_id UUID)
RETURNS TABLE (
    theme TEXT,
    avg_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(n.theme, 'Geral'),
        ROUND(AVG(n.predictive_score), 2)
    FROM public.niche_intelligence_nodes n
    JOIN public.client_niche_topic_map m ON m.topic_id = n.topic_id
    WHERE m.client_niche_id = p_client_niche_id
    GROUP BY COALESCE(n.theme, 'Geral')
    ORDER BY avg_score DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_niche_line_data(p_client_niche_id UUID)
RETURNS TABLE (
    period DATE,
    avg_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(date_trunc('week', COALESCE(n.published_at, n.created_at))),
        ROUND(AVG(n.predictive_score), 2)
    FROM public.niche_intelligence_nodes n
    JOIN public.client_niche_topic_map m ON m.topic_id = n.topic_id
    WHERE m.client_niche_id = p_client_niche_id
    GROUP BY DATE(date_trunc('week', COALESCE(n.published_at, n.created_at)))
    ORDER BY DATE(date_trunc('week', COALESCE(n.published_at, n.created_at))) ASC
    LIMIT 12;
END;
$$;

-- ---- profiles ----
CREATE POLICY "Usuário vê apenas seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin gerencia perfis"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ---- plans ----
CREATE POLICY "Todos podem ver planos ativos"
  ON public.plans FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Só admin gerencia planos"
  ON public.plans FOR ALL
  USING (public.is_admin());

-- ---- coupons ----
CREATE POLICY "Só admin gerencia cupons"
  ON public.coupons FOR ALL
  USING (public.is_admin());

CREATE POLICY "Todos podem validar cupom ativo"
  ON public.coupons FOR SELECT
  USING (
    is_active = TRUE
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
  );

-- ---- clients ----
CREATE POLICY "Admin vê todos os clientes"
  ON public.clients FOR ALL
  USING (public.is_admin());

CREATE POLICY "Cliente vê apenas seus próprios dados"
  ON public.clients FOR SELECT
  USING (user_id = auth.uid());

-- ---- client_niches ----
CREATE POLICY "Admin gerencia nichos"
  ON public.client_niches FOR ALL
  USING (public.is_admin());

CREATE POLICY "Cliente vê seus nichos"
  ON public.client_niches FOR SELECT
  USING (client_id = public.my_client_id());

-- ---- reports ----
CREATE POLICY "Admin gerencia relatórios"
  ON public.reports FOR ALL
  USING (public.is_admin());

CREATE POLICY "Cliente vê seus relatórios"
  ON public.reports FOR SELECT
  USING (client_id = public.my_client_id() AND status = 'done');

-- ---- report_files ----
CREATE POLICY "Admin gerencia arquivos"
  ON public.report_files FOR ALL
  USING (public.is_admin());

CREATE POLICY "Cliente vê arquivos de seus relatórios"
  ON public.report_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
      AND r.client_id = public.my_client_id()
    )
  );

-- ---- shared_reports ----
CREATE POLICY "Users can manage own shared reports"
  ON public.shared_reports FOR ALL
  USING (
    auth.uid() = created_by OR
    public.is_admin()
  )
  WITH CHECK (
    auth.uid() = created_by OR
    public.is_admin()
  );

CREATE POLICY "Anon can select shared report by token"
  ON public.shared_reports FOR SELECT
  USING (
    (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
  );

-- ---- user_notifications ----
CREATE POLICY "Users can view own notifications"
    ON public.user_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.user_notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ---- deep_dive_requests ----
CREATE POLICY "Admin gerencia deep dives"
  ON public.deep_dive_requests FOR ALL
  USING (public.is_admin());

CREATE POLICY "Cliente gerencia seus deep dives"
  ON public.deep_dive_requests FOR ALL
  USING (client_id = public.my_client_id());

-- ---- billing_log ----
CREATE POLICY "Só admin vê billing"
  ON public.billing_log FOR ALL
  USING (public.is_admin());

-- ---- portfolio_products ----
CREATE POLICY "Todos veem produtos ativos"
  ON public.portfolio_products FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Só admin gerencia portfolio"
  ON public.portfolio_products FOR ALL
  USING (public.is_admin());

-- ============================================================
-- SUPABASE STORAGE POLICIES
-- ============================================================

-- Bucket: reports (privado)
-- Criar via Supabase Dashboard ou CLI:
-- supabase storage create-bucket reports --private

-- Policy: admin acessa tudo
-- Policy: cliente acessa apenas seu próprio diretório
-- (configurar via Dashboard > Storage > Policies)
-- Caminho do cliente: reports/{client_id}/*

-- Bucket: logos (público)
-- supabase storage create-bucket logos --public

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_plan_id ON public.clients(plan_id);
CREATE INDEX idx_clients_coupon_id ON public.clients(coupon_id);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_reports_client_id ON public.reports(client_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_report_files_report_id ON public.report_files(report_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_token ON public.shared_reports(token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_expires_at ON public.shared_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX idx_billing_log_client_month ON public.billing_log(client_id, billing_month);
CREATE INDEX idx_deep_dives_client_id ON public.deep_dive_requests(client_id);
CREATE INDEX idx_deep_dives_status ON public.deep_dive_requests(status);

-- ============================================================
-- SEED: Planos iniciais
-- ============================================================

INSERT INTO public.plans (name, price_monthly, price_annual, reports_per_month, max_niches, max_client_profiles, formats) VALUES
(
  'Essencial',
  29700,   -- R$297
  24700,   -- R$247 no anual
  1,
  5,
  1,
  ARRAY['pdf', 'whatsapp']::plan_format[]
),
(
  'Crescimento',
  59700,   -- R$597
  49700,   -- R$497 no anual
  2,
  7,
  1,
  ARRAY['pdf', 'whatsapp', 'audio']::plan_format[]
),
(
  'Profissional',
  99700,   -- R$997
  82700,   -- R$827 no anual
  4,
  10,
  1,
  ARRAY['pdf', 'whatsapp', 'audio', 'social_media']::plan_format[]
),
(
  'Studio',
  219700,  -- R$2.197
  179700,  -- R$1.797 no anual
  12,
  15,
  3,
  ARRAY['pdf', 'whatsapp', 'audio', 'social_media', 'deep_dive_unlimited']::plan_format[]
);

-- ============================================================
-- SEED: Cupom do grupo de networking
-- ============================================================

INSERT INTO public.coupons (code, description, discount_type, discount_value, is_permanent) VALUES
('GRUPO-NETWORKING', 'Desconto exclusivo para membros do grupo de networking. Permanente enquanto assinatura ativa.', 'percentage', 17, TRUE);
-- 17% de desconto = R$297→R$247, R$597→R$497, R$997→R$827, R$2.197→R$1.797 (aprox)

-- ============================================================
-- FUNÇÕES AUXILIARES: Preço com desconto
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_discounted_price(
  base_price INTEGER,
  p_discount_percent INTEGER DEFAULT 0,
  p_coupon_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  coupon_discount INTEGER := 0;
  total_discount INTEGER;
  final_price INTEGER;
BEGIN
  -- Buscar desconto do cupom se existir
  IF p_coupon_id IS NOT NULL THEN
    SELECT COALESCE(c.discount_value, 0)
    INTO coupon_discount
    FROM public.coupons c
    WHERE c.id = p_coupon_id
      AND c.is_active = TRUE
      AND c.discount_type = 'percentage'
      AND (c.valid_until IS NULL OR c.valid_until > NOW());
  END IF;

  -- Usar o maior desconto entre o permanente e o do cupom
  total_discount := GREATEST(p_discount_percent, coupon_discount);

  -- Calcular preço final
  final_price := base_price - (base_price * total_discount / 100);

  RETURN GREATEST(final_price, 0);  -- nunca negativo
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- View: preço efetivo por cliente (com desconto aplicado)
CREATE VIEW public.client_effective_pricing AS
SELECT
  c.id AS client_id,
  c.company_name,
  p.name AS plan_name,
  p.price_monthly AS price_original,
  c.discount_percent,
  co.code AS coupon_code,
  co.discount_value AS coupon_discount,
  public.get_discounted_price(p.price_monthly, c.discount_percent, c.coupon_id) AS price_effective,
  p.price_monthly - public.get_discounted_price(p.price_monthly, c.discount_percent, c.coupon_id) AS savings
FROM public.clients c
JOIN public.plans p ON c.plan_id = p.id
LEFT JOIN public.coupons co ON c.coupon_id = co.id
WHERE c.is_active = TRUE;
