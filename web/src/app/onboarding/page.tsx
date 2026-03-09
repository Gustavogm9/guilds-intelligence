"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2,
    Users,
    Target,
    Sparkles,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
} from "lucide-react";

const steps = [
    { icon: Building2, label: "Empresa" },
    { icon: Users, label: "Público" },
    { icon: Target, label: "Objetivos" },
    { icon: Sparkles, label: "Contexto IA" },
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        // Step 1 — Empresa
        company_name: "",
        industry: "",
        company_size: "",
        location: "",
        products_services: "",
        // Step 2 — Público
        target_audience: "",
        annual_revenue: "",
        content_tone: "profissional",
        preferred_language: "pt-BR",
        // Step 3 — Objetivos
        goals_2026: "",
        pain_points: "",
        // Step 4 — Contexto IA
        raw_onboarding_text: "",
    });

    const router = useRouter();

    function updateField(field: string, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleFinish() {
        setLoading(true);
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }

        // Atualizar client record
        const { error } = await supabase
            .from("clients")
            .update({
                company_name: formData.company_name,
                industry: formData.industry,
                company_size: formData.company_size,
                location: formData.location,
                products_services: formData.products_services,
                target_audience: formData.target_audience,
                annual_revenue: formData.annual_revenue,
                content_tone: formData.content_tone,
                preferred_language: formData.preferred_language,
                goals_2026: formData.goals_2026.split("\n").filter(Boolean),
                pain_points: formData.pain_points.split("\n").filter(Boolean),
                raw_onboarding_text: formData.raw_onboarding_text,
            })
            .eq("user_id", user.id);

        if (error) {
            console.error("Onboarding error:", error);
            setLoading(false);
            return;
        }

        router.push("/dashboard");
    }

    function next() {
        if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
    }
    function back() {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-extrabold">
                        <span className="text-primary">Guilds</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Configure seu perfil para receber relatórios personalizados
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${i < currentStep
                                        ? "bg-primary/20 text-primary"
                                        : i === currentStep
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {i < currentStep ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : (
                                    <step.icon className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">{step.label}</span>
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={`w-8 h-px ${i < currentStep ? "bg-primary" : "bg-border"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <Card className="p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Step 1: Empresa */}
                            {currentStep === 0 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">
                                            Sobre sua empresa
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Essas informações nos ajudam a entender o seu mercado.
                                        </p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="company_name">Nome da empresa *</Label>
                                            <Input
                                                id="company_name"
                                                value={formData.company_name}
                                                onChange={(e) =>
                                                    updateField("company_name", e.target.value)
                                                }
                                                placeholder="Ex: TechFarma Soluções"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="industry">Setor / Indústria *</Label>
                                                <Input
                                                    id="industry"
                                                    value={formData.industry}
                                                    onChange={(e) =>
                                                        updateField("industry", e.target.value)
                                                    }
                                                    placeholder="Ex: HealthTech, SaaS, Varejo"
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="company_size">Tamanho</Label>
                                                <Select
                                                    value={formData.company_size}
                                                    onValueChange={(v) => updateField("company_size", v)}
                                                >
                                                    <SelectTrigger id="company_size">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="1-10">1-10 pessoas</SelectItem>
                                                        <SelectItem value="11-50">11-50 pessoas</SelectItem>
                                                        <SelectItem value="51-200">
                                                            51-200 pessoas
                                                        </SelectItem>
                                                        <SelectItem value="201-1000">
                                                            201-1000 pessoas
                                                        </SelectItem>
                                                        <SelectItem value="1001+">1001+ pessoas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="location">Localização</Label>
                                            <Input
                                                id="location"
                                                value={formData.location}
                                                onChange={(e) =>
                                                    updateField("location", e.target.value)
                                                }
                                                placeholder="Ex: São Paulo - SP"
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="products_services">
                                                Produtos / Serviços principais *
                                            </Label>
                                            <Textarea
                                                id="products_services"
                                                value={formData.products_services}
                                                onChange={(e) =>
                                                    updateField("products_services", e.target.value)
                                                }
                                                placeholder="Descreva brevemente o que sua empresa vende ou oferece"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Público */}
                            {currentStep === 1 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">
                                            Seu público e mercado
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Quem são seus clientes e como você se comunica com eles.
                                        </p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="target_audience">
                                                Público-alvo principal *
                                            </Label>
                                            <Textarea
                                                id="target_audience"
                                                value={formData.target_audience}
                                                onChange={(e) =>
                                                    updateField("target_audience", e.target.value)
                                                }
                                                placeholder="Ex: Empresários de e-commerce, gestores de clínicas, donos de restaurantes..."
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="annual_revenue">
                                                Faixa de faturamento anual
                                            </Label>
                                            <Select
                                                value={formData.annual_revenue}
                                                onValueChange={(v) =>
                                                    updateField("annual_revenue", v)
                                                }
                                            >
                                                <SelectTrigger id="annual_revenue">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ate-100k">Até R$100k</SelectItem>
                                                    <SelectItem value="100k-500k">
                                                        R$100k - R$500k
                                                    </SelectItem>
                                                    <SelectItem value="500k-2m">
                                                        R$500k - R$2M
                                                    </SelectItem>
                                                    <SelectItem value="2m-10m">R$2M - R$10M</SelectItem>
                                                    <SelectItem value="10m+">Acima de R$10M</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="content_tone">Tom do conteúdo</Label>
                                                <Select
                                                    value={formData.content_tone}
                                                    onValueChange={(v) =>
                                                        updateField("content_tone", v)
                                                    }
                                                >
                                                    <SelectTrigger id="content_tone">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="profissional">
                                                            Profissional
                                                        </SelectItem>
                                                        <SelectItem value="casual">Casual</SelectItem>
                                                        <SelectItem value="tecnico">Técnico</SelectItem>
                                                        <SelectItem value="inspiracional">
                                                            Inspiracional
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="preferred_language">Idioma</Label>
                                                <Select
                                                    value={formData.preferred_language}
                                                    onValueChange={(v) =>
                                                        updateField("preferred_language", v)
                                                    }
                                                >
                                                    <SelectTrigger id="preferred_language">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pt-BR">Português</SelectItem>
                                                        <SelectItem value="en">Inglês</SelectItem>
                                                        <SelectItem value="es">Espanhol</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Objetivos */}
                            {currentStep === 2 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">
                                            Objetivos e dores
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            O que você espera alcançar e onde está o maior
                                            desafio.
                                        </p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="goals_2026">
                                                Principais objetivos para 2026 *
                                            </Label>
                                            <Textarea
                                                id="goals_2026"
                                                value={formData.goals_2026}
                                                onChange={(e) =>
                                                    updateField("goals_2026", e.target.value)
                                                }
                                                placeholder={"Ex:\nAumentar market share em 15%\nLançar nova linha de produtos\nExpandir para o Sudeste"}
                                                rows={4}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Um objetivo por linha
                                            </p>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="pain_points">
                                                Maiores dores / desafios atuais *
                                            </Label>
                                            <Textarea
                                                id="pain_points"
                                                value={formData.pain_points}
                                                onChange={(e) =>
                                                    updateField("pain_points", e.target.value)
                                                }
                                                placeholder={"Ex:\nNão consigo acompanhar tendências do setor\nConcorrentes conseguem reagir mais rápido\nFalta de dados para tomada de decisão"}
                                                rows={4}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Uma dor por linha
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Contexto IA */}
                            {currentStep === 3 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">
                                            Conte tudo para a IA
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            Escreva livremente tudo sobre seu negócio. A IA vai ler
                                            esse texto para mapear os nichos de mercado mais
                                            relevantes.
                                        </p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="raw_onboarding_text">
                                                Texto livre sobre o negócio
                                            </Label>
                                            <Textarea
                                                id="raw_onboarding_text"
                                                value={formData.raw_onboarding_text}
                                                onChange={(e) =>
                                                    updateField("raw_onboarding_text", e.target.value)
                                                }
                                                placeholder="Cole aqui qualquer informação sobre sua empresa: site, redes sociais, descrição de produtos, diferenciais, concorrentes, público-alvo, planos futuros… Quanto mais contexto, melhor será o relatório."
                                                rows={10}
                                                className="resize-none"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Pode colar textos de site, LinkedIn, apresentações —
                                                tudo é útil.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                        <Button
                            variant="outline"
                            onClick={back}
                            disabled={currentStep === 0}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {currentStep + 1} de {steps.length}
                        </span>
                        {currentStep < steps.length - 1 ? (
                            <Button onClick={next} className="gap-2">
                                Próximo
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleFinish}
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading ? "Salvando..." : "Finalizar e ver dashboard"}
                                <Sparkles className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
