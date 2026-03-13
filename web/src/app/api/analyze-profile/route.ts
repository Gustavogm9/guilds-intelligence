import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Load client data
        const { data: client } = await supabase
            .from("clients")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (!client) {
            return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
        }

        const workerUrl = process.env.PYTHON_WORKER_URL;
        const workerSecret = process.env.PYTHON_WORKER_SECRET;

        const payload = {
            client_id: client.id,
            company_name: client.company_name || "",
            industry: client.industry || "",
            products_services: client.products_services || "",
            target_audience: client.target_audience || "",
            goals: client.goals_2026 || [],
            pain_points: client.pain_points || [],
            raw_text: client.raw_onboarding_text || "",
            preferred_language: client.preferred_language || "pt-BR",
            website_url: client.website_url || "",
            social_media_urls: client.social_media_urls || [],
        };

        // Try calling the Python worker
        if (workerUrl && workerSecret) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(`${workerUrl.replace(/\/$/, "")}/analyze-niches`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-worker-secret": workerSecret,
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                clearTimeout(timeout);

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json(data);
                }
            } catch {
                // Worker unavailable, fall through to heuristic
            }
        }

        // Heuristic fallback (no worker)
        const niches: { name: string; relevance: string; reasoning: string }[] = [];

        if (client.industry) {
            const parts = client.industry.split(/[,;/|]+/).map((s: string) => s.trim()).filter(Boolean);
            for (const part of parts) {
                if (part.length >= 2) {
                    niches.push({
                        name: part,
                        relevance: niches.length < 2 ? "primary" : "secondary",
                        reasoning: "Setor principal do cliente",
                    });
                }
            }
        }

        if (client.target_audience) {
            const parts = client.target_audience.split(/[,;/|]+/).map((s: string) => s.trim()).filter(Boolean);
            for (const part of parts.slice(0, 3)) {
                if (part.length >= 3 && !niches.some(n => n.name === part)) {
                    niches.push({
                        name: part,
                        relevance: "secondary",
                        reasoning: "Público-alvo do cliente",
                    });
                }
            }
        }

        const alwaysInclude = ["Brasil", "Startups", "IA"];
        for (const n of alwaysInclude) {
            if (!niches.some(existing => existing.name === n)) {
                niches.push({ name: n, relevance: "secondary", reasoning: "Contexto macro relevante" });
            }
        }

        return NextResponse.json({
            niches: niches.slice(0, 7),
            source: "heuristic",
            count: Math.min(niches.length, 7),
        });
    } catch (error) {
        console.error("Analyze profile error:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
