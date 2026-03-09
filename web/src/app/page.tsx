"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  FileText,
  Headphones,
  MessageSquare,
  ImageIcon,
  CheckCircle2,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Star,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─── Animated Section Wrapper ─── */
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── FAQ Accordion ─── */
function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left text-base font-medium hover:text-primary transition-colors"
      >
        {question}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-muted-foreground leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
}

/* ─── Plans data ─── */
const plans = [
  {
    name: "Essencial",
    priceOriginal: "R$297",
    priceDiscount: "R$247",
    period: "/mês",
    features: [
      "1 relatório/mês",
      "PDF Completo + One Page",
      "Copy WhatsApp",
      "Nichos mapeados por IA",
    ],
    popular: false,
    value: "essencial",
  },
  {
    name: "Crescimento",
    priceOriginal: "R$597",
    priceDiscount: "R$497",
    period: "/mês",
    features: [
      "2 relatórios/mês",
      "Tudo do Essencial",
      "Áudio MP3 briefing",
      "Relatório narrado (10min)",
    ],
    popular: false,
    value: "crescimento",
  },
  {
    name: "Profissional",
    priceOriginal: "R$997",
    priceDiscount: "R$827",
    period: "/mês",
    features: [
      "4 relatórios/mês",
      "Tudo do Crescimento",
      "Pack Social Media completo",
      "8 cards + stories + copy",
    ],
    popular: true,
    value: "profissional",
  },
  {
    name: "Studio",
    priceOriginal: "R$2.197",
    priceDiscount: "R$1.797",
    period: "/mês",
    features: [
      "12 relatórios/mês",
      "Todos os formatos",
      "Até 3 empresas no plano",
      "Deep dives ilimitados",
    ],
    popular: false,
    value: "studio",
  },
];

const faqs = [
  {
    question: "Como o relatório é personalizado para a minha empresa?",
    answer:
      "Antes de gerar qualquer relatório, você preenche um perfil detalhado da sua empresa — setor, produtos, clientes, objetivos e dores. A IA usa essas informações para mapear exatamente os nichos de mercado que fazem sentido para você. O relatório de uma HealthTech é completamente diferente do de uma construtora.",
  },
  {
    question: "Como funciona o primeiro relatório grátis?",
    answer:
      "Você assina um plano, preenche seu perfil e recebe o primeiro relatório sem nenhum custo. Só a partir do segundo mês sua assinatura é cobrada. Se não gostar, cancela antes de ser cobrado.",
  },
  {
    question: "Quanto tempo leva para eu receber o relatório?",
    answer:
      "O relatório é gerado em algumas horas após você enviar seu perfil. Você recebe uma notificação por email quando estiver pronto.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim. Sem fidelidade, sem multa. Você cancela com um clique no painel.",
  },
  {
    question: "O desconto do grupo é permanente?",
    answer:
      "O desconto é aplicado enquanto você mantiver a assinatura ativa. Se cancelar e quiser voltar, pagará o preço público.",
  },
  {
    question: "O Pack Social Media vem pronto para postar?",
    answer:
      "Sim. Você recebe as imagens em alta resolução (PNG) prontas para o Instagram/LinkedIn, mais o texto (copy) para cada card. É só escolher, copiar e postar.",
  },
  {
    question: "Quem está por trás disso?",
    answer:
      "A Guilds é uma empresa brasileira de tecnologia e IA fundada por Gustavo Macedo. Vocês já se conhecem do grupo — qualquer dúvida, pode me chamar diretamente.",
  },
];

/* ─── Lead Form ─── */
function LeadForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Simula envio (será integrado com API route)
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4 py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </motion.div>
        <h3 className="text-2xl font-bold">Dados enviados! 🎉</h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Vamos entrar em contato em até 24h para configurar seu primeiro
          relatório gratuito.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 w-full max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="lead-name">Seu nome</Label>
        <Input id="lead-name" placeholder="Gustavo Silva" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lead-company">Nome da empresa</Label>
        <Input id="lead-company" placeholder="TechFarma Soluções" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lead-email">Email corporativo</Label>
        <Input
          id="lead-email"
          type="email"
          placeholder="gustavo@techfarma.com.br"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lead-phone">WhatsApp (opcional)</Label>
        <Input id="lead-phone" placeholder="(11) 99999-9999" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="lead-plan">Plano de interesse</Label>
        <Select defaultValue="profissional">
          <SelectTrigger id="lead-plan">
            <SelectValue placeholder="Selecione um plano" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.name} — {p.priceDiscount}/mês
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        size="lg"
        className="mt-2 text-base font-semibold"
        disabled={loading}
      >
        {loading ? "Enviando..." : "Quero meu primeiro relatório grátis →"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Sem cartão necessário · Só cobrado a partir do 2º mês
      </p>
    </form>
  );
}

