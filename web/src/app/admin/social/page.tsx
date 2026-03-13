import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type ReportFile = {
    id: string;
    file_type: string;
    storage_path: string;
};

type CandidateReport = {
    id: string;
    client_id: string;
    title: string | null;
    status: string | null;
    created_at: string;
    clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
    report_files: ReportFile[] | null;
};

type Publication = {
    id: string;
    report_id: string;
    client_id: string;
    platform: string;
    status: string;
    post_caption: string | null;
    approval_notes: string | null;
    scheduled_for: string | null;
    published_at: string | null;
    publish_attempts?: number | null;
    last_error?: string | null;
    impressions?: number | null;
    reactions_count?: number | null;
    comments_count?: number | null;
    shares_count?: number | null;
    clicks_count?: number | null;
    performance_score?: number | null;
    last_metrics_sync_at?: string | null;
    requires_second_review?: boolean | null;
    approval_stage?: number | null;
    first_approved_at?: string | null;
    second_approved_at?: string | null;
    rejected_at?: string | null;
    created_at: string;
    reports:
        | {
            id?: string;
            title?: string | null;
            clients?: { company_name?: string | null } | { company_name?: string | null }[] | null;
        }
        | Array<{
            id?: string;
            title?: string | null;
            clients?: { company_name?: string | null } | { company_name?: string | null }[] | null;
        }>
        | null;
};

function getCompanyName(client: CandidateReport["clients"] | Publication["reports"]) {
    if (!client) return "Cliente";
    const normalized = Array.isArray(client) ? client[0] : client;
    if (!normalized) return "Cliente";
    if ("clients" in normalized) {
        const nested = Array.isArray(normalized.clients) ? normalized.clients[0] : normalized.clients;
        return nested?.company_name || "Cliente";
    }
    if ("company_name" in normalized) {
        return normalized.company_name || "Cliente";
    }
    return "Cliente";
}

function statusVariant(status: string) {
    if (status === "published") return "default";
    if (status === "rejected" || status === "failed") return "destructive";
    if (status === "approved" || status === "scheduled") return "secondary";
    return "outline";
}

function metricTotal(publication: Publication) {
    return (
        Number(publication.impressions || 0) +
        Number(publication.reactions_count || 0) +
        Number(publication.comments_count || 0) +
        Number(publication.shares_count || 0) +
        Number(publication.clicks_count || 0)
    );
}

