"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { AppLocale } from "@/lib/i18n";
import { usePublicLocale } from "@/lib/public-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getCopy(locale: AppLocale) {
    if (locale === "en-US") {
        return {
            title: "Access your intelligence workspace",
            email: "Email",
            password: "Password",
            emailPlaceholder: "you@company.com",
            passwordPlaceholder: "********",
            loading: "Signing in...",
            submit: "Sign in",
            invalidCredentials: "Incorrect email or password.",
            noAccount: "Don't have an account?",
            createAccount: "Create account",
            loadingPage: "Loading...",
            languageLabel: "Language",
        };
    }

    return {
        title: "Acesse sua area de inteligencia",
        email: "Email",
        password: "Senha",
        emailPlaceholder: "seu@email.com",
        passwordPlaceholder: "********",
        loading: "Entrando...",
        submit: "Entrar",
        invalidCredentials: "Email ou senha incorretos.",
        noAccount: "Não tem conta?",
        createAccount: "Criar conta",
        loadingPage: "Carregando...",
        languageLabel: "Idioma",
    };
}

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const locale = usePublicLocale();
    const t = getCopy(locale);
    const redirect = searchParams.get("redirect") || "/dashboard";
    const lang = searchParams.get("lang") || locale;

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(
                authError.message === "Invalid login credentials"
                    ? t.invalidCredentials
                    : authError.message
            );
            setLoading(false);
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            router.push(profile?.role === "admin" ? "/admin" : redirect);
        }
    }

    return (
        <Card className="w-full max-w-sm p-8">
            <div className="flex justify-end mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t.languageLabel}</span>
                    <Link href={`/login?lang=pt-BR${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`} className={lang === "pt-BR" ? "text-primary font-medium" : ""}>
                        PT
                    </Link>
                    <span>/</span>
                    <Link href={`/login?lang=en-US${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`} className={lang.startsWith("en") ? "text-primary font-medium" : ""}>
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

            <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="login-email">{t.email}</Label>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder={t.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="login-password">{t.password}</Label>
                    <Input
                        id="login-password"
                        type="password"
                        placeholder={t.passwordPlaceholder}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {loading ? t.loading : t.submit}
                </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-6">
                {t.noAccount}{" "}
                <Link href={`/signup?lang=${encodeURIComponent(lang)}`} className="text-primary underline">
                    {t.createAccount}
                </Link>
            </p>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <Suspense fallback={<Card className="w-full max-w-sm p-8 text-center text-sm text-muted-foreground">Loading...</Card>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
