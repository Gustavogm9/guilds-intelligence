import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  // ── Auth ─────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Load report with context ────────────────────────────────────
  const { data: report } = await supabase
    .from("reports")
    .select("*, clients(company_name, user_id, preferred_language)")
    .eq("id", reportId)
    .single();

  if (!report) {
    return new Response("Report not found", { status: 404 });
  }

  // Permission check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const client = Array.isArray(report.clients)
    ? report.clients[0]
    : report.clients;
  if (profile?.role !== "admin" && client?.user_id !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Parse request ───────────────────────────────────────────────
  const { messages } = await req.json();

  // ── Build context from report data ──────────────────────────────
  const hypotheses = Array.isArray(report.hypotheses)
    ? report.hypotheses
        .map(
          (h: Record<string, unknown>, i: number) =>
            `${i + 1}. ${h.title || "Sem título"}\n   Predição: ${h.prediction || "N/A"}\n   Ação: ${h.recommended_action || "N/A"}\n   Confiança: ${h.confidence || "N/A"}%`
        )
        .join("\n")
    : "Nenhuma hipótese disponível.";

  const sources = Array.isArray(report.external_sources)
    ? report.external_sources
        .slice(0, 10)
        .map(
          (s: Record<string, unknown>) =>
            `- ${s.title || "Sem título"} (${s.source_name || "fonte desconhecida"})${s.theme ? ` [${s.theme}]` : ""}\n  ${s.summary || ""}`
        )
        .join("\n")
    : "Nenhuma fonte externa disponível.";

  const retrospective = Array.isArray(report.retrospective_items)
    ? report.retrospective_items
        .map(
          (r: Record<string, unknown>) =>
            `- ${r.title}: ${r.status} — ${r.assessment || ""}`
        )
        .join("\n")
    : "";

  const lang = client?.preferred_language?.startsWith("en")
    ? "English"
    : "Portuguese (Brazil)";

  const systemPrompt = `You are Guilds Intelligence Assistant, a strategic market intelligence analyst.
You are having a conversation about a specific intelligence report for the company "${client?.company_name || "the client"}".

ALWAYS respond in ${lang}.

## Report Context

### Executive Summary
${report.summary || "No summary available."}

### Predictive Hypotheses
${hypotheses}

### External Intelligence Sources
${sources}

${retrospective ? `### Retrospective Analysis\n${retrospective}` : ""}

${report.external_signal_summary ? `### External Signal Summary\n${report.external_signal_summary}` : ""}

## Your Role
- Answer questions about this report with precision and strategic depth.
- When the user asks about a specific insight or hypothesis, reference the data above.
- Suggest actionable next steps when relevant.
- If asked to generate content (posts, emails), use the report data as source material.
- Be concise but thorough. Use bullet points and structure for complex answers.
- Never invent data not present in the report context above.
- If you don't have enough information, say so clearly.`;

  // ── Save user message to history ────────────────────────────────
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role === "user") {
    await supabase.from("report_chat_history").insert({
      report_id: reportId,
      user_id: user.id,
      role: "user",
      content: lastUserMessage.content,
    });
  }

  // ── Stream response ─────────────────────────────────────────────
  const result = streamText({
    model: anthropic("claude-3-5-haiku-20241022"),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      // Save assistant response to history
      await supabase.from("report_chat_history").insert({
        report_id: reportId,
        user_id: user.id,
        role: "assistant",
        content: text,
      });
    },
  });

  return result.toDataStreamResponse();
}
