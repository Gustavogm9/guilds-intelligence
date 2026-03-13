import { createClient } from "@/lib/supabase/server";
import { errorJson, retryExistingReport } from "@/lib/report-generation";

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
        let reportId = "";

        if (contentType.includes("application/json")) {
            const body = (await request.json()) as { report_id?: string };
            reportId = String(body.report_id || "");
        } else {
            const formData = await request.formData();
            reportId = String(formData.get("report_id") || "");
        }

        if (!reportId) {
            return errorJson("report_id e obrigatorio", 400);
        }

        const result = await retryExistingReport(reportId, undefined, {
            initiatedByUserId: user.id,
            metadata: {
                initiated_via: "admin_retry_api",
            },
        });
        if (!result.ok) {
            return errorJson(result.error, result.status);
        }

        return Response.redirect(new URL("/admin/reports?retry=success", request.url), 303);
    } catch (error) {
        console.error("Retry report error:", error);
        return errorJson("Erro interno", 500);
    }
}
