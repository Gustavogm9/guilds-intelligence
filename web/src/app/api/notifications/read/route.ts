import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase
            .from("user_notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) {
            console.error("Erro ao marcar notificações como lidas:", error);
            return NextResponse.json({ error: "Failed to update" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Erro no endpoint de leitura de notificações:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
