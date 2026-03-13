import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

type ExternalSource = {
    source_name?: string;
    theme?: string;
    relevance_score?: number | null;
};

type ReportRow = {
    id: string;
    title: string | null;
    created_at: string;
    external_signal_count: number | null;
    external_intelligence_mode: string | null;
    external_llm_used: boolean | null;
    external_estimated_cost_usd: number | null;
    external_sources: ExternalSource[] | null;
    clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
};

function getClientName(report: ReportRow) {
    const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
    return client?.company_name || "Cliente";
}

export default async function AdminExternalPage() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("reports")
        .select(
            "id, title, created_at, external_signal_count, external_intelligence_mode, external_llm_used, external_estimated_cost_usd, external_sources, clients(company_name)"
        )
        .gt("external_signal_count", 0)
        .order("created_at", { ascending: false })
        .limit(30);

    const reports = (data as ReportRow[] | null) || [];

    const sourceCounts = new Map<string, number>();
    const themeCounts = new Map<string, number>();
    let totalSignals = 0;
    let totalExternalCost = 0;
    let llmReports = 0;

    for (const report of reports) {
        totalSignals += report.external_signal_count || 0;
        totalExternalCost += Number(report.external_estimated_cost_usd || 0);
        if (report.external_llm_used) {
            llmReports += 1;
        }

        for (const source of Array.isArray(report.external_sources) ? report.external_sources : []) {
            const sourceName = source.source_name || "fonte desconhecida";
            sourceCounts.set(sourceName, (sourceCounts.get(sourceName) || 0) + 1);

            const theme = source.theme || "mercado";
            themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
        }
    }

    const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Inteligência Externa</h1>
                <p className="text-muted-foreground mt-1">
                    Auditoria das fontes, temas e custo da camada externa dos relatórios.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Relatórios auditados</p>
                    <p className="text-2xl font-bold mt-2">{reports.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Sinais externos</p>
                    <p className="text-2xl font-bold mt-2">{totalSignals}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Relatórios com LLM</p>
                    <p className="text-2xl font-bold mt-2">{llmReports}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Custo externo</p>
                    <p className="text-2xl font-bold mt-2">${totalExternalCost.toFixed(4)}</p>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h2 className="font-bold">Fontes mais recorrentes</h2>
                    <div className="mt-4 space-y-3">
                        {topSources.length > 0 ? (
                            topSources.map(([source, count]) => (
                                <div key={source} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="font-medium">{source}</span>
                                    <Badge variant="outline">{count}</Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma fonte externa registrada ainda.</p>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Temas mais recorrentes</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {topThemes.length > 0 ? (
                            topThemes.map(([theme, count]) => (
                                <Badge key={theme} variant="secondary">
                                    {theme} • {count}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum tema externo classificado ainda.</p>
                        )}
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Relatórios recentes com camada externa</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Visão rápida para auditoria editorial e operacional.
                    </p>
                </div>
                <div className="divide-y divide-border">
                    {reports.length > 0 ? (
                        reports.map((report) => {
                            const sources = Array.isArray(report.external_sources) ? report.external_sources : [];
                            const firstSource = sources[0];
                            return (
                                <div key={report.id} className="p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{report.title || "Relatório"}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {getClientName(report)} • {new Date(report.created_at).toLocaleString("pt-BR")}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {report.external_intelligence_mode ? (
                                                <Badge variant="outline">{report.external_intelligence_mode}</Badge>
                                            ) : null}
                                            {report.external_llm_used ? <Badge>LLM</Badge> : null}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                        <span>{report.external_signal_count || 0} sinais</span>
                                        <span>custo: ${Number(report.external_estimated_cost_usd || 0).toFixed(4)}</span>
                                        {firstSource?.source_name ? <span>fonte principal: {firstSource.source_name}</span> : null}
                                        {firstSource?.theme ? <span>tema principal: {firstSource.theme}</span> : null}
                                        {firstSource?.relevance_score ? (
                                            <span>relevancia principal: {Math.round(Number(firstSource.relevance_score) * 100)}%</span>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            Nenhum relatório com camada externa registrada ainda.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
