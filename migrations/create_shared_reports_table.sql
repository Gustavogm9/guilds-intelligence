-- Migration: Criação da tabela shared_reports para Compartilhamento Público
-- Fase 6.1

CREATE TABLE IF NOT EXISTS public.shared_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_shared_reports_token ON public.shared_reports(token);
CREATE INDEX idx_shared_reports_report_id ON public.shared_reports(report_id);

ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- Proprietários ou admins podem ver e gerenciar os links que criaram/possuem
CREATE POLICY "Users can manage own shared reports"
    ON public.shared_reports FOR ALL
    USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    )
    WITH CHECK (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Acesso anônimo usando o token (Apenas SELECT)
CREATE POLICY "Anon can select shared report by token"
    ON public.shared_reports FOR SELECT
    USING (
        (expires_at IS NULL OR expires_at > now())
    );
