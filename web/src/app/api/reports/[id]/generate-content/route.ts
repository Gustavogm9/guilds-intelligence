import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const PLATFORM_PROMPTS: Record<string, string> = {
  linkedin: `Generate a professional LinkedIn post. Use a hook opening, structured paragraphs, occasional emoji (not excessive), and end with a call-to-action or thought-provoking question. Include 3-5 relevant hashtags at the end. Tone: authoritative yet approachable, thought-leadership style. Length: 800-1500 characters.`,
  twitter: `Generate a Twitter/X thread (3-5 tweets). Each tweet must be under 280 characters. Start with a hook tweet. Number each tweet (1/, 2/, etc). End with a CTA. Tone: concise, punchy, insightful. Use occasional emoji to add visual breaks.`,
  instagram: `Generate an Instagram caption. Start with a powerful hook line, use short paragraphs with line breaks, include relevant emoji, and end with a question or CTA to drive comments. Include 10-15 hashtags in a separate block at the end. Length: 500-1000 characters.`,
  email: `Generate a professional email newsletter excerpt. Start with a compelling subject line (marked as "Subject:"), then write the body with a brief intro, key insight breakdown, and actionable takeaway. Tone: polished, informative, direct. Length: 300-600 words.`,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("*, clients(company_name, user_id, preferred_language)")
    .eq("id", reportId)
    .single();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const client = Array.isArray(report.clients)
    ? report.clients[0]
    : report.clients;
  if (profile?.role !== "admin" && client?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { platform, insightIndex, customPrompt } = body as {
    platform: string;
    insightIndex?: number;
    customPrompt?: string;
  };

  if (!platform || !PLATFORM_PROMPTS[platform]) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  // Build insight context
  const hypotheses = Array.isArray(report.hypotheses) ? report.hypotheses : [];
  let insightContext = "";

  if (insightIndex !== undefined && insightIndex < hypotheses.length) {
    const h = hypotheses[insightIndex] as Record<string, unknown>;
    insightContext = `
## Specific Insight to Focus On (#${insightIndex + 1})
Title: ${h.title || "N/A"}
Prediction: ${h.prediction || "N/A"}
Recommended Action: ${h.recommended_action || "N/A"}
Confidence: ${h.confidence || "N/A"}%
Theme: ${h.source_theme || "N/A"}`;
  } else {
    insightContext = hypotheses
      .slice(0, 5)
      .map(
        (h: Record<string, unknown>, i: number) =>
          `${i + 1}. ${h.title || "Insight"}: ${h.prediction || ""} (Action: ${h.recommended_action || "N/A"})`
      )
      .join("\n");
  }

  const lang = client?.preferred_language?.startsWith("en")
    ? "English"
    : "Portuguese (Brazil)";

  const prompt = `You are a professional content creator for B2B companies.

## Task
${PLATFORM_PROMPTS[platform]}

## Company
${client?.company_name || "the client company"}

## Report Summary
${report.summary || "No summary available."}

## Key Insights
${insightContext}

${customPrompt ? `## Additional Instructions\n${customPrompt}` : ""}

IMPORTANT:
- Write ENTIRELY in ${lang}.
- Do NOT include any preamble or explanation. Output ONLY the final post content ready to copy-paste.
- Make the content feel organic and insightful, not like AI-generated marketing copy.
- Reference specific data points and predictions from the insights above.`;

  try {
    const result = await generateText({
      model: anthropic("claude-3-5-haiku-20241022"),
      prompt,
      maxOutputTokens: 2000,
    });

    return NextResponse.json({
      content: result.text,
      platform,
      insightIndex: insightIndex ?? null,
    });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
