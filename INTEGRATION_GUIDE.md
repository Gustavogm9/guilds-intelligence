# Guilds Intelligence Engine — Integration Guide
> Como os scripts Python existentes se conectam ao Supabase

---

## 1. Visão Geral da Integração

```
Frontend (Next.js)
    │
    ├── Supabase Client (leitura/auth)
    │
    └── POST /api/reports/generate
            │
            └── Chama Python Worker (Railway)
                    │
                    ├── Lê client profile do Supabase
                    ├── Executa gerar_relatorio_cliente.py
                    ├── Executa gerar_social_media.py
                    ├── Faz upload dos arquivos → Supabase Storage
                    └── Atualiza reports table → status = 'done'
```

---

## 2. Instalação: supabase-py nos scripts existentes

```bash
pip install supabase python-dotenv
```

Adicionar ao início de `gerar_relatorio_cliente.py`:

```python
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # service role para bypass RLS
)
```

---

## 3. Ler Perfil do Cliente do Supabase

Substituir a leitura do `profile.json` local por query no banco:

```python
def load_client_from_db(client_id: str) -> dict:
    """Lê perfil do cliente do Supabase."""

    # Dados básicos do cliente
    client_res = supabase.table("clients")\
        .select("*, plans(*)")\
        .eq("id", client_id)\
        .single()\
        .execute()

    client = client_res.data

    # Nichos mapeados
    niches_res = supabase.table("client_niches")\
        .select("niche_name, relevance")\
        .eq("client_id", client_id)\
        .eq("is_active", True)\
        .execute()

    niches = [n["niche_name"] for n in niches_res.data]

    # Montar estrutura compatível com o script existente
    return {
        "id": client["id"],
        "nome_empresa": client["company_name"],
        "contato": {
            "nome": client["contact_name"],
            "email": client["contact_email"]
        },
        "perfil_negocio": {
            "setor": client["industry"],
            "porte": client["company_size"],
            "localizacao": client["location"],
            "descricao": client["description"]
        },
        "produtos_e_servicos": client["products_services"],
        "objetivos_2026": client["goals_2026"] or [],
        "dores_atuais": client["pain_points"] or [],
        "nichos_mapeados_pelo_agente": niches,
        "plano": client["plans"]["name"],
        "formatos_incluidos": client["plans"]["formats"],
        "tom_conteudo": client["content_tone"] or "profissional"
    }
```

---

## 4. Criar Report no Banco (antes de gerar)

```python
def create_report_record(client_id: str) -> str:
    """Cria registro do relatório com status 'processing'. Retorna report_id."""

    res = supabase.table("reports").insert({
        "client_id": client_id,
        "status": "processing"
    }).execute()

    return res.data[0]["id"]
```

---

## 5. Upload de Arquivos para Supabase Storage

```python
def upload_report_files(client_id: str, report_id: str, output_dir: str) -> dict:
    """
    Faz upload de todos os arquivos gerados para Supabase Storage.
    Retorna dict com {file_type: storage_path}.
    """

    file_mapping = {
        "pdf_full":        ("relatorio_completo.pdf",      "pdf_full"),
        "pdf_onepage":     ("relatorio_onepage.pdf",       "pdf_onepage"),
        "audio_mp3":       ("audio_briefing.mp3",          "audio_mp3"),
        "whatsapp_txt":    ("whatsapp_copy.txt",           "whatsapp_txt"),
        "social_story":    ("social_media/story.png",      "social_story"),
        "social_copy_txt": ("social_media/copies.txt",     "social_copy_txt"),
    }

    base_path = f"reports/{client_id}/{report_id}"
    uploaded = {}

    for file_key, (local_name, file_type) in file_mapping.items():
        local_path = os.path.join(output_dir, local_name)
        if not os.path.exists(local_path):
            continue

        storage_path = f"{base_path}/{local_name}"

        with open(local_path, "rb") as f:
            supabase.storage.from_("reports").upload(
                path=storage_path,
                file=f,
                file_options={"content-type": _get_content_type(local_path)}
            )

        # Registrar na tabela report_files
        file_size = os.path.getsize(local_path)
        supabase.table("report_files").insert({
            "report_id": report_id,
            "file_type": file_type,
            "storage_path": storage_path,
            "file_size": file_size
        }).execute()

        uploaded[file_key] = storage_path

    # Upload dos cards individuais de social media
    social_dir = os.path.join(output_dir, "social_media")
    if os.path.exists(social_dir):
        for png_file in sorted(os.listdir(social_dir)):
            if png_file.endswith(".png") and png_file != "story.png":
                local_path = os.path.join(social_dir, png_file)
                storage_path = f"{base_path}/social_media/{png_file}"

                with open(local_path, "rb") as f:
                    supabase.storage.from_("reports").upload(
                        path=storage_path,
                        file=f,
                        file_options={"content-type": "image/png"}
                    )

                supabase.table("report_files").insert({
                    "report_id": report_id,
                    "file_type": "social_card",
                    "storage_path": storage_path,
                    "file_size": os.path.getsize(local_path)
                }).execute()

    return uploaded


def _get_content_type(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower()
    return {
        "pdf": "application/pdf",
        "mp3": "audio/mpeg",
        "txt": "text/plain",
        "png": "image/png",
    }.get(ext, "application/octet-stream")
```

