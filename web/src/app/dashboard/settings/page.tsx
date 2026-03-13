"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    Clock,
    Loader2,
    Rocket,
    Save,
    CheckCircle2,
    ArrowUpRight,
    Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ScheduleData = {
    scheduler_timezone: string;
    scheduler_window_start_hour: number;
    scheduler_window_end_hour: number;
    scheduler_business_days_only: boolean;
    scheduler_preferred_weekday: number | null;
    scheduler_preferred_day_of_month: number | null;
};

type QuotaInfo = {
    used: number;
    limit: number;
    hasAnyReport: boolean;
    planName: string | null;
};

const TIMEZONE_OPTIONS = [
    "America/Sao_Paulo",
    "America/Manaus",
    "America/Bahia",
    "America/Recife",
    "America/Fortaleza",
    "America/Belem",
    "America/Cuiaba",
    "America/Porto_Velho",
    "America/Rio_Branco",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Lisbon",
];

export default function SettingsPage() {
    const router = useRouter();
    const [preferredLanguage, setPreferredLanguage] = useState("pt-BR");
    const [clientId, setClientId] = useState("");
    const [schedule, setSchedule] = useState<ScheduleData>({
        scheduler_timezone: "America/Sao_Paulo",
        scheduler_window_start_hour: 8,
        scheduler_window_end_hour: 18,
        scheduler_business_days_only: true,
        scheduler_preferred_weekday: null,
        scheduler_preferred_day_of_month: null,
    });
    const [quota, setQuota] = useState<QuotaInfo>({
        used: 0,
        limit: 0,
        hasAnyReport: false,
        planName: null,
    });
    const [scheduleSaving, startScheduleTransition] = useTransition();
    const [scheduleSaved, setScheduleSaved] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generateSuccess, setGenerateSuccess] = useState(false);
    const [generateError, setGenerateError] = useState("");

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: client } = await supabase
                .from("clients")
                .select(
                    "id, preferred_language, scheduler_timezone, scheduler_window_start_hour, scheduler_window_end_hour, scheduler_business_days_only, scheduler_preferred_weekday, scheduler_preferred_day_of_month, plan_id, plans(name, reports_per_month)"
                )
                .eq("user_id", user.id)
                .single();

            if (!client) return;

            setClientId(client.id);
            setPreferredLanguage(client.preferred_language || "pt-BR");
            setSchedule({
                scheduler_timezone: client.scheduler_timezone ?? "America/Sao_Paulo",
                scheduler_window_start_hour: client.scheduler_window_start_hour ?? 8,
                scheduler_window_end_hour: client.scheduler_window_end_hour ?? 18,
                scheduler_business_days_only: client.scheduler_business_days_only ?? true,
                scheduler_preferred_weekday: client.scheduler_preferred_weekday ?? null,
                scheduler_preferred_day_of_month: client.scheduler_preferred_day_of_month ?? null,
            });

            const plan = Array.isArray(client.plans)
                ? client.plans[0]
                : client.plans;
            const planLimit = Number(
                (plan as Record<string, unknown>)?.reports_per_month
            ) || 0;
            const planName = String(
                (plan as Record<string, unknown>)?.name || ""
            );

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count: usedCount } = await supabase
                .from("billing_log")
                .select("id", { count: "exact", head: true })
                .eq("client_id", client.id)
                .gte("created_at", startOfMonth.toISOString());

            const { count: reportCount } = await supabase
                .from("reports")
                .select("id", { count: "exact", head: true })
                .eq("client_id", client.id);

            setQuota({
                used: usedCount || 0,
                limit: planLimit,
                hasAnyReport: (reportCount || 0) > 0,
                planName: planName || null,
            });
        }

        load();
    }, []);

    const t = getDictionary(preferredLanguage);
    const limitReached = quota.used >= quota.limit;
    const isFirstFree = !quota.hasAnyReport;

    async function handleSaveSchedule() {
        startScheduleTransition(async () => {
            const supabase = createClient();
            await supabase
                .from("clients")
                .update({
                    scheduler_timezone: schedule.scheduler_timezone,
                    scheduler_window_start_hour: schedule.scheduler_window_start_hour,
                    scheduler_window_end_hour: schedule.scheduler_window_end_hour,
                    scheduler_business_days_only: schedule.scheduler_business_days_only,
                    scheduler_preferred_weekday: schedule.scheduler_preferred_weekday,
                    scheduler_preferred_day_of_month: schedule.scheduler_preferred_day_of_month,
                })
                .eq("id", clientId);

            trackEvent("schedule_preferences_saved", {
                timezone: schedule.scheduler_timezone,
                business_days_only: schedule.scheduler_business_days_only,
            });

            setScheduleSaved(true);
            setTimeout(() => setScheduleSaved(false), 3000);
        });
    }

    async function handleGenerateNow() {
        setGenerating(true);
        setGenerateError("");
        setGenerateSuccess(false);

        try {
            const endpoint = isFirstFree
                ? "/api/reports/generate-first-free"
                : "/api/reports/generate-client";

            const response = await fetch(endpoint, { method: "POST" });
            const data = (await response.json()) as {
                success?: boolean;
                error?: string;
                report_id?: string;
            };

            if (!response.ok || !data.success) {
                setGenerateError(data.error || "Erro ao gerar relatório");
                setGenerating(false);
                return;
            }

            trackEvent("report_generated_on_demand", {
                report_id: data.report_id,
                is_first_free: isFirstFree,
            });

            // Update local quota state so UI reflects the new report
            setQuota((prev) => ({
                ...prev,
                used: prev.used + 1,
                hasAnyReport: true,
            }));

            setGenerateSuccess(true);
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch {
            setGenerateError("Erro de conexão. Tente novamente.");
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">{t.settingsTitle}</h1>
                <p className="text-muted-foreground mt-1">
                    {t.settingsDescription}
                </p>
            </div>

            {/* Generate Report Now */}
            <Card className="p-6 border-primary/20 bg-primary/5" id="generate">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Rocket className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold">{t.generateNowSection}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t.generateNowDescription}
                        </p>
                    </div>
                </div>

                {isFirstFree ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
                        <div className="flex items-center gap-2 text-green-800">
                            <Sparkles className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                {t.generateNowFirstFree}
                            </p>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                            {t.generateNowFirstFreeHint}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-background/70 p-4 mb-4">
                        <p className="text-sm text-muted-foreground">
                            {t.generateNowQuotaUsed(quota.used, quota.limit)}
                        </p>
                        {quota.planName && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {t.plan}: {quota.planName}
                            </p>
                        )}
                    </div>
                )}

                {limitReached && !isFirstFree ? (
                    <div className="space-y-3">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm text-amber-800 font-medium">
                                {t.generateNowLimitReached}
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                                {t.generateNowUpgradeHint}
                            </p>
                        </div>
                        <a
                            href="/#plans"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                            {t.generateNowUpgradeButton}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {generateSuccess && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                {t.generateNowSuccess}
                            </div>
                        )}
                        {generateError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                {generateError}
                            </div>
                        )}
                        <Button
                            onClick={handleGenerateNow}
                            disabled={generating || generateSuccess}
                            className="gap-2"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t.generateNowGenerating}
                                </>
                            ) : (
                                <>
                                    <Rocket className="h-4 w-4" />
                                    {t.generateNowButton}
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </Card>

            {/* Schedule Configuration */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h2 className="font-bold">{t.scheduleSection}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t.scheduleDescription}
                        </p>
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>{t.scheduleTimezone}</Label>
                        <Select
                            value={schedule.scheduler_timezone}
                            onValueChange={(value) =>
                                setSchedule((prev) => ({
                                    ...prev,
                                    scheduler_timezone: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIMEZONE_OPTIONS.map((tz) => (
                                    <SelectItem key={tz} value={tz}>
                                        {tz.replace(/_/g, " ")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            {t.scheduleWindowStart}
                        </Label>
                        <Select
                            value={String(schedule.scheduler_window_start_hour)}
                            onValueChange={(value) =>
                                setSchedule((prev) => ({
                                    ...prev,
                                    scheduler_window_start_hour: Number(value),
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                        {String(i).padStart(2, "0")}:00
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            {t.scheduleWindowEnd}
                        </Label>
                        <Select
                            value={String(schedule.scheduler_window_end_hour)}
                            onValueChange={(value) =>
                                setSchedule((prev) => ({
                                    ...prev,
                                    scheduler_window_end_hour: Number(value),
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                        {String(i).padStart(2, "0")}:00
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor="business-days">
                            {t.scheduleBusinessDaysOnly}
                        </Label>
                        <Switch
                            id="business-days"
                            checked={schedule.scheduler_business_days_only}
                            onCheckedChange={(checked: boolean) =>
                                setSchedule((prev) => ({
                                    ...prev,
                                    scheduler_business_days_only: checked,
                                }))
                            }
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t.schedulePreferredWeekday}</Label>
                        <Select
                            value={
                                schedule.scheduler_preferred_weekday !== null
                                    ? String(schedule.scheduler_preferred_weekday)
                                    : "none"
                            }
                            onValueChange={(value) =>
                                setSchedule((prev) => ({
                                    ...prev,
                                    scheduler_preferred_weekday:
                                        value === "none" ? null : Number(value),
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    {t.weekdays.none}
                                </SelectItem>
                                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                    <SelectItem key={day} value={String(day)}>
                                        {t.weekdays[String(day)]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{t.schedulePreferredDayOfMonth}</Label>
                        <Input
                            type="number"
                            min={1}
                            max={28}
                            value={
                                schedule.scheduler_preferred_day_of_month ?? ""
                            }
                            onChange={(event) =>
                                setSchedule((prev) => ({
                                    ...prev,
                                    scheduler_preferred_day_of_month:
                                        event.target.value
                                            ? Number(event.target.value)
                                            : null,
                                }))
                            }
                            placeholder="1-28"
                        />
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                    <Button
                        onClick={handleSaveSchedule}
                        disabled={scheduleSaving}
                        className="gap-2"
                    >
                        {scheduleSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : scheduleSaved ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {scheduleSaved ? t.scheduleSaved : t.scheduleSave}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
