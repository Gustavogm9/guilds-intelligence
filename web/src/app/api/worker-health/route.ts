import { NextResponse } from "next/server";

export async function GET() {
    const workerUrl = process.env.PYTHON_WORKER_URL;
    const workerSecret = process.env.PYTHON_WORKER_SECRET;

    if (!workerUrl || !workerSecret) {
        return NextResponse.json({
            online: false,
            reason: "not_configured",
            message: "Worker não configurado no ambiente",
        });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
            method: "GET",
            headers: { "x-worker-secret": workerSecret },
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
                online: true,
                reason: "healthy",
                message: "Worker online e operacional",
                workerStatus: data.status || "ok",
            });
        }

        return NextResponse.json({
            online: false,
            reason: "unhealthy",
            message: `Worker respondeu com status ${response.status}`,
        });
    } catch (error) {
        const isTimeout = error instanceof DOMException && error.name === "AbortError";
        return NextResponse.json({
            online: false,
            reason: isTimeout ? "timeout" : "unreachable",
            message: isTimeout
                ? "Worker não respondeu a tempo (timeout 5s)"
                : "Worker inacessível",
        });
    }
}
