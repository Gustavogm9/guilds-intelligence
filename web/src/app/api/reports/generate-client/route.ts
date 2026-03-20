import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { errorJson, queueReportGeneration } from "@/lib/report-generation";

export async function POST() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorJson("Não autorizado", 401);
        }

        const { data: client } = await supabase
            .from("clients")
            .select("id, plan_id, plans(reports_per_month)")
            .eq("user_id", user.id)
            .single();

        if (!client) {
            return errorJson("Cliente não encontrado", 404);
        }

        // Verificar assinatura ativa
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("status, current_period_start")
            .eq("client_id", client.id)
            .in("status", ["active", "trialing", "past_due"])
            .maybeSingle();

        if (!subscription) {
            return errorJson("Assinatura inativa ou não encontrada. Acesse as Configurações para assinar um plano.", 403);
        }

        // Verificar limite de cota do ciclo atual
        const periodStart = subscription.current_period_start 
            ? new Date(subscription.current_period_start).toISOString()
            : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const { count: usedCount } = await supabase
            .from("billing_log")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id)
            .gte("created_at", periodStart);

        const planLimit = Number((client.plans as any)?.reports_per_month) || 0;

        if ((usedCount || 0) >= planLimit) {
            return errorJson("Limite de relatórios do seu ciclo mensal atingido. Faça upgrade do seu plano para gerar mais.", 403);
        }

        const result = await queueReportGeneration(client.id, "admin", supabase, {
            initiatedByUserId: user.id,
            metadata: {
                initiated_via: "client_dashboard",
            },
        });

        if (!result.ok) {
            // If the report was already created but worker failed, still treat as success
            if (result.status === 500 && result.error?.includes("Worker")) {
                return NextResponse.json({
                    success: true,
                    message: "Relatório criado e aguardando processamento",
                });
            }
            return errorJson(result.error, result.status);
        }

        return NextResponse.json({
            success: true,
            report_id: result.reportId,
            message: "Relatório enfileirado para geração",
        });
    } catch (error) {
        console.error("Generate client report error:", error);
        return errorJson("Erro interno", 500);
    }
}
