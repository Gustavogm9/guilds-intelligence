import { NextResponse } from "next/server";

import { sendOperationalNotification } from "@/lib/ops-alerts";
import { createClient } from "@/lib/supabase/server";
import { publishDueSocialPublications, publishOneSocialPublication } from "@/lib/social-publishing";

function getPublishSecret() {
    return process.env.SOCIAL_PUBLISHER_SECRET || process.env.REPORT_SCHEDULER_SECRET || "";
}

export async function POST(request: Request) {
    const expectedSecret = getPublishSecret();
    const providedSecret = request.headers.get("x-social-publisher-secret");

    if (expectedSecret && providedSecret === expectedSecret) {
        const result = await publishDueSocialPublications("scheduled");
        await sendOperationalNotification({
            title: "Batch social automatizado executado",
            message: "A rotina automatizada de publicacao social foi executada.",
            severity: result.failed > 0 ? "warning" : "info",
            category: "unknown",
            metadata: {
                mode: "scheduled",
                total: result.total,
                published: result.published,
                failed: result.failed,
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

    const formData = await request.formData();
    const publicationId = String(formData.get("publication_id") || "");

    if (publicationId) {
        const result = await publishOneSocialPublication(publicationId, "manual");
        if (!result.ok) {
            await sendOperationalNotification({
                title: "Publicacao social manual falhou",
                message: "Uma tentativa manual de publicacao social retornou erro.",
                severity: "warning",
                category: "unknown",
                metadata: {
                    mode: "manual",
                    publication_id: publicationId,
                    error: result.error,
                },
            });
        }
        const redirectUrl = result.ok
            ? "/admin/social?success=publish"
            : `/admin/social?error=${encodeURIComponent(result.error)}`;
        return NextResponse.redirect(new URL(redirectUrl, request.url), 303);
    }

    const result = await publishDueSocialPublications("manual");
    await sendOperationalNotification({
        title: "Batch social manual executado",
        message: "Um admin executou o processamento em lote das publicacoes sociais.",
        severity: result.failed > 0 ? "warning" : "info",
        category: "unknown",
        metadata: {
            mode: "manual",
            total: result.total,
            published: result.published,
            failed: result.failed,
            actor_user_id: user.id,
        },
    });
    const redirectUrl =
        result.failed > 0 ? `/admin/social?error=${result.failed}` : "/admin/social?success=batch";
    return NextResponse.redirect(new URL(redirectUrl, request.url), 303);
}
