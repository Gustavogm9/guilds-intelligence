import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const planId = formData.get("plan_id") as string;
        const clientId = formData.get("client_id") as string;

        if (!planId || !clientId) {
            return NextResponse.json({ error: "Missing plan_id or client_id" }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Validar se o plano e o cliente existem
        const [{ data: plan }, { data: client }] = await Promise.all([
            supabase.from("plans").select("*").eq("id", planId).single(),
            supabase.from("clients").select("*").eq("id", clientId).single()
        ]);

        if (!plan || !client) {
            return NextResponse.json({ error: "Invalid plan or client" }, { status: 404 });
        }

        // 2. Procurar se ja tem um customer_id na tabela subscriptions
        let stripeCustomerId: string | undefined = undefined;
        const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("client_id", clientId)
            .maybeSingle();

        if (existingSub?.stripe_customer_id) {
            stripeCustomerId = existingSub.stripe_customer_id;
        } else {
            // Cria um novo customer na Stripe
            const newCustomer = await stripe.customers.create({
                email: client.contact_email || undefined,
                name: client.company_name,
                metadata: {
                    client_id: client.id,
                }
            });
            stripeCustomerId = newCustomer.id;
        }

        // 3. Criar a sessão de checkout
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "brl",
                        product_data: {
                            name: plan.name,
                            description: `Até ${plan.reports_per_month} relatórios por mês`,
                        },
                        unit_amount: plan.price_monthly,
                        recurring: {
                            interval: "month",
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                client_id: client.id,
                plan_id: plan.id,
            },
            success_url: `${appUrl}/dashboard/settings/billing?success=true`,
            cancel_url: `${appUrl}/dashboard/settings/billing?canceled=true`,
        });

        if (!session.url) {
            return NextResponse.json({ error: "Failed to create Stripe Checkout session" }, { status: 500 });
        }

        const response = NextResponse.redirect(session.url, 303);
        response.headers.set("Cache-Control", "no-store, max-age=0");
        return response;

    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
