from __future__ import annotations

import json
import os
import re
import traceback
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel

import requests as http_requests

from engine.supabase_worker import generate_and_upload_report

try:
    from anthropic import Anthropic
except Exception:
    Anthropic = None

app = FastAPI(title="Guilds Intelligence Worker")


class GenerateRequest(BaseModel):
    client_id: str
    report_id: str


class AnalyzeNichesRequest(BaseModel):
    client_id: str
    company_name: str = ""
    industry: str = ""
    products_services: str = ""
    target_audience: str = ""
    goals: list[str] = []
    pain_points: list[str] = []
    raw_text: str = ""
    preferred_language: str = "pt-BR"
    website_url: str = ""
    social_media_urls: list[str] = []


def _fetch_url_content(url: str, max_chars: int = 3000) -> str:
    """Use Jina Reader API to extract clean text from a URL (no cache)."""
    if not url or not url.startswith("http"):
        return ""
    try:
        jina_url = f"https://r.jina.ai/{url}"
        resp = http_requests.get(
            jina_url,
            headers={"Accept": "text/plain"},
            timeout=12,
        )
        if resp.ok and len(resp.text) > 50:
            return resp.text[:max_chars]
    except Exception:
        traceback.print_exc()
    return ""


WEBSITE_CACHE_TTL_DAYS = 7


