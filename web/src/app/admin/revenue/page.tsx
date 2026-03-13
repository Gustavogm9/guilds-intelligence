import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

type PlanRow = {
    id: string;
    name?: string | null;
    price_monthly?: number | null;
    reports_per_month?: number | null;
};

type ClientRow = {
    id: string;
    company_name: string;
    is_active?: boolean | null;
    discount_percent?: number | null;
    plans?: PlanRow | PlanRow[] | null;
};

type ReportRow = {
    id: string;
    client_id: string;
    status?: string | null;
    created_at: string;
    completed_at?: string | null;
    external_estimated_cost_usd?: number | null;
};

type DeepDiveRow = {
    id: string;
    client_id: string;
    created_at: string;
};

type EventRow = {
    event_type: string;
    created_at?: string | null;
    metadata?: Record<string, unknown> | null;
};

function asSinglePlan(plan: PlanRow | PlanRow[] | null | undefined): PlanRow | null {
    if (!plan) return null;
    return Array.isArray(plan) ? plan[0] || null : plan;
}

function formatCurrency(cents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

function formatUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    }).format(value);
}

function toPercent(numerator: number, denominator: number) {
    if (!denominator) return "0%";
    return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatRatio(value: number) {
    return `${value.toFixed(1)}x`;
}

function diffLabel(current: number, previous: number, suffix = "") {
    const delta = current - previous;
    if (delta === 0) return `0${suffix}`;
    return `${delta > 0 ? "+" : ""}${delta}${suffix}`;
}

function formatMonthLabel(value: string) {
    const [year, month] = value.split("-");
    return new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "numeric",
    }).format(new Date(Number(year), Number(month) - 1, 1));
}

