"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
    /** Current textarea value */
    value: string;
    /** Called with the updated text (appended) */
    onChange: (newValue: string) => void;
    /** Language for speech recognition */
    lang?: string;
    /** Optional class for positioning */
    className?: string;
    /** Tooltip label */
    label?: string;
}

type SpeechRecognitionEvent = Event & {
    results: SpeechRecognitionResultList;
    resultIndex: number;
};

type SpeechRecognitionErrorEvent = Event & {
    error: string;
};

type SpeechRecognitionInstance = EventTarget & {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceInput({
    value,
    onChange,
    lang = "pt-BR",
    className,
    label,
}: VoiceInputProps) {
    const [recording, setRecording] = useState(false);
    const [supported, setSupported] = useState(true);
    const [interim, setInterim] = useState("");
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const baseTextRef = useRef(value);

    useEffect(() => {
        if (!getSpeechRecognition()) {
            setSupported(false);
        }
    }, []);

    const startRecording = useCallback(() => {
        const SpeechRecognition = getSpeechRecognition();
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;

        baseTextRef.current = value;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                const separator = baseTextRef.current.trim() ? "\n" : "";
                baseTextRef.current = baseTextRef.current.trim() + separator + finalTranscript.trim();
                onChange(baseTextRef.current);
                setInterim("");
            } else {
                setInterim(interimTranscript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error !== "aborted") {
                console.warn("Speech recognition error:", event.error);
            }
            setRecording(false);
            setInterim("");
        };

        recognition.onend = () => {
            setRecording(false);
            setInterim("");
        };

        recognitionRef.current = recognition;
        recognition.start();
        setRecording(true);
    }, [lang, value, onChange]);

    const stopRecording = useCallback(() => {
        recognitionRef.current?.stop();
        setRecording(false);
        setInterim("");
    }, []);

    if (!supported) return null;

    return (
        <div className={cn("inline-flex items-center gap-1", className)}>
            <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer",
                    recording
                        ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
                title={label || (recording ? "Parar gravação" : "Gravar áudio")}
            >
                {recording ? (
                    <>
                        <MicOff className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Parar</span>
                    </>
                ) : (
                    <>
                        <Mic className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Falar</span>
                    </>
                )}
            </button>
            {recording && interim && (
                <span className="text-[10px] text-muted-foreground italic flex items-center gap-1 max-w-[200px] truncate">
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    {interim}
                </span>
            )}
        </div>
    );
}
