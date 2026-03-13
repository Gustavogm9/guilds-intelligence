"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2,
    Users,
    Target,
    Sparkles,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Search,
    X,
    Plus,
    Loader2,
    Globe,
    Trash2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { VoiceInput } from "@/components/ui/voice-input";
import { trackEvent } from "@/lib/tracking";
import { AppLocale } from "@/lib/i18n";
import { usePublicLocale } from "@/lib/public-i18n";
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

function getCopy(locale: AppLocale) {
    if (locale === "en-US") {
        return {
            languageLabel: "Language",
            subtitle: "Set up your profile to receive tailored intelligence reports",
            steps: ["Company", "Audience", "Goals", "AI Context", "Niches"],
            companyTitle: "About your company",
            companyDescription: "These details help us understand your market.",
            companyName: "Company name *",
            industry: "Industry *",
            size: "Company size",
            location: "Location",
            products: "Main products / services *",
            productsPlaceholder: "Briefly describe what your company sells or offers",
            audienceTitle: "Your audience and market",
            audienceDescription: "Who your customers are and how you communicate with them.",
            targetAudience: "Primary target audience *",
            revenue: "Annual revenue range",
            tone: "Content tone",
            language: "Preferred language",
            goalsTitle: "Goals and pain points",
            goalsDescription: "What you want to achieve and where the biggest challenge is.",
            goals: "Main goals for 2026 *",
            goalsHint: "One goal per line",
            pains: "Main pain points / current challenges *",
            painsHint: "One pain point per line",
            website: "Company website",
            websitePlaceholder: "https://yourcompany.com",
            socialMedia: "Social media profiles",
            socialMediaPlaceholder: "https://instagram.com/yourcompany",
            addSocialMedia: "Add another",
            contextTitle: "Tell the AI everything",
            contextDescription: "Write freely about your business. The AI will use this context to map the most relevant market niches.",
            contextLabel: "Free-form business context",
            contextHint: "You can paste website copy, LinkedIn text, presentations, and notes. More context leads to a better report.",
            nichesTitle: "Review your strategic niches",
            nichesDescription: "Our AI analyzed your profile and suggested these market niches to monitor. Review, edit, or add new ones.",
            nichesLoading: "Analyzing your profile with AI...",
            nichesPrimary: "Primary",
            nichesSecondary: "Secondary",
            nichesAddPlaceholder: "Add a custom niche...",
            nichesAdd: "Add",
            nichesEmpty: "Add at least one niche to continue.",
            nichesSource: { ai: "Suggested by AI", heuristic: "Basic suggestion" } as Record<string, string>,
            back: "Back",
            next: "Next",
            finish: "Finish and open dashboard",
            saving: "Saving...",
            stepOf: (current: number, total: number) => `${current} of ${total}`,
            sizes: ["1-10 people", "11-50 people", "51-200 people", "201-1000 people", "1001+ people"],
            revenues: ["Up to $100k", "$100k - $500k", "$500k - $2M", "$2M - $10M", "$10M+"],
            tones: {
                profissional: "Professional",
                casual: "Casual",
                tecnico: "Technical",
                inspiracional: "Inspirational",
            } as Record<string, string>,
            languageOptions: {
                "pt-BR": "Portuguese (Brazil)",
                "en-US": "English",
                es: "Spanish",
            } as Record<string, string>,
        };
    }

    return {
        languageLabel: "Idioma",
        subtitle: "Configure seu perfil para receber relatórios personalizados",
        steps: ["Empresa", "Público", "Objetivos", "Contexto IA", "Nichos"],
        companyTitle: "Sobre sua empresa",
        companyDescription: "Essas informações nos ajudam a entender o seu mercado.",
        companyName: "Nome da empresa *",
        industry: "Setor / Indústria *",
        size: "Tamanho",
        location: "Localização",
        products: "Produtos / Serviços principais *",
        productsPlaceholder: "Descreva brevemente o que sua empresa vende ou oferece",
        audienceTitle: "Seu público e mercado",
        audienceDescription: "Quem são seus clientes e como você se comunica com eles.",
        targetAudience: "Público-alvo principal *",
        revenue: "Faixa de faturamento anual",
        tone: "Tom do conteúdo",
        language: "Idioma preferido",
        goalsTitle: "Objetivos e dores",
        goalsDescription: "O que você espera alcançar e onde está o maior desafio.",
        goals: "Principais objetivos para 2026 *",
        goalsHint: "Um objetivo por linha",
        pains: "Maiores dores / desafios atuais *",
        painsHint: "Uma dor por linha",
        website: "Site da empresa",
        websitePlaceholder: "https://suaempresa.com.br",
        socialMedia: "Redes sociais",
        socialMediaPlaceholder: "https://instagram.com/suaempresa",
        addSocialMedia: "Adicionar outra",
        contextTitle: "Conte tudo para a IA",
        contextDescription: "Escreva livremente tudo sobre seu negócio. A IA usa esse contexto para mapear os nichos mais relevantes.",
        contextLabel: "Texto livre sobre o negócio",
        contextHint: "Pode colar textos do site, LinkedIn, apresentações e anotações. Quanto mais contexto, melhor o relatório.",
        nichesTitle: "Revise seus nichos estratégicos",
        nichesDescription: "Nossa IA analisou seu perfil e sugeriu estes nichos de mercado para monitorar. Revise, edite ou adicione novos.",
        nichesLoading: "Analisando seu perfil com IA...",
        nichesPrimary: "Principal",
        nichesSecondary: "Secundário",
        nichesAddPlaceholder: "Adicionar nicho personalizado...",
        nichesAdd: "Adicionar",
        nichesEmpty: "Adicione pelo menos um nicho para continuar.",
        nichesSource: { ai: "Sugerido pela IA", heuristic: "Sugestão básica" } as Record<string, string>,
        back: "Voltar",
        next: "Próximo",
        finish: "Finalizar e ver dashboard",
        saving: "Salvando...",
        stepOf: (current: number, total: number) => `${current} de ${total}`,
        sizes: ["1-10 pessoas", "11-50 pessoas", "51-200 pessoas", "201-1000 pessoas", "1001+ pessoas"],
        revenues: ["Até R$100k", "R$100k - R$500k", "R$500k - R$2M", "R$2M - R$10M", "Acima de R$10M"],
        tones: {
            profissional: "Profissional",
            casual: "Casual",
            tecnico: "Técnico",
            inspiracional: "Inspiracional",
        } as Record<string, string>,
        languageOptions: {
            "pt-BR": "Português (Brasil)",
            "en-US": "English",
            es: "Español",
        } as Record<string, string>,
    };
}

