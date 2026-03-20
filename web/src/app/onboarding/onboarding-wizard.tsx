"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
    LayoutDashboard,
    TrendingUp,
    MapPin,
    Briefcase
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

// --- Schema ---
function getBaseSchema(locale: AppLocale) {
    const isEn = locale === "en-US";
    const reqText = isEn ? "Required field" : "Campo obrigatório";
    const urlText = isEn ? "Invalid URL" : "URL inválida";

    return z.object({
        company_name: z.string().min(1, reqText),
        industry: z.string().min(1, reqText),
        company_size: z.string(),
        location: z.string(),
        products_services: z.string().min(1, reqText),
        target_audience: z.string().min(1, reqText),
        annual_revenue: z.string(),
        content_tone: z.string(),
        preferred_language: z.string(),
        goals_2026: z.string().min(1, reqText),
        pain_points: z.string().min(1, reqText),
        raw_onboarding_text: z.string(),
        website_url: z.string().url(urlText).or(z.literal("")),
        social_media_urls: z.array(z.string().url(urlText).or(z.literal(""))),
    });
}
type WizardSchema = z.infer<ReturnType<typeof getBaseSchema>>;

// --- Constants & Copy ---
const sizeValues = ["1-10", "11-50", "51-200", "201-1000", "1001+"];
const revenueValues = ["ate-100k", "100k-500k", "500k-2m", "2m-10m", "10m+"];
const toneValues = ["profissional", "casual", "tecnico", "inspiracional"];

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
                "es-ES": "Spanish",
                "fr-FR": "French",
            } as Record<string, string>,
            previewGreeting: "Welcome to Guilds",
            previewNoName: "Your Company",
            previewDashboardMock: "Dashboard Preview",
            previewAudience: "Target Audience",
            previewGoals: "Your Goals",
            previewIndustry: "Industry & Operation",
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
            "en-US": "Inglês",
            "es-ES": "Espanhol",
            "fr-FR": "Francês",
        } as Record<string, string>,
        previewGreeting: "Bem-vindo ao Guilds",
        previewNoName: "Sua Empresa",
        previewDashboardMock: "Preview do seu Dashboard",
        previewAudience: "Público Direcionado",
        previewGoals: "Seus Objetivos",
        previewIndustry: "Setor & Operação",
    };
}

