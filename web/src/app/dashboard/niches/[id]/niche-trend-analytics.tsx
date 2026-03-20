"use client";

import { Card } from "@/components/ui/card";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

export type RadarData = { theme: string; avg_score: number };
export type LineData = { period: string; avg_score: number };

export function NicheTrendAnalytics({
    radarData,
    lineData,
    isPt
}: {
    radarData: RadarData[];
    lineData: LineData[];
    isPt: boolean;
}) {
    if (!radarData.length && !lineData.length) return null;

    // Traduzindo os themes para a UI caso 'isPt' (Baseados nas the_labels do Hub)
    const translateTheme = (theme: string) => {
        if (!isPt) return theme;
        const dict: Record<string, string> = {
            tecnologia: "Tecnologia",
            regulacao: "Regulação",
            concorrencia: "Concorrência",
            demanda: "Demanda",
            marca: "Marca",
            operacao: "Operação",
            mercado: "Mercado",
            inovacao: "Inovação",
            Geral: "Geral"
        };
        return dict[theme.toLowerCase()] || theme;
    };

    const formattedRadar = radarData.map(d => ({
        ...d,
        theme: translateTheme(d.theme)
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-2">
            <Card className="p-6">
                <h3 className="text-lg font-bold mb-1">
                    {isPt ? "Dimensões de Mercado" : "Market Dimensions"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                    {isPt 
                        ? "Score preditivo distribuído por área de impacto" 
                        : "Predictive score distributed by impact area"}
                </p>
                <div className="h-[300px] w-full">
                    {formattedRadar.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={formattedRadar}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="theme" tick={{ fill: "currentColor", fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                                <Radar
                                    name="Score"
                                    dataKey="avg_score"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.4}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            {isPt ? "Dados insuficientes." : "Not enough data."}
                        </div>
                    )}
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="text-lg font-bold mb-1">
                    {isPt ? "Evolução do Score Global" : "Global Score Evolution"}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                    {isPt 
                        ? "Média do nível preditivo global nas últimas semanas" 
                        : "Average predictive level over the last weeks"}
                </p>
                <div className="h-[300px] w-full">
                    {lineData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData} margin={{ top: 5, right: 30, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis 
                                    dataKey="period" 
                                    stroke="currentColor"
                                    fontSize={12}
                                    tickFormatter={(val) => {
                                        // "YYYY-MM-DD"
                                        const [y, m, d] = val.split('-');
                                        const date = new Date(Number(y), Number(m)-1, Number(d));
                                        return date.toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: '2-digit', month: 'short' });
                                    }}
                                />
                                <YAxis domain={[0, 100]} stroke="currentColor" fontSize={12} />
                                <Tooltip 
                                    labelFormatter={(val) => {
                                        const [y, m, d] = val.split('-');
                                        const date = new Date(Number(y), Number(m)-1, Number(d));
                                        return date.toLocaleDateString(isPt ? "pt-BR" : "en-US", { day: '2-digit', month: 'short', year: 'numeric' });
                                    }}
                                    contentStyle={{ backgroundColor: "hsl(var(--background))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avg_score"
                                    name="Score"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            {isPt ? "Dados insuficientes." : "Not enough data."}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