---

## 6. Atualizar Status do Report no Banco

```python
def finalize_report(
    report_id: str,
    title: str,
    summary: str,
    niches_covered: list,
    insights_count: int,
    tokens_input: int = 0,
    tokens_output: int = 0
):
    """Atualiza o relatório como concluído."""

    cost_usd = (tokens_input * 3 + tokens_output * 15) / 1_000_000

    supabase.table("reports").update({
        "status": "done",
        "title": title,
        "summary": summary,
        "niches_covered": niches_covered,
        "insights_count": insights_count,
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "estimated_cost_usd": round(cost_usd, 4),
        "completed_at": "NOW()"
    }).eq("id", report_id).execute()


def fail_report(report_id: str, error_message: str):
    """Marca o relatório como erro."""
    supabase.table("reports").update({
        "status": "error",
        "error_message": error_message
    }).eq("id", report_id).execute()
```

---

## 7. Registrar no Billing Log

```python
def log_billing_event(client_id: str, report_id: str, plan_id: str, plan_name: str, plan_price: int):
    """Registra evento de cobrança."""
    from datetime import date

    billing_month = date.today().replace(day=1).isoformat()

    supabase.table("billing_log").insert({
        "client_id": client_id,
        "report_id": report_id,
        "plan_id": plan_id,
        "billing_month": billing_month,
        "event_type": "report_generated",
        "plan_name": plan_name,
        "plan_price": plan_price
    }).execute()
```

---

## 8. Fluxo Completo Integrado

Substituir o `main()` do `gerar_relatorio_cliente.py` por:

```python
def main_with_supabase(client_id: str):
    """
    Fluxo completo com integração Supabase.
    Chamado pelo Python Worker (Railway) via HTTP.
    """
    report_id = None

    try:
        # 1. Criar registro no banco
        report_id = create_report_record(client_id)
        print(f"[INFO] Report criado: {report_id}")

        # 2. Carregar perfil do cliente
        client = load_client_from_db(client_id)
        print(f"[INFO] Perfil carregado: {client['nome_empresa']}")

        # 3. Carregar portfolio de produtos
        portfolio = load_portfolio()  # função existente adaptada para ler do banco

        # 4. Executar pesquisa e gerar relatório (lógica existente)
        report_data = run_intelligence_engine(client, portfolio)

        # 5. Gerar arquivos (PDFs, áudio, social media)
        output_dir = f"/tmp/reports/{client_id}/{report_id}"
        os.makedirs(output_dir, exist_ok=True)

        build_pdf_completo(client, report_data, output_dir)
        build_pdf_onepage(client, report_data, output_dir)
        build_audio(client, report_data, output_dir)
        build_whatsapp_txt(client, report_data, output_dir)

        if "social_media" in client["formatos_incluidos"]:
            generate_social_media_pack(client, report_data, output_dir)

        # 6. Upload para Supabase Storage
        upload_report_files(client_id, report_id, output_dir)
        print(f"[INFO] Arquivos enviados para Storage")

        # 7. Finalizar relatório no banco
        finalize_report(
            report_id=report_id,
            title=report_data["titulo"],
            summary=report_data["resumo_executivo"],
            niches_covered=report_data["nichos_pesquisados"],
            insights_count=len(report_data["insights"]),
            tokens_input=report_data.get("tokens_input", 0),
            tokens_output=report_data.get("tokens_output", 0)
        )

        # 8. Billing log
        log_billing_event(
            client_id=client_id,
            report_id=report_id,
            plan_id=client["plano_id"],
            plan_name=client["plano"],
            plan_price=client["plano_preco"]
        )

        print(f"[OK] Relatório concluído: {report_id}")
        return {"success": True, "report_id": report_id}

    except Exception as e:
        if report_id:
            fail_report(report_id, str(e))
        print(f"[ERRO] {e}")
        raise
```

