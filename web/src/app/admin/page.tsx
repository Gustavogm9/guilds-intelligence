import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import {
    Users,
    FileText,
    TrendingUp,
    DollarSign,
    Eye,
    MousePointerClick,
    UserPlus,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

/* ─── Funil visual ─── */
function FunnelBar({
    label,
    count,
    total,
    color,
    icon: Icon,
}: {
    label: string;
    count: number;
    total: number;
    color: string;
    icon: React.ElementType;
}) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const conversionFromPrev = total > 0 ? `${pct}%` : "—";

    return (
        <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${color}`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{label}</span>
                    <span className="font-bold">{count}</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${color} transition-all duration-700`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                </div>
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right">{conversionFromPrev}</span>
        </div>
    );
}

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Stats em paralelo
    const [clientsRes, reportsRes, plansRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("plans").select("*").order("price_monthly"),
    ]);

    // Funil: buscar contagens de eventos
    let funnelData = { landing_view: 0, modal_open: 0, lead_submit: 0, signup_complete: 0, onboarding_complete: 0 };

    try {
        const { data: funnelRows } = await supabase
            .from("funnel_events")
            .select("event_type");

        if (funnelRows) {
            funnelRows.forEach((row: { event_type: string }) => {
                const key = row.event_type as keyof typeof funnelData;
                if (key in funnelData) {
                    funnelData[key]++;
                }
            });
        }
    } catch {
        // Tabela pode não existir ainda — funil fica zerado
    }

    // Últimos relatórios
    const { data: recentReports } = await supabase
        .from("reports")
        .select("id, title, status, created_at, clients(company_name)")
        .order("created_at", { ascending: false })
        .limit(5);

    const stats = [
        {
            label: "Clientes Ativos",
            value: clientsRes.count || 0,
            icon: Users,
            color: "text-blue-500",
        },
        {
            label: "Relatórios Gerados",
            value: reportsRes.count || 0,
            icon: FileText,
            color: "text-green-500",
        },
        {
            label: "Planos Disponíveis",
            value: plansRes.data?.length || 0,
            icon: TrendingUp,
            color: "text-purple-500",
        },
        {
            label: "MRR Estimado",
            value: "R$ 0",
            icon: DollarSign,
            color: "text-amber-500",
        },
    ];

    const funnelSteps = [
        { label: "Visitaram a landing", count: funnelData.landing_view, color: "bg-sky-500", icon: Eye },
        { label: "Abriram o modal", count: funnelData.modal_open, color: "bg-blue-500", icon: MousePointerClick },
        { label: "Enviaram o formulário", count: funnelData.lead_submit, color: "bg-indigo-500", icon: UserPlus },
        { label: "Completaram signup", count: funnelData.signup_complete, color: "bg-violet-500", icon: Users },
        { label: "Finalizaram onboarding", count: funnelData.onboarding_complete, color: "bg-green-500", icon: TrendingUp },
    ];

    const totalVisits = funnelData.landing_view || 1; // evita divisão por zero

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Visão geral do Guilds Intelligence Engine
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                            </div>
                            <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
                {/* Funil de Conversão */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold">Funil de Conversão</h2>
                        <span className="text-xs text-muted-foreground">% vs visitantes</span>
                    </div>
                    {funnelData.landing_view > 0 ? (
                        <div className="space-y-4">
                            {funnelSteps.map((step, i) => (
                                <div key={i}>
                                    <FunnelBar
                                        label={step.label}
                                        count={step.count}
                                        total={totalVisits}
                                        color={step.color}
                                        icon={step.icon}
                                    />
                                    {i < funnelSteps.length - 1 && (
                                        <div className="flex justify-center py-1">
                                            <ArrowRight className="h-3 w-3 text-muted-foreground/50 rotate-90" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div className="border-t pt-4 mt-4 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Conversão total (visita → onboarding)</span>
                                <span className="font-bold text-green-600">
                                    {totalVisits > 0
                                        ? `${Math.round((funnelData.onboarding_complete / totalVisits) * 100)}%`
                                        : "—"}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                O tracking de funil será populado automaticamente
                                com as visitas à landing page.
                            </p>
                        </div>
                    )}
                </Card>

                {/* Últimos Relatórios */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">Últimos Relatórios</h2>
                        <Link href="/admin/reports" className="text-xs text-primary hover:underline">
                            Ver todos →
                        </Link>
                    </div>
                    {recentReports && recentReports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">Cliente</th>
                                        <th className="pb-3 font-medium">Título</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentReports.map((report: Record<string, unknown>) => (
                                        <tr key={String(report.id)} className="border-b border-border last:border-none">
                                            <td className="py-3">
                                                {(report.clients as Record<string, unknown>)?.company_name as string || "—"}
                                            </td>
                                            <td className="py-3">{String(report.title || "Sem título")}</td>
                                            <td className="py-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${report.status === "done"
                                                        ? "bg-green-100 text-green-700"
                                                        : report.status === "processing"
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {String(report.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {new Date(String(report.created_at)).toLocaleDateString("pt-BR")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            Nenhum relatório gerado ainda. Comece cadastrando um cliente.
                        </p>
                    )}
                </Card>
            </div>
        </div>
    );
}
