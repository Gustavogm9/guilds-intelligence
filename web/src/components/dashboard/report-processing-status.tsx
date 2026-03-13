"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, CheckCircle2, XCircle, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";

type ReportProcessingStatusProps = {
    status: string;
    createdAt: string;
    locale?: string;
};

type WorkerHealth = {
    online: boolean;
    reason: string;
    message: string;
    checked: boolean;
};

function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
}

export function ReportProcessingStatus({
    status,
    createdAt,
    locale = "pt-BR",
}: ReportProcessingStatusProps) {
    const [elapsed, setElapsed] = useState(0);
    const [health, setHealth] = useState<WorkerHealth>({
        online: false,
        reason: "",
        message: "",
        checked: false,
    });

    useEffect(() => {
        const start = new Date(createdAt).getTime();
        const update = () => {
            const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
            setElapsed(diff);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    useEffect(() => {
        async function checkHealth() {
            try {
                const res = await fetch("/api/worker-health");
                const data = await res.json();
                setHealth({
                    online: data.online,
                    reason: data.reason,
                    message: data.message,
                    checked: true,
                });
            } catch {
                setHealth({
                    online: false,
                    reason: "fetch_error",
                    message: "Não foi possível verificar o worker",
                    checked: true,
                });
            }
        }
        checkHealth();
        // Re-check every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const estimatedMax = 900;
    const progress = Math.min(95, (elapsed / estimatedMax) * 100);

    const isQueued = status === "queued";
    const isProcessing = status === "processing";
    const isError = status === "error";
    const isPtBr = locale === "pt-BR";

    const statusMessage = isQueued
        ? isPtBr
            ? "Seu relatório está na fila aguardando processamento"
            : "Your report is queued and waiting to be processed"
        : isProcessing
            ? isPtBr
                ? "Seu relatório está sendo gerado neste momento"
                : "Your report is being generated right now"
            : isError
                ? isPtBr
                    ? "Houve um erro ao processar seu relatório. Nossa equipe foi notificada"
                    : "There was an error processing your report. Our team has been notified"
                : "";

    const estimateText = isPtBr
        ? "Tempo estimado: 5 a 15 minutos"
        : "Estimated time: 5 to 15 minutes";

    return (
        <Card className={`p-6 mt-6 ${isError ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
            <div className="flex items-start gap-3">
                {isError ? (
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                ) : (
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isError ? "text-red-800" : "text-amber-800"}`}>
                        {statusMessage}
                    </p>

                    {/* Worker health indicator */}
                    {health.checked && (
                        <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                            health.online
                                ? "bg-green-100 text-green-700"
                                : health.reason === "not_configured"
                                    ? "bg-gray-100 text-gray-600"
                                    : "bg-red-100 text-red-700"
                        }`}>
                            {health.online ? (
                                <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    {isPtBr ? "Motor de IA online" : "AI engine online"}
                                </>
                            ) : health.reason === "not_configured" ? (
                                <>
                                    <WifiOff className="h-3 w-3" />
                                    {isPtBr ? "Motor de IA não configurado" : "AI engine not configured"}
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-3 w-3" />
                                    {isPtBr ? "Motor de IA offline" : "AI engine offline"}
                                </>
                            )}
                        </div>
                    )}

                    {!isError && (
                        <>
                            <div className="flex items-center gap-2 mt-2">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                <span className="text-xs font-mono text-amber-700">
                                    {isPtBr ? "Esperando há" : "Waiting for"}{" "}
                                    <span className="font-bold">{formatElapsed(elapsed)}</span>
                                </span>
                                <span className="text-xs text-amber-600">
                                    · {estimateText}
                                </span>
                            </div>

                            {health.checked && health.online && (
                                <div className="mt-3">
                                    <div className="h-2 w-full rounded-full bg-amber-200/60 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000 ease-linear"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-amber-600">
                                            {isQueued
                                                ? (isPtBr ? "Aguardando fila" : "In queue")
                                                : (isPtBr ? "Processando" : "Processing")}
                                        </span>
                                        <span className="text-[10px] text-amber-600">
                                            ~{Math.round(progress)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {health.checked && !health.online && (
                                <div className="mt-3 rounded-lg bg-amber-100/80 p-3">
                                    <p className="text-xs text-amber-800">
                                        {isPtBr
                                            ? "O motor de IA não está ativo no momento. Seu relatório foi salvo e será processado automaticamente assim que o serviço estiver disponível."
                                            : "The AI engine is not active right now. Your report was saved and will be processed automatically when the service becomes available."}
                                    </p>
                                </div>
                            )}

                            <p className="text-xs text-amber-600 mt-2">
                                {isPtBr
                                    ? "Esta página atualiza automaticamente. Você pode sair e voltar depois."
                                    : "This page auto-refreshes. You can leave and come back later."}
                            </p>
                        </>
                    )}

                    {isError && (
                        <p className="text-xs text-red-600 mt-2">
                            {isPtBr
                                ? "Você pode tentar gerar novamente nas Configurações ou aguardar o reprocessamento automático."
                                : "You can try generating again in Settings or wait for automatic reprocessing."}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    );
}