---

## 9. Python Worker Server (FastAPI para Railway)

```python
# worker_server.py
from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
import hmac, hashlib, os

app = FastAPI(title="Guilds Intelligence Worker")

WORKER_SECRET = os.environ["PYTHON_WORKER_SECRET"]


def verify_secret(secret: str):
    if not hmac.compare_digest(secret, WORKER_SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized")


class GenerateRequest(BaseModel):
    client_id: str
    report_id: str | None = None  # se None, cria novo


@app.post("/generate")
async def generate(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    x_worker_secret: str = Header(...)
):
    verify_secret(x_worker_secret)

    # Executa em background para responder imediatamente
    background_tasks.add_task(main_with_supabase, req.client_id)

    return {"status": "queued", "client_id": req.client_id}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

### Dockerfile para Railway:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Dependências do sistema (para Pillow, ReportLab, gTTS)
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "worker_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

### requirements.txt:

```
fastapi==0.115.0
uvicorn==0.32.0
supabase==2.9.0
python-dotenv==1.0.1
reportlab==4.2.5
Pillow==10.4.0
gTTS==2.5.3
anthropic==0.40.0
```

---

## 10. Variáveis de Ambiente do Worker (Railway)

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PYTHON_WORKER_SECRET=seu-secret-aqui-min-32-chars
ANTHROPIC_API_KEY=sk-ant-...
PORT=8000
```

---

## 11. Chamada do Worker pelo Next.js

```typescript
// app/api/reports/generate/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { client_id } = await request.json()

  // Verificar limite do plano
  const { data: usage } = await supabase
    .from('monthly_usage')
    .select('reports_remaining')
    .eq('client_id', client_id)
    .single()

  if (usage && usage.reports_remaining <= 0) {
    return NextResponse.json(
      { error: 'Limite de relatórios do plano atingido este mês' },
      { status: 429 }
    )
  }

  // Chamar o Python Worker
  const workerResponse = await fetch(
    `${process.env.PYTHON_WORKER_URL}/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': process.env.PYTHON_WORKER_SECRET!
      },
      body: JSON.stringify({ client_id })
    }
  )

  if (!workerResponse.ok) {
    return NextResponse.json(
      { error: 'Erro ao iniciar geração' },
      { status: 500 }
    )
  }

  return NextResponse.json({ status: 'queued' })
}
```

---

## 12. Download de Arquivos via Signed URLs

```typescript
// app/api/reports/[id]/download/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Buscar arquivos do relatório (RLS garante acesso apenas ao dono)
  const { data: files } = await supabase
    .from('report_files')
    .select('*')
    .eq('report_id', params.id)

  if (!files?.length) {
    return NextResponse.json({ error: 'Arquivos não encontrados' }, { status: 404 })
  }

  // Gerar signed URLs (válidas por 1 hora)
  const urls: Record<string, string> = {}

  for (const file of files) {
    const { data: signed } = await supabase.storage
      .from('reports')
      .createSignedUrl(file.storage_path, 3600)  // 1 hora

    if (signed) {
      urls[file.file_type] = signed.signedUrl
    }
  }

  return NextResponse.json({ urls })
}
```

---

## 13. Checklist de Integração

- [ ] `supabase-py` instalado no ambiente Python
- [ ] Variáveis de ambiente configuradas (`.env` local + Railway)
- [ ] `create_report_record()` chamado antes de iniciar geração
- [ ] `upload_report_files()` chamado após geração
- [ ] `finalize_report()` chamado com metadados corretos
- [ ] `fail_report()` chamado em caso de exceção
- [ ] `log_billing_event()` chamado após sucesso
- [ ] Worker server rodando no Railway
- [ ] Next.js chamando o worker com HMAC secret
- [ ] Supabase Realtime configurado no frontend para live updates
- [ ] Signed URLs funcionando para download
