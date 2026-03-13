"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    FileText,
    Globe2,
    ImageIcon,
    MessageSquare,
    Play,
    Sparkles,
    TrendingUp,
    X as XIcon,
} from "lucide-react";

import { trackEvent } from "@/lib/tracking";
import { AppLocale } from "@/lib/i18n";
import { usePublicLocale } from "@/lib/public-i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = {
    value: string;
    name: string;
    badge: string;
    originalPrice: string;
    discountedPrice: string;
    period: string;
    features: string[];
    popular?: boolean;
};

type Faq = {
    question: string;
    answer: string;
};

function getCopy(locale: AppLocale) {
    if (locale === "en-US") {
        return {
            nav: {
                product: "Product",
                formats: "Formats",
                plans: "Plans",
                faq: "FAQ",
                signIn: "Sign in",
                start: "Start free",
                language: "Language",
            },
            hero: {
                eyebrow: "AI-powered market intelligence",
                title: "One strategic report. Multiple ready-to-use formats.",
                description: "Guilds turns your business context into recurring intelligence with PDF, one-page summary, WhatsApp copy, audio briefing, and a social pack.",
                primary: "Get my first report free",
                secondary: "See plans",
                proof: "Your first report is free. Billing starts only in month two.",
            },
            metrics: [
                { label: "Formats per delivery", value: "5+" },
                { label: "Recurring plans", value: "Daily to monthly" },
                { label: "Main use case", value: "Actionable market clarity" },
            ],
            howTitle: "How it works",
            howSubtitle: "A simple operating model for a recurring intelligence product.",
            how: [
                {
                    title: "You share your context",
                    body: "We capture sector, products, goals, pain points, tone, and business context during onboarding.",
                },
                {
                    title: "The system maps your niches",
                    body: "The engine prioritizes the most relevant niches, risks, opportunities, and Guilds recommendations for your company.",
                },
                {
                    title: "You receive usable outputs",
                    body: "Each delivery can include PDF, one-page summary, WhatsApp copy, audio briefing, and a social media pack.",
                },
            ],
            formatsTitle: "Built for how teams actually consume intelligence",
            formats: [
                "Full PDF for strategic reading",
                "One-page summary for quick alignment",
                "WhatsApp copy for distribution",
                "Audio briefing for executive consumption",
                "Social pack for content execution",
            ],
            plansTitle: "Plans with recurring intelligence",
            plansSubtitle: "Choose the cadence that matches your operating rhythm.",
            faqTitle: "Frequently asked questions",
            finalTitle: "Start with your first report free",
            finalBody: "Create your account, complete onboarding, and let the platform prepare the first delivery tailored to your company.",
            finalCta: "Create account",
            footer: {
                body: "Market intelligence and strategic reports delivered at the cadence your company needs.",
                links: "Quick links",
                privacy: "Privacy Policy",
                terms: "Terms of Use",
                contact: "Contact",
            },
            modal: {
                eyebrow: "First report free",
                title: "Start your intelligence workspace",
                description: "Share your data and we will take you to account creation next.",
                successTitle: "Details received",
                successBody: "Your information has been saved. We are taking you to account creation now.",
                name: "Your name",
                company: "Company name",
                email: "Work email",
                whatsapp: "WhatsApp",
                plan: "Plan of interest",
                submit: "Get my first report free",
                submitting: "Sending...",
                instant: "No credit card required • Billing starts only in month two",
                createNow: "Create my account now",
            },
            faq: [] as Faq[],
            plans: [] as Plan[],
        };
    }

    return {
        nav: {
            product: "Produto",
            formats: "Formatos",
            plans: "Planos",
            faq: "FAQ",
            signIn: "Entrar",
            start: "Começar grátis",
            language: "Idioma",
        },
        hero: {
            eyebrow: "Inteligência de mercado com IA",
            title: "Um relatório estratégico. Vários formatos prontos para uso.",
            description: "A Guilds transforma o contexto da sua empresa em inteligência recorrente com PDF, one-page, copy para WhatsApp, áudio briefing e social pack.",
            primary: "Quero meu primeiro relatório grátis",
            secondary: "Ver planos",
            proof: "Seu primeiro relatório é grátis. A cobrança só começa no segundo mês.",
        },
        metrics: [
            { label: "Formatos por entrega", value: "5+" },
            { label: "Planos recorrentes", value: "Diário ao mensal" },
            { label: "Uso principal", value: "Clareza acionável de mercado" },
        ],
        howTitle: "Como funciona",
        howSubtitle: "Um modelo simples para operar inteligência recorrente como produto.",
        how: [
            {
                title: "Você compartilha seu contexto",
                body: "No onboarding capturamos setor, produtos, objetivos, dores, tom e contexto do negócio.",
            },
            {
                title: "O sistema mapeia seus nichos",
                body: "A engine prioriza nichos, riscos, oportunidades e recomendações Guilds mais relevantes para sua empresa.",
            },
            {
                title: "Você recebe entregas utilizáveis",
                body: "Cada entrega pode incluir PDF, one-page, texto para WhatsApp, áudio briefing e social pack.",
            },
        ],
        formatsTitle: "Feito para o jeito real que equipes consomem inteligência",
        formats: [
            "PDF completo para leitura estratégica",
            "One-page para alinhamento rápido",
            "Copy para WhatsApp para distribuição",
            "Áudio briefing para executivos",
            "Social pack para execução de conteúdo",
        ],
        plansTitle: "Planos com inteligência recorrente",
        plansSubtitle: "Escolha a cadência que combina com a sua operação.",
        faqTitle: "Perguntas frequentes",
        finalTitle: "Comece com seu primeiro relatório grátis",
        finalBody: "Crie sua conta, complete o onboarding e deixe a plataforma preparar a primeira entrega sob medida para a sua empresa.",
        finalCta: "Criar conta",
        footer: {
            body: "Inteligência de mercado e relatórios estratégicos entregues na frequência que sua empresa precisa.",
            links: "Links rápidos",
            privacy: "Política de Privacidade",
            terms: "Termos de Uso",
            contact: "Contato",
        },
        modal: {
            eyebrow: "1º relatório grátis",
            title: "Comece sua área de inteligência",
            description: "Preencha seus dados e vamos te levar para a criação da conta em seguida.",
            successTitle: "Dados recebidos",
            successBody: "Seus dados foram salvos. Vamos te levar para criar sua conta agora.",
            name: "Seu nome",
            company: "Nome da empresa",
            email: "Email corporativo",
            whatsapp: "WhatsApp",
            plan: "Plano de interesse",
            submit: "Quero meu primeiro relatório grátis",
            submitting: "Enviando...",
            instant: "Sem cartão necessário • Cobrança só a partir do segundo mês",
            createNow: "Criar minha conta agora",
        },
        faq: [] as Faq[],
        plans: [] as Plan[],
    };
}

