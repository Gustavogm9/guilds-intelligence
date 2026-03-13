import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft,
    FileText,
    Building2,
    Target,
    Users,
    Calendar,
    Clock3,
} from "lucide-react";

type PlanInfo = {
    name?: string;
    reports_per_month?: number;
    price_monthly?: number;
    scheduler_default_timezone?: string | null;
    scheduler_default_window_start_hour?: number | null;
    scheduler_default_window_end_hour?: number | null;
    scheduler_default_business_days_only?: boolean | null;
    scheduler_default_weekday?: number | null;
    scheduler_default_day_of_month?: number | null;
};

type ClientRecord = {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string | null;
    industry?: string | null;
    company_size?: string | null;
    location?: string | null;
    annual_revenue?: string | null;
    plan_started_at?: string | null;
    is_active: boolean;
    raw_onboarding_text?: string | null;
    goals_2026?: string[] | null;
    pain_points?: string[] | null;
    scheduler_enabled?: boolean | null;
    scheduler_timezone?: string | null;
    scheduler_window_start_hour?: number | null;
    scheduler_window_end_hour?: number | null;
    scheduler_business_days_only?: boolean | null;
    scheduler_preferred_weekday?: number | null;
    scheduler_preferred_day_of_month?: number | null;
    scheduler_paused_until?: string | null;
    scheduler_pause_reason?: string | null;
    scheduler_blackout_start_at?: string | null;
    scheduler_blackout_end_at?: string | null;
    scheduler_blackout_reason?: string | null;
    scheduler_skip_dates?: string[] | null;
    scheduler_blackout_weekdays?: number[] | null;
    plans?: PlanInfo | PlanInfo[] | null;
};

function weekdayLabel(value: number | null | undefined) {
    const labels: Record<number, string> = {
        0: "Domingo",
        1: "Segunda",
        2: "Terca",
        3: "Quarta",
        4: "Quinta",
        5: "Sexta",
        6: "Sabado",
    };

    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "Livre";
    }

    return labels[Number(value)] || "Livre";
}

function parseCommaOrLineList(value: FormDataEntryValue | null) {
    return String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

async function updateSchedulerSettings(formData: FormData) {
    "use server";

    const clientId = String(formData.get("client_id") || "").trim();
    if (!clientId) {
        redirect("/admin/clients?error=Cliente%20inválido");
    }

    const supabase = await createClient();
    const schedulerEnabled = formData.get("scheduler_enabled") === "on";
    const timezone = String(formData.get("scheduler_timezone") || "").trim() || "America/Sao_Paulo";
    const startHour = Number(formData.get("scheduler_window_start_hour") || 8);
    const endHour = Number(formData.get("scheduler_window_end_hour") || 18);
    const businessDaysOnly = formData.get("scheduler_business_days_only") === "on";
    const preferredWeekdayValue = String(formData.get("scheduler_preferred_weekday") || "").trim();
    const preferredDayValue = String(formData.get("scheduler_preferred_day_of_month") || "").trim();
    const pausedUntilValue = String(formData.get("scheduler_paused_until") || "").trim();
    const pauseReason = String(formData.get("scheduler_pause_reason") || "").trim();
    const blackoutStartAt = String(formData.get("scheduler_blackout_start_at") || "").trim();
    const blackoutEndAt = String(formData.get("scheduler_blackout_end_at") || "").trim();
    const blackoutReason = String(formData.get("scheduler_blackout_reason") || "").trim();
    const skipDates = parseCommaOrLineList(formData.get("scheduler_skip_dates"));
    const blackoutWeekdays = parseCommaOrLineList(formData.get("scheduler_blackout_weekdays"))
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 6);

    const preferredWeekday =
        preferredWeekdayValue === "" || preferredWeekdayValue === "any" ? null : Number(preferredWeekdayValue);
    const preferredDayOfMonth =
        preferredDayValue === "" ? null : Number(preferredDayValue);

    const payload = {
        scheduler_enabled: schedulerEnabled,
        scheduler_timezone: timezone,
        scheduler_window_start_hour: Math.max(0, Math.min(startHour, 23)),
        scheduler_window_end_hour: Math.max(0, Math.min(endHour, 23)),
        scheduler_business_days_only: businessDaysOnly,
        scheduler_preferred_weekday:
            preferredWeekday === null || Number.isNaN(preferredWeekday) ? null : Math.max(0, Math.min(preferredWeekday, 6)),
        scheduler_preferred_day_of_month:
            preferredDayOfMonth === null || Number.isNaN(preferredDayOfMonth)
                ? null
                : Math.max(1, Math.min(preferredDayOfMonth, 28)),
        scheduler_paused_until: pausedUntilValue || null,
        scheduler_pause_reason: pauseReason || null,
        scheduler_blackout_start_at: blackoutStartAt || null,
        scheduler_blackout_end_at: blackoutEndAt || null,
        scheduler_blackout_reason: blackoutReason || null,
        scheduler_skip_dates: skipDates,
        scheduler_blackout_weekdays: blackoutWeekdays,
    };

    const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", clientId);

    if (error) {
        const message = encodeURIComponent(error.message || "Não foi possível salvar a configuração do scheduler.");
        redirect(`/admin/clients/${clientId}?error=${message}`);
    }

    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath("/admin/ops");
    redirect(`/admin/clients/${clientId}?saved=scheduler`);
}

