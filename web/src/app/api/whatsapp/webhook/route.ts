import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { inferWhatsappIntent, processWhatsappIntent } from "@/lib/whatsapp";

export async function POST(request: Request) {
    const secret = request.headers.get("x-whatsapp-secret");
    if (!secret || secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload?.client_id || !payload?.body) {
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    try {
        const admin = createAdminClient();
        const direction = payload.direction === "outbound" ? "outbound" : "inbound";
        const status =
            payload.status ||
            (direction === "inbound" ? "received" : "sent");
        const inferredIntent = direction === "inbound" ? inferWhatsappIntent(String(payload.body)) : null;

        const { error } = await admin.from("whatsapp_messages").insert({
            client_id: payload.client_id,
            report_id: payload.report_id || null,
            direction,
            status,
            message_type: payload.message_type || "text",
            phone_number: payload.phone_number || null,
            provider_message_id: payload.provider_message_id || null,
            body: String(payload.body),
            sent_at: direction === "outbound" ? new Date().toISOString() : null,
            received_at: direction === "inbound" ? new Date().toISOString() : null,
            metadata: {
                ...(payload.metadata || {}),
                source: "webhook",
                inferred_intent: inferredIntent,
            },
        });

        if (error) throw error;

        if (direction === "inbound") {
            const { data: client } = await admin
                .from("clients")
                .select("id, company_name, preferred_language")
                .eq("id", payload.client_id)
                .maybeSingle();

            if (client) {
                await admin.from("funnel_events").insert({
                    event_type: "whatsapp_message_received",
                    session_id: null,
                    metadata: {
                        client_id: payload.client_id,
                        report_id: payload.report_id || null,
                        inferred_intent: inferredIntent,
                        channel: "whatsapp",
                    },
                });

                await processWhatsappIntent({
                    admin,
                    client,
                    body: String(payload.body),
                    phoneNumber: payload.phone_number || null,
                    reportId: payload.report_id || null,
                });
            }
        }

        return NextResponse.json({ ok: true, intent: inferredIntent });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "save_failed" },
            { status: 500 }
        );
    }
}
