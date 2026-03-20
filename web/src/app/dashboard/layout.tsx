import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Bell,
    Crosshair,
    FileText,
    LayoutDashboard,
    LogOut,
    Settings,
    Sparkles,
    User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (profile?.role === "admin") redirect("/admin");

    const { data: client } = await supabase
        .from("clients")
        .select("preferred_language")
        .eq("user_id", user.id)
        .single();

    const { count: unreadCount } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

    const t = getDictionary(client?.preferred_language);
    const clientLinks = [
        { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
        { href: "/dashboard/inbox", label: t.inbox, icon: Bell },
        { href: "/dashboard/reports", label: t.reports, icon: FileText },
        { href: "/dashboard/deep-dive", label: t.deepDive, icon: Sparkles },
        { href: "/dashboard/niches", label: t.myNiches, icon: Crosshair },
        { href: "/dashboard/settings", label: t.settings, icon: Settings },
        { href: "/dashboard/profile", label: t.profile, icon: User },
    ];

    return (
        <div className="min-h-screen flex">
            <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
                <div className="p-6 border-b border-border">
                    <Link href="/dashboard" className="text-xl font-extrabold">
                        <span className="text-primary">{t.appName}</span>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {clientLinks.map((link) => {
                        const isInbox = link.href === "/dashboard/inbox";
                        const showBadge = isInbox && unreadCount && unreadCount > 0;
                        
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <link.icon className="h-4 w-4" />
                                    {link.label}
                                </div>
                                {showBadge ? (
                                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                            {(profile?.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {profile?.full_name || t.userFallback}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <form action="/auth/signout" method="post">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted mt-1"
                        >
                            <LogOut className="h-4 w-4" />
                            {t.logout}
                        </button>
                    </form>
                </div>
            </aside>
            <main className="flex-1 overflow-auto">
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
