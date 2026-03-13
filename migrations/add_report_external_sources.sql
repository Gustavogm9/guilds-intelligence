ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS external_sources JSONB,
  ADD COLUMN IF NOT EXISTS external_signal_count INTEGER NOT NULL DEFAULT 0;
