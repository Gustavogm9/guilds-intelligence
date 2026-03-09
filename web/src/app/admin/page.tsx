import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import {
    Users,
    FileText,
    TrendingUp,
    DollarSign,
} from "lucide-react";

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Stats em paralelo
    const [clientsRes, reportsRes, plansRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("plans").select("*").order("price_monthly"),
    ]);

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

            {/* Recent Reports */}
            <Card className="p-6">
                <h2 className="text-lg font-bold mb-4">Últimos Relatórios</h2>
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
    );
}
