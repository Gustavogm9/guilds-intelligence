-- Migration: add_scheduler_policy_defaults
-- Aplicar via Supabase Dashboard > SQL Editor

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS scheduler_default_timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS scheduler_default_window_start_hour INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS scheduler_default_window_end_hour INTEGER NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS scheduler_default_business_days_only BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS scheduler_default_weekday INTEGER,
  ADD COLUMN IF NOT EXISTS scheduler_default_day_of_month INTEGER;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS scheduler_paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduler_pause_reason TEXT;

ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_scheduler_default_window_start_hour_check,
  DROP CONSTRAINT IF EXISTS plans_scheduler_default_window_end_hour_check,
  DROP CONSTRAINT IF EXISTS plans_scheduler_default_weekday_check,
  DROP CONSTRAINT IF EXISTS plans_scheduler_default_day_of_month_check;

ALTER TABLE public.plans
  ADD CONSTRAINT plans_scheduler_default_window_start_hour_check
    CHECK (scheduler_default_window_start_hour BETWEEN 0 AND 23),
  ADD CONSTRAINT plans_scheduler_default_window_end_hour_check
    CHECK (scheduler_default_window_end_hour BETWEEN 0 AND 23),
  ADD CONSTRAINT plans_scheduler_default_weekday_check
    CHECK (scheduler_default_weekday IS NULL OR scheduler_default_weekday BETWEEN 0 AND 6),
  ADD CONSTRAINT plans_scheduler_default_day_of_month_check
    CHECK (scheduler_default_day_of_month IS NULL OR scheduler_default_day_of_month BETWEEN 1 AND 28);
