"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateReportButtonProps {
    label: string;
    loadingLabel: string;
}

export function GenerateReportButton({ label, loadingLabel }: GenerateReportButtonProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleGenerate() {
        setLoading(true);
        try {
            const res = await fetch("/api/reports/generate-on-demand", { method: "POST" });
            const data = await res.json();
            if (res.ok && data.report_id) {
                router.push(`/dashboard/reports/${data.report_id}`);
            } else {
                router.refresh();
            }
        } catch {
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {loadingLabel}
                </>
            ) : (
                <>
                    <Plus className="h-4 w-4" />
                    {label}
                </>
            )}
        </Button>
    );
}
