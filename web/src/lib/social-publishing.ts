import { createAdminClient } from "@/lib/supabase/admin";
import { sendOperationalNotification } from "@/lib/ops-alerts";

type Provider = "instagram" | "linkedin";
type PublicationStatus = "draft" | "approved" | "rejected" | "scheduled" | "published" | "failed";

type SocialPublicationRow = {
    id: string;
    report_id: string;
    client_id: string;
    platform: Provider;
    status: PublicationStatus;
    post_caption: string | null;
    approval_notes: string | null;
    scheduled_for: string | null;
    created_at: string;
    publish_attempts?: number | null;
    requires_second_review?: boolean | null;
    approval_stage?: number | null;
    first_approved_at?: string | null;
    second_approved_at?: string | null;
};

type ReportFileRow = {
    id: string;
    file_type: string;
    storage_path: string;
};

type SyncMetricsResult = {
    publicationId: string;
    provider: Provider;
    status: "synced" | "skipped" | "failed";
    detail?: string;
};

type PublishResult =
    | { ok: true; externalPostId: string; provider: Provider; detail?: string }
    | { ok: false; provider: Provider; error: string };

function getBaseUrl() {
    return (
        process.env.APP_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        ""
    ).replace(/\/$/, "");
}

function getLinkedInConfig() {
    return {
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN || "",
        authorUrn: process.env.LINKEDIN_AUTHOR_URN || "",
        version: process.env.LINKEDIN_API_VERSION || "202503",
    };
}

function getInstagramConfig() {
    return {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
        igUserId: process.env.INSTAGRAM_IG_USER_ID || "",
        apiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || "v24.0",
    };
}

async function getSignedAssetUrl(storagePath: string) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage.from("reports").createSignedUrl(storagePath, 3600);
    return data?.signedUrl || null;
}

function buildFallbackCaption(publication: SocialPublicationRow) {
    return `Guilds Intelligence social update • ${publication.platform} • ${new Date(
        publication.created_at
    ).toLocaleDateString("pt-BR")}`;
}

function isPublicationApprovedForPublish(publication: SocialPublicationRow) {
    if (publication.requires_second_review) {
        return Number(publication.approval_stage || 0) >= 2 && Boolean(publication.second_approved_at);
    }

    return Number(publication.approval_stage || 0) >= 1 && Boolean(publication.first_approved_at);
}

export function calculatePerformanceScore(metrics: {
    impressions?: number | null;
    reactions?: number | null;
    comments?: number | null;
    shares?: number | null;
    clicks?: number | null;
}) {
    const impressions = Number(metrics.impressions || 0);
    const reactions = Number(metrics.reactions || 0);
    const comments = Number(metrics.comments || 0);
    const shares = Number(metrics.shares || 0);
    const clicks = Number(metrics.clicks || 0);
    const interactionScore = reactions * 1 + comments * 2 + shares * 3 + clicks * 2;
    const reachScore = impressions > 0 ? impressions / 100 : 0;
    return Number((interactionScore + reachScore).toFixed(2));
}

