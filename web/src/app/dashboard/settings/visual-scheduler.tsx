"use client";

import { useState, useMemo, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { enUS } from "date-fns/locale/en-US";
import { Calendar as BigCalendar, dateFnsLocalizer, Event, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Info } from "lucide-react";

type ScheduleState = {
    scheduler_timezone: string;
    scheduler_window_start_hour: number;
    scheduler_window_end_hour: number;
    scheduler_business_days_only: boolean;
    scheduler_preferred_weekday: number | null;
    scheduler_preferred_day_of_month: number | null;
};

// Data base: Janeiro de 2024. O dia 1 cai numa segunda-feira.
// Nosso "week view" mostrará de Domingo (31/Dez/2023) a Sábado (06/Jan/2024).
const BASE_DATE = new Date(2024, 0, 1);

export function VisualScheduler({
    schedule,
    setSchedule,
    isPt,
}: {
    schedule: ScheduleState;
    setSchedule: Dispatch<SetStateAction<ScheduleState>>;
    isPt: boolean;
}) {
    const locales = {
        "pt-BR": ptBR,
        "en-US": enUS,
    };

    const localizer = useMemo(
        () =>
            dateFnsLocalizer({
                format,
                parse,
                startOfWeek,
                getDay,
                locales,
            }),
        []
    );

    // Converte state do DB nos eventos visuais
    const events = useMemo<Event[]>(() => {
        const evs: Event[] = [];
        const startH = schedule.scheduler_window_start_hour ?? 9;
        const endH = schedule.scheduler_window_end_hour ?? 18;

        const makeEvent = (dayOffset: number): Event => {
            // dayOffset: 0=Domingo, 1=Segunda, etc.
            // Para BASE_DATE (2024-01-01 -> Segunda), o offset a partir do último domingo é:
            // 31/Dez (Dom) = 0 offset a partir do domingo base da semana do BASE_DATE
            const startDate = new Date(2023, 11, 31 + dayOffset);
            startDate.setHours(startH, 0, 0, 0);

            const endDate = new Date(2023, 11, 31 + dayOffset);
            endDate.setHours(endH, 0, 0, 0);

            return {
                title: isPt ? "Janela de Geração" : "Generation Window",
                start: startDate,
                end: endDate,
            };
        };

        if (schedule.scheduler_business_days_only) {
            // Seg a Sex
            for (let i = 1; i <= 5; i++) {
                evs.push(makeEvent(i));
            }
        } else if (schedule.scheduler_preferred_weekday !== null && schedule.scheduler_preferred_weekday !== undefined) {
            // Dia específico
            evs.push(makeEvent(schedule.scheduler_preferred_weekday));
        } else {
            // Se nenhum dos dois, todos os dias? (A lógica anterior não tinha isso explícito para 'diário', mas podemos assumir)
            for (let i = 0; i <= 6; i++) {
                evs.push(makeEvent(i));
            }
        }

        return evs;
    }, [
        schedule.scheduler_window_start_hour,
        schedule.scheduler_window_end_hour,
        schedule.scheduler_business_days_only,
        schedule.scheduler_preferred_weekday,
        isPt,
    ]);

    // Trata seleção (drag-and-drop de criação)
    const handleSelectSlot = useCallback(
        ({ start, end }: { start: Date; end: Date }) => {
            const startH = start.getHours();
            const endH = end.getHours() === 0 ? 24 : end.getHours(); // se ele puxou até meia-noite
            
            // Verificamos os dias envolvidos
            // num calendário weekly, 'start' a 'end' costuma ser um mesmo dia, 
            // ou uma seleção contígua de vários dias (mas no react-big-calendar em time grid, vc seleciona horas de um dia).
            // Vamos assumir que selecionou horas de 1 dia na visão ou vários dias no cabeçalho.
            // Se durar mais de 24h:
            const diasSelecionados = new Set<number>();
            let d = new Date(start);
            while (d < end) {
                diasSelecionados.add(d.getDay());
                d.setHours(d.getHours() + 1);
            }

            const daysArr = Array.from(diasSelecionados);
            let businessOnly = false;
            let preferredWeekday: number | null = null;

            if (daysArr.length === 1) {
                // Usuário selecionou apenas um dia
                preferredWeekday = daysArr[0];
                businessOnly = false;
            } else if (daysArr.includes(1) && daysArr.includes(5) && !daysArr.includes(0) && !daysArr.includes(6)) {
                // Usuário arrastou Seg a Sex no allday panel ou cobriu isso
                businessOnly = true;
                preferredWeekday = null;
            } else {
                // Diário
                businessOnly = false;
                preferredWeekday = null;
            }

            setSchedule((prev) => ({
                ...prev,
                scheduler_window_start_hour: startH,
                scheduler_window_end_hour: endH,
                scheduler_business_days_only: businessOnly,
                scheduler_preferred_weekday: preferredWeekday,
            }));
        },
        [setSchedule]
    );

    const culture = isPt ? "pt-BR" : "en-US";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 p-3 rounded-md text-sm">
                <Info className="h-4 w-4" />
                <p>
                    {isPt 
                        ? "Arraste no calendário para definir sua janela ideal de geração. Você pode selecionar um dia específico ou (Seg-Sex)."
                        : "Drag on the calendar to set your ideal generation window. You can select a single day or Mo-Fr."}
                </p>
            </div>
            
            <div className="h-[450px] w-full border rounded-lg bg-card overflow-hidden [&_.rbc-event]:bg-violet-600 [&_.rbc-event]:border-violet-700 [&_.rbc-today]:bg-transparent">
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    defaultView="week"
                    views={["week"]}
                    toolbar={false}
                    defaultDate={BASE_DATE}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    step={60}
                    timeslots={1}
                    culture={culture}
                    formats={{
                        dayFormat: (date: Date, culture?: string, localizer?: any) =>
                            localizer.format(date, "EEEE", culture), // Apenas Segunda, Terça...
                    }}
                />
            </div>
        </div>
    );
}
