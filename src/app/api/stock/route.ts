import { readStock } from "@/server/db";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Belum login" }, { status: 401 });
  }
  return Response.json(await readStock());
}