export default async function AdminRevenuePage() {
    const supabase = await createClient();

    const [clientsRes, reportsRes, deepDiveRes, eventsRes] = await Promise.all([
        supabase.from("clients").select("id, company_name, is_active, discount_percent, plans(id, name, price_monthly, reports_per_month)"),
        supabase.from("reports").select("id, client_id, status, created_at, completed_at, external_estimated_cost_usd"),
        supabase.from("deep_dive_requests").select("id, client_id, created_at"),
        supabase.from("funnel_events").select("event_type, created_at, metadata"),
    ]);

    const clients = (clientsRes.data as ClientRow[] | null) || [];
    const reports = (reportsRes.data as ReportRow[] | null) || [];
    const deepDiveRequests = (deepDiveRes.data as DeepDiveRow[] | null) || [];
    const events = (eventsRes.data as EventRow[] | null) || [];

    const activeClients = clients.filter((client) => client.is_active !== false);
    const activeClientIds = new Set(activeClients.map((client) => client.id));

    const mrrCents = activeClients.reduce((sum, client) => {
        const plan = asSinglePlan(client.plans);
        const price = Number(plan?.price_monthly || 0);
        const discount = Number(client.discount_percent || 0);
        const adjusted = Math.max(price - Math.round(price * (discount / 100)), 0);
        return sum + adjusted;
    }, 0);
    const arrCents = mrrCents * 12;

    const funnelCounts = events.reduce(
        (acc, event) => {
            const key = event.event_type as keyof typeof acc;
            if (key in acc) {
                acc[key] += 1;
            }
            return acc;
        },
        {
            lead_submit: 0,
            signup_complete: 0,
            onboarding_complete: 0,
            first_report_view: 0,
        }
    );

    const firstReportViewedClientIds = new Set<string>();
    const funnelByPlan = new Map<
        string,
        {
            signups: number;
            onboardings: number;
            firstReportViews: number;
        }
    >();

    function ensurePlanBucket(planName: string) {
        const key = planName || "Não identificado";
        const current = funnelByPlan.get(key) || {
            signups: 0,
            onboardings: 0,
            firstReportViews: 0,
        };
        funnelByPlan.set(key, current);
        return current;
    }

    for (const event of events) {
        const metadata = event.metadata || {};
        const planName = String(metadata.plan_name || metadata.plan || "Não identificado");

        if (event.event_type === "signup_complete") {
            ensurePlanBucket(planName).signups += 1;
        }
        if (event.event_type === "onboarding_complete") {
            ensurePlanBucket(planName).onboardings += 1;
        }
        if (event.event_type !== "first_report_view") continue;
        const reportId = String(metadata.report_id || "");
        const report = reports.find((row) => row.id === reportId);
        if (report?.client_id) {
            firstReportViewedClientIds.add(report.client_id);
        }
        ensurePlanBucket(planName).firstReportViews += 1;
    }

    const reportsByClient = new Map<string, ReportRow[]>();
    for (const report of reports) {
        const current = reportsByClient.get(report.client_id) || [];
        current.push(report);
        reportsByClient.set(report.client_id, current);
    }

    const deepDiveByClient = new Map<string, number>();
    for (const request of deepDiveRequests) {
        deepDiveByClient.set(request.client_id, (deepDiveByClient.get(request.client_id) || 0) + 1);
    }

    const planAnalytics = new Map<
        string,
        {
            name: string;
            activeClients: number;
            mrrCents: number;
            reportsGenerated: number;
            deepDives: number;
            externalCostUsd: number;
        }
    >();

    for (const client of activeClients) {
        const plan = asSinglePlan(client.plans);
        const planId = plan?.id || "sem-plano";
        const price = Number(plan?.price_monthly || 0);
        const discount = Number(client.discount_percent || 0);
        const adjusted = Math.max(price - Math.round(price * (discount / 100)), 0);
        const clientReports = reportsByClient.get(client.id) || [];
        const current = planAnalytics.get(planId) || {
            name: plan?.name || "Sem plano",
            activeClients: 0,
            mrrCents: 0,
            reportsGenerated: 0,
            deepDives: 0,
            externalCostUsd: 0,
        };

        current.activeClients += 1;
        current.mrrCents += adjusted;
        current.reportsGenerated += clientReports.length;
        current.deepDives += deepDiveByClient.get(client.id) || 0;
        current.externalCostUsd += clientReports.reduce(
            (sum, report) => sum + Number(report.external_estimated_cost_usd || 0),
            0
        );
        planAnalytics.set(planId, current);
    }

    const clientsByConsumption = activeClients
        .map((client) => {
            const clientReports = reportsByClient.get(client.id) || [];
            return {
                clientId: client.id,
                companyName: client.company_name,
                reportsGenerated: clientReports.length,
                deepDives: deepDiveByClient.get(client.id) || 0,
                externalCostUsd: clientReports.reduce(
                    (sum, report) => sum + Number(report.external_estimated_cost_usd || 0),
                    0
                ),
                planName: asSinglePlan(client.plans)?.name || "Sem plano",
            };
        })
        .sort((a, b) => b.reportsGenerated - a.reportsGenerated || b.deepDives - a.deepDives)
        .slice(0, 8);

    const accountSignals = activeClients
        .map((client) => {
            const clientReports = reportsByClient.get(client.id) || [];
            const errorCount = clientReports.filter((report) => report.status === "error").length;
            const firstReportViewed = firstReportViewedClientIds.has(client.id);
            const deepDiveCount = deepDiveByClient.get(client.id) || 0;
            const usageScore = Math.min(4, clientReports.length);
            const activationScore = firstReportViewed ? 3 : 0;
            const deepDiveScore = Math.min(3, deepDiveCount);
            const errorPenalty = Math.min(3, errorCount);
            const expansionScore = usageScore + activationScore + deepDiveScore - errorPenalty;
            const riskScore = (firstReportViewed ? 0 : 3) + (clientReports.length === 0 ? 2 : 0) + errorCount;

            return {
                clientId: client.id,
                companyName: client.company_name,
                planName: asSinglePlan(client.plans)?.name || "Sem plano",
                reportsGenerated: clientReports.length,
                deepDives: deepDiveCount,
                errorCount,
                firstReportViewed,
                expansionScore,
                riskScore,
                recommendedAction: !firstReportViewed
                    ? "Forçar ativação do primeiro relatório"
                    : errorCount > 0
                      ? "Atacar atrito operacional e retries"
                      : deepDiveCount > 0
                        ? "Abrir conversa de expansão"
                        : "Estimular aprofundamento e recorrência",
            };
        });

    const expansionCandidates = accountSignals
        .filter((client) => client.expansionScore > 0)
        .sort((a, b) => b.expansionScore - a.expansionScore || b.deepDives - a.deepDives)
        .slice(0, 5);

    const riskAccounts = accountSignals
        .filter((client) => client.riskScore > 0)
        .sort((a, b) => b.riskScore - a.riskScore || b.errorCount - a.errorCount)
        .slice(0, 5);

    const planBottlenecks = [...funnelByPlan.entries()]
        .map(([planName, metrics]) => ({
            planName,
            signupToOnboardingRate: metrics.signups ? metrics.onboardings / metrics.signups : 0,
            onboardingToActivationRate: metrics.onboardings ? metrics.firstReportViews / metrics.onboardings : 0,
            signups: metrics.signups,
            onboardings: metrics.onboardings,
            firstReportViews: metrics.firstReportViews,
        }))
        .sort((a, b) => a.onboardingToActivationRate - b.onboardingToActivationRate || a.signupToOnboardingRate - b.signupToOnboardingRate);

    const weakestPlanFunnel = planBottlenecks[0] || null;
    const highestPressurePlan =
        [...planAnalytics.values()].sort((a, b) => {
            const aPressure = a.activeClients ? (a.reportsGenerated + a.deepDives) / a.activeClients : 0;
            const bPressure = b.activeClients ? (b.reportsGenerated + b.deepDives) / b.activeClients : 0;
            return bPressure - aPressure;
        })[0] || null;
    const highestCostPlan =
        [...planAnalytics.values()].sort((a, b) => {
            const aCost = a.reportsGenerated ? a.externalCostUsd / a.reportsGenerated : 0;
            const bCost = b.reportsGenerated ? b.externalCostUsd / b.reportsGenerated : 0;
            return bCost - aCost;
        })[0] || null;
    const weakestSignupPlan =
        [...planBottlenecks]
            .filter((plan) => plan.signups > 0)
            .sort((a, b) => a.signupToOnboardingRate - b.signupToOnboardingRate)[0] || null;
    const weakestActivationPlan =
        [...planBottlenecks]
            .filter((plan) => plan.onboardings > 0)
            .sort((a, b) => a.onboardingToActivationRate - b.onboardingToActivationRate)[0] || null;

    const avgHoursToDone = (() => {
        const completed = reports.filter((report) => report.completed_at);
        if (completed.length === 0) return 0;
        const totalHours = completed.reduce((sum, report) => {
            const created = new Date(report.created_at).getTime();
            const completedAt = new Date(String(report.completed_at)).getTime();
            return sum + Math.max(0, completedAt - created) / 3_600_000;
        }, 0);
        return totalHours / completed.length;
    })();

    const retryEvents = events.filter(
        (event) => event.event_type === "report_retry_triggered" || event.event_type === "report_auto_recovery_triggered"
    ).length;
    const errorReports = reports.filter((report) => report.status === "error").length;
    const firstReportViewRate = toPercent(firstReportViewedClientIds.size, activeClientIds.size);
    const deepDiveClientRate = toPercent(
        [...deepDiveByClient.keys()].filter((clientId) => activeClientIds.has(clientId)).length,
        activeClientIds.size
    );
    function isInWindow(value: string | null | undefined, start: number, end: number) {
        if (!value) return false;
        const date = new Date(value).getTime();
        return date >= start && date < end;
    }

    const latestTimestamp = Math.max(
        0,
        ...reports.map((report) => new Date(report.created_at).getTime()),
        ...deepDiveRequests.map((item) => new Date(item.created_at).getTime()),
        ...events
            .map((event) => event.created_at)
            .filter((value): value is string => Boolean(value))
            .map((value) => new Date(value).getTime())
    );
    const windowEnd = latestTimestamp || new Date("2026-03-11T00:00:00Z").getTime();
    const recentWindowStart = windowEnd - 30 * 24 * 60 * 60 * 1000;
    const previousWindowStart = windowEnd - 60 * 24 * 60 * 60 * 1000;

    const recentReports = reports.filter((report) => isInWindow(report.created_at, recentWindowStart, windowEnd));
    const previousReports = reports.filter((report) => isInWindow(report.created_at, previousWindowStart, recentWindowStart));
    const recentDeepDives = deepDiveRequests.filter((item) => isInWindow(item.created_at, recentWindowStart, windowEnd));
    const previousDeepDives = deepDiveRequests.filter((item) => isInWindow(item.created_at, previousWindowStart, recentWindowStart));
    const recentSignups = events.filter(
        (event) => event.event_type === "signup_complete" && isInWindow(event.created_at, recentWindowStart, windowEnd)
    ).length;
    const previousSignups = events.filter(
        (event) => event.event_type === "signup_complete" && isInWindow(event.created_at, previousWindowStart, recentWindowStart)
    ).length;
    const recentOnboardings = events.filter(
        (event) => event.event_type === "onboarding_complete" && isInWindow(event.created_at, recentWindowStart, windowEnd)
    ).length;
    const previousOnboardings = events.filter(
        (event) => event.event_type === "onboarding_complete" && isInWindow(event.created_at, previousWindowStart, recentWindowStart)
    ).length;

    const priorityAccounts = [...accountSignals]
        .sort((a, b) => b.riskScore - a.riskScore || b.expansionScore - a.expansionScore || b.errorCount - a.errorCount)
        .slice(0, 6);
    const planEfficiency = [...planAnalytics.values()]
        .map((plan) => ({
            ...plan,
            revenuePerClientCents: plan.activeClients ? Math.round(plan.mrrCents / plan.activeClients) : 0,
            reportsPerClient: plan.activeClients ? plan.reportsGenerated / plan.activeClients : 0,
            deepDivesPerClient: plan.activeClients ? plan.deepDives / plan.activeClients : 0,
            externalCostPerClient: plan.activeClients ? plan.externalCostUsd / plan.activeClients : 0,
            externalCostPerRevenuePct: plan.mrrCents ? (plan.externalCostUsd * 10000) / plan.mrrCents : 0,
        }))
        .sort((a, b) => b.revenuePerClientCents - a.revenuePerClientCents);

    const signupCohorts = new Map<
        string,
        {
            signups: number;
            onboardings: number;
            activated: number;
        }
    >();
    const onboardingClients = new Set<string>();
    for (const event of events) {
        if (event.event_type === "onboarding_complete") {
            const clientId = String(event.metadata?.client_id || "");
            if (clientId) onboardingClients.add(clientId);
        }
    }
    for (const event of events) {
        if (event.event_type !== "signup_complete" || !event.created_at) continue;
        const date = new Date(event.created_at);
        const bucketKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        const clientId = String(event.metadata?.client_id || "");
        const current = signupCohorts.get(bucketKey) || {
            signups: 0,
            onboardings: 0,
            activated: 0,
        };
        current.signups += 1;
        if (clientId && onboardingClients.has(clientId)) current.onboardings += 1;
        if (clientId && firstReportViewedClientIds.has(clientId)) current.activated += 1;
        signupCohorts.set(bucketKey, current);
    }
    const cohortRows = [...signupCohorts.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Revenue Ops</h1>
                <p className="text-muted-foreground mt-1">
                    Leitura comercial, de ativação e de pressão operacional por cliente e por plano.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">MRR</p>
                    <p className="text-2xl font-bold mt-2">{formatCurrency(mrrCents)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">ARR estimado</p>
                    <p className="text-2xl font-bold mt-2">{formatCurrency(arrCents)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Onboarding rate</p>
                    <p className="text-2xl font-bold mt-2">{toPercent(funnelCounts.onboarding_complete, funnelCounts.signup_complete)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">1o relatorio visto</p>
                    <p className="text-2xl font-bold mt-2">{firstReportViewRate}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Clientes com deep dive</p>
                    <p className="text-2xl font-bold mt-2">{deepDiveClientRate}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Tempo medio ate done</p>
                    <p className="text-2xl font-bold mt-2">{avgHoursToDone.toFixed(1)}h</p>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Relatórios 30d</p>
                    <p className="text-2xl font-bold mt-2">{recentReports.length}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        vs período anterior: {diffLabel(recentReports.length, previousReports.length)}
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Deep dives 30d</p>
                    <p className="text-2xl font-bold mt-2">{recentDeepDives.length}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        vs período anterior: {diffLabel(recentDeepDives.length, previousDeepDives.length)}
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Signups 30d</p>
                    <p className="text-2xl font-bold mt-2">{recentSignups}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        vs período anterior: {diffLabel(recentSignups, previousSignups)}
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Onboardings 30d</p>
                    <p className="text-2xl font-bold mt-2">{recentOnboardings}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        vs período anterior: {diffLabel(recentOnboardings, previousOnboardings)}
                    </p>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Uso e pressao por plano</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cruza receita, volume de relatorios, deep dives e custo externo.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-left">
                                    <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                    <th className="p-4 font-medium text-muted-foreground">Clientes</th>
                                    <th className="p-4 font-medium text-muted-foreground">MRR</th>
                                    <th className="p-4 font-medium text-muted-foreground">Relatorios</th>
                                    <th className="p-4 font-medium text-muted-foreground">Deep dives</th>
                                    <th className="p-4 font-medium text-muted-foreground">Custo ext.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...planAnalytics.values()]
                                    .sort((a, b) => b.mrrCents - a.mrrCents)
                                    .map((plan) => (
                                        <tr key={plan.name} className="border-b border-border last:border-none">
                                            <td className="p-4 font-medium">{plan.name}</td>
                                            <td className="p-4">{plan.activeClients}</td>
                                            <td className="p-4">{formatCurrency(plan.mrrCents)}</td>
                                            <td className="p-4">{plan.reportsGenerated}</td>
                                            <td className="p-4">{plan.deepDives}</td>
                                            <td className="p-4">{formatUsd(plan.externalCostUsd)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Saúde operacional</h2>
                    <div className="mt-4 space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Relatórios com erro</span>
                            <Badge variant={errorReports > 0 ? "destructive" : "secondary"}>{errorReports}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Retries no período</span>
                            <Badge variant="outline">{retryEvents}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Signups</span>
                            <Badge variant="outline">{funnelCounts.signup_complete}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Onboardings</span>
                            <Badge variant="outline">{funnelCounts.onboarding_complete}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Primeiros relatórios vistos</span>
                            <Badge variant="outline">{firstReportViewedClientIds.size}</Badge>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <h2 className="font-bold">Maior gargalo do funil</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Plano com maior perda relativa entre onboarding e ativacao.
                    </p>
                    {weakestPlanFunnel ? (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{weakestPlanFunnel.planName}</span>
                                <Badge variant="destructive">
                                    {toPercent(weakestPlanFunnel.firstReportViews, weakestPlanFunnel.onboardings)}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {weakestPlanFunnel.signups} signups • {weakestPlanFunnel.onboardings} onboardings • {weakestPlanFunnel.firstReportViews} ativacoes
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                            Ainda nao ha dados suficientes para apontar um gargalo dominante.
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Maior pressão operacional</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Plano com maior combinação de relatórios e deep dives por cliente ativo.
                    </p>
                    {highestPressurePlan ? (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{highestPressurePlan.name}</span>
                                <Badge>
                                    {highestPressurePlan.activeClients
                                        ? ((highestPressurePlan.reportsGenerated + highestPressurePlan.deepDives) / highestPressurePlan.activeClients).toFixed(1)
                                        : "0.0"}{" "}
                                    por cliente
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {highestPressurePlan.activeClients} clientes • {highestPressurePlan.reportsGenerated} relatórios • {highestPressurePlan.deepDives} deep dives
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                            Ainda nao ha dados suficientes para medir a pressao operacional por plano.
                        </div>
                    )}
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Leitura executiva dos gargalos</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Resume onde o funil e a operacao estao mais pressionados agora.
                    </p>
                </div>
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Perda no onboarding</p>
                        {weakestSignupPlan ? (
                            <>
                                <p className="mt-2 font-semibold">{weakestSignupPlan.planName}</p>
                                <p className="mt-1 text-2xl font-bold">
                                    {toPercent(weakestSignupPlan.onboardings, weakestSignupPlan.signups)}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {weakestSignupPlan.signups} signups para {weakestSignupPlan.onboardings} onboardings.
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Aguardando volume suficiente.</p>
                        )}
                    </div>

                    <div className="rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Perda na ativacao</p>
                        {weakestActivationPlan ? (
                            <>
                                <p className="mt-2 font-semibold">{weakestActivationPlan.planName}</p>
                                <p className="mt-1 text-2xl font-bold">
                                    {toPercent(weakestActivationPlan.firstReportViews, weakestActivationPlan.onboardings)}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {weakestActivationPlan.onboardings} onboardings para {weakestActivationPlan.firstReportViews} primeiras visualizacoes.
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Aguardando volume suficiente.</p>
                        )}
                    </div>

                    <div className="rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Pressao por cliente</p>
                        {highestPressurePlan ? (
                            <>
                                <p className="mt-2 font-semibold">{highestPressurePlan.name}</p>
                                <p className="mt-1 text-2xl font-bold">
                                    {formatRatio(
                                        highestPressurePlan.activeClients
                                            ? (highestPressurePlan.reportsGenerated + highestPressurePlan.deepDives) /
                                                  highestPressurePlan.activeClients
                                            : 0
                                    )}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Relatórios e deep dives por cliente ativo no plano.
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Aguardando volume suficiente.</p>
                        )}
                    </div>

                    <div className="rounded-xl border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Custo externo por relatorio</p>
                        {highestCostPlan ? (
                            <>
                                <p className="mt-2 font-semibold">{highestCostPlan.name}</p>
                                <p className="mt-1 text-2xl font-bold">
                                    {formatUsd(
                                        highestCostPlan.reportsGenerated
                                            ? highestCostPlan.externalCostUsd / highestCostPlan.reportsGenerated
                                            : 0
                                    )}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Media de custo externo para cada relatorio gerado nesse plano.
                                </p>
                            </>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Aguardando volume suficiente.</p>
                        )}
                    </div>
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Eficiencia por plano</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cruza receita por cliente, intensidade de uso e peso da camada externa.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-left">
                                    <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                    <th className="p-4 font-medium text-muted-foreground">Receita por cliente</th>
                                    <th className="p-4 font-medium text-muted-foreground">Relatorios/cliente</th>
                                    <th className="p-4 font-medium text-muted-foreground">Deep dives/cliente</th>
                                    <th className="p-4 font-medium text-muted-foreground">Custo ext./receita</th>
                                </tr>
                            </thead>
                            <tbody>
                                {planEfficiency.map((plan) => (
                                    <tr key={plan.name} className="border-b border-border last:border-none">
                                        <td className="p-4 font-medium">{plan.name}</td>
                                        <td className="p-4">{formatCurrency(plan.revenuePerClientCents)}</td>
                                        <td className="p-4">{formatRatio(plan.reportsPerClient)}</td>
                                        <td className="p-4">{formatRatio(plan.deepDivesPerClient)}</td>
                                        <td className="p-4">{plan.externalCostPerRevenuePct.toFixed(1)}%</td>
                                    </tr>
                                ))}
                                {planEfficiency.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Ainda nao ha dados suficientes para comparar eficiencia por plano.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Cohort simples de ativação</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Lê o comportamento por mês de signup até onboarding e primeiro relatório visto.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-left">
                                    <th className="p-4 font-medium text-muted-foreground">Mes de signup</th>
                                    <th className="p-4 font-medium text-muted-foreground">Signups</th>
                                    <th className="p-4 font-medium text-muted-foreground">Onboardings</th>
                                    <th className="p-4 font-medium text-muted-foreground">Ativados</th>
                                    <th className="p-4 font-medium text-muted-foreground">Signup {"->"} Onboarding</th>
                                    <th className="p-4 font-medium text-muted-foreground">Signup {"->"} Ativacao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cohortRows.map(([month, metrics]) => (
                                    <tr key={month} className="border-b border-border last:border-none">
                                        <td className="p-4 font-medium">{formatMonthLabel(month)}</td>
                                        <td className="p-4">{metrics.signups}</td>
                                        <td className="p-4">{metrics.onboardings}</td>
                                        <td className="p-4">{metrics.activated}</td>
                                        <td className="p-4">{toPercent(metrics.onboardings, metrics.signups)}</td>
                                        <td className="p-4">{toPercent(metrics.activated, metrics.signups)}</td>
                                    </tr>
                                ))}
                                {cohortRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            Os cohorts aparecerao quando os eventos de signup estiverem vinculados a clientes.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Funil por plano</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Leitura acionável de signup, onboarding e primeira ativação por plano.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                <th className="p-4 font-medium text-muted-foreground">Signups</th>
                                <th className="p-4 font-medium text-muted-foreground">Onboardings</th>
                                <th className="p-4 font-medium text-muted-foreground">1o relatorio visto</th>
                                <th className="p-4 font-medium text-muted-foreground">Signup → Onboarding</th>
                                <th className="p-4 font-medium text-muted-foreground">Onboarding → Ativacao</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...funnelByPlan.entries()]
                                .sort((a, b) => b[1].signups - a[1].signups)
                                .map(([planName, metrics]) => (
                                    <tr key={planName} className="border-b border-border last:border-none">
                                        <td className="p-4 font-medium">{planName}</td>
                                        <td className="p-4">{metrics.signups}</td>
                                        <td className="p-4">{metrics.onboardings}</td>
                                        <td className="p-4">{metrics.firstReportViews}</td>
                                        <td className="p-4">{toPercent(metrics.onboardings, metrics.signups)}</td>
                                        <td className="p-4">{toPercent(metrics.firstReportViews, metrics.onboardings)}</td>
                                    </tr>
                                ))}
                            {funnelByPlan.size === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        O funil por plano será preenchido conforme eventos de signup, onboarding e ativação forem chegando.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Clientes com maior consumo</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ajuda a identificar contas com mais uso, mais oportunidade e mais pressao operacional.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                <th className="p-4 font-medium text-muted-foreground">Relatorios</th>
                                <th className="p-4 font-medium text-muted-foreground">Deep dives</th>
                                <th className="p-4 font-medium text-muted-foreground">Custo externo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientsByConsumption.length > 0 ? (
                                clientsByConsumption.map((client) => (
                                    <tr key={client.clientId} className="border-b border-border last:border-none">
                                        <td className="p-4 font-medium">{client.companyName}</td>
                                        <td className="p-4">{client.planName}</td>
                                        <td className="p-4">{client.reportsGenerated}</td>
                                        <td className="p-4">{client.deepDives}</td>
                                        <td className="p-4">{formatUsd(client.externalCostUsd)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        Ainda nao ha clientes com uso suficiente para analise.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-6">
                    <h2 className="font-bold">Candidatos a expansão</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Contas com uso forte, ativação e pedidos de aprofundamento.
                    </p>
                    <div className="mt-5 space-y-3">
                        {expansionCandidates.length > 0 ? (
                            expansionCandidates.map((client) => (
                                <div key={client.clientId} className="rounded-xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{client.companyName}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {client.planName} • {client.reportsGenerated} relatórios • {client.deepDives} deep dives
                                            </p>
                                        </div>
                                        <Badge>{client.expansionScore} pts</Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                                Ainda não há contas com sinal claro de expansão.
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Contas em risco</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Contas sem ativação suficiente ou com mais atrito operacional.
                    </p>
                    <div className="mt-5 space-y-3">
                        {riskAccounts.length > 0 ? (
                            riskAccounts.map((client) => (
                                <div key={client.clientId} className="rounded-xl border p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{client.companyName}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {client.planName} • {client.reportsGenerated} relatórios • {client.errorCount} erros
                                            </p>
                                        </div>
                                        <Badge variant="destructive">{client.riskScore} pts</Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                                Nenhuma conta apresenta risco relevante no momento.
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Fila de acao por conta</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ordena as contas que mais pedem intervencao comercial ou operacional agora.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                <th className="p-4 font-medium text-muted-foreground">Risco</th>
                                <th className="p-4 font-medium text-muted-foreground">Expansao</th>
                                <th className="p-4 font-medium text-muted-foreground">Acao sugerida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priorityAccounts.length > 0 ? (
                                priorityAccounts.map((client) => (
                                    <tr key={client.clientId} className="border-b border-border last:border-none">
                                        <td className="p-4 font-medium">{client.companyName}</td>
                                        <td className="p-4">{client.planName}</td>
                                        <td className="p-4">
                                            <Badge variant={client.riskScore >= 4 ? "destructive" : "outline"}>
                                                {client.riskScore} pts
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="secondary">{client.expansionScore} pts</Badge>
                                        </td>
                                        <td className="p-4 text-muted-foreground">{client.recommendedAction}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        Ainda nao ha contas suficientes para formar uma fila de acao.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