function normalizeLinkedInEntityUrn(externalPostId: string) {
    if (!externalPostId) return "";
    if (externalPostId.startsWith("urn:li:")) return externalPostId;

    const decoded = decodeURIComponent(externalPostId);
    const urnMatch = decoded.match(/urn:li:[A-Za-z]+:[A-Za-z0-9:_-]+/);
    if (urnMatch) return urnMatch[0];

    if (decoded.includes("/posts/")) {
        const segment = decoded.split("/posts/")[1]?.split(/[/?#]/)[0];
        if (segment) return segment;
    }

    return decoded;
}

async function syncLinkedInMetrics(externalPostId: string) {
    const config = getLinkedInConfig();
    if (!config.accessToken) {
        throw new Error("LINKEDIN_ACCESS_TOKEN e obrigatorio para sincronizar metricas.");
    }

    const entityUrn = normalizeLinkedInEntityUrn(externalPostId);
    if (!entityUrn) {
        throw new Error("Nao foi possivel determinar o entity URN do LinkedIn.");
    }

    const response = await fetch(
        `https://api.linkedin.com/rest/socialMetadata/${encodeURIComponent(entityUrn)}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
                "Linkedin-Version": config.version,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`LinkedIn metrics returned ${response.status}: ${(await response.text()).slice(0, 250)}`);
    }

    const data = (await response.json()) as {
        reactionSummaries?: Record<string, { count?: number }>;
        commentSummary?: { count?: number };
    };

    const reactions = Object.values(data.reactionSummaries || {}).reduce(
        (acc, item) => acc + Number(item.count || 0),
        0
    );
    const comments = Number(data.commentSummary?.count || 0);

    return {
        impressions: null,
        reactions_count: reactions,
        comments_count: comments,
        shares_count: null,
        clicks_count: null,
    };
}

async function syncInstagramMetrics(externalPostId: string) {
    const config = getInstagramConfig();
    if (!config.accessToken) {
        throw new Error("INSTAGRAM_ACCESS_TOKEN e obrigatorio para sincronizar metricas.");
    }

    const metricCandidates = [
        ["reach", "likes", "comments", "shares", "saved", "total_interactions", "views"],
        ["reach", "likes", "comments", "shares", "saved"],
        ["reach", "likes", "comments"],
    ];

    let lastError = "";
    for (const candidate of metricCandidates) {
        const url = `https://graph.facebook.com/${config.apiVersion}/${externalPostId}/insights?metric=${candidate.join(",")}&access_token=${encodeURIComponent(config.accessToken)}`;
        const response = await fetch(url);
        if (!response.ok) {
            lastError = `Instagram metrics returned ${response.status}: ${(await response.text()).slice(0, 250)}`;
            continue;
        }

        const payload = (await response.json()) as {
            data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
        };

        const metricMap = new Map<string, number>();
        for (const item of payload.data || []) {
            metricMap.set(String(item.name || ""), Number(item.values?.[0]?.value || 0));
        }

        const reactions = Number(metricMap.get("likes") || 0);
        const comments = Number(metricMap.get("comments") || 0);
        const shares = Number(metricMap.get("shares") || 0);
        const clicks = Number(metricMap.get("total_interactions") || 0);
        const impressions = Number(metricMap.get("reach") || metricMap.get("views") || 0);

        return {
            impressions,
            reactions_count: reactions,
            comments_count: comments,
            shares_count: shares,
            clicks_count: clicks,
        };
    }

    throw new Error(lastError || "Nao foi possivel sincronizar metricas do Instagram.");
}

async function publishToLinkedIn(publication: SocialPublicationRow): Promise<PublishResult> {
    const config = getLinkedInConfig();
    if (!config.accessToken || !config.authorUrn) {
        return {
            ok: false,
            provider: "linkedin",
            error: "LINKEDIN_ACCESS_TOKEN e LINKEDIN_AUTHOR_URN sao obrigatorios.",
        };
    }

    const payload = {
        author: config.authorUrn,
        commentary: publication.post_caption || buildFallbackCaption(publication),
        visibility: "PUBLIC",
        distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
    };

    const response = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": config.version,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        return {
            ok: false,
            provider: "linkedin",
            error: `LinkedIn returned ${response.status}: ${errorText.slice(0, 300)}`,
        };
    }

    const externalPostId =
        response.headers.get("x-restli-id") ||
        response.headers.get("location") ||
        `linkedin:${publication.id}`;

    return {
        ok: true,
        provider: "linkedin",
        externalPostId,
    };
}

