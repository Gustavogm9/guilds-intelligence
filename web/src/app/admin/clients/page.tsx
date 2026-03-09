import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminClientsPage() {
    const supabase = await createClient();
    const { data: clients } = await supabase
        .from("clients")
        .select("id, company_name, contact_name, is_active, plan_id, created_at, plans(name)")
        .order("created_at", { ascending: false });

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Clientes</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie os clientes da plataforma
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

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Empresa</th>
                                <th className="p-4 font-medium text-muted-foreground">Contato</th>
                                <th className="p-4 font-medium text-muted-foreground">Plano</th>
                                <th className="p-4 font-medium text-muted-foreground">Status</th>
                                <th className="p-4 font-medium text-muted-foreground">Criado em</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients && clients.length > 0 ? (
                                clients.map((client: Record<string, unknown>) => (
                                    <tr key={String(client.id)} className="border-b border-border last:border-none hover:bg-muted/30 transition-colors">
                                        <td className="p-4 font-medium">
                                            <Link href={`/admin/clients/${client.id}`} className="text-primary hover:underline">
                                                {String(client.company_name)}
                                            </Link>
                                        </td>
                                        <td className="p-4">{String(client.contact_name || "—")}</td>
                                        <td className="p-4">
                                            <Badge variant="secondary">
                                                {(client.plans as Record<string, unknown>)?.name as string || "Sem plano"}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={client.is_active ? "default" : "secondary"}>
                                                {client.is_active ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {new Date(String(client.created_at)).toLocaleDateString("pt-BR")}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        Nenhum cliente cadastrado ainda.
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
