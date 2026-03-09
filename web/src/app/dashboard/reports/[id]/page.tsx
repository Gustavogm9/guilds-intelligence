import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText,
    Download,
    Play,
    MessageSquare,
    ImageIcon,
    ArrowLeft,
    Copy,
    Check,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/* Audio Player Client Component */
function AudioPlayerSection({ url, title }: { url: string; title: string }) {
    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-bold">Áudio Briefing</h3>
                    <p className="text-xs text-muted-foreground">{title}</p>
                </div>
            </div>
            <audio controls className="w-full" preload="metadata">
                <source src={url} type="audio/mpeg" />
                Seu navegador não suporta o player de áudio.
            </audio>
            <div className="mt-3 flex justify-end">
                <a
                    href={url}
                    download
                    className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "gap-2",
                    })}
                >
                    <Download className="h-3.5 w-3.5" />
                    Baixar MP3
                </a>
            </div>
        </Card>
    );
}

/* WhatsApp Copy Section */
function WhatsAppCopySection({ content }: { content: string }) {
    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-bold">Copy para WhatsApp</h3>
            </div>
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed mb-3">
                {content}
            </div>
            <CopyButton text={content} />
        </Card>
    );
}

function CopyButton({ text }: { text: string }) {
    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
                navigator.clipboard.writeText(text);
            }}
        >
            <Copy className="h-3.5 w-3.5" />
            Copiar texto
        </Button>
    );
}

export default async function ReportDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return notFound();

    // Buscar relatório
    const { data: report } = await supabase
        .from("reports")
        .select("*, clients(company_name, user_id)")
        .eq("id", id)
        .single();

    if (!report) return notFound();

    // Verificar acesso: admin ou dono do relatório
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const client = report.clients as Record<string, unknown> | null;
    if (profile?.role !== "admin" && client?.user_id !== user.id) {
        return notFound();
    }

    // Buscar arquivos do relatório
    const { data: files } = await supabase
        .from("report_files")
        .select("*")
        .eq("report_id", id)
        .order("file_type");

    // Agrupar por tipo
    const filesByType: Record<string, Record<string, unknown>[]> = {};
    files?.forEach((f: Record<string, unknown>) => {
        const type = String(f.file_type);
        if (!filesByType[type]) filesByType[type] = [];
        filesByType[type].push(f);
    });

    // Gerar signed URLs para os arquivos
    async function getFileUrl(storagePath: string): Promise<string> {
        const { data } = await supabase.storage
            .from("reports")
            .createSignedUrl(storagePath, 3600);
        return data?.signedUrl || "#";
    }

    return (
        <div>
            {/* Breadcrumb */}
            <Link
                href={
                    profile?.role === "admin"
                        ? "/admin/reports"
                        : "/dashboard/reports"
                }
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar aos relatórios
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">
                        {report.title || "Relatório de Inteligência"}
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge
                            variant={report.status === "done" ? "default" : "secondary"}
                        >
                            {report.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                        {client && (
                            <span className="text-sm text-muted-foreground">
                                • {String(client.company_name)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary */}
            {report.summary && (
                <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
                    <h2 className="font-bold mb-2">Resumo</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {report.summary}
                    </p>
                    {report.insights_count > 0 && (
                        <p className="text-xs text-primary font-medium mt-3">
                            📊 {report.insights_count} insights identificados •{" "}
                            {report.niches_covered?.length || 0} nichos cobertos
                        </p>
                    )}
                </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {/* PDF Section */}
                {(filesByType["pdf_full"] || filesByType["pdf_onepage"]) && (
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="font-bold">Relatório PDF</h3>
                        </div>
                        <div className="space-y-2">
                            {filesByType["pdf_full"]?.map(
                                (f: Record<string, unknown>) => (
                                    <a
                                        key={String(f.id)}
                                        href={`#pdf-${f.id}`}
                                        className={buttonVariants({
                                            variant: "outline",
                                            className: "w-full justify-start gap-2",
                                        })}
                                    >
                                        <Download className="h-4 w-4" />
                                        PDF Completo
                                    </a>
                                )
                            )}
                            {filesByType["pdf_onepage"]?.map(
                                (f: Record<string, unknown>) => (
                                    <a
                                        key={String(f.id)}
                                        href={`#pdf-${f.id}`}
                                        className={buttonVariants({
                                            variant: "outline",
                                            className: "w-full justify-start gap-2",
                                        })}
                                    >
                                        <Download className="h-4 w-4" />
                                        PDF One Page (Executivo)
                                    </a>
                                )
                            )}
                        </div>
                    </Card>
                )}

                {/* Social Media Section */}
                {(filesByType["social_card"] ||
                    filesByType["social_zip"]) && (
                        <Card className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-violet-600" />
                                </div>
                                <h3 className="font-bold">Pack Social Media</h3>
                            </div>
                            {filesByType["social_card"] && (
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {filesByType["social_card"]
                                        .slice(0, 8)
                                        .map((f: Record<string, unknown>, i: number) => (
                                            <div
                                                key={String(f.id)}
                                                className="aspect-square bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground"
                                            >
                                                Card {i + 1}
                                            </div>
                                        ))}
                                </div>
                            )}
                            {filesByType["social_zip"]?.map(
                                (f: Record<string, unknown>) => (
                                    <a
                                        key={String(f.id)}
                                        href={`#zip-${f.id}`}
                                        className={buttonVariants({
                                            variant: "outline",
                                            className: "w-full justify-start gap-2",
                                        })}
                                    >
                                        <Download className="h-4 w-4" />
                                        Baixar Pack Completo (.zip)
                                    </a>
                                )
                            )}
                        </Card>
                    )}
            </div>

            {/* Audio MP3 — full width */}
            {filesByType["audio_mp3"]?.map((f: Record<string, unknown>) => (
                <div key={String(f.id)} className="mt-6">
                    <AudioPlayerSection
                        url={`#audio-${f.id}`}
                        title={report.title || "Briefing de Inteligência"}
                    />
                </div>
            ))}

            {/* WhatsApp Copy */}
            {filesByType["whatsapp_txt"]?.map(
                (f: Record<string, unknown>) => (
                    <div key={String(f.id)} className="mt-6">
                        <WhatsAppCopySection content="Seu texto de WhatsApp estará disponível aqui quando o relatório for gerado." />
                    </div>
                )
            )}

            {/* Status info — se ainda processando */}
            {report.status !== "done" && (
                <Card className="p-6 mt-6 border-amber-200 bg-amber-50/50">
                    <p className="text-sm text-amber-800 font-medium">
                        ⏳ Este relatório ainda está sendo processado. Os arquivos
                        aparecerão aqui automaticamente quando estiverem prontos.
                    </p>
                </Card>
            )}

            {/* Sem arquivos */}
            {(!files || files.length === 0) && report.status === "done" && (
                <Card className="p-8 mt-6 text-center">
                    <p className="text-muted-foreground">
                        Nenhum arquivo disponível para este relatório.
                    </p>
                </Card>
            )}

            {/* Token usage — admin only */}
            {profile?.role === "admin" && (
                <Card className="p-4 mt-6 bg-muted/50">
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <span>
                            Tokens input: {report.tokens_input?.toLocaleString() || 0}
                        </span>
                        <span>
                            Tokens output: {report.tokens_output?.toLocaleString() || 0}
                        </span>
                        <span>
                            Custo estimado: $
                            {Number(report.estimated_cost_usd || 0).toFixed(4)}
                        </span>
                        {report.email_sent_at && (
                            <span>
                                📧 Email enviado em{" "}
                                {new Date(report.email_sent_at).toLocaleDateString("pt-BR")}
                            </span>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
