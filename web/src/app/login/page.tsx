"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";

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
            setError(authError.message === "Invalid login credentials"
                ? "Email ou senha incorretos."
                : authError.message);
            setLoading(false);
            return;
        }

        // Verificar role para redirecionar
        const { data: { user } } = await supabase.auth.getUser();
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
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <Card className="w-full max-w-sm p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-extrabold">
                        <span className="text-primary">Guilds</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        Acesse sua área de inteligência
                    </p>
                </div>

                <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                            id="login-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}

                    <Button type="submit" className="w-full mt-2" disabled={loading}>
                        {loading ? "Entrando..." : "Entrar"}
                    </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-6">
                    Não tem conta?{" "}
                    <a href="/signup" className="text-primary underline">
                        Criar conta
                    </a>
                </p>
            </Card>
        </div>
    );
}
