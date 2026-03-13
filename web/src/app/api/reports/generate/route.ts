import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { errorJson, queueReportGeneration } from "@/lib/report-generation";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return errorJson("Nao autorizado", 401);
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return errorJson("Apenas admin", 403);
        }

        const contentType = request.headers.get("content-type") || "";
        let clientId = "";

        if (contentType.includes("application/json")) {
            const body = (await request.json()) as { client_id?: string };
            clientId = String(body.client_id || "");
        } else if (
            contentType.includes("application/x-www-form-urlencoded") ||
            contentType.includes("multipart/form-data")
        ) {
            const formData = await request.formData();
            clientId = String(formData.get("client_id") || "");
        }

        if (!clientId) {
            return errorJson("client_id e obrigatorio", 400);
        }

        const result = await queueReportGeneration(clientId, "admin", undefined, {
            initiatedByUserId: user.id,
            metadata: {
                initiated_via: "admin_api",
            },
        });
        if (!result.ok) {
            return errorJson(result.error, result.status);
        }

        return NextResponse.json({
            success: true,
            report_id: result.reportId,
            message: "Relatorio enfileirado para geracao",
        });
    } catch (error) {
        console.error("Generate report error:", error);
        return errorJson("Erro interno", 500);
    }
}
