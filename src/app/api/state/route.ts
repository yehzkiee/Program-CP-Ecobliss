import {
  loadState,
  readRevision,
  replacePersistedState,
  type PersistedData,
} from "@/server/db";
import { currentUser } from "@/server/session";
import { syncBtbQtySisa } from "@/lib/mock/data";
import type { User } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSION = 6;

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Belum login" }, { status: 401 });
  }
  return Response.json(
    {
      state: await loadState(),
      version: VERSION,
      revision: await readRevision(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Belum login" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    state?: PersistedData;
    revision?: number;
  } | null;
  if (!body?.state?.customers || !body.state.users) {
    return Response.json({ error: "Data tidak lengkap" }, { status: 400 });
  }
  const currentRevision = await readRevision();
  if (
    typeof body.revision === "number" &&
    body.revision !== currentRevision
  ) {
    return Response.json(
      {
        error:
          "Data sudah berubah di server. Muat ulang halaman lalu ulangi perubahan terakhir.",
        revision: currentRevision,
      },
      { status: 409 },
    );
  }
  const next = normalizeState(body.state);
  const previous = await loadState();
  if (user.role !== "admin" && forbiddenForUser(previous, next)) {
    return Response.json(
      { error: "Hanya admin yang dapat mengubah user atau menyetujui adjustment" },
      { status: 403 },
    );
  }
  const revision = await replacePersistedState(next);
  return Response.json({ ok: true, revision });
}

function forbiddenForUser(previous: PersistedData, next: PersistedData) {
  return usersChanged(previous.users, next.users) || approvalChanged(previous, next);
}

function usersChanged(previous: User[], next: User[]) {
  const stamp = (rows: User[]) =>
    rows
      .map((row) => `${row.id}|${row.username}|${row.nama}|${row.role}`)
      .sort()
      .join("\n");
  return stamp(previous) !== stamp(next);
}

function approvalChanged(previous: PersistedData, next: PersistedData) {
  const prior = new Map(previous.adjustments.map((row) => [row.id, row.status]));
  return next.adjustments.some((row) => {
    const before = prior.get(row.id) ?? "menunggu_approval";
    return (
      row.status !== before &&
      (row.status === "disetujui" || row.status === "ditolak")
    );
  });
}

function normalizeState(state: PersistedData): PersistedData {
  return {
    users: state.users ?? [],
    customers: state.customers ?? [],
    items: state.items ?? [],
    finishGoods: state.finishGoods ?? [],
    boms: state.boms ?? [],
    gudangList: state.gudangList ?? [],
    jenisTransaksiList: state.jenisTransaksiList ?? [],
    btbs: syncBtbQtySisa(state.btbs ?? [], state.bkbs ?? []),
    bkbs: state.bkbs ?? [],
    stockOpnames: state.stockOpnames ?? [],
    adjustments: state.adjustments ?? [],
    transfers: state.transfers ?? [],
    activityLogs: state.activityLogs ?? [],
  };
}
