"""One-shot script to analyze niches for the current client and save to Supabase."""
import json
import os
import re
import sys

from dotenv import load_dotenv
load_dotenv()

from anthropic import Anthropic
from supabase import create_client

# Client data
CLIENT_ID = "0271fd6a-3505-4ea6-8879-224ef829e93d"

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)

# Load client
client_res = supabase.table("clients").select("*").eq("id", CLIENT_ID).single().execute()
client = client_res.data
print(f"Client: {client['company_name']}")

# Build prompt
prompt = f"""You are a B2B market intelligence analyst. Given the following client profile, identify 6 strategic market niches that should be monitored to generate valuable intelligence reports for this client.

Client Profile:
- Company: {client['company_name']}
- Industry: {client['industry']}
- Products/Services: {client.get('products_services', '')}
- Target Audience: {client.get('target_audience', '')}
- Goals: {', '.join(client.get('goals_2026', []))}
- Pain Points: {', '.join(client.get('pain_points', []))}
- Additional Context: {(client.get('raw_onboarding_text') or '')[:2000]}

Rules:
1. Return exactly 6 niches
2. Each niche should be a short market segment name (2-4 words max)
3. Include both direct niches (their industry) and adjacent niches (related markets that affect them)
4. Always include at least one macro-trend niche (e.g., "IA", "Sustainability", "Digital Transformation")
5. Classify relevance as "primary" (core to their business) or "secondary" (adjacent/contextual)
6. Provide a brief reasoning (1 sentence) for each niche in Portuguese

Return ONLY a valid JSON array, no other text:
[{{"name": "Niche Name", "relevance": "primary|secondary", "reasoning": "Brief explanation"}}]"""

# Call Claude
anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
response = anthropic.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=600,
    temperature=0.3,
    messages=[{"role": "user", "content": prompt}],
)

raw_text = " ".join(
    block.text for block in response.content if block.type == "text"
).strip()

print(f"\nClaude response:\n{raw_text}\n")

# Parse JSON
json_match = re.search(r'\[.*\]', raw_text, re.DOTALL)
if not json_match:
    print("ERROR: Could not parse JSON from response")
    sys.exit(1)

niches = json.loads(json_match.group())
print(f"Extracted {len(niches)} niches:")
for n in niches:
    print(f"  - {n['name']} ({n['relevance']}): {n['reasoning']}")

# Delete existing niches
supabase.table("client_niches").delete().eq("client_id", CLIENT_ID).execute()
print("\nDeleted existing niches")

# Insert new niches
rows = [
    {
        "client_id": CLIENT_ID,
        "niche_name": n["name"],
        "relevance": n.get("relevance", "secondary"),
        "is_active": True,
    }
    for n in niches
]
result = supabase.table("client_niches").insert(rows).execute()
print(f"Inserted {len(result.data)} niches into client_niches")
print("\nDone! Client niches are now populated.")
