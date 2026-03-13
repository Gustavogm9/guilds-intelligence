create table if not exists public.whatsapp_messages (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references public.clients(id) on delete cascade,
    report_id uuid null references public.reports(id) on delete set null,
    direction text not null check (direction in ('inbound', 'outbound')),
    status text not null default 'queued' check (status in ('queued', 'received', 'sent', 'failed')),
    message_type text not null default 'text',
    phone_number text,
    provider_message_id text,
    body text not null,
    metadata jsonb not null default '{}'::jsonb,
    sent_at timestamptz null,
    received_at timestamptz null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists whatsapp_messages_client_id_idx on public.whatsapp_messages(client_id);
create index if not exists whatsapp_messages_created_at_idx on public.whatsapp_messages(created_at desc);
create index if not exists whatsapp_messages_status_idx on public.whatsapp_messages(status);
