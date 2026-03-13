import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type ClientRow = {
    id: string;
    company_name?: string | null;
    preferred_language?: string | null;
};

type ReportRow = {
    id: string;
    title?: string | null;
    summary?: string | null;
    created_at: string;
};

type ReportFileRow = {
    file_type: string;
    storage_path: string;
};

type MessageRow = {
    id: string;
    client_id: string;
    report_id?: string | null;
    phone_number?: string | null;
    body: string;
    message_type?: string | null;
    metadata?: Record<string, unknown> | null;
};

function normalizeText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export function inferWhatsappIntent(body: string) {
    const text = normalizeText(body);
    if (text.includes("ok") || text.includes("recebi") || text.includes("obrigado") || text.includes("thanks")) {
        return "ack";
    }
    if (text.includes("status")) return "status";
    if (text.includes("reenviar") || text.includes("reenvia")) return "resend";
    if (text.includes("deep dive")) return "deep_dive";
    if (text.includes("audio")) return "audio";
    if (text.includes("pdf")) return "pdf";
    if (text.includes("resumo")) return "summary";
    if (text.includes("relatorio")) return "report";
    return "unknown";
}

async function getLatestReport(admin: AdminClient, clientId: string) {
    const { data: report } = await admin
        .from("reports")
        .select("id, title, summary, created_at")
        .eq("client_id", clientId)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return (report as ReportRow | null) || null;
}

async function getReportFiles(admin: AdminClient, reportId: string) {
    const { data } = await admin
        .from("report_files")
        .select("file_type, storage_path")
        .eq("report_id", reportId);

    return (data as ReportFileRow[] | null) || [];
}

