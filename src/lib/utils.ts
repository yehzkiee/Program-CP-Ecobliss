import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateID(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeID(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** @deprecated Prefer `useConfirmDialog` modal. Kept for gradual migration. */
export function confirmDelete(
  message = "Apakah Anda yakin ingin menghapus data ini?",
): boolean {
  if (typeof window === "undefined") return false;
  return window.confirm(message);
}

/** True when role is Super Admin (stored as `admin`). */
export function isSuperAdmin(role?: string | null) {
  return role === "admin";
}

/** Sort newest-first by ISO date string field(s). */
export function sortByDateDesc<T>(
  rows: T[],
  ...keys: (keyof T)[]
): T[] {
  return [...rows].sort((a, b) => {
    for (const key of keys) {
      const av = String(a[key] ?? "");
      const bv = String(b[key] ?? "");
      const cmp = bv.localeCompare(av);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

/* ── Human-readable display helpers (no stuck tokens / no snake_case in UI) ── */

const STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
  draft: "Draft",
  menunggu_approval: "Menunggu Approval",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  admin: "Super Admin",
  user: "User",
};

/** Qty + satuan with a guaranteed space: `500 LBR`. */
export function formatQty(
  qty: number | string | null | undefined,
  satuan?: string | null,
) {
  const q = qty === null || qty === undefined ? "" : String(qty).trim();
  const u = (satuan ?? "").trim();
  if (!q && !u) return "-";
  if (!u) return q || "-";
  if (!q) return u;
  return `${q} ${u}`;
}

/**
 * Qty + satuan + gudang with clear separators.
 * Example: `500 LBR - Gudang Item`
 */
export function formatQtyWithGudang(
  qty: number | string | null | undefined,
  satuan?: string | null,
  gudang?: string | null,
) {
  const qtyPart = formatQty(qty, satuan);
  const g = (gudang ?? "").trim();
  if (!g || g === "-") return qtyPart;
  if (qtyPart === "-") return g;
  return `${qtyPart} - ${g}`;
}

/** Kode + nama: `MAT-001 - Karton Duplex`. */
export function formatKodeNama(kode?: string | null, nama?: string | null) {
  const k = (kode ?? "").trim();
  const n = (nama ?? "").trim();
  if (!k && !n) return "-";
  if (!k) return n;
  if (!n) return k;
  return `${k} - ${n}`;
}

export function formatStatusLabel(status?: string | null) {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function formatJenisBarang(jenis?: string | null) {
  if (jenis === "item") return "Material";
  if (jenis === "fg") return "Finish Good";
  if (!jenis) return "-";
  return jenis;
}

export { STATUS_LABELS };
