import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

function parseTextareaList(value: FormDataEntryValue | null) {
    return String(value || "")
        .split(/\r?\n|;/)
        .map((item) => item.trim())
        .filter(Boolean);
}

async function createClientAction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const companyName = String(formData.get("company_name") || "").trim();
    const contactName = String(formData.get("contact_name") || "").trim();
    const contactEmail = String(formData.get("contact_email") || "").trim();
    const planId = String(formData.get("plan_id") || "").trim();

    if (!companyName || !contactName || !contactEmail || !planId) {
        redirect("/admin/clients/new?error=Preencha%20empresa,%20contato,%20email%20e%20plano.");
    }

    const payload = {
        company_name: companyName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: String(formData.get("contact_phone") || "").trim() || null,
        plan_id: planId,
        industry: String(formData.get("industry") || "").trim() || null,
        company_size: String(formData.get("company_size") || "").trim() || null,
        annual_revenue: String(formData.get("annual_revenue") || "").trim() || null,
        location: String(formData.get("location") || "").trim() || null,
        description: String(formData.get("description") || "").trim() || null,
        products_services: String(formData.get("products_services") || "").trim() || null,
        target_audience: String(formData.get("target_audience") || "").trim() || null,
        goals_2026: parseTextareaList(formData.get("goals_2026")),
        pain_points: parseTextareaList(formData.get("pain_points")),
        raw_onboarding_text: String(formData.get("raw_onboarding_text") || "").trim() || null,
        scheduler_enabled: true,
        scheduler_timezone: String(formData.get("scheduler_timezone") || "").trim() || "America/Sao_Paulo",
        scheduler_window_start_hour: Number(formData.get("scheduler_window_start_hour") || 8),
        scheduler_window_end_hour: Number(formData.get("scheduler_window_end_hour") || 18),
        scheduler_business_days_only: formData.get("scheduler_business_days_only") === "on",
        is_active: true,
    };

    const { data, error } = await supabase
        .from("clients")
        .insert(payload)
        .select("id")
        .single();

    if (error || !data?.id) {
        const message = encodeURIComponent(error?.message || "Não foi possível criar o cliente.");
        redirect(`/admin/clients/new?error=${message}`);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/clients");
    redirect(`/admin/clients/${data.id}`);
}

export default async function AdminNewClientPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const { data: plans } = await supabase
        .from("plans")
        .select("id, name, price_monthly, reports_per_month")
        .eq("is_active", true)
        .order("price_monthly");

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Novo Cliente</h1>
                    <p className="text-muted-foreground mt-1">
                        Cadastro administrativo para acelerar onboarding comercial e operacao.
                    </p>
                </div>
                <Link href="/admin/clients" className={buttonVariants({ variant: "outline" })}>
                    Voltar para clientes
                </Link>
            </div>

            {params.error ? (
                <Card className="p-4 border-red-200 bg-red-50 text-red-700">
                    <p className="text-sm font-medium">{params.error}</p>
                </Card>
            ) : null}

            <form action={createClientAction} className="grid gap-6">
                <Card className="p-6">
                    <h2 className="font-bold">Dados principais</h2>
                    <div className="grid gap-4 md:grid-cols-2 mt-5">
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Empresa</Label>
                            <Input id="company_name" name="company_name" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_name">Contato</Label>
                            <Input id="contact_name" name="contact_name" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_email">Email</Label>
                            <Input id="contact_email" name="contact_email" type="email" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact_phone">WhatsApp</Label>
                            <Input id="contact_phone" name="contact_phone" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plan_id">Plano</Label>
                            <select
                                id="plan_id"
                                name="plan_id"
                                required
                                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    Selecione um plano
                                </option>
                                {plans?.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} • R$ {(plan.price_monthly / 100).toFixed(0)} • {plan.reports_per_month}/mes
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="industry">Setor</Label>
                            <Input id="industry" name="industry" placeholder="Ex: HealthTech, SaaS B2B" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Contexto do negocio</h2>
                    <div className="grid gap-4 md:grid-cols-2 mt-5">
                        <div className="space-y-2">
                            <Label htmlFor="company_size">Tamanho da empresa</Label>
                            <Input id="company_size" name="company_size" placeholder="Ex: 10-50 funcionarios" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="annual_revenue">Faturamento</Label>
                            <Input id="annual_revenue" name="annual_revenue" placeholder="Ex: R$2M-R$10M" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Localizacao</Label>
                            <Input id="location" name="location" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_audience">Público-alvo</Label>
                            <Input id="target_audience" name="target_audience" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Descrição da empresa</Label>
                            <Textarea id="description" name="description" placeholder="O que a empresa faz e em que momento está." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="products_services">Produtos e serviços</Label>
                            <Textarea id="products_services" name="products_services" placeholder="Liste a oferta principal, linhas de serviço e produtos." />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Scheduler inicial</h2>
                    <div className="grid gap-4 md:grid-cols-2 mt-5">
                        <div className="space-y-2">
                            <Label htmlFor="scheduler_timezone">Timezone</Label>
                            <Input
                                id="scheduler_timezone"
                                name="scheduler_timezone"
                                defaultValue="America/Sao_Paulo"
                            />
                        </div>
                        <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 self-end">
                            <input
                                type="checkbox"
                                name="scheduler_business_days_only"
                                defaultChecked
                                className="h-4 w-4"
                            />
                            <span className="text-sm">Restringir a dias uteis</span>
                        </label>
                        <div className="space-y-2">
                            <Label htmlFor="scheduler_window_start_hour">Inicio da janela</Label>
                            <Input
                                id="scheduler_window_start_hour"
                                name="scheduler_window_start_hour"
                                type="number"
                                min="0"
                                max="23"
                                defaultValue="8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scheduler_window_end_hour">Fim da janela</Label>
                            <Input
                                id="scheduler_window_end_hour"
                                name="scheduler_window_end_hour"
                                type="number"
                                min="0"
                                max="23"
                                defaultValue="18"
                            />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-bold">Objetivos e dores</h2>
                    <div className="grid gap-4 md:grid-cols-2 mt-5">
                        <div className="space-y-2">
                            <Label htmlFor="goals_2026">Objetivos 2026</Label>
                            <Textarea
                                id="goals_2026"
                                name="goals_2026"
                                placeholder={"Um objetivo por linha\nExpandir carteira enterprise\nAumentar previsibilidade comercial"}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pain_points">Dores atuais</Label>
                            <Textarea
                                id="pain_points"
                                name="pain_points"
                                placeholder={"Uma dor por linha\nBaixa eficiência operacional\nPouca clareza de posicionamento"}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="raw_onboarding_text">Texto bruto de onboarding</Label>
                            <Textarea
                                id="raw_onboarding_text"
                                name="raw_onboarding_text"
                                placeholder="Cole aqui o briefing livre, respostas do cliente ou notas comerciais."
                                className="min-h-40"
                            />
                        </div>
                    </div>
                </Card>

                <div className="flex items-center justify-end gap-3">
                    <Link href="/admin/clients" className={buttonVariants({ variant: "outline" })}>
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        className={buttonVariants({})}
                    >
                        Criar cliente
                    </button>
                </div>
            </form>
        </div>
    );
}
