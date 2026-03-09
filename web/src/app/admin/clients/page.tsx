import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/* ─── Helpers ─── */
type ClientRow = {
    id: string;
    company_name: string;
    contact_name: string | null;
    contact_email: string;
    contact_phone: string | null;
    is_active: boolean;
    user_id: string | null;
    raw_onboarding_text: string | null;
    plan_id: string;
    created_at: string;
    plans: { name: string } | null;
};

function inferFunnelStatus(c: ClientRow) {
    if (!c.is_active && c.user_id) return { label: "Inativo", color: "destructive" as const };
    if (!c.user_id) return { label: "Lead", color: "secondary" as const };
    if (!c.raw_onboarding_text) return { label: "Onboarding pendente", color: "outline" as const };
    return { label: "Ativo", color: "default" as const };
}

/* ─── Stats Card ─── */
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={`rounded-xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
    );
}

/* ─── Page ─── */
export default async function AdminClientsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; q?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const { data: rawClients } = await supabase
        .from("clients")
        .select(
            "id, company_name, contact_name, contact_email, contact_phone, is_active, user_id, raw_onboarding_text, plan_id, created_at, plans(name)"
        )
        .order("created_at", { ascending: false });

    const clients = (rawClients as unknown as ClientRow[]) || [];

    // Buscar eventos de lead_submit para calcular "temperatura" (submissões repetidas)
    let heatMap: Record<string, number> = {};
    try {
        const { data: leadEvents } = await supabase
            .from("funnel_events")
            .select("metadata")
            .eq("event_type", "lead_submit");

        if (leadEvents) {
            leadEvents.forEach((ev: { metadata: Record<string, unknown> }) => {
                const email = (ev.metadata?.email as string) || "";
                if (email) {
                    heatMap[email] = (heatMap[email] || 0) + 1;
                }
            });
        }
    } catch {
        // Tabela pode não existir ainda
    }

    // Contadores do funil
    const counts = { lead: 0, onboarding_pendente: 0, ativo: 0, inativo: 0 };
    clients.forEach((c) => {
        const s = inferFunnelStatus(c);
        if (s.label === "Lead") counts.lead++;
        else if (s.label === "Onboarding pendente") counts.onboarding_pendente++;
        else if (s.label === "Ativo") counts.ativo++;
        else counts.inativo++;
    });

    // Filtro por status
    const statusFilter = params.status || "todos";
    const qFilter = (params.q || "").toLowerCase();

    const filtered = clients.filter((c) => {
        const s = inferFunnelStatus(c);
        if (statusFilter !== "todos") {
            const map: Record<string, string> = {
                lead: "Lead",
                onboarding: "Onboarding pendente",
                ativo: "Ativo",
                inativo: "Inativo",
            };
            if (s.label !== map[statusFilter]) return false;
        }
        if (qFilter) {
            const search = `${c.company_name} ${c.contact_name || ""} ${c.contact_email}`.toLowerCase();
            if (!search.includes(qFilter)) return false;
        }
        return true;
    });

    const statusTabs = [
        { key: "todos", label: "Todos", count: clients.length },
        { key: "lead", label: "Leads", count: counts.lead },
        { key: "onboarding", label: "Onboarding", count: counts.onboarding_pendente },
        { key: "ativo", label: "Ativos", count: counts.ativo },
        { key: "inativo", label: "Inativos", count: counts.inativo },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Clientes</h1>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe leads, cadastros e status do funil
                    </p>
                </div>
                <Link
                    href="/admin/clients/new"
                    className={buttonVariants({ className: "gap-2" })}
                >
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Leads captados" value={counts.lead} color="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" />
                <StatCard label="Onboarding pendente" value={counts.onboarding_pendente} color="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" />
                <StatCard label="Clientes ativos" value={counts.ativo} color="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" />
                <StatCard label="Inativos / Churned" value={counts.inativo} color="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" />
            </div>

            {/* Tabs de filtro */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {statusTabs.map((tab) => (
                    <Link
                        key={tab.key}
                        href={`/admin/clients?status=${tab.key}${qFilter ? `&q=${qFilter}` : ""}`}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${statusFilter === tab.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 hover:bg-muted border-transparent"
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </Link>
                ))}
                {/* Busca */}
                <form className="ml-auto flex items-center gap-2">
                    <input type="hidden" name="status" value={statusFilter} />
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            name="q"
                            defaultValue={qFilter}
                            placeholder="Buscar empresa ou contato..."
                            className="h-9 pl-8 pr-3 rounded-lg border border-input bg-transparent text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 w-56"
                        />
                    </div>
                </form>
            </div>

            {/* Tabela */}
            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Empresa</th>
                                <th className="p-4 font-medium text-muted-foreground">Contato</th>
                                <th className="p-4 font-medium text-muted-foreground">Email</th>
                                <th className="p-4 font-medium text-muted-foreground">WhatsApp</th>
                                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                <th className="p-4 font-medium text-muted-foreground">Funil</th>
                                <th className="p-4 font-medium text-muted-foreground">Interesse</th>
                                <th className="p-4 font-medium text-muted-foreground">Criado em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.map((client) => {
                                    const funnel = inferFunnelStatus(client);
                                    return (
                                        <tr key={client.id} className="border-b border-border last:border-none hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-medium">
                                                <Link href={`/admin/clients/${client.id}`} className="text-primary hover:underline">
                                                    {client.company_name}
                                                </Link>
                                            </td>
                                            <td className="p-4">{client.contact_name || "—"}</td>
                                            <td className="p-4 text-muted-foreground text-xs">
                                                <a href={`mailto:${client.contact_email}`} className="hover:text-foreground">
                                                    {client.contact_email}
                                                </a>
                                            </td>
                                            <td className="p-4 text-muted-foreground text-xs">
                                                {client.contact_phone ? (
                                                    <a
                                                        href={`https://wa.me/55${client.contact_phone.replace(/\D/g, "")}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-foreground text-green-600"
                                                    >
                                                        {client.contact_phone}
                                                    </a>
                                                ) : "—"}
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="secondary">
                                                    {client.plans?.name || "Sem plano"}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant={funnel.color}>
                                                    {funnel.label}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                {(() => {
                                                    const heat = heatMap[client.contact_email] || 0;
                                                    if (heat >= 3) return <span title={`${heat} submissões`} className="text-sm">🔥🔥🔥 <span className="text-xs text-orange-600 font-medium">{heat}x</span></span>;
                                                    if (heat === 2) return <span title="2 submissões" className="text-sm">🔥🔥 <span className="text-xs text-orange-500">{heat}x</span></span>;
                                                    if (heat === 1) return <span title="1 submissão" className="text-sm text-muted-foreground">1x</span>;
                                                    return <span className="text-muted-foreground">—</span>;
                                                })()}
                                            </td>
                                            <td className="p-4 text-muted-foreground text-xs">
                                                {new Date(client.created_at).toLocaleDateString("pt-BR")}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                        {clients.length === 0
                                            ? "Nenhum cliente ou lead cadastrado ainda."
                                            : "Nenhum resultado para os filtros aplicados."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
