import type { Btb } from "@/lib/types";

/** Jumlah batch yang boleh muncul di dropdown Buat BTB. */
export const LATEST_BATCH_LIMIT = 3;

export type NamedBatch = {
  /** Nilai yang disimpan di dokumen dan stok. */
  value: string;
  /** Nama yang dibaca user, misalnya "Batch 1". */
  label: string;
  lastUsedAt: string;
};

/** Kode internal seperti BC-SA-01, bukan nama yang dibaca user. */
export function isTechnicalBatchId(value: string) {
  return /^BC-[A-Z0-9-]+$/i.test(value.trim());
}

function isTransferLine(keterangan?: string | null) {
  const note = (keterangan ?? "").trim().toLowerCase();
  return note === "hasil transfer gudang" || note === "stok karton di gudang fg";
}

function docStamp(doc: Btb) {
  return doc.createdAt || doc.tanggalTerima || "";
}

/**
 * Semua batch penerimaan, urut pertama kali dipakai.
 * Kode BC-… ditampilkan sebagai "Batch 1", "Batch 2", dan seterusnya.
 * Nama yang sudah ditulis user dipertahankan.
 */
export function collectBatches(docs: Btb[]): NamedBatch[] {
  const ordered = [...docs].sort((a, b) => {
    const byTime = docStamp(a).localeCompare(docStamp(b));
    if (byTime !== 0) return byTime;
    return a.no.localeCompare(b.no);
  });

  const rows = new Map<
    string,
    { value: string; lastUsedAt: string; explicit: string }
  >();

  for (const doc of ordered) {
    const at = docStamp(doc);
    const names = [...(doc.items ?? []), ...(doc.fgs ?? [])]
      .filter((line) => !isTransferLine(line.keterangan))
      .map((line) => line.batchCustomer.trim())
      .filter(Boolean);
    const unique = [...new Set(names)];
    const docLevel = (doc.batch ?? "").trim();
    const identities = unique.length > 0 ? unique : docLevel ? [docLevel] : [];
    for (const value of identities) {
      const explicit = isTechnicalBatchId(value) ? "" : value;
      const current = rows.get(value);
      if (!current) {
        rows.set(value, { value, lastUsedAt: at, explicit });
        continue;
      }
      if (at >= current.lastUsedAt) current.lastUsedAt = at;
      if (!current.explicit && explicit) current.explicit = explicit;
    }
  }

  const used = new Set<string>();
  for (const row of rows.values()) {
    if (row.explicit) used.add(row.explicit.toLowerCase());
  }

  function nextLabel() {
    let n = 1;
    while (used.has(`batch ${n}`)) n += 1;
    const label = `Batch ${n}`;
    used.add(label.toLowerCase());
    return label;
  }

  return [...rows.values()].map((row) => ({
    value: row.value,
    label: row.explicit || nextLabel(),
    lastUsedAt: row.lastUsedAt,
  }));
}

/** Tiga batch yang paling baru dipakai. */
export function listLatestBatches(
  docs: Btb[],
  limit = LATEST_BATCH_LIMIT,
): NamedBatch[] {
  const safe = Math.min(50, Math.max(1, Math.trunc(limit) || LATEST_BATCH_LIMIT));
  return [...collectBatches(docs)]
    .sort(
      (a, b) =>
        b.lastUsedAt.localeCompare(a.lastUsedAt) ||
        a.value.localeCompare(b.value),
    )
    .slice(0, safe);
}

export function batchLabel(value: string, docs: Btb[]) {
  const name = value.trim();
  if (!name) return "";
  const found = collectBatches(docs).find((row) => row.value === name);
  if (found) return found.label;
  return isTechnicalBatchId(name) ? "" : name;
}

export function nextBatchLabel(docs: Btb[]) {
  const used = new Set(
    collectBatches(docs).map((row) => row.label.toLowerCase()),
  );
  let n = 1;
  while (used.has(`batch ${n}`)) n += 1;
  return `Batch ${n}`;
}

/** Label opsi BKB: nama batch, gudang, dan stok. Tanpa nomor BTB, kode batch, atau tanggal. */
export function formatBatchOptionLabel(
  name: string,
  gudang: string,
  qty: number,
) {
  const title = name.trim() || "Batch";
  const place = gudang.trim() || "-";
  return `${title} - ${place} - (Stok: ${qty})`;
}
