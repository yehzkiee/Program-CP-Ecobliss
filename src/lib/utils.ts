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

/** Format ringkas dd/MM/yy — cocok untuk kolom sempit (mis. BTB Sumber). */
export function formatDateShort(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
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

/** Format ringkas 3 tingkatan UOM, contoh: `LBR (1) · BOX (50) · SET (20)`. */
export function formatUomTingkat(row: {
  uom1?: string;
  konversi1?: number;
  uom2?: string;
  konversi2?: number;
  uom3?: string;
  konversi3?: number;
}) {
  const parts: string[] = [];
  if (row.uom1) parts.push(`${row.uom1} (${row.konversi1 ?? 0})`);
  if (row.uom2) parts.push(`${row.uom2} (${row.konversi2 ?? 0})`);
  if (row.uom3) parts.push(`${row.uom3} (${row.konversi3 ?? 0})`);
  return parts.length ? parts.join(" · ") : "-";
}

type LegacyUomFields = {
  uom?: string;
  konversi?: number;
  uom1?: string;
  konversi1?: number;
  uom2?: string;
  konversi2?: number;
  uom3?: string;
  konversi3?: number;
};

/** Normalisasi data lama (uom/konversi tunggal) ke 3 tingkatan UOM. */
export function migrateUomFields<T extends LegacyUomFields>(row: T): T {
  const hasNew = row.uom1 !== undefined || row.konversi1 !== undefined;
  if (hasNew) {
    return {
      ...row,
      uom1: row.uom1 ?? row.uom ?? "PCS",
      konversi1: row.konversi1 ?? row.konversi ?? 1,
      uom2: row.uom2 ?? "",
      konversi2: row.konversi2 ?? 0,
      uom3: row.uom3 ?? "",
      konversi3: row.konversi3 ?? 0,
    };
  }
  return {
    ...row,
    uom1: row.uom ?? "PCS",
    konversi1: row.konversi ?? 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
  };
}

export { STATUS_LABELS };
