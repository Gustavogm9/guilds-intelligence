import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    if (code && request.nextUrl.pathname === "/") {
        const callbackUrl = request.nextUrl.clone();
        callbackUrl.pathname = "/auth/callback";
        callbackUrl.search = `?code=${code}`;
        return NextResponse.redirect(callbackUrl);
    }

    return await updateSession(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
