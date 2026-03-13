"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  X,
  Loader2,
  Bot,
  User,
  Sparkles,
  ChevronDown,
} from "lucide-react";

interface DeepDiveChatProps {
  reportId: string;
  reportTitle: string;
  lang?: string;
}

export function DeepDiveChat({
  reportId,
  reportTitle,
  lang = "pt-BR",
}: DeepDiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isPt = !lang?.startsWith("en");

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: `/api/reports/${reportId}/chat`,
      initialMessages: [],
    });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const suggestions = isPt
    ? [
        "Qual insight tem maior impacto estratégico?",
        "Resuma as principais ameaças identificadas",
        "Gere um post LinkedIn sobre o insight #1",
        "Quais ações devo priorizar?",
      ]
    : [
        "Which insight has the highest strategic impact?",
        "Summarize the main threats identified",
        "Generate a LinkedIn post about insight #1",
        "Which actions should I prioritize?",
      ];

  const handleSuggestionClick = (text: string) => {
    const fakeEvent = {
      target: { value: text },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    handleInputChange(fakeEvent);
    setTimeout(() => {
      const form = document.getElementById("deep-dive-form") as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = document.getElementById("deep-dive-form") as HTMLFormElement;
      if (form && input.trim()) {
        form.requestSubmit();
      }
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        title={isPt ? "Deep Dive no Relatório" : "Deep Dive into Report"}
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden sm:inline">Deep Dive</span>
        <MessageSquare className="h-5 w-5 sm:hidden" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[440px] h-[600px] sm:h-[640px] flex flex-col bg-background border border-border rounded-none sm:rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <div>
            <p className="text-sm font-bold leading-tight">Deep Dive</p>
            <p className="text-xs opacity-80 truncate max-w-[260px]">
              {reportTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            {/* Welcome */}
            <div className="flex gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-orange-600" />
              </div>
              <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-sm text-foreground">
                  {isPt
                    ? "Olá! Sou o assistente de inteligência da Guilds. Posso te ajudar a explorar este relatório em profundidade — tire dúvidas, peça ações táticas ou gere conteúdo."
                    : "Hi! I'm Guilds Intelligence Assistant. I can help you explore this report in depth — ask questions, request tactical actions or generate content."}
                </p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="pl-11 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {isPt ? "Sugestões rápidas:" : "Quick suggestions:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted hover:border-orange-300 text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                msg.role === "user"
                  ? "bg-primary/10"
                  : "bg-orange-100"
              }`}
            >
              {msg.role === "user" ? (
                <User className="h-4 w-4 text-primary" />
              ) : (
                <Bot className="h-4 w-4 text-orange-600" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted/50 text-foreground rounded-tl-sm"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-orange-600" />
            </div>
            <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {isPt ? "Analisando..." : "Analyzing..."}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-xs rounded-lg px-3 py-2 mx-11">
            {isPt
              ? "Erro ao processar. Tente novamente."
              : "Error processing. Please try again."}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        id="deep-dive-form"
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border px-3 py-3 bg-background"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isPt
                ? "Pergunte algo sobre o relatório..."
                : "Ask something about the report..."
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 placeholder:text-muted-foreground max-h-[120px]"
            style={{ minHeight: "42px" }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 h-[42px] w-[42px] rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          {isPt
            ? "Guilds IA • Respostas baseadas exclusivamente neste relatório"
            : "Guilds AI • Answers based exclusively on this report"}
        </p>
      </form>
    </div>
  );
}