async function getLatestDeepDive(admin: AdminClient, clientId: string) {
    const { data } = await admin
        .from("deep_dive_requests")
        .select("id, topic, status, created_at, responded_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data || null;
}

async function buildSignedAssetMap(admin: AdminClient, files: ReportFileRow[]) {
    const entries = await Promise.all(
        files.map(async (file) => {
            const { data } = await admin.storage.from("reports").createSignedUrl(file.storage_path, 60 * 60 * 24);
            return [file.file_type, data?.signedUrl || null] as const;
        })
    );

    return Object.fromEntries(entries);
}

function textByLocale(locale: string | null | undefined, pt: string, en: string) {
    return locale?.toLowerCase().startsWith("en") ? en : pt;
}

function getAutoResponseIntents() {
    const raw =
        process.env.WHATSAPP_AUTO_RESPONSE_INTENTS ||
        "ack,summary,report,pdf,audio,status,resend,deep_dive";

    return new Set(
        raw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    );
}

function shouldAutoRespond(intent: string) {
    return getAutoResponseIntents().has(intent);
}

async function queueOutboundMessage(
    admin: AdminClient,
    args: {
        clientId: string;
        reportId?: string | null;
        phoneNumber?: string | null;
        body: string;
        messageType: string;
        metadata?: Record<string, unknown>;
    }
) {
    await admin.from("whatsapp_messages").insert({
        client_id: args.clientId,
        report_id: args.reportId || null,
        direction: "outbound",
        status: "queued",
        message_type: args.messageType,
        phone_number: args.phoneNumber || null,
        body: args.body,
        metadata: {
            ...(args.metadata || {}),
            source: "intent_processor",
        },
    });
}

async function insertFunnelEvent(
    admin: AdminClient,
    eventType: string,
    metadata: Record<string, unknown>
) {
    await admin.from("funnel_events").insert({
        event_type: eventType,
        session_id: null,
        metadata,
    });
}

export async function processWhatsappIntent(args: {
    admin: AdminClient;
    client: ClientRow;
    body: string;
    phoneNumber?: string | null;
    reportId?: string | null;
}) {
    const { admin, client, body, phoneNumber, reportId } = args;
    const intent = inferWhatsappIntent(body);
    const latestReport = reportId ? ({ id: reportId } as ReportRow) : await getLatestReport(admin, client.id);

    if (!shouldAutoRespond(intent)) {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport?.id || null,
            phoneNumber,
            messageType: "manual_review",
            body: textByLocale(
                client.preferred_language,
                "Recebi sua mensagem e vou encaminhar para revisao da equipe antes de responder.",
                "I received your message and will route it to the team for review before replying."
            ),
            metadata: {
                intent,
                manual_review_required: true,
            },
        });

        await insertFunnelEvent(admin, "whatsapp_command_processed", {
            client_id: client.id,
            report_id: latestReport?.id || null,
            intent,
            result: "manual_review_required",
        });

        return { intent, action: "manual_review_required" };
    }

    if (intent === "ack") {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport?.id || null,
            phoneNumber,
            messageType: "ack",
            body: textByLocale(
                client.preferred_language,
                "Perfeito, recebemos sua confirmacao. Se quiser, posso reenviar o PDF, o audio, um resumo ou abrir um deep dive.",
                "Perfect, we got your confirmation. If you want, I can resend the PDF, the audio, a summary, or open a deep dive."
            ),
            metadata: { intent },
        });

        await insertFunnelEvent(admin, "whatsapp_command_processed", {
            client_id: client.id,
            report_id: latestReport?.id || null,
            intent,
            result: "acknowledged",
        });

        return { intent, action: "acknowledged" };
    }

    if (intent === "deep_dive") {
        const topic = body.replace(/deep dive/gi, "").trim() || body.trim();
        const { data: created } = await admin
            .from("deep_dive_requests")
            .insert({
                client_id: client.id,
                topic,
                context: "Solicitado via WhatsApp",
                reference_report_id: latestReport?.id || null,
                status: "pending",
            })
            .select("id")
            .single();

        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport?.id || null,
            phoneNumber,
            messageType: "deep_dive_ack",
            body: textByLocale(
                client.preferred_language,
                "Seu pedido de deep dive foi recebido. Nossa equipe vai aprofundar esse tema e atualizar voce pela plataforma.",
                "Your deep dive request has been received. Our team will explore this topic and update you in the platform."
            ),
            metadata: {
                intent,
                deep_dive_request_id: created?.id || null,
            },
        });

        await insertFunnelEvent(admin, "whatsapp_deep_dive_requested", {
            client_id: client.id,
            report_id: latestReport?.id || null,
            deep_dive_request_id: created?.id || null,
            channel: "whatsapp",
        });

        return { intent, action: "deep_dive_created" };
    }

    if (!latestReport) {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            phoneNumber,
            messageType: "help",
            body: textByLocale(
                client.preferred_language,
                "Ainda nao encontrei um relatorio pronto para sua conta. Voce pode responder com: resumo, pdf, audio ou deep dive.",
                "I could not find a ready report for your account yet. You can reply with: summary, pdf, audio, or deep dive."
            ),
            metadata: { intent, fallback: "no_report" },
        });
        await insertFunnelEvent(admin, "whatsapp_command_processed", {
            client_id: client.id,
            intent,
            result: "no_report",
        });
        return { intent, action: "no_report" };
    }

    const fullReport = await getLatestReport(admin, client.id);
    const files = await getReportFiles(admin, latestReport.id);
    const signedAssets = await buildSignedAssetMap(admin, files);
    const latestDeepDive = await getLatestDeepDive(admin, client.id);

    if (intent === "summary" || intent === "report") {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport.id,
            phoneNumber,
            messageType: "summary",
            body: textByLocale(
                client.preferred_language,
                `Resumo do seu ultimo relatorio${fullReport?.title ? ` (${fullReport.title})` : ""}: ${fullReport?.summary || "Seu relatorio esta pronto na plataforma."}`,
                `Summary of your latest report${fullReport?.title ? ` (${fullReport.title})` : ""}: ${fullReport?.summary || "Your report is ready in the platform."}`
            ),
            metadata: {
                intent,
                asset_urls: {
                    pdf_full: signedAssets.pdf_full || null,
                    pdf_onepage: signedAssets.pdf_onepage || null,
                    audio_mp3: signedAssets.audio_mp3 || null,
                },
            },
        });
    } else if (intent === "resend") {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport.id,
            phoneNumber,
            messageType: "resend",
            body: textByLocale(
                client.preferred_language,
                `Reenviei os acessos mais recentes para voce. PDF: ${signedAssets.pdf_full || signedAssets.pdf_onepage || "indisponivel"} | Audio: ${signedAssets.audio_mp3 || "indisponivel"}`,
                `I resent the latest access links for you. PDF: ${signedAssets.pdf_full || signedAssets.pdf_onepage || "unavailable"} | Audio: ${signedAssets.audio_mp3 || "unavailable"}`
            ),
            metadata: {
                intent,
                asset_urls: {
                    pdf_full: signedAssets.pdf_full || signedAssets.pdf_onepage || null,
                    audio_mp3: signedAssets.audio_mp3 || null,
                },
            },
        });
    } else if (intent === "pdf") {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport.id,
            phoneNumber,
            messageType: "pdf",
            body: textByLocale(
                client.preferred_language,
                `Aqui esta o link do PDF mais recente: ${signedAssets.pdf_full || signedAssets.pdf_onepage || "indisponivel no momento"}`,
                `Here is the latest PDF link: ${signedAssets.pdf_full || signedAssets.pdf_onepage || "currently unavailable"}`
            ),
            metadata: {
                intent,
                asset_url: signedAssets.pdf_full || signedAssets.pdf_onepage || null,
            },
        });
    } else if (intent === "audio") {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport.id,
            phoneNumber,
            messageType: "audio",
            body: textByLocale(
                client.preferred_language,
                `Aqui esta o audio briefing mais recente: ${signedAssets.audio_mp3 || "indisponivel no momento"}`,
                `Here is the latest audio briefing: ${signedAssets.audio_mp3 || "currently unavailable"}`
            ),
            metadata: {
                intent,
                asset_url: signedAssets.audio_mp3 || null,
            },
        });
    } else if (intent === "status") {
        const deepDiveStatus = latestDeepDive
            ? textByLocale(
                client.preferred_language,
                `Deep dive: ${latestDeepDive.status}${latestDeepDive.topic ? ` sobre "${latestDeepDive.topic}"` : ""}.`,
                `Deep dive: ${latestDeepDive.status}${latestDeepDive.topic ? ` about "${latestDeepDive.topic}"` : ""}.`
            )
            : textByLocale(
                client.preferred_language,
                "Nao encontrei deep dive recente em aberto.",
                "I could not find any recent deep dive in progress."
            );

        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport.id,
            phoneNumber,
            messageType: "status",
            body: textByLocale(
                client.preferred_language,
                `Status atual: ultimo relatorio pronto${fullReport?.title ? ` (${fullReport.title})` : ""}. ${deepDiveStatus}`,
                `Current status: latest report is ready${fullReport?.title ? ` (${fullReport.title})` : ""}. ${deepDiveStatus}`
            ),
            metadata: {
                intent,
                deep_dive_status: latestDeepDive?.status || null,
            },
        });
    } else {
        await queueOutboundMessage(admin, {
            clientId: client.id,
            reportId: latestReport.id,
            phoneNumber,
            messageType: "help",
            body: textByLocale(
                client.preferred_language,
                "Posso ajudar com estes comandos: resumo, pdf, audio, status, reenviar e deep dive.",
                "I can help with these commands: summary, pdf, audio, status, resend, and deep dive."
            ),
            metadata: {
                intent,
                supported_commands: ["summary", "pdf", "audio", "status", "resend", "deep_dive"],
            },
        });
    }

    await insertFunnelEvent(admin, "whatsapp_command_processed", {
        client_id: client.id,
        report_id: latestReport.id,
        intent,
        result: "outbound_queued",
    });

    return { intent, action: "outbound_queued" };
}

