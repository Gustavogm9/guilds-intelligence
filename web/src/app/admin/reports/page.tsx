import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type ReportRow = {
    id: string;
    title: string | null;
    status: string | null;
    created_at: string;
    completed_at: string | null;
    error_message: string | null;
    estimated_cost_usd: number | null;
    insights_count: number | null;
    retrospective_score: number | null;
    hypotheses: { confidence?: number; retrospective_status?: string; review_status?: string }[] | null;
    external_signal_count: number | null;
    external_signal_summary: string | null;
    external_intelligence_mode: string | null;
    external_feeds_considered: number | null;
    external_llm_used: boolean | null;
    external_estimated_cost_usd: number | null;
    external_sources:
        | {
              source_name?: string;
              theme?: string;
              relevance_score?: number;
          }[]
        | null;
    clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
};

type JobRow = {
    id: string;
    client_id: string;
    report_id: string | null;
    trigger_source: string;
    job_kind: string;
    status: string;
    reason: string | null;
    created_at: string;
    clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
};

function getClientName(report: ReportRow) {
    const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
    return client?.company_name || "-";
}

function statusVariant(status: string | null) {
    if (status === "done") return "default";
    if (status === "error") return "destructive";
    return "secondary";
}

function summarizeHypotheses(report: ReportRow) {
    const hypotheses = Array.isArray(report.hypotheses) ? report.hypotheses : [];
    if (hypotheses.length === 0) {
        return { avgConfidence: null, confirmed: 0, watching: 0 };
    }

    const numericConfidences = hypotheses
        .map((item) => Number(item.confidence))
        .filter((value) => Number.isFinite(value));

    return {
        avgConfidence: numericConfidences.length
            ? numericConfidences.reduce((sum, value) => sum + value, 0) / numericConfidences.length
            : null,
        confirmed: hypotheses.filter((item) => item.retrospective_status === "confirmed").length,
        watching: hypotheses.filter((item) => item.retrospective_status === "watching").length,
        pendingReview: hypotheses.filter((item) => item.review_status === "pending_review").length,
    };
}

function summarizeExternal(report: ReportRow) {
    const sources = Array.isArray(report.external_sources) ? report.external_sources : [];
    const topSource = sources[0]?.source_name || null;
    const topTheme = sources[0]?.theme || null;
    const avgRelevance = sources.length
        ? sources
              .map((item) => Number(item.relevance_score))
              .filter((value) => Number.isFinite(value))
              .reduce((sum, value, _, arr) => sum + value / arr.length, 0)
        : null;

    return {
        topSource,
        topTheme,
        avgRelevance,
    };
}

