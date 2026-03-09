import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { User, Building2, Globe, Palette } from "lucide-react";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: client } = await supabase
        .from("clients")
        .select("*, plans(name, report_frequency)")
        .eq("user_id", user!.id)
        .single();

    const plan = client?.plans as Record<string, unknown> | null;

    const frequencyLabels: Record<string, string> = {
        daily: "Diário",
        weekly: "Semanal",
        biweekly: "Quinzenal",
        monthly: "Mensal",
        business_days: "Dias úteis",
    };

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Meu Perfil</h1>
                <p className="text-muted-foreground mt-1">
                    Seus dados e configurações da empresa
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Conta */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="font-bold">Conta</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span className="font-medium">{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Contato</span>
                            <span className="font-medium">{client?.contact_name || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">WhatsApp</span>
                            <span className="font-medium">{client?.contact_phone || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Plano</span>
                            <span className="font-medium text-primary">{String(plan?.name) || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Frequência</span>
                            <span className="font-medium">
                                {frequencyLabels[String(plan?.report_frequency)] || "—"}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Empresa */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-violet-600" />
                        </div>
                        <h2 className="font-bold">Empresa</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Empresa</span>
                            <span className="font-medium">{client?.company_name || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Setor</span>
                            <span className="font-medium">{client?.industry || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tamanho</span>
                            <span className="font-medium">{client?.company_size || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Localização</span>
                            <span className="font-medium">{client?.location || "—"}</span>
                        </div>
                    </div>
                </Card>

                {/* Preferências */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Palette className="h-5 w-5 text-amber-600" />
                        </div>
                        <h2 className="font-bold">Preferências</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tom</span>
                            <span className="font-medium capitalize">{client?.content_tone || "profissional"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Idioma</span>
                            <span className="font-medium">{client?.preferred_language === "pt-BR" ? "Português" : client?.preferred_language || "—"}</span>
                        </div>
                    </div>
                </Card>

                {/* Público alvo */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-green-600" />
                        </div>
                        <h2 className="font-bold">Mercado</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-muted-foreground block mb-1">Público-alvo</span>
                            <p className="font-medium">{client?.target_audience || "Não definido"}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground block mb-1">Produtos/Serviços</span>
                            <p className="font-medium">{client?.products_services || "Não definido"}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Editar */}
            <Card className="p-6 mt-6 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                    Para alterar dados do perfil, entre em contato:{" "}
                    <a
                        href="https://wa.me/5511999999999?text=Oi%20Gustavo!%20Preciso%20alterar%20meu%20perfil%20na%20plataforma."
                        target="_blank"
                        className="text-primary hover:underline font-medium"
                    >
                        Falar pelo WhatsApp
                    </a>
                </p>
            </Card>
        </div>
    );
}
