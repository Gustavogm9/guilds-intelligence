import { readFile } from "node:fs/promises";
import path from "node:path";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

type PortfolioDbRow = {
    id: string;
    product_key: string;
    name: string;
    category: string | null;
    description: string | null;
    target_audience: string | null;
    use_cases: string[] | null;
    format: string | null;
    avg_ticket: string | null;
    is_active: boolean;
};

type PortfolioJsonProduct = {
    id?: string;
    nome: string;
    categoria?: string;
    descricao?: string;
    publico_alvo?: string[];
    casos_de_uso?: string[];
    formato?: string[];
    ticket_medio?: string;
    ativo?: boolean;
};

async function loadPortfolioFallback() {
    const filePath = path.join(process.cwd(), "..", "guilds_portfolio.json");
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as {
        empresa?: { nome?: string; descricao?: string };
        produtos_e_servicos?: PortfolioJsonProduct[];
    };

    return {
        companyName: parsed.empresa?.nome || "Guilds",
        companyDescription: parsed.empresa?.descricao || "",
        products:
            parsed.produtos_e_servicos?.map((product) => ({
                id: product.id || product.nome,
                name: product.nome,
                category: product.categoria || null,
                description: product.descricao || null,
                targetAudience: product.publico_alvo?.join(", ") || null,
                useCases: product.casos_de_uso || [],
                format: product.formato?.join(", ") || null,
                avgTicket: product.ticket_medio || null,
                isActive: product.ativo ?? true,
            })) || [],
    };
}

export default async function AdminPortfolioPage() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("portfolio_products")
        .select("id, product_key, name, category, description, target_audience, use_cases, format, avg_ticket, is_active")
        .order("name");

    const dbProducts = (data as PortfolioDbRow[] | null) || [];
    const hasDbSource = !error && dbProducts.length > 0;
    const fallback = hasDbSource ? null : await loadPortfolioFallback();

    const products = hasDbSource
        ? dbProducts.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            description: product.description,
            targetAudience: product.target_audience,
            useCases: product.use_cases || [],
            format: product.format,
            avgTicket: product.avg_ticket,
            isActive: product.is_active,
        }))
        : fallback?.products || [];

    const activeCount = products.filter((product) => product.isActive).length;

    return (
        <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Portfolio</h1>
                    <p className="text-muted-foreground mt-1">
                        Base operacional dos produtos e serviços recomendados pelo motor Guilds.
                    </p>
                </div>
                <Badge variant={hasDbSource ? "default" : "secondary"}>
                    Fonte: {hasDbSource ? "Supabase" : "guilds_portfolio.json"}
                </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Produtos catalogados</p>
                    <p className="text-3xl font-bold mt-2">{products.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Ativos para recomendacao</p>
                    <p className="text-3xl font-bold mt-2">{activeCount}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Estado operacional</p>
                    <p className="text-base font-medium mt-2">
                        {hasDbSource
                            ? "Painel conectado ao banco e pronto para governanca"
                            : "Fallback ativo via arquivo fonte do portfolio"}
                    </p>
                </Card>
            </div>

            {!hasDbSource && fallback?.companyDescription ? (
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Descrição institucional</p>
                    <p className="mt-2 text-sm leading-6">{fallback.companyDescription}</p>
                </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                {products.map((product) => (
                    <Card key={product.id} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-bold">{product.name}</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {product.category || "Categoria não definida"}
                                </p>
                            </div>
                            <Badge variant={product.isActive ? "default" : "secondary"}>
                                {product.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                        </div>

                        <p className="text-sm leading-6 mt-4">
                            {product.description || "Descrição ainda não cadastrada."}
                        </p>

                        <div className="grid gap-4 sm:grid-cols-2 mt-5 text-sm">
                            <div>
                                <p className="text-muted-foreground">Público-alvo</p>
                                <p className="mt-1">{product.targetAudience || "Não informado"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Formato</p>
                                <p className="mt-1">{product.format || "Não informado"}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-muted-foreground">Ticket médio</p>
                                <p className="mt-1">{product.avgTicket || "Não informado"}</p>
                            </div>
                        </div>

                        <div className="mt-5">
                            <p className="text-sm text-muted-foreground mb-2">Casos de uso</p>
                            {product.useCases.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {product.useCases.map((useCase) => (
                                        <Badge key={useCase} variant="outline">
                                            {useCase}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum caso de uso catalogado.</p>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
