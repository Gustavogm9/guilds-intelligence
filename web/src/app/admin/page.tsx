import type { ElementType } from "react";
import Link from "next/link";
import {
    ArrowRight,
    DollarSign,
    Eye,
    FileText,
    MousePointerClick,
    TrendingUp,
    UserPlus,
    Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(cents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

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
    icon: ElementType;
}) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

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
            <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
        </div>
    );
}

export default async function AdminDashboard() {
    const supabase = await createClient();

    const [clientsCountRes, reportsRes, plansRes, activeClientsRevenueRes, recentReportsRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reports").select("id, status"),
        supabase.from("plans").select("id, price_monthly").order("price_monthly"),
        supabase.from("clients").select("discount_percent, plans(price_monthly)").eq("is_active", true),
        supabase
            .from("reports")
            .select("id, title, status, created_at, clients(company_name)")
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    const funnelData = {
        landing_view: 0,
        modal_open: 0,
        lead_submit: 0,
        signup_complete: 0,
        onboarding_complete: 0,
    };

    try {
        const { data: funnelRows } = await supabase.from("funnel_events").select("event_type");
        if (funnelRows) {
            funnelRows.forEach((row: { event_type: string }) => {
                const key = row.event_type as keyof typeof funnelData;
                if (key in funnelData) funnelData[key]++;
            });
        }
    } catch {
        // funnel_events pode ainda nao existir em alguns ambientes
    }

    const reportRows = (reportsRes.data as Array<{ status?: string | null }> | null) || [];
    const recentReports =
        (recentReportsRes.data as Array<{
            id: string;
            title: string | null;
            status: string | null;
            created_at: string;
            clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
        }> | null) || [];

    const reportStatus = reportRows.reduce(
        (acc, report) => {
            const status = report.status || "queued";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    const estimatedMrr = (
        (activeClientsRevenueRes.data as Array<{
            discount_percent?: number | null;
            plans?: { price_monthly?: number | null }[] | { price_monthly?: number | null } | null;
        }> | null) || []
    ).reduce((sum, client) => {
        const plan = Array.isArray(client.plans) ? client.plans[0] : client.plans;
        const price = Number(plan?.price_monthly || 0);
        const discount = Number(client.discount_percent || 0);
        return sum + Math.max(price - Math.round(price * (discount / 100)), 0);
    }, 0);

    const stats = [
        {
            label: "Clientes Ativos",
            value: String(clientsCountRes.count || 0),
            icon: Users,
            color: "text-blue-500",
        },
        {
            label: "Relatórios Gerados",
            value: String(reportRows.length),
            icon: FileText,
            color: "text-green-500",
        },
        {
            label: "Planos Disponiveis",
            value: String(plansRes.data?.length || 0),
            icon: TrendingUp,
            color: "text-purple-500",
        },
        {
            label: "MRR Estimado",
            value: formatCurrency(estimatedMrr),
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

    const totalVisits = funnelData.landing_view || 1;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Visao executiva da operacao comercial e da esteira de relatorios.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <Card key={stat.label} className="p-6">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Fila de geração</p>
                    <p className="text-2xl font-bold mt-2">{reportStatus.queued || 0}</p>
                    <p className="text-xs text-muted-foreground mt-2">Relatórios aguardando worker</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Em processamento</p>
                    <p className="text-2xl font-bold mt-2">{reportStatus.processing || 0}</p>
                    <p className="text-xs text-muted-foreground mt-2">Geracoes em andamento</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Falhas operacionais</p>
                    <p className="text-2xl font-bold mt-2">{reportStatus.error || 0}</p>
                    <p className="text-xs text-muted-foreground mt-2">Itens que precisam de revisao manual</p>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold">Funil de Conversao</h2>
                        <span className="text-xs text-muted-foreground">% vs visitantes</span>
                    </div>
                    {funnelData.landing_view > 0 ? (
                        <div className="space-y-4">
                            {funnelSteps.map((step, index) => (
                                <div key={step.label}>
                                    <FunnelBar
                                        label={step.label}
                                        count={step.count}
                                        total={totalVisits}
                                        color={step.color}
                                        icon={step.icon}
                                    />
                                    {index < funnelSteps.length - 1 ? (
                                        <div className="flex justify-center py-1">
                                            <ArrowRight className="h-3 w-3 text-muted-foreground/50 rotate-90" />
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                            <div className="border-t pt-4 mt-4 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Conversao total (visita → onboarding)</span>
                                <span className="font-bold text-green-600">
                                    {Math.round((funnelData.onboarding_complete / totalVisits) * 100)}%
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                O tracking de funil sera populado automaticamente quando houver trafego na landing.
                            </p>
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">Ultimos Relatorios</h2>
                        <Link href="/admin/reports" className="text-xs text-primary hover:underline">
                            Ver todos →
                        </Link>
                    </div>
                    {recentReports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">Cliente</th>
                                        <th className="pb-3 font-medium">Titulo</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentReports.map((report) => {
                                        const client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
                                        return (
                                            <tr key={report.id} className="border-b border-border last:border-none">
                                                <td className="py-3">{client?.company_name || "—"}</td>
                                                <td className="py-3">{report.title || "Sem título"}</td>
                                                <td className="py-3">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            report.status === "done"
                                                                ? "bg-green-100 text-green-700"
                                                                : report.status === "processing"
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : report.status === "error"
                                                                        ? "bg-red-100 text-red-700"
                                                                        : "bg-gray-100 text-gray-700"
                                                        }`}
                                                    >
                                                        {report.status || "queued"}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-muted-foreground">
                                                    {new Date(report.created_at).toLocaleDateString("pt-BR")}
                                                </td>
                                            </tr>
                                        );
                                    })}
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
