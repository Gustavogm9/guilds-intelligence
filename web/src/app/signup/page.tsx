"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { AppLocale } from "@/lib/i18n";
import { usePublicLocale } from "@/lib/public-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

function getCopy(locale: AppLocale) {
    if (locale === "en-US") {
        return {
            title: "Create your account and unlock your first report for free",
            successTitle: "Check your email",
            successBody: "We sent a confirmation link to",
            successBodyEnd: "Click the link to activate your account and start onboarding.",
            name: "Your name",
            email: "Work email",
            password: "Password",
            plan: "Plan of interest",
            passwordPlaceholder: "Minimum 6 characters",
            createAccount: "Create free account",
            creating: "Creating account...",
            alreadyAccount: "Already have an account?",
            signIn: "Sign in",
            loading: "Loading...",
            languageLabel: "Language",
            plans: {
                essencial: "1 report/month",
                crescimento: "2 reports/month",
                profissional: "4 reports/month",
                studio: "12 reports/month",
                enterprise: "~22 reports/month",
            } as Record<string, string>,
        };
    }

    return {
        title: "Crie sua conta e receba seu primeiro relatório grátis",
        successTitle: "Verifique seu email",
        successBody: "Enviamos um link de confirmação para",
        successBodyEnd: "Clique no link para ativar sua conta e começar o onboarding.",
        name: "Seu nome",
        email: "Email corporativo",
        password: "Senha",
        plan: "Plano de interesse",
        passwordPlaceholder: "Mínimo 6 caracteres",
        createAccount: "Criar conta grátis",
        creating: "Criando conta...",
        alreadyAccount: "Já tem conta?",
        signIn: "Entrar",
        loading: "Carregando...",
        languageLabel: "Idioma",
        plans: {
            essencial: "1 relatório/mês",
            crescimento: "2 relatórios/mês",
            profissional: "4 relatórios/mês",
            studio: "12 relatórios/mês",
            enterprise: "~22 relatórios/mês",
        } as Record<string, string>,
    };
}

const plans = [
    { value: "essencial", name: "Essencial" },
    { value: "crescimento", name: "Crescimento" },
    { value: "profissional", name: "Profissional" },
    { value: "studio", name: "Studio" },
    { value: "enterprise", name: "Enterprise" },
];

function SignupForm() {
    const searchParams = useSearchParams();
    const locale = usePublicLocale();
    const t = getCopy(locale);
    const lang = searchParams.get("lang") || locale;
    const defaultPlan = searchParams.get("plan") || "profissional";
    const defaultEmail = searchParams.get("email") || "";
    const defaultName = searchParams.get("name") || "";

    const [name, setName] = useState(defaultName);
    const [email, setEmail] = useState(defaultEmail);
    const [password, setPassword] = useState("");
    const [plan, setPlan] = useState(defaultPlan);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

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
                    preferred_language: lang,
                },
            },
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        trackEvent("signup_complete", { plan, email, language: lang });
        
        // Auto-login happens if Supabase Auth has "Confirm email" disabled
        // We can just redirect directly to the onboarding or dashboard
        router.push("/onboarding");
    }

    return (
        <Card className="w-full max-w-md p-8">
            <div className="flex justify-end mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t.languageLabel}</span>
                    <Link href={`/signup?lang=pt-BR&plan=${encodeURIComponent(plan)}`} className={lang === "pt-BR" ? "text-primary font-medium" : ""}>
                        PT
                    </Link>
                    <span>/</span>
                    <Link href={`/signup?lang=en-US&plan=${encodeURIComponent(plan)}`} className={lang.startsWith("en") ? "text-primary font-medium" : ""}>
                        EN
                    </Link>
                </div>
            </div>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold">
                    <span className="text-primary">Guilds</span>
                </h1>
                <p className="text-muted-foreground text-sm mt-2">
                    {t.title}
                </p>
            </div>

            <form onSubmit={handleSignup} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="signup-name">{t.name}</Label>
                    <Input
                        id="signup-name"
                        placeholder="Gustavo Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="signup-email">{t.email}</Label>
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
                    <Label htmlFor="signup-password">{t.password}</Label>
                    <Input
                        id="signup-password"
                        type="password"
                        placeholder={t.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="signup-plan">{t.plan}</Label>
                    <select
                        id="signup-plan"
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        className="flex h-10 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                        {plans.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.name} - {t.plans[p.value]}
                            </option>
                        ))}
                    </select>
                </div>

                {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {loading ? t.creating : t.createAccount}
                </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-6">
                {t.alreadyAccount}{" "}
                <Link href={`/login?lang=${encodeURIComponent(lang)}`} className="text-primary underline">
                    {t.signIn}
                </Link>
            </p>
        </Card>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <Suspense fallback={<Card className="w-full max-w-md p-8 text-center text-sm text-muted-foreground">Loading...</Card>}>
                <SignupForm />
            </Suspense>
        </div>
    );
}
