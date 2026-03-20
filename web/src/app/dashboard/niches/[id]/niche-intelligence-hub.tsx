"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Globe,
    TrendingUp,
    ExternalLink,
    Calendar,
    Zap,
    Filter,
    ChevronDown,
    ChevronUp,
    Sparkles,
    BarChart3,
    MapPin,
} from "lucide-react";

type IntelligenceNode = {
    id: string;
    title: string;
    url: string | null;
    summary: string;
    source_name: string | null;
    region: string;
    language: string;
    predictive_score: number;
    is_trend: boolean;
    theme: string | null;
    matched_keywords: string[] | null;
    published_at: string | null;
    created_at: string;
};

type Signal = {
    id: string;
    delivered_at: string;
    report_id: string | null;
    node_id: string;
    niche_intelligence_nodes: IntelligenceNode | null;
};

type Niche = {
    id: string;
    niche_name: string;
    relevance: string;
    is_active: boolean;
    created_at: string;
};

type Topic = {
    id: string;
    name: string;
    normalized_key: string;
};

import { NicheTrendAnalytics, RadarData, LineData } from "./niche-trend-analytics";

type HubTranslations = {
    nichesTitle: string;
    nichePrimary: string;
    nicheSecondary: string;
    nicheActive: string;
    nicheInactive: string;
};

