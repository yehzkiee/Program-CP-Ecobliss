export type Role = "admin" | "user";

export type StatusAktif = "aktif" | "nonaktif";

export interface User {
  id: string;
  username: string;
  nama: string;
  role: Role;
  password: string;
}

export interface Customer {
  id: string;
  kode: string;
  nama: string;
}

export interface MaterialItem {
  id: string;
  kode: string;
  nama: string;
  customerId: string;
  kategori: string;
  /** Satuan dasar (tingkat 1). */
  uom1: string;
  konversi1: number;
  /** Satuan tingkat 2 (opsional). */
  uom2: string;
  konversi2: number;
  /** Satuan tingkat 3 (opsional). */
  uom3: string;
  konversi3: number;
  batchCustomer: string;
  status: StatusAktif;
}

/** Turunan penerimaan material per batch (dari BTB / mock). */
export interface MaterialBatch {
  id: string;
  itemId: string;
  batchCustomer: string;
  qtyMasuk: number;
  qtySisa: number;
  satuan: string;
  tanggalMasuk: string;
  sumberBtbId: string;
  sumberBtbNo: string;
  gudangId: string;
  keterangan: string;
}

export interface FinishGood {
  id: string;
  kode: string;
  nama: string;
  customerId: string;
  kategori: string;
  batchCustomer: string;
  /** Satuan dasar (tingkat 1). */
  uom1: string;
  konversi1: number;
  /** Satuan tingkat 2 (opsional). */
  uom2: string;
  konversi2: number;
  /** Satuan tingkat 3 (opsional). */
  uom3: string;
  konversi3: number;
  status: StatusAktif;
}

export interface Gudang {
  id: string;
  kode: string;
  nama: string;
  tipe: "item" | "fg" | "wip" | "reject" | "lainnya";
}

export interface JenisTransaksi {
  id: string;
  kode: string;
  nama: string;
  untuk: "btb" | "bkb" | "keduanya";
}

export interface BomLineItem {
  itemId: string;
  qty: number;
  /** Satuan utama (`uom1`) material yang dipilih. */
  uom?: string;
}

export interface BomLineFg {
  fgId: string;
  qty: number;
  /** Satuan utama (`uom1`) finish good yang dipilih. */
  uom?: string;
}

export interface BomRevision {
  revisi: number;
  tanggal: string;
  bagianDirevisi: string;
  keterangan: string;
  detailPerubahan?: string[];
  items: BomLineItem[];
  fgs: BomLineFg[];
}

export interface Bom {
  id: string;
  kode: string;
  /** Customer pemilik BOM (master customer). */
  customerId?: string;
  fgId: string;
  keterangan: string;
  revisions: BomRevision[];
}

export interface BtbLineItem {
  itemId: string;
  batchCustomer: string;
  qty: number;
  satuan: string;
  gudangId: string;
  keterangan: string;
  qtySisa: number;
}

export interface BtbLineFg {
  fgId: string;
  batchCustomer: string;
  qty: number;
  satuan: string;
  gudangId: string;
  keterangan: string;
  qtySisa: number;
}

export interface Btb {
  id: string;
  no: string;
  tanggalTerima: string;
  jenisTransaksiId: string;
  /** Customer pemilik barang (pengganti konsep Supplier). */
  customerId?: string;
  noPo?: string;
  noSpk?: string;
  /** Nama batch untuk seluruh barang yang masuk pada BTB ini. */
  batch?: string;
  /** Catatan dokumen, terpisah dari keterangan per baris. */
  keterangan?: string;
  items: BtbLineItem[];
  fgs: BtbLineFg[];
  /** Foto bukti fisik penerimaan (data URL / path). */
  fotoBukti?: string[];
  createdAt: string;
}

export interface BkbLineItem {
  itemId: string;
  btbId: string;
  btbNo: string;
  btbTanggalTerima: string;
  batchCustomer: string;
  qty: number;
  satuan: string;
  gudangId: string;
  keterangan: string;
}

export interface BkbLineFg {
  fgId: string;
  btbId: string;
  btbNo: string;
  btbTanggalTerima: string;
  batchCustomer: string;
  qty: number;
  satuan: string;
  gudangId: string;
  keterangan: string;
}

export interface Bkb {
  id: string;
  no: string;
  tanggalKeluar: string;
  jenisTransaksiId: string;
  noPo?: string;
  noSpk: string;
  /** Catatan dokumen, terpisah dari keterangan per baris. */
  keterangan?: string;
  bomId?: string;
  bomMultiplier?: number;
  items: BkbLineItem[];
  fgs: BkbLineFg[];
  /** Foto bukti fisik pengeluaran (data URL / path). */
  fotoBukti?: string[];
  createdAt: string;
}

export interface StockOpnameLine {
  jenis: "item" | "fg";
  refId: string;
  kode: string;
  nama: string;
  customerId: string;
  gudangId: string;
  batchCustomer?: string;
  /** BTB sumber yang sedang dihitung. Kosong hanya pada dokumen lama. */
  btbId?: string;
  btbNo?: string;
  qtySistem: number;
  qtyAktual: number;
  selisih: number;
}

export type OpnameMetode = "per_batch" | "per_item" | "per_gudang";

export interface StockOpname {
  id: string;
  no: string;
  tanggal: string;
  lines: StockOpnameLine[];
  keterangan: string;
  metode?: OpnameMetode;
  createdAt: string;
}

export type AdjustmentStatus =
  | "draft"
  | "menunggu_approval"
  | "disetujui"
  | "ditolak";

export interface AdjustmentLine {
  jenis: "item" | "fg";
  refId: string;
  kode: string;
  nama: string;
  qty: number;
  out: number;
  in: number;
  keterangan: string;
  /** Lot BTB yang dikoreksi. Kosong hanya pada dokumen lama. */
  btbId?: string;
  btbNo?: string;
  batchCustomer?: string;
  gudangId?: string;
}

export interface Adjustment {
  id: string;
  no: string;
  tanggal: string;
  stockOpnameId: string;
  stockOpnameNo: string;
  lines: AdjustmentLine[];
  status: AdjustmentStatus;
  keterangan: string;
  approvedBy?: string;
  /** Foto bukti alasan adjustment. */
  fotoBukti?: string[];
  createdAt: string;
}

export interface TransferLine {
  jenis: "item" | "fg";
  refId: string;
  kode: string;
  nama: string;
  qty: number;
  dariGudangId: string;
  keGudangId: string;
  keterangan: string;
  /** Lot BTB yang dipindah dari gudang asal. Kosong hanya pada dokumen lama. */
  btbId?: string;
  btbNo?: string;
  batchCustomer?: string;
}

export interface TransferGudang {
  id: string;
  no: string;
  tanggal: string;
  lines: TransferLine[];
  keterangan: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  waktu: string;
  userId: string;
  userNama: string;
  aksi: string;
  detail: string;
  /** Nomor dokumen transaksi, terpisah dari teks detail. */
  noTransaksi?: string;
}

export interface StockRow {
  jenis: "item" | "fg";
  refId: string;
  kode: string;
  nama: string;
  customerId: string;
  customerNama: string;
  gudangId: string;
  gudangNama: string;
  batchCustomer: string;
  qty: number;
}
