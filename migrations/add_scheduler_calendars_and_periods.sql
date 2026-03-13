-- Migration: add_scheduler_calendars_and_periods
-- Aplicar via Supabase Dashboard > SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS scheduler_blackout_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduler_blackout_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduler_blackout_reason TEXT;

CREATE TABLE IF NOT EXISTS public.scheduler_holidays (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  holiday_date  DATE NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_holidays_active_date
  ON public.scheduler_holidays(is_active, holiday_date);

ALTER TABLE public.scheduler_holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia scheduler holidays" ON public.scheduler_holidays;
CREATE POLICY "Admin gerencia scheduler holidays"
  ON public.scheduler_holidays FOR ALL
  USING (public.is_admin());
