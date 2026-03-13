import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SocialAction = "create" | "update";

function requiresSecondReviewByDefault() {
    return process.env.SOCIAL_REQUIRE_SECOND_REVIEW === "true";
}

function normalizeStatus(rawStatus: FormDataEntryValue | null) {
    const status = String(rawStatus || "draft");
    const allowed = new Set(["draft", "approved", "rejected", "scheduled", "published", "failed"]);
    return allowed.has(status) ? status : "draft";
}

function normalizePlatform(rawPlatform: FormDataEntryValue | null) {
    const platform = String(rawPlatform || "instagram");
    return platform === "linkedin" ? "linkedin" : "instagram";
}

export async function POST(request: Request) {
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
    const action = String(formData.get("action") || "create") as SocialAction;

    if (action === "create") {
        const reportId = String(formData.get("report_id") || "");
        const clientId = String(formData.get("client_id") || "");
        const platform = normalizePlatform(formData.get("platform"));
        const postCaption = String(formData.get("post_caption") || "");
        const requiresSecondReview =
            String(formData.get("requires_second_review") || "") === "true" ||
            requiresSecondReviewByDefault();

        if (!reportId || !clientId) {
            return NextResponse.redirect(new URL("/admin/social?error=missing", request.url));
        }

        const { error } = await supabase.from("social_publications").insert({
            report_id: reportId,
            client_id: clientId,
            platform,
            status: "draft",
            post_caption: postCaption || null,
            requires_second_review: requiresSecondReview,
            created_by: user.id,
            updated_by: user.id,
        });

        if (error) {
            return NextResponse.redirect(new URL("/admin/social?error=create", request.url));
        }

        return NextResponse.redirect(new URL("/admin/social?success=create", request.url));
    }

    const publicationId = String(formData.get("publication_id") || "");
    if (!publicationId) {
        return NextResponse.redirect(new URL("/admin/social?error=missing", request.url));
    }

    const nextStatus = normalizeStatus(formData.get("status"));
    const approvalAction = String(formData.get("approval_action") || "");
    const scheduledForRaw = String(formData.get("scheduled_for") || "");
    const approvalNotes = String(formData.get("approval_notes") || "");
    const postCaption = String(formData.get("post_caption") || "");
    const impressions = Number(formData.get("impressions") || "");
    const reactionsCount = Number(formData.get("reactions_count") || "");
    const commentsCount = Number(formData.get("comments_count") || "");
    const sharesCount = Number(formData.get("shares_count") || "");
    const clicksCount = Number(formData.get("clicks_count") || "");

    const hasMetricsPayload = [
        formData.get("impressions"),
        formData.get("reactions_count"),
        formData.get("comments_count"),
        formData.get("shares_count"),
        formData.get("clicks_count"),
    ].some((value) => String(value || "").trim() !== "");

    const { data: currentPublication } = await supabase
        .from("social_publications")
        .select("id, requires_second_review, approval_stage, first_approved_by, first_approved_at, second_approved_by, second_approved_at")
        .eq("id", publicationId)
        .maybeSingle();

    if (!currentPublication) {
        return NextResponse.redirect(new URL("/admin/social?error=missing", request.url));
    }

    const payload: Record<string, string | null> = {
        status: nextStatus,
        approval_notes: approvalNotes || null,
        post_caption: postCaption || null,
        updated_by: user.id,
        scheduled_for: scheduledForRaw ? new Date(scheduledForRaw).toISOString() : null,
        published_at: nextStatus === "published" ? new Date().toISOString() : null,
    };

    if (approvalAction === "approve") {
        if (!currentPublication.first_approved_at) {
            Object.assign(payload, {
                status: "approved",
                approval_stage: "1",
                first_approved_by: user.id,
                first_approved_at: new Date().toISOString(),
            });
        } else if (currentPublication.requires_second_review && !currentPublication.second_approved_at) {
            if (currentPublication.first_approved_by === user.id) {
                return NextResponse.redirect(new URL("/admin/social?error=same-reviewer", request.url));
            }

            Object.assign(payload, {
                status: "approved",
                approval_stage: "2",
                second_approved_by: user.id,
                second_approved_at: new Date().toISOString(),
            });
        }
    }

    if (nextStatus === "rejected") {
        Object.assign(payload, {
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
        });
    }

    Object.assign(payload, {
        impressions: Number.isFinite(impressions) && String(formData.get("impressions") || "").trim() ? String(impressions) : null,
        reactions_count: Number.isFinite(reactionsCount) && String(formData.get("reactions_count") || "").trim() ? String(reactionsCount) : null,
        comments_count: Number.isFinite(commentsCount) && String(formData.get("comments_count") || "").trim() ? String(commentsCount) : null,
        shares_count: Number.isFinite(sharesCount) && String(formData.get("shares_count") || "").trim() ? String(sharesCount) : null,
        clicks_count: Number.isFinite(clicksCount) && String(formData.get("clicks_count") || "").trim() ? String(clicksCount) : null,
        last_metrics_sync_at: hasMetricsPayload ? new Date().toISOString() : null,
    });

    const { error } = await supabase
        .from("social_publications")
        .update(payload)
        .eq("id", publicationId);

    if (error) {
        return NextResponse.redirect(new URL("/admin/social?error=update", request.url));
    }

    return NextResponse.redirect(new URL("/admin/social?success=update", request.url));
}
