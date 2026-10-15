import { LATEST_BATCH_LIMIT, collectBatches, listLatestBatches } from "@/lib/batches";
import { loadState, readLatestBatchKeys } from "@/server/db";
import { currentUser } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Belum login" }, { status: 401 });
  }

  const state = await loadState();
  const catalog = collectBatches(state.btbs);
  const byValue = new Map(catalog.map((row) => [row.value, row]));

  let keys: { value: string }[] = [];
  try {
    keys = await readLatestBatchKeys(LATEST_BATCH_LIMIT);
  } catch {
    keys = [];
  }

  const fromLedger = keys
    .map((key) => byValue.get(key.value))
    .filter((row) => row != null)
    .slice(0, LATEST_BATCH_LIMIT);

  return Response.json(
    {
      batches:
        fromLedger.length > 0
          ? fromLedger
          : listLatestBatches(state.btbs, LATEST_BATCH_LIMIT),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
