-- Migration: create_funnel_events_table
-- Aplicar via Supabase Dashboard > SQL Editor

CREATE TABLE public.funnel_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,  -- landing_view, modal_open, lead_submit, signup_complete, onboarding_complete, first_report_view
  session_id    TEXT,           -- ID anônimo da sessão (gerado client-side)
  client_id     UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',  -- dados extras (page, referrer, plan, etc)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries rápidas de funil
CREATE INDEX idx_funnel_events_type ON public.funnel_events(event_type);
CREATE INDEX idx_funnel_events_created ON public.funnel_events(created_at DESC);
CREATE INDEX idx_funnel_events_session ON public.funnel_events(session_id);

-- RLS: insert liberado para anônimos (tracking público), select apenas admin
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert funnel events"
  ON public.funnel_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can read funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