function getWhatsappOutboundUrl() {
    return process.env.WHATSAPP_OUTBOUND_WEBHOOK_URL || process.env.WHATSAPP_PROVIDER_WEBHOOK_URL || "";
}

function getWhatsappOutboundSecret() {
    return process.env.WHATSAPP_OUTBOUND_SECRET || process.env.WHATSAPP_WEBHOOK_SECRET || "";
}

function getWhatsappDeliveryMode() {
    return process.env.WHATSAPP_DELIVERY_MODE || "webhook";
}

async function deliverWhatsappMessage(admin: AdminClient, message: MessageRow) {
    if (getWhatsappDeliveryMode() === "dry_run") {
        const { error } = await admin
            .from("whatsapp_messages")
            .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                provider_message_id: `dry-run-${message.id}`,
                metadata: {
                    ...(message.metadata || {}),
                    delivered_via: "dry_run",
                },
            })
            .eq("id", message.id);

        if (error) throw error;
        return;
    }

    const outboundUrl = getWhatsappOutboundUrl();
    if (!outboundUrl) {
        throw new Error("WHATSAPP_OUTBOUND_WEBHOOK_URL nao configurado");
    }

    const response = await fetch(outboundUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-whatsapp-secret": getWhatsappOutboundSecret(),
        },
        body: JSON.stringify({
            message_id: message.id,
            client_id: message.client_id,
            report_id: message.report_id || null,
            phone_number: message.phone_number || null,
            body: message.body,
            message_type: message.message_type || "text",
            metadata: message.metadata || {},
        }),
    });

    if (!response.ok) {
        throw new Error(`provider_http_${response.status}`);
    }

    const payload = await response.json().catch(() => ({}));
    const providerMessageId =
        typeof payload?.provider_message_id === "string" ? payload.provider_message_id : null;

    const { error } = await admin
        .from("whatsapp_messages")
        .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: providerMessageId,
            metadata: {
                ...(message.metadata || {}),
                delivered_via: "outbound_webhook",
            },
        })
        .eq("id", message.id);

    if (error) throw error;
}

export async function processQueuedWhatsappMessages(mode: "manual" | "scheduled") {
    const admin = createAdminClient();
    const { data } = await admin
        .from("whatsapp_messages")
        .select("id, client_id, report_id, phone_number, body, message_type, metadata")
        .eq("direction", "outbound")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(25);

    const messages = (data as MessageRow[] | null) || [];
    let sent = 0;
    let failed = 0;

    for (const message of messages) {
        try {
            await deliverWhatsappMessage(admin, message);
            sent += 1;
        } catch (error) {
            failed += 1;
            await admin
                .from("whatsapp_messages")
                .update({
                    status: "failed",
                    metadata: {
                        ...(message.metadata || {}),
                        last_error: error instanceof Error ? error.message : "delivery_failed",
                        failed_in_mode: mode,
                    },
                })
                .eq("id", message.id);
        }
    }

    return {
        mode,
        total: messages.length,
        sent,
        failed,
    };
}