/* ═══════════════════════ LANDING PAGE ═══════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ─── 1. HEADER ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-extrabold tracking-tight">
            <span className="text-primary">Guilds</span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#como-funciona"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Como funciona
            </a>
            <a
              href="#formatos"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Formatos
            </a>
            <a
              href="#planos"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Planos
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
            <a href="#comecar" className={buttonVariants({ size: "sm" })}>
              Começar grátis →
            </a>
          </nav>
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-background border-b border-border px-4 pb-4 flex flex-col gap-3"
          >
            <a href="#como-funciona" className="text-sm py-2" onClick={() => setMobileMenu(false)}>Como funciona</a>
            <a href="#formatos" className="text-sm py-2" onClick={() => setMobileMenu(false)}>Formatos</a>
            <a href="#planos" className="text-sm py-2" onClick={() => setMobileMenu(false)}>Planos</a>
            <a href="#faq" className="text-sm py-2" onClick={() => setMobileMenu(false)}>FAQ</a>
            <a href="#comecar" className={buttonVariants({ size: "sm" })}>Começar grátis →</a>
          </motion.div>
        )}
      </header>

      {/* ─── 2. HERO ─── */}
      <Section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            <Sparkles className="h-4 w-4" />
            Exclusivo para membros do grupo
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            Seu mercado muda todo mês.
            <br />
            <span className="text-primary">Você acompanha?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Receba todo mês um relatório de inteligência de mercado
            personalizado para o <strong>seu</strong> setor, <strong>seus</strong>{" "}
            produtos e <strong>suas</strong> dores — gerado por IA, entregue em
            PDF, áudio, WhatsApp e social media.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="#comecar" className={buttonVariants({ size: "lg", className: "text-base font-semibold px-8" })}>
              Começar com 1 relatório grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="#como-funciona"
              className={buttonVariants({ variant: "outline", size: "lg", className: "text-base" })}
            >
              Como funciona
            </a>
          </motion.div>
        </div>
      </Section>

      {/* ─── 3. DOR / PROBLEMA ─── */}
      <Section className="py-20 px-4 bg-muted/50" id="problema">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Você sabe que deveria acompanhar o mercado.
            <br />
            <span className="text-muted-foreground font-normal text-2xl sm:text-3xl">
              Mas quando foi a última vez que fez isso de verdade?
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Decisões no escuro",
                desc: "Você toma decisões importantes sem visibilidade real do que está acontecendo no mercado.",
              },
              {
                icon: TrendingUp,
                title: "Concorrentes na frente",
                desc: "Enquanto você foca na operação, seu concorrente já viu a tendência e se posicionou.",
              },
              {
                icon: Zap,
                title: "Sem tempo nem equipe",
                desc: "Você sabe que deveria pesquisar, mas não tem tempo nem gente sobrando para isso.",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="p-6 bg-background border-none shadow-lg hover:shadow-xl transition-shadow"
              >
                <item.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 4. COMO FUNCIONA ─── */}
      <Section className="py-20 px-4" id="como-funciona">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground text-center mb-14 text-lg">
            De perfil preenchido a relatório entregue — em 4 passos.
          </p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Perfil",
                desc: "Preencha o perfil da sua empresa: setor, produtos, objetivos e dores.",
              },
              {
                step: "02",
                title: "Mapeamento",
                desc: "A IA mapeia os nichos de mercado mais relevantes para o seu negócio.",
              },
              {
                step: "03",
                title: "Pesquisa",
                desc: "Agentes de IA pesquisam notícias, tendências e movimentos do mercado.",
              },
              {
                step: "04",
                title: "Entrega",
                desc: "Relatório personalizado entregue em múltiplos formatos na sua área.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 5. FORMATOS DE ENTREGA ─── */}
      <Section className="py-20 px-4 bg-muted/50" id="formatos">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            5 formatos. Uma mesma inteligência.
          </h2>
          <p className="text-muted-foreground text-center mb-14 text-lg">
            Consuma seus insights como preferir.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                icon: FileText,
                title: "PDF Completo",
                desc: "Relatório aprofundado com análise de tendências, oportunidades e alertas.",
              },
              {
                icon: FileText,
                title: "PDF One Page",
                desc: "Versão executiva de 1 página para compartilhar com o time.",
              },
              {
                icon: Headphones,
                title: "Áudio MP3",
                desc: "Briefing narrado de ~10 min para ouvir no carro ou na academia.",
              },
              {
                icon: MessageSquare,
                title: "WhatsApp",
                desc: "Texto pronto para enviar para o time ou usar em reuniões.",
              },
              {
                icon: ImageIcon,
                title: "Social Media",
                desc: "8 cards + stories + copy prontos para Instagram e LinkedIn.",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="p-5 bg-background border-none shadow-md hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <item.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 6. DIFERENCIAL ─── */}
      <Section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Não é genérico. É <span className="text-primary">seu</span>.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            O relatório de uma HealthTech é completamente diferente do de uma
            agência de marketing. Cada insight, cada recomendação e cada alerta
            é personalizado para o seu setor, seus produtos e suas dores.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Target,
                title: "Nichos mapeados por IA",
                desc: "Nossa IA identifica os nichos exatos que importam para o seu negócio.",
              },
              {
                icon: Shield,
                title: "Alertas de mercado",
                desc: "Saiba antes da concorrência quando algo relevante muda no seu setor.",
              },
              {
                icon: Star,
                title: "Recomendações acionáveis",
                desc: "Não só tendências — recomendações concretas de como agir.",
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 border shadow-none">
                <item.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 7. OFERTA DO GRUPO ─── */}
      <Section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest opacity-80 mb-3">
            Oferta exclusiva
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Primeiro relatório grátis + desconto permanente
          </h2>
          <p className="text-lg opacity-90 max-w-xl mx-auto mb-8 leading-relaxed">
            Como membro do grupo, você recebe o primeiro relatório sem custo e
            garante desconto exclusivo enquanto mantiver a assinatura.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm font-medium">
            {["🎁 1º relatório grátis", "💰 Desconto de grupo", "🔒 Cancele quando quiser"].map((t, i) => (
              <span key={i} className="bg-white/15 backdrop-blur-sm rounded-full px-5 py-2">
                {t}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 8. PLANOS E PREÇOS ─── */}
      <Section className="py-20 px-4" id="planos">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Planos com desconto exclusivo
          </h2>
          <p className="text-muted-foreground text-center mb-12 text-lg">
            Preços especiais para membros do grupo. Permanentes.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={`relative p-6 flex flex-col ${plan.popular
                  ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border shadow-md"
                  }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    MAIS ESCOLHIDO
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground line-through">
                    {plan.priceOriginal}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">
                      {plan.priceDiscount}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {plan.period}
                    </span>
                  </div>
                </div>
                <ul className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#comecar"
                  className={buttonVariants({ variant: plan.popular ? "default" : "outline", className: "w-full" })}
                >
                  Começar grátis
                </a>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 9. PROVA SOCIAL ─── */}
      <Section className="py-20 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">
            Feito por quem você já conhece
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              {
                quote:
                  "Finalmente consigo acompanhar o que está acontecendo no meu setor sem gastar horas pesquisando.",
                name: "Carlos M.",
                role: "CEO, TechFarma",
              },
              {
                quote:
                  "O pack de social media sozinho já vale o plano. Saem 8 posts prontos todo mês.",
                name: "Ana P.",
                role: "Diretora de Marketing",
              },
              {
                quote:
                  "O áudio de 10 minutos no carro virou parte da minha rotina. Informação que importa, sem enrolação.",
                name: "Roberto S.",
                role: "Sócio-fundador",
              },
            ].map((t, i) => (
              <Card
                key={i}
                className="p-6 bg-background border-none shadow-md"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 10. FAQ ─── */}
      <Section className="py-20 px-4" id="faq">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Perguntas frequentes
          </h2>
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </Section>

      {/* ─── 11. CTA FINAL / FORMULÁRIO ─── */}
      <Section
        className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10"
        id="comecar"
      >
        <div className="max-w-xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Vagas limitadas para o grupo.
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed max-w-md">
            Membros que entrarem agora garantem o desconto permanente e acesso
            prioritário a todos os novos formatos.
          </p>
          <LeadForm />
        </div>
      </Section>

      {/* ─── 12. FOOTER ─── */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold">
            <span className="text-primary">Guilds</span>
          </span>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="https://guilds.com.br" className="hover:text-foreground transition-colors">
              guilds.com.br
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Termos de Uso
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Guilds. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ─── WhatsApp Float Button ─── */}
      <a
        href="https://wa.me/5511999999999?text=Oi%20Gustavo!%20Vi%20o%20Intelligence%20Engine%20e%20quero%20saber%20mais."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110"
        aria-label="Falar pelo WhatsApp"
      >
        <MessageSquare className="h-6 w-6" />
      </a>
    </div>
  );
}
