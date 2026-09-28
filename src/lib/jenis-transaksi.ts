import type { JenisTransaksi } from "@/lib/types";

/**
 * Opsi dropdown Jenis Transaksi — dipakai form BTB / BKB.
 * `value` (= id) disimpan ke state sebagai `jenisTransaksiId`.
 */

export const JENIS_TRANSAKSI_BTB = [
  { value: "btb-titipan-customer", label: "Titipan Customer", kode: "TTC" },
  { value: "btb-retur-produksi", label: "Retur dari Produksi", kode: "RDP" },
  { value: "btb-retur-customer", label: "Retur dari Customer", kode: "RDC" },
  { value: "btb-hasil-produksi", label: "Hasil Produksi", kode: "HSP" },
  { value: "btb-lainnya", label: "Lainnya", kode: "LNN" },
] as const;

export const JENIS_TRANSAKSI_BKB = [
  { value: "bkb-keluar-produksi", label: "Keluar Produksi", kode: "KPR" },
  { value: "bkb-keluar-packing", label: "Keluar Packing", kode: "KPK" },
  { value: "bkb-keluar-customer", label: "Keluar Customer", kode: "KCS" },
  { value: "bkb-retur-customer", label: "Retur Customer", kode: "RTC" },
  { value: "bkb-reject", label: "Reject", kode: "RJC" },
  { value: "bkb-sample", label: "Sample", kode: "SMP" },
  { value: "bkb-lainnya", label: "Lainnya", kode: "LNN" },
] as const;

export type JenisTransaksiBtbValue =
  (typeof JENIS_TRANSAKSI_BTB)[number]["value"];
export type JenisTransaksiBkbValue =
  (typeof JENIS_TRANSAKSI_BKB)[number]["value"];

/** Master list untuk seed store / Setting (sinkron dengan opsi form). */
export const jenisTransaksiMaster: JenisTransaksi[] = [
  ...JENIS_TRANSAKSI_BTB.map((o) => ({
    id: o.value,
    kode: o.kode,
    nama: o.label,
    untuk: "btb" as const,
  })),
  ...JENIS_TRANSAKSI_BKB.map((o) => ({
    id: o.value,
    kode: o.kode,
    nama: o.label,
    untuk: "bkb" as const,
  })),
];

/** Map id lama → id baru (migrasi data persist). */
export const JENIS_TRANSAKSI_ID_MAP: Record<string, string> = {
  jt1: "btb-titipan-customer",
  jt2: "btb-retur-customer",
  jt6: "btb-retur-produksi",
  jt7: "btb-lainnya",
  jt3: "bkb-keluar-produksi",
  jt4: "bkb-keluar-customer",
  jt8: "bkb-reject",
  jt9: "bkb-sample",
  jt5: "bkb-lainnya",
  jt10: "bkb-lainnya",
  jt11: "bkb-lainnya",
  jt12: "bkb-lainnya",
};

export function resolveJenisTransaksiId(id: string | undefined | null): string {
  if (!id) return "";
  return JENIS_TRANSAKSI_ID_MAP[id] ?? id;
}
