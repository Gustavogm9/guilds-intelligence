"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface RegenerateFreeBannerProps {
    reportId: string;
    isAvailable: boolean;
}

export function RegenerateFreeBanner({
    reportId,
    isAvailable,
}: RegenerateFreeBannerProps) {
    const [loading, setLoading] = useState(false);
    const [regenerated, setRegenerated] = useState(false);
    const { toast } = useToast();

    if (!isAvailable || regenerated) return null;

    async function handleRegenerate() {
        setLoading(true);
        try {
            const res = await fetch("/api/reports/regenerate-free", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ report_id: reportId }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast({
                    title: "Erro ao regerar",
                    description: data.error || "Tente novamente mais tarde",
                    variant: "destructive",
                });
                return;
            }

            setRegenerated(true);
            toast({
                title: "Relatório regerado!",
                description:
                    "Um novo relatório está sendo processado com inteligência global completa. Você será notificado quando estiver pronto.",
            });
        } catch {
            toast({
                title: "Erro de conexão",
                description: "Verifique sua conexão e tente novamente",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="p-4 mb-6 border-amber-300 bg-amber-50/60">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                        Este relatório foi gerado com fontes limitadas
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                        O motor de inteligência global estava temporariamente
                        indisponível. Você pode regerá-lo gratuitamente para
                        obter análises com cobertura global completa (BR, EUA,
                        Europa, China).
                    </p>
                    <Button
                        onClick={handleRegenerate}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                        className="mt-3 border-amber-400 text-amber-900 hover:bg-amber-100"
                    >
                        <RefreshCw
                            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                        />
                        {loading
                            ? "Regerando..."
                            : "Regerar Relatório (Gratuito)"}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
