import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    // Interceptar ?code= na raiz e redirecionar para /auth/callback
    const code = request.nextUrl.searchParams.get("code");
    if (code && request.nextUrl.pathname === "/") {
        const callbackUrl = new URL("/auth/callback", request.url);
        callbackUrl.searchParams.set("code", code);
        return NextResponse.redirect(callbackUrl);
    }

    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all paths except static files and images
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
