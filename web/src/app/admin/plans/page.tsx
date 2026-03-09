import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminPlansPage() {
    const supabase = await createClient();
    const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .order("price_monthly");

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Planos</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie os planos de assinatura
                </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans?.map((plan: Record<string, unknown>) => (
                    <Card key={String(plan.id)} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{String(plan.name)}</h3>
                            <Badge variant={plan.is_active ? "default" : "secondary"}>
                                {plan.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                        </div>
                        <p className="text-3xl font-extrabold mb-1">
                            R$ {(Number(plan.price_monthly) / 100).toFixed(0)}
                            <span className="text-base font-normal text-muted-foreground">/mês</span>
                        </p>
                        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <p>📄 {String(plan.reports_per_month)} relatório(s)/mês</p>
                            <p>📦 Formatos: {String(plan.formats)}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
