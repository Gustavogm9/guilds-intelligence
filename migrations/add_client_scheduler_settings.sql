-- Migration: add_client_scheduler_settings
-- Aplicar via Supabase Dashboard > SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS scheduler_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS scheduler_timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS scheduler_window_start_hour INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS scheduler_window_end_hour INTEGER NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS scheduler_business_days_only BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS scheduler_preferred_weekday INTEGER,
  ADD COLUMN IF NOT EXISTS scheduler_preferred_day_of_month INTEGER;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_scheduler_window_start_hour_check,
  DROP CONSTRAINT IF EXISTS clients_scheduler_window_end_hour_check,
  DROP CONSTRAINT IF EXISTS clients_scheduler_preferred_weekday_check,
  DROP CONSTRAINT IF EXISTS clients_scheduler_preferred_day_of_month_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_scheduler_window_start_hour_check
    CHECK (scheduler_window_start_hour BETWEEN 0 AND 23),
  ADD CONSTRAINT clients_scheduler_window_end_hour_check
    CHECK (scheduler_window_end_hour BETWEEN 0 AND 23),
  ADD CONSTRAINT clients_scheduler_preferred_weekday_check
    CHECK (scheduler_preferred_weekday IS NULL OR scheduler_preferred_weekday BETWEEN 0 AND 6),
  ADD CONSTRAINT clients_scheduler_preferred_day_of_month_check
    CHECK (scheduler_preferred_day_of_month IS NULL OR scheduler_preferred_day_of_month BETWEEN 1 AND 28);

CREATE INDEX IF NOT EXISTS idx_clients_scheduler_enabled
  ON public.clients(scheduler_enabled)
  WHERE is_active = TRUE;
