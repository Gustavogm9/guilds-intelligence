ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS hypotheses JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrospective_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrospective_summary TEXT,
  ADD COLUMN IF NOT EXISTS retrospective_score NUMERIC(6,2) NOT NULL DEFAULT 0;
