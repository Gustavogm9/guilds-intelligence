import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function ClientReportsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user!.id)
        .single();

    const { data: reports } = client
        ? await supabase
            .from("reports")
            .select("id, title, status, created_at")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
        : { data: [] };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Meus Relatórios</h1>
                <p className="text-muted-foreground mt-1">
                    Acesse todos os seus relatórios de inteligência
                </p>
            </div>

            {reports && reports.length > 0 ? (
                <div className="grid gap-4">
                    {reports.map((report: Record<string, unknown>) => (
                        <Card key={String(report.id)} className="p-5 flex items-center justify-between">
                            <div>
                                <p className="font-medium">{String(report.title || "Relatório")}</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(String(report.created_at)).toLocaleDateString("pt-BR")}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant={report.status === "done" ? "default" : "secondary"}>
                                    {String(report.status)}
                                </Badge>
                                <Link
                                    href={`/dashboard/reports/${report.id}`}
                                    className={buttonVariants({ variant: "outline", size: "sm" })}
                                >
                                    Ver
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                        Nenhum relatório disponível ainda. Seu primeiro relatório está sendo preparado!
                    </p>
                </Card>
            )}
        </div>
    );
}
