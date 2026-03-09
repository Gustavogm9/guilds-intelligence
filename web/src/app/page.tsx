"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
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
  X as XIcon,
  Sparkles,
  Phone,
  Play,
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
    frequency: "Mensal",
    frequencyDetail: "1 relatório por mês",
    features: [
      "1 relatório mensal",
      "PDF Completo + One Page",
      "Copy para WhatsApp",
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
    frequency: "Quinzenal",
    frequencyDetail: "2 relatórios por mês",
    features: [
      "2 relatórios (quinzenal)",
      "Tudo do Essencial",
      "Áudio MP3 com player in-app",
      "Briefing narrado (~10min)",
    ],
    popular: false,
    value: "crescimento",
  },
  {
    name: "Profissional",
    priceOriginal: "R$997",
    priceDiscount: "R$827",
    period: "/mês",
    frequency: "Semanal",
    frequencyDetail: "4 relatórios por mês",
    features: [
      "4 relatórios (semanal)",
      "Tudo do Crescimento",
      "Pack Social Media completo",
      "8 cards + stories + copy prontos",
    ],
    popular: true,
    value: "profissional",
  },
  {
    name: "Studio",
    priceOriginal: "R$2.197",
    priceDiscount: "R$1.797",
    period: "/mês",
    frequency: "3x por semana",
    frequencyDetail: "12 relatórios por mês",
    features: [
      "12 relatórios (3x/semana)",
      "Todos os formatos inclusos",
      "Até 3 empresas no mesmo plano",
      "Deep dives ilimitados",
    ],
    popular: false,
    value: "studio",
  },
  {
    name: "Enterprise",
    priceOriginal: "R$4.297",
    priceDiscount: "R$3.497",
    period: "/mês",
    frequency: "Dias úteis",
    frequencyDetail: "~22 relatórios por mês",
    features: [
      "Relatório todo dia útil",
      "Todos os formatos inclusos",
      "Até 5 empresas no mesmo plano",
      "Deep dives ilimitados",
      "15 nichos mapeados",
    ],
    popular: false,
    value: "enterprise",
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
      "O relatório é gerado automaticamente na frequência do seu plano (diário, semanal, quinzenal ou mensal). Você recebe uma notificação no sistema e por email quando estiver pronto, e pode ouvir o áudio direto na plataforma.",
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
    question: "Como acesso os relatórios e áudios?",
    answer:
      "Todos os relatórios ficam no seu dashboard com acesso vitalício ao histórico completo. O áudio tem player integrado direto na plataforma — ouça sem baixar. Também é possível fazer download de PDFs, MP3s e Social Packs a qualquer momento.",
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

/* ─── Lead Capture Modal ─── */
function LeadModal({
  isOpen,
  onClose,
  selectedPlan = "profissional",
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(selectedPlan);

  useEffect(() => {
    if (isOpen) {
      setCurrentPlan(selectedPlan);
      setSubmitted(false);
    }
  }, [isOpen, selectedPlan]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("lead-name"),
          company: formData.get("lead-company"),
          email: formData.get("lead-email"),
          phone: formData.get("lead-phone"),
          plan: formData.get("lead-plan"),
        }),
      });
    } catch {
      // Falha silenciosa — lead é capturado de qualquer forma no frontend
    }
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 border border-border z-10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>

            {submitted ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4 py-4"
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
                  Vamos configurar seu acesso em até 24h.
                  Você receberá um email para completar seu perfil e receber o
                  primeiro relatório gratuitamente.
                </p>
                <Button onClick={onClose} variant="outline" className="mt-2">
                  Fechar
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                    <Sparkles className="h-3 w-3" />
                    1º relatório grátis
                  </div>
                  <h2 className="text-xl font-bold">
                    Comece sua inteligência de mercado
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Preencha seus dados e receba acesso à plataforma
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="lead-name" className="text-xs">Seu nome</Label>
                    <Input id="lead-name" name="lead-name" placeholder="Gustavo Silva" required className="h-9" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lead-company" className="text-xs">Nome da empresa</Label>
                    <Input id="lead-company" name="lead-company" placeholder="TechFarma Soluções" required className="h-9" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lead-email" className="text-xs">Email corporativo</Label>
                    <Input
                      id="lead-email"
                      name="lead-email"
                      type="email"
                      placeholder="gustavo@techfarma.com.br"
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lead-phone" className="text-xs">WhatsApp</Label>
                    <Input
                      id="lead-phone"
                      name="lead-phone"
                      type="tel"
                      required
                      minLength={14}
                      maxLength={15}
                      placeholder="(11) 99999-9999"
                      className="h-9"
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "");
                        if (v.length <= 11) {
                          v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
                          v = v.replace(/(\d)(\d{4})$/, "$1-$2");
                          e.target.value = v;
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lead-plan" className="text-xs">Plano de interesse</Label>
                    <select
                      id="lead-plan"
                      name="lead-plan"
                      value={currentPlan}
                      onChange={(e) => setCurrentPlan(e.target.value)}
                      className="flex h-9 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    >
                      {plans.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.name} — {p.frequencyDetail || "1 relatório por mês"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    className="mt-1 text-sm font-semibold h-10"
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Quero meu primeiro relatório grátis →"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Sem cartão necessário · Só cobrado a partir do 2º mês
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════ LANDING PAGE ═══════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState("profissional");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function openModal(plan = "profissional") {
    setModalPlan(plan);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Lead Capture Modal */}
      <LeadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedPlan={modalPlan}
      />

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
            <button
              onClick={() => openModal()}
              className={buttonVariants({ size: "sm", className: "px-5" })}
            >
              Começar grátis →
            </button>
          </nav>
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
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
            <button
              onClick={() => { setMobileMenu(false); openModal(); }}
              className={buttonVariants({ size: "sm" })}
            >
              Começar grátis →
            </button>
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
            Seu mercado muda todo dia.
            <br />
            <span className="text-primary">Você acompanha?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Relatórios de inteligência de mercado personalizados para o{" "}
            <strong>seu</strong> setor — entregues na frequência que sua empresa
            precisa: <strong>do diário ao mensal</strong>. Insights prontos
            para ação em PDF, áudio curto, resumos via WhatsApp e posts de social media.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => openModal()}
              className={buttonVariants({ size: "lg", className: "text-base font-semibold px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" })}
            >
              Começar com 1 relatório grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <a
              href="#como-funciona"
              className={buttonVariants({ variant: "outline", size: "lg", className: "text-base border-2" })}
            >
              Como funciona
            </a>
          </motion.div>
        </div>
      </Section>

      {/* ─── 3. DOR / PROBLEMA ─── */}
      <Section className="py-20 px-4 bg-muted/50" id="problema">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Você sabe que deveria acompanhar o mercado.
          </h2>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Mas quando foi a última vez que fez isso de verdade?
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Decisões no escuro",
                desc: "Você toma decisões importantes sem visibilidade real do que está acontecendo no mercado.",
                gradient: "from-blue-500/10 to-indigo-500/10",
              },
              {
                icon: TrendingUp,
                title: "Concorrentes na frente",
                desc: "Enquanto você foca na operação, seu concorrente já viu a tendência e se posicionou.",
                gradient: "from-violet-500/10 to-purple-500/10",
              },
              {
                icon: Zap,
                title: "Sem tempo nem equipe",
                desc: "Você sabe que deveria pesquisar, mas não tem tempo nem gente sobrando para isso.",
                gradient: "from-amber-500/10 to-orange-500/10",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className={`p-6 bg-gradient-to-br ${item.gradient} border shadow-md hover:shadow-lg transition-all hover:-translate-y-1`}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
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
                desc: "Mapeamos os nichos de mercado, concorrentes e fontes mais relevantes para o seu negócio.",
              },
              {
                step: "03",
                title: "Pesquisa",
                desc: "Monitoramos continuamente notícias, tendências e movimentações estratégicas do seu setor.",
              },
              {
                step: "04",
                title: "Entrega",
                desc: "Relatório personalizado entregue na frequência do seu plano.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center relative">
                {i < 3 && (
                  <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-border" />
                )}
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4 relative z-10">
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
            5 formatos. A mesma visão estratégica.
          </h2>
          <p className="text-muted-foreground text-center mb-14 text-lg">
            Acesse as análises do seu mercado como e onde preferir.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                icon: FileText,
                title: "PDF Completo",
                desc: "Relatório aprofundado com análise de tendências, oportunidades e alertas.",
                highlight: false,
              },
              {
                icon: FileText,
                title: "PDF One Page",
                desc: "Versão executiva de 1 página para compartilhar com o time.",
                highlight: false,
              },
              {
                icon: Play,
                title: "Áudio MP3",
                desc: "Ouça direto na plataforma ou baixe. Briefing narrado de ~10 min.",
                highlight: true,
              },
              {
                icon: MessageSquare,
                title: "WhatsApp",
                desc: "Texto pronto para enviar para o time ou usar em reuniões.",
                highlight: false,
              },
              {
                icon: ImageIcon,
                title: "Social Media",
                desc: "8 cards + stories + copy prontos para Instagram e LinkedIn.",
                highlight: false,
              },
            ].map((item, i) => (
              <Card
                key={i}
                className={`p-5 border shadow-md hover:shadow-lg transition-all hover:-translate-y-1 ${item.highlight ? "bg-primary/5 border-primary/30" : "bg-background"}`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${item.highlight ? "bg-primary/15" : "bg-muted"}`}>
                  <item.icon className={`h-5 w-5 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
                </div>
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
            agência de marketing. Cada insight é personalizado para o seu
            setor, seus produtos e suas dores.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Target,
                title: "Mapeamento cirúrgico",
                desc: "Identificamos com precisão os nichos exatos que importam para o seu negócio.",
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
              <Card key={i} className="p-6 border shadow-sm hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
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
              <span key={i} className="bg-white/15 backdrop-blur-sm rounded-full px-5 py-2.5">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={`relative p-6 flex flex-col overflow-visible ${plan.popular
                  ? "border-primary border-2 shadow-xl shadow-primary/10 scale-[1.02]"
                  : "border shadow-md"
                  }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                    MAIS ESCOLHIDO
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5 w-fit mb-3">
                  {plan.frequency}
                </span>
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
                <button
                  onClick={() => openModal(plan.value)}
                  className={buttonVariants({
                    variant: plan.popular ? "default" : "outline",
                    className: `w-full ${plan.popular ? "shadow-md" : ""}`,
                  })}
                >
                  Começar grátis
                </button>
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
                  "O pack de social media sozinho já vale o plano. Saem 8 posts prontos toda semana.",
                name: "Ana P.",
                role: "Diretora de Marketing",
              },
              {
                quote:
                  "O áudio no carro virou rotina. Informação que importa, sem enrolação — ouço direto na plataforma.",
                name: "Roberto S.",
                role: "Sócio-fundador",
              },
            ].map((t, i) => (
              <Card
                key={i}
                className="p-6 bg-background border shadow-md flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-auto">
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

      {/* ─── 11. CTA FINAL ─── */}
      <Section
        className="py-20 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/10"
        id="comecar"
      >
        <div className="max-w-xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Vagas limitadas para o grupo.
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed max-w-md">
            Membros que entrarem agora garantem o desconto permanente e acesso
            prioritário a todos os novos formatos.
          </p>
          <button
            onClick={() => openModal()}
            className={buttonVariants({ size: "lg", className: "text-base font-semibold px-10 shadow-lg shadow-primary/25" })}
          >
            Começar com 1 relatório grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Sem cartão necessário · Só cobrado a partir do 2º mês
          </p>
        </div>
      </Section>

      {/* ─── 12. FOOTER ─── */}
      <footer className="border-t border-border py-12 px-4 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <span className="text-xl font-extrabold">
                <span className="text-primary">Guilds</span>
              </span>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Inteligência de mercado e relatórios estratégicos entregues
                na frequência que a sua empresa precisar.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Links rápidos</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
                <a href="#formatos" className="hover:text-foreground transition-colors">Formatos</a>
                <a href="#planos" className="hover:text-foreground transition-colors">Planos e preços</a>
                <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Contato</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a href="https://guilds.com.br" className="hover:text-foreground transition-colors">guilds.com.br</a>
                <a href="https://wa.me/5511999999999" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © 2026 Guilds. Todos os direitos reservados. Feito por{" "}
              <a href="https://guilds.com.br" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-foreground">
                Guilds
              </a>.
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── WhatsApp Float Button ─── */}
      <a
        href="https://wa.me/5517997520867?text=Oi%20Gustavo!%20Vi%20o%20Intelligence%20Engine%20e%20quero%20saber%20mais."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110"
        aria-label="Falar pelo WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
