import { redirect } from "next/navigation";
import { CheckCircle2, CreditCard, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BillingPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/sign-in");
    }

    // Buscar o client
    const { data: client } = await supabase
        .from("clients")
        .select("id, plan_id")
        .eq("user_id", user.id)
        .single();

    if (!client) {
        return <div>Erro ao carregar cliente.</div>;
    }

    // Buscar as informacoes de assinatura
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*, plans(name, price_monthly, reports_per_month)")
        .eq("client_id", client.id)
        .in("status", ["active", "trialing", "past_due"])
        .single();

    // Se nao tiver assinatura (ou cancelada), busca todos os planos ativos para exibicao
    const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

    const activeSubscription = subscription?.status === "active" || subscription?.status === "trialing";

    return (
        <div className="space-y-8">
            {activeSubscription && subscription ? (
                <div className="space-y-6">
                    <Card className="border-primary/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center justify-between">
                                <span>Meu Plano Atual: {subscription.plans?.name || "Premium"}</span>
                                <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>
                            </CardTitle>
                            <CardDescription>
                                Voc&ecirc; tem uma assinatura ativa com limite de {subscription.plans?.reports_per_month || "?"} relat&oacute;rios por m&ecirc;s.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground mb-1">Status</p>
                                    <p className="font-medium capitalize">{subscription.status}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground mb-1">Pr&oacute;xima cobran&ccedil;a</p>
                                    <p className="font-medium">
                                        {subscription.current_period_end
                                            ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            {/* O botao de gerenciar redirecionara para a API do portal */}
                            <form action="/api/checkout/portal" method="POST" className="w-full">
                                <input type="hidden" name="client_id" value={client.id} />
                                <Button type="submit" variant="outline" className="w-full gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Gerenciar Assinatura
                                </Button>
                            </form>
                        </CardFooter>
                    </Card>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
                        <h2 className="text-2xl font-bold">Escolha seu plano</h2>
                        <p className="text-muted-foreground">
                            Escale a intelig&ecirc;ncia da sua ag&ecirc;ncia com relat&oacute;rios gerados automaticamente.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {plans?.map((plan) => (
                            <Card key={plan.id} className={`relative flex flex-col ${plan.price_monthly > 10000 ? "border-primary shadow-md" : ""}`}>
                                {plan.price_monthly > 10000 && (
                                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        Mais Popular
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <CardDescription>Para tr&aacute;fego cont&iacute;nuo</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="mb-6">
                                        <span className="text-3xl font-bold">R$ {(plan.price_monthly / 100).toFixed(0)}</span>
                                        <span className="text-muted-foreground">/m&ecirc;s</span>
                                    </div>

                                    <ul className="space-y-3 text-sm">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                                            <span>At&eacute; <strong>{plan.reports_per_month} relat&oacute;rios</strong> intelig&ecirc;ntes/m&ecirc;s</span>
                                        </li>
                                        {Array.isArray(plan.formats) && plan.formats.map((format: string) => (
                                            <li key={format} className="flex items-start gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                                                <span>Fomato: {format}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <form action="/api/checkout" method="POST" className="w-full">
                                        <input type="hidden" name="plan_id" value={plan.id} />
                                        <input type="hidden" name="client_id" value={client.id} />
                                        <Button type="submit" className="w-full" variant={plan.price_monthly > 10000 ? "default" : "outline"}>
                                            Assinar {plan.name}
                                        </Button>
                                    </form>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