const sizeValues = ["1-10", "11-50", "51-200", "201-1000", "1001+"];
const revenueValues = ["ate-100k", "100k-500k", "500k-2m", "2m-10m", "10m+"];
const toneValues = ["profissional", "casual", "tecnico", "inspiracional"];

function OnboardingForm() {
    const locale = usePublicLocale();
    const t = getCopy(locale);
    const steps = [
        { icon: Building2, label: t.steps[0] },
        { icon: Users, label: t.steps[1] },
        { icon: Target, label: t.steps[2] },
        { icon: Sparkles, label: t.steps[3] },
        { icon: Search, label: t.steps[4] },
    ];

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [analyzingNiches, setAnalyzingNiches] = useState(false);
    const [suggestedNiches, setSuggestedNiches] = useState<{ name: string; relevance: string; reasoning: string }[]>([]);
    const [nichesSource, setNichesSource] = useState<string>("");
    const [newNicheName, setNewNicheName] = useState("");
    const [formData, setFormData] = useState({
        company_name: "",
        industry: "",
        company_size: "",
        location: "",
        products_services: "",
        target_audience: "",
        annual_revenue: "",
        content_tone: "profissional",
        preferred_language: locale,
        goals_2026: "",
        pain_points: "",
        raw_onboarding_text: "",
        website_url: "",
    });
    const [socialMediaUrls, setSocialMediaUrls] = useState<string[]>([""]);

    const router = useRouter();

    function updateField(field: string, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function saveClientAndAnalyzeNiches() {
        setAnalyzingNiches(true);
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            router.push(`/login?lang=${encodeURIComponent(locale)}`);
            return;
        }

        // Map the plan slug chosen at signup to a real plan_id
        const planInterest = user.user_metadata?.plan_interest || "profissional";
        const planNameMap: Record<string, string> = {
            essencial: "Essencial",
            crescimento: "Crescimento",
            profissional: "Profissional",
            studio: "Studio",
            enterprise: "Enterprise",
        };
        const resolvedPlanName = planNameMap[planInterest] || "Profissional";

        const { data: planRow } = await supabase
            .from("plans")
            .select("id")
            .eq("name", resolvedPlanName)
            .single();

        const contactName = user.user_metadata?.full_name || formData.company_name || "";
        const contactEmail = user.email || "";

        // Save client data first
        const { error } = await supabase
            .from("clients")
            .upsert({
                user_id: user.id,
                plan_id: planRow?.id || null,
                company_name: formData.company_name,
                contact_name: contactName,
                contact_email: contactEmail,
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
                website_url: formData.website_url || null,
                social_media_urls: socialMediaUrls.filter(u => u.trim()),
            }, { onConflict: "user_id" });

        if (error) {
            console.error("Save client error:", error);
            setAnalyzingNiches(false);
            return;
        }

        // Call AI to analyze niches
        try {
            const res = await fetch("/api/analyze-profile", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setSuggestedNiches(data.niches || []);
                setNichesSource(data.source || "heuristic");
            }
        } catch (err) {
            console.warn("Niche analysis failed:", err);
        }

        setAnalyzingNiches(false);
        setCurrentStep(4); // Move to step 5 (niches review)
    }

    function removeNiche(index: number) {
        setSuggestedNiches((prev) => prev.filter((_, i) => i !== index));
    }

    function addNiche() {
        if (!newNicheName.trim()) return;
        setSuggestedNiches((prev) => [
            ...prev,
            { name: newNicheName.trim(), relevance: "primary", reasoning: locale === "en-US" ? "Added manually" : "Adicionado manualmente" },
        ]);
        setNewNicheName("");
    }

    function toggleRelevance(index: number) {
        setSuggestedNiches((prev) =>
            prev.map((n, i) =>
                i === index ? { ...n, relevance: n.relevance === "primary" ? "secondary" : "primary" } : n
            )
        );
    }

    async function handleFinish() {
        if (suggestedNiches.length === 0) return;
        setLoading(true);
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            router.push(`/login?lang=${encodeURIComponent(locale)}`);
            return;
        }

        // Get client id
        const { data: client } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!client) {
            setLoading(false);
            return;
        }

        // Save niches to client_niches
        const nichesToInsert = suggestedNiches.map((n) => ({
            client_id: client.id,
            niche_name: n.name,
            relevance: n.relevance,
            is_active: true,
        }));

        // Delete existing niches first (in case of re-onboarding)
        await supabase.from("client_niches").delete().eq("client_id", client.id);
        const { error: nichesError } = await supabase.from("client_niches").insert(nichesToInsert);

        if (nichesError) {
            console.error("Save niches error:", nichesError);
            setLoading(false);
            return;
        }

        trackEvent("onboarding_complete", {
            company_name: formData.company_name,
            industry: formData.industry,
            preferred_language: formData.preferred_language,
            niches_count: suggestedNiches.length,
            niches_source: nichesSource,
        });

        // Trigger first free report
        fetch("/api/reports/generate-first-free", { method: "POST" }).catch(
            (err) => console.warn("First free report trigger failed:", err)
        );

        router.push("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="flex justify-end mb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t.languageLabel}</span>
                        <Link href="/onboarding?lang=pt-BR" className={locale === "pt-BR" ? "text-primary font-medium" : ""}>
                            PT
                        </Link>
                        <span>/</span>
                        <Link href="/onboarding?lang=en-US" className={locale === "en-US" ? "text-primary font-medium" : ""}>
                            EN
                        </Link>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-extrabold">
                        <span className="text-primary">Guilds</span>
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t.subtitle}
                    </p>
                </div>

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
                                <div className={`w-8 h-px ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                            )}
                        </div>
                    ))}
                </div>

                <Card className="p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentStep === 0 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{t.companyTitle}</h2>
                                        <p className="text-sm text-muted-foreground">{t.companyDescription}</p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="company_name">{t.companyName}</Label>
                                            <Input id="company_name" value={formData.company_name} onChange={(e) => updateField("company_name", e.target.value)} placeholder="TechFarma Solutions" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="industry">{t.industry}</Label>
                                                <Input id="industry" value={formData.industry} onChange={(e) => updateField("industry", e.target.value)} placeholder="HealthTech, SaaS, Retail" />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="company_size">{t.size}</Label>
                                                <Select value={formData.company_size} onValueChange={(v) => updateField("company_size", v ?? "")}>
                                                    <SelectTrigger id="company_size">
                                                        <SelectValue placeholder={t.size} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {sizeValues.map((value, index) => (
                                                            <SelectItem key={value} value={value}>{t.sizes[index]}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="location">{t.location}</Label>
                                            <Input id="location" value={formData.location} onChange={(e) => updateField("location", e.target.value)} placeholder={locale === "en-US" ? "New York, NY" : "Sao Paulo - SP"} />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="website_url" className="flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5" />
                                                {t.website}
                                            </Label>
                                            <Input
                                                id="website_url"
                                                type="url"
                                                value={formData.website_url}
                                                onChange={(e) => updateField("website_url", e.target.value)}
                                                placeholder={t.websitePlaceholder}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label className="flex items-center gap-1.5">{t.socialMedia}</Label>
                                            <div className="space-y-2">
                                                {socialMediaUrls.map((url, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <Input
                                                            type="url"
                                                            value={url}
                                                            onChange={(e) => {
                                                                const updated = [...socialMediaUrls];
                                                                updated[idx] = e.target.value;
                                                                setSocialMediaUrls(updated);
                                                            }}
                                                            placeholder={t.socialMediaPlaceholder}
                                                        />
                                                        {socialMediaUrls.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSocialMediaUrls(socialMediaUrls.filter((_, i) => i !== idx))}
                                                                className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setSocialMediaUrls([...socialMediaUrls, ""])}
                                                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" /> {t.addSocialMedia}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="products_services">{t.products}</Label>
                                                <VoiceInput value={formData.products_services} onChange={(v) => updateField("products_services", v)} lang={formData.preferred_language} />
                                            </div>
                                            <Textarea id="products_services" value={formData.products_services} onChange={(e) => updateField("products_services", e.target.value)} placeholder={t.productsPlaceholder} rows={3} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{t.audienceTitle}</h2>
                                        <p className="text-sm text-muted-foreground">{t.audienceDescription}</p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="target_audience">{t.targetAudience}</Label>
                                                <VoiceInput value={formData.target_audience} onChange={(v) => updateField("target_audience", v)} lang={formData.preferred_language} />
                                            </div>
                                            <Textarea id="target_audience" value={formData.target_audience} onChange={(e) => updateField("target_audience", e.target.value)} placeholder={locale === "en-US" ? "Example: e-commerce founders, clinic managers, restaurant owners..." : "Ex: Empresarios de e-commerce, gestores de clinicas, donos de restaurantes..."} rows={3} />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="annual_revenue">{t.revenue}</Label>
                                            <Select value={formData.annual_revenue} onValueChange={(v) => updateField("annual_revenue", v ?? "")}>
                                                <SelectTrigger id="annual_revenue">
                                                    <SelectValue placeholder={t.revenue} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {revenueValues.map((value, index) => (
                                                        <SelectItem key={value} value={value}>{t.revenues[index]}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="content_tone">{t.tone}</Label>
                                                <Select value={formData.content_tone} onValueChange={(v) => updateField("content_tone", v ?? "")}>
                                                    <SelectTrigger id="content_tone">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {toneValues.map((value) => (
                                                            <SelectItem key={value} value={value}>{t.tones[value]}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="preferred_language">{t.language}</Label>
                                                <Select value={formData.preferred_language} onValueChange={(v) => updateField("preferred_language", v ?? "")}>
                                                    <SelectTrigger id="preferred_language">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(t.languageOptions).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{t.goalsTitle}</h2>
                                        <p className="text-sm text-muted-foreground">{t.goalsDescription}</p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="goals_2026">{t.goals}</Label>
                                                <VoiceInput value={formData.goals_2026} onChange={(v) => updateField("goals_2026", v)} lang={formData.preferred_language} />
                                            </div>
                                            <Textarea id="goals_2026" value={formData.goals_2026} onChange={(e) => updateField("goals_2026", e.target.value)} rows={4} />
                                            <p className="text-xs text-muted-foreground">{t.goalsHint}</p>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="pain_points">{t.pains}</Label>
                                                <VoiceInput value={formData.pain_points} onChange={(v) => updateField("pain_points", v)} lang={formData.preferred_language} />
                                            </div>
                                            <Textarea id="pain_points" value={formData.pain_points} onChange={(e) => updateField("pain_points", e.target.value)} rows={4} />
                                            <p className="text-xs text-muted-foreground">{t.painsHint}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{t.contextTitle}</h2>
                                        <p className="text-sm text-muted-foreground">{t.contextDescription}</p>
                                    </div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="raw_onboarding_text">{t.contextLabel}</Label>
                                                <VoiceInput value={formData.raw_onboarding_text} onChange={(v) => updateField("raw_onboarding_text", v)} lang={formData.preferred_language} />
                                            </div>
                                            <Textarea
                                                id="raw_onboarding_text"
                                                value={formData.raw_onboarding_text}
                                                onChange={(e) => updateField("raw_onboarding_text", e.target.value)}
                                                placeholder={locale === "en-US"
                                                    ? "Paste website copy, product descriptions, positioning, competitors, audience notes, and future plans here."
                                                    : "Cole aqui qualquer informação sobre sua empresa: site, redes sociais, produtos, diferenciais, concorrentes, público-alvo e planos futuros."}
                                                rows={10}
                                                className="resize-none"
                                            />
                                            <p className="text-xs text-muted-foreground">{t.contextHint}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {currentStep === 4 && (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-xl font-bold mb-1">{t.nichesTitle}</h2>
                                        <p className="text-sm text-muted-foreground">{t.nichesDescription}</p>
                                        {nichesSource && (
                                            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                nichesSource === "ai" ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"
                                            }`}>
                                                <Sparkles className="h-3 w-3" />
                                                {t.nichesSource[nichesSource] || nichesSource}
                                            </span>
                                        )}
                                    </div>

                                    {analyzingNiches ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                            <p className="text-sm text-muted-foreground">{t.nichesLoading}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {suggestedNiches.map((niche, index) => (
                                                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium">{niche.name}</p>
                                                        {niche.reasoning && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{niche.reasoning}</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRelevance(index)}
                                                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                                                            niche.relevance === "primary"
                                                                ? "bg-primary/15 text-primary hover:bg-primary/25"
                                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                        }`}
                                                    >
                                                        {niche.relevance === "primary" ? t.nichesPrimary : t.nichesSecondary}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNiche(index)}
                                                        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}

                                            {suggestedNiches.length === 0 && (
                                                <p className="text-sm text-amber-600 text-center py-4">{t.nichesEmpty}</p>
                                            )}

                                            <div className="flex gap-2 mt-2">
                                                <Input
                                                    value={newNicheName}
                                                    onChange={(e) => setNewNicheName(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNiche())}
                                                    placeholder={t.nichesAddPlaceholder}
                                                    className="flex-1"
                                                />
                                                <Button type="button" variant="outline" size="sm" onClick={addNiche} disabled={!newNicheName.trim()} className="gap-1 shrink-0">
                                                    <Plus className="h-4 w-4" />
                                                    {t.nichesAdd}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                        <Button variant="outline" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))} disabled={currentStep === 0 || analyzingNiches} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t.back}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {t.stepOf(currentStep + 1, steps.length)}
                        </span>
                        {currentStep < 3 ? (
                            <Button onClick={() => setCurrentStep((step) => Math.min(step + 1, steps.length - 1))} className="gap-2">
                                {t.next}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : currentStep === 3 ? (
                            <Button onClick={saveClientAndAnalyzeNiches} disabled={analyzingNiches} className="gap-2">
                                {analyzingNiches ? t.nichesLoading : t.next}
                                {analyzingNiches ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        ) : (
                            <Button onClick={handleFinish} disabled={loading || suggestedNiches.length === 0} className="gap-2">
                                {loading ? t.saving : t.finish}
                                <Sparkles className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<Card className="w-full max-w-2xl p-8 text-center text-sm text-muted-foreground">Loading...</Card>}>
            <OnboardingForm />
        </Suspense>
    );
}