async function publishToInstagram(
    publication: SocialPublicationRow,
    reportFiles: ReportFileRow[]
): Promise<PublishResult> {
    const config = getInstagramConfig();
    if (!config.accessToken || !config.igUserId) {
        return {
            ok: false,
            provider: "instagram",
            error: "INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_IG_USER_ID sao obrigatorios.",
        };
    }

    const imageFile =
        reportFiles.find((file) => file.file_type === "social_card") ||
        reportFiles.find((file) => file.file_type === "social_story");

    if (!imageFile) {
        return {
            ok: false,
            provider: "instagram",
            error: "Nenhum asset de imagem encontrado para publicar no Instagram.",
        };
    }

    const imageUrl = await getSignedAssetUrl(imageFile.storage_path);
    if (!imageUrl) {
        return {
            ok: false,
            provider: "instagram",
            error: "Nao foi possivel gerar signed URL para o asset do Instagram.",
        };
    }

    const base = `https://graph.facebook.com/${config.apiVersion}/${config.igUserId}`;
    const caption = publication.post_caption || buildFallbackCaption(publication);

    const createContainerResponse = await fetch(`${base}/media`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            image_url: imageUrl,
            caption,
        }),
    });

    if (!createContainerResponse.ok) {
        const errorText = await createContainerResponse.text();
        return {
            ok: false,
            provider: "instagram",
            error: `Instagram media container failed ${createContainerResponse.status}: ${errorText.slice(0, 300)}`,
        };
    }

    const containerData = (await createContainerResponse.json()) as { id?: string };
    if (!containerData.id) {
        return {
            ok: false,
            provider: "instagram",
            error: "Instagram nao retornou container id.",
        };
    }

    const publishResponse = await fetch(`${base}/media_publish`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            creation_id: containerData.id,
        }),
    });

    if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        return {
            ok: false,
            provider: "instagram",
            error: `Instagram publish failed ${publishResponse.status}: ${errorText.slice(0, 300)}`,
        };
    }

    const publishData = (await publishResponse.json()) as { id?: string };
    return {
        ok: true,
        provider: "instagram",
        externalPostId: publishData.id || containerData.id,
    };
}

