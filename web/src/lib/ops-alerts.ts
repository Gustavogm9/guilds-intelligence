export type FailureCategory =
    | "configuration"
    | "worker_unavailable"
    | "storage_upload"
    | "artifact_generation"
    | "billing"
    | "auth"
    | "unknown";

export type AlertSeverity = "critical" | "warning" | "info";

export function classifyOperationalError(message: string): {
    category: FailureCategory;
    severity: AlertSeverity;
} {
    const normalized = message.toLowerCase();

    if (
        normalized.includes("nao configurado") ||
        normalized.includes("secret not configured") ||
        normalized.includes("service_role") ||
        normalized.includes("supabase_service_role_key")
    ) {
        return { category: "configuration", severity: "critical" };
    }

    if (
        normalized.includes("health check") ||
        normalized.includes("falha ao acionar worker") ||
        normalized.includes("unauthorized") ||
        normalized.includes("http 5") ||
        normalized.includes("http 4") ||
        normalized.includes("worker")
    ) {
        return { category: "worker_unavailable", severity: "critical" };
    }

    if (
        normalized.includes("storage") ||
        normalized.includes("signed url") ||
        normalized.includes("upload")
    ) {
        return { category: "storage_upload", severity: "warning" };
    }

    if (
        normalized.includes("pdf") ||
        normalized.includes("audio") ||
        normalized.includes("gtts") ||
        normalized.includes("reportlab") ||
        normalized.includes("pillow") ||
        normalized.includes("artifact")
    ) {
        return { category: "artifact_generation", severity: "warning" };
    }

    if (
        normalized.includes("billing") ||
        normalized.includes("plan_price") ||
        normalized.includes("plan_id")
    ) {
        return { category: "billing", severity: "warning" };
    }

    if (normalized.includes("auth") || normalized.includes("nao autorizado")) {
        return { category: "auth", severity: "warning" };
    }

    return { category: "unknown", severity: "warning" };
}

function getWebhookUrl() {
    return process.env.OPERATIONAL_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || "";
}

export async function sendOperationalNotification({
    title,
    message,
    severity,
    category,
    metadata,
}: {
    title: string;
    message: string;
    severity: AlertSeverity;
    category: FailureCategory;
    metadata?: Record<string, unknown>;
}) {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
        return;
    }

    const lines = [
        `severity: ${severity}`,
        `category: ${category}`,
        message,
    ];

    if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                lines.push(`${key}: ${String(value)}`);
            }
        });
    }

    try {
        await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: `[ClientIntelligence] ${title}\n${lines.join("\n")}`,
            }),
        });
    } catch {
        // notificacao externa nao pode quebrar o fluxo principal
    }
}
