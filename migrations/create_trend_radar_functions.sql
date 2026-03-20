-- get_client_niche_radar_data
CREATE OR REPLACE FUNCTION public.get_client_niche_radar_data(p_client_niche_id UUID)
RETURNS TABLE (
    theme TEXT,
    avg_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(n.theme, 'Geral'),
        ROUND(AVG(n.predictive_score), 2)
    FROM public.niche_intelligence_nodes n
    JOIN public.client_niche_topic_map m ON m.topic_id = n.topic_id
    WHERE m.client_niche_id = p_client_niche_id
    GROUP BY COALESCE(n.theme, 'Geral')
    ORDER BY avg_score DESC;
END;
$$;

-- get_client_niche_line_data
CREATE OR REPLACE FUNCTION public.get_client_niche_line_data(p_client_niche_id UUID)
RETURNS TABLE (
    period DATE,
    avg_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(date_trunc('week', COALESCE(n.published_at, n.created_at))),
        ROUND(AVG(n.predictive_score), 2)
    FROM public.niche_intelligence_nodes n
    JOIN public.client_niche_topic_map m ON m.topic_id = n.topic_id
    WHERE m.client_niche_id = p_client_niche_id
    GROUP BY DATE(date_trunc('week', COALESCE(n.published_at, n.created_at)))
    ORDER BY DATE(date_trunc('week', COALESCE(n.published_at, n.created_at))) ASC
    LIMIT 12;
END;
$$;
