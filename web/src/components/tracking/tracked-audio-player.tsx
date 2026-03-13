"use client";

import { useRef } from "react";

import { trackEvent } from "@/lib/tracking";

export function TrackedAudioPlayer({
    reportId,
    src,
}: {
    reportId: string;
    src: string;
}) {
    const trackedRef = useRef(false);

    return (
        <audio
            controls
            className="w-full"
            preload="metadata"
            onPlay={() => {
                if (trackedRef.current) return;
                trackedRef.current = true;
                trackEvent("audio_play", {
                    report_id: reportId,
                });
            }}
        >
            <source src={src} type="audio/mpeg" />
            Seu navegador nao suporta o player de audio.
        </audio>
    );
}
