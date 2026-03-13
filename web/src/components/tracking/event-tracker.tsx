"use client";

import { useEffect } from "react";

import { trackEvent, type FunnelEvent } from "@/lib/tracking";

export function EventTracker({
    eventType,
    metadata,
}: {
    eventType: FunnelEvent;
    metadata?: Record<string, unknown>;
}) {
    useEffect(() => {
        trackEvent(eventType, metadata);
    }, [eventType, metadata]);

    return null;
}
