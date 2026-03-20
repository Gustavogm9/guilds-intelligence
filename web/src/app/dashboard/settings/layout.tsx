"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CreditCard, Settings } from "lucide-react";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const tabs = [
        {
            name: "Geral",
            href: "/dashboard/settings",
            icon: Settings,
            isActive: pathname === "/dashboard/settings",
        },
        {
            name: "Faturamento",
            href: "/dashboard/settings/billing",
            icon: CreditCard,
            isActive: pathname === "/dashboard/settings/billing",
        },
    ];

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-3xl font-bold">Configurações</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie suas preferências, janela de envios e faturamento.
                </p>
            </div>

            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={`
                                    flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                                    ${tab.isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                                    }
                                `}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div>{children}</div>
        </div>
    );
}
