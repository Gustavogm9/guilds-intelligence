ALTER TABLE public.social_publications
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC(10,2);
