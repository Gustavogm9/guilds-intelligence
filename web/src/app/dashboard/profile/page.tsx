import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import ProfileEditor from "./profile-editor";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("*, plans(name, report_frequency)")
        .eq("user_id", user!.id)
        .single();

    const t = getDictionary(client?.preferred_language);

    // Extract only serializable (non-function) properties for the client component
    const profileT = {
        profileTitle: t.profileTitle,
        profileDescription: t.profileDescription,
        account: t.account,
        email: t.email,
        contact: t.contact,
        whatsapp: t.whatsapp,
        plan: t.plan,
        frequency: t.frequency,
        company: t.company,
        industry: t.industry,
        size: t.size,
        location: t.location,
        preferences: t.preferences,
        tone: t.tone,
        language: t.language,
        market: t.market,
        audience: t.audience,
        productsServices: t.productsServices,
        notDefined: t.notDefined,
        tones: t.tones,
        languages: t.languages,
        frequencies: t.frequencies,
    };

    return (
        <ProfileEditor
            clientData={client}
            userEmail={user?.email || ""}
            t={profileT}
        />
    );
}

