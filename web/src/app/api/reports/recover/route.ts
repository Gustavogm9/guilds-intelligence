import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorJson, recoverFailedReports } from "@/lib/report-generation";
import { sendOperationalNotification } from "@/lib/ops-alerts";

function getSchedulerSecret() {
    return process.env.REPORT_SCHEDULER_SECRET || process.env.PYTHON_WORKER_SECRET || "";
}

export async function POST(request: Request) {
    try {
        const schedulerSecret = request.headers.get("x-scheduler-secret");
        const expectedSecret = getSchedulerSecret();

        if (expectedSecret && schedulerSecret === expectedSecret) {
            const supabase = createAdminClient();
            const result = await recoverFailedReports("auto", supabase);
            if (!result.ok) {
                return errorJson(result.error, result.status);
            }

            const retried = result.results.filter((item) => item.status === "retried").length;
            const skipped = result.results.filter((item) => item.status === "skipped").length;
            const errors = result.results.filter((item) => item.status === "error").length;

            await sendOperationalNotification({
                title: "Recover automatico executado",
                message: "A rotina automatica de recuperacao foi executada.",
                severity: errors > 0 ? "warning" : "info",
                category: errors > 0 ? "worker_unavailable" : "unknown",
                metadata: {
                    mode: "auto",
                    retried,
                    skipped,
                    errors,
                },
            });

            return Response.json({
                success: true,
                retried,
                skipped,
                errors,
                results: result.results,
            });
        }

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

        const adminSupabase = createAdminClient();
        const result = await recoverFailedReports("manual", adminSupabase);
        if (!result.ok) {
            return errorJson(result.error, result.status);
        }

        const retried = result.results.filter((item) => item.status === "retried").length;
        const skipped = result.results.filter((item) => item.status === "skipped").length;
        const errors = result.results.filter((item) => item.status === "error").length;

        await sendOperationalNotification({
            title: "Recover manual executado",
            message: "Um admin executou a rotina de recuperacao de relatorios.",
            severity: errors > 0 ? "warning" : "info",
            category: errors > 0 ? "worker_unavailable" : "unknown",
            metadata: {
                mode: "manual",
                retried,
                skipped,
                errors,
                actor_user_id: user.id,
            },
        });

        return Response.redirect(new URL("/admin/ops?recover=success", request.url), 303);
    } catch (error) {
        console.error("Recover reports error:", error);
        return errorJson("Erro interno", 500);
    }
}