def _fetch_website_with_cache(client_id: str, website_url: str, max_chars: int = 4000) -> str:
    """Fetch website content, using Supabase cache with 7-day TTL."""
    if not website_url or not website_url.startswith("http"):
        return ""

    try:
        from supabase import create_client as sb_create
        sb_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        sb_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not sb_url or not sb_key:
            return _fetch_url_content(website_url, max_chars)

        sb = sb_create(sb_url, sb_key)
        row = sb.table("clients").select("website_content_cache, website_content_cached_at").eq("id", client_id).single().execute()
        data = row.data or {}

        cached_at = data.get("website_content_cached_at")
        cached_text = data.get("website_content_cache")

        if cached_at and cached_text:
            from datetime import datetime, timezone, timedelta
            try:
                ts = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) - ts < timedelta(days=WEBSITE_CACHE_TTL_DAYS):
                    return cached_text[:max_chars]
            except Exception:
                pass

        # Cache miss or expired — fetch fresh content
        fresh = _fetch_url_content(website_url, max_chars)
        if fresh:
            from datetime import datetime, timezone
            sb.table("clients").update({
                "website_content_cache": fresh,
                "website_content_cached_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", client_id).execute()
        return fresh
    except Exception:
        traceback.print_exc()
        return _fetch_url_content(website_url, max_chars)


def verify_secret(secret: str | None) -> None:
    expected = os.getenv("PYTHON_WORKER_SECRET")
    if not expected:
        raise HTTPException(status_code=500, detail="Worker secret not configured")
    if secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _extract_niches_heuristic(payload: AnalyzeNichesRequest) -> list[dict]:
    """Fallback: extract niches from industry and products using simple heuristics."""
    niches: list[str] = []

    # Split industry by common separators
    if payload.industry:
        for part in re.split(r"[,;/|]+", payload.industry):
            cleaned = part.strip()
            if cleaned and len(cleaned) >= 2:
                niches.append(cleaned)

    # Extract from target_audience
    if payload.target_audience:
        for part in re.split(r"[,;/|]+", payload.target_audience):
            cleaned = part.strip()
            if cleaned and len(cleaned) >= 3 and cleaned not in niches:
                niches.append(cleaned)
                if len(niches) >= 5:
                    break

    # Always include macro context
    always_include = ["Brasil", "Startups", "IA", "Tendências Mundo"]
    for n in always_include:
        if n not in niches:
            niches.append(n)

    return [
        {"name": n, "relevance": "primary" if i < 3 else "secondary", "reasoning": "Extraído automaticamente do perfil"}
        for i, n in enumerate(niches[:7])
    ]


def _extract_niches_claude(payload: AnalyzeNichesRequest) -> list[dict] | None:
    """Use Claude to intelligently extract strategic niches from client profile."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not Anthropic:
        return None

    is_en = payload.preferred_language.startswith("en")

    prompt = f"""You are a B2B market intelligence analyst. Given the following client profile, identify 5-7 strategic market niches that should be monitored to generate valuable intelligence reports for this client.

Client Profile:
- Company: {payload.company_name}
- Industry: {payload.industry}
- Products/Services: {payload.products_services}
- Target Audience: {payload.target_audience}
- Goals: {', '.join(payload.goals) if payload.goals else 'Not specified'}
- Pain Points: {', '.join(payload.pain_points) if payload.pain_points else 'Not specified'}
- Additional Context: {payload.raw_text[:2000] if payload.raw_text else 'None'}
"""

    # Enrich with website content (cached, TTL 7 days)
    website_text = ""
    if payload.website_url:
        website_text = _fetch_website_with_cache(payload.client_id, payload.website_url)
    social_texts: list[str] = []
    for surl in (payload.social_media_urls or [])[:3]:
        txt = _fetch_url_content(surl, max_chars=1500)
        if txt:
            social_texts.append(f"[{surl}]\n{txt}")

    if website_text:
        prompt += f"\n--- CLIENT WEBSITE CONTENT ---\n{website_text}\n"
    if social_texts:
        prompt += f"\n--- CLIENT SOCIAL MEDIA ---\n" + "\n\n".join(social_texts) + "\n"

    prompt += f"""
Rules:
1. Return exactly 5-7 niches
2. Each niche should be a short market segment name (2-4 words max)
3. Include both direct niches (their industry) and adjacent niches (related markets that affect them)
4. Always include at least one macro-trend niche (e.g., "IA", "Sustainability", "Digital Transformation")
5. Classify relevance as "primary" (core to their business) or "secondary" (adjacent/contextual)
6. Provide a brief reasoning (1 sentence) for each niche in {"English" if is_en else "Portuguese"}

Return ONLY a valid JSON array, no other text:
[{{"name": "Niche Name", "relevance": "primary|secondary", "reasoning": "Brief explanation"}}]"""

    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=os.getenv("GUILDS_NICHE_MODEL", "claude-sonnet-4-20250514"),
            max_tokens=600,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )

        blocks = getattr(response, "content", []) or []
        text_parts = [getattr(block, "text", "") for block in blocks if getattr(block, "type", "") == "text"]
        raw_text = " ".join(part.strip() for part in text_parts if part.strip()).strip()

        # Extract JSON from response
        json_match = re.search(r'\[.*\]', raw_text, re.DOTALL)
        if json_match:
            niches = json.loads(json_match.group())
            # Validate structure
            validated = []
            for n in niches:
                if isinstance(n, dict) and n.get("name"):
                    validated.append({
                        "name": str(n["name"])[:50],
                        "relevance": n.get("relevance", "secondary") if n.get("relevance") in ("primary", "secondary") else "secondary",
                        "reasoning": str(n.get("reasoning", ""))[:200],
                    })
            if validated:
                return validated[:7]

        return None
    except Exception:
        return None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze-niches")
async def analyze_niches(
    payload: AnalyzeNichesRequest,
    x_worker_secret: str | None = Header(default=None),
) -> dict:
    verify_secret(x_worker_secret)

    # Try Claude first, fallback to heuristic
    niches = _extract_niches_claude(payload)
    source = "ai"

    if not niches:
        niches = _extract_niches_heuristic(payload)
        source = "heuristic"

    return {
        "niches": niches,
        "source": source,
        "count": len(niches),
    }


@app.post("/generate")
async def generate(
    payload: GenerateRequest,
    background_tasks: BackgroundTasks,
    x_worker_secret: str | None = Header(default=None),
) -> dict[str, str]:
    verify_secret(x_worker_secret)
    background_tasks.add_task(generate_and_upload_report, payload.client_id, payload.report_id)
    return {"status": "queued", "report_id": payload.report_id}
