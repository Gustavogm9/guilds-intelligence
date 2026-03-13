"use client";

import { useSearchParams } from "next/navigation";

import { normalizeLocale } from "@/lib/i18n";

export function resolvePublicLocale(explicit?: string | null) {
    return normalizeLocale(explicit);
}

export function usePublicLocale() {
    const searchParams = useSearchParams();
    return resolvePublicLocale(searchParams.get("lang"));
}
