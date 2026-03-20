import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Precisamos do Service Role Key para ignorar RLS e atualizar a tabela
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
    if (!webhookSecret) {
        return new Response("Webhook secret not configured.", { status: 400 });
    }

    const payload = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode === "subscription") {
                    const clientId = session.metadata?.client_id;
                    const planId = session.metadata?.plan_id;
                    const stripeCustomerId = session.customer as string;
                    const stripeSubscriptionId = session.subscription as string;

                    if (!clientId || !planId) break;

                    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any;

                    await supabaseAdmin.from("subscriptions").upsert(
                        {
                            client_id: clientId,
                            stripe_customer_id: stripeCustomerId,
                            stripe_subscription_id: stripeSubscriptionId,
                            plan_id: planId,
                            status: subscription.status,
                            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            cancel_at_period_end: subscription.cancel_at_period_end,
                            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
                            updated_at: new Date().toISOString()
                        },
                        { onConflict: "stripe_subscription_id" }
                    );

                    // Atualiza o client com o novo plan_id ativo principal
                    await supabaseAdmin.from("clients").update({ plan_id: planId }).eq("id", clientId);
                }
                break;
            }

            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
                const subscription = event.data.object as any;
                const stripeSubscriptionId = subscription.id;

                // Aqui nos não temos metadata garantida no objeto subscription, a menos que tenhamos passado na criação (via session.subscription_data.metadata)
                // Então buscamos qual plan_id esta associado via banco, ou se o price mudar mapearíamos. Porem pelo design, não tem upgrade automático fora do portal.
                // Atualizamos apenas o status e periodos baseados no ID da assinatura.

                const updateData: any = {
                    status: subscription.status,
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
                    updated_at: new Date().toISOString()
                };

                await supabaseAdmin
                    .from("subscriptions")
                    .update(updateData)
                    .eq("stripe_subscription_id", stripeSubscriptionId);
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error("Webhook handler error:", err);
        return new Response("Webhook handler error.", { status: 500 });
    }
}