export default async function AdminReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ retry?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const { data } = await supabase
        .from("reports")
        .select(
            "id, title, status, created_at, completed_at, error_message, estimated_cost_usd, insights_count, retrospective_score, hypotheses, external_signal_count, external_signal_summary, external_intelligence_mode, external_feeds_considered, external_llm_used, external_estimated_cost_usd, external_sources, clients(company_name)"
        )
        .order("created_at", { ascending: false });
    let jobs: JobRow[] = [];

    try {
        const { data: rawJobs } = await supabase
            .from("report_jobs")
            .select("id, client_id, report_id, trigger_source, job_kind, status, reason, created_at, clients(company_name)")
            .order("created_at", { ascending: false })
            .limit(20);

        jobs = (rawJobs as JobRow[] | null) || [];
    } catch {
        // migration pode ainda nao ter sido aplicada
    }

    const reports = (data as ReportRow[] | null) || [];
    const summary = reports.reduce(
        (acc, report) => {
            const status = report.status || "queued";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
    const externalUsage = reports.reduce(
        (acc, report) => {
            acc.signalCount += report.external_signal_count || 0;
            acc.externalCost += Number(report.external_estimated_cost_usd || 0);
            if (report.external_llm_used) {
                acc.llmReports += 1;
            }
            return acc;
        },
        { signalCount: 0, externalCost: 0, llmReports: 0 }
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Relatórios</h1>
                <p className="text-muted-foreground mt-1">
                    Monitoramento da fila, da entrega e dos erros de geração.
                </p>
            </div>

            {params.retry === "success" ? (
                <Card className="p-4 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">
                        Reprocessamento enfileirado com sucesso.
                    </p>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold mt-2">{reports.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Concluidos</p>
                    <p className="text-2xl font-bold mt-2">{summary.done || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Em execucao</p>
                    <p className="text-2xl font-bold mt-2">{(summary.queued || 0) + (summary.processing || 0)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Com erro</p>
                    <p className="text-2xl font-bold mt-2">{summary.error || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Sinais externos</p>
                    <p className="text-2xl font-bold mt-2">{externalUsage.signalCount}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Relatórios com LLM externo</p>
                    <p className="text-2xl font-bold mt-2">{externalUsage.llmReports}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Custo externo</p>
                    <p className="text-2xl font-bold mt-2">${externalUsage.externalCost.toFixed(4)}</p>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Histórico recente de jobs</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Separação entre recorrência, sob demanda e retry.
                    </p>
                </div>
                <div className="divide-y divide-border">
                    {jobs.length > 0 ? (
                        jobs.map((job) => {
                            const client = Array.isArray(job.clients) ? job.clients[0] : job.clients;
                            return (
                                <div key={job.id} className="p-5 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-medium">{client?.company_name || "Cliente"}</p>
                                        <Badge variant={statusVariant(job.status)}>
                                            {job.status}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground mt-1">
                                        {job.job_kind} • {job.trigger_source} • {new Date(job.created_at).toLocaleString("pt-BR")}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        motivo: {job.reason || "n/a"}
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            Nenhum job registrado ainda ou migração pendente.
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                                <th className="p-4 font-medium text-muted-foreground">Titulo</th>
                                <th className="p-4 font-medium text-muted-foreground">Status</th>
                                <th className="p-4 font-medium text-muted-foreground">Insights</th>
                                <th className="p-4 font-medium text-muted-foreground">Retrospectiva</th>
                                <th className="p-4 font-medium text-muted-foreground">Confianca</th>
                                <th className="p-4 font-medium text-muted-foreground">Camada externa</th>
                                <th className="p-4 font-medium text-muted-foreground">Custo</th>
                                <th className="p-4 font-medium text-muted-foreground">Erro</th>
                                <th className="p-4 font-medium text-muted-foreground">Data</th>
                                <th className="p-4 font-medium text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length > 0 ? (
                                reports.map((report) => {
                                    const hypothesisSummary = summarizeHypotheses(report);
                                    const externalSummary = summarizeExternal(report);

                                    return (
                                        <tr key={report.id} className="border-b border-border last:border-none align-top hover:bg-muted/30">
                                            <td className="p-4 font-medium">{getClientName(report)}</td>
                                            <td className="p-4">{report.title || "Sem título"}</td>
                                            <td className="p-4">
                                                <Badge variant={statusVariant(report.status)}>
                                                    {report.status || "queued"}
                                                </Badge>
                                            </td>
                                            <td className="p-4">{report.insights_count || 0}</td>
                                            <td className="p-4">
                                                {report.retrospective_score !== null && report.retrospective_score !== undefined
                                                    ? Number(report.retrospective_score).toFixed(1)
                                                    : "-"}
                                            </td>
                                            <td className="p-4 text-xs text-muted-foreground">
                                                {hypothesisSummary.avgConfidence !== null ? (
                                                    <div className="space-y-1">
                                                        <div>{Math.round(hypothesisSummary.avgConfidence * 100)}% media</div>
                                                        <div>
                                                            {hypothesisSummary.confirmed} confirmadas • {hypothesisSummary.watching} em observacao
                                                        </div>
                                                        {hypothesisSummary.pendingReview > 0 ? (
                                                            <div>{hypothesisSummary.pendingReview} aguardando revisao</div>
                                                        ) : null}
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="p-4 text-xs text-muted-foreground">
                                                {report.external_signal_count ? (
                                                    <div className="space-y-1">
                                                        <div>{report.external_signal_count} sinais</div>
                                                        {externalSummary.topSource ? <div>fonte: {externalSummary.topSource}</div> : null}
                                                        {externalSummary.topTheme ? <div>tema: {externalSummary.topTheme}</div> : null}
                                                        {externalSummary.avgRelevance !== null ? (
                                                            <div>relevancia media: {Math.round(externalSummary.avgRelevance * 100)}%</div>
                                                        ) : null}
                                                        {report.external_intelligence_mode ? <div>modo: {report.external_intelligence_mode}</div> : null}
                                                        {report.external_llm_used ? <div>LLM ativo</div> : null}
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="p-4">
                                                <div>${Number(report.estimated_cost_usd || 0).toFixed(4)}</div>
                                                {report.external_estimated_cost_usd ? (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        ext ${Number(report.external_estimated_cost_usd).toFixed(4)}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="p-4 max-w-xs text-xs text-muted-foreground">
                                                {report.error_message ? report.error_message.slice(0, 140) : "-"}
                                            </td>
                                            <td className="p-4 text-muted-foreground">
                                                <div>{new Date(report.created_at).toLocaleDateString("pt-BR")}</div>
                                                {report.completed_at ? (
                                                    <div className="text-xs mt-1">
                                                        concluido em {new Date(report.completed_at).toLocaleDateString("pt-BR")}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-2 items-start">
                                                    <Link
                                                        href={`/dashboard/reports/${report.id}`}
                                                        className={buttonVariants({ variant: "outline", size: "sm" })}
                                                    >
                                                        Ver
                                                    </Link>
                                                    {report.status === "error" ? (
                                                        <form action="/api/reports/retry" method="post">
                                                            <input type="hidden" name="report_id" value={report.id} />
                                                            <button
                                                                type="submit"
                                                                className={buttonVariants({ size: "sm" })}
                                                            >
                                                                Reprocessar
                                                            </button>
                                                        </form>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                                        Nenhum relatório gerado. Cadastre um cliente e gere o primeiro.
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