export default async function AdminSocialPage({
    searchParams,
}: {
    searchParams: Promise<{ success?: string; error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const { data: reportsData } = await supabase
        .from("reports")
        .select("id, client_id, title, status, created_at, clients(company_name), report_files(id, file_type, storage_path)")
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(25);

    let publications: Publication[] = [];
    try {
        const { data } = await supabase
            .from("social_publications")
            .select("id, report_id, client_id, platform, status, post_caption, approval_notes, scheduled_for, published_at, publish_attempts, last_error, impressions, reactions_count, comments_count, shares_count, clicks_count, performance_score, last_metrics_sync_at, requires_second_review, approval_stage, first_approved_at, second_approved_at, rejected_at, created_at, reports(id, title, clients(company_name))")
            .order("created_at", { ascending: false })
            .limit(50);

        publications = (data as Publication[] | null) || [];
    } catch {
        publications = [];
    }

    const reports = ((reportsData as CandidateReport[] | null) || []).filter((report) =>
        (report.report_files || []).some((file) =>
            ["social_card", "social_story", "social_copy_txt", "social_zip"].includes(file.file_type)
        )
    );

    const publicationReportIds = new Set(publications.map((publication) => publication.report_id));
    const candidates = reports.filter((report) => !publicationReportIds.has(report.id));

    const summary = publications.reduce(
        (acc, publication) => {
            acc[publication.status] = (acc[publication.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
    const publicationsWithMetrics = publications.filter(
        (publication) =>
            (publication.impressions || 0) > 0 ||
            (publication.reactions_count || 0) > 0 ||
            (publication.comments_count || 0) > 0 ||
            (publication.shares_count || 0) > 0 ||
            (publication.clicks_count || 0) > 0
    ).length;
    const totalAttempts = publications.reduce(
        (acc, publication) => acc + Number(publication.publish_attempts || 0),
        0
    );
    const readyToPublish = publications.filter((publication) => {
        const requiredStage = publication.requires_second_review ? 2 : 1;
        const stage = Number(publication.approval_stage || 0);
        const isReadyStatus = publication.status === "approved" || publication.status === "scheduled";
        return isReadyStatus && stage >= requiredStage;
    }).length;
    const awaitingSecondReview = publications.filter(
        (publication) =>
            publication.requires_second_review &&
            Number(publication.approval_stage || 0) === 1 &&
            publication.status !== "rejected"
    ).length;
    const platformAnalytics = Object.entries(
        publications.reduce(
            (acc, publication) => {
                const platform = publication.platform || "unknown";
                if (!acc[platform]) {
                    acc[platform] = {
                        count: 0,
                        published: 0,
                        impressions: 0,
                        reactions: 0,
                        comments: 0,
                        shares: 0,
                        clicks: 0,
                    };
                }

                acc[platform].count += 1;
                if (publication.status === "published") {
                    acc[platform].published += 1;
                }
                acc[platform].impressions += Number(publication.impressions || 0);
                acc[platform].reactions += Number(publication.reactions_count || 0);
                acc[platform].comments += Number(publication.comments_count || 0);
                acc[platform].shares += Number(publication.shares_count || 0);
                acc[platform].clicks += Number(publication.clicks_count || 0);
                return acc;
            },
            {} as Record<
                string,
                {
                    count: number;
                    published: number;
                    impressions: number;
                    reactions: number;
                    comments: number;
                    shares: number;
                    clicks: number;
                }
            >
        )
    ).sort((a, b) => b[1].impressions - a[1].impressions);
    const clientAnalytics = Object.entries(
        publications.reduce(
            (acc, publication) => {
                const report = Array.isArray(publication.reports) ? publication.reports[0] : publication.reports;
                const clientName = getCompanyName(report?.clients || null);
                if (!acc[clientName]) {
                    acc[clientName] = {
                        count: 0,
                        published: 0,
                        impressions: 0,
                        interactions: 0,
                        clicks: 0,
                    };
                }

                acc[clientName].count += 1;
                if (publication.status === "published") {
                    acc[clientName].published += 1;
                }
                acc[clientName].impressions += Number(publication.impressions || 0);
                acc[clientName].interactions +=
                    Number(publication.reactions_count || 0) +
                    Number(publication.comments_count || 0) +
                    Number(publication.shares_count || 0);
                acc[clientName].clicks += Number(publication.clicks_count || 0);
                return acc;
            },
            {} as Record<
                string,
                {
                    count: number;
                    published: number;
                    impressions: number;
                    interactions: number;
                    clicks: number;
                }
            >
        )
    )
        .sort((a, b) => b[1].impressions - a[1].impressions)
        .slice(0, 8);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Social Publishing</h1>
                <p className="text-muted-foreground mt-1">
                    Aprovacao, agendamento e historico operacional do social pack.
                </p>
            </div>

            {params.success ? (
                <Card className="p-4 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">
                        Acao executada com sucesso no fluxo de publicacao social.
                    </p>
                </Card>
            ) : null}

            {params.error ? (
                <Card className="p-4 border-red-200 bg-red-50 text-red-700">
                    <p className="text-sm font-medium">
                        Não foi possível concluir a ação. Verifique a migração e tente novamente.
                    </p>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-8">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Rascunhos</p>
                    <p className="text-2xl font-bold mt-2">{summary.draft || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Aprovados</p>
                    <p className="text-2xl font-bold mt-2">{summary.approved || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Agendados</p>
                    <p className="text-2xl font-bold mt-2">{summary.scheduled || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Publicados</p>
                    <p className="text-2xl font-bold mt-2">{summary.published || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Candidatos</p>
                    <p className="text-2xl font-bold mt-2">{candidates.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Com metricas</p>
                    <p className="text-2xl font-bold mt-2">{publicationsWithMetrics}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                        tentativas: {totalAttempts}
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Prontas para rodar</p>
                    <p className="text-2xl font-bold mt-2">{readyToPublish}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Aguardando 2a revisao</p>
                    <p className="text-2xl font-bold mt-2">{awaitingSecondReview}</p>
                </Card>
            </div>

            <div className="flex justify-end">
                <div className="flex gap-2">
                    <form action="/api/social/metrics" method="post">
                        <button type="submit" className={buttonVariants({ variant: "outline" })}>
                            Sincronizar metricas
                        </button>
                    </form>
                    <form action="/api/social/publish" method="post">
                        <button type="submit" className={buttonVariants({ variant: "outline" })}>
                            Processar publicacoes prontas
                        </button>
                    </form>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Comparativo por plataforma</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Leitura consolidada de volume e performance entre LinkedIn e Instagram.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left">
                                    <th className="p-4 font-medium text-muted-foreground">Plataforma</th>
                                    <th className="p-4 font-medium text-muted-foreground">Itens</th>
                                    <th className="p-4 font-medium text-muted-foreground">Publicados</th>
                                    <th className="p-4 font-medium text-muted-foreground">Impressions</th>
                                    <th className="p-4 font-medium text-muted-foreground">Clicks</th>
                                    <th className="p-4 font-medium text-muted-foreground">Interacoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {platformAnalytics.length > 0 ? (
                                    platformAnalytics.map(([platform, data]) => (
                                        <tr key={platform} className="border-b border-border last:border-none">
                                            <td className="p-4 font-medium capitalize">{platform}</td>
                                            <td className="p-4">{data.count}</td>
                                            <td className="p-4">{data.published}</td>
                                            <td className="p-4">{data.impressions}</td>
                                            <td className="p-4">{data.clicks}</td>
                                            <td className="p-4">{data.reactions + data.comments + data.shares}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-muted-foreground">
                                            Ainda nao ha dados suficientes para comparativo por plataforma.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Comparativo por cliente</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Top clientes com maior alcance agregado dentro da camada social.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left">
                                    <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                                    <th className="p-4 font-medium text-muted-foreground">Itens</th>
                                    <th className="p-4 font-medium text-muted-foreground">Publicados</th>
                                    <th className="p-4 font-medium text-muted-foreground">Impressions</th>
                                    <th className="p-4 font-medium text-muted-foreground">Interacoes</th>
                                    <th className="p-4 font-medium text-muted-foreground">Clicks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientAnalytics.length > 0 ? (
                                    clientAnalytics.map(([clientName, data]) => (
                                        <tr key={clientName} className="border-b border-border last:border-none">
                                            <td className="p-4 font-medium">{clientName}</td>
                                            <td className="p-4">{data.count}</td>
                                            <td className="p-4">{data.published}</td>
                                            <td className="p-4">{data.impressions}</td>
                                            <td className="p-4">{data.interactions}</td>
                                            <td className="p-4">{data.clicks}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-muted-foreground">
                                            Ainda nao ha dados suficientes para comparativo por cliente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Social packs prontos para entrar em fila</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Relatórios concluídos com assets sociais gerados, mas ainda sem publicação criada.
                    </p>
                </div>
                <div className="divide-y divide-border">
                    {candidates.length > 0 ? (
                        candidates.map((report) => (
                            <div key={report.id} className="p-5 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-medium">{getCompanyName(report.clients)}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {report.title || "Relatório sem título"} • {new Date(report.created_at).toLocaleDateString("pt-BR")}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Assets encontrados: {(report.report_files || []).map((file) => file.file_type).join(", ")}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/dashboard/reports/${report.id}`}
                                        className={buttonVariants({ variant: "outline", size: "sm" })}
                                    >
                                        Ver relatorio
                                    </Link>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <form action="/api/social/publications" method="post" className="rounded-lg border p-4 space-y-3">
                                        <input type="hidden" name="action" value="create" />
                                        <input type="hidden" name="report_id" value={report.id} />
                                        <input type="hidden" name="client_id" value={report.client_id} />
                                        <input type="hidden" name="platform" value="instagram" />
                                        <input type="hidden" name="requires_second_review" value="true" />
                                        <div>
                                            <p className="font-medium">Criar rascunho para Instagram</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Entra na fila com status `draft` para revisao e agendamento.
                                            </p>
                                        </div>
                                        <textarea
                                            name="post_caption"
                                            rows={4}
                                            placeholder="Legenda base para Instagram"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        />
                                        <button type="submit" className={buttonVariants({ size: "sm" })}>
                                            Criar rascunho
                                        </button>
                                    </form>

                                    <form action="/api/social/publications" method="post" className="rounded-lg border p-4 space-y-3">
                                        <input type="hidden" name="action" value="create" />
                                        <input type="hidden" name="report_id" value={report.id} />
                                        <input type="hidden" name="client_id" value={report.client_id} />
                                        <input type="hidden" name="platform" value="linkedin" />
                                        <input type="hidden" name="requires_second_review" value="true" />
                                        <div>
                                            <p className="font-medium">Criar rascunho para LinkedIn</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Permite adaptar o mesmo social pack para distribuicao profissional.
                                            </p>
                                        </div>
                                        <textarea
                                            name="post_caption"
                                            rows={4}
                                            placeholder="Legenda base para LinkedIn"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        />
                                        <button type="submit" className={buttonVariants({ size: "sm" })}>
                                            Criar rascunho
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            Nenhum social pack elegível sem publicação criada.
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Fila de aprovacao e publicacao</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Controle de status, agendamento e anotacoes da operacao.
                    </p>
                </div>
                <div className="divide-y divide-border">
                    {publications.length > 0 ? (
                        publications.map((publication) => {
                            const report = Array.isArray(publication.reports) ? publication.reports[0] : publication.reports;

                            return (
                                <div key={publication.id} className="p-5 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-medium">{getCompanyName(report?.clients || null)}</p>
                                            <Badge variant={statusVariant(publication.status)}>
                                                {publication.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {publication.platform} • {report?.title || "Relatório"} 
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            criado em {new Date(publication.created_at).toLocaleString("pt-BR")}
                                        </p>
                                        {publication.scheduled_for ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                agendado para {new Date(publication.scheduled_for).toLocaleString("pt-BR")}
                                            </p>
                                        ) : null}
                                        {publication.published_at ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                publicado em {new Date(publication.published_at).toLocaleString("pt-BR")}
                                            </p>
                                        ) : null}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            tentativas: {publication.publish_attempts || 0}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            aprovacao: etapa {publication.approval_stage || 0}
                                            {publication.requires_second_review ? " de 2" : " de 1"}
                                        </p>
                                        {publication.first_approved_at ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                1a aprovacao em {new Date(publication.first_approved_at).toLocaleString("pt-BR")}
                                            </p>
                                        ) : null}
                                        {publication.second_approved_at ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                2a aprovacao em {new Date(publication.second_approved_at).toLocaleString("pt-BR")}
                                            </p>
                                        ) : null}
                                        {publication.rejected_at ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                rejeitado em {new Date(publication.rejected_at).toLocaleString("pt-BR")}
                                            </p>
                                        ) : null}
                                        {publication.last_error ? (
                                            <p className="text-xs text-red-600 mt-2">
                                                último erro: {publication.last_error.slice(0, 180)}
                                            </p>
                                        ) : null}
                                        {publication.last_metrics_sync_at ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                metricas atualizadas em {new Date(publication.last_metrics_sync_at).toLocaleString("pt-BR")}
                                            </p>
                                        ) : null}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            score oficial: {Number(publication.performance_score || metricTotal(publication)).toFixed(2)}
                                        </p>
                                        <div className="mt-3">
                                            <Link
                                                href={`/dashboard/reports/${publication.report_id}`}
                                                className={buttonVariants({ variant: "outline", size: "sm" })}
                                            >
                                                Abrir assets
                                            </Link>
                                        </div>
                                    </div>

                                    <form action="/api/social/publications" method="post" className="space-y-3 rounded-lg border p-4">
                                        <input type="hidden" name="action" value="update" />
                                        <input type="hidden" name="publication_id" value={publication.id} />
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Status</span>
                                                <select
                                                    name="status"
                                                    defaultValue={publication.status}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                    <option value="draft">draft</option>
                                                    <option value="approved">approved</option>
                                                    <option value="rejected">rejected</option>
                                                    <option value="scheduled">scheduled</option>
                                                    <option value="published">published</option>
                                                    <option value="failed">failed</option>
                                                </select>
                                            </label>
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Agendar para</span>
                                                <input
                                                    type="datetime-local"
                                                    name="scheduled_for"
                                                    defaultValue={publication.scheduled_for ? publication.scheduled_for.slice(0, 16) : ""}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </label>
                                        </div>
                                        <label className="block text-sm space-y-2">
                                            <span className="font-medium">Legenda</span>
                                            <textarea
                                                name="post_caption"
                                                rows={4}
                                                defaultValue={publication.post_caption || ""}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            />
                                        </label>
                                        <label className="block text-sm space-y-2">
                                            <span className="font-medium">Notas operacionais</span>
                                            <textarea
                                                name="approval_notes"
                                                rows={3}
                                                defaultValue={publication.approval_notes || ""}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            />
                                        </label>
                                        <div className="grid gap-3 md:grid-cols-5">
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Impressions</span>
                                                <input
                                                    type="number"
                                                    name="impressions"
                                                    min="0"
                                                    defaultValue={publication.impressions || ""}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </label>
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Reactions</span>
                                                <input
                                                    type="number"
                                                    name="reactions_count"
                                                    min="0"
                                                    defaultValue={publication.reactions_count || ""}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </label>
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Comments</span>
                                                <input
                                                    type="number"
                                                    name="comments_count"
                                                    min="0"
                                                    defaultValue={publication.comments_count || ""}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </label>
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Shares</span>
                                                <input
                                                    type="number"
                                                    name="shares_count"
                                                    min="0"
                                                    defaultValue={publication.shares_count || ""}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </label>
                                            <label className="text-sm space-y-2">
                                                <span className="font-medium">Clicks</span>
                                                <input
                                                    type="number"
                                                    name="clicks_count"
                                                    min="0"
                                                    defaultValue={publication.clicks_count || ""}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </label>
                                        </div>
                                        <button type="submit" className={buttonVariants({ size: "sm" })}>
                                            Salvar atualizacao
                                        </button>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <button
                                                type="submit"
                                                name="approval_action"
                                                value="approve"
                                                className={buttonVariants({ size: "sm" })}
                                            >
                                                Registrar aprovacao
                                            </button>
                                            <button
                                                type="submit"
                                                formAction="/api/social/publish"
                                                className={buttonVariants({ variant: "outline", size: "sm" })}
                                            >
                                                Publicar agora
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            Nenhuma publicação criada ainda ou migração pendente.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
