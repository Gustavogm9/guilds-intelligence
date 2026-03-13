import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { errorJson, queueReportGeneration } from "@/lib/report-generation";

/**
 * POST /api/reports/regenerate-free
 * Permite ao cliente regerar um relatório que usou fallback RSS (Motor Global falhou).
 * Isenta a cota de relatórios mensais — o cliente não é cobrado pela regeração.
 *
 * Body: { report_id: string }
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorJson("Não autorizado", 401);
        }

        const body = await request.json();
        const reportId = body?.report_id;

        if (!reportId || typeof reportId !== "string") {
            return errorJson("report_id é obrigatório", 400);
        }

        // Verificar se o relatório existe e tem a flag de regeração gratuita
        const { data: report } = await supabase
            .from("reports")
            .select("id, client_id, is_free_regeneration_available, status")
            .eq("id", reportId)
            .single();

        if (!report) {
            return errorJson("Relatório não encontrado", 404);
        }

        if (!report.is_free_regeneration_available) {
            return errorJson(
                "Este relatório não está elegível para regeração gratuita",
                403
            );
        }

        // Verificar permissão: admin pode regerar qualquer relatório,
        // cliente só pode regerar os seus
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const isAdmin = profile?.role === "admin";

        if (!isAdmin) {
            const { data: client } = await supabase
                .from("clients")
                .select("id")
                .eq("id", report.client_id)
                .eq("user_id", user.id)
                .single();

            if (!client) {
                return errorJson(
                    "Sem permissão para regerar este relatório",
                    403
                );
            }
        }

        // Marcar o relatório antigo como substituído (para evitar dupla regeração)
        await supabase
            .from("reports")
            .update({ is_free_regeneration_available: false })
            .eq("id", reportId);

        // Gerar novo relatório sem cobrar cota
        const result = await queueReportGeneration(
            report.client_id,
            "admin",
            supabase,
            {
                initiatedByUserId: user.id,
                skipQuotaCheck: true,
                metadata: {
                    initiated_via: "free_regeneration",
                    original_report_id: reportId,
                },
            }
        );

        if (!result.ok) {
            // Reverter a flag se falhou ao enfileirar
            await supabase
                .from("reports")
                .update({ is_free_regeneration_available: true })
                .eq("id", reportId);

            return errorJson(result.error, result.status);
        }

        return NextResponse.json({
            success: true,
            report_id: result.reportId,
            message:
                "Relatório regerado com sucesso (sem custo). O novo relatório será processado em breve.",
        });
    } catch (error) {
        console.error("Regenerate free report error:", error);
        return errorJson("Erro interno", 500);
    }
}
