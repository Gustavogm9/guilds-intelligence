import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { errorJson, queueReportGeneration } from "@/lib/report-generation";

/**
 * POST /api/reports/generate-on-demand
 * Allows a logged-in client to generate a report for themselves.
 * Respects quota checks (unlike generate-first-free which skips them).
 */
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

        const result = await queueReportGeneration(client.id, "admin", supabase, {
            initiatedByUserId: user.id,
            metadata: {
                initiated_via: "client_on_demand",
            },
        });

        if (!result.ok) {
            return errorJson(result.error, result.status);
        }

        return NextResponse.json({
            success: true,
            report_id: result.reportId,
            message: "Relatório enfileirado para geração",
        });
    } catch (error) {
        console.error("Generate on-demand report error:", error);
        return errorJson("Erro interno", 500);
    }
}
