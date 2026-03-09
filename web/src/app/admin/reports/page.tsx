import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminReportsPage() {
    const supabase = await createClient();
    const { data: reports } = await supabase
        .from("reports")
        .select("id, title, status, created_at, clients(company_name), plans(name)")
        .order("created_at", { ascending: false });

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Relatórios</h1>
                <p className="text-muted-foreground mt-1">
                    Todos os relatórios gerados
                </p>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left">
                                <th className="p-4 font-medium text-muted-foreground">Cliente</th>
                                <th className="p-4 font-medium text-muted-foreground">Título</th>
                                <th className="p-4 font-medium text-muted-foreground">Status</th>
                                <th className="p-4 font-medium text-muted-foreground">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports && reports.length > 0 ? (
                                reports.map((report: Record<string, unknown>) => (
                                    <tr key={String(report.id)} className="border-b border-border last:border-none hover:bg-muted/30">
                                        <td className="p-4 font-medium">
                                            {(report.clients as Record<string, unknown>)?.company_name as string || "—"}
                                        </td>
                                        <td className="p-4">{String(report.title || "Sem título")}</td>
                                        <td className="p-4">
                                            <Badge variant={report.status === "done" ? "default" : "secondary"}>
                                                {String(report.status)}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {new Date(String(report.created_at)).toLocaleDateString("pt-BR")}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        Nenhum relatório gerado. Cadastre um cliente e gere o primeiro.
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
