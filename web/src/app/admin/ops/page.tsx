import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateProcessingMetrics, checkWorkerHealth } from "@/lib/report-generation";

function getSchedulerStatus() {
    const configured = Boolean(process.env.REPORT_SCHEDULER_SECRET || process.env.PYTHON_WORKER_SECRET);
    return {
        configured,
        label: configured ? "Pronto para cron externo" : "Falta configurar segredo do scheduler",
    };
}

type OpsAlert = {
    level: "critical" | "warning" | "info";
    title: string;
    description: string;
};

function severityClasses(level: OpsAlert["level"]) {
    if (level === "critical") return "border-red-200 bg-red-50";
    if (level === "warning") return "border-amber-200 bg-amber-50";
    return "border-blue-200 bg-blue-50";
}

export default async function AdminOpsPage({
    searchParams,
}: {
    searchParams: Promise<{ recover?: string }>;
}) {
    const params = await searchParams;
    const workerHealth = await checkWorkerHealth();
    const scheduler = getSchedulerStatus();
    let schedulerRuns: Array<{ created_at: string; metadata: unknown }> = [];
    let generationFailures: Array<{ created_at: string; metadata: unknown }> = [];
    let latestSchedulerSuccess: string | null = null;
    let autoRecoverCount = 0;
    let latestWorkerSuccess: string | null = null;
    let avgWorkerDurationSeconds: number | null = null;
    let recentNotifications: Array<{ created_at: string; event_type: string; metadata: unknown }> = [];
    const queueCounts = { queued: 0, processing: 0, error: 0 };
    const processingMetrics = { completedCount: 0, averageMinutes: null as number | null };
    const notificationCounts = { success: 0, successSkipped: 0, failureSent: 0, failureFailed: 0 };

    try {
        const supabase = createAdminClient();

        const [
            { data: runs },
            { data: failures },
            { data: queueRows },
            { data: autoRecoverRows },
            { data: completedReports },
            { data: workerCompletedRows },
            { data: notificationRows },
        ] = await Promise.all([
            supabase
                .from("funnel_events")
                .select("created_at, metadata")
                .eq("event_type", "scheduler_run")
                .order("created_at", { ascending: false })
                .limit(5),
            supabase
                .from("funnel_events")
                .select("created_at, metadata")
                .eq("event_type", "report_generation_failed")
                .order("created_at", { ascending: false })
                .limit(5),
            supabase.from("reports").select("status").in("status", ["queued", "processing", "error"]),
            supabase
                .from("funnel_events")
                .select("created_at")
                .eq("event_type", "report_auto_recovery_triggered")
                .order("created_at", { ascending: false })
                .limit(50),
            supabase
                .from("reports")
                .select("created_at, completed_at")
                .not("completed_at", "is", null)
                .order("completed_at", { ascending: false })
                .limit(50),
            supabase
                .from("funnel_events")
                .select("created_at, metadata")
                .eq("event_type", "worker_job_completed")
                .order("created_at", { ascending: false })
                .limit(20),
            supabase
                .from("funnel_events")
                .select("created_at, event_type, metadata")
                .in("event_type", [
                    "report_notification_sent",
                    "report_notification_skipped",
                    "report_failure_notification_sent",
                    "report_failure_notification_failed",
                ])
                .order("created_at", { ascending: false })
                .limit(20),
        ]);

        schedulerRuns = runs || [];
        generationFailures = failures || [];
        autoRecoverCount = (autoRecoverRows || []).length;
        latestSchedulerSuccess =
            schedulerRuns.find((run) => Number((run.metadata as Record<string, unknown>)?.errors || 0) === 0)?.created_at || null;
        latestWorkerSuccess = workerCompletedRows?.[0]?.created_at || null;
        recentNotifications = notificationRows || [];

        (queueRows || []).forEach((row: { status: string }) => {
            if (row.status in queueCounts) {
                queueCounts[row.status as keyof typeof queueCounts]++;
            }
        });

        const metrics = estimateProcessingMetrics((completedReports || []) as Array<{
            created_at: string;
            completed_at: string | null;
        }>);
        processingMetrics.completedCount = metrics.completedCount;
        processingMetrics.averageMinutes = metrics.averageMinutes;

        const completedWorkerRows = workerCompletedRows || [];
        if (completedWorkerRows.length > 0) {
            const durations = completedWorkerRows
                .map((row) => Number(((row.metadata as Record<string, unknown>) || {}).duration_seconds || 0))
                .filter((value) => value > 0);
            if (durations.length > 0) {
                avgWorkerDurationSeconds = Math.round(
                    durations.reduce((sum, value) => sum + value, 0) / durations.length
                );
            }
        }

        recentNotifications.forEach((row) => {
            if (row.event_type === "report_notification_sent") notificationCounts.success++;
            if (row.event_type === "report_notification_skipped") notificationCounts.successSkipped++;
            if (row.event_type === "report_failure_notification_sent") notificationCounts.failureSent++;
            if (row.event_type === "report_failure_notification_failed") notificationCounts.failureFailed++;
        });
    } catch {
        // ambiente sem service role nao deve derrubar a tela
    }

    const alerts: OpsAlert[] = [];
    if (!workerHealth.ok) {
        alerts.push({
            level: "critical",
            title: "Worker indisponível ou mal configurado",
            description: workerHealth.detail,
        });
    }
    if (!scheduler.configured) {
        alerts.push({
            level: "warning",
            title: "Scheduler ainda não ativado",
            description: "Configure REPORT_SCHEDULER_SECRET e um cron externo para geração recorrente.",
        });
    }
    if (queueCounts.error > 0) {
        alerts.push({
            level: "warning",
            title: `${queueCounts.error} relatório(s) com erro aguardando recuperação`,
            description: "Use o recover automático ou o reprocessamento manual na tela de relatórios.",
        });
    }
    if (queueCounts.queued > 10) {
        alerts.push({
            level: "warning",
            title: "Backlog elevado na fila",
            description: `${queueCounts.queued} relatórios estão aguardando worker.`,
        });
    }
    if (alerts.length === 0) {
        alerts.push({
            level: "info",
            title: "Nenhum alerta operacional crítico",
            description: "Worker, fila e scheduler estão sem sinais imediatos de risco.",
        });
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Ops</h1>
                <p className="text-muted-foreground mt-1">
                    Saúde da esteira de geração, scheduler, retries e sinais operacionais do worker.
                </p>
            </div>

            {params.recover === "success" ? (
                <Card className="p-4 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">
                        Rotina de recuperacao executada com sucesso.
                    </p>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Fila aguardando worker</p>
                    <p className="text-2xl font-bold mt-2">{queueCounts.queued}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Tempo medio de processamento</p>
                    <p className="text-2xl font-bold mt-2">
                        {processingMetrics.averageMinutes !== null ? `${processingMetrics.averageMinutes} min` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Baseado em {processingMetrics.completedCount} relatorio(s) concluidos
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Duracao media do worker</p>
                    <p className="text-2xl font-bold mt-2">
                        {avgWorkerDurationSeconds !== null ? `${avgWorkerDurationSeconds}s` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Último sucesso: {latestWorkerSuccess ? new Date(latestWorkerSuccess).toLocaleString("pt-BR") : "—"}
                    </p>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Emails de sucesso</p>
                    <p className="text-2xl font-bold mt-2">{notificationCounts.success}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Sucesso sem envio</p>
                    <p className="text-2xl font-bold mt-2">{notificationCounts.successSkipped}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Alertas de falha enviados</p>
                    <p className="text-2xl font-bold mt-2">{notificationCounts.failureSent}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Falhas no envio de alerta</p>
                    <p className="text-2xl font-bold mt-2">{notificationCounts.failureFailed}</p>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Saude do worker</p>
                    <p className={`text-2xl font-bold mt-2 ${workerHealth.ok ? "text-green-600" : "text-red-600"}`}>
                        {workerHealth.ok ? "Operacional" : "Com problema"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">{workerHealth.detail}</p>
                    {workerHealth.url ? (
                        <p className="text-xs text-muted-foreground mt-2 break-all">{workerHealth.url}</p>
                    ) : null}
                </Card>

                <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Scheduler recorrente</p>
                    <p className={`text-2xl font-bold mt-2 ${scheduler.configured ? "text-green-600" : "text-amber-600"}`}>
                        {scheduler.configured ? "Configuravel" : "Pendente"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">{scheduler.label}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Última execução sem erros: {latestSchedulerSuccess ? new Date(latestSchedulerSuccess).toLocaleString("pt-BR") : "—"}
                    </p>
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="font-bold">Alertas ativos</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sinais que merecem acao operacional no momento.
                        </p>
                    </div>
                    <form action="/api/reports/recover" method="post">
                        <button type="submit" className={buttonVariants({})}>
                            Executar recover agora
                        </button>
                    </form>
                </div>
                <div className="grid gap-3 mt-5">
                    {alerts.map((alert, index) => (
                        <div
                            key={`${alert.title}-${index}`}
                            className={`rounded-xl border p-4 ${severityClasses(alert.level)}`}
                        >
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Recuperacoes automaticas recentes</h2>
                    </div>
                    <div className="p-5">
                        <p className="text-3xl font-bold">{autoRecoverCount}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Tentativas automaticas de recuperacao registradas recentemente.
                        </p>
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Últimas execuções do scheduler</h2>
                    </div>
                    <div className="divide-y divide-border">
                        {schedulerRuns.length > 0 ? (
                            schedulerRuns.map((run, index) => (
                                <div key={index} className="p-5 text-sm">
                                    <p className="font-medium">
                                        {new Date(run.created_at).toLocaleString("pt-BR")}
                                    </p>
                                    <p className="text-muted-foreground mt-1">
                                        queued: {String((run.metadata as Record<string, unknown>)?.queued || 0)} •
                                        skipped: {String((run.metadata as Record<string, unknown>)?.skipped || 0)} •
                                        errors: {String((run.metadata as Record<string, unknown>)?.errors || 0)}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="p-6 text-sm text-muted-foreground">
                                Nenhuma execução registrada ainda.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Falhas recentes de geração</h2>
                    </div>
                    <div className="divide-y divide-border">
                        {generationFailures.length > 0 ? (
                            generationFailures.map((failure, index) => {
                                const metadata = (failure.metadata as Record<string, unknown>) || {};
                                return (
                                    <div key={index} className="p-5 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium">
                                                {String(metadata.company_name || metadata.client_id || "Relatório")}
                                            </p>
                                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {String(metadata.category || "unknown")} • {String(metadata.severity || "warning")}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground mt-1">
                                            {new Date(failure.created_at).toLocaleString("pt-BR")}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2 break-words">
                                            {String(metadata.error || "Sem detalhe de erro")}
                                        </p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-sm text-muted-foreground">
                                Nenhuma falha operacional registrada.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Notificacoes recentes</h2>
                    </div>
                    <div className="divide-y divide-border">
                        {recentNotifications.length > 0 ? (
                            recentNotifications.map((event, index) => {
                                const metadata = (event.metadata as Record<string, unknown>) || {};
                                return (
                                    <div key={index} className="p-5 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium">
                                                {String(metadata.client_name || metadata.contact_email || metadata.ops_email || "Notificacao")}
                                            </p>
                                            <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                                {event.event_type}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground mt-1">
                                            {new Date(event.created_at).toLocaleString("pt-BR")}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2 break-words">
                                            canal: {String(metadata.channel || "n/a")} • entregue: {String(metadata.delivered ?? "n/a")}
                                        </p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-6 text-sm text-muted-foreground">
                                Nenhuma notificação registrada ainda.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <Card className="p-6">
                <h2 className="font-bold">Atalhos operacionais</h2>
                <div className="flex flex-wrap gap-3 mt-4">
                    <a href="/admin/reports" className={buttonVariants({ variant: "outline" })}>
                        Ver relatórios e reprocessar falhas
                    </a>
                    <a href="/admin/billing" className={buttonVariants({ variant: "outline" })}>
                        Ver consumo e billing
                    </a>
                </div>
            </Card>
        </div>
    );
}
