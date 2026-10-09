import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth/session-token";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const claims = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/app") && !claims) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(url);
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if ((pathname === "/sign-in" || pathname === "/sign-up") && claims) {
    return NextResponse.redirect(new URL("/app/operations/overview", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/sign-in", "/sign-up"],
};
