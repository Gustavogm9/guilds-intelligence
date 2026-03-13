from __future__ import annotations

import json
import os
import tempfile
import time
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zipfile import ZIP_DEFLATED, ZipFile

from dotenv import load_dotenv
from supabase import Client, create_client

from engine.gerar_relatorio_cliente import (
    build_audio,
    build_pdf_completo,
    build_pdf_onepage,
    build_whatsapp_txt,
    load_portfolio,
    run_intelligence_engine,
)
from engine.external_intelligence import load_external_intelligence
from engine.global_intelligence import get_intelligence_for_report
from engine.gerar_social_media import generate_social_media_pack

load_dotenv()


def get_client_locale(client: dict[str, Any] | None) -> str:
    language = (
        (client or {}).get("preferencias_conteudo", {}).get("idioma")
        or (client or {}).get("preferred_language")
        or "pt-BR"
    )
    normalized = str(language).lower()
    if normalized.startswith("en"):
        return "en-US"
    return "pt-BR"


def is_english_client(client: dict[str, Any] | None) -> bool:
    return get_client_locale(client) == "en-US"


def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    return create_client(url, key)


def _as_single(record_or_list: Any) -> dict[str, Any] | None:
    if isinstance(record_or_list, list):
        return record_or_list[0] if record_or_list else None
    return record_or_list


def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> bool:
    data = json.dumps(payload).encode("utf-8")
    request = Request(url, data=data, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=20) as response:
            return 200 <= response.status < 300
    except (HTTPError, URLError, TimeoutError):
        return False


