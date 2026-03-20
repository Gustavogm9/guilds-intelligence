"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ShareReportButtonProps {
    reportId: string;
}

export function ShareReportButton({ reportId }: ShareReportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleShare = async () => {
        if (shareUrl) return; // Already generated

        try {
            setIsLoading(true);
            const response = await fetch(`/api/reports/${reportId}/share`, {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to generate share link");
            }

            const data = await response.json();
            const url = `${window.location.origin}/public/reports/${data.token}`;
            setShareUrl(url);
        } catch (error) {
            console.error("Share error:", error);
            toast.error("Erro ao gerar link de compartilhamento");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setIsCopied(true);
            toast.success("Link copiado para a área de transferência!");
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error("Erro ao copiar o link");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open) handleShare();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Compartilhar Relatório</DialogTitle>
                    <DialogDescription>
                        Qualquer pessoa com este link poderá ver os resultados deste relatório. O acesso é em modo leitura e não exige login.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-4">
                    <Input
                        readOnly
                        value={shareUrl || "Gerando link..."}
                        className="flex-1"
                        onClick={(e) => e.currentTarget.select()}
                    />
                    <Button 
                        size="icon" 
                        variant="secondary" 
                        onClick={copyToClipboard}
                        disabled={!shareUrl || isLoading}
                    >
                        {isCopied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span className="sr-only">Copiar link</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
