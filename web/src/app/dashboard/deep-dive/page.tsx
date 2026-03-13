"use client";

import { useEffect, useState } from "react";
import { Sparkles, Send, CheckCircle2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking";
import { formatDate, getDictionary } from "@/lib/i18n";
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
    const [preferredLanguage, setPreferredLanguage] = useState("pt-BR");

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: client } = await supabase
                .from("clients")
                .select("id, preferred_language")
                .eq("user_id", user.id)
                .single();

            if (!client) return;

            setPreferredLanguage(client.preferred_language || "pt-BR");

            const { data: reportRows } = await supabase
                .from("reports")
                .select("id, title, created_at")
                .eq("client_id", client.id)
                .eq("status", "done")
                .order("created_at", { ascending: false });

            const { data: deepDiveRows } = await supabase
                .from("deep_dive_requests")
                .select("*")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false });

            setReports(reportRows || []);
            setRequests(deepDiveRows || []);
        }

        load();
    }, []);

    async function handleSubmit() {
        if (!topic.trim()) return;
        setLoading(true);
        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: client } = await supabase
            .from("clients")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!client) {
            setLoading(false);
            return;
        }

        const { error } = await supabase.from("deep_dive_requests").insert({
            client_id: client.id,
            topic: topic.trim(),
            context: context.trim() || null,
            reference_report_id: selectedReport || null,
            status: "pending",
        });

        setLoading(false);
        if (!error) {
            trackEvent("deep_dive_requested", {
                reference_report_id: selectedReport || null,
                topic_length: topic.trim().length,
            });

            setSubmitted(true);
            setTopic("");
            setContext("");
            setSelectedReport("");

            const { data: deepDiveRows } = await supabase
                .from("deep_dive_requests")
                .select("*")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false });

            setRequests(deepDiveRows || []);
            setTimeout(() => setSubmitted(false), 3000);
        }
    }

    const t = getDictionary(preferredLanguage);
    const statusConfig: Record<string, { label: string; color: string }> = {
        pending: { label: t.locale === "en-US" ? "Pending" : "Pendente", color: "bg-amber-100 text-amber-800" },
        in_progress: { label: t.locale === "en-US" ? "In progress" : "Em andamento", color: "bg-blue-100 text-blue-800" },
        delivered: { label: t.locale === "en-US" ? "Delivered" : "Entregue", color: "bg-green-100 text-green-800" },
        cancelled: { label: t.locale === "en-US" ? "Cancelled" : "Cancelado", color: "bg-red-100 text-red-800" },
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">{t.deepDiveTitle}</h1>
                <p className="text-muted-foreground mt-1">
                    {t.deepDiveDescription}
                </p>
            </div>

            <Card className="p-6 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold">{t.newRequest}</h2>
                        <p className="text-xs text-muted-foreground">
                            {t.newRequestDescription}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="topic">{t.deepDiveTopic}</Label>
                        <Textarea
                            id="topic"
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder={t.topicPlaceholder}
                            rows={3}
                        />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="ref-report">{t.referenceReport}</Label>
                            <Select value={selectedReport} onValueChange={(value) => setSelectedReport(value ?? "")}>
                                <SelectTrigger id="ref-report">
                                    <SelectValue placeholder={t.optionalSelect} />
                                </SelectTrigger>
                                <SelectContent>
                                    {reports.map((report) => (
                                        <SelectItem key={report.id} value={report.id}>
                                            {report.title || formatDate(report.created_at, preferredLanguage)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="context">{t.additionalContext}</Label>
                            <Textarea
                                id="context"
                                value={context}
                                onChange={(event) => setContext(event.target.value)}
                                placeholder={t.contextPlaceholder}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                        {t.requestHint}
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={!topic.trim() || loading}
                        className="gap-2 w-fit"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t.sending}
                            </>
                        ) : submitted ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                {t.requestSent}
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                {t.requestDeepDive}
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            <div>
                <h2 className="text-lg font-bold mb-4">{t.previousRequests}</h2>
                {requests.length > 0 ? (
                    <div className="grid gap-3">
                        {requests.map((request) => {
                            const status = statusConfig[request.status] || statusConfig.pending;
                            return (
                                <Card key={request.id} className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <p className="font-medium">{request.topic}</p>
                                            {request.context ? (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {request.context}
                                                </p>
                                            ) : null}
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {formatDate(request.created_at, preferredLanguage, {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                            {request.admin_notes ? (
                                                <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                                        {t.teamResponse}
                                                    </p>
                                                    {request.admin_notes}
                                                </div>
                                            ) : null}
                                        </div>
                                        <Badge className={`ml-4 shrink-0 ${status.color}`} variant="secondary">
                                            {status.label}
                                        </Badge>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground text-sm">
                            {t.noDeepDiveYet}
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}
