import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DollarSign, FileText, AlertTriangle, TrendingUp } from "lucide-react";

type ClientPlan = {
    price_monthly?: number | null;
    reports_per_month?: number | null;
    name?: string | null;
};

type ActiveClientRow = {
    id: string;
    company_name: string;
    discount_percent: number | null;
    plans: ClientPlan | ClientPlan[] | null;
};

type BillingRow = {
    id: string;
    client_id: string;
    plan_price: number;
    created_at: string;
    clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
    plans: ClientPlan | ClientPlan[] | null;
};

function asSinglePlan(plan: ClientPlan | ClientPlan[] | null | undefined): ClientPlan | null {
    if (!plan) return null;
    return Array.isArray(plan) ? plan[0] || null : plan;
}

function asSingleClientName(
    client: { company_name?: string | null } | { company_name?: string | null }[] | null | undefined
) {
    if (!client) return "Cliente";
    return Array.isArray(client) ? client[0]?.company_name || "Cliente" : client.company_name || "Cliente";
}

function formatCurrency(cents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(cents / 100);
}

function startOfMonthIso() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

function nextMonthIso() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);
}

function StatCard({
    title,
    value,
    hint,
    icon: Icon,
}: {
    title: string;
    value: string;
    hint: string;
    icon: React.ElementType;
}) {
    return (
        <Card className="p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold mt-2">{value}</p>
                    <p className="text-xs text-muted-foreground mt-2">{hint}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </Card>
    );
}

export default async function AdminBillingPage() {
    const supabase = await createClient();
    const monthStart = startOfMonthIso();
    const nextMonth = nextMonthIso();

    const [activeClientsRes, billingRes] = await Promise.all([
        supabase
            .from("clients")
            .select("id, company_name, discount_percent, plans(price_monthly, reports_per_month, name)")
            .eq("is_active", true),
        supabase
            .from("billing_log")
            .select("id, client_id, plan_price, created_at, clients(company_name), plans(name, reports_per_month)")
            .gte("billing_month", monthStart)
            .lt("billing_month", nextMonth)
            .order("created_at", { ascending: false }),
    ]);

    const activeClients = (activeClientsRes.data as ActiveClientRow[] | null) || [];
    const billingRows = (billingRes.data as BillingRow[] | null) || [];

    const mrrCents = activeClients.reduce((sum, client) => {
        const plan = asSinglePlan(client.plans);
        const price = Number(plan?.price_monthly || 0);
        const discount = Number(client.discount_percent || 0);
        const adjusted = Math.max(price - Math.round(price * (discount / 100)), 0);
        return sum + adjusted;
    }, 0);

    const usageByClient = new Map<string, number>();
    billingRows.forEach((row) => {
        usageByClient.set(row.client_id, (usageByClient.get(row.client_id) || 0) + 1);
    });

    const clientsAtRisk = activeClients.filter((client) => {
        const plan = asSinglePlan(client.plans);
        const limit = Number(plan?.reports_per_month || 0);
        if (!limit) return false;
        const usage = usageByClient.get(client.id) || 0;
        return usage >= limit;
    });

    const avgReportsPerClient =
        activeClients.length > 0 ? (billingRows.length / activeClients.length).toFixed(1) : "0.0";

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Billing</h1>
                <p className="text-muted-foreground mt-1">
                    Visao operacional de faturamento e consumo do mes atual.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="MRR estimado"
                    value={formatCurrency(mrrCents)}
                    hint={`${activeClients.length} cliente(s) ativos considerados`}
                    icon={DollarSign}
                />
                <StatCard
                    title="Relatórios faturados"
                    value={String(billingRows.length)}
                    hint={`Media de ${avgReportsPerClient} por cliente no mes`}
                    icon={FileText}
                />
                <StatCard
                    title="Clientes no limite"
                    value={String(clientsAtRisk.length)}
                    hint="Clientes que ja consumiram o limite do plano"
                    icon={AlertTriangle}
                />
                <StatCard
                    title="Ticket médio"
                    value={formatCurrency(activeClients.length ? Math.round(mrrCents / activeClients.length) : 0)}
                    hint="Receita média mensal por cliente ativo"
                    icon={TrendingUp}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-border">
                        <h2 className="font-bold">Eventos de billing do mes</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Snapshot por relatorio gerado para auditoria comercial.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-left">
                                    <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                                    <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                    <th className="p-4 font-medium text-muted-foreground">Valor</th>
                                    <th className="p-4 font-medium text-muted-foreground">Uso</th>
                                    <th className="p-4 font-medium text-muted-foreground">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billingRows.length > 0 ? (
                                    billingRows.map((row) => {
                                        const plan = asSinglePlan(row.plans);
                                        const usage = usageByClient.get(row.client_id) || 0;
                                        const limit = Number(plan?.reports_per_month || 0);
                                        const nearLimit = limit > 0 && usage >= limit;

                                        return (
                                            <tr key={row.id} className="border-b border-border last:border-none">
                                                <td className="p-4 font-medium">{asSingleClientName(row.clients)}</td>
                                                <td className="p-4">{plan?.name || "Plano"}</td>
                                                <td className="p-4">{formatCurrency(Number(row.plan_price || 0))}</td>
                                                <td className="p-4">
                                                    <Badge variant={nearLimit ? "destructive" : "secondary"}>
                                                        {limit > 0 ? `${usage}/${limit}` : `${usage} uso(s)`}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-muted-foreground">
                                                    {new Date(row.created_at).toLocaleDateString("pt-BR")}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Nenhum evento de billing registrado neste mes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-5">
                    <h2 className="font-bold">Capacidade e risco</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Clientes que merecem acompanhamento operacional imediato.
                    </p>

                    <div className="mt-5 space-y-3">
                        {clientsAtRisk.length > 0 ? (
                            clientsAtRisk.map((client) => {
                                const plan = asSinglePlan(client.plans);
                                const usage = usageByClient.get(client.id) || 0;
                                const limit = Number(plan?.reports_per_month || 0);

                                return (
                                    <div key={client.id} className="rounded-xl border p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{client.company_name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {plan?.name || "Plano"} • limite {limit} relatorio(s)/mes
                                                </p>
                                            </div>
                                            <Badge variant="destructive">{usage}/{limit}</Badge>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                                Nenhum cliente ativo atingiu o limite de consumo neste mes.
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
