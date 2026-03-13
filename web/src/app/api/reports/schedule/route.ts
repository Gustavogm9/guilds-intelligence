import { NextResponse } from "next/server";

import { sendOperationalNotification } from "@/lib/ops-alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueReportGeneration, recordStandaloneReportJob } from "@/lib/report-generation";
import { evaluateSchedulerWindow, schedulerReasonLabel } from "@/lib/scheduler";

type ClientScheduleRow = {
    id: string;
    company_name: string;
    is_active: boolean;
    scheduler_enabled?: boolean | null;
    scheduler_timezone?: string | null;
    scheduler_window_start_hour?: number | null;
    scheduler_window_end_hour?: number | null;
    scheduler_business_days_only?: boolean | null;
    scheduler_preferred_weekday?: number | null;
    scheduler_preferred_day_of_month?: number | null;
    scheduler_paused_until?: string | null;
    scheduler_pause_reason?: string | null;
    scheduler_blackout_start_at?: string | null;
    scheduler_blackout_end_at?: string | null;
    scheduler_blackout_reason?: string | null;
    scheduler_skip_dates?: string[] | null;
    scheduler_blackout_weekdays?: number[] | null;
    plans:
        | {
            name?: string | null;
            reports_per_month?: number | null;
            scheduler_default_timezone?: string | null;
            scheduler_default_window_start_hour?: number | null;
            scheduler_default_window_end_hour?: number | null;
            scheduler_default_business_days_only?: boolean | null;
            scheduler_default_weekday?: number | null;
            scheduler_default_day_of_month?: number | null;
        }
        | {
            name?: string | null;
            reports_per_month?: number | null;
            scheduler_default_timezone?: string | null;
            scheduler_default_window_start_hour?: number | null;
            scheduler_default_window_end_hour?: number | null;
            scheduler_default_business_days_only?: boolean | null;
            scheduler_default_weekday?: number | null;
            scheduler_default_day_of_month?: number | null;
        }[]
        | null;
};

function getSchedulerSecret() {
    return process.env.REPORT_SCHEDULER_SECRET || process.env.PYTHON_WORKER_SECRET || "";
}

function asSinglePlan(
    plan:
        | {
            name?: string | null;
            reports_per_month?: number | null;
        }
        | {
            name?: string | null;
            reports_per_month?: number | null;
        }[]
        | null
) {
    return Array.isArray(plan) ? plan[0] || null : plan;
}

function intervalDays(reportsPerMonth: number) {
    if (reportsPerMonth <= 0) return 30;
    return Math.max(Math.floor(30 / reportsPerMonth), 1);
}

