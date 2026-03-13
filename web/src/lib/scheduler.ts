type ClientScheduleConfig = {
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
    plans?:
        | {
            scheduler_default_timezone?: string | null;
            scheduler_default_window_start_hour?: number | null;
            scheduler_default_window_end_hour?: number | null;
            scheduler_default_business_days_only?: boolean | null;
            scheduler_default_weekday?: number | null;
            scheduler_default_day_of_month?: number | null;
        }
        | {
            scheduler_default_timezone?: string | null;
            scheduler_default_window_start_hour?: number | null;
            scheduler_default_window_end_hour?: number | null;
            scheduler_default_business_days_only?: boolean | null;
            scheduler_default_weekday?: number | null;
            scheduler_default_day_of_month?: number | null;
        }[]
        | null;
};

type SchedulerEvaluation =
    | {
        allowed: true;
        timezone: string;
        localHour: number;
        localWeekday: number;
        localDayOfMonth: number;
    }
    | {
        allowed: false;
        reason:
            | "scheduler_desativado"
            | "janela_fora_do_horario"
            | "fora_do_dia_util"
            | "fora_do_dia_da_semana_preferido"
            | "fora_do_dia_do_mes_preferido"
            | "scheduler_pausado_temporariamente"
            | "blackout_periodo"
            | "data_bloqueada"
            | "dia_bloqueado"
            | "feriado_compartilhado";
        timezone: string;
        localHour: number;
        localWeekday: number;
        localDayOfMonth: number;
    };

function normalizeTimezone(timezone?: string | null) {
    return timezone?.trim() || "America/Sao_Paulo";
}

function asSinglePlan(config: ClientScheduleConfig) {
    return Array.isArray(config.plans) ? config.plans[0] || null : config.plans || null;
}

function getLocalDateParts(timezone: string, date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        weekday: "short",
        day: "numeric",
        hour: "numeric",
    });

    const parts = formatter.formatToParts(date);
    const weekdayLabel = parts.find((part) => part.type === "weekday")?.value || "Mon";
    const dayOfMonth = Number(parts.find((part) => part.type === "day")?.value || 1);
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const month = String(parts.find((part) => part.type === "month")?.value || "01").padStart(2, "0");
    const year = parts.find((part) => part.type === "year")?.value || "1970";

    const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };

    return {
        localHour: hour,
        localDayOfMonth: dayOfMonth,
        localWeekday: weekdayMap[weekdayLabel] ?? 1,
        localDateIso: `${year}-${month}-${String(dayOfMonth).padStart(2, "0")}`,
    };
}

function isWithinWindow(hour: number, startHour: number, endHour: number) {
    if (startHour === endHour) return true;
    if (startHour < endHour) {
        return hour >= startHour && hour < endHour;
    }

    return hour >= startHour || hour < endHour;
}

