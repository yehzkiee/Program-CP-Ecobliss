import { importEcoblissMasters } from "@/server/import-ecobliss";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Hanya admin yang bisa impor" }, { status: 401 });
  }

  try {
    const summary = await importEcoblissMasters(user);
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impor gagal";
    return Response.json({ error: message }, { status: 502 });
  }
}
