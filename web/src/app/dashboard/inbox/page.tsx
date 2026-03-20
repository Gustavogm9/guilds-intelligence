import Link from "next/link";
import { Bell, FileText, Sparkles, AlertCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventTracker } from "@/components/tracking/event-tracker";
import { MarkNotificationsRead } from "@/components/dashboard/mark-notifications-read";
import { formatDateTime, getDictionary } from "@/lib/i18n";

type InboxItem = {
    id: string;
    type: "report_ready" | "report_processing" | "deep_dive_update" | "whatsapp_message" | "notification";
    title: string;
    description: string;
    createdAt: string;
    href: string;
    badge: string;
    isUnread?: boolean;
};

function sortByDate(items: InboxItem[]) {
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default async function DashboardInboxPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("id, preferred_language")
        .eq("user_id", user!.id)
        .single();

    const t = getDictionary(client?.preferred_language);

    const [{ data: reports }, { data: deepDives }, whatsappRes, { data: notifications }] = client
        ? await Promise.all([
            supabase
                .from("reports")
                .select("id, title, status, created_at, completed_at")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("deep_dive_requests")
                .select("id, topic, status, created_at, responded_at, admin_notes")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("whatsapp_messages")
                .select("id, direction, status, body, created_at, report_id")
                .eq("client_id", client.id)
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("user_notifications")
                .select("id, type, title, content, action_url, is_read, created_at")
                .eq("user_id", user!.id)
                .order("created_at", { ascending: false })
                .limit(10)
        ])
        : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

    const reportItems: InboxItem[] = (reports || []).map((report: Record<string, unknown>) => {
        const done = report.status === "done";
        return {
            id: String(report.id),
            type: done ? "report_ready" : "report_processing",
            title: done ? t.reportReady : t.reportInProgress,
            description: String(report.title || t.intelligenceReport),
            createdAt: String(report.completed_at || report.created_at),
            href: `/dashboard/reports/${report.id}`,
            badge: done ? t.deliveryBadge : t.queueBadge,
        };
    });

    const deepDiveItems: InboxItem[] = (deepDives || []).map((item: Record<string, unknown>) => ({
        id: String(item.id),
        type: "deep_dive_update",
        title: item.status === "delivered" ? t.deepDiveDelivered : t.deepDiveUpdated,
        description: String(item.admin_notes || item.topic || t.deepDiveUpdateFallback),
        createdAt: String(item.responded_at || item.created_at),
        href: "/dashboard/deep-dive",
        badge: t.deepDiveBadge,
    }));

    const whatsappItems: InboxItem[] = ((whatsappRes.data as Record<string, unknown>[] | null) || []).map((item) => ({
        id: String(item.id),
        type: "whatsapp_message",
        title:
            String(item.direction) === "inbound"
                ? t.locale === "en-US"
                    ? "WhatsApp reply received"
                    : "Resposta recebida no WhatsApp"
                : t.locale === "en-US"
                  ? "WhatsApp update sent"
                  : "Atualização enviada por WhatsApp",
        description: String(item.body || ""),
        createdAt: String(item.created_at),
        href: item.report_id ? `/dashboard/reports/${item.report_id}` : "/dashboard/inbox",
        badge: t.locale === "en-US" ? "WhatsApp" : "WhatsApp",
    }));

    const notifItems: InboxItem[] = (notifications || []).map((item) => ({
        id: String(item.id),
        type: "notification",
        title: String(item.title),
        description: String(item.content || ""),
        createdAt: String(item.created_at),
        href: item.action_url ? String(item.action_url) : "#",
        badge: "Novo",
        isUnread: !item.is_read
    }));

    // Evitar duplicação visual de "reports prontos" já cobertos pelas notificações 
    // ou apenas misturar e deixar ordenado. Para fins de simplicidade, vamos misturar tudo.
    const inboxItems = sortByDate([...reportItems, ...deepDiveItems, ...whatsappItems, ...notifItems]).slice(0, 30);

    return (
        <div className="space-y-8">
            <EventTracker eventType="inbox_view" metadata={{ items_count: inboxItems.length }} />
            <MarkNotificationsRead />

            <div>
                <h1 className="text-3xl font-bold">{t.inboxTitle}</h1>
                <p className="text-muted-foreground mt-1">
                    {t.inboxDescription}
                </p>
            </div>

            <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium">{t.inboxHeroTitle}</p>
                        <p className="text-sm text-muted-foreground">
                            {t.inboxHeroDescription}
                        </p>
                    </div>
                </div>
            </Card>

            {inboxItems.length > 0 ? (
                <div className="grid gap-4">
                    {inboxItems.map((item) => (
                        <Card key={`${item.type}-${item.id}`} className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 h-10 w-10 rounded-lg flex items-center justify-center ${item.isUnread ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        {item.type === "deep_dive_update" ? (
                                            <Sparkles className="h-5 w-5" />
                                        ) : item.type === "notification" ? (
                                            <AlertCircle className="h-5 w-5" />
                                        ) : (
                                            <FileText className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <p className="font-medium">{item.title}</p>
                                            <Badge variant="secondary">{item.badge}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {item.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {formatDateTime(item.createdAt, client?.preferred_language)}
                                        </p>
                                    </div>
                                </div>
                                <Link href={item.href} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground shrink-0">
                                    {t.locale === "en-US" ? "Open" : "Abrir"}
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">
                        {t.emptyInbox}
                    </p>
                </Card>
            )}
        </div>
    );
}
