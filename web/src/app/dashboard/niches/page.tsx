import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import NichesManager from "./niches-manager";

export default async function NichesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("id, preferred_language")
        .eq("user_id", user!.id)
        .single();

    const { data: niches } = await supabase
        .from("client_niches")
        .select("*")
        .eq("client_id", client!.id)
        .order("created_at", { ascending: false });

    const t = getDictionary(client?.preferred_language);

    const nichesT = {
        nichesTitle: t.nichesTitle,
        nichesDescription: t.nichesDescription,
        nicheName: t.nicheName,
        nicheRelevance: t.nicheRelevance,
        nichePrimary: t.nichePrimary,
        nicheSecondary: t.nicheSecondary,
        nicheActive: t.nicheActive,
        nicheInactive: t.nicheInactive,
        addNiche: t.addNiche,
        deleteNiche: t.deleteNiche,
        deleteNicheConfirm: t.deleteNicheConfirm,
        nicheSaved: t.nicheSaved,
        nicheAdded: t.nicheAdded,
        nicheDeleted: t.nicheDeleted,
        nicheSaveError: t.nicheSaveError,
        nicheEmptyName: t.nicheEmptyName,
        noNichesYet: t.noNichesYet,
        nichesHint: t.nichesHint,
        notDefined: t.notDefined,
    };

    return (
        <NichesManager
            niches={niches || []}
            clientId={client!.id}
            t={nichesT}
            lang={client?.preferred_language || "pt-BR"}
        />
    );
}
