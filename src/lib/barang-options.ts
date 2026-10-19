/** Opsi pencarian barang gabungan Material + Finish Good. */

export type BarangJenis = "item" | "fg";

export type BarangOption = {
  value: string;
  label: string;
  kode: string;
  nama: string;
  jenis: BarangJenis;
};

type MasterRow = {
  id: string;
  kode: string;
  nama: string;
  status?: string | null;
};

/** Aktif kecuali status eksplisit nonaktif (status kosong/null dianggap aktif). */
export function isMasterAktif(status?: string | null) {
  return (status ?? "aktif").trim().toLowerCase() !== "nonaktif";
}

export function barangKey(jenis: BarangJenis, refId: string) {
  return `${jenis}:${refId}`;
}

/**
 * Material dulu, lalu Finish Good, supaya daftar panjang FG tidak menimbun Material
 * di luar batas tampilan dropdown.
 */
export function compareBarangOption(
  a: Pick<BarangOption, "jenis" | "label">,
  b: Pick<BarangOption, "jenis" | "label">,
) {
  if (a.jenis !== b.jenis) {
    if (a.jenis === "item") return -1;
    if (b.jenis === "item") return 1;
  }
  return a.label.localeCompare(b.label, "id");
}

/**
 * Gabungkan master Material dan Finish Good untuk dropdown pencarian.
 * Setiap baris punya `jenis` akurat (`item` | `fg`) untuk badge/kode.
 */
export function buildBarangOptions(
  items: MasterRow[],
  finishGoods: MasterRow[],
): BarangOption[] {
  const rows: BarangOption[] = [
    ...items
      .filter((item) => isMasterAktif(item.status))
      .map((item) => ({
        value: barangKey("item", item.id),
        label: `${item.kode} - ${item.nama}`,
        kode: item.kode,
        nama: item.nama,
        jenis: "item" as const,
      })),
    ...finishGoods
      .filter((fg) => isMasterAktif(fg.status))
      .map((fg) => ({
        value: barangKey("fg", fg.id),
        label: `${fg.kode} - ${fg.nama}`,
        kode: fg.kode,
        nama: fg.nama,
        jenis: "fg" as const,
      })),
  ];
  return rows.sort(compareBarangOption);
}

export function filterBarangByKodeNama(
  item: Pick<BarangOption, "kode" | "nama" | "label">,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.kode.toLowerCase().includes(q) ||
    item.nama.toLowerCase().includes(q) ||
    item.label.toLowerCase().includes(q)
  );
}
