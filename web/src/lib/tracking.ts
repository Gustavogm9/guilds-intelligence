"use client";

/**
 * Utilitário de tracking interno de funil.
 * Dispara eventos para a API /api/track que salva no Supabase.
 *
 * Eventos suportados:
 *  - landing_view: visitou a landing page
 *  - modal_open: abriu o modal de lead capture
 *  - lead_submit: preencheu e enviou o modal
 *  - signup_complete: completou o signup
 *  - onboarding_complete: completou o onboarding
 *  - first_report_view: visualizou o primeiro relatório
 */

// Gera ou recupera um session ID anônimo persistido por sessão do browser
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
    | "first_report_view"
    | "login";

export function trackEvent(
    eventType: FunnelEvent,
    metadata?: Record<string, unknown>
) {
    // Fire-and-forget: não bloqueia a UI
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

        // Usa sendBeacon quando disponível (não bloqueia navegação)
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
                // Silencioso — tracking não deve quebrar a experiência do usuário
            });
        }
    } catch {
        // Silencioso
    }
}
