import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";

function weekdayLabel(value: unknown) {
    const labels: Record<string, string> = {
        "0": "Domingo",
        "1": "Segunda",
        "2": "Terca",
        "3": "Quarta",
        "4": "Quinta",
        "5": "Sexta",
        "6": "Sabado",
    };

    const key = String(value ?? "");
    return labels[key] || "Livre";
}

async function updatePlanSchedulerPolicy(formData: FormData) {
    "use server";

    const planId = String(formData.get("plan_id") || "").trim();
    if (!planId) {
        redirect("/admin/plans?error=Plano%20inválido");
    }

    const startHour = Number(formData.get("scheduler_default_window_start_hour") || 8);
    const endHour = Number(formData.get("scheduler_default_window_end_hour") || 18);
    const weekdayRaw = String(formData.get("scheduler_default_weekday") || "").trim();
    const dayOfMonthRaw = String(formData.get("scheduler_default_day_of_month") || "").trim();

    const payload = {
        scheduler_default_timezone:
            String(formData.get("scheduler_default_timezone") || "").trim() || "America/Sao_Paulo",
        scheduler_default_window_start_hour: Math.max(0, Math.min(startHour, 23)),
        scheduler_default_window_end_hour: Math.max(0, Math.min(endHour, 23)),
        scheduler_default_business_days_only: formData.get("scheduler_default_business_days_only") === "on",
        scheduler_default_weekday:
            weekdayRaw === "" || weekdayRaw === "any"
                ? null
                : Math.max(0, Math.min(Number(weekdayRaw), 6)),
        scheduler_default_day_of_month:
            dayOfMonthRaw === ""
                ? null
                : Math.max(1, Math.min(Number(dayOfMonthRaw), 28)),
    };

    const supabase = await createClient();
    const { error } = await supabase.from("plans").update(payload).eq("id", planId);

    if (error) {
        redirect(`/admin/plans?error=${encodeURIComponent(error.message || "Não foi possível salvar o plano.")}`);
    }

    revalidatePath("/admin/plans");
    revalidatePath("/admin/clients");
    redirect("/admin/plans?saved=policy");
}

async function addSharedHoliday(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const holidayDate = String(formData.get("holiday_date") || "").trim();
    const name = String(formData.get("name") || "").trim();

    if (!holidayDate || !name) {
        redirect("/admin/plans?error=Informe%20data%20e%20nome%20do%20feriado.");
    }

    const { error } = await supabase.from("scheduler_holidays").upsert(
        {
            holiday_date: holidayDate,
            name,
            is_active: true,
        },
        { onConflict: "holiday_date" }
    );

    if (error) {
        redirect(`/admin/plans?error=${encodeURIComponent(error.message || "Não foi possível salvar o feriado.")}`);
    }

    revalidatePath("/admin/plans");
    redirect("/admin/plans?saved=holiday");
}

async function deactivateSharedHoliday(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const holidayId = String(formData.get("holiday_id") || "").trim();

    if (!holidayId) {
        redirect("/admin/plans?error=Feriado%20inválido.");
    }

    const { error } = await supabase
        .from("scheduler_holidays")
        .update({ is_active: false })
        .eq("id", holidayId);

    if (error) {
        redirect(`/admin/plans?error=${encodeURIComponent(error.message || "Não foi possível desativar o feriado.")}`);
    }

    revalidatePath("/admin/plans");
    redirect("/admin/plans?saved=holiday");
}

