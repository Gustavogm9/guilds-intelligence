import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyOperationalError, sendOperationalNotification } from "@/lib/ops-alerts";
import { createClient } from "@/lib/supabase/server";

type PlanInfo = {
    name?: string;
    price_monthly?: number;
    reports_per_month?: number;
    formats?: unknown;
};

type TriggerSource = "admin" | "scheduler" | "retry";
type ReportJobKind = "on_demand" | "recurring" | "retry";
type ReportJobStatus = "queued" | "triggered" | "skipped" | "error";

type QueueReportResult =
    | { ok: true; reportId: string; jobId?: string | null }
    | { ok: false; status: number; error: string };

type WorkerHealth =
    | { ok: true; status: string; url: string; detail: string }
    | { ok: false; status: string; url: string; detail: string };

type RecoveryMode = "manual" | "auto";

type RecoveryResult = {
    report_id: string;
    client_id: string;
    company_name: string;
    status: "retried" | "skipped" | "error";
    detail: string;
    attempts: number;
};

type RecoverySummary =
    | { ok: true; results: RecoveryResult[] }
    | { ok: false; status: number; error: string };

const RETRY_BACKOFF_MINUTES = [15, 60, 360];
const MAX_RETRY_ATTEMPTS = 3;

function startOfMonthIso() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth.toISOString();
}

function getWorkerConfig() {
    return {
        workerUrl: process.env.PYTHON_WORKER_URL,
        workerSecret: process.env.PYTHON_WORKER_SECRET,
    };
}

function sourceToJobKind(source: TriggerSource): ReportJobKind {
    if (source === "scheduler") return "recurring";
    if (source === "retry") return "retry";
    return "on_demand";
}

type ReportJobPayload = {
    clientId: string;
    reportId?: string | null;
    source: TriggerSource;
    jobKind?: ReportJobKind;
    status: ReportJobStatus;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    initiatedByUserId?: string | null;
};

async function createReportJob(
    supabase: SupabaseClient,
    payload: ReportJobPayload
) {
    try {
        const { data } = await supabase
            .from("report_jobs")
            .insert({
                client_id: payload.clientId,
                report_id: payload.reportId || null,
                trigger_source: payload.source,
                job_kind: payload.jobKind || sourceToJobKind(payload.source),
                status: payload.status,
                reason: payload.reason || null,
                metadata: payload.metadata || {},
                initiated_by_user_id: payload.initiatedByUserId || null,
                started_at: new Date().toISOString(),
                finished_at: ["skipped", "error", "triggered"].includes(payload.status)
                    ? new Date().toISOString()
                    : null,
            })
            .select("id")
            .single();

        return data?.id || null;
    } catch {
        return null;
    }
}

