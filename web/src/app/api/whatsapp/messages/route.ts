import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const formData = await request.formData();
    const clientId = String(formData.get("client_id") || "");
    const reportId = String(formData.get("report_id") || "");
    const body = String(formData.get("body") || "").trim();
    const phoneNumber = String(formData.get("phone_number") || "").trim();
    const messageType = String(formData.get("message_type") || "text");

    if (!clientId || !body) {
        return NextResponse.redirect(new URL("/admin/whatsapp?error=validation", request.url));
    }

    try {
        const admin = createAdminClient();
        const { error } = await admin.from("whatsapp_messages").insert({
            client_id: clientId,
            report_id: reportId || null,
            direction: "outbound",
            status: "queued",
            message_type: messageType,
            phone_number: phoneNumber || null,
            body,
            metadata: {
                created_by: user.id,
                source: "admin_panel",
            },
        });

        if (error) throw error;
        return NextResponse.redirect(new URL("/admin/whatsapp?success=queued", request.url));
    } catch {
        return NextResponse.redirect(new URL("/admin/whatsapp?error=save", request.url));
    }
}
