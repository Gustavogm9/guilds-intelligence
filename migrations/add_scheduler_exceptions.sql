-- Migration: add_scheduler_exceptions
-- Aplicar via Supabase Dashboard > SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS scheduler_skip_dates DATE[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scheduler_blackout_weekdays INTEGER[] NOT NULL DEFAULT '{}';

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_scheduler_blackout_weekdays_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_scheduler_blackout_weekdays_check
    CHECK (scheduler_blackout_weekdays <@ ARRAY[0,1,2,3,4,5,6]::INTEGER[]);
