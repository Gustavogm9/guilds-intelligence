import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const planNameByValue: Record<string, string> = {
    essencial: "Essencial",
    crescimento: "Crescimento",
    profissional: "Profissional",
    studio: "Studio",
    enterprise: "Enterprise",
};

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
        const normalizedPlan = planNameByValue[String(plan || "").toLowerCase()] || "Profissional";

        // Buscar plano selecionado
        const { data: planData } = await supabase
            .from("plans")
            .select("id")
            .eq("name", normalizedPlan)
            .single();

        // Registrar como client (se não existir)
        const { error: clientError } = await supabase.from("clients").upsert(
            {
                contact_name: name,
                company_name: company,
                contact_email: email,
                contact_phone: phone || null,
                plan_id: planData?.id,
                is_active: true,
            },
            { onConflict: "contact_email" }
        );

        if (clientError) {
            console.error("Error creating client lead:", clientError);
        }

        return NextResponse.json({
            success: true,
            message: "Lead registrado com sucesso",
        });
    } catch (error) {
        console.error("Lead API error:", error);
        return NextResponse.json(
            { error: "Erro interno ao processar lead" },
            { status: 500 }
        );
    }
}