async function updateReportJob(
    supabase: SupabaseClient,
    jobId: string | null | undefined,
    payload: {
        status?: ReportJobStatus;
        reason?: string | null;
        reportId?: string | null;
        metadata?: Record<string, unknown>;
    }
) {
    if (!jobId) return;

    try {
        await supabase
            .from("report_jobs")
            .update({
                status: payload.status,
                reason: payload.reason,
                report_id: payload.reportId,
                metadata: payload.metadata,
                finished_at: payload.status ? new Date().toISOString() : undefined,
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId);
    } catch {
        // tabela pode ainda nao existir no ambiente
    }
}

async function trackOperationalEvent(
    supabase: SupabaseClient,
    eventType: string,
    metadata: Record<string, unknown>
) {
    try {
        await supabase.from("funnel_events").insert({
            event_type: eventType,
            metadata,
        });
    } catch {
        // observabilidade nunca deve quebrar o fluxo principal
    }
}

async function triggerWorkerForReport({
    supabase,
    clientId,
    reportId,
    source,
    companyName,
    planName,
    jobId,
}: {
    supabase: SupabaseClient;
    clientId: string;
    reportId: string;
    source: TriggerSource;
    companyName?: string | null;
    planName?: string | null;
    jobId?: string | null;
}): Promise<QueueReportResult> {
    const { workerUrl, workerSecret } = getWorkerConfig();

    if (!workerUrl || !workerSecret) {
        const message = "Worker Python nao configurado no ambiente.";
        const classification = classifyOperationalError(message);
        await supabase
            .from("reports")
            .update({
                status: "error",
                error_message: message,
            })
            .eq("id", reportId);

        await trackOperationalEvent(supabase, "report_generation_failed", {
            source,
            client_id: clientId,
            report_id: reportId,
            company_name: companyName || null,
            error: message,
            category: classification.category,
            severity: classification.severity,
        });

        await sendOperationalNotification({
            title: "Falha de configuracao no disparo de relatorio",
            message,
            severity: classification.severity,
            category: classification.category,
            metadata: {
                source,
                client_id: clientId,
                report_id: reportId,
                company_name: companyName || null,
            },
        });

        await updateReportJob(supabase, jobId, {
            status: "error",
            reason: "worker_nao_configurado",
            reportId,
            metadata: {
                source,
                client_id: clientId,
                report_id: reportId,
                company_name: companyName || null,
            },
        });

        return { ok: false, status: 500, error: message };
    }

    const workerResponse = await fetch(`${workerUrl.replace(/\/$/, "")}/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-worker-secret": workerSecret,
        },
        body: JSON.stringify({
            client_id: clientId,
            report_id: reportId,
        }),
    });

    if (!workerResponse.ok) {
        const workerBody = await workerResponse.text();
        const message = `Falha ao acionar worker: ${workerBody}`.slice(0, 2000);
        const classification = classifyOperationalError(message);

        await supabase
            .from("reports")
            .update({
                status: "error",
                error_message: message,
            })
            .eq("id", reportId);

        await trackOperationalEvent(supabase, "report_generation_failed", {
            source,
            client_id: clientId,
            report_id: reportId,
            company_name: companyName || null,
            error: message,
            category: classification.category,
            severity: classification.severity,
        });

        await sendOperationalNotification({
            title: "Falha ao acionar worker de geracao",
            message,
            severity: classification.severity,
            category: classification.category,
            metadata: {
                source,
                client_id: clientId,
                report_id: reportId,
                company_name: companyName || null,
            },
        });

        await updateReportJob(supabase, jobId, {
            status: "error",
            reason: "falha_ao_acionar_worker",
            reportId,
            metadata: {
                source,
                client_id: clientId,
                report_id: reportId,
                company_name: companyName || null,
                worker_error: message,
            },
        });

        return { ok: false, status: 502, error: "Erro ao iniciar geracao no worker Python." };
    }

    await trackOperationalEvent(supabase, "report_generation_triggered", {
        source,
        client_id: clientId,
        report_id: reportId,
        company_name: companyName || null,
        plan_name: planName || null,
    });

    if (source === "retry") {
        await trackOperationalEvent(supabase, "report_retry_triggered", {
            client_id: clientId,
            report_id: reportId,
            company_name: companyName || null,
        });
    }

    await updateReportJob(supabase, jobId, {
        status: "triggered",
        reportId,
        reason: null,
        metadata: {
            source,
            client_id: clientId,
            report_id: reportId,
            company_name: companyName || null,
            plan_name: planName || null,
        },
    });

    return { ok: true, reportId, jobId };
}

async function getRetryAttemptsMap(supabase: SupabaseClient) {
    const { data } = await supabase
        .from("funnel_events")
        .select("created_at, metadata")
        .in("event_type", ["report_retry_triggered", "report_auto_recovery_triggered"])
        .order("created_at", { ascending: false })
        .limit(500);

    const attempts = new Map<string, { count: number; lastAttemptAt: string | null }>();

    (data || []).forEach((row) => {
        const metadata = (row.metadata as Record<string, unknown>) || {};
        const reportId = String(metadata.report_id || "");
        if (!reportId) return;

        const current = attempts.get(reportId) || { count: 0, lastAttemptAt: null };
        attempts.set(reportId, {
            count: current.count + 1,
            lastAttemptAt: current.lastAttemptAt || row.created_at,
        });
    });

    return attempts;
}

export async function queueReportGeneration(
    clientId: string,
    source: TriggerSource = "admin",
    supabaseClient?: SupabaseClient,
    options?: {
        initiatedByUserId?: string | null;
        metadata?: Record<string, unknown>;
        skipQuotaCheck?: boolean;
    }
): Promise<QueueReportResult> {
    const supabase = supabaseClient || (await createClient());

    const { data: client } = await supabase
        .from("clients")
        .select("company_name, plan_id, plans(name, price_monthly, reports_per_month, formats)")
        .eq("id", clientId)
        .single();

    if (!client) {
        return { ok: false, status: 404, error: "Cliente não encontrado" };
    }

    const { count } = await supabase
        .from("billing_log")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .gte("created_at", startOfMonthIso());

    const plan = (Array.isArray(client.plans) ? client.plans[0] : client.plans) as PlanInfo | null;
    const limit = Number(plan?.reports_per_month) || 0;

    if (!options?.skipQuotaCheck && count !== null && count >= limit) {
        await createReportJob(supabase, {
            clientId,
            source,
            status: "error",
            reason: "limite_mensal_atingido",
            initiatedByUserId: options?.initiatedByUserId || null,
            metadata: {
                ...(options?.metadata || {}),
                limit,
                used_reports: count,
                company_name: client.company_name,
            },
        });

        return {
            ok: false,
            status: 429,
            error: `Limite de ${limit} relatórios/mês atingido (${count} gerados)`,
        };
    }

    const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
            client_id: clientId,
            title: `Relatorio de Inteligencia - ${new Date().toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
            })}`,
            status: "queued",
        })
        .select("id")
        .single();

    if (reportError || !report) {
        console.error("Error creating report:", reportError);
        await createReportJob(supabase, {
            clientId,
            source,
            status: "error",
            reason: "erro_ao_criar_relatorio",
            initiatedByUserId: options?.initiatedByUserId || null,
            metadata: {
                ...(options?.metadata || {}),
                company_name: client.company_name,
            },
        });
        return { ok: false, status: 500, error: "Erro ao criar relatorio" };
    }

    const jobId = await createReportJob(supabase, {
        clientId,
        reportId: report.id,
        source,
        status: "queued",
        initiatedByUserId: options?.initiatedByUserId || null,
        metadata: {
            ...(options?.metadata || {}),
            company_name: client.company_name,
            plan_name: plan?.name || null,
        },
    });

    return triggerWorkerForReport({
        supabase,
        clientId,
        reportId: report.id,
        source,
        companyName: client.company_name,
        planName: plan?.name || null,
        jobId,
    });
}

export async function retryExistingReport(
    reportId: string,
    supabaseClient?: SupabaseClient,
    options?: {
        initiatedByUserId?: string | null;
        metadata?: Record<string, unknown>;
    }
): Promise<QueueReportResult> {
    const supabase = supabaseClient || (await createClient());

    const { data: report } = await supabase
        .from("reports")
        .select("id, client_id, status")
        .eq("id", reportId)
        .single();

    if (!report) {
        return { ok: false, status: 404, error: "Relatorio nao encontrado" };
    }

    if (report.status !== "error") {
        return { ok: false, status: 409, error: "Apenas relatorios com erro podem ser reprocessados." };
    }

    await supabase
        .from("reports")
        .update({
            status: "queued",
            error_message: null,
        })
        .eq("id", reportId);

    const { data: client } = await supabase
        .from("clients")
        .select("company_name, plans(name)")
        .eq("id", report.client_id)
        .single();

    const plan = client?.plans ? (Array.isArray(client.plans) ? client.plans[0] : client.plans) : null;
    const jobId = await createReportJob(supabase, {
        clientId: report.client_id,
        reportId,
        source: "retry",
        status: "queued",
        initiatedByUserId: options?.initiatedByUserId || null,
        metadata: {
            ...(options?.metadata || {}),
            company_name: client?.company_name || null,
            plan_name: plan?.name || null,
        },
    });

    return triggerWorkerForReport({
        supabase,
        clientId: report.client_id,
        reportId,
        source: "retry",
        companyName: client?.company_name || null,
        planName: plan?.name || null,
        jobId,
    });
}

export async function recordStandaloneReportJob(
    payload: ReportJobPayload,
    supabaseClient?: SupabaseClient
) {
    const supabase = supabaseClient || (await createClient());
    return createReportJob(supabase, payload);
}

export async function recoverFailedReports(
    mode: RecoveryMode,
    supabaseClient?: SupabaseClient
): Promise<RecoverySummary> {
    const supabase = supabaseClient || (await createClient());
    const retryAttempts = await getRetryAttemptsMap(supabase);

    const { data: reports } = await supabase
        .from("reports")
        .select("id, client_id, created_at, error_message, clients(company_name)")
        .eq("status", "error")
        .order("created_at", { ascending: true })
        .limit(25);

    const erroredReports =
        (reports as Array<{
            id: string;
            client_id: string;
            created_at: string;
            error_message?: string | null;
            clients?: { company_name?: string | null } | { company_name?: string | null }[] | null;
        }> | null) || [];

    const results: RecoveryResult[] = [];

    for (const report of erroredReports) {
        const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
        const retryMeta = retryAttempts.get(report.id) || { count: 0, lastAttemptAt: null };

        if (retryMeta.count >= MAX_RETRY_ATTEMPTS) {
            await sendOperationalNotification({
                title: "Relatorio excedeu o limite de tentativas",
                message: "O recover automatico atingiu o numero maximo de retries configurado.",
                severity: "warning",
                category: "worker_unavailable",
                metadata: {
                    report_id: report.id,
                    client_id: report.client_id,
                    company_name: client?.company_name || null,
                    attempts: retryMeta.count,
                },
            });

            results.push({
                report_id: report.id,
                client_id: report.client_id,
                company_name: client?.company_name || "Cliente",
                status: "skipped",
                detail: "limite_de_tentativas_atingido",
                attempts: retryMeta.count,
            });
            continue;
        }

        const requiredBackoffMinutes = RETRY_BACKOFF_MINUTES[retryMeta.count] || RETRY_BACKOFF_MINUTES[RETRY_BACKOFF_MINUTES.length - 1];
        const lastAttemptAt = retryMeta.lastAttemptAt ? new Date(retryMeta.lastAttemptAt).getTime() : 0;
        const backoffSatisfied = !lastAttemptAt || Date.now() - lastAttemptAt >= requiredBackoffMinutes * 60 * 1000;

        if (!backoffSatisfied) {
            results.push({
                report_id: report.id,
                client_id: report.client_id,
                company_name: client?.company_name || "Cliente",
                status: "skipped",
                detail: `aguardando_backoff_${requiredBackoffMinutes}m`,
                attempts: retryMeta.count,
            });
            continue;
        }

        const retryResult = await retryExistingReport(report.id, supabase, {
            metadata: {
                recovery_mode: mode,
                initiated_via: mode === "auto" ? "recover_auto" : "recover_manual",
            },
        });
        if (retryResult.ok) {
            await trackOperationalEvent(supabase, "report_auto_recovery_triggered", {
                mode,
                report_id: report.id,
                client_id: report.client_id,
                company_name: client?.company_name || null,
                attempts_before_retry: retryMeta.count,
            });

            results.push({
                report_id: report.id,
                client_id: report.client_id,
                company_name: client?.company_name || "Cliente",
                status: "retried",
                detail: retryResult.reportId,
                attempts: retryMeta.count + 1,
            });
        } else {
            results.push({
                report_id: report.id,
                client_id: report.client_id,
                company_name: client?.company_name || "Cliente",
                status: "error",
                detail: retryResult.error,
                attempts: retryMeta.count,
            });
        }
    }

    return { ok: true, results };
}

export async function checkWorkerHealth(): Promise<WorkerHealth> {
    const { workerUrl } = getWorkerConfig();

    if (!workerUrl) {
        return {
            ok: false,
            status: "unconfigured",
            url: "",
            detail: "PYTHON_WORKER_URL nao configurado.",
        };
    }

    try {
        const response = await fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            return {
                ok: false,
                status: "down",
                url: workerUrl,
                detail: `Health check retornou HTTP ${response.status}.`,
            };
        }

        const body = (await response.json()) as { status?: string };
        return {
            ok: body.status === "ok",
            status: body.status || "unknown",
            url: workerUrl,
            detail: body.status === "ok" ? "Worker respondendo normalmente." : "Resposta inesperada do worker.",
        };
    } catch (error) {
        return {
            ok: false,
            status: "down",
            url: workerUrl,
            detail: error instanceof Error ? error.message : "Falha ao conectar no worker.",
        };
    }
}

export function estimateProcessingMetrics(
    reports: Array<{ created_at: string; completed_at: string | null }>
) {
    const completed = reports.filter((report) => report.completed_at);
    if (completed.length === 0) {
        return {
            completedCount: 0,
            averageMinutes: null as number | null,
        };
    }

    const totalMinutes = completed.reduce((sum, report) => {
        const createdAt = new Date(report.created_at).getTime();
        const completedAt = new Date(report.completed_at as string).getTime();
        return sum + Math.max((completedAt - createdAt) / 60000, 0);
    }, 0);

    return {
        completedCount: completed.length,
        averageMinutes: Math.round(totalMinutes / completed.length),
    };
}

export function errorJson(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}
