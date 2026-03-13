import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type ClientOption = {
    id: string;
    company_name: string;
    contact_name?: string | null;
    whatsapp_number?: string | null;
};

type MessageRow = {
    id: string;
    client_id: string;
    report_id?: string | null;
    direction: "inbound" | "outbound";
    status: string;
    message_type?: string | null;
    phone_number?: string | null;
    provider_message_id?: string | null;
    body: string;
    metadata?: Record<string, unknown> | null;
    sent_at?: string | null;
    received_at?: string | null;
    created_at: string;
    clients?: { company_name?: string | null } | { company_name?: string | null }[] | null;
};

function getCompanyName(client: MessageRow["clients"]) {
    if (!client) return "Cliente";
    const normalized = Array.isArray(client) ? client[0] : client;
    return normalized?.company_name || "Cliente";
}

export default async function AdminWhatsappPage({
    searchParams,
}: {
    searchParams: Promise<{ success?: string; error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const [{ data: clientsData }, messagesRes] = await Promise.all([
        supabase
            .from("clients")
            .select("id, company_name, contact_name, whatsapp_number")
            .order("company_name", { ascending: true })
            .limit(200),
        supabase
            .from("whatsapp_messages")
            .select("id, client_id, report_id, direction, status, message_type, phone_number, provider_message_id, body, metadata, sent_at, received_at, created_at, clients(company_name)")
            .order("created_at", { ascending: false })
            .limit(50),
    ]);

    const clients = (clientsData as ClientOption[] | null) || [];
    const messages = ((messagesRes.data as MessageRow[] | null) || []);
    const summary = messages.reduce(
        (acc, item) => {
            acc.total += 1;
            if (item.direction === "inbound") acc.inbound += 1;
            if (item.direction === "outbound") acc.outbound += 1;
            if (item.status === "failed") acc.failed += 1;
            if (item.status === "queued") acc.queued += 1;
            if (item.metadata?.manual_review_required) acc.manualReview += 1;
            return acc;
        },
        { total: 0, inbound: 0, outbound: 0, failed: 0, queued: 0, manualReview: 0 }
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">WhatsApp</h1>
                <p className="text-muted-foreground mt-1">
                    Base operacional para conversas, reenvios e futuras automacoes do canal.
                </p>
            </div>

            {params.success ? (
                <Card className="p-4 border-green-200 bg-green-50 text-green-700">
                    <p className="text-sm font-medium">Mensagem registrada na fila operacional do WhatsApp.</p>
                </Card>
            ) : null}

            {params.error ? (
                <Card className="p-4 border-red-200 bg-red-50 text-red-700">
                    <p className="text-sm font-medium">Não foi possível concluir a ação no canal de WhatsApp.</p>
                </Card>
            ) : null}

            <div className="grid gap-4 md:grid-cols-6">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Mensagens</p>
                    <p className="text-2xl font-bold mt-2">{summary.total}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Entrantes</p>
                    <p className="text-2xl font-bold mt-2">{summary.inbound}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Saidas</p>
                    <p className="text-2xl font-bold mt-2">{summary.outbound}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Em fila</p>
                    <p className="text-2xl font-bold mt-2">{summary.queued}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Falhas</p>
                    <p className="text-2xl font-bold mt-2">{summary.failed}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Revisao manual</p>
                    <p className="text-2xl font-bold mt-2">{summary.manualReview}</p>
                </Card>
            </div>

            <div className="flex justify-end">
                <form action="/api/whatsapp/process" method="post">
                    <button type="submit" className={buttonVariants({ variant: "outline" })}>
                        Processar fila de saida
                    </button>
                </form>
            </div>

            <Card className="p-6">
                <h2 className="font-bold">Enviar mensagem operacional</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Registra uma mensagem de saida que depois podera ser entregue por um provedor real.
                </p>

                <form action="/api/whatsapp/messages" method="post" className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <label className="text-sm space-y-2">
                        <span className="font-medium">Cliente</span>
                        <select
                            name="client_id"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                        >
                            <option value="">Selecione um cliente</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.company_name}
                                    {client.whatsapp_number ? ` - ${client.whatsapp_number}` : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="text-sm space-y-2">
                        <span className="font-medium">Telefone</span>
                        <input
                            type="text"
                            name="phone_number"
                            placeholder="+5511999999999"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="text-sm space-y-2 lg:col-span-2">
                        <span className="font-medium">Mensagem</span>
                        <textarea
                            name="body"
                            rows={5}
                            required
                            placeholder="Mensagem operacional para o cliente"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="text-sm space-y-2">
                        <span className="font-medium">Tipo</span>
                        <select
                            name="message_type"
                            defaultValue="text"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="text">text</option>
                            <option value="report_ready">report_ready</option>
                            <option value="audio">audio</option>
                            <option value="summary">summary</option>
                        </select>
                    </label>

                    <label className="text-sm space-y-2">
                        <span className="font-medium">Report ID opcional</span>
                        <input
                            type="text"
                            name="report_id"
                            placeholder="UUID do relatório"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </label>

                    <div className="lg:col-span-2">
                        <button type="submit" className={buttonVariants()}>
                            Registrar mensagem
                        </button>
                    </div>
                </form>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="font-bold">Fila recente de conversas</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Historico inicial do canal, pronto para receber eventos de webhook e saídas operacionais.
                    </p>
                </div>
                <div className="divide-y divide-border">
                    {messages.length > 0 ? (
                        messages.map((message) => (
                            <div key={message.id} className="p-5 flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <p className="font-medium">{getCompanyName(message.clients)}</p>
                                        <Badge variant={message.direction === "inbound" ? "secondary" : "outline"}>
                                            {message.direction}
                                        </Badge>
                                        <Badge variant={message.status === "failed" ? "destructive" : "outline"}>
                                            {message.status}
                                        </Badge>
                                        {message.metadata?.manual_review_required ? (
                                            <Badge variant="secondary">manual review</Badge>
                                        ) : null}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{message.body}</p>
                                    {message.metadata?.inferred_intent ? (
                                        <p className="text-xs text-muted-foreground">
                                            intencao: {String(message.metadata.inferred_intent)}
                                        </p>
                                    ) : null}
                                    <p className="text-xs text-muted-foreground">
                                        {message.phone_number || "Sem telefone"} • {new Date(message.created_at).toLocaleString("pt-BR")}
                                    </p>
                                    {message.provider_message_id ? (
                                        <p className="text-xs text-muted-foreground">
                                            provider_message_id: {message.provider_message_id}
                                        </p>
                                    ) : null}
                                    {typeof message.metadata?.delivered_via === "string" ? (
                                        <p className="text-xs text-muted-foreground">
                                            entrega: {String(message.metadata.delivered_via)}
                                        </p>
                                    ) : null}
                                    {typeof message.metadata?.last_error === "string" ? (
                                        <p className="text-xs text-red-600">
                                            erro: {message.metadata.last_error}
                                        </p>
                                    ) : null}
                                </div>
                                {message.report_id ? (
                                    <a href={`/dashboard/reports/${message.report_id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                        Abrir relatorio
                                    </a>
                                ) : null}
                            </div>
                        ))
                    ) : (
                        <div className="p-6 text-sm text-muted-foreground">
                            Nenhuma mensagem registrada ainda ou migração pendente.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
