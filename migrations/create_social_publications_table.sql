CREATE TABLE IF NOT EXISTS public.social_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  post_caption TEXT,
  approval_notes TEXT,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  asset_file_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_publications_platform_check CHECK (platform IN ('instagram', 'linkedin')),
  CONSTRAINT social_publications_status_check CHECK (status IN ('draft', 'approved', 'rejected', 'scheduled', 'published', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_social_publications_report_id
  ON public.social_publications(report_id);

CREATE INDEX IF NOT EXISTS idx_social_publications_client_id
  ON public.social_publications(client_id);

CREATE INDEX IF NOT EXISTS idx_social_publications_status
  ON public.social_publications(status);

ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia social publications" ON public.social_publications;
CREATE POLICY "Admin gerencia social publications"
  ON public.social_publications FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Cliente visualiza social publications do proprio client" ON public.social_publications;
CREATE POLICY "Cliente visualiza social publications do proprio client"
  ON public.social_publications FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.clients
      WHERE clients.id = social_publications.client_id
        AND clients.user_id = auth.uid()
    )
  );
