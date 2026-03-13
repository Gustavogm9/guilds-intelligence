"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    User,
    Building2,
    Globe,
    Palette,
    Pencil,
    X,
    Save,
    Loader2,
    Plus,
    Trash2,
} from "lucide-react";

type ClientData = {
    id: string;
    contact_name?: string;
    contact_phone?: string;
    company_name?: string;
    industry?: string;
    company_size?: string;
    location?: string;
    target_audience?: string;
    products_services?: string;
    content_tone?: string;
    preferred_language?: string;
    website_url?: string;
    social_media_urls?: string[];
    plans?: { name?: string; report_frequency?: string } | { name?: string; report_frequency?: string }[];
};

type Translations = {
    profileTitle: string;
    profileDescription: string;
    account: string;
    email: string;
    contact: string;
    whatsapp: string;
    plan: string;
    frequency: string;
    company: string;
    industry: string;
    size: string;
    location: string;
    preferences: string;
    tone: string;
    language: string;
    market: string;
    audience: string;
    productsServices: string;
    notDefined: string;
    tones: Record<string, string>;
    languages: Record<string, string>;
    frequencies: Record<string, string>;
};

const sizeOptions = [
    { value: "1-10", label: "1-10" },
    { value: "11-50", label: "11-50" },
    { value: "51-200", label: "51-200" },
    { value: "201-500", label: "201-500" },
    { value: "500+", label: "500+" },
];

