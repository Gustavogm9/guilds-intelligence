import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    FileText,
    CreditCard,
    Package,
    Settings,
    LogOut,
    BarChart3,
} from "lucide-react";
import Link from "next/link";

const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clients", label: "Clientes", icon: Users },
    { href: "/admin/reports", label: "Relatórios", icon: FileText },
    { href: "/admin/plans", label: "Planos", icon: CreditCard },
    { href: "/admin/portfolio", label: "Portfolio", icon: Package },
    { href: "/admin/billing", label: "Billing", icon: BarChart3 },
];

export default async function AdminLayout({
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

    if (profile?.role !== "admin") redirect("/dashboard");

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
                <div className="p-6 border-b border-border">
                    <Link href="/admin" className="text-xl font-extrabold">
                        <span className="text-primary">Guilds</span>
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                            Admin
                        </span>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {adminLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                            {(profile?.full_name || "A").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {profile?.full_name || "Admin"}
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
                            Sair
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">{children}</div>
            </main>
        </div>
    );
}
