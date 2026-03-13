import { NextResponse } from "next/server";

import { sendOperationalNotification } from "@/lib/ops-alerts";
import { createClient } from "@/lib/supabase/server";
import { processQueuedWhatsappMessages } from "@/lib/whatsapp";

function getWhatsappProcessSecret() {
    return process.env.WHATSAPP_PROCESS_SECRET || process.env.REPORT_SCHEDULER_SECRET || "";
}

export async function POST(request: Request) {
    const expectedSecret = getWhatsappProcessSecret();
    const providedSecret = request.headers.get("x-whatsapp-process-secret");

    if (expectedSecret && providedSecret === expectedSecret) {
        const result = await processQueuedWhatsappMessages("scheduled");
        await sendOperationalNotification({
            title: "Batch WhatsApp automatizado executado",
            message: "A rotina automatizada de envio do WhatsApp foi executada.",
            severity: result.failed > 0 ? "warning" : "info",
            category: "unknown",
            metadata: result,
        });
        return NextResponse.json(result);
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const result = await processQueuedWhatsappMessages("manual");
    await sendOperationalNotification({
        title: "Batch WhatsApp manual executado",
        message: "Um admin executou o processamento da fila de WhatsApp.",
        severity: result.failed > 0 ? "warning" : "info",
        category: "unknown",
        metadata: {
            ...result,
            actor_user_id: user.id,
        },
    });

    const redirectUrl = result.failed > 0 ? `/admin/whatsapp?error=${result.failed}` : "/admin/whatsapp?success=processed";
    return NextResponse.redirect(new URL(redirectUrl, request.url), 303);
}
