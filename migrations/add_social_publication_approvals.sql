ALTER TABLE public.social_publications
  ADD COLUMN IF NOT EXISTS requires_second_review BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approval_stage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS first_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS second_approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS second_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