export async function publishOneSocialPublication(
    publicationId: string,
    mode: "manual" | "scheduled"
) {
    const supabase = createAdminClient();
    const { data: publication } = await supabase
        .from("social_publications")
        .select("id, report_id, client_id, platform, status, post_caption, approval_notes, scheduled_for, created_at, publish_attempts, requires_second_review, approval_stage, first_approved_at, second_approved_at")
        .eq("id", publicationId)
        .maybeSingle();

    const normalizedPublication = publication as SocialPublicationRow | null;
    if (!normalizedPublication) {
        return { ok: false as const, error: "Publicacao nao encontrada." };
    }

    if (!["approved", "scheduled"].includes(normalizedPublication.status)) {
        return {
            ok: false as const,
            error: `Status ${normalizedPublication.status} nao esta pronto para publicacao.`,
        };
    }

    if (!isPublicationApprovedForPublish(normalizedPublication)) {
        return {
            ok: false as const,
            error: "A publicacao ainda nao concluiu a trilha de aprovacao exigida.",
        };
    }

    await supabase
        .from("social_publications")
        .update({
            publish_attempts: Number(normalizedPublication.publish_attempts || 0) + 1,
            last_publish_attempt_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", publicationId);

    const { data: reportFiles } = await supabase
        .from("report_files")
        .select("id, file_type, storage_path")
        .eq("report_id", normalizedPublication.report_id);

    const files = (reportFiles as ReportFileRow[] | null) || [];
    let result: PublishResult;

    if (normalizedPublication.platform === "linkedin") {
        result = await publishToLinkedIn(normalizedPublication);
    } else {
        result = await publishToInstagram(normalizedPublication, files);
    }

    if (!result.ok) {
        await supabase
            .from("social_publications")
            .update({
                status: "failed",
                approval_notes: [normalizedPublication.approval_notes, `[${new Date().toISOString()}] ${result.error}`]
                    .filter(Boolean)
                    .join("\n"),
                last_error: result.error,
                updated_at: new Date().toISOString(),
            })
            .eq("id", publicationId);

        await sendOperationalNotification({
            title: "Falha ao publicar social pack",
            message: "Uma tentativa de publicacao social falhou.",
            severity: "warning",
            category: "unknown",
            metadata: {
                publication_id: publicationId,
                provider: normalizedPublication.platform,
                mode,
                error: result.error,
            },
        });

        return { ok: false as const, error: result.error };
    }

    await supabase
        .from("social_publications")
        .update({
            status: "published",
            external_post_id: result.externalPostId,
            published_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", publicationId);

    try {
        await supabase.from("funnel_events").insert({
            event_type: "social_publication_published",
            metadata: {
                publication_id: publicationId,
                provider: normalizedPublication.platform,
                report_id: normalizedPublication.report_id,
                client_id: normalizedPublication.client_id,
                mode,
                external_post_id: result.externalPostId,
            },
        });
    } catch {
        // tracking nao bloqueia a publicacao
    }

    await sendOperationalNotification({
        title: "Publicacao social concluida",
        message: "Uma publicacao social foi enviada para a rede externa.",
        severity: "info",
        category: "unknown",
        metadata: {
            publication_id: publicationId,
            provider: normalizedPublication.platform,
            mode,
            external_post_id: result.externalPostId,
        },
    });

    return {
        ok: true as const,
        externalPostId: result.externalPostId,
    };
}

export async function publishDueSocialPublications(mode: "manual" | "scheduled") {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data } = await supabase
        .from("social_publications")
        .select("id, status, scheduled_for")
        .in("status", ["approved", "scheduled"])
        .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
        .order("created_at", { ascending: true })
        .limit(20);

    const publications = (data as Array<{ id: string }> | null) || [];
    const results: Array<{ publication_id: string; status: string; detail?: string }> = [];

    for (const publication of publications) {
        const result = await publishOneSocialPublication(publication.id, mode);
        results.push({
            publication_id: publication.id,
            status: result.ok ? "published" : "failed",
            detail: result.ok ? result.externalPostId : result.error,
        });
    }

    return {
        ok: true as const,
        total: publications.length,
        published: results.filter((item) => item.status === "published").length,
        failed: results.filter((item) => item.status === "failed").length,
        results,
    };
}

export async function syncSocialMetrics() {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("social_publications")
        .select("id, platform, external_post_id, published_at")
        .eq("status", "published")
        .not("external_post_id", "is", null)
        .order("published_at", { ascending: false })
        .limit(50);

    const publications =
        ((data as Array<{
            id: string;
            platform: Provider;
            external_post_id: string | null;
            published_at: string | null;
        }> | null) || []);
    const results: SyncMetricsResult[] = [];

    for (const publication of publications) {
        if (!publication.external_post_id) {
            results.push({
                publicationId: publication.id,
                provider: publication.platform,
                status: "skipped",
                detail: "Sem external_post_id.",
            });
            continue;
        }

        try {
            const metrics =
                publication.platform === "linkedin"
                    ? await syncLinkedInMetrics(publication.external_post_id)
                    : await syncInstagramMetrics(publication.external_post_id);

            const performanceScore = calculatePerformanceScore({
                impressions: metrics.impressions,
                reactions: metrics.reactions_count,
                comments: metrics.comments_count,
                shares: metrics.shares_count,
                clicks: metrics.clicks_count,
            });

            await supabase
                .from("social_publications")
                .update({
                    impressions: metrics.impressions,
                    reactions_count: metrics.reactions_count,
                    comments_count: metrics.comments_count,
                    shares_count: metrics.shares_count,
                    clicks_count: metrics.clicks_count,
                    performance_score: performanceScore,
                    last_metrics_sync_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", publication.id);

            results.push({
                publicationId: publication.id,
                provider: publication.platform,
                status: "synced",
                detail: `score=${performanceScore}`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro desconhecido";
            await supabase
                .from("social_publications")
                .update({
                    last_error: message,
                    last_metrics_sync_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", publication.id);

            results.push({
                publicationId: publication.id,
                provider: publication.platform,
                status: "failed",
                detail: message,
            });
        }
    }

    return {
        ok: true as const,
        total: publications.length,
        synced: results.filter((item) => item.status === "synced").length,
        failed: results.filter((item) => item.status === "failed").length,
        skipped: results.filter((item) => item.status === "skipped").length,
        results,
    };
}

export function socialPublishDocs() {
    return {
        linkedin: "Uses LinkedIn Posts API on https://api.linkedin.com/rest/posts with versioned headers.",
        instagram: "Uses Instagram Graph publishing flow with /media and /media_publish on the configured IG business account.",
        baseUrl: getBaseUrl(),
    };
}
