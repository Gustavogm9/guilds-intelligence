import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event_type, session_id, metadata } = body;

        if (!event_type) {
            return NextResponse.json(
                { error: "event_type é obrigatório" },
                { status: 400 }
            );
        }

        const validEvents = [
            "landing_view",
            "modal_open",
            "lead_submit",
            "signup_complete",
            "onboarding_complete",
            "first_report_view",
            "login",
        ];

        if (!validEvents.includes(event_type)) {
            return NextResponse.json(
                { error: "event_type inválido" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const { error } = await supabase.from("funnel_events").insert({
            event_type,
            session_id: session_id || null,
            metadata: metadata || {},
        });

        if (error) {
            console.error("Track event error:", error);
            // Retorna 200 mesmo com erro — tracking não deve falhar ruidosamente
            return NextResponse.json({ success: false });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Track API error:", error);
        return NextResponse.json({ success: false });
    }
}
