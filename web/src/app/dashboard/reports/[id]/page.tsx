import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, ImageIcon, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

import { Card } from "@/components/ui/card";
import { ReportAutoRefresh } from "@/components/dashboard/report-auto-refresh";
import { ReportProcessingStatus } from "@/components/dashboard/report-processing-status";
import { WhatsAppCopyCard } from "@/components/dashboard/whatsapp-copy-card";
import { EventTracker } from "@/components/tracking/event-tracker";
import { ReportDownloadLink } from "@/components/tracking/report-download-link";
import { TrackedAudioPlayer } from "@/components/tracking/tracked-audio-player";
import { RegenerateFreeBanner } from "@/components/dashboard/regenerate-free-banner";
import { DeepDiveChat } from "@/components/dashboard/deep-dive-chat";
import { ContentGenerator } from "@/components/dashboard/content-generator";
import { ShareReportButton } from "@/components/dashboard/share-report-button";
import { formatDate, getDictionary } from "@/lib/i18n";

type ReportClient = {
    company_name?: string;
    user_id?: string;
    preferred_language?: string;
};

type ReportFileRow = {
    id: string;
    file_type: string;
    storage_path: string;
};

type ReportFileWithUrl = ReportFileRow & {
    url: string;
};

type ReportHypothesis = {
    title?: string;
    theme?: string;
    prediction?: string;
    recommended_action?: string;
    confidence?: number;
    confidence_reason?: string;
    retrospective_status?: string;
    history_reference_title?: string | null;
    operational_evidence_strength?: number | null;
    sensitivity_level?: string;
    review_required?: boolean;
    review_status?: string;
    review_notes?: string | null;
    source_type?: string;
    source_name?: string;
    source_url?: string | null;
    source_relevance?: number | null;
    source_theme?: string;
    source_theme_confidence?: number | null;
};

type RetrospectiveItem = {
    title?: string;
    status?: string;
    assessment?: string;
    next_step?: string;
    operational_evidence_strength?: number | null;
};

type ExternalSource = {
    title?: string;
    summary?: string;
    url?: string;
    source_name?: string;
    published_at?: string | null;
    relevance_score?: number | null;
    matched_keywords?: string[];
    objective_keywords?: string[];
    theme?: string;
    theme_confidence?: number | null;
};

async function getSignedFiles(
    supabase: Awaited<ReturnType<typeof createClient>>,
    files: ReportFileRow[]
): Promise<ReportFileWithUrl[]> {
    return Promise.all(
        files.map(async (file) => {
            const { data } = await supabase.storage
                .from("reports")
                .createSignedUrl(file.storage_path, 3600);

            return {
                ...file,
                url: data?.signedUrl || "#",
            };
        })
    );
}

async function readTextFile(url: string): Promise<string | null> {
    if (!url || url === "#") {
        return null;
    }

    try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            return null;
        }
        return await response.text();
    } catch {
        return null;
    }
}

