import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ReportAutoRefresh } from "@/components/dashboard/report-auto-refresh";
import { GenerateReportButton } from "@/components/dashboard/generate-report-button";
import { formatDate, getDictionary } from "@/lib/i18n";

function statusKey(status: string | null) {
    return status || "queued";
}

export default async function ClientReportsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("id, preferred_language")
        .eq("user_id", user!.id)
        .single();

    const t = getDictionary(client?.preferred_language);

    const { data: reports } = client
        ? await supabase
            .from("reports")
            .select("id, title, status, created_at, completed_at, summary")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
        : { data: [] };

    const reportList = reports || [];
    const hasPendingReport = reportList.some(
        (report: Record<string, unknown>) => report.status === "queued" || report.status === "processing"
    );
    const summary = reportList.reduce(
        (acc, report: Record<string, unknown>) => {
            const status = String(report.status || "queued");
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <div className="space-y-8">
            <ReportAutoRefresh active={hasPendingReport} intervalMs={45000} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t.reportListTitle}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t.reportListDescription}
                    </p>
                </div>
                <GenerateReportButton
                    label={t.generateNewReport}
                    loadingLabel={t.generatingReport}
                />
            </div>

            {hasPendingReport ? (
                <Card className="p-4 border-amber-200 bg-amber-50 text-amber-800">
                    <p className="text-sm font-medium">
                        {t.pendingReportsHint}
                    </p>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">{t.readyCount}</p>
                    <p className="text-2xl font-bold mt-2">{summary.done || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">{t.inProgressCount}</p>
                    <p className="text-2xl font-bold mt-2">{(summary.processing || 0) + (summary.queued || 0)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">{t.errorCount}</p>
                    <p className="text-2xl font-bold mt-2">{summary.error || 0}</p>
                </Card>
            </div>

            {reportList.length > 0 ? (
                <div className="grid gap-4">
                    {reportList.map((report: Record<string, unknown>) => (
                        <Card key={String(report.id)} className="p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <p className="font-medium">{String(report.title || t.reportFallbackTitle)}</p>
                                        <Badge variant={report.status === "done" ? "default" : "secondary"}>
                                            {t.statuses[statusKey(String(report.status || "queued"))] || t.statuses.queued}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t.createdOn(formatDate(String(report.created_at), client?.preferred_language))}
                                        {report.completed_at
                                            ? ` | ${t.completedOn(formatDate(String(report.completed_at), client?.preferred_language))}`
                                            : ""}
                                    </p>
                                    {report.summary ? (
                                        <p className="text-sm text-muted-foreground max-w-3xl">
                                            {String(report.summary).slice(0, 220)}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/dashboard/reports/${report.id}`}
                                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground"
                                    >
                                        {t.openReport}
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                        {t.noReportsYet}
                    </p>
                </Card>
            )}
        </div>
    );
}
