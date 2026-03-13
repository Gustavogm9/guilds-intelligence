ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS external_signal_summary TEXT,
  ADD COLUMN IF NOT EXISTS external_intelligence_mode TEXT;
