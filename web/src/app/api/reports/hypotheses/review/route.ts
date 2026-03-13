import { createClient } from "@/lib/supabase/server";
import { errorJson } from "@/lib/report-generation";

type ReportHypothesis = {
    title?: string;
    review_required?: boolean;
    review_status?: string;
    review_notes?: string | null;
    reviewed_at?: string | null;
    reviewed_by?: string | null;
};

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
        let hypothesisIndex = -1;
        let reviewStatus = "";
        let reviewNotes = "";

        if (contentType.includes("application/json")) {
            const body = (await request.json()) as {
                report_id?: string;
                hypothesis_index?: number;
                review_status?: string;
                review_notes?: string;
            };
            reportId = String(body.report_id || "");
            hypothesisIndex = Number(body.hypothesis_index ?? -1);
            reviewStatus = String(body.review_status || "");
            reviewNotes = String(body.review_notes || "");
        } else {
            const formData = await request.formData();
            reportId = String(formData.get("report_id") || "");
            hypothesisIndex = Number(formData.get("hypothesis_index") || -1);
            reviewStatus = String(formData.get("review_status") || "");
            reviewNotes = String(formData.get("review_notes") || "");
        }

        if (!reportId || hypothesisIndex < 0 || !reviewStatus) {
            return errorJson("Dados obrigatorios ausentes", 400);
        }

        if (!["approved", "flagged", "needs_revision"].includes(reviewStatus)) {
            return errorJson("review_status invalido", 400);
        }

        const { data: report } = await supabase
            .from("reports")
            .select("id, hypotheses")
            .eq("id", reportId)
            .single();

        if (!report) {
            return errorJson("Relatorio nao encontrado", 404);
        }

        const hypotheses = Array.isArray(report.hypotheses)
            ? ([...report.hypotheses] as ReportHypothesis[])
            : [];

        if (!hypotheses[hypothesisIndex]) {
            return errorJson("Hipotese nao encontrada", 404);
        }

        hypotheses[hypothesisIndex] = {
            ...hypotheses[hypothesisIndex],
            review_required: true,
            review_status: reviewStatus,
            review_notes: reviewNotes || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
        };

        const { error } = await supabase
            .from("reports")
            .update({ hypotheses })
            .eq("id", reportId);

        if (error) {
            return errorJson("Nao foi possivel salvar revisao", 500);
        }

        return Response.redirect(new URL(`/dashboard/reports/${reportId}?review=success`, request.url), 303);
    } catch (error) {
        console.error("Hypothesis review error:", error);
        return errorJson("Erro interno", 500);
    }
}
