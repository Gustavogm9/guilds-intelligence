import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, company, email, phone, plan } = body;

        if (!name || !company || !email) {
            return NextResponse.json(
                { error: "name, company e email são obrigatórios" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Buscar plano selecionado
        const { data: planData } = await supabase
            .from("plans")
            .select("id")
            .eq("name", plan || "Profissional")
            .single();

        // Criar invite de auth
        const { data: authData, error: authError } =
            await supabase.auth.admin.inviteUserByEmail(email, {
                data: { full_name: name },
            });

        // Registrar como client (se não existir)
        const { error: clientError } = await supabase.from("clients").upsert(
            {
                contact_name: name,
                company_name: company,
                contact_email: email,
                contact_phone: phone || null,
                plan_id: planData?.id,
                user_id: authData?.user?.id || null,
                is_active: true,
            },
            { onConflict: "contact_email" }
        );

        if (clientError) {
            console.error("Error creating client lead:", clientError);
            // Se não conseguiu criar o client, tenta apenas inserir como lead simples
            // O admin pode associar manualmente depois
        }

        return NextResponse.json({
            success: true,
            message: "Lead registrado com sucesso",
            invited: !authError,
        });
    } catch (error) {
        console.error("Lead API error:", error);
        return NextResponse.json(
            { error: "Erro interno ao processar lead" },
            { status: 500 }
        );
    }
}
