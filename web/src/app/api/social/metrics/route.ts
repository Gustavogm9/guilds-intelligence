import { NextResponse } from "next/server";

import { sendOperationalNotification } from "@/lib/ops-alerts";
import { createClient } from "@/lib/supabase/server";
import { syncSocialMetrics } from "@/lib/social-publishing";

function getMetricsSecret() {
    return process.env.SOCIAL_METRICS_SECRET || process.env.SOCIAL_PUBLISHER_SECRET || "";
}

export async function POST(request: Request) {
    const expectedSecret = getMetricsSecret();
    const providedSecret = request.headers.get("x-social-metrics-secret");

    if (expectedSecret && providedSecret === expectedSecret) {
        const result = await syncSocialMetrics();
        await sendOperationalNotification({
            title: "Sync social metrics automatizado executado",
            message: "A rotina automatizada de sincronizacao de metricas sociais foi executada.",
            severity: result.failed > 0 ? "warning" : "info",
            category: "unknown",
            metadata: {
                mode: "scheduled",
                total: result.total,
                synced: result.synced,
                failed: result.failed,
                skipped: result.skipped,
            },
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

    const result = await syncSocialMetrics();
    await sendOperationalNotification({
        title: "Sync social metrics manual executado",
        message: "Um admin executou a sincronizacao de metricas sociais.",
        severity: result.failed > 0 ? "warning" : "info",
        category: "unknown",
        metadata: {
            mode: "manual",
            total: result.total,
            synced: result.synced,
            failed: result.failed,
            skipped: result.skipped,
            actor_user_id: user.id,
        },
    });

    const redirectUrl =
        result.failed > 0 ? `/admin/social?error=metrics-${result.failed}` : "/admin/social?success=metrics";
    return NextResponse.redirect(new URL(redirectUrl, request.url), 303);
}
