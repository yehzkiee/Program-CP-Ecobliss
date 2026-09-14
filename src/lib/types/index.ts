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
  uom: string;
  konversi: number;
  batchCustomer: string;
  status: StatusAktif;
}

export interface FinishGood {
  id: string;
  kode: string;
  nama: string;
  customerId: string;
  kategori: string;
  batchCustomer: string;
  uom: string;
  konversi: number;
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
}

export interface BomLineFg {
  fgId: string;
  qty: number;
}

export interface BomRevision {
  revisi: number;
  tanggal: string;
  bagianDirevisi: string;
  keterangan: string;
  items: BomLineItem[];
  fgs: BomLineFg[];
}

export interface Bom {
  id: string;
  kode: string;
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
  items: BtbLineItem[];
  fgs: BtbLineFg[];
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
  noSpk: string;
  bomId?: string;
  bomMultiplier?: number;
  items: BkbLineItem[];
  fgs: BkbLineFg[];
  createdAt: string;
}

export interface StockOpnameLine {
  jenis: "item" | "fg";
  refId: string;
  kode: string;
  nama: string;
  customerId: string;
  gudangId: string;
  qtySistem: number;
  qtyAktual: number;
  selisih: number;
}

export interface StockOpname {
  id: string;
  no: string;
  tanggal: string;
  lines: StockOpnameLine[];
  keterangan: string;
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
