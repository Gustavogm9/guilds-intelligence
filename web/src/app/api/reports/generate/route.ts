import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Verificar se é admin
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Apenas admin" }, { status: 403 });
        }

        const body = await request.json();
        const { client_id } = body;

        if (!client_id) {
            return NextResponse.json(
                { error: "client_id é obrigatório" },
                { status: 400 }
            );
        }

        // Verificar cliente e plano
        const { data: client } = await supabase
            .from("clients")
            .select("*, plans(reports_per_month, formats)")
            .eq("id", client_id)
            .single();

        if (!client) {
            return NextResponse.json(
                { error: "Cliente não encontrado" },
                { status: 404 }
            );
        }

        // Verificar limite de relatórios no mês
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count } = await supabase
            .from("billing_log")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client_id)
            .gte("created_at", startOfMonth.toISOString());

        const plan = client.plans as Record<string, unknown>;
        const limit = Number(plan?.reports_per_month) || 0;

        if (count !== null && count >= limit) {
            return NextResponse.json(
                {
                    error: `Limite de ${limit} relatórios/mês atingido (${count} gerados)`,
                },
                { status: 429 }
            );
        }

        // Criar relatório com status queued
        const { data: report, error: reportError } = await supabase
            .from("reports")
            .insert({
                client_id,
                title: `Relatório de Inteligência — ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
                status: "queued",
            })
            .select("id")
            .single();

        if (reportError) {
            console.error("Error creating report:", reportError);
            return NextResponse.json(
                { error: "Erro ao criar relatório" },
                { status: 500 }
            );
        }

        // Registrar no billing log
        await supabase.from("billing_log").insert({
            client_id,
            report_id: report.id,
            plan_id: client.plan_id,
            billing_month: startOfMonth.toISOString().split("T")[0],
            event_type: "report_generated",
            plan_name: String((client.plans as Record<string, unknown>)?.name || ""),
            plan_price: Number((client.plans as Record<string, unknown>)?.price_monthly || 0),
        });

        // TODO: Chamar Python worker via webhook
        // Por enquanto, retorna o relatório criado
        // O worker deve atualizar o status para "processing" e depois "done"

        return NextResponse.json({
            success: true,
            report_id: report.id,
            message: "Relatório enfileirado para geração",
        });
    } catch (error) {
        console.error("Generate report error:", error);
        return NextResponse.json(
            { error: "Erro interno" },
            { status: 500 }
        );
    }
}
