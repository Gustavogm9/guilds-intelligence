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
            "dashboard_return",
            "inbox_view",
            "first_report_view",
            "report_view",
            "report_download",
            "audio_play",
            "deep_dive_requested",
            "login",
            "scheduler_run",
            "report_generation_triggered",
            "report_generation_failed",
            "report_retry_triggered",
            "report_auto_recovery_triggered",
            "whatsapp_message_received",
            "whatsapp_command_processed",
            "whatsapp_deep_dive_requested",
            "schedule_preferences_saved",
            "report_generated_on_demand",
        ];

        if (!validEvents.includes(event_type)) {
            return NextResponse.json(
                { error: "event_type inválido" },
                { status: 400 }
            );
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        let enrichedMetadata = metadata || {};

        if (user) {
            try {
                const { data: client } = await supabase
                    .from("clients")
                    .select("id, plan_id, plans(name)")
                    .eq("user_id", user.id)
                    .single();

                const plan = Array.isArray(client?.plans) ? client?.plans[0] : client?.plans;

                enrichedMetadata = {
                    ...enrichedMetadata,
                    user_id: user.id,
                    client_id: client?.id || null,
                    plan_id: client?.plan_id || null,
                    plan_name: plan?.name || null,
                };
            } catch {
                enrichedMetadata = {
                    ...enrichedMetadata,
                    user_id: user.id,
                };
            }
        }

        const { error } = await supabase.from("funnel_events").insert({
            event_type,
            session_id: session_id || null,
            metadata: enrichedMetadata,
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
