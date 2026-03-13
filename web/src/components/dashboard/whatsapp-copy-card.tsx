"use client";

import { Copy, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function WhatsAppCopyCard({
    content,
    title,
    copyLabel,
}: {
    content: string;
    title: string;
    copyLabel: string;
}) {
    return (
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-bold">{title}</h3>
            </div>
            <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed mb-3">
                {content}
            </div>
            <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                    navigator.clipboard.writeText(content);
                }}
            >
                <Copy className="h-3.5 w-3.5" />
                {copyLabel}
            </Button>
        </Card>
    );
}
