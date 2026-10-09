import { cookies } from "next/headers";
import { SESSION_COOKIE, userFromToken } from "@/server/db";

export async function currentUser() {
  const jar = await cookies();
  return await userFromToken(jar.get(SESSION_COOKIE)?.value);
}