export default async function AdminClientDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ saved?: string; error?: string }>;
}) {
    const { id } = await params;
    const pageParams = await searchParams;
    const supabase = await createClient();

    const { data: client } = await supabase
        .from("clients")
        .select(
            "*, plans(name, reports_per_month, price_monthly, scheduler_default_timezone, scheduler_default_window_start_hour, scheduler_default_window_end_hour, scheduler_default_business_days_only, scheduler_default_weekday, scheduler_default_day_of_month)"
        )
        .eq("id", id)
        .single();

    if (!client) return notFound();

    const { data: reports } = await supabase
        .from("reports")
        .select("id, title, status, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

    const { data: niches } = await supabase
        .from("client_niches")
        .select("niche_name, relevance, is_active")
        .eq("client_id", id)
        .order("relevance");

    const clientRecord = client as ClientRecord;
    const rawPlan = clientRecord.plans;
    const plan = (Array.isArray(rawPlan) ? rawPlan[0] || null : rawPlan || null) as PlanInfo | null;
    const effectiveStartHour = clientRecord.scheduler_window_start_hour ?? plan?.scheduler_default_window_start_hour ?? 8;
    const effectiveEndHour = clientRecord.scheduler_window_end_hour ?? plan?.scheduler_default_window_end_hour ?? 18;
    const effectiveTimezone = clientRecord.scheduler_timezone || plan?.scheduler_default_timezone || "America/Sao_Paulo";
    const schedulerWindow = `${String(effectiveStartHour).padStart(2, "0")}:00 - ${String(effectiveEndHour).padStart(2, "0")}:00`;

    return (
        <div>
            <Link
                href="/admin/clients"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar
            </Link>

            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{(client as ClientRecord).company_name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant={(client as ClientRecord).is_active ? "default" : "secondary"}>
                            {(client as ClientRecord).is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                            {String(plan?.name || "Sem plano")} • {String(plan?.reports_per_month || 0)} relatorios/mes
                        </span>
                    </div>
                </div>
                <form action="/api/reports/generate" method="post">
                    <input type="hidden" name="client_id" value={id} />
                    <Button className="gap-2">
                        <FileText className="h-4 w-4" />
                        Gerar relatorio
                    </Button>
                </form>
            </div>

            {pageParams.saved === "scheduler" ? (
                <Card className="p-4 mb-6 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">Configuração do scheduler salva com sucesso.</p>
                </Card>
            ) : null}

            {pageParams.error ? (
                <Card className="p-4 mb-6 border-red-200 bg-red-50 text-red-700">
                    <p className="text-sm font-medium">{pageParams.error}</p>
                </Card>
            ) : null}

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Contato</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Nome:</span> {(client as ClientRecord).contact_name}</p>
                            <p><span className="text-muted-foreground">Email:</span> {(client as ClientRecord).contact_email}</p>
                            <p><span className="text-muted-foreground">Tel:</span> {(client as ClientRecord).contact_phone || "-"}</p>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Empresa</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Setor:</span> {(client as ClientRecord).industry || "-"}</p>
                            <p><span className="text-muted-foreground">Tamanho:</span> {(client as ClientRecord).company_size || "-"}</p>
                            <p><span className="text-muted-foreground">Local:</span> {(client as ClientRecord).location || "-"}</p>
                            <p><span className="text-muted-foreground">Faturamento:</span> {(client as ClientRecord).annual_revenue || "-"}</p>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Plano</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Plano:</span> <span className="font-medium text-primary">{String(plan?.name || "Sem plano")}</span></p>
                            <p><span className="text-muted-foreground">Preco:</span> R${(Number(plan?.price_monthly || 0) / 100).toFixed(0)}/mes</p>
                            <p><span className="text-muted-foreground">Limite:</span> {String(plan?.reports_per_month || 0)} relatorios/mes</p>
                            <p><span className="text-muted-foreground">Inicio:</span> {(client as ClientRecord).plan_started_at ? new Date(String((client as ClientRecord).plan_started_at)).toLocaleDateString("pt-BR") : "-"}</p>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Scheduler atual</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Status:</span> {(client as ClientRecord).scheduler_enabled === false ? "Desativado" : "Ativo"}</p>
                            <p><span className="text-muted-foreground">Timezone:</span> {effectiveTimezone}</p>
                            <p><span className="text-muted-foreground">Janela:</span> {schedulerWindow}</p>
                            <p><span className="text-muted-foreground">Dias úteis:</span> {(client as ClientRecord).scheduler_business_days_only === false ? "Não" : "Sim"}</p>
                            <p><span className="text-muted-foreground">Dia da semana:</span> {weekdayLabel((client as ClientRecord).scheduler_preferred_weekday)}</p>
                            <p><span className="text-muted-foreground">Dia do mês:</span> {(client as ClientRecord).scheduler_preferred_day_of_month || "Livre"}</p>
                            <p><span className="text-muted-foreground">Pausado até:</span> {(client as ClientRecord).scheduler_paused_until ? new Date(String((client as ClientRecord).scheduler_paused_until)).toLocaleString("pt-BR") : "Não"}</p>
                            <p><span className="text-muted-foreground">Blackout:</span> {(client as ClientRecord).scheduler_blackout_start_at && (client as ClientRecord).scheduler_blackout_end_at ? `${new Date(String((client as ClientRecord).scheduler_blackout_start_at)).toLocaleString("pt-BR")} até ${new Date(String((client as ClientRecord).scheduler_blackout_end_at)).toLocaleString("pt-BR")}` : "Nenhum"}</p>
                            <p><span className="text-muted-foreground">Datas bloqueadas:</span> {((client as ClientRecord).scheduler_skip_dates || []).join(", ") || "Nenhuma"}</p>
                            <p><span className="text-muted-foreground">Dias bloqueados:</span> {((client as ClientRecord).scheduler_blackout_weekdays || []).map((value) => weekdayLabel(value)).join(", ") || "Nenhum"}</p>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm">Nichos Mapeados</h3>
                        </div>
                        {niches && niches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {niches.map((n: Record<string, unknown>, i: number) => (
                                    <Badge
                                        key={i}
                                        variant={n.is_active ? "default" : "secondary"}
                                        className="text-xs"
                                    >
                                        {String(n.niche_name)}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Nichos serao mapeados automaticamente apos o onboarding.
                            </p>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="p-5">
                        <h3 className="font-bold mb-4">Configuração de scheduler</h3>
                        <form action={updateSchedulerSettings} className="grid gap-4 md:grid-cols-2">
                            <input type="hidden" name="client_id" value={id} />

                            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 md:col-span-2">
                                <input
                                    type="checkbox"
                                    name="scheduler_enabled"
                                    defaultChecked={(client as ClientRecord).scheduler_enabled !== false}
                                    className="h-4 w-4"
                                />
                                <span className="text-sm">
                                    Manter este cliente ativo para geracao recorrente
                                </span>
                            </label>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_timezone">Timezone</Label>
                                <Input
                                    id="scheduler_timezone"
                                    name="scheduler_timezone"
                                    defaultValue={(client as ClientRecord).scheduler_timezone || plan?.scheduler_default_timezone || "America/Sao_Paulo"}
                                />
                            </div>

                            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 self-end">
                                <input
                                    type="checkbox"
                                    name="scheduler_business_days_only"
                                    defaultChecked={(client as ClientRecord).scheduler_business_days_only !== false}
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
                                    defaultValue={String((client as ClientRecord).scheduler_window_start_hour ?? plan?.scheduler_default_window_start_hour ?? 8)}
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
                                    defaultValue={String((client as ClientRecord).scheduler_window_end_hour ?? plan?.scheduler_default_window_end_hour ?? 18)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_preferred_weekday">Dia da semana preferido</Label>
                                <select
                                    id="scheduler_preferred_weekday"
                                    name="scheduler_preferred_weekday"
                                    defaultValue={
                                        (client as ClientRecord).scheduler_preferred_weekday === null ||
                                        (client as ClientRecord).scheduler_preferred_weekday === undefined
                                            ? "any"
                                            : String((client as ClientRecord).scheduler_preferred_weekday)
                                    }
                                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                    <option value="any">Livre</option>
                                    <option value="1">Segunda</option>
                                    <option value="2">Terca</option>
                                    <option value="3">Quarta</option>
                                    <option value="4">Quinta</option>
                                    <option value="5">Sexta</option>
                                    <option value="6">Sabado</option>
                                    <option value="0">Domingo</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_preferred_day_of_month">Dia do mês preferido</Label>
                                <Input
                                    id="scheduler_preferred_day_of_month"
                                    name="scheduler_preferred_day_of_month"
                                    type="number"
                                    min="1"
                                    max="28"
                                    defaultValue={String((client as ClientRecord).scheduler_preferred_day_of_month ?? "")}
                                    placeholder="Livre"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_paused_until">Pausar ate</Label>
                                <Input
                                    id="scheduler_paused_until"
                                    name="scheduler_paused_until"
                                    type="datetime-local"
                                    defaultValue={
                                        (client as ClientRecord).scheduler_paused_until
                                            ? new Date(String((client as ClientRecord).scheduler_paused_until)).toISOString().slice(0, 16)
                                            : ""
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_pause_reason">Motivo da pausa</Label>
                                <Input
                                    id="scheduler_pause_reason"
                                    name="scheduler_pause_reason"
                                    defaultValue={(client as ClientRecord).scheduler_pause_reason || ""}
                                    placeholder="Ex: feriado local, cliente pausado, manutencao"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_blackout_start_at">Blackout inicio</Label>
                                <Input
                                    id="scheduler_blackout_start_at"
                                    name="scheduler_blackout_start_at"
                                    type="datetime-local"
                                    defaultValue={
                                        (client as ClientRecord).scheduler_blackout_start_at
                                            ? new Date(String((client as ClientRecord).scheduler_blackout_start_at)).toISOString().slice(0, 16)
                                            : ""
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduler_blackout_end_at">Blackout fim</Label>
                                <Input
                                    id="scheduler_blackout_end_at"
                                    name="scheduler_blackout_end_at"
                                    type="datetime-local"
                                    defaultValue={
                                        (client as ClientRecord).scheduler_blackout_end_at
                                            ? new Date(String((client as ClientRecord).scheduler_blackout_end_at)).toISOString().slice(0, 16)
                                            : ""
                                    }
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="scheduler_blackout_reason">Motivo do blackout</Label>
                                <Input
                                    id="scheduler_blackout_reason"
                                    name="scheduler_blackout_reason"
                                    defaultValue={(client as ClientRecord).scheduler_blackout_reason || ""}
                                    placeholder="Ex: semana de feriado, pausa comercial, evento do cliente"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="scheduler_skip_dates">Datas bloqueadas</Label>
                                <Textarea
                                    id="scheduler_skip_dates"
                                    name="scheduler_skip_dates"
                                    defaultValue={((client as ClientRecord).scheduler_skip_dates || []).join("\n")}
                                    placeholder={"Uma data por linha\n2026-12-25\n2026-12-31"}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="scheduler_blackout_weekdays">Dias da semana bloqueados</Label>
                                <Input
                                    id="scheduler_blackout_weekdays"
                                    name="scheduler_blackout_weekdays"
                                    defaultValue={((client as ClientRecord).scheduler_blackout_weekdays || []).join(",")}
                                    placeholder="Use números separados por vírgula. Ex: 0,6 para domingo e sábado"
                                />
                            </div>

                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className={buttonVariants({})}>
                                    Salvar scheduler
                                </button>
                            </div>
                        </form>
                    </Card>

                    <Card className="p-5 mt-6">
                        <h3 className="font-bold mb-4">Ultimos relatorios</h3>
                        {reports && reports.length > 0 ? (
                            <div className="space-y-3">
                                {reports.map((r: Record<string, unknown>) => (
                                    <div
                                        key={String(r.id)}
                                        className="flex items-center justify-between py-3 border-b border-border last:border-none"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">
                                                {String(r.title || "Relatório")}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(String(r.created_at)).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={r.status === "done" ? "default" : "secondary"}>
                                                {String(r.status)}
                                            </Badge>
                                            <Link
                                                href={`/dashboard/reports/${r.id}`}
                                                className={buttonVariants({
                                                    variant: "outline",
                                                    size: "sm",
                                                })}
                                            >
                                                Ver
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Nenhum relatorio gerado para este cliente.
                            </p>
                        )}
                    </Card>

                    {(client as ClientRecord).raw_onboarding_text ? (
                        <Card className="p-5 mt-6">
                            <h3 className="font-bold mb-3">Texto de Onboarding</h3>
                            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
                                {(client as ClientRecord).raw_onboarding_text}
                            </div>
                        </Card>
                    ) : null}

                    <div className="grid sm:grid-cols-2 gap-4 mt-6">
                        {(client as ClientRecord).goals_2026 && (client as ClientRecord).goals_2026!.length > 0 ? (
                            <Card className="p-5">
                                <h3 className="font-bold text-sm mb-3">Objetivos 2026</h3>
                                <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {(client as ClientRecord).goals_2026!.map((goal: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-primary">*</span>
                                            {goal}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        ) : null}

                        {(client as ClientRecord).pain_points && (client as ClientRecord).pain_points!.length > 0 ? (
                            <Card className="p-5">
                                <h3 className="font-bold text-sm mb-3">Dores</h3>
                                <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {(client as ClientRecord).pain_points!.map((pain: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-red-500">*</span>
                                            {pain}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