// --- Preview Component ---
function OnboardingPreview({ watchValues, t, nichesCount, isAnalyzing }: { watchValues: any, t: any, nichesCount: number, isAnalyzing: boolean }) {
    const { company_name, industry, location, target_audience, goals_2026 } = watchValues;
    const name = company_name || t.previewNoName;

    return (
        <div className="w-full h-full flex flex-col pt-8">
            <div className="flex items-center gap-2 text-primary font-bold mb-8">
                <LayoutDashboard className="h-5 w-5" />
                <span>{t.previewDashboardMock}</span>
            </div>

            <div className="bg-gradient-to-br from-card to-muted/30 border border-border shadow-md rounded-2xl flex-1 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                
                <h3 className="text-xl font-bold tracking-tight mb-2">
                    {t.previewGreeting}, <span className="text-primary">{name}</span>!
                </h3>
                <p className="text-sm text-muted-foreground mb-8">
                    {isAnalyzing ? "Analisando perfil estratégico..." : `${nichesCount} nichos estratégicos monitorados no momento.`}
                </p>

                <div className="grid gap-4">
                    <div className="bg-background rounded-xl p-4 shadow-sm border border-border/50 flex gap-4 items-start">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                            <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold">{t.previewIndustry}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {industry ? (
                                    <span className="flex items-center gap-1">
                                        {industry}
                                        {location && <><MapPin className="h-3 w-3 ml-1" /> {location}</>}
                                    </span>
                                ) : (
                                    "Aguardando preenchimento..."
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="bg-background rounded-xl p-4 shadow-sm border border-border/50 flex gap-4 items-start">
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg shrink-0">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold">{t.previewAudience}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {target_audience || "Aguardando preenchimento..."}
                            </p>
                        </div>
                    </div>

                    <div className="bg-background rounded-xl p-4 shadow-sm border border-border/50 flex gap-4 items-start">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                            <Target className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold">{t.previewGoals}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {goals_2026?.split("\\n")[0] || "Aguardando preenchimento..."}
                            </p>
                        </div>
                    </div>

                     {nichesCount > 0 && (
                        <div className="bg-background rounded-xl p-4 shadow-sm border border-border/50 flex gap-4 items-start relative overflow-hidden group">
                           <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0 relative z-10">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-sm font-semibold">Motor Preditivo Ativo</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    A IA encontrou {nichesCount} vértices no mercado baseados no seu perfil.
                                </p>
                            </div>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
}

// --- Main Wizard Component ---
export function OnboardingWizard() {
    const locale = usePublicLocale();
    const t = getCopy(locale);
    const schema = getBaseSchema(locale);

    const steps = [
        { icon: Building2, label: t.steps[0], fields: ["company_name", "industry", "products_services"] },
        { icon: Users, label: t.steps[1], fields: ["target_audience"] },
        { icon: Target, label: t.steps[2], fields: ["goals_2026", "pain_points"] },
        { icon: Sparkles, label: t.steps[3], fields: [] },
        { icon: Search, label: t.steps[4], fields: [] },
    ];

    const methods = useForm<WizardSchema>({
        resolver: zodResolver(schema),
        defaultValues: {
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
            social_media_urls: [""],
        },
        mode: "onTouched",
    });

    const { register, control, watch, trigger, getValues, setValue, formState: { errors } } = methods;
    const watchAll = watch();

    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [analyzingNiches, setAnalyzingNiches] = useState(false);
    const [suggestedNiches, setSuggestedNiches] = useState<{ name: string; relevance: string; reasoning: string }[]>([]);
    const [nichesSource, setNichesSource] = useState<string>("");
    const [newNicheName, setNewNicheName] = useState("");

    const router = useRouter();

    async function handleNext() {
        const fieldsToValidate = steps[currentStep].fields as (keyof WizardSchema)[];
        if (fieldsToValidate.length > 0) {
            const isValid = await trigger(fieldsToValidate);
            if (!isValid) return;
        }

        if (currentStep === 3) {
            await saveClientAndAnalyzeNiches();
        } else {
            setCurrentStep(s => Math.min(s + 1, steps.length - 1));
        }
    }

    async function saveClientAndAnalyzeNiches() {
        setAnalyzingNiches(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            router.push(`/login?lang=${encodeURIComponent(locale)}`);
            return;
        }

        const formData = getValues();
        const planInterest = user.user_metadata?.plan_interest || "profissional";
        const planNameMap: Record<string, string> = {
            essencial: "Essencial", crescimento: "Crescimento", profissional: "Profissional",
            studio: "Studio", enterprise: "Enterprise"
        };
        const resolvedPlanName = planNameMap[planInterest] || "Profissional";
        const { data: planRow } = await supabase.from("plans").select("id").eq("name", resolvedPlanName).single();

        const contactName = user.user_metadata?.full_name || formData.company_name || "";
        const contactEmail = user.email || "";

        const { error } = await supabase.from("clients").upsert({
            user_id: user.id,
            plan_id: planRow?.id || null,
            ...formData,
            contact_name: contactName,
            contact_email: contactEmail,
            goals_2026: formData.goals_2026.split("\\n").filter(Boolean),
            pain_points: formData.pain_points.split("\\n").filter(Boolean),
            social_media_urls: formData.social_media_urls.filter((u: string) => u.trim()),
            website_url: formData.website_url || null,
        }, { onConflict: "user_id" });

        if (error) {
            console.error("Save client error:", error);
            setAnalyzingNiches(false);
            return;
        }

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
        setCurrentStep(4);
    }

    // Niche Handlers
    function removeNiche(index: number) { setSuggestedNiches((prev) => prev.filter((_, i) => i !== index)); }
    function addNiche() {
        if (!newNicheName.trim()) return;
        setSuggestedNiches((prev) => [...prev, { name: newNicheName.trim(), relevance: "primary", reasoning: locale === "en-US" ? "Added manually" : "Adicionado manualmente" }]);
        setNewNicheName("");
    }
    function toggleRelevance(index: number) {
        setSuggestedNiches((prev) => prev.map((n, i) => i === index ? { ...n, relevance: n.relevance === "primary" ? "secondary" : "primary" } : n));
    }

    async function handleFinish() {
        if (suggestedNiches.length === 0) return;
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push(`/login?lang=${encodeURIComponent(locale)}`); return; }

        const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
        if (!client) { setLoading(false); return; }

        const nichesToInsert = suggestedNiches.map((n) => ({ client_id: client.id, niche_name: n.name, relevance: n.relevance, is_active: true }));
        await supabase.from("client_niches").delete().eq("client_id", client.id);
        const { error: nichesError } = await supabase.from("client_niches").insert(nichesToInsert);

        if (nichesError) { console.error("Save niches error:", nichesError); setLoading(false); return; }

        trackEvent("onboarding_complete", {
            company_name: watchAll.company_name,
            industry: watchAll.industry,
            preferred_language: watchAll.preferred_language,
            niches_count: suggestedNiches.length,
            niches_source: nichesSource,
        });

        fetch("/api/reports/generate-first-free", { method: "POST" }).catch(err => console.warn("First free report trigger failed:", err));
        router.push("/dashboard");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 grid lg:grid-cols-2">
            
            {/* Left Column: Flow */}
            <div className="flex items-center justify-center p-6 sm:p-12 h-[100dvh] overflow-y-auto w-full">
                <div className="w-full max-w-xl pb-16">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-2xl font-extrabold text-primary">Guilds</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Link href="/onboarding?lang=pt-BR" className={locale === "pt-BR" ? "text-primary font-medium" : ""}>PT</Link>
                            <span>/</span>
                            <Link href="/onboarding?lang=en-US" className={locale === "en-US" ? "text-primary font-medium" : ""}>EN</Link>
                        </div>
                    </div>

                    <p className="text-muted-foreground text-sm font-medium mb-8">
                        {t.subtitle}
                    </p>

                    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-4 scrollbar-none">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-center gap-2 shrink-0">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${i < currentStep ? "bg-primary/20 text-primary" : i === currentStep ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"}`}>
                                    {i < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline">{step.label}</span>
                                </div>
                                {i < steps.length - 1 && <div className={`w-6 sm:w-8 h-[2px] rounded-full ${i < currentStep ? "bg-primary" : "bg-border"}`} />}
                            </div>
                        ))}
                    </div>

                    <FormProvider {...methods}>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <Card className="p-8 border-border/60 shadow-lg relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                                        {/* Step 0: Company */}
                                        {currentStep === 0 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h2 className="text-xl font-bold mb-1">{t.companyTitle}</h2>
                                                    <p className="text-sm text-muted-foreground">{t.companyDescription}</p>
                                                </div>
                                                <div className="grid gap-5">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="company_name" className={errors.company_name ? "text-destructive" : ""}>{t.companyName}</Label>
                                                        <Input id="company_name" {...register("company_name")} placeholder="TechFarma Solutions" className={errors.company_name ? "border-destructive focus-visible:ring-destructive" : ""} />
                                                        {errors.company_name && <p className="text-xs text-destructive">{errors.company_name.message}</p>}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="industry" className={errors.industry ? "text-destructive" : ""}>{t.industry}</Label>
                                                            <Input id="industry" {...register("industry")} placeholder="HealthTech, SaaS, Retail" />
                                                            {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="company_size">{t.size}</Label>
                                                            <Controller control={control} name="company_size" render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger id="company_size"><SelectValue placeholder={t.size} /></SelectTrigger>
                                                                    <SelectContent>{sizeValues.map((v, i) => <SelectItem key={v} value={v}>{t.sizes[i]}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            )} />
                                                        </div>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="location">{t.location}</Label>
                                                        <Input id="location" {...register("location")} placeholder={locale === "en-US" ? "New York, NY" : "Sao Paulo - SP"} />
                                                    </div>
                                                    
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="products_services" className={errors.products_services ? "text-destructive" : ""}>{t.products}</Label>
                                                            <VoiceInput value={watchAll.products_services} onChange={(v) => setValue("products_services", v)} lang={watchAll.preferred_language} />
                                                        </div>
                                                        <Textarea id="products_services" {...register("products_services")} placeholder={t.productsPlaceholder} rows={3} className={errors.products_services ? "border-destructive" : ""} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 1: Audience */}
                                        {currentStep === 1 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h2 className="text-xl font-bold mb-1">{t.audienceTitle}</h2>
                                                    <p className="text-sm text-muted-foreground">{t.audienceDescription}</p>
                                                </div>
                                                <div className="grid gap-5">
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="target_audience" className={errors.target_audience ? "text-destructive" : ""}>{t.targetAudience}</Label>
                                                            <VoiceInput value={watchAll.target_audience} onChange={(v) => setValue("target_audience", v)} lang={watchAll.preferred_language} />
                                                        </div>
                                                        <Textarea id="target_audience" {...register("target_audience")} placeholder={locale === "en-US" ? "Example: e-commerce founders..." : "Ex: Empresários de e-commerce..."} rows={3} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="annual_revenue">{t.revenue}</Label>
                                                        <Controller control={control} name="annual_revenue" render={({ field }) => (
                                                            <Select value={field.value} onValueChange={field.onChange}>
                                                                <SelectTrigger id="annual_revenue"><SelectValue placeholder={t.revenue} /></SelectTrigger>
                                                                <SelectContent>{revenueValues.map((v, i) => <SelectItem key={v} value={v}>{t.revenues[i]}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        )} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="content_tone">{t.tone}</Label>
                                                            <Controller control={control} name="content_tone" render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{toneValues.map((v) => <SelectItem key={v} value={v}>{t.tones[v]}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            )} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="preferred_language">{t.language}</Label>
                                                            <Controller control={control} name="preferred_language" render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{Object.entries(t.languageOptions).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}</SelectContent>
                                                                </Select>
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 2: Goals */}
                                        {currentStep === 2 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h2 className="text-xl font-bold mb-1">{t.goalsTitle}</h2>
                                                    <p className="text-sm text-muted-foreground">{t.goalsDescription}</p>
                                                </div>
                                                <div className="grid gap-5">
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="goals_2026" className={errors.goals_2026 ? "text-destructive" : ""}>{t.goals}</Label>
                                                            <VoiceInput value={watchAll.goals_2026} onChange={(v) => setValue("goals_2026", v)} lang={watchAll.preferred_language} />
                                                        </div>
                                                        <Textarea id="goals_2026" {...register("goals_2026")} rows={4} />
                                                        <p className="text-xs text-muted-foreground">{t.goalsHint}</p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="pain_points" className={errors.pain_points ? "text-destructive" : ""}>{t.pains}</Label>
                                                            <VoiceInput value={watchAll.pain_points} onChange={(v) => setValue("pain_points", v)} lang={watchAll.preferred_language} />
                                                        </div>
                                                        <Textarea id="pain_points" {...register("pain_points")} rows={4} />
                                                        <p className="text-xs text-muted-foreground">{t.painsHint}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 3: Context */}
                                        {currentStep === 3 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h2 className="text-xl font-bold mb-1">{t.contextTitle}</h2>
                                                    <p className="text-sm text-muted-foreground">{t.contextDescription}</p>
                                                </div>
                                                <div className="grid gap-5">
                                                    <div className="grid gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <Label htmlFor="raw_onboarding_text">{t.contextLabel}</Label>
                                                            <VoiceInput value={watchAll.raw_onboarding_text} onChange={(v) => setValue("raw_onboarding_text", v)} lang={watchAll.preferred_language} />
                                                        </div>
                                                        <Textarea id="raw_onboarding_text" {...register("raw_onboarding_text")} rows={8} className="resize-none" />
                                                        <p className="text-xs text-muted-foreground">{t.contextHint}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 4: Niches */}
                                        {currentStep === 4 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <h2 className="text-xl font-bold mb-1">{t.nichesTitle}</h2>
                                                    <p className="text-sm text-muted-foreground">{t.nichesDescription}</p>
                                                </div>

                                                {analyzingNiches ? (
                                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                                        <p className="text-sm text-muted-foreground font-medium">{t.nichesLoading}</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {suggestedNiches.map((niche, index) => (
                                                            <div key={index} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-sm hover:border-primary/50 transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold">{niche.name}</p>
                                                                    {niche.reasoning && <p className="text-xs text-muted-foreground mt-0.5 truncate">{niche.reasoning}</p>}
                                                                </div>
                                                                <button type="button" onClick={() => toggleRelevance(index)} className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${niche.relevance === "primary" ? "bg-primary/15 text-primary hover:bg-primary/25" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                                                    {niche.relevance === "primary" ? t.nichesPrimary : t.nichesSecondary}
                                                                </button>
                                                                <button type="button" onClick={() => removeNiche(index)} className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {suggestedNiches.length === 0 && <p className="text-sm text-amber-600 text-center py-6">{t.nichesEmpty}</p>}

                                                        <div className="flex gap-2 mt-4">
                                                            <Input value={newNicheName} onChange={(e) => setNewNicheName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNiche())} placeholder={t.nichesAddPlaceholder} className="flex-1" />
                                                            <Button type="button" variant="outline" size="sm" onClick={addNiche} disabled={!newNicheName.trim()} className="gap-1 shrink-0 px-4">
                                                                <Plus className="h-4 w-4" /> {t.nichesAdd}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60">
                                    <Button type="button" variant="ghost" onClick={() => setCurrentStep(s => Math.max(s - 1, 0))} disabled={currentStep === 0 || analyzingNiches} className="gap-2">
                                        <ArrowLeft className="h-4 w-4" /> {t.back}
                                    </Button>
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {t.stepOf(currentStep + 1, steps.length)}
                                    </span>
                                    {currentStep < 3 ? (
                                        <Button type="button" onClick={handleNext} className="gap-2 shadow-sm rounded-full px-6">
                                            {t.next} <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    ) : currentStep === 3 ? (
                                        <Button type="button" onClick={handleNext} disabled={analyzingNiches} className="gap-2 shadow-sm rounded-full px-6">
                                            {analyzingNiches ? t.nichesLoading : t.next}
                                            {analyzingNiches ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={handleFinish} disabled={loading || suggestedNiches.length === 0} className="gap-2 shadow-sm rounded-full px-6 bg-emerald-600 hover:bg-emerald-700 text-white">
                                            {loading ? t.saving : t.finish} <Sparkles className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </form>
                    </FormProvider>
                </div>
            </div>

            {/* Right Column: dynamic background & Preview */}
            <div className="hidden lg:flex w-full items-center justify-center p-8 relative">
                <OnboardingPreview watchValues={watchAll} t={t} nichesCount={suggestedNiches.length} isAnalyzing={analyzingNiches} />
            </div>
        </div>
    );
}