export function evaluateSchedulerWindow(
    config: ClientScheduleConfig,
    date = new Date(),
    options?: { sharedHolidayDates?: string[] }
): SchedulerEvaluation {
    const sharedHolidayDates = options?.sharedHolidayDates || [];
    const plan = asSinglePlan(config);
    const timezone = normalizeTimezone(config.scheduler_timezone || plan?.scheduler_default_timezone);
    const { localHour, localWeekday, localDayOfMonth, localDateIso } = getLocalDateParts(timezone, date);

    if (config.scheduler_enabled === false) {
        return {
            allowed: false,
            reason: "scheduler_desativado",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    if (config.scheduler_paused_until && new Date(config.scheduler_paused_until).getTime() > date.getTime()) {
        return {
            allowed: false,
            reason: "scheduler_pausado_temporariamente",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    const blackoutStartAt = config.scheduler_blackout_start_at ? new Date(config.scheduler_blackout_start_at).getTime() : null;
    const blackoutEndAt = config.scheduler_blackout_end_at ? new Date(config.scheduler_blackout_end_at).getTime() : null;
    if (
        blackoutStartAt !== null &&
        blackoutEndAt !== null &&
        date.getTime() >= blackoutStartAt &&
        date.getTime() <= blackoutEndAt
    ) {
        return {
            allowed: false,
            reason: "blackout_periodo",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    const skipDates = (config.scheduler_skip_dates || []).map((value) => String(value));
    const holidayDates = (sharedHolidayDates || []).map((value) => String(value));
    if (holidayDates.includes(localDateIso)) {
        return {
            allowed: false,
            reason: "feriado_compartilhado",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    if (skipDates.includes(localDateIso)) {
        return {
            allowed: false,
            reason: "data_bloqueada",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    const blackoutWeekdays = (config.scheduler_blackout_weekdays || []).map((value) => Number(value));
    if (blackoutWeekdays.includes(localWeekday)) {
        return {
            allowed: false,
            reason: "dia_bloqueado",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    const startHour = Number.isFinite(config.scheduler_window_start_hour)
        ? Number(config.scheduler_window_start_hour)
        : Number.isFinite(plan?.scheduler_default_window_start_hour)
            ? Number(plan?.scheduler_default_window_start_hour)
            : 8;
    const endHour = Number.isFinite(config.scheduler_window_end_hour)
        ? Number(config.scheduler_window_end_hour)
        : Number.isFinite(plan?.scheduler_default_window_end_hour)
            ? Number(plan?.scheduler_default_window_end_hour)
            : 18;
    const businessDaysOnly =
        config.scheduler_business_days_only === null || config.scheduler_business_days_only === undefined
            ? plan?.scheduler_default_business_days_only !== false
            : config.scheduler_business_days_only !== false;
    const preferredWeekday =
        config.scheduler_preferred_weekday === null || config.scheduler_preferred_weekday === undefined
            ? (
                plan?.scheduler_default_weekday === null || plan?.scheduler_default_weekday === undefined
                    ? null
                    : Number(plan.scheduler_default_weekday)
            )
            : Number(config.scheduler_preferred_weekday);
    const preferredDayOfMonth =
        config.scheduler_preferred_day_of_month === null || config.scheduler_preferred_day_of_month === undefined
            ? (
                plan?.scheduler_default_day_of_month === null || plan?.scheduler_default_day_of_month === undefined
                    ? null
                    : Number(plan.scheduler_default_day_of_month)
            )
            : Number(config.scheduler_preferred_day_of_month);

    if (!isWithinWindow(localHour, startHour, endHour)) {
        return {
            allowed: false,
            reason: "janela_fora_do_horario",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    if (businessDaysOnly && (localWeekday === 0 || localWeekday === 6)) {
        return {
            allowed: false,
            reason: "fora_do_dia_util",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    if (preferredWeekday !== null && localWeekday !== preferredWeekday) {
        return {
            allowed: false,
            reason: "fora_do_dia_da_semana_preferido",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    if (preferredDayOfMonth !== null && localDayOfMonth !== preferredDayOfMonth) {
        return {
            allowed: false,
            reason: "fora_do_dia_do_mes_preferido",
            timezone,
            localHour,
            localWeekday,
            localDayOfMonth,
        };
    }

    return {
        allowed: true,
        timezone,
        localHour,
        localWeekday,
        localDayOfMonth,
    };
}

export function schedulerReasonLabel(reason: Exclude<SchedulerEvaluation, { allowed: true }>["reason"]) {
    const labels: Record<string, string> = {
        scheduler_desativado: "scheduler_desativado",
        scheduler_pausado_temporariamente: "scheduler_pausado_temporariamente",
        blackout_periodo: "blackout_periodo",
        data_bloqueada: "data_bloqueada",
        dia_bloqueado: "dia_bloqueado",
        feriado_compartilhado: "feriado_compartilhado",
        janela_fora_do_horario: "fora_da_janela_horaria",
        fora_do_dia_util: "fora_de_dia_util",
        fora_do_dia_da_semana_preferido: "fora_do_dia_da_semana_preferido",
        fora_do_dia_do_mes_preferido: "fora_do_dia_do_mes_preferido",
    };

    return labels[reason] || "regra_de_scheduler";
}
