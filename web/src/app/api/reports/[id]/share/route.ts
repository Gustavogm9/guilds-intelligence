import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const reportId = params.id;

        // 1. Verifica se o usuário tem acesso ao relatório (owner ou admin)
        const { data: report, error: reportError } = await supabase
            .from("reports")
            .select("id, client_id")
            .eq("id", reportId)
            .single();

        if (reportError || !report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const { data: client } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", user.id)
            .single();

        const isAdmin = profile?.role === "admin";
        if (!isAdmin && client?.id !== report.client_id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 2. Verifica se já existe um token de compartilhamento para este relatório
        const { data: existingShare } = await supabase
            .from("shared_reports")
            .select("token")
            .eq("report_id", reportId)
            .single();

        if (existingShare) {
            return NextResponse.json({ token: existingShare.token });
        }

        // 3. Cria um novo token
        const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16); // Ex: 159c4badbbb8f1a6

        const { data: newShare, error: insertError } = await supabase
            .from("shared_reports")
            .insert({
                report_id: reportId,
                token: token,
                created_by: user.id,
                // expires_at: null -> permanente por padrão, até ser deletado
            })
            .select("token")
            .single();

        if (insertError) {
            console.error("Erro ao criar token de compartilhamento:", insertError);
            return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
        }

        return NextResponse.json({ token: newShare.token });

    } catch (error) {
        console.error("Erro interno na rota de share:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
