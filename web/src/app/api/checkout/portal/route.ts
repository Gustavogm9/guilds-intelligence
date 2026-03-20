import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2023-10-16" as any,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const clientId = formData.get("client_id") as string;

        if (!clientId) {
            return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
        }

        const supabase = await createClient();

        // Verifica a assinatura
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("client_id", clientId)
            .single();

        if (!subscription || !subscription.stripe_customer_id) {
            return NextResponse.json({ error: "Customer not found on stripe" }, { status: 404 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Cria a sessão no Customer Portal
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: `${appUrl}/dashboard/settings/billing`,
        });

        if (!session.url) {
            return NextResponse.json({ error: "Failed to create Stripe portal session" }, { status: 500 });
        }

        const response = NextResponse.redirect(session.url, 303);
        response.headers.set("Cache-Control", "no-store, max-age=0");
        return response;

    } catch (error: any) {
        console.error("Stripe Portal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
