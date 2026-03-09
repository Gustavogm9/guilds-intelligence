"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send, Clock, CheckCircle2, Loader2 } from "lucide-react";

type Report = {
    id: string;
    title: string;
    created_at: string;
};

type DeepDiveRequest = {
    id: string;
    topic: string;
    context: string | null;
    status: string;
    created_at: string;
    responded_at: string | null;
    admin_notes: string | null;
};

export default function DeepDivePage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [requests, setRequests] = useState<DeepDiveRequest[]>([]);
    const [topic, setTopic] = useState("");
    const [context, setContext] = useState("");
    const [selectedReport, setSelectedReport] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: client } = await supabase
                .from("clients")
                .select("id")
                .eq("user_id", user.id)
                .single();

            if (!client) return;

            // Carregar relatórios do cliente
            const { data: r } = await supabase
                .from("reports")
                .select("id, title, created_at")
                .eq("client_id", client.id)
                .eq("status", "done")
                .order("created_at", { ascending: false });

            setReports(r || []);

            // Carregar deep dives anteriores
            const { data: dd } = await supabase
                .from("deep_dive_requests")
                .select("*")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false });

            setRequests(dd || []);
        }
        load();
    }, []);

    async function handleSubmit() {
        if (!topic.trim()) return;
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: client } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!client) return;

        const { error } = await supabase.from("deep_dive_requests").insert({
            client_id: client.id,
            topic: topic.trim(),
            context: context.trim() || null,
            reference_report_id: selectedReport || null,
            status: "pending",
        });

        setLoading(false);
        if (!error) {
            setSubmitted(true);
            setTopic("");
            setContext("");
            setSelectedReport("");
            // Reload requests
            const { data: dd } = await supabase
                .from("deep_dive_requests")
                .select("*")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false });
            setRequests(dd || []);
            setTimeout(() => setSubmitted(false), 3000);
        }
    }

    const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
        pending: { label: "Pendente", icon: Clock, color: "bg-amber-100 text-amber-800" },
        in_progress: { label: "Em andamento", icon: Loader2, color: "bg-blue-100 text-blue-800" },
        delivered: { label: "Entregue", icon: CheckCircle2, color: "bg-green-100 text-green-800" },
        cancelled: { label: "Cancelado", icon: Clock, color: "bg-red-100 text-red-800" },
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Deep Dive</h1>
                <p className="text-muted-foreground mt-1">
                    Solicite uma análise aprofundada sobre qualquer tema do seu relatório
                </p>
            </div>

            {/* Formulário */}
            <Card className="p-6 mb-8 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold">Nova solicitação</h2>
                        <p className="text-xs text-muted-foreground">
                            Diga qual tema quer aprofundar e nós investigamos
                        </p>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="topic">Tema do deep dive *</Label>
                        <Textarea
                            id="topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Ex: Aprofundar na tendência de IA generativa no setor farmacêutico que apareceu no meu último relatório"
                            rows={3}
                        />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="ref-report">Relatório de referência</Label>
                            <Select
                                value={selectedReport}
                                onValueChange={(v: string | null) => setSelectedReport(v ?? "")}
                            >
                                <SelectTrigger id="ref-report">
                                    <SelectValue placeholder="Selecione (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reports.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {r.title || new Date(r.created_at).toLocaleDateString("pt-BR")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="context">Contexto adicional</Label>
                            <Textarea
                                id="context"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="Informações extras"
                                rows={1}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={!topic.trim() || loading}
                        className="gap-2 w-fit"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : submitted ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Enviado!
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Solicitar Deep Dive
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Histórico */}
            <h2 className="text-lg font-bold mb-4">Solicitações anteriores</h2>
            {requests.length > 0 ? (
                <div className="grid gap-3">
                    {requests.map((req) => {
                        const cfg = statusConfig[req.status] || statusConfig.pending;
                        return (
                            <Card key={req.id} className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium">{req.topic}</p>
                                        {req.context && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {req.context}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {new Date(req.created_at).toLocaleDateString("pt-BR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                        {req.admin_notes && (
                                            <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                                    Resposta da equipe:
                                                </p>
                                                {req.admin_notes}
                                            </div>
                                        )}
                                    </div>
                                    <Badge
                                        className={`ml-4 shrink-0 ${cfg.color}`}
                                        variant="secondary"
                                    >
                                        {cfg.label}
                                    </Badge>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground text-sm">
                        Nenhuma solicitação de deep dive ainda. Use o formulário acima
                        para pedir uma análise aprofundada.
                    </p>
                </Card>
            )}
        </div>
    );
}
