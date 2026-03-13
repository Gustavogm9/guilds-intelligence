"use client";

function getSessionId(): string {
    if (typeof window === "undefined") return "ssr";
    let sid = sessionStorage.getItem("gi_session_id");
    if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem("gi_session_id", sid);
    }
    return sid;
}

export type FunnelEvent =
    | "landing_view"
    | "modal_open"
    | "lead_submit"
    | "signup_complete"
    | "onboarding_complete"
    | "dashboard_return"
    | "inbox_view"
    | "first_report_view"
    | "report_view"
    | "report_download"
    | "audio_play"
    | "deep_dive_requested"
    | "login"
    | "scheduler_run"
    | "report_generation_triggered"
    | "report_generation_failed"
    | "report_retry_triggered"
    | "report_auto_recovery_triggered"
    | "whatsapp_message_received"
    | "whatsapp_command_processed"
    | "whatsapp_deep_dive_requested"
    | "schedule_preferences_saved"
    | "report_generated_on_demand";

export function trackEvent(
    eventType: FunnelEvent,
    metadata?: Record<string, unknown>
) {
    try {
        const payload = {
            event_type: eventType,
            session_id: getSessionId(),
            metadata: {
                ...metadata,
                url: typeof window !== "undefined" ? window.location.pathname : "",
                referrer: typeof document !== "undefined" ? document.referrer : "",
                timestamp: new Date().toISOString(),
            },
        };

        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            navigator.sendBeacon(
                "/api/track",
                new Blob([JSON.stringify(payload)], { type: "application/json" })
            );
        } else {
            fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
            }).catch(() => {
                // tracking nunca deve quebrar a experiencia
            });
        }
    } catch {
        // silencioso
    }
}
