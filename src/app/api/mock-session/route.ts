import { cookies } from "next/headers";
import { z } from "zod";

import {
  DEMO_ACCOUNT,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  userIdForEmail,
  verifySession,
  type SessionClaims,
} from "@/lib/auth/session-token";
import type { Session } from "@/lib/contracts/types";

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("signin"), email: z.string().email(), password: z.string().min(1) }),
  z.object({
    mode: z.literal("signup"),
    name: z.string().trim().min(2).max(60),
    email: z.string().email(),
    password: z.string().min(8),
  }),
]);

function toSession(claims: SessionClaims): Session {
  return {
    user: { id: claims.sub, email: claims.email, displayName: claims.name },
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

export async function GET() {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return Response.json({ session: null }, { status: 401 });
  return Response.json({ session: toSession(claims) });
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = body.safeParse(
    raw && typeof raw === "object" && !("mode" in raw) ? { ...raw, mode: "signin" } : raw,
  );
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const input = parsed.data;
  const email = input.email.trim().toLowerCase();
  let claims: SessionClaims;
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  if (input.mode === "signin") {
    if (email !== DEMO_ACCOUNT.email || input.password !== DEMO_ACCOUNT.password) {
      return Response.json({ error: "invalid_credentials" }, { status: 401 });
    }
    claims = { sub: DEMO_ACCOUNT.id, email, name: DEMO_ACCOUNT.name, exp };
  } else {
    if (email === DEMO_ACCOUNT.email)
      return Response.json({ error: "email_taken" }, { status: 409 });
    claims = { sub: userIdForEmail(email), email, name: input.name, exp };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(claims), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return Response.json({ session: toSession(claims) });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
