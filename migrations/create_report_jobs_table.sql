-- Migration: create_report_jobs_table
-- Aplicar via Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.report_jobs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id            UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_id            UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  initiated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_source       TEXT NOT NULL,
  job_kind             TEXT NOT NULL,
  status               TEXT NOT NULL,
  reason               TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at           TIMESTAMPTZ,
  finished_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_client_id
  ON public.report_jobs(client_id);

CREATE INDEX IF NOT EXISTS idx_report_jobs_report_id
  ON public.report_jobs(report_id);

CREATE INDEX IF NOT EXISTS idx_report_jobs_status_created_at
  ON public.report_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_jobs_source_created_at
  ON public.report_jobs(trigger_source, created_at DESC);

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia report jobs" ON public.report_jobs;
CREATE POLICY "Admin gerencia report jobs"
  ON public.report_jobs FOR ALL
  USING (public.is_admin());