export default async function AdminPlansPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string; error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const [{ data: plans }, { data: holidays }] = await Promise.all([
        supabase
            .from("plans")
            .select("*")
            .order("price_monthly"),
        supabase
            .from("scheduler_holidays")
            .select("id, holiday_date, name, is_active")
            .order("holiday_date"),
    ]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Planos</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie os planos de assinatura, a politica recorrente padrao e o calendario compartilhado.
                </p>
            </div>

            {params.saved ? (
                <Card className="p-4 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">
                        {params.saved === "policy" ? "Politica do plano salva com sucesso." : "Calendario compartilhado atualizado com sucesso."}
                    </p>
                </Card>
            ) : null}

            {params.error ? (
                <Card className="p-4 border-red-200 bg-red-50 text-red-700">
                    <p className="text-sm font-medium">{params.error}</p>
                </Card>
            ) : null}

            <Card className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="font-bold">Feriados compartilhados</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Datas que bloqueiam o scheduler para todos os clientes.
                        </p>
                    </div>
                </div>

                <form action={addSharedHoliday} className="grid gap-4 md:grid-cols-3 mt-5">
                    <div className="space-y-2">
                        <Label htmlFor="holiday_date">Data</Label>
                        <Input id="holiday_date" name="holiday_date" type="date" required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="holiday_name">Nome</Label>
                        <Input id="holiday_name" name="name" placeholder="Ex: Natal, Ano Novo, feriado interno" required />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                        <button type="submit" className={buttonVariants({})}>
                            Adicionar feriado
                        </button>
                    </div>
                </form>

                <div className="divide-y divide-border mt-6">
                    {(holidays || []).length > 0 ? (
                        holidays?.map((holiday: Record<string, unknown>) => (
                            <div key={String(holiday.id)} className="py-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium">{String(holiday.name)}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(String(holiday.holiday_date)).toLocaleDateString("pt-BR")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={holiday.is_active ? "default" : "secondary"}>
                                        {holiday.is_active ? "Ativo" : "Inativo"}
                                    </Badge>
                                    {holiday.is_active ? (
                                        <form action={deactivateSharedHoliday}>
                                            <input type="hidden" name="holiday_id" value={String(holiday.id)} />
                                            <button type="submit" className={buttonVariants({ variant: "outline" })}>
                                                Desativar
                                            </button>
                                        </form>
                                    ) : null}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground py-4">Nenhum feriado compartilhado cadastrado.</p>
                    )}
                </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                {plans?.map((plan: Record<string, unknown>) => (
                    <Card key={String(plan.id)} className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold">{String(plan.name)}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    R$ {(Number(plan.price_monthly) / 100).toFixed(0)}/mes • {String(plan.reports_per_month)} relatorios/mes
                                </p>
                            </div>
                            <Badge variant={plan.is_active ? "default" : "secondary"}>
                                {plan.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                        </div>

                        <div className="mb-5 space-y-2 text-sm text-muted-foreground">
                            <p>Formatos: {String(plan.formats)}</p>
                            <p>Timezone padrão: {String(plan.scheduler_default_timezone || "America/Sao_Paulo")}</p>
                            <p>
                                Janela padrão: {String(plan.scheduler_default_window_start_hour ?? 8)}h - {String(plan.scheduler_default_window_end_hour ?? 18)}h
                            </p>
                            <p>Dias úteis: {plan.scheduler_default_business_days_only === false ? "Não" : "Sim"}</p>
                            <p>Dia semanal: {weekdayLabel(plan.scheduler_default_weekday)}</p>
                            <p>Dia mensal: {String(plan.scheduler_default_day_of_month ?? "Livre")}</p>
                        </div>

                        <form action={updatePlanSchedulerPolicy} className="grid gap-4 md:grid-cols-2">
                            <input type="hidden" name="plan_id" value={String(plan.id)} />

                            <div className="space-y-2">
                                <Label htmlFor={`timezone-${plan.id}`}>Timezone padrão</Label>
                                <Input
                                    id={`timezone-${plan.id}`}
                                    name="scheduler_default_timezone"
                                    defaultValue={String(plan.scheduler_default_timezone || "America/Sao_Paulo")}
                                />
                            </div>

                            <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3 self-end">
                                <input
                                    type="checkbox"
                                    name="scheduler_default_business_days_only"
                                    defaultChecked={plan.scheduler_default_business_days_only !== false}
                                    className="h-4 w-4"
                                />
                                <span className="text-sm">Dias uteis por padrao</span>
                            </label>

                            <div className="space-y-2">
                                <Label htmlFor={`start-${plan.id}`}>Inicio da janela</Label>
                                <Input
                                    id={`start-${plan.id}`}
                                    name="scheduler_default_window_start_hour"
                                    type="number"
                                    min="0"
                                    max="23"
                                    defaultValue={String(plan.scheduler_default_window_start_hour ?? 8)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`end-${plan.id}`}>Fim da janela</Label>
                                <Input
                                    id={`end-${plan.id}`}
                                    name="scheduler_default_window_end_hour"
                                    type="number"
                                    min="0"
                                    max="23"
                                    defaultValue={String(plan.scheduler_default_window_end_hour ?? 18)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`weekday-${plan.id}`}>Dia semanal padrão</Label>
                                <select
                                    id={`weekday-${plan.id}`}
                                    name="scheduler_default_weekday"
                                    defaultValue={
                                        plan.scheduler_default_weekday === null || plan.scheduler_default_weekday === undefined
                                            ? "any"
                                            : String(plan.scheduler_default_weekday)
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
                                <Label htmlFor={`monthday-${plan.id}`}>Dia mensal padrão</Label>
                                <Input
                                    id={`monthday-${plan.id}`}
                                    name="scheduler_default_day_of_month"
                                    type="number"
                                    min="1"
                                    max="28"
                                    defaultValue={String(plan.scheduler_default_day_of_month ?? "")}
                                    placeholder="Livre"
                                />
                            </div>

                            <div className="md:col-span-2 flex justify-end">
                                <button type="submit" className={buttonVariants({})}>
                                    Salvar politica do plano
                                </button>
                            </div>
                        </form>
                    </Card>
                ))}
            </div>
        </div>
    );
}
