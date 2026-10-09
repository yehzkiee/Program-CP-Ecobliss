import { cookies } from "next/headers";
import { logoutToken, SESSION_COOKIE } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  await logoutToken(jar.get(SESSION_COOKIE)?.value);
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return Response.json({ ok: true });
}
