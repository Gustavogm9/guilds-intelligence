"use client";

import { useEffect } from "react";

export function MarkNotificationsRead() {
    useEffect(() => {
        // Marcamos como lido 1.5s após entrar na tela para garantir
        // que o usuário processou a informação e não foi apenas um "pass-through".
        const timer = setTimeout(() => {
            fetch("/api/notifications/read", { method: "POST" }).catch(console.error);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    return null;
}
