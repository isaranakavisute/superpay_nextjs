import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only (cookie present?) — pages verify the signature via getSessionUser().
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("sp_session");
  const { pathname, search } = request.nextUrl;

  // Public: customer checkout, brand images (login page / favicon), merchant API.
  // The Merchant Portal (/merchant/*) has its own login and session (sp_portal), checked by its pages.
  if (pathname === "/c" || pathname === "/c/status" || pathname === "/branding/logo" || pathname === "/branding/favicon" || pathname.startsWith("/api/v1/") || pathname === "/api/telegram/slip-bot" || pathname === "/api/auth/login" || pathname.startsWith("/merchant/")) {
    return NextResponse.next();
  }
  if (pathname === "/login") {
    return hasSession ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
