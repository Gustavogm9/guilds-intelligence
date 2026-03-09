import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { FileText, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function ClientDashboard() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Buscar dados do cliente
    const { data: client } = await supabase
        .from("clients")
        .select("id, company_name, plan_id, plans(name, reports_per_month)")
        .eq("user_id", user!.id)
        .single();

    // Buscar último relatório
    const { data: lastReport } = client
        ? await supabase
            .from("reports")
            .select("id, title, created_at, status")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()
        : { data: null };

    // Total de relatórios no mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyCount } = client
        ? await supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id)
            .gte("created_at", startOfMonth.toISOString())
        : { count: 0 };

    const plan = client?.plans as Record<string, unknown> | null;
    const reportsLeft = (Number(plan?.reports_per_month) || 0) - (monthlyCount || 0);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    Olá{client?.company_name ? `, ${client.company_name}` : ""}! 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Seu hub de inteligência de mercado
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">Plano atual</p>
                            <p className="text-lg font-bold">{String(plan?.name) || "Sem plano"}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">Relatórios este mês</p>
                            <p className="text-lg font-bold">{monthlyCount || 0} / {Number(plan?.reports_per_month) || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="h-8 w-8 text-amber-500 opacity-80" />
                        <div>
                            <p className="text-sm text-muted-foreground">Restantes</p>
                            <p className="text-lg font-bold">{Math.max(reportsLeft, 0)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Último Relatório */}
            <Card className="p-6 mb-6">
                <h2 className="text-lg font-bold mb-4">Último Relatório</h2>
                {lastReport ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">{lastReport.title || "Relatório"}</p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(lastReport.created_at).toLocaleDateString("pt-BR")}
                            </p>
                        </div>
                        <Link
                            href={`/dashboard/reports/${lastReport.id}`}
                            className={buttonVariants({ variant: "outline" })}
                        >
                            Ver relatório
                        </Link>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Seu primeiro relatório está sendo preparado. Você receberá uma
                        notificação quando estiver pronto!
                    </p>
                )}
            </Card>

            {/* Ação rápida */}
            <Card className="p-6 bg-primary/5 border-primary/20">
                <h2 className="text-lg font-bold mb-2">Quer se aprofundar?</h2>
                <p className="text-muted-foreground text-sm mb-4">
                    Solicite um deep dive sobre qualquer tema do seu último relatório.
                </p>
                <Link
                    href="/dashboard/deep-dive"
                    className={buttonVariants()}
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Solicitar Deep Dive
                </Link>
            </Card>
        </div>
    );
}
