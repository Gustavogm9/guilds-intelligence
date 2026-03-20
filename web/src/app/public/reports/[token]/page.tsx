import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary, formatDate } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportDownloadLink } from "@/components/tracking/report-download-link";
import { TrackedAudioPlayer } from "@/components/tracking/tracked-audio-player";

type ReportFileRow = {
    id: string;
    file_type: string;
    storage_path: string;
};

type ReportFileWithUrl = ReportFileRow & {
    url: string;
};

type ExternalSource = {
    source: string;
    description?: string;
    sentiment?: "positive" | "negative" | "neutral";
    relevance_score?: number;
    url?: string;
};

// Gera os signed URLs usando o admin client para acesso ao bucket privado
async function getSignedFiles(supabaseAdmin: any, files: ReportFileRow[]): Promise<ReportFileWithUrl[]> {
    if (!files.length) return [];
    const paths = files.map((f) => f.storage_path);
    const { data: signedUrls, error } = await supabaseAdmin.storage.from("reports").createSignedUrls(paths, 60 * 60 * 24); // 24 horas

    if (error || !signedUrls) {
        console.error("Erro ao gerar assinaturas (admin):", error);
        return files.map((f) => ({ ...f, url: "" }));
    }

    return files.map((f, i) => ({
        ...f,
        url: signedUrls[i]?.signedUrl || "",
    }));
}

export default async function PublicReportPage({ params }: { params: { token: string } }) {
    const supabaseAdmin = createAdminClient();

    // 1. Validar o token de compartilhamento
    const { data: sharedDoc } = await supabaseAdmin
        .from("shared_reports")
        .select("report_id, expires_at")
        .eq("token", params.token)
        .single();

    if (!sharedDoc) {
        return notFound();
    }

    if (sharedDoc.expires_at && new Date(sharedDoc.expires_at) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
                <Card className="p-8 max-w-md w-full text-center">
                    <h1 className="text-xl font-bold mb-2">Link Expirado</h1>
                    <p className="text-muted-foreground">O link de compartilhamento não é mais válido.</p>
                </Card>
            </div>
        );
    }

    // 2. Buscar o relatório (bypass RLS via admin)
    const { data: report } = await supabaseAdmin
        .from("reports")
        .select(`
            *,
            clients (
                company_name,
                preferred_language
            )
        `)
        .eq("id", sharedDoc.report_id)
        .single();

    if (!report) {
        return notFound();
    }

    const t = getDictionary(report.clients?.preferred_language || "pt-BR");

    // 3. Buscar arquivos
    const { data: rawFiles } = await supabaseAdmin
        .from("report_files")
        .select("id, file_type, storage_path")
        .eq("report_id", report.id)
        .order("file_type");

    const files = await getSignedFiles(supabaseAdmin, (rawFiles || []) as ReportFileRow[]);
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
    const externalSources = Array.isArray(report.external_sources) ? (report.external_sources as ExternalSource[]) : [];

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Cabeçalho */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <h2 className="text-xl font-bold text-primary tracking-tight">
                        Guilds Intelligence
                    </h2>
                    <h1 className="text-4xl font-extrabold text-slate-900">
                        {report.title || t.intelligenceReport}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Badge variant="secondary" className="px-3 py-1">
                            {report.clients?.company_name || "Cliente Guilds"}
                        </Badge>
                        <span className="text-sm text-slate-500">
                            {formatDate(report.created_at, report.clients?.preferred_language, {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                    </div>
                </div>

                {/* Resumo Executivo */}
                {report.summary && (
                    <Card className="p-8 shadow-sm border-slate-200/60 bg-white">
                        <h3 className="font-bold text-lg mb-4 text-slate-900">{t.summary}</h3>
                        <p className="text-slate-600 leading-relaxed">
                            {report.summary}
                        </p>
                    </Card>
                )}

                {/* Área de Downloads */}
                {(pdfFull || pdfOnepage || audioFile) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pdfFull && (
                            <ReportDownloadLink
                                fileUrl={pdfFull.url}
                                label={t.downloadFullLabel}
                                description={t.downloadFullDesc}
                                fileName={`${report.title || "relatorio"}-completo.pdf`}
                                reportId={report.id}
                            />
                        )}
                        {pdfOnepage && (
                            <ReportDownloadLink
                                fileUrl={pdfOnepage.url}
                                label={t.downloadOnepageLabel}
                                description={t.downloadOnepageDesc}
                                fileName={`${report.title || "relatorio"}-onepage.pdf`}
                                reportId={report.id}
                                isSecondary
                            />
                        )}
                        {audioFile && (
                            <div className="md:col-span-2 mt-2">
                                <TrackedAudioPlayer
                                    audioUrl={audioFile.url}
                                    reportId={report.id}
                                    title={t.listenAudioTitle}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Fontes Externas */}
                {externalSources.length > 0 && (
                    <Card className="p-6 border-slate-200/60 bg-slate-50 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-2">Sinais externos capturados</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Inteligência coletada dinamicamente para complementar a análise base.
                        </p>
                        <div className="space-y-3">
                            {externalSources.map((ext, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-md border border-slate-100 flex items-start gap-4 shadow-sm">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{ext.source}</p>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ext.description}</p>
                                    </div>
                                    {ext.url && (
                                        <a href={ext.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline shrink-0 hover:text-primary/80">
                                            Acessar Origem
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
