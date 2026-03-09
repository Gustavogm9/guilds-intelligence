import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/onboarding";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Verificar se é primeiro acesso (sem onboarding feito)
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: client } = await supabase
                    .from("clients")
                    .select("raw_onboarding_text")
                    .eq("contact_email", user.email)
                    .single();

                // Se já fez onboarding, vai direto pro dashboard
                if (client?.raw_onboarding_text) {
                    return NextResponse.redirect(`${origin}/dashboard`);
                }
            }

            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
