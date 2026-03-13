"use client";

import { useState } from "react";
import {
  Linkedin,
  Twitter,
  Instagram,
  Mail,
  Sparkles,
  Copy,
  Check,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  PenTool,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Hypothesis {
  title?: string;
  prediction?: string;
  recommended_action?: string;
  confidence?: number;
}

interface ContentGeneratorProps {
  reportId: string;
  hypotheses: Hypothesis[];
  lang?: string;
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "bg-blue-600 hover:bg-blue-700" },
  { id: "twitter", label: "Twitter / X", icon: Twitter, color: "bg-zinc-800 hover:bg-zinc-900" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" },
  { id: "email", label: "E-mail", icon: Mail, color: "bg-emerald-600 hover:bg-emerald-700" },
];

export function ContentGenerator({ reportId, hypotheses, lang = "pt-BR" }: ContentGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<number | undefined>(undefined);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const isPt = !lang?.startsWith("en");

  const handleGenerate = async () => {
    if (!selectedPlatform) return;
    setIsGenerating(true);
    setError("");
    setGeneratedContent("");

    try {
      const resp = await fetch(`/api/reports/${reportId}/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          insightIndex: selectedInsight,
          customPrompt: customPrompt || undefined,
        }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setGeneratedContent(data.content || "");
    } catch {
      setError(
        isPt
          ? "Erro ao gerar conteúdo. Tente novamente."
          : "Error generating content. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!selectedPlatform || !generatedContent) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      await supabase.from("client_saved_posts").insert({
        report_id: reportId,
        user_id: user.id,
        platform: selectedPlatform,
        title: `${PLATFORMS.find((p) => p.id === selectedPlatform)?.label} — ${hypotheses[selectedInsight ?? 0]?.title?.slice(0, 50) || "Post"}`,
        content: generatedContent,
        insight_index: selectedInsight ?? null,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError(isPt ? "Erro ao salvar rascunho." : "Error saving draft.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-6 py-4 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
            <PenTool className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-foreground">
              {isPt ? "Gerar Conteúdo com IA" : "Generate Content with AI"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPt
                ? "Crie posts para LinkedIn, Twitter, Instagram ou E-mail a partir dos insights"
                : "Create posts for LinkedIn, Twitter, Instagram or Email from insights"}
            </p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-background overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(false)}
        className="w-full flex items-center justify-between px-6 py-4 bg-orange-50 border-b border-orange-200"
      >
        <div className="flex items-center gap-3">
          <PenTool className="h-5 w-5 text-orange-600" />
          <span className="font-semibold text-sm">
            {isPt ? "Gerar Conteúdo com IA" : "Generate Content with AI"}
          </span>
        </div>
        <ChevronUp className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="p-6 space-y-5">
        {/* Step 1: Platform */}
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {isPt ? "1. Escolha a plataforma" : "1. Choose platform"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPlatform === p.id
                    ? `${p.color} text-white shadow-md scale-[1.02]`
                    : "bg-muted/50 text-foreground hover:bg-muted border border-border"
                }`}
              >
                <p.icon className="h-4 w-4" />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select insight */}
        {selectedPlatform && hypotheses.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {isPt ? "2. Insight base (opcional)" : "2. Base insight (optional)"}
            </p>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              <button
                onClick={() => setSelectedInsight(undefined)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedInsight === undefined
                    ? "bg-orange-100 text-orange-800 font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                {isPt ? "📊 Todos os insights (geral)" : "📊 All insights (general)"}
              </button>
              {hypotheses.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedInsight(i)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedInsight === i
                      ? "bg-orange-100 text-orange-800 font-medium"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  #{i + 1} {h.title?.slice(0, 60) || "Insight"}
                  {h.title && h.title.length > 60 ? "…" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Custom instructions */}
        {selectedPlatform && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {isPt ? "3. Instrução extra (opcional)" : "3. Extra instruction (optional)"}
            </p>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={
                isPt
                  ? "Ex: 'Use tom mais informal' ou 'Foque em dados financeiros'"
                  : "Ex: 'Use a more casual tone' or 'Focus on financial data'"
              }
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
            />
          </div>
        )}

        {/* Generate button */}
        {selectedPlatform && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPt ? "Gerando conteúdo..." : "Generating content..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {isPt
                  ? `Gerar ${PLATFORMS.find((p) => p.id === selectedPlatform)?.label}`
                  : `Generate ${PLATFORMS.find((p) => p.id === selectedPlatform)?.label}`}
              </>
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Generated content */}
        {generatedContent && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {isPt ? "Resultado" : "Result"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      {isPt ? "Copiado!" : "Copied!"}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      {isPt ? "Copiar" : "Copy"}
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      {isPt ? "Salvo!" : "Saved!"}
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      {isPt ? "Salvar rascunho" : "Save draft"}
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-y leading-relaxed font-mono"
            />

            {/* Re-generate */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isPt ? "Regenerar conteúdo" : "Regenerate content"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