export default async function ReportDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ review?: string }>;
}) {
    const { id } = await params;
    const query = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return notFound();
    }

    const { data: report } = await supabase
        .from("reports")
        .select("*, clients(company_name, user_id, preferred_language)")
        .eq("id", id)
        .single();

    if (!report) {
        return notFound();
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const client = (Array.isArray(report.clients) ? report.clients[0] : report.clients) as ReportClient | null;
    if (profile?.role !== "admin" && client?.user_id !== user.id) {
        return notFound();
    }

    const t = getDictionary(client?.preferred_language);

    const { data: rawFiles } = await supabase
        .from("report_files")
        .select("id, file_type, storage_path")
        .eq("report_id", id)
        .order("file_type");

    const { count: totalReportsForClient } = client?.user_id
        ? await supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("client_id", report.client_id)
        : { count: 0 };

    const files = await getSignedFiles(supabase, (rawFiles || []) as ReportFileRow[]);
    const filesByType = files.reduce<Record<string, ReportFileWithUrl[]>>((acc, file) => {
        if (!acc[file.file_type]) {
            acc[file.file_type] = [];
        }
        acc[file.file_type].push(file);
        return acc;
    }, {});

    const pdfFull = filesByType.pdf_full?.[0];
    const pdfOnepage = filesByType.pdf_onepage?.[0];
    const audioFile = filesByType.audio_mp3?.[0];
    const whatsappFile = filesByType.whatsapp_txt?.[0];
    const socialZip = filesByType.social_zip?.[0];
    const socialCards = filesByType.social_card || [];
    const socialCopyFile = filesByType.social_copy_txt?.[0];

    const whatsappContent = whatsappFile ? await readTextFile(whatsappFile.url) : null;
    const socialCopyContent = socialCopyFile ? await readTextFile(socialCopyFile.url) : null;
    const hypotheses = Array.isArray(report.hypotheses) ? (report.hypotheses as ReportHypothesis[]) : [];
    const retrospectiveItems = Array.isArray(report.retrospective_items)
        ? (report.retrospective_items as RetrospectiveItem[])
        : [];
    const externalSources = Array.isArray(report.external_sources) ? (report.external_sources as ExternalSource[]) : [];

    return (
        <>
        <div>
            <ReportAutoRefresh active={report.status !== "done" && report.status !== "error"} />
            {profile?.role !== "admin" ? (
                <EventTracker
                    eventType="report_view"
                    metadata={{ report_id: id, status: report.status, client_name: client?.company_name || null }}
                />
            ) : null}
            {profile?.role !== "admin" && totalReportsForClient === 1 ? (
                <EventTracker
                    eventType="first_report_view"
                    metadata={{ report_id: id, client_name: client?.company_name || null }}
                />
            ) : null}
            <Link
                href={profile?.role === "admin" ? "/admin/reports" : "/dashboard/reports"}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                {t.backToReports}
            </Link>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">
                        {report.title || t.intelligenceReport}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant={report.status === "done" ? "default" : "secondary"}>
                            {t.statuses[report.status || "queued"] || report.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {formatDate(report.created_at, client?.preferred_language, {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                        {client?.company_name && (
                            <span className="text-sm text-muted-foreground">
                                | {client.company_name}
                            </span>
                        )}
                    </div>
                </div>
                {report.status === "done" && (
                    <div className="flex items-center gap-2 mt-1 sm:mt-0">
                        <ShareReportButton reportId={report.id} />
                    </div>
                )}
            </div>

            {profile?.role === "admin" && query.review === "success" ? (
                <Card className="p-4 mb-6 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">
                        Revisao da hipotese salva com sucesso.
                    </p>
                </Card>
            ) : null}

            {report.summary && (
                <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
                    <h2 className="font-bold mb-2">{t.summary}</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {report.summary}
                    </p>
                    {report.insights_count > 0 && (
                        <p className="text-xs text-primary font-medium mt-3">
                            {t.insightsCovered(report.insights_count, report.niches_covered?.length || 0)}
                        </p>
                    )}
                </Card>
            )}

            <RegenerateFreeBanner
                reportId={report.id}
                isAvailable={report.is_free_regeneration_available === true}
            />

            {report.status === "done" && hypotheses.length > 0 && (
                <div className="mb-6">
                    <ContentGenerator
                        reportId={report.id}
                        hypotheses={hypotheses}
                        lang={client?.preferred_language || "pt-BR"}
                    />
                </div>
            )}

            {externalSources.length > 0 ? (
                <Card className="p-6 mb-6 border-sky-200 bg-sky-50/50">
                    <h2 className="font-bold mb-2">Sinais externos usados no relatório</h2>
                    <p className="text-sm text-muted-foreground">
                        Esta entrega já combina contexto interno com fontes externas configuradas no worker.
                    </p>
                    {report.external_signal_summary ? (
                        <p className="text-sm text-sky-900 mt-3">
                            {report.external_signal_summary}
                            {report.external_intelligence_mode ? (
                                <span className="text-xs text-sky-700 ml-2">
                                    ({report.external_intelligence_mode})
                                </span>
                            ) : null}
                        </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-sky-800">
                        <span>{report.external_signal_count || 0} sinais usados</span>
                        <span>{report.external_feeds_considered || 0} feeds considerados</span>
                        <span>LLM: {report.external_llm_used ? "sim" : "nao"}</span>
                        <span>custo externo: ${Number(report.external_estimated_cost_usd || 0).toFixed(4)}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                        {externalSources.slice(0, 3).map((source, index) => (
                            <div key={`${source.url || source.title || "external"}-${index}`} className="rounded-lg border bg-background p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="font-medium">{source.title || "Sinal externo"}</p>
                                    <div className="flex items-center gap-2">
                                        {source.source_name ? <Badge variant="outline">{source.source_name}</Badge> : null}
                                        {source.theme ? <Badge variant="outline">{source.theme}</Badge> : null}
                                        {source.relevance_score ? (
                                            <Badge variant="secondary">
                                                relevancia {Math.round(Number(source.relevance_score) * 100)}%
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>
                                {source.summary ? (
                                    <p className="text-sm text-muted-foreground mt-2">{source.summary}</p>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    {source.published_at ? (
                                        <span>publicado em {formatDate(source.published_at, client?.preferred_language)}</span>
                                    ) : null}
                                    {Array.isArray(source.matched_keywords) && source.matched_keywords.length > 0 ? (
                                        <span>keywords: {source.matched_keywords.join(", ")}</span>
                                    ) : null}
                                    {Array.isArray(source.objective_keywords) && source.objective_keywords.length > 0 ? (
                                        <span>objetivo: {source.objective_keywords.join(", ")}</span>
                                    ) : null}
                                    {source.theme_confidence ? (
                                        <span>confianca do tema: {Math.round(Number(source.theme_confidence) * 100)}%</span>
                                    ) : null}
                                </div>
                                {source.url ? (
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex mt-3 text-sm text-primary hover:underline"
                                    >
                                        Abrir fonte
                                    </a>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </Card>
            ) : null}

            {report.retrospective_summary ? (
                <Card className="p-6 mb-6 border-amber-200 bg-amber-50/50">
                    <h2 className="font-bold mb-2">Leitura retrospectiva</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {report.retrospective_summary}
                    </p>
                    <p className="text-xs font-medium text-amber-700 mt-3">
                        Score retrospectivo: {Number(report.retrospective_score || 0).toFixed(1)}
                    </p>
                    {retrospectiveItems.length > 0 ? (
                        <div className="mt-4 space-y-3">
                            {retrospectiveItems.slice(0, 3).map((item, index: number) => (
                                <div key={`${item.title || "item"}-${index}`} className="rounded-lg border bg-background p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-medium">{item.title || "Hipotese"}</p>
                                        <Badge variant="outline">{item.status || "pending"}</Badge>
                                    </div>
                                    {item.assessment ? (
                                        <p className="text-sm text-muted-foreground mt-2">{item.assessment}</p>
                                    ) : null}
                                    {item.operational_evidence_strength ? (
                                        <p className="text-xs text-amber-700 mt-2">
                                            Evidencia operacional: {Math.round(item.operational_evidence_strength * 100)}%
                                        </p>
                                    ) : null}
                                    {item.next_step ? (
                                        <p className="text-xs text-primary mt-2">Próximo passo: {item.next_step}</p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </Card>
            ) : null}

            {hypotheses.length > 0 ? (
                <Card className="p-6 mb-6">
                    <h2 className="font-bold mb-2">Hipoteses e confianca do motor</h2>
                    <p className="text-sm text-muted-foreground">
                        Esta camada mostra como o motor esta calibrando previsoes com base em historico e sinais operacionais.
                    </p>
                    <div className="mt-4 space-y-3">
                        {hypotheses.slice(0, 3).map((hypothesis, index) => (
                            <div key={`${hypothesis.title || "hypothesis"}-${index}`} className="rounded-lg border bg-background p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="font-medium">{hypothesis.title || "Hipotese"}</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{hypothesis.retrospective_status || "pending"}</Badge>
                                        <Badge variant="secondary">
                                            Confianca {Math.round(Number(hypothesis.confidence || 0) * 100)}%
                                        </Badge>
                                        {hypothesis.sensitivity_level ? (
                                            <Badge variant="outline">
                                                sensibilidade {hypothesis.sensitivity_level}
                                            </Badge>
                                        ) : null}
                                        {hypothesis.review_status ? (
                                            <Badge variant="outline">{hypothesis.review_status}</Badge>
                                        ) : null}
                                    </div>
                                </div>
                                {hypothesis.prediction ? (
                                    <p className="text-sm text-muted-foreground mt-2">{hypothesis.prediction}</p>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span>motivo: {hypothesis.confidence_reason || "baseline"}</span>
                                    {hypothesis.source_type ? (
                                        <span>origem: {hypothesis.source_type}</span>
                                    ) : null}
                                    {hypothesis.source_name ? (
                                        <span>fonte: {hypothesis.source_name}</span>
                                    ) : null}
                                    {hypothesis.source_theme ? (
                                        <span>tema: {hypothesis.source_theme}</span>
                                    ) : null}
                                    {hypothesis.history_reference_title ? (
                                        <span>referencia historica: {hypothesis.history_reference_title}</span>
                                    ) : null}
                                    {hypothesis.operational_evidence_strength ? (
                                        <span>
                                            evidencia operacional: {Math.round(Number(hypothesis.operational_evidence_strength) * 100)}%
                                        </span>
                                    ) : null}
                                    {hypothesis.source_theme_confidence ? (
                                        <span>
                                            confianca do tema: {Math.round(Number(hypothesis.source_theme_confidence) * 100)}%
                                        </span>
                                    ) : null}
                                </div>
                                {hypothesis.source_url ? (
                                    <a
                                        href={hypothesis.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex mt-3 text-xs text-primary hover:underline"
                                    >
                                        Abrir origem do insight
                                    </a>
                                ) : null}
                                {hypothesis.recommended_action ? (
                                    <p className="text-xs text-primary mt-3">
                                        Acao sugerida: {hypothesis.recommended_action}
                                    </p>
                                ) : null}
                                {hypothesis.review_notes ? (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Revisao: {hypothesis.review_notes}
                                    </p>
                                ) : null}
                                {profile?.role === "admin" && hypothesis.review_required ? (
                                    <form action="/api/reports/hypotheses/review" method="post" className="mt-4 space-y-3">
                                        <input type="hidden" name="report_id" value={id} />
                                        <input type="hidden" name="hypothesis_index" value={index} />
                                        <textarea
                                            name="review_notes"
                                            rows={2}
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            placeholder="Notas da revisao humana"
                                            defaultValue={hypothesis.review_notes || ""}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="submit"
                                                name="review_status"
                                                value="approved"
                                                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground ring-offset-background hover:bg-primary/90"
                                            >
                                                Aprovar
                                            </button>
                                            <button
                                                type="submit"
                                                name="review_status"
                                                value="needs_revision"
                                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground"
                                            >
                                                Pedir ajuste
                                            </button>
                                            <button
                                                type="submit"
                                                name="review_status"
                                                value="flagged"
                                                className="inline-flex items-center justify-center rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground ring-offset-background hover:bg-destructive/90"
                                            >
                                                Sinalizar
                                            </button>
                                        </div>
                                    </form>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </Card>
            ) : null}

            <div className="grid lg:grid-cols-2 gap-6">
                {(pdfFull || pdfOnepage) && (
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="font-bold">{t.reportPdf}</h3>
                        </div>
                        <div className="space-y-2">
                            {pdfFull && (
                                <ReportDownloadLink
                                    reportId={id}
                                    fileType="pdf_full"
                                    href={pdfFull.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground w-full justify-start gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    {t.fullPdf}
                                </ReportDownloadLink>
                            )}
                            {pdfOnepage && (
                                <ReportDownloadLink
                                    reportId={id}
                                    fileType="pdf_onepage"
                                    href={pdfOnepage.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground w-full justify-start gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    {t.onePagePdf}
                                </ReportDownloadLink>
                            )}
                        </div>
                    </Card>
                )}

                {(socialCards.length > 0 || socialZip || socialCopyContent) && (
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-violet-600" />
                            </div>
                            <h3 className="font-bold">{t.socialPack}</h3>
                        </div>
                        {socialCards.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                {socialCards.slice(0, 8).map((file, index) => (
                                    <ReportDownloadLink
                                        reportId={id}
                                        fileType="social_card"
                                        data-track-file-type="social_card"
                                        key={file.id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block overflow-hidden rounded-lg border bg-muted"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={file.url}
                                            alt={`Card ${index + 1}`}
                                            className="aspect-square w-full object-cover"
                                        />
                                    </ReportDownloadLink>
                                ))}
                            </div>
                        )}
                        {socialZip && (
                            <ReportDownloadLink
                                reportId={id}
                                fileType="social_zip"
                                href={socialZip.url}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground w-full justify-start gap-2 mb-3"
                            >
                                <Download className="h-4 w-4" />
                                {t.downloadFullPack}
                            </ReportDownloadLink>
                        )}
                        {socialCopyContent && (
                            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                                {socialCopyContent.slice(0, 1200)}
                            </div>
                        )}
                    </Card>
                )}
            </div>

            {audioFile && (
                <div className="mt-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Play className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold">{t.audioBriefing}</h3>
                                <p className="text-xs text-muted-foreground">{report.title || t.intelligenceReport}</p>
                            </div>
                        </div>
                        <TrackedAudioPlayer reportId={id} src={audioFile.url} />
                        <div className="mt-3 flex justify-end">
                            <ReportDownloadLink
                                reportId={id}
                                fileType="audio_mp3"
                                href={audioFile.url}
                                download
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground gap-2"
                            >
                                <Download className="h-3.5 w-3.5" />
                                {t.downloadMp3}
                            </ReportDownloadLink>
                        </div>
                    </Card>
                </div>
            )}

            {whatsappContent && (
                <div className="mt-6">
                    <WhatsAppCopyCard content={whatsappContent} title={t.whatsappCopy} copyLabel={t.copyText} />
                </div>
            )}

            {report.status !== "done" && (
                <ReportProcessingStatus
                    status={report.status || "queued"}
                    createdAt={report.created_at}
                    locale={client?.preferred_language === "en-US" ? "en-US" : "pt-BR"}
                />
            )}

            {files.length === 0 && report.status === "done" && (
                <Card className="p-8 mt-6 text-center">
                    <p className="text-muted-foreground">
                        {t.noFilesAvailable}
                    </p>
                </Card>
            )}

            {profile?.role === "admin" && (
                <Card className="p-4 mt-6 bg-muted/50">
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <span>Tokens input: {report.tokens_input?.toLocaleString() || 0}</span>
                        <span>Tokens output: {report.tokens_output?.toLocaleString() || 0}</span>
                        <span>Estimated cost: ${Number(report.estimated_cost_usd || 0).toFixed(4)}</span>
                        {report.email_sent_at && (
                            <span>
                                {t.emailSentOn(formatDate(report.email_sent_at, client?.preferred_language))}
                            </span>
                        )}
                    </div>
                </Card>
            )}
        </div>

            {report.status === "done" && (
                <DeepDiveChat
                    reportId={report.id}
                    reportTitle={report.title || t.intelligenceReport}
                    lang={client?.preferred_language || "pt-BR"}
                />
            )}
        </>
    );
}
