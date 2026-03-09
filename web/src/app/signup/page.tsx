"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/tracking";

const plans = [
    { value: "essencial", name: "Essencial", detail: "1 relatório por mês", price: "R$247/mês" },
    { value: "crescimento", name: "Crescimento", detail: "2 relatórios por mês", price: "R$497/mês" },
    { value: "profissional", name: "Profissional", detail: "4 relatórios por mês", price: "R$827/mês" },
    { value: "studio", name: "Studio", detail: "12 relatórios por mês", price: "R$1.797/mês" },
    { value: "enterprise", name: "Enterprise", detail: "~22 relatórios por mês", price: "R$3.497/mês" },
];

export default function SignupPage() {
    const searchParams = useSearchParams();
    const defaultPlan = searchParams.get("plan") || "profissional";
    const defaultEmail = searchParams.get("email") || "";
    const defaultName = searchParams.get("name") || "";

    const [name, setName] = useState(defaultName);
    const [email, setEmail] = useState(defaultEmail);
    const [password, setPassword] = useState("");
    const [plan, setPlan] = useState(defaultPlan);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    // Atualiza os campos se os query params mudarem (ex: navegação SPA)
    useEffect(() => {
        if (defaultName && !name) setName(defaultName);
        if (defaultEmail && !email) setEmail(defaultEmail);
        if (defaultPlan) setPlan(defaultPlan);
    }, [defaultName, defaultEmail, defaultPlan]);

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    plan_interest: plan,
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        trackEvent("signup_complete", { plan, email });
        setSuccess(true);
        setLoading(false);
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
                <Card className="w-full max-w-sm p-8 text-center">
                    <h2 className="text-2xl font-bold mb-4">📧 Verifique seu email</h2>
                    <p className="text-muted-foreground text-sm">
                        Enviamos um link de confirmação para <strong>{email}</strong>.
                        Clique no link para ativar sua conta e começar o onboarding.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <Card className="w-full max-w-sm p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-extrabold">
                        <span className="text-primary">Guilds</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        Crie sua conta e receba seu primeiro relatório grátis
                    </p>
                </div>

                <form onSubmit={handleSignup} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="signup-name">Seu nome</Label>
                        <Input
                            id="signup-name"
                            placeholder="Gustavo Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="signup-email">Email corporativo</Label>
                        <Input
                            id="signup-email"
                            type="email"
                            placeholder="gustavo@empresa.com.br"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="signup-password">Senha</Label>
                        <Input
                            id="signup-password"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="signup-plan">Plano de interesse</Label>
                        <select
                            id="signup-plan"
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="flex h-10 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                        >
                            {plans.map((p) => (
                                <option key={p.value} value={p.value}>
                                    {p.name} — {p.detail} ({p.price})
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}

                    <Button type="submit" className="w-full mt-2" disabled={loading}>
                        {loading ? "Criando conta..." : "Criar conta grátis"}
                    </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-6">
                    Já tem conta?{" "}
                    <a href="/login" className="text-primary underline">
                        Entrar
                    </a>
                </p>
            </Card>
        </div>
    );
}
