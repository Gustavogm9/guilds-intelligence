import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    FileText,
    Building2,
    Target,
    Users,
    Calendar,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminClientDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: client } = await supabase
        .from("clients")
        .select("*, plans(name, report_frequency, reports_per_month, price_monthly)")
        .eq("id", id)
        .single();

    if (!client) return notFound();

    // Relatórios do cliente
    const { data: reports } = await supabase
        .from("reports")
        .select("id, title, status, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

    // Nichos mapeados
    const { data: niches } = await supabase
        .from("client_niches")
        .select("niche_name, relevance, is_active")
        .eq("client_id", id)
        .order("relevance");

    const plan = client.plans as Record<string, unknown> | null;

    const frequencyLabels: Record<string, string> = {
        daily: "Diário",
        weekly: "Semanal",
        biweekly: "Quinzenal",
        monthly: "Mensal",
        business_days: "Dias úteis",
    };

    return (
        <div>
            <Link
                href="/admin/clients"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{client.company_name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant={client.is_active ? "default" : "secondary"}>
                            {client.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {String(plan?.name)} • {frequencyLabels[String(plan?.report_frequency)] || "—"}
                        </span>
                    </div>
                </div>
                <form action="/api/reports/generate" method="post">
                    <input type="hidden" name="client_id" value={id} />
                    <Button className="gap-2">
                        <FileText className="h-4 w-4" />
                        Gerar relatório
                    </Button>
                </form>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Info Column */}
                <div className="space-y-6">
                    {/* Contato */}
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Contato</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Nome:</span> {client.contact_name}</p>
                            <p><span className="text-muted-foreground">Email:</span> {client.contact_email}</p>
                            <p><span className="text-muted-foreground">Tel:</span> {client.contact_phone || "—"}</p>
                        </div>
                    </Card>

                    {/* Empresa */}
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Empresa</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Setor:</span> {client.industry || "—"}</p>
                            <p><span className="text-muted-foreground">Tamanho:</span> {client.company_size || "—"}</p>
                            <p><span className="text-muted-foreground">Local:</span> {client.location || "—"}</p>
                            <p><span className="text-muted-foreground">Faturamento:</span> {client.annual_revenue || "—"}</p>
                        </div>
                    </Card>

                    {/* Plano */}
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Plano</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Plano:</span> <span className="font-medium text-primary">{String(plan?.name)}</span></p>
                            <p><span className="text-muted-foreground">Preço:</span> R${(Number(plan?.price_monthly) / 100).toFixed(0)}/mês</p>
                            <p><span className="text-muted-foreground">Frequência:</span> {frequencyLabels[String(plan?.report_frequency)] || "—"}</p>
                            <p><span className="text-muted-foreground">Limite:</span> {String(plan?.reports_per_month)} relatórios/mês</p>
                            <p><span className="text-muted-foreground">Início:</span> {client.plan_started_at ? new Date(client.plan_started_at).toLocaleDateString("pt-BR") : "—"}</p>
                        </div>
                    </Card>

                    {/* Nichos */}
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Nichos Mapeados</h3>
                        </div>
                        {niches && niches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {niches.map((n: Record<string, unknown>, i: number) => (
                                    <Badge
                                        key={i}
                                        variant={n.is_active ? "default" : "secondary"}
                                        className="text-xs"
                                    >
                                        {String(n.niche_name)}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Nichos serão mapeados automaticamente após o onboarding.
                            </p>
                        )}
                    </Card>
                </div>

                {/* Reports Column */}
                <div className="lg:col-span-2">
                    <Card className="p-5">
                        <h3 className="font-bold mb-4">Últimos Relatórios</h3>
                        {reports && reports.length > 0 ? (
                            <div className="space-y-3">
                                {reports.map((r: Record<string, unknown>) => (
                                    <div
                                        key={String(r.id)}
                                        className="flex items-center justify-between py-3 border-b border-border last:border-none"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {String(r.title || "Relatório")}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(String(r.created_at)).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                variant={r.status === "done" ? "default" : "secondary"}
                                            >
                                                {String(r.status)}
                                            </Badge>
                                            <Link
                                                href={`/dashboard/reports/${r.id}`}
                                                className={buttonVariants({
                                                    variant: "outline",
                                                    size: "sm",
                                                })}
                                            >
                                                Ver
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Nenhum relatório gerado para este cliente.
                            </p>
                        )}
                    </Card>

                    {/* Raw onboarding text */}
                    {client.raw_onboarding_text && (
                        <Card className="p-5 mt-6">
                            <h3 className="font-bold mb-3">Texto de Onboarding (IA)</h3>
                            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
                                {client.raw_onboarding_text}
                            </div>
                        </Card>
                    )}

                    {/* Objetivos & Dores */}
                    <div className="grid sm:grid-cols-2 gap-4 mt-6">
                        {client.goals_2026 && client.goals_2026.length > 0 && (
                            <Card className="p-5">
                                <h3 className="font-bold text-sm mb-3">Objetivos 2026</h3>
                                <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {client.goals_2026.map((g: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-primary">•</span>
                                            {g}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                        {client.pain_points && client.pain_points.length > 0 && (
                            <Card className="p-5">
                                <h3 className="font-bold text-sm mb-3">Dores</h3>
                                <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {client.pain_points.map((p: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-red-500">•</span>
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