const REGION_LABELS: Record<string, { label: string; flag: string; color: string }> = {
    BR: { label: "Brasil", flag: "🇧🇷", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
    US: { label: "EUA", flag: "🇺🇸", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
    EU: { label: "Europa", flag: "🇪🇺", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
    CN: { label: "China", flag: "🇨🇳", color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" },
    LATAM: { label: "LATAM", flag: "🌎", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
    ASIA: { label: "Ásia", flag: "🌏", color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
    GLOBAL: { label: "Global", flag: "🌐", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" },
};

const THEME_LABELS: Record<string, { label: string; emoji: string }> = {
    tecnologia: { label: "Tecnologia", emoji: "💻" },
    regulacao: { label: "Regulação", emoji: "⚖️" },
    concorrencia: { label: "Concorrência", emoji: "⚔️" },
    demanda: { label: "Demanda", emoji: "📈" },
    marca: { label: "Marca", emoji: "🏷️" },
    operacao: { label: "Operação", emoji: "⚙️" },
    mercado: { label: "Mercado", emoji: "🏪" },
    inovacao: { label: "Inovação", emoji: "🚀" },
};

function ScoreBadge({ score }: { score: number }) {
    let color = "bg-gray-500/10 text-gray-600";
    let label = "Contextual";
    if (score >= 80) {
        color = "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30";
        label = "Disruptivo";
    } else if (score >= 60) {
        color = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
        label = "Tendência";
    } else if (score >= 40) {
        color = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
        label = "Relevante";
    }
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${color}`}>
            <BarChart3 className="h-3 w-3" />
            {score} — {label}
        </span>
    );
}

export default function NicheIntelligenceHub({
    niche,
    signals,
    topics,
    radarData,
    lineData,
    lang,
    t,
}: {
    niche: Niche;
    signals: any[]; // using any to avoid strict supabase type mismatch on nested objects
    topics: Topic[];
    radarData: RadarData[];
    lineData: LineData[];
    lang: string;
    t: HubTranslations;
}) {
    const isPt = lang.startsWith("pt");
    const [regionFilter, setRegionFilter] = useState<string | null>(null);
    const [showTrendsOnly, setShowTrendsOnly] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Extract nodes from signals
    const allNodes = useMemo(() => {
        const nodes: (IntelligenceNode & { delivered_at: string; report_id: string | null })[] = [];
        for (const signal of signals) {
            if (signal.niche_intelligence_nodes) {
                nodes.push({
                    ...signal.niche_intelligence_nodes,
                    delivered_at: signal.delivered_at,
                    report_id: signal.report_id,
                });
            }
        }
        return nodes.sort((a, b) => b.predictive_score - a.predictive_score);
    }, [signals]);

    // Filtered nodes
    const filteredNodes = useMemo(() => {
        let result = allNodes;
        if (regionFilter) {
            result = result.filter((n) => n.region === regionFilter);
        }
        if (showTrendsOnly) {
            result = result.filter((n) => n.is_trend);
        }
        return result;
    }, [allNodes, regionFilter, showTrendsOnly]);

    // Stats
    const trendCount = allNodes.filter((n) => n.is_trend).length;
    const avgScore = allNodes.length > 0
        ? Math.round(allNodes.reduce((sum, n) => sum + n.predictive_score, 0) / allNodes.length)
        : 0;
    const regionBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        for (const n of allNodes) {
            map[n.region] = (map[n.region] || 0) + 1;
        }
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [allNodes]);

    function toggleExpanded(nodeId: string) {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    }

    return (
        <div>
            {/* Back + Header */}
            <div className="mb-6">
                <Link
                    href="/dashboard/niches"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {isPt ? "Voltar para Meus Nichos" : "Back to My Niches"}
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold">{niche.niche_name}</h1>
                            <Badge variant={niche.relevance === "primary" ? "default" : "secondary"}>
                                {niche.relevance === "primary" ? t.nichePrimary : t.nicheSecondary}
                            </Badge>
                            <Badge variant={niche.is_active ? "default" : "outline"} className={niche.is_active ? "bg-green-600" : ""}>
                                {niche.is_active ? t.nicheActive : t.nicheInactive}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {isPt
                                ? "Hub de inteligência global — notícias, tendências e sinais preditivos"
                                : "Global intelligence hub — news, trends and predictive signals"}
                        </p>
                        {topics.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">{isPt ? "Tópicos globais:" : "Global topics:"}</span>
                                {topics.map((topic) => (
                                    <Badge key={topic.id} variant="outline" className="text-[10px]">
                                        {topic.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">{isPt ? "Total de Sinais" : "Total Signals"}</span>
                    </div>
                    <p className="text-2xl font-bold">{allNodes.length}</p>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-violet-500" />
                        <span className="text-xs text-muted-foreground">{isPt ? "Tendências" : "Trends"}</span>
                    </div>
                    <p className="text-2xl font-bold text-violet-600">{trendCount}</p>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">{isPt ? "Score Médio" : "Avg Score"}</span>
                    </div>
                    <p className="text-2xl font-bold">{avgScore}<span className="text-sm text-muted-foreground">/100</span></p>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">{isPt ? "Regiões" : "Regions"}</span>
                    </div>
                    <p className="text-2xl font-bold">{regionBreakdown.length}</p>
                </Card>
            </div>

            {/* Visual Analytics */}
            <NicheTrendAnalytics radarData={radarData} lineData={lineData} isPt={isPt} />

            {/* Region Breakdown + Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 mr-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{isPt ? "Filtrar:" : "Filter:"}</span>
                </div>

                <Button
                    variant={regionFilter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRegionFilter(null)}
                    className="text-xs h-7"
                >
                    {isPt ? "Todos" : "All"} ({allNodes.length})
                </Button>

                {regionBreakdown.map(([region, count]) => {
                    const info = REGION_LABELS[region] || REGION_LABELS.GLOBAL;
                    return (
                        <Button
                            key={region}
                            variant={regionFilter === region ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRegionFilter(regionFilter === region ? null : region)}
                            className="text-xs h-7 gap-1"
                        >
                            {info.flag} {info.label} ({count})
                        </Button>
                    );
                })}

                <div className="ml-auto">
                    <Button
                        variant={showTrendsOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowTrendsOnly(!showTrendsOnly)}
                        className="text-xs h-7 gap-1"
                    >
                        <Sparkles className="h-3 w-3" />
                        {isPt ? "Só tendências" : "Trends only"}
                    </Button>
                </div>
            </div>

            {/* Intelligence Timeline */}
            {filteredNodes.length === 0 ? (
                <Card className="p-12 text-center">
                    <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-2">
                        {allNodes.length === 0
                            ? (isPt
                                ? "Nenhuma inteligência coletada ainda para este nicho. Ela será gerada no próximo relatório."
                                : "No intelligence gathered for this niche yet. It will be generated with the next report.")
                            : (isPt
                                ? "Nenhum resultado para os filtros selecionados."
                                : "No results for the selected filters.")}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredNodes.map((node) => {
                        const regionInfo = REGION_LABELS[node.region] || REGION_LABELS.GLOBAL;
                        const themeInfo = THEME_LABELS[node.theme || "mercado"] || THEME_LABELS.mercado;
                        const isExpanded = expandedNodes.has(node.id);

                        return (
                            <Card
                                key={node.id}
                                className={`p-4 transition-all hover:shadow-md cursor-pointer ${
                                    node.is_trend ? "border-l-4 border-l-violet-500" : ""
                                } ${node.predictive_score >= 80 ? "bg-violet-500/[0.03]" : ""}`}
                                onClick={() => toggleExpanded(node.id)}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Score indicator */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                                        node.predictive_score >= 80
                                            ? "bg-violet-500/15 text-violet-700 dark:text-violet-400"
                                            : node.predictive_score >= 60
                                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                            : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                                    }`}>
                                        {node.predictive_score}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Title + badges */}
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-sm leading-tight">
                                                {node.is_trend && <Sparkles className="h-3.5 w-3.5 inline mr-1 text-violet-500" />}
                                                {node.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${regionInfo.color}`}>
                                                    {regionInfo.flag} {regionInfo.label}
                                                </span>
                                                {node.url && (
                                                    <a
                                                        href={node.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Meta line */}
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                            {node.source_name && (
                                                <span className="font-medium">{node.source_name}</span>
                                            )}
                                            {node.source_name && "·"}
                                            <span>{themeInfo.emoji} {themeInfo.label}</span>
                                            {"·"}
                                            <span className="flex items-center gap-0.5">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(node.created_at).toLocaleDateString(
                                                    isPt ? "pt-BR" : "en-US",
                                                    { day: "2-digit", month: "short", year: "numeric" }
                                                )}
                                            </span>
                                        </div>

                                        {/* Summary (expandable) */}
                                        <p className={`text-sm text-muted-foreground mt-2 ${isExpanded ? "" : "line-clamp-2"}`}>
                                            {node.summary}
                                        </p>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-border/50">
                                                <div className="flex flex-wrap gap-2">
                                                    <ScoreBadge score={node.predictive_score} />
                                                    {node.matched_keywords && node.matched_keywords.length > 0 && (
                                                        <>
                                                            {node.matched_keywords.slice(0, 5).map((kw, i) => (
                                                                <Badge key={i} variant="outline" className="text-[10px]">
                                                                    {kw}
                                                                </Badge>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expand/collapse indicator */}
                                    <div className="flex-shrink-0 mt-1">
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