export async function POST(request: Request) {
    const expectedSecret = getSchedulerSecret();
    const providedSecret = request.headers.get("x-scheduler-secret");

    if (!expectedSecret || providedSecret !== expectedSecret) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: holidayRows } = await supabase
        .from("scheduler_holidays")
        .select("holiday_date")
        .eq("is_active", true);
    const { data: clients } = await supabase
        .from("clients")
        .select(
            "id, company_name, is_active, scheduler_enabled, scheduler_timezone, scheduler_window_start_hour, scheduler_window_end_hour, scheduler_business_days_only, scheduler_preferred_weekday, scheduler_preferred_day_of_month, scheduler_paused_until, scheduler_pause_reason, scheduler_blackout_start_at, scheduler_blackout_end_at, scheduler_blackout_reason, scheduler_skip_dates, scheduler_blackout_weekdays, plans(name, reports_per_month, scheduler_default_timezone, scheduler_default_window_start_hour, scheduler_default_window_end_hour, scheduler_default_business_days_only, scheduler_default_weekday, scheduler_default_day_of_month)"
        )
        .eq("is_active", true);

    const allClients = (clients as ClientScheduleRow[] | null) || [];
    const sharedHolidayDates = (holidayRows || []).map((row: { holiday_date: string }) => row.holiday_date);
    const results: Array<{ client_id: string; company_name: string; status: string; detail?: string }> = [];

    for (const client of allClients) {
        const plan = asSinglePlan(client.plans);
        const reportsPerMonth = Number(plan?.reports_per_month || 0);
        const spacingDays = intervalDays(reportsPerMonth);
        const scheduleCheck = evaluateSchedulerWindow(client, new Date(), {
            sharedHolidayDates,
        });

        if (!scheduleCheck.allowed) {
            await recordStandaloneReportJob(
                {
                    clientId: client.id,
                    source: "scheduler",
                    status: "skipped",
                    reason: schedulerReasonLabel(scheduleCheck.reason),
                    metadata: {
                        company_name: client.company_name,
                        timezone: scheduleCheck.timezone,
                        local_hour: scheduleCheck.localHour,
                        local_weekday: scheduleCheck.localWeekday,
                        local_day_of_month: scheduleCheck.localDayOfMonth,
                        pause_reason: client.scheduler_pause_reason || null,
                        blackout_reason: client.scheduler_blackout_reason || null,
                        blackout_start_at: client.scheduler_blackout_start_at || null,
                        blackout_end_at: client.scheduler_blackout_end_at || null,
                        skip_dates: client.scheduler_skip_dates || [],
                        blackout_weekdays: client.scheduler_blackout_weekdays || [],
                    },
                },
                supabase
            );

            results.push({
                client_id: client.id,
                company_name: client.company_name,
                status: "skipped",
                detail: schedulerReasonLabel(scheduleCheck.reason),
            });
            continue;
        }

        const [{ data: lastReport }, { count: monthlyCount }] = await Promise.all([
            supabase
                .from("reports")
                .select("id, created_at")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from("billing_log")
                .select("id", { count: "exact", head: true })
                .eq("client_id", client.id)
                .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ]);

        const hasCapacity = (monthlyCount || 0) < reportsPerMonth;
        const dueByCadence =
            !lastReport ||
            Date.now() - new Date(lastReport.created_at).getTime() >= spacingDays * 24 * 60 * 60 * 1000;

        if (!hasCapacity) {
            await recordStandaloneReportJob(
                {
                    clientId: client.id,
                    source: "scheduler",
                    status: "skipped",
                    reason: "limite_mensal_atingido",
                    metadata: {
                        company_name: client.company_name,
                        reports_per_month: reportsPerMonth,
                        monthly_count: monthlyCount || 0,
                    },
                },
                supabase
            );

            results.push({
                client_id: client.id,
                company_name: client.company_name,
                status: "skipped",
                detail: "limite_mensal_atingido",
            });
            continue;
        }

        if (!dueByCadence) {
            await recordStandaloneReportJob(
                {
                    clientId: client.id,
                    source: "scheduler",
                    status: "skipped",
                    reason: "ainda_nao_esta_na_janela_de_geracao",
                    metadata: {
                        company_name: client.company_name,
                        spacing_days: spacingDays,
                        last_report_created_at: lastReport?.created_at || null,
                    },
                },
                supabase
            );

            results.push({
                client_id: client.id,
                company_name: client.company_name,
                status: "skipped",
                detail: "ainda_nao_esta_na_janela_de_geracao",
            });
            continue;
        }

        const queued = await queueReportGeneration(client.id, "scheduler", supabase, {
            metadata: {
                initiated_via: "scheduler_api",
                spacing_days: spacingDays,
                timezone: scheduleCheck.timezone,
            },
        });
        results.push({
            client_id: client.id,
            company_name: client.company_name,
            status: queued.ok ? "queued" : "error",
            detail: queued.ok ? queued.reportId : queued.error,
        });
    }

    try {
        await supabase.from("funnel_events").insert({
            event_type: "scheduler_run",
            metadata: {
                total_clients: allClients.length,
                queued: results.filter((item) => item.status === "queued").length,
                skipped: results.filter((item) => item.status === "skipped").length,
                errors: results.filter((item) => item.status === "error").length,
                executed_at: new Date().toISOString(),
            },
        });
    } catch {
        // tracking nao deve bloquear a execucao
    }

    const queued = results.filter((item) => item.status === "queued").length;
    const skipped = results.filter((item) => item.status === "skipped").length;
    const errors = results.filter((item) => item.status === "error").length;

    await sendOperationalNotification({
        title: "Scheduler executado",
        message: "A rotina recorrente de geracao foi executada.",
        severity: errors > 0 ? "warning" : "info",
        category: errors > 0 ? "worker_unavailable" : "unknown",
        metadata: {
            total_clients: allClients.length,
            queued,
            skipped,
            errors,
        },
    });

    return NextResponse.json({
        success: true,
        total_clients: allClients.length,
        queued,
        skipped,
        errors,
        results,
    });
}
