import { cookies } from "next/headers";
import { loginUser, SESSION_COOKIE } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  if (!username || !password) {
    return Response.json(
      { error: "Username dan password wajib diisi" },
      { status: 400 },
    );
  }

  const result = await loginUser(username, password);
  if (!result) {
    return Response.json(
      { error: "Username atau password salah" },
      { status: 401 },
    );
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return Response.json({ user: result.user });
}