def send_operational_webhook(
    title: str,
    message: str,
    severity: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    webhook_url = os.getenv("OPERATIONAL_WEBHOOK_URL") or os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return

    lines = [f"severity: {severity}", message]
    for key, value in (metadata or {}).items():
        if value not in (None, ""):
            lines.append(f"{key}: {value}")

    _post_json(
        webhook_url,
        {"text": f"[ClientIntelligence] {title}\n" + "\n".join(lines)},
        {"Content-Type": "application/json"},
    )


def send_email_via_mailersend(to_email: str, subject: str, html: str) -> bool:
    api_key = os.getenv("MAILERSEND_API_KEY")
    email_from = os.getenv("EMAIL_FROM")
    if not api_key or not email_from or not to_email:
        return False

    return _post_json(
        "https://api.mailersend.com/v1/email",
        {
            "from": {"email": email_from},
            "to": [{"email": to_email}],
            "subject": subject,
            "html": html,
        },
        {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )


def _dashboard_base_url() -> str:
    return (
        os.getenv("APP_BASE_URL")
        or os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("NEXT_PUBLIC_SITE_URL")
        or ""
    ).rstrip("/")


def _translate_report_data_for_locale(report_data: dict[str, Any], client: dict[str, Any]) -> dict[str, Any]:
    if not is_english_client(client):
        return report_data

    localized = deepcopy(report_data)

    for insight in localized.get("top5_insights", []):
        if insight.get("acao"):
            insight["acao"] = f"Recommended action: {insight['acao']}"
        if insight.get("fonte"):
            insight["fonte"] = f"Source: {insight['fonte']}"

    localized["alertas"] = [f"Alert: {item}" for item in localized.get("alertas", [])]
    localized["oportunidades"] = [f"Opportunity: {item}" for item in localized.get("oportunidades", [])]
    localized["guilds_mensagem_cliente"] = (
        "Guilds recommendation: " + str(localized.get("guilds_mensagem_cliente") or "")
    )
    return localized


def build_localized_whatsapp_txt(client: dict[str, Any], report_data: dict[str, Any], output_dir: Path) -> Path:
    localized = _translate_report_data_for_locale(report_data, client)
    if not is_english_client(client):
        return build_whatsapp_txt(client, localized, output_dir)

    date_str = datetime.now().strftime("%d/%m/%Y")
    date_file = datetime.now().strftime("%d%m%Y")
    client_name = client["nome_empresa"]
    filename = output_dir / f"Guilds_WhatsApp_{client_name.replace(' ', '_')}_{date_file}.txt"

    lines = [
        f"GUILDS CLIENT INTELLIGENCE - {date_str}",
        f"Tailored report for: {client_name}",
        "",
        "TOP 5 INSIGHTS OF THE DAY:",
        "",
    ]

    for index, insight in enumerate(localized.get("top5_insights", [])[:5], 1):
        lines.extend(
            [
                f"{index}. {insight.get('titulo', '')}",
                str(insight.get("desc", ""))[:180],
                str(insight.get("acao", "")),
                "",
            ]
        )

    lines.extend(["ALERTS:"])
    for item in localized.get("alertas", [])[:3]:
        lines.append(f"- {item}")

    lines.extend(["", "OPPORTUNITIES:"])
    for item in localized.get("oportunidades", [])[:3]:
        lines.append(f"- {item}")

    lines.extend(
        [
            "",
            "GUILDS RECOMMENDATION:",
            str(localized.get("guilds_mensagem_cliente") or ""),
            "",
            f"Guilds Intelligence Engine | {date_str}",
            "guilds.com.br",
        ]
    )

    filename.write_text("\n".join(lines), encoding="utf-8")
    return filename


def build_localized_audio(client: dict[str, Any], report_data: dict[str, Any], output_dir: Path) -> Path:
    if not is_english_client(client):
        return build_audio(client, report_data, output_dir)

    from gtts import gTTS

    localized = _translate_report_data_for_locale(report_data, client)
    date_str = datetime.now().strftime("%d/%m/%Y")
    date_file = datetime.now().strftime("%d%m%Y")
    client_name = client["nome_empresa"]
    filename = output_dir / f"Guilds_Audio_{client_name.replace(' ', '_')}_{date_file}.mp3"

    script = [
        f"Guilds Client Intelligence. Tailored report for {client_name}. Date: {date_str}.",
        "Here is your personalized market briefing.",
        "Top insights of the day:",
    ]

    for index, insight in enumerate(localized.get("top5_insights", [])[:5], 1):
        script.append(
            f"Number {index}. {insight.get('titulo', '')}. {insight.get('desc', '')}. {insight.get('acao', '')}."
        )

    if localized.get("alertas"):
        script.append("Alerts to watch:")
        script.extend(str(item) for item in localized.get("alertas", [])[:2])

    if localized.get("oportunidades"):
        script.append("Main opportunities:")
        script.extend(str(item) for item in localized.get("oportunidades", [])[:2])

    if localized.get("guilds_mensagem_cliente"):
        script.append(str(localized["guilds_mensagem_cliente"]))

    script.append(f"That was today's briefing for {client_name}.")
    tts = gTTS(text=" ".join(script), lang="en", slow=False)
    tts.save(str(filename))
    return filename


def build_report_email_html(client: dict[str, Any], report_id: str) -> str:
    company_name = client["nome_empresa"]
    contact_name = client.get("contato", {}).get("nome") or company_name
    dashboard_base = _dashboard_base_url()
    report_url = f"{dashboard_base}/dashboard/reports/{report_id}" if dashboard_base else ""

    cta_label = "Open report" if is_english_client(client) else "Abrir relatorio"
    cta = (
        f'<p><a href="{report_url}" '
        'style="display:inline-block;padding:12px 18px;background:#FF6B00;color:#ffffff;text-decoration:none;border-radius:8px;">'
        f"{cta_label}"
        "</a></p>"
        if report_url
        else ""
    )

    if is_english_client(client):
        return (
            f"<h2>Your Guilds report is ready</h2>"
            f"<p>Hello, {contact_name}.</p>"
            f"<p>The new intelligence report for <strong>{company_name}</strong> has been completed and is now available in the dashboard.</p>"
            f"{cta}"
            "<p>You will find the PDF, audio briefing, WhatsApp copy, and social pack whenever those formats are included in your plan.</p>"
            "<p>Guilds Intelligence Engine</p>"
        )

    return (
        f"<h2>Seu relatorio da Guilds esta pronto</h2>"
        f"<p>Ola, {contact_name}.</p>"
        f"<p>O novo relatorio de inteligencia para <strong>{company_name}</strong> foi concluido e ja esta disponivel no dashboard.</p>"
        f"{cta}"
        "<p>Voce encontrara o PDF, briefing em audio, copy de WhatsApp e pack social, quando incluidos no seu plano.</p>"
        "<p>Guilds Intelligence Engine</p>"
    )


def build_failure_email_html(client_name: str, report_id: str, error_message: str) -> str:
    return (
        "<h2>Falha na geracao de relatorio</h2>"
        f"<p>Cliente: <strong>{client_name}</strong></p>"
        f"<p>Report ID: <code>{report_id}</code></p>"
        f"<p>Erro: {error_message[:1000]}</p>"
        "<p>Verifique o painel de Ops e a tela de relatorios para reprocessar, se necessario.</p>"
    )


def load_client_from_db(supabase: Client, client_id: str) -> dict[str, Any]:
    client_res = (
        supabase.table("clients")
        .select("*, plans(id, name, price_monthly, reports_per_month, formats)")
        .eq("id", client_id)
        .single()
        .execute()
    )
    client = client_res.data
    if not client:
        raise RuntimeError(f"Client not found: {client_id}")

    niches_res = (
        supabase.table("client_niches")
        .select("niche_name, relevance")
        .eq("client_id", client_id)
        .eq("is_active", True)
        .execute()
    )
    niches = [row["niche_name"] for row in (niches_res.data or [])]
    plan = _as_single(client.get("plans")) or {}

    return {
        "id": client["id"],
        "supabase_client_id": client["id"],
        "nome_empresa": client["company_name"],
        "contato": {
            "nome": client.get("contact_name") or "",
            "email": client.get("contact_email") or "",
            "whatsapp": client.get("contact_phone") or "",
        },
        "perfil_negocio": {
            "setor": client.get("industry") or "",
            "subsetor": "",
            "localizacao": client.get("location") or "",
            "tamanho": client.get("company_size") or "",
            "tempo_mercado": "",
            "modelo_negocio": "",
            "clientes_atuais": client.get("target_audience") or "",
            "ticket_medio_cliente": client.get("annual_revenue") or "",
        },
        "produtos_e_servicos": _normalize_products(client.get("products_services")),
        "objetivos_2026": client.get("goals_2026") or [],
        "dores_atuais": client.get("pain_points") or [],
        "nichos_mapeados_pelo_agente": niches,
        "historico_relatorios": [],
        "preferencias_conteudo": {
            "tom": client.get("content_tone") or "profissional",
            "profundidade": "Alta",
            "foco_principal": "Oportunidades de mercado",
            "idioma": client.get("preferred_language") or "pt-BR",
        },
        "_texto_original": client.get("raw_onboarding_text") or "",
        "website_url": client.get("website_url") or "",
        "social_media_urls": client.get("social_media_urls") or [],
        "plano": plan.get("name") or "",
        "plano_id": plan.get("id"),
        "plano_preco": plan.get("price_monthly") or 0,
        "formatos_incluidos": plan.get("formats") or [],
    }


def _estimate_tokens_from_text(text: str) -> int:
    if not text:
        return 0
    return max(len(text) // 4, 1)


def estimate_job_metrics(client: dict[str, Any], report_data: dict[str, Any]) -> dict[str, Any]:
    input_blob = json.dumps(
        {
            "client": client,
            "portfolio_context": client.get("formatos_incluidos"),
        },
        ensure_ascii=False,
    )
    output_blob = json.dumps(report_data, ensure_ascii=False)

    tokens_input = _estimate_tokens_from_text(input_blob)
    tokens_output = _estimate_tokens_from_text(output_blob)
    estimated_cost_usd = round((tokens_input * 3 + tokens_output * 15) / 1_000_000, 4)

    return {
        "tokens_input": tokens_input,
        "tokens_output": tokens_output,
        "estimated_cost_usd": estimated_cost_usd,
    }


def load_recent_reports_for_retrospective(
    supabase: Client,
    client_id: str,
    current_report_id: str,
) -> list[dict[str, Any]]:
    response = (
        supabase.table("reports")
        .select(
            "id, title, summary, hypotheses, retrospective_items, retrospective_score, niches_covered, created_at"
        )
        .eq("client_id", client_id)
        .eq("status", "done")
        .neq("id", current_report_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    return response.data or []


def load_operational_signals(
    supabase: Client,
    client_id: str,
) -> dict[str, list[dict[str, Any]]]:
    social_response = (
        supabase.table("social_publications")
        .select("platform, status, performance_score, published_at, post_caption")
        .eq("client_id", client_id)
        .order("published_at", desc=True)
        .limit(10)
        .execute()
    )

    deep_dive_response = (
        supabase.table("deep_dive_requests")
        .select("topic, context, status, responded_at, created_at")
        .eq("client_id", client_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    return {
        "social_publications": social_response.data or [],
        "deep_dive_requests": deep_dive_response.data or [],
    }


def log_worker_event(
    supabase: Client,
    event_type: str,
    metadata: dict[str, Any],
) -> None:
    try:
        (
            supabase.table("funnel_events")
            .insert(
                {
                    "event_type": event_type,
                    "metadata": metadata,
                }
            )
            .execute()
        )
    except Exception:
        pass


def classify_worker_failure(stage: str, error_message: str) -> tuple[str, str]:
    normalized = error_message.lower()

    if "configur" in normalized or "service_role" in normalized or "secret" in normalized:
        return "configuration", "critical"
    if stage in {"load_client"}:
        return "auth", "warning"
    if stage in {"storage_upload", "report_files"} or "upload" in normalized or "storage" in normalized:
        return "storage_upload", "warning"
    if stage in {"pdf_full", "pdf_onepage", "audio", "social_pack", "whatsapp", "intelligence"}:
        return "artifact_generation", "warning"
    if stage in {"billing"} or "billing" in normalized:
        return "billing", "warning"
    if stage in {"notify_success"}:
        return "notification", "warning"
    return "worker_unavailable", "critical"


def _normalize_products(products_services: Any) -> list[dict[str, str]]:
    if isinstance(products_services, list):
        normalized: list[dict[str, str]] = []
        for item in products_services:
            if isinstance(item, dict):
                normalized.append(
                    {
                        "nome": str(item.get("nome") or item.get("name") or "Produto"),
                        "tipo": str(item.get("tipo") or item.get("type") or ""),
                        "descricao": str(item.get("descricao") or item.get("description") or ""),
                    }
                )
            else:
                normalized.append({"nome": str(item), "tipo": "", "descricao": ""})
        return normalized

    if isinstance(products_services, str) and products_services.strip():
        return [
            {
                "nome": "Oferta principal",
                "tipo": "Servico",
                "descricao": products_services.strip(),
            }
        ]

    return []


def mark_report_processing(supabase: Client, report_id: str) -> None:
    (
        supabase.table("reports")
        .update({"status": "processing", "error_message": None})
        .eq("id", report_id)
        .execute()
    )


def finalize_report(
    supabase: Client,
    report_id: str,
    report_data: dict[str, Any],
    client: dict[str, Any],
    job_metrics: dict[str, Any] | None = None,
    used_fallback_rss: bool = False,
) -> None:
    insights = report_data.get("top5_insights", [])
    summary = " ".join(
        [str(report_data.get("guilds_mensagem_cliente") or "").strip()]
        + [str(item.get("titulo") or "").strip() for item in insights[:3]]
    ).strip()
    metrics = job_metrics or {}

    (
        supabase.table("reports")
        .update(
            {
                "status": "done",
                "title": (
                    f"Intelligence Report - {client['nome_empresa']}"
                    if is_english_client(client)
                    else f"Relatorio de Inteligencia - {client['nome_empresa']}"
                ),
                "summary": summary[:1000] if summary else None,
                "niches_covered": client.get("nichos_mapeados_pelo_agente") or [],
                "insights_count": len(insights),
                "hypotheses": report_data.get("hypotheses") or [],
                "retrospective_items": (report_data.get("retrospective") or {}).get("items") or [],
                "retrospective_summary": (report_data.get("retrospective") or {}).get("summary"),
                "retrospective_score": (report_data.get("retrospective") or {}).get("score"),
                "external_sources": report_data.get("external_signals") or [],
                "external_signal_count": len(report_data.get("external_signals") or []),
                "external_signal_summary": report_data.get("external_signal_summary"),
                "external_intelligence_mode": (report_data.get("engine_metadata") or {}).get("external_summary_mode"),
                "external_feeds_considered": (report_data.get("engine_metadata") or {}).get("external_feeds_considered", 0),
                "external_llm_used": (report_data.get("engine_metadata") or {}).get("external_llm_used", False),
                "external_estimated_cost_usd": (report_data.get("engine_metadata") or {}).get("external_estimated_cost_usd", 0),
                "tokens_input": metrics.get("tokens_input", 0),
                "tokens_output": metrics.get("tokens_output", 0),
                "estimated_cost_usd": metrics.get("estimated_cost_usd", 0),
                "completed_at": "now()",
                "is_free_regeneration_available": used_fallback_rss,
            }
        )
        .eq("id", report_id)
        .execute()
    )


def mark_email_sent(supabase: Client, report_id: str) -> None:
    (
        supabase.table("reports")
        .update({"email_sent_at": datetime.utcnow().isoformat()})
        .eq("id", report_id)
        .execute()
    )


def fail_report(supabase: Client, report_id: str, error_message: str) -> None:
    (
        supabase.table("reports")
        .update({"status": "error", "error_message": error_message[:2000]})
        .eq("id", report_id)
        .execute()
    )


def _billing_month_iso() -> str:
    from datetime import date

    today = date.today()
    return today.replace(day=1).isoformat()


def register_billing(supabase: Client, client: dict[str, Any], report_id: str) -> None:
    plan_id = client.get("plano_id")
    if not plan_id:
        return

    existing = (
        supabase.table("billing_log")
        .select("id")
        .eq("report_id", report_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    (
        supabase.table("billing_log")
        .insert(
            {
                "client_id": client["supabase_client_id"],
                "report_id": report_id,
                "plan_id": plan_id,
                "billing_month": _billing_month_iso(),
                "event_type": "report_generated",
                "plan_name": client.get("plano") or "",
                "plan_price": client.get("plano_preco") or 0,
            }
        )
        .execute()
    )


def _content_type(path: Path) -> str:
    return {
        ".pdf": "application/pdf",
        ".mp3": "audio/mpeg",
        ".txt": "text/plain; charset=utf-8",
        ".png": "image/png",
        ".zip": "application/zip",
    }.get(path.suffix.lower(), "application/octet-stream")


def _upload_file(supabase: Client, storage_path: str, local_path: Path) -> None:
    with local_path.open("rb") as file_handle:
        supabase.storage.from_("reports").upload(
            path=storage_path,
            file=file_handle,
            file_options={"content-type": _content_type(local_path), "upsert": "true"},
        )


def _insert_report_file(
    supabase: Client,
    report_id: str,
    file_type: str,
    storage_path: str,
    local_path: Path,
) -> None:
    (
        supabase.table("report_files")
        .insert(
            {
                "report_id": report_id,
                "file_type": file_type,
                "storage_path": storage_path,
                "file_size": local_path.stat().st_size,
            }
        )
        .execute()
    )


def _replace_report_files(supabase: Client, report_id: str) -> None:
    supabase.table("report_files").delete().eq("report_id", report_id).execute()


def build_social_zip(output_dir: Path) -> Path | None:
    social_dir = output_dir / "social_media"
    if not social_dir.exists():
        return None

    zip_path = output_dir / "Guilds_SocialMedia_Pack.zip"
    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as zip_file:
        for file_path in social_dir.rglob("*"):
            if file_path.is_file():
                zip_file.write(file_path, file_path.relative_to(output_dir))
    return zip_path


def upload_report_files(
    supabase: Client,
    report_id: str,
    client_id: str,
    artifacts: dict[str, Any],
) -> list[dict[str, str]]:
    _replace_report_files(supabase, report_id)
    uploaded: list[dict[str, str]] = []
    base_path = f"{client_id}/{report_id}"

    main_mapping = {
        "pdf_full": artifacts.get("pdf_full"),
        "pdf_onepage": artifacts.get("pdf_onepage"),
        "audio_mp3": artifacts.get("audio_mp3"),
        "whatsapp_txt": artifacts.get("whatsapp_txt"),
        "social_story": artifacts.get("social_story"),
        "social_copy_txt": artifacts.get("social_copy_txt"),
        "social_zip": artifacts.get("social_zip"),
    }

    for file_type, local_path in main_mapping.items():
        if not local_path:
            continue
        path = Path(local_path)
        storage_path = f"{base_path}/{path.name}"
        _upload_file(supabase, storage_path, path)
        _insert_report_file(supabase, report_id, file_type, storage_path, path)
        uploaded.append({"file_type": file_type, "storage_path": storage_path})

    for card_path in artifacts.get("social_cards", []):
        path = Path(card_path)
        storage_path = f"{base_path}/social_media/{path.name}"
        _upload_file(supabase, storage_path, path)
        _insert_report_file(supabase, report_id, "social_card", storage_path, path)
        uploaded.append({"file_type": "social_card", "storage_path": storage_path})

    return uploaded


def notify_report_success(
    supabase: Client,
    client: dict[str, Any],
    report_id: str,
) -> None:
    contact_email = client.get("contato", {}).get("email") or ""
    company_name = client.get("nome_empresa") or "Cliente"
    email_sent = False

    send_operational_webhook(
        "Relatorio concluido",
        "A geracao foi concluida com sucesso.",
        "info",
        {
            "client_name": company_name,
            "report_id": report_id,
        },
    )

    if contact_email:
        subject = (
            f"Your Guilds report is ready - {company_name}"
            if is_english_client(client)
            else f"Seu relatorio Guilds esta pronto - {company_name}"
        )
        email_sent = send_email_via_mailersend(contact_email, subject, build_report_email_html(client, report_id))
        if email_sent:
            mark_email_sent(supabase, report_id)

    log_worker_event(
        supabase,
        "report_notification_sent" if email_sent else "report_notification_skipped",
        {
            "report_id": report_id,
            "client_name": company_name,
            "contact_email": contact_email or None,
            "channel": "email",
            "delivered": email_sent,
        },
    )


def notify_report_failure(
    supabase: Client,
    client: dict[str, Any] | None,
    report_id: str,
    error_message: str,
) -> None:
    company_name = (client or {}).get("nome_empresa") or "Cliente"

    send_operational_webhook(
        "Falha na geracao de relatorio",
        error_message[:1000],
        "critical",
        {
            "client_name": company_name,
            "report_id": report_id,
        },
    )

    ops_email = os.getenv("OPS_ALERT_EMAIL") or os.getenv("ALERT_EMAIL")
    if ops_email:
        delivered = send_email_via_mailersend(
            ops_email,
            f"Falha na geracao de relatorio - {company_name}",
            build_failure_email_html(company_name, report_id, error_message),
        )
        log_worker_event(
            supabase,
            "report_failure_notification_sent" if delivered else "report_failure_notification_failed",
            {
                "report_id": report_id,
                "client_name": company_name,
                "ops_email": ops_email,
                "channel": "email",
                "delivered": delivered,
            },
        )


def generate_and_upload_report(client_id: str, report_id: str) -> dict[str, Any]:
    supabase = get_supabase()
    client: dict[str, Any] | None = None
    current_stage = "initializing"
    started_at = time.perf_counter()
    stage_timings: dict[str, float] = {}

    def mark_stage(stage_name: str) -> None:
        nonlocal current_stage, started_at
        now = time.perf_counter()
        if current_stage != "initializing":
            stage_timings[current_stage] = round(now - started_at, 3)
        current_stage = stage_name
        started_at = now

    try:
        mark_stage("load_client")
        client = load_client_from_db(supabase, client_id)
        mark_report_processing(supabase, report_id)
        output_dir = Path(tempfile.mkdtemp(prefix=f"guilds_{client_id}_{report_id}_"))

        # Enrich client context with website content (cached, TTL 7 days)
        mark_stage("website_enrichment")
        if client.get("website_url"):
            try:
                import requests as http_req
                from datetime import datetime, timezone, timedelta

                # Check cache in DB
                cache_row = supabase.table("clients").select(
                    "website_content_cache, website_content_cached_at"
                ).eq("id", client_id).single().execute()
                cache_data = cache_row.data or {}
                cached_at = cache_data.get("website_content_cached_at")
                cached_text = cache_data.get("website_content_cache")

                site_text = ""
                cache_fresh = False
                if cached_at and cached_text:
                    try:
                        ts = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
                        cache_fresh = datetime.now(timezone.utc) - ts < timedelta(days=7)
                    except Exception:
                        pass

                if cache_fresh and cached_text:
                    site_text = cached_text[:4000]
                else:
                    # Fetch fresh via Jina Reader
                    jina_url = f"https://r.jina.ai/{client['website_url']}"
                    resp = http_req.get(jina_url, headers={"Accept": "text/plain"}, timeout=15)
                    if resp.ok and len(resp.text) > 50:
                        site_text = resp.text[:4000]
                        # Update cache
                        supabase.table("clients").update({
                            "website_content_cache": site_text,
                            "website_content_cached_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", client_id).execute()

                if site_text:
                    client["_texto_original"] = (
                        (client.get("_texto_original") or "")
                        + f"\n\n--- CONTEÚDO DO SITE ({client['website_url']}) ---\n"
                        + site_text
                    )
            except Exception as exc:
                print(f"[website_enrichment] Failed: {exc}")

        # Global Intelligence Gathering (Fase 2: Motor Global de Busca)
        # Retry com backoff exponencial — o Motor Global é MUITO superior ao RSS legado,
        # então vale a pena insistir antes de aceitar um fallback degradado.
        mark_stage("global_intelligence")
        external_intelligence = None
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                external_intelligence = get_intelligence_for_report(
                    supabase,
                    client_id,
                    industry=client.get("perfil_negocio", {}).get("setor", ""),
                    report_id=report_id,
                )
                nodes_total = (
                    external_intelligence.get("nodes_from_search", 0)
                    + external_intelligence.get("nodes_from_cache", 0)
                )
                print(
                    f"[global_intelligence] OK (attempt {attempt}): "
                    f"{external_intelligence.get('niches_processed', 0)} nichos, "
                    f"{nodes_total} nós "
                    f"(cache={external_intelligence.get('nodes_from_cache', 0)}, "
                    f"search={external_intelligence.get('nodes_from_search', 0)})"
                )
                break  # Sucesso — sair do loop
            except Exception as exc:
                wait_seconds = 2 ** attempt  # 2, 4, 8
                print(
                    f"[global_intelligence] Attempt {attempt}/{max_retries} failed: {exc}. "
                    f"{'Retrying in ' + str(wait_seconds) + 's...' if attempt < max_retries else 'All retries exhausted.'}"
                )
                if attempt < max_retries:
                    time.sleep(wait_seconds)

        # Último recurso: RSS enriquecido (qualidade inferior ao Motor Global)
        used_fallback_rss = external_intelligence is None
        if used_fallback_rss:
            print("[global_intelligence] ⚠️ ALERT: Motor Global falhou após 3 tentativas. Usando RSS enriquecido.")
            external_intelligence = load_external_intelligence(client)

        mark_stage("intelligence")
        portfolio = load_portfolio()
        previous_reports = load_recent_reports_for_retrospective(supabase, client_id, report_id)
        operational_signals = load_operational_signals(supabase, client_id)
        report_data = run_intelligence_engine(
            client,
            portfolio,
            previous_reports=previous_reports,
            operational_signals=operational_signals,
            external_intelligence=external_intelligence,
        )
        job_metrics = estimate_job_metrics(client, report_data)

        mark_stage("pdf_full")
        pdf_full = build_pdf_completo(client, portfolio, report_data, output_dir)
        mark_stage("pdf_onepage")
        pdf_onepage = build_pdf_onepage(client, report_data, output_dir)
        mark_stage("whatsapp")
        whatsapp_txt = build_localized_whatsapp_txt(client, report_data, output_dir)
        mark_stage("audio")
        audio_mp3 = build_localized_audio(client, report_data, output_dir)

        mark_stage("social_pack")
        social_pack = generate_social_media_pack(client, report_data, output_dir)
        social_story = next(iter(social_pack.get("stories", [])), None)
        social_copy_txt = next(iter(social_pack.get("copy", [])), None)
        social_cards = social_pack.get("feed", [])
        social_zip = build_social_zip(output_dir)

        artifacts = {
            "pdf_full": pdf_full,
            "pdf_onepage": pdf_onepage,
            "whatsapp_txt": whatsapp_txt,
            "audio_mp3": audio_mp3,
            "social_story": social_story,
            "social_copy_txt": social_copy_txt,
            "social_zip": social_zip,
            "social_cards": social_cards,
        }

        mark_stage("storage_upload")
        uploaded = upload_report_files(supabase, report_id, client_id, artifacts)
        mark_stage("finalize_report")
        finalize_report(supabase, report_id, report_data, client, job_metrics, used_fallback_rss)

        mark_stage("billing")
        register_billing(supabase, client, report_id)

        mark_stage("notify_success")
        notify_report_success(supabase, client, report_id)
        stage_timings[current_stage] = round(time.perf_counter() - started_at, 3)

        total_duration = round(sum(stage_timings.values()), 3)
        log_worker_event(
            supabase,
            "worker_job_completed",
            {
                "client_id": client_id,
                "report_id": report_id,
                "client_name": client.get("nome_empresa"),
                "stage_timings": stage_timings,
                "duration_seconds": total_duration,
                "tokens_input": job_metrics.get("tokens_input", 0),
                "tokens_output": job_metrics.get("tokens_output", 0),
                "estimated_cost_usd": job_metrics.get("estimated_cost_usd", 0),
            },
        )

        return {
            "success": True,
            "report_id": report_id,
            "uploaded_files": uploaded,
        }
    except Exception as exc:
        stage_timings[current_stage] = round(time.perf_counter() - started_at, 3)
        failure_stage = current_stage
        failure_message = f"[{failure_stage}] {str(exc)}"
        category, severity = classify_worker_failure(failure_stage, str(exc))

        fail_report(supabase, report_id, failure_message)
        log_worker_event(
            supabase,
            "worker_job_failed",
            {
                "client_id": client_id,
                "report_id": report_id,
                "client_name": (client or {}).get("nome_empresa"),
                "stage": failure_stage,
                "category": category,
                "severity": severity,
                "error": str(exc),
                "stage_timings": stage_timings,
                "duration_seconds": round(sum(stage_timings.values()), 3),
            },
        )
        notify_report_failure(supabase, client, report_id, failure_message)
        raise
