import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { ReportReadyEmail } from "@/emails/ReportReadyEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
    try {
        // Simple security check for webhook
        const authHeader = req.headers.get("Authorization");
        if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
            console.warn("Unauthorized webhook attempt");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Ensure it's an UPDATE or INSERT
        if (body.type !== "UPDATE" && body.type !== "INSERT") {
            return NextResponse.json({ message: "Ignored event type" });
        }

        const record = body.record;
        const oldRecord = body.old_record;

        // Somente se status alterou para 'done'
        if (record.status !== "done") {
            return NextResponse.json({ message: "Not done, ignoring" });
        }

        if (oldRecord && oldRecord.status === "done") {
            return NextResponse.json({ message: "Already done, ignoring" });
        }

        const supabase = createAdminClient();

        // 1. Encontrar o usuário deste relatório
        const { data: client } = await supabase
            .from("clients")
            .select("user_id, company_name, preferred_language")
            .eq("id", record.client_id)
            .single();

        if (!client || !client.user_id) {
            console.error("Cliente/Usuário não encontrado para o webhook");
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        const language = client.preferred_language || "pt-BR";
        const title = language === "en-US" ? "Report Ready" : "Relatório Pronto";
        const content = language === "en-US" 
            ? `Your intelligence report for ${client.company_name} is finished and available.` 
            : `Seu relatório de inteligência para ${client.company_name} foi finalizado e já está disponível.`;
        const actionUrl = `/dashboard/reports/${record.id}`;

        // 2. Inserir a notificação no In-App
        const { error: notifError } = await supabase
            .from("user_notifications")
            .insert({
                user_id: client.user_id,
                type: "report_done",
                title,
                content,
                action_url: actionUrl,
            });

        if (notifError) {
            console.error("Erro ao inserir notificação:", notifError);
        }

        // 3. Enviar e-mail via Resend
        const { data: user } = await supabase.auth.admin.getUserById(client.user_id);
        const email = user?.user?.email;

        if (email && process.env.RESEND_API_KEY) {
            console.log(`[EMAIL] Disparando para ${email} com link para o relatório id ${record.id}`);
            
            try {
                await resend.emails.send({
                    from: "Guilds Intelligence <reports@myurbanai.com>",
                    to: [email],
                    subject: title,
                    react: (
                        <ReportReadyEmail
                            companyName={client.company_name}
                            reportTitle={title}
                            actionUrl={actionUrl}
                            language={language as "pt-BR" | "en-US"}
                        />
                    ),
                });
            } catch (authErr) {
                console.error("Falha ao enviar e-mail pelo resend:", authErr);
            }
        } else if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY não configurada. Mocking email...");
            console.log(`To: ${email} | Subject: ${title} | Link: ${actionUrl}`);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Erro no webhook de report-done:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
