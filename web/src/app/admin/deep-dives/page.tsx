import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";

type DeepDiveRow = {
    id: string;
    topic: string;
    context: string | null;
    status: string;
    created_at: string;
    responded_at: string | null;
    admin_notes: string | null;
    clients: { company_name?: string | null } | { company_name?: string | null }[] | null;
    reports: { title?: string | null } | { title?: string | null }[] | null;
};

function getClientName(item: DeepDiveRow) {
    const client = Array.isArray(item.clients) ? item.clients[0] : item.clients;
    return client?.company_name || "Cliente";
}

function getReportTitle(item: DeepDiveRow) {
    const report = Array.isArray(item.reports) ? item.reports[0] : item.reports;
    return report?.title || null;
}

function statusVariant(status: string) {
    if (status === "delivered") return "default";
    if (status === "cancelled") return "destructive";
    return "secondary";
}

async function updateDeepDiveAction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const deepDiveId = String(formData.get("deep_dive_id") || "").trim();
    const status = String(formData.get("status") || "").trim();
    const adminNotes = String(formData.get("admin_notes") || "").trim();

    if (!deepDiveId || !status) {
        redirect("/admin/deep-dives?error=Dados%20inválidos");
    }

    const payload = {
        status,
        admin_notes: adminNotes || null,
        responded_at: status === "delivered" ? new Date().toISOString() : null,
    };

    const { error } = await supabase
        .from("deep_dive_requests")
        .update(payload)
        .eq("id", deepDiveId);

    if (error) {
        redirect(`/admin/deep-dives?error=${encodeURIComponent(error.message || "Não foi possível atualizar o deep dive.")}`);
    }

    revalidatePath("/admin/deep-dives");
    revalidatePath("/dashboard/deep-dive");
    redirect("/admin/deep-dives?saved=1");
}

export default async function AdminDeepDivesPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string; error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const { data } = await supabase
        .from("deep_dive_requests")
        .select("id, topic, context, status, created_at, responded_at, admin_notes, clients(company_name), reports:reference_report_id(title)")
        .order("created_at", { ascending: false });

    const items = (data as DeepDiveRow[] | null) || [];
    const summary = items.reduce(
        (acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Deep Dives</h1>
                <p className="text-muted-foreground mt-1">
                    Fila operacional de aprofundamentos solicitados pelos clientes.
                </p>
            </div>

            {params.saved ? (
                <Card className="p-4 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">Deep dive atualizado com sucesso.</p>
                </Card>
            ) : null}

            {params.error ? (
                <Card className="p-4 border-red-200 bg-red-50 text-red-700">
                    <p className="text-sm font-medium">{params.error}</p>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold mt-2">{items.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold mt-2">{summary.pending || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Em andamento</p>
                    <p className="text-2xl font-bold mt-2">{summary.in_progress || 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Entregues</p>
                    <p className="text-2xl font-bold mt-2">{summary.delivered || 0}</p>
                </Card>
            </div>

            {items.length > 0 ? (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <Card key={item.id} className="p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2 max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <p className="font-medium">{item.topic}</p>
                                        <Badge variant={statusVariant(item.status)}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {getClientName(item)} • {new Date(item.created_at).toLocaleDateString("pt-BR")}
                                    </p>
                                    {getReportTitle(item) ? (
                                        <p className="text-sm text-muted-foreground">
                                            Relatorio de referencia: {getReportTitle(item)}
                                        </p>
                                    ) : null}
                                    {item.context ? (
                                        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                                            {item.context}
                                        </div>
                                    ) : null}
                                </div>

                                <form action={updateDeepDiveAction} className="grid gap-3 lg:w-[360px]">
                                    <input type="hidden" name="deep_dive_id" value={item.id} />

                                    <div className="space-y-2">
                                        <Label htmlFor={`status-${item.id}`}>Status</Label>
                                        <select
                                            id={`status-${item.id}`}
                                            name="status"
                                            defaultValue={item.status}
                                            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="in_progress">Em andamento</option>
                                            <option value="delivered">Entregue</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor={`notes-${item.id}`}>Resposta / notas admin</Label>
                                        <Textarea
                                            id={`notes-${item.id}`}
                                            name="admin_notes"
                                            defaultValue={item.admin_notes || ""}
                                            placeholder="Registre a resposta, próximos passos ou entregue o resumo do deep dive."
                                            rows={5}
                                        />
                                    </div>

                                    {item.responded_at ? (
                                        <p className="text-xs text-muted-foreground">
                                            Respondido em {new Date(item.responded_at).toLocaleDateString("pt-BR")}
                                        </p>
                                    ) : null}

                                    <div className="flex justify-end">
                                        <button type="submit" className={buttonVariants({})}>
                                            Salvar deep dive
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                        Nenhuma solicitação de deep dive registrada ainda.
                    </p>
                </Card>
            )}
        </div>
    );
}