export default function ProfileEditor({
    clientData,
    userEmail,
    t,
}: {
    clientData: ClientData;
    userEmail: string;
    t: Translations;
}) {
    const router = useRouter();
    const plan = Array.isArray(clientData?.plans)
        ? clientData?.plans[0]
        : clientData?.plans;

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    const [form, setForm] = useState({
        contact_name: clientData?.contact_name || "",
        contact_phone: clientData?.contact_phone || "",
        company_name: clientData?.company_name || "",
        industry: clientData?.industry || "",
        company_size: clientData?.company_size || "",
        location: clientData?.location || "",
        target_audience: clientData?.target_audience || "",
        products_services: clientData?.products_services || "",
        content_tone: clientData?.content_tone || "profissional",
        preferred_language: clientData?.preferred_language || "pt-BR",
        website_url: clientData?.website_url || "",
    });
    const [socialUrls, setSocialUrls] = useState<string[]>(
        clientData?.social_media_urls?.length ? clientData.social_media_urls : [""]
    );

    function update(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleCancel() {
        setForm({
            contact_name: clientData?.contact_name || "",
            contact_phone: clientData?.contact_phone || "",
            company_name: clientData?.company_name || "",
            industry: clientData?.industry || "",
            company_size: clientData?.company_size || "",
            location: clientData?.location || "",
            target_audience: clientData?.target_audience || "",
            products_services: clientData?.products_services || "",
            content_tone: clientData?.content_tone || "profissional",
            preferred_language: clientData?.preferred_language || "pt-BR",
            website_url: clientData?.website_url || "",
        });
        setSocialUrls(
            clientData?.social_media_urls?.length ? clientData.social_media_urls : [""]
        );
        setIsEditing(false);
    }

    async function handleSave() {
        setSaving(true);
        setToast(null);
        try {
            const supabase = createClient();

            // Build update payload
            const updateData: Record<string, unknown> = {
                contact_name: form.contact_name,
                contact_phone: form.contact_phone,
                company_name: form.company_name,
                industry: form.industry,
                company_size: form.company_size,
                location: form.location,
                target_audience: form.target_audience,
                products_services: form.products_services,
                content_tone: form.content_tone,
                preferred_language: form.preferred_language,
                website_url: form.website_url || null,
                social_media_urls: socialUrls.filter((u) => u.trim()),
            };

            // Invalidate website cache if URL changed
            const oldUrl = clientData?.website_url || "";
            const newUrl = form.website_url || "";
            if (newUrl !== oldUrl) {
                updateData.website_content_cache = null;
                updateData.website_content_cached_at = null;
            }

            const { error } = await supabase
                .from("clients")
                .update(updateData)
                .eq("id", clientData.id);

            if (error) throw error;

            const isPt = form.preferred_language.startsWith("pt");
            setToast({
                type: "success",
                msg: isPt ? "Perfil atualizado com sucesso!" : "Profile updated successfully!",
            });
            setIsEditing(false);
            router.refresh();
        } catch (err) {
            console.error("Save profile error:", err);
            const isPt = form.preferred_language.startsWith("pt");
            setToast({
                type: "error",
                msg: isPt ? "Erro ao salvar. Tente novamente." : "Save failed. Please try again.",
            });
        } finally {
            setSaving(false);
            setTimeout(() => setToast(null), 4000);
        }
    }

    const isPt = (form.preferred_language || "pt-BR").startsWith("pt");

    /* ---- Read-only value display ---- */
    function Val({ value, fallback }: { value?: string | null; fallback?: string }) {
        return <span className="font-medium">{value || fallback || t.notDefined}</span>;
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t.profileTitle}</h1>
                    <p className="text-muted-foreground mt-1">{t.profileDescription}</p>
                </div>
                {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        {isPt ? "Editar perfil" : "Edit profile"}
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handleCancel} disabled={saving} className="gap-2">
                            <X className="h-4 w-4" />
                            {isPt ? "Cancelar" : "Cancel"}
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isPt ? "Salvar" : "Save"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`mb-4 rounded-lg p-3 text-sm font-medium ${
                        toast.type === "success"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-red-500/10 text-red-700 dark:text-red-400"
                    }`}
                >
                    {toast.msg}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
                {/* Account Card */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="font-bold">{t.account}</h2>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t.email}</span>
                            <span className="font-medium">{userEmail}</span>
                        </div>
                        {isEditing ? (
                            <>
                                <div className="grid gap-1.5">
                                    <Label>{t.contact}</Label>
                                    <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>{t.whatsapp}</Label>
                                    <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+55 11 99999-9999" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t.contact}</span>
                                    <Val value={form.contact_name} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t.whatsapp}</span>
                                    <Val value={form.contact_phone} fallback="-" />
                                </div>
                            </>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.plan}</span>
                            <span className="font-medium text-primary">{String(plan?.name) || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t.frequency}</span>
                            <span className="font-medium">
                                {t.frequencies[String(plan?.report_frequency)] || "-"}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Company Card */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-violet-600" />
                        </div>
                        <h2 className="font-bold">{t.company}</h2>
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div className="grid gap-1.5">
                                <Label>{t.company}</Label>
                                <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t.industry}</Label>
                                <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t.size}</Label>
                                <Select value={form.company_size} onValueChange={(v) => update("company_size", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {sizeOptions.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t.location}</Label>
                                <Input value={form.location} onChange={(e) => update("location", e.target.value)} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t.company}</span>
                                <Val value={form.company_name} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t.industry}</span>
                                <Val value={form.industry} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t.size}</span>
                                <Val value={form.company_size} />
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t.location}</span>
                                <Val value={form.location} />
                            </div>
                        </div>
                    )}
                </Card>

                {/* Preferences Card */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Palette className="h-5 w-5 text-amber-600" />
                        </div>
                        <h2 className="font-bold">{t.preferences}</h2>
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div className="grid gap-1.5">
                                <Label>{t.tone}</Label>
                                <Select value={form.content_tone} onValueChange={(v) => update("content_tone", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(t.tones).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t.language}</Label>
                                <Select value={form.preferred_language} onValueChange={(v) => update("preferred_language", v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(t.languages).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t.tone}</span>
                                <span className="font-medium capitalize">
                                    {t.tones[form.content_tone] || form.content_tone || "-"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t.language}</span>
                                <span className="font-medium">
                                    {t.languages[form.preferred_language] || form.preferred_language || "-"}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Market Card */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-green-600" />
                        </div>
                        <h2 className="font-bold">{t.market}</h2>
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div className="grid gap-1.5">
                                <Label>{t.audience}</Label>
                                <Textarea
                                    value={form.target_audience}
                                    onChange={(e) => update("target_audience", e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label>{t.productsServices}</Label>
                                <Textarea
                                    value={form.products_services}
                                    onChange={(e) => update("products_services", e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="text-muted-foreground block mb-1">{t.audience}</span>
                                <p className="font-medium">{form.target_audience || t.notDefined}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground block mb-1">{t.productsServices}</span>
                                <p className="font-medium">{form.products_services || t.notDefined}</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Web & Social Card - Full width */}
            <Card className="p-6 mt-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="font-bold">{isPt ? "Site & Redes Sociais" : "Website & Social Media"}</h2>
                </div>
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="grid gap-1.5">
                            <Label>{isPt ? "Site da empresa" : "Company website"}</Label>
                            <Input
                                type="url"
                                value={form.website_url}
                                onChange={(e) => update("website_url", e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>{isPt ? "Redes sociais" : "Social media profiles"}</Label>
                            <div className="space-y-2">
                                {socialUrls.map((url, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input
                                            type="url"
                                            value={url}
                                            onChange={(e) => {
                                                const updated = [...socialUrls];
                                                updated[idx] = e.target.value;
                                                setSocialUrls(updated);
                                            }}
                                            placeholder="https://instagram.com/..."
                                        />
                                        {socialUrls.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setSocialUrls(socialUrls.filter((_, i) => i !== idx))}
                                                className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setSocialUrls([...socialUrls, ""])}
                                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" /> {isPt ? "Adicionar outra" : "Add another"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{isPt ? "Site" : "Website"}</span>
                            {form.website_url ? (
                                <a
                                    href={form.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-primary hover:underline"
                                >
                                    {form.website_url}
                                </a>
                            ) : (
                                <Val fallback={t.notDefined} />
                            )}
                        </div>
                        <div>
                            <span className="text-muted-foreground block mb-1">
                                {isPt ? "Redes sociais" : "Social media"}
                            </span>
                            {socialUrls.filter((u) => u.trim()).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {socialUrls
                                        .filter((u) => u.trim())
                                        .map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline text-xs bg-primary/5 px-2 py-1 rounded-full"
                                            >
                                                {url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                                            </a>
                                        ))}
                                </div>
                            ) : (
                                <p className="font-medium">{t.notDefined}</p>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