function FaqItem({ faq }: { faq: Faq }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-border">
            <button
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between py-5 text-left text-base font-medium hover:text-primary transition-colors"
            >
                {faq.question}
                <span className="text-muted-foreground">{open ? "-" : "+"}</span>
            </button>
            {open ? (
                <p className="pb-5 text-muted-foreground leading-relaxed">{faq.answer}</p>
            ) : null}
        </div>
    );
}

function LeadModal({
    isOpen,
    onClose,
    selectedPlan,
    locale,
    plans,
}: {
    isOpen: boolean;
    onClose: () => void;
    selectedPlan: string;
    locale: AppLocale;
    plans: Plan[];
}) {
    const t = getCopy(locale);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(selectedPlan);

    useEffect(() => {
        setCurrentPlan(selectedPlan);
    }, [selectedPlan]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const leadName = String(formData.get("lead-name") || "");
        const email = String(formData.get("lead-email") || "");
        const plan = String(formData.get("lead-plan") || currentPlan);

        try {
            await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: leadName,
                    company: formData.get("lead-company"),
                    email,
                    phone: formData.get("lead-phone"),
                    plan,
                }),
            });
        } catch {
            // Ignore lead API errors here and keep the UX moving.
        }

        setSubmitted(true);
        setLoading(false);
        trackEvent("lead_submit", { plan, email, language: locale });
        setTimeout(() => {
            window.location.href = `/signup?lang=${encodeURIComponent(locale)}&plan=${encodeURIComponent(plan)}&email=${encodeURIComponent(email)}&name=${encodeURIComponent(leadName)}`;
        }, 1200);
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 border border-border z-10">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <XIcon className="h-5 w-5" />
                </button>

                {submitted ? (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <CheckCircle2 className="h-14 w-14 text-green-500" />
                        <h3 className="text-2xl font-bold">{t.modal.successTitle}</h3>
                        <p className="text-muted-foreground text-sm">{t.modal.successBody}</p>
                        <Button
                            onClick={() => {
                                window.location.href = `/signup?lang=${encodeURIComponent(locale)}&plan=${encodeURIComponent(currentPlan)}`;
                            }}
                        >
                            {t.modal.createNow}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                                <Sparkles className="h-3 w-3" />
                                {t.modal.eyebrow}
                            </div>
                            <h2 className="text-xl font-bold">{t.modal.title}</h2>
                            <p className="text-sm text-muted-foreground mt-1">{t.modal.description}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="grid gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="lead-name" className="text-xs">{t.modal.name}</Label>
                                <Input id="lead-name" name="lead-name" required className="h-9" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="lead-company" className="text-xs">{t.modal.company}</Label>
                                <Input id="lead-company" name="lead-company" required className="h-9" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="lead-email" className="text-xs">{t.modal.email}</Label>
                                <Input id="lead-email" name="lead-email" type="email" required className="h-9" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="lead-phone" className="text-xs">{t.modal.whatsapp}</Label>
                                <Input id="lead-phone" name="lead-phone" type="tel" required className="h-9" />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="lead-plan" className="text-xs">{t.modal.plan}</Label>
                                <select
                                    id="lead-plan"
                                    name="lead-plan"
                                    value={currentPlan}
                                    onChange={(e) => setCurrentPlan(e.target.value)}
                                    className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                                >
                                    {plans.map((plan) => (
                                        <option key={plan.value} value={plan.value}>
                                            {plan.name} - {plan.badge}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" className="mt-1 text-sm font-semibold h-10" disabled={loading}>
                                {loading ? t.modal.submitting : t.modal.submit}
                            </Button>
                            <p className="text-[11px] text-muted-foreground text-center">{t.modal.instant}</p>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

function LandingPageContent() {
    const locale = usePublicLocale();
    const base = useMemo(() => getCopy(locale), [locale]);
    const content = useMemo(() => {
        if (locale === "en-US") {
            return {
                ...base,
                faq: [
                    {
                        question: "How is the report personalized?",
                        answer: "Your onboarding context shapes the niches, opportunities, warnings, recommendations, and output tone.",
                    },
                    {
                        question: "What do I get with the first free report?",
                        answer: "You create an account, complete onboarding, and receive the first delivery before any subscription billing starts.",
                    },
                    {
                        question: "How do I access reports later?",
                        answer: "Everything stays available in your dashboard, including PDFs, audio, WhatsApp copy, and the social pack.",
                    },
                ] as Faq[],
                plans: [
                    {
                        value: "essencial",
                        name: "Essencial",
                        badge: "Monthly",
                        originalPrice: "$59",
                        discountedPrice: "$49",
                        period: "/month",
                        features: ["1 monthly report", "Full PDF + one-page summary", "WhatsApp copy", "AI niche mapping"],
                    },
                    {
                        value: "crescimento",
                        name: "Crescimento",
                        badge: "Biweekly",
                        originalPrice: "$119",
                        discountedPrice: "$99",
                        period: "/month",
                        features: ["2 reports per month", "Everything in Essencial", "Audio briefing", "Operational next steps"],
                    },
                    {
                        value: "profissional",
                        name: "Profissional",
                        badge: "Weekly",
                        originalPrice: "$199",
                        discountedPrice: "$169",
                        period: "/month",
                        features: ["4 reports per month", "Everything in Crescimento", "Complete social pack", "Higher operating cadence"],
                        popular: true,
                    },
                    {
                        value: "studio",
                        name: "Studio",
                        badge: "3x a week",
                        originalPrice: "$439",
                        discountedPrice: "$359",
                        period: "/month",
                        features: ["12 reports per month", "All formats included", "Up to 3 companies", "Unlimited deep dives"],
                    },
                ] as Plan[],
            };
        }

        return {
            ...base,
            faq: [
                {
                    question: "Como o relatório é personalizado?",
                    answer: "O contexto do onboarding guia nichos, oportunidades, alertas, recomendações e o tom da entrega.",
                },
                {
                    question: "Como funciona o primeiro relatório grátis?",
                    answer: "Você cria a conta, completa o onboarding e recebe a primeira entrega antes de qualquer cobrança da assinatura.",
                },
                {
                    question: "Como acesso os relatórios depois?",
                    answer: "Tudo fica disponível no seu dashboard, incluindo PDFs, áudio, copy para WhatsApp e social pack.",
                },
            ] as Faq[],
            plans: [
                {
                    value: "essencial",
                    name: "Essencial",
                    badge: "Mensal",
                    originalPrice: "R$297",
                    discountedPrice: "R$247",
                    period: "/mês",
                    features: ["1 relatório mensal", "PDF completo + one-page", "Copy para WhatsApp", "Mapeamento de nichos por IA"],
                },
                {
                    value: "crescimento",
                    name: "Crescimento",
                    badge: "Quinzenal",
                    originalPrice: "R$597",
                    discountedPrice: "R$497",
                    period: "/mês",
                    features: ["2 relatórios por mês", "Tudo do Essencial", "Áudio briefing", "Próximos passos operacionais"],
                },
                {
                    value: "profissional",
                    name: "Profissional",
                    badge: "Semanal",
                    originalPrice: "R$997",
                    discountedPrice: "R$827",
                    period: "/mês",
                    features: ["4 relatórios por mês", "Tudo do Crescimento", "Social pack completo", "Cadência mais forte de operação"],
                    popular: true,
                },
                {
                    value: "studio",
                    name: "Studio",
                    badge: "3x por semana",
                    originalPrice: "R$2.197",
                    discountedPrice: "R$1.797",
                    period: "/mês",
                    features: ["12 relatórios por mês", "Todos os formatos inclusos", "Até 3 empresas", "Deep dives ilimitados"],
                },
            ] as Plan[],
        };
    }, [base, locale]);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalPlan, setModalPlan] = useState("profissional");

    function openModal(plan = "profissional") {
        setModalPlan(plan);
        setModalOpen(true);
        trackEvent("modal_open", { plan, language: locale });
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(234,88,12,0.10),_transparent_40%),linear-gradient(180deg,_rgba(255,247,237,0.65),_transparent_40%)]">
            <LeadModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                selectedPlan={modalPlan}
                locale={locale}
                plans={content.plans}
            />

            <header className="sticky top-0 z-40 backdrop-blur border-b border-border/70 bg-background/85">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-6">
                    <Link href="/" className="text-xl font-extrabold text-primary">Guilds</Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                        <a href="#produto" className="hover:text-foreground">{content.nav.product}</a>
                        <a href="#formatos" className="hover:text-foreground">{content.nav.formats}</a>
                        <a href="#planos" className="hover:text-foreground">{content.nav.plans}</a>
                        <a href="#faq" className="hover:text-foreground">{content.nav.faq}</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                            <Globe2 className="h-3.5 w-3.5" />
                            <span>{content.nav.language}</span>
                            <Link href="/?lang=pt-BR" className={locale === "pt-BR" ? "text-primary font-medium" : ""}>PT</Link>
                            <span>/</span>
                            <Link href="/?lang=en-US" className={locale === "en-US" ? "text-primary font-medium" : ""}>EN</Link>
                        </div>
                        <Link href={`/login?lang=${encodeURIComponent(locale)}`} className={buttonVariants({ variant: "ghost" })}>
                            {content.nav.signIn}
                        </Link>
                        <button onClick={() => openModal()} className={buttonVariants()}>
                            {content.nav.start}
                        </button>
                    </div>
                </div>
            </header>

            <main>
                <section id="produto" className="px-4 pt-20 pb-16">
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5">
                                <Sparkles className="h-3.5 w-3.5" />
                                {content.hero.eyebrow}
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-4xl leading-[0.95]">
                                {content.hero.title}
                            </h1>
                            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                                {content.hero.description}
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <button onClick={() => openModal()} className={buttonVariants({ size: "lg", className: "shadow-lg shadow-primary/20" })}>
                                    {content.hero.primary}
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </button>
                                <a href="#planos" className={buttonVariants({ size: "lg", variant: "outline" })}>
                                    {content.hero.secondary}
                                </a>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">{content.hero.proof}</p>
                        </div>

                        <Card className="p-8 border-primary/15 shadow-xl shadow-primary/5">
                            <div className="grid gap-4">
                                {[
                                    { icon: FileText, title: "PDF", body: content.formats[0] },
                                    { icon: TrendingUp, title: "One-page", body: content.formats[1] },
                                    { icon: MessageSquare, title: "WhatsApp", body: content.formats[2] },
                                    { icon: Play, title: "Audio", body: content.formats[3] },
                                    { icon: ImageIcon, title: "Social", body: content.formats[4] },
                                ].map((item) => (
                                    <div key={item.title} className="rounded-2xl border bg-background/70 p-4 flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </section>

                <section className="px-4 pb-16">
                    <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-4">
                        {content.metrics.map((metric) => (
                            <Card key={metric.label} className="p-6">
                                <p className="text-sm text-muted-foreground">{metric.label}</p>
                                <p className="text-2xl font-black mt-2">{metric.value}</p>
                            </Card>
                        ))}
                    </div>
                </section>

                <section className="py-20 px-4 bg-muted/40">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">{content.howTitle}</h2>
                        <p className="text-muted-foreground text-center mb-12 text-lg">{content.howSubtitle}</p>
                        <div className="grid md:grid-cols-3 gap-6">
                            {content.how.map((item, index) => (
                                <Card key={item.title} className="p-6">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mb-4">
                                        {index + 1}
                                    </div>
                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                    <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{item.body}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="formatos" className="py-20 px-4">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">{content.formatsTitle}</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {content.formats.map((format) => (
                                <Card key={format} className="p-5 flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                    <p className="text-sm text-muted-foreground">{format}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="planos" className="py-20 px-4 bg-muted/40">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">{content.plansTitle}</h2>
                        <p className="text-muted-foreground text-center mb-12 text-lg">{content.plansSubtitle}</p>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            {content.plans.map((plan) => (
                                <Card key={plan.value} className={`relative p-6 flex flex-col ${plan.popular ? "border-primary border-2 shadow-xl shadow-primary/10" : "border shadow-sm"}`}>
                                    {plan.popular ? (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full">
                                            Popular
                                        </span>
                                    ) : null}
                                    <div className="mb-4">
                                        <p className="font-bold text-lg">{plan.name}</p>
                                        <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 inline-flex mt-2">
                                            {plan.badge}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <span className="text-sm text-muted-foreground line-through">{plan.originalPrice}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-extrabold">{plan.discountedPrice}</span>
                                            <span className="text-muted-foreground text-sm">{plan.period}</span>
                                        </div>
                                    </div>
                                    <ul className="flex-1 space-y-2.5 mb-6">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => openModal(plan.value)}
                                        className={buttonVariants({
                                            variant: plan.popular ? "default" : "outline",
                                            className: "w-full",
                                        })}
                                    >
                                        {content.nav.start}
                                    </button>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="faq" className="py-20 px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">{content.faqTitle}</h2>
                        {content.faq.map((faq) => (
                            <FaqItem key={faq.question} faq={faq} />
                        ))}
                    </div>
                </section>

                <section className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10">
                    <div className="max-w-xl mx-auto text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{content.finalTitle}</h2>
                        <p className="text-muted-foreground mb-8 leading-relaxed">{content.finalBody}</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => openModal()}
                                className={buttonVariants({ size: "lg", className: "text-base font-semibold px-10 shadow-lg shadow-primary/25" })}
                            >
                                {content.hero.primary}
                            </button>
                            <Link href={`/signup?lang=${encodeURIComponent(locale)}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
                                {content.finalCta}
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border py-12 px-4 bg-card">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <span className="text-xl font-extrabold text-primary">Guilds</span>
                            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                                {content.footer.body}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-3">{content.footer.links}</h4>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <a href="#produto" className="hover:text-foreground transition-colors">{content.nav.product}</a>
                                <a href="#formatos" className="hover:text-foreground transition-colors">{content.nav.formats}</a>
                                <a href="#planos" className="hover:text-foreground transition-colors">{content.nav.plans}</a>
                                <a href="#faq" className="hover:text-foreground transition-colors">{content.nav.faq}</a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-3">{content.footer.contact}</h4>
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <a href="https://guilds.com.br" className="hover:text-foreground transition-colors">guilds.com.br</a>
                                <a href="https://wa.me/5517997520867" className="hover:text-foreground transition-colors">WhatsApp</a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-muted-foreground">
                            © 2026 Guilds. {content.footer.body}
                        </p>
                        <div className="flex gap-6 text-xs text-muted-foreground">
                            <a href="#" className="hover:text-foreground transition-colors">{content.footer.privacy}</a>
                            <a href="#" className="hover:text-foreground transition-colors">{content.footer.terms}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default function LandingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <LandingPageContent />
        </Suspense>
    );
}
