import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";
import NicheIntelligenceHub from "./niche-intelligence-hub";

export default async function NicheDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: client } = await supabase
        .from("clients")
        .select("id, preferred_language, industry")
        .eq("user_id", user.id)
        .single();

    if (!client) redirect("/onboarding");

    // Fetch the niche details and verify ownership
    const { data: niche } = await supabase
        .from("client_niches")
        .select("*")
        .eq("id", id)
        .eq("client_id", client.id)
        .single();

    if (!niche) redirect("/dashboard/niches");

    // Fetch intelligence signals delivered to this niche
    const { data: signals } = await supabase
        .from("client_niche_signals")
        .select(`
            id,
            delivered_at,
            report_id,
            node_id,
            niche_intelligence_nodes (
                id,
                title,
                url,
                summary,
                source_name,
                region,
                language,
                predictive_score,
                is_trend,
                theme,
                matched_keywords,
                published_at,
                created_at
            )
        `)
        .eq("client_niche_id", id)
        .order("delivered_at", { ascending: false })
        .limit(100);

    // Fetch the topic mapping for this niche
    const { data: topicMap } = await supabase
        .from("client_niche_topic_map")
        .select(`
            topic_id,
            global_niche_topics (
                id,
                name,
                normalized_key
            )
        `)
        .eq("client_niche_id", id);

    const t = getDictionary(client?.preferred_language);

    return (
        <NicheIntelligenceHub
            niche={niche}
            signals={signals || []}
            topics={(topicMap || []).map((m: any) => m.global_niche_topics).filter(Boolean)}
            lang={client?.preferred_language || "pt-BR"}
            t={{
                nichesTitle: t.nichesTitle,
                nichePrimary: t.nichePrimary,
                nicheSecondary: t.nicheSecondary,
                nicheActive: t.nicheActive,
                nicheInactive: t.nicheInactive,
            }}
        />
    );
}
