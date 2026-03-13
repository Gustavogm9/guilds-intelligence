"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Crosshair,
    Pencil,
    Plus,
    Trash2,
    Check,
    X,
    Loader2,
    Info,
    Globe,
} from "lucide-react";

type Niche = {
    id: string;
    client_id: string;
    niche_name: string;
    relevance: string;
    is_active: boolean;
    created_at: string;
};

type NichesTranslations = {
    nichesTitle: string;
    nichesDescription: string;
    nicheName: string;
    nicheRelevance: string;
    nichePrimary: string;
    nicheSecondary: string;
    nicheActive: string;
    nicheInactive: string;
    addNiche: string;
    deleteNiche: string;
    deleteNicheConfirm: string;
    nicheSaved: string;
    nicheAdded: string;
    nicheDeleted: string;
    nicheSaveError: string;
    nicheEmptyName: string;
    noNichesYet: string;
    nichesHint: string;
    notDefined: string;
};

export default function NichesManager({
    niches: initialNiches,
    clientId,
    t,
    lang,
}: {
    niches: Niche[];
    clientId: string;
    t: NichesTranslations;
    lang: string;
}) {
    const router = useRouter();
    const isPt = lang.startsWith("pt");
    const [niches, setNiches] = useState<Niche[]>(initialNiches);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editRelevance, setEditRelevance] = useState("secondary");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    // New niche form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newRelevance, setNewRelevance] = useState("secondary");

    function showToast(type: "success" | "error", msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    }

    function startEditing(niche: Niche) {
        setEditingId(niche.id);
        setEditName(niche.niche_name);
        setEditRelevance(niche.relevance);
    }

    function cancelEditing() {
        setEditingId(null);
        setEditName("");
        setEditRelevance("secondary");
    }

    async function saveEdit(nicheId: string) {
        if (!editName.trim()) {
            showToast("error", t.nicheEmptyName);
            return;
        }
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("client_niches")
                .update({ niche_name: editName.trim(), relevance: editRelevance })
                .eq("id", nicheId);

            if (error) throw error;

            setNiches((prev) =>
                prev.map((n) =>
                    n.id === nicheId
                        ? { ...n, niche_name: editName.trim(), relevance: editRelevance }
                        : n
                )
            );
            setEditingId(null);
            showToast("success", t.nicheSaved);
        } catch {
            showToast("error", t.nicheSaveError);
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(niche: Niche) {
        const newActive = !niche.is_active;
        // Optimistic update
        setNiches((prev) =>
            prev.map((n) => (n.id === niche.id ? { ...n, is_active: newActive } : n))
        );
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("client_niches")
                .update({ is_active: newActive })
                .eq("id", niche.id);
            if (error) throw error;
            showToast("success", t.nicheSaved);
        } catch {
            // Revert on error
            setNiches((prev) =>
                prev.map((n) => (n.id === niche.id ? { ...n, is_active: !newActive } : n))
            );
            showToast("error", t.nicheSaveError);
        }
    }

    async function addNiche() {
        if (!newName.trim()) {
            showToast("error", t.nicheEmptyName);
            return;
        }
        setSaving(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("client_niches")
                .insert({
                    client_id: clientId,
                    niche_name: newName.trim(),
                    relevance: newRelevance,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;
            setNiches((prev) => [data, ...prev]);
            setNewName("");
            setNewRelevance("secondary");
            setShowAddForm(false);
            showToast("success", t.nicheAdded);
            router.refresh();
        } catch {
            showToast("error", t.nicheSaveError);
        } finally {
            setSaving(false);
        }
    }

    async function deleteNiche(nicheId: string) {
        setSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("client_niches")
                .delete()
                .eq("id", nicheId);

            if (error) throw error;

            setNiches((prev) => prev.filter((n) => n.id !== nicheId));
            showToast("success", t.nicheDeleted);
            router.refresh();
        } catch {
            showToast("error", t.nicheSaveError);
        } finally {
            setSaving(false);
        }
    }

    const activeCount = niches.filter((n) => n.is_active).length;
    const primaryCount = niches.filter((n) => n.relevance === "primary").length;

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{t.nichesTitle}</h1>
                    <p className="text-muted-foreground mt-1">{t.nichesDescription}</p>
                </div>
                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    {t.addNiche}
                </Button>
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

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{niches.length}</p>
                    <p className="text-xs text-muted-foreground">{isPt ? "Total" : "Total"}</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">{t.nicheActive}{isPt ? "s" : ""}</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-violet-600">{primaryCount}</p>
                    <p className="text-xs text-muted-foreground">{t.nichePrimary}{isPt ? "s" : ""}</p>
                </Card>
            </div>

            {/* Hint */}
            <Card className="p-4 mb-6 bg-blue-500/5 border-blue-500/20 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{t.nichesHint}</p>
            </Card>

            {/* Add new niche form */}
            {showAddForm && (
                <Card className="p-5 mb-6 border-dashed border-2 border-primary/30">
                    <h3 className="text-sm font-semibold mb-3">{t.addNiche}</h3>
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-muted-foreground block mb-1">{t.nicheName}</label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder={isPt ? "Ex: Inteligência Artificial" : "E.g.: Artificial Intelligence"}
                                onKeyDown={(e) => e.key === "Enter" && addNiche()}
                            />
                        </div>
                        <div className="w-40">
                            <label className="text-xs text-muted-foreground block mb-1">{t.nicheRelevance}</label>
                            <Select value={newRelevance} onValueChange={setNewRelevance}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="primary">{t.nichePrimary}</SelectItem>
                                    <SelectItem value="secondary">{t.nicheSecondary}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={addNiche} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            {isPt ? "Adicionar" : "Add"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {/* Niches list */}
            {niches.length === 0 ? (
                <Card className="p-12 text-center">
                    <Crosshair className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground mb-2">{t.noNichesYet}</p>
                    <Button variant="outline" onClick={() => setShowAddForm(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {t.addNiche}
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {niches.map((niche) => (
                        <Card
                            key={niche.id}
                            className={`p-4 transition-all ${
                                !niche.is_active ? "opacity-50" : ""
                            } ${editingId === niche.id ? "ring-2 ring-primary/30" : ""}`}
                        >
                            {editingId === niche.id ? (
                                /* Edit mode */
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") saveEdit(niche.id);
                                                if (e.key === "Escape") cancelEditing();
                                            }}
                                        />
                                    </div>
                                    <Select value={editRelevance} onValueChange={setEditRelevance}>
                                        <SelectTrigger className="w-36">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="primary">{t.nichePrimary}</SelectItem>
                                            <SelectItem value="secondary">{t.nicheSecondary}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        onClick={() => saveEdit(niche.id)}
                                        disabled={saving}
                                        className="gap-1"
                                    >
                                        {saving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={cancelEditing}
                                        disabled={saving}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                /* View mode */
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">
                                                {niche.niche_name}
                                            </span>
                                            <Badge
                                                variant={
                                                    niche.relevance === "primary"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                className="text-[10px] px-1.5 py-0"
                                            >
                                                {niche.relevance === "primary"
                                                    ? t.nichePrimary
                                                    : t.nicheSecondary}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {isPt ? "Criado em" : "Created on"}{" "}
                                            {new Date(niche.created_at).toLocaleDateString(
                                                isPt ? "pt-BR" : "en-US"
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-muted-foreground">
                                            {niche.is_active ? t.nicheActive : t.nicheInactive}
                                        </span>
                                        <Switch
                                            checked={niche.is_active}
                                            onCheckedChange={() => toggleActive(niche)}
                                        />
                                    </div>

                                    <Link href={`/dashboard/niches/${niche.id}`}>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="gap-1 text-blue-600 hover:text-blue-700"
                                            title={isPt ? "Hub de Inteligência" : "Intelligence Hub"}
                                        >
                                            <Globe className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>

                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEditing(niche)}
                                        className="gap-1"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            if (confirm(t.deleteNicheConfirm)) {
                                                deleteNiche(niche.id);
                                            }
                                        }}
                                        className="text-destructive hover:text-destructive gap-1"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
