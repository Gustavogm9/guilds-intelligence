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
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!client) {
            return errorJson("Cliente não encontrado", 404);
        }

        // Check if client already has any report (first free is only for brand new clients)
        const { count: existingReports } = await supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id);

        if (existingReports && existingReports > 0) {
            return errorJson("Primeiro relatório grátis já utilizado", 409);
        }

        const result = await queueReportGeneration(client.id, "admin", supabase, {
            initiatedByUserId: user.id,
            skipQuotaCheck: true,
            metadata: {
                initiated_via: "first_free_report",
                is_first_free_report: true,
            },
        });

        if (!result.ok) {
            // If the report was already created but worker failed, still treat as success
            if (result.status === 500 && result.error?.includes("Worker")) {
                return NextResponse.json({
                    success: true,
                    message: "Primeiro relatório grátis criado e aguardando processamento",
                });
            }
            return errorJson(result.error, result.status);
        }

        return NextResponse.json({
            success: true,
            report_id: result.reportId,
            message: "Primeiro relatório grátis enfileirado para geração",
        });
    } catch (error) {
        console.error("Generate first free report error:", error);
        return errorJson("Erro interno", 500);
    }
}
