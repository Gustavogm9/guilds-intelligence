import Link from "next/link";
import { FileText, Sparkles, TrendingUp, Clock3, ArrowRight, Bell, Rocket } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventTracker } from "@/components/tracking/event-tracker";
import { ReportAutoRefresh } from "@/components/dashboard/report-auto-refresh";
import { formatDate, getDictionary } from "@/lib/i18n";

type PlanInfo = {
    name?: string;
    reports_per_month?: number;
};

type ReportSummary = {
    id: string;
    title: string | null;
    created_at: string;
    status: string | null;
};

function statusKey(status: string | null) {
    return status || "queued";
}

export default async function ClientDashboard() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("id, company_name, plan_id, goals_2026, pain_points, preferred_language, plans(name, reports_per_month)")
        .eq("user_id", user!.id)
        .single();

    const t = getDictionary(client?.preferred_language);

    const { data: recentReports } = client
        ? await supabase
            .from("reports")
            .select("id, title, created_at, status")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(4)
        : { data: [] };

    const lastReport = (recentReports?.[0] as ReportSummary | undefined) || null;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyCount } = client
        ? await supabase
            .from("billing_log")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id)
            .gte("created_at", startOfMonth.toISOString())
        : { count: 0 };

    const { data: deepDiveRequests } = client
        ? await supabase
            .from("deep_dive_requests")
            .select("id, status, created_at")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(5)
        : { data: [] };

    const plan = (Array.isArray(client?.plans) ? client.plans[0] : client?.plans) as PlanInfo | null;
    const reportsLeft = (Number(plan?.reports_per_month) || 0) - (monthlyCount || 0);
    const deliveredDeepDives = (deepDiveRequests || []).filter((item: Record<string, unknown>) => item.status === "delivered").length;
    const pendingDeepDives = (deepDiveRequests || []).filter((item: Record<string, unknown>) => item.status === "pending" || item.status === "in_progress").length;
    const hasPendingReport = (recentReports || []).some((report) => report.status === "queued" || report.status === "processing");
    const primaryGoal = client?.goals_2026?.[0] as string | undefined;
    const primaryPain = client?.pain_points?.[0] as string | undefined;
    const recommendations = [
        primaryGoal
            ? (t.locale === "en-US"
                ? `Connect the next report to this goal: ${primaryGoal}`
                : `Conecte o próximo relatório ao objetivo: ${primaryGoal}`)
            : null,
        primaryPain
            ? (t.locale === "en-US"
                ? `Use a deep dive to address this pain point: ${primaryPain}`
                : `Use um deep dive para atacar a dor: ${primaryPain}`)
            : null,
        lastReport?.status !== "done"
            ? (t.locale === "en-US"
                ? "Follow the report in progress. This screen refreshes automatically while there is an active queue."
                : "Acompanhe o relatório em andamento. Esta tela atualiza automaticamente quando houver fila ativa.")
            : (t.locale === "en-US"
                ? "Revisit the latest report and turn one insight into an operational decision this week."
                : "Retome o último relatório e transforme um insight em uma decisão operacional nesta semana."),
    ].filter(Boolean) as string[];

    return (
        <div className="space-y-8">
            <ReportAutoRefresh active={hasPendingReport} intervalMs={45000} />
            <EventTracker
                eventType="dashboard_return"
                metadata={{
                    client_name: client?.company_name || null,
                    has_report_history: (recentReports || []).length > 0,
                }}
            />

            <div>
                <h1 className="text-3xl font-bold">
                    {t.locale === "en-US" ? "Hello" : "Olá"}
                    {client?.company_name ? `, ${client.company_name}` : ""}!
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t.locale === "en-US"
                        ? "Your market intelligence hub with next steps and recent history."
                        : "Seu hub de inteligência de mercado com próximos passos e histórico recente."}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">{t.currentPlan}</p>
                            <p className="text-lg font-bold">{String(plan?.name) || (t.locale === "en-US" ? "No plan" : "Sem plano")}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">{t.reportsThisMonth}</p>
                            <p className="text-lg font-bold">{monthlyCount || 0} / {Number(plan?.reports_per_month) || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-amber-500 opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">{t.remaining}</p>
                            <p className="text-lg font-bold">{Math.max(reportsLeft, 0)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <Clock3 className="h-8 w-8 text-sky-500 opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">{t.activeDeepDives}</p>
                            <p className="text-lg font-bold">{pendingDeepDives}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Generate Report CTA */}
            {!hasPendingReport && (
                <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Rocket className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="font-bold">
                                    {(recentReports || []).length === 0
                                        ? t.generateNowFirstFree
                                        : t.generateReportCta}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {(recentReports || []).length === 0
                                        ? t.generateNowFirstFreeHint
                                        : reportsLeft > 0
                                            ? t.generateNowQuotaUsed(monthlyCount || 0, Number(plan?.reports_per_month) || 0)
                                            : t.generateNowUpgradeHint}
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/settings#generate"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
                        >
                            <Rocket className="h-4 w-4" />
                            {reportsLeft > 0 || (recentReports || []).length === 0
                                ? t.generateNowButton
                                : t.generateNowUpgradeButton}
                        </Link>
                    </div>
                </Card>
            )}

            <Card className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bell className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-bold">{t.updatesInbox}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t.updatesInboxDescription}
                            </p>
                        </div>
                    </div>
                    <Link href="/dashboard/inbox" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                        {t.openInbox}
                    </Link>
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-bold">{t.latestReport}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t.latestPipelineItem}
                            </p>
                        </div>
                        <Link href="/dashboard/reports" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3">
                            {t.viewHistory}
                        </Link>
                    </div>

                    {lastReport ? (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">{lastReport.title || t.reportFallbackTitle}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(lastReport.created_at, client?.preferred_language)}
                                    </p>
                                </div>
                                <Badge variant={lastReport.status === "done" ? "default" : "secondary"}>
                                    {t.statuses[statusKey(lastReport.status)] || t.statuses.queued}
                                </Badge>
                            </div>
                            <Link
                                href={`/dashboard/reports/${lastReport.id}`}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2"
                            >
                                {t.openReport}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t.firstReportPending}
                        </p>
                    )}
                </Card>

                <Card className="p-6 bg-primary/5 border-primary/20">
                    <h2 className="text-lg font-bold mb-2">{t.nextRecommendedStep}</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                        {t.nextStepDescription}
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/dashboard/deep-dive" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                            <Sparkles className="h-4 w-4 mr-2" />
                            {t.requestDeepDive}
                        </Link>
                        <Link href="/dashboard/reports" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                            {t.reviewHistory}
                        </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                        {t.deliveredInProgress(deliveredDeepDives, pendingDeepDives)}
                    </p>
                </Card>
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-bold">{t.recentHistory}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t.recentHistoryDescription}
                        </p>
                    </div>
                </div>

                {(recentReports || []).length > 0 ? (
                    <div className="grid gap-3">
                        {(recentReports || []).map((report) => (
                            <div key={report.id} className="flex items-center justify-between rounded-xl border p-4">
                                <div>
                                    <p className="font-medium">{report.title || t.reportFallbackTitle}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(report.created_at, client?.preferred_language)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={report.status === "done" ? "default" : "secondary"}>
                                        {t.statuses[statusKey(report.status)] || t.statuses.queued}
                                    </Badge>
                                    <Link
                                        href={`/dashboard/reports/${report.id}`}
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                    >
                                        {t.locale === "en-US" ? "View" : "Ver"}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t.emptyHistory}
                    </p>
                )}
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">{t.recommendations}</h2>
                <div className="grid gap-3">
                    {recommendations.map((item, index) => (
                        <div key={index} className="rounded-xl border p-4 text-sm text-muted-foreground">
                            {item}
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
