import type {
  ActivityLog,
  Adjustment,
  Bkb,
  Bom,
  Btb,
  Customer,
  FinishGood,
  Gudang,
  JenisTransaksi,
  MaterialItem,
  StockOpname,
  StockRow,
  TransferGudang,
  User,
} from "@/lib/types";

export const users: User[] = [
  {
    id: "u1",
    username: "admin",
    nama: "Admin Ecobliss",
    role: "admin",
    password: "admin123",
  },
  {
    id: "u2",
    username: "andry",
    nama: "Bapak Andry",
    role: "user",
    password: "andry123",
  },
  {
    id: "u3",
    username: "gudang1",
    nama: "Petugas Gudang",
    role: "user",
    password: "gudang123",
  },
];

export const customers: Customer[] = [
  { id: "c1", kode: "CUST-001", nama: "PT Sinar Abadi" },
  { id: "c2", kode: "CUST-002", nama: "CV Mitra Pack" },
  { id: "c3", kode: "CUST-003", nama: "PT Eco Retail" },
];

export const gudangList: Gudang[] = [
  { id: "g1", kode: "GD-ITEM", nama: "Gudang Item", tipe: "item" },
  { id: "g2", kode: "GD-FG", nama: "Gudang FG", tipe: "fg" },
  { id: "g3", kode: "GD-WIP", nama: "Gudang WIP", tipe: "wip" },
  { id: "g4", kode: "GD-REJ", nama: "Gudang Reject", tipe: "reject" },
];

export const jenisTransaksiList: JenisTransaksi[] = [
  { id: "jt1", kode: "TRM", nama: "Terima dari Supplier", untuk: "btb" },
  { id: "jt2", kode: "RET", nama: "Retur Customer", untuk: "btb" },
  { id: "jt3", kode: "PRD", nama: "Pengeluaran Produksi", untuk: "bkb" },
  { id: "jt4", kode: "KIR", nama: "Kirim ke Customer", untuk: "bkb" },
  { id: "jt5", kode: "MUT", nama: "Mutasi Umum", untuk: "keduanya" },
];

export const items: MaterialItem[] = [
  {
    id: "i1",
    kode: "MAT-001",
    nama: "Karton Duplex 300gsm",
    customerId: "c1",
    kategori: "Bahan Baku",
    uom: "LBR",
    konversi: 1,
    batchCustomer: "BC-SA-01",
    status: "aktif",
  },
  {
    id: "i2",
    kode: "MAT-002",
    nama: "Ink Cyan Industrial",
    customerId: "c1",
    kategori: "Bahan Baku",
    uom: "KG",
    konversi: 1,
    batchCustomer: "BC-SA-02",
    status: "aktif",
  },
  {
    id: "i3",
    kode: "MAT-003",
    nama: "Lem Hotmelt",
    customerId: "c2",
    kategori: "Bahan Baku",
    uom: "KG",
    konversi: 1,
    batchCustomer: "BC-MP-01",
    status: "aktif",
  },
  {
    id: "i4",
    kode: "MAT-004",
    nama: "Film Laminasi PET",
    customerId: "c3",
    kategori: "Bahan Baku",
    uom: "M",
    konversi: 1,
    batchCustomer: "BC-ER-01",
    status: "nonaktif",
  },
];

export const finishGoods: FinishGood[] = [
  {
    id: "f1",
    kode: "FG-001",
    nama: "Box Premium 20x15",
    customerId: "c1",
    kategori: "Finish Good",
    batchCustomer: "BC-SA-FG01",
    uom: "PCS",
    konversi: 1,
    status: "aktif",
  },
  {
    id: "f2",
    kode: "FG-002",
    nama: "Sleeve Display Pack",
    customerId: "c2",
    kategori: "Finish Good",
    batchCustomer: "BC-MP-FG01",
    uom: "PCS",
    konversi: 1,
    status: "aktif",
  },
  {
    id: "f3",
    kode: "FG-003",
    nama: "Tray Eco Series",
    customerId: "c3",
    kategori: "Finish Good",
    batchCustomer: "BC-ER-FG01",
    uom: "PCS",
    konversi: 1,
    status: "aktif",
  },
];

export const boms: Bom[] = [
  {
    id: "b1",
    kode: "BOM-001",
    fgId: "f1",
    keterangan: "Komposisi Box Premium 20x15",
    revisions: [
      {
        revisi: 1,
        tanggal: "2026-08-01",
        bagianDirevisi: "Inisial",
        keterangan: "Pembuatan awal",
        items: [
          { itemId: "i1", qty: 2 },
          { itemId: "i2", qty: 0.05 },
        ],
        fgs: [],
      },
      {
        revisi: 2,
        tanggal: "2026-09-05",
        bagianDirevisi: "Qty Lem & Ink",
        keterangan: "Penyesuaian konsumsi tinta",
        items: [
          { itemId: "i1", qty: 2 },
          { itemId: "i2", qty: 0.08 },
          { itemId: "i3", qty: 0.02 },
        ],
        fgs: [],
      },
    ],
  },
  {
    id: "b2",
    kode: "BOM-002",
    fgId: "f2",
    keterangan: "Komposisi Sleeve Display",
    revisions: [
      {
        revisi: 1,
        tanggal: "2026-09-01",
        bagianDirevisi: "Inisial",
        keterangan: "Pembuatan awal",
        items: [
          { itemId: "i1", qty: 1 },
          { itemId: "i3", qty: 0.01 },
        ],
        fgs: [{ fgId: "f3", qty: 0.5 }],
      },
    ],
  },
];

export const btbs: Btb[] = [
  {
    id: "btb1",
    no: "260910-00001",
    tanggalTerima: "2026-09-10",
    jenisTransaksiId: "jt1",
    createdAt: "2026-09-10T08:00:00",
    items: [
      {
        itemId: "i1",
        batchCustomer: "BC-SA-01",
        qty: 1000,
        satuan: "LBR",
        gudangId: "g1",
        keterangan: "Penerimaan awal",
        qtySisa: 900,
      },
      {
        itemId: "i2",
        batchCustomer: "BC-SA-02",
        qty: 50,
        satuan: "KG",
        gudangId: "g1",
        keterangan: "",
        qtySisa: 50,
      },
    ],
    fgs: [
      {
        fgId: "f1",
        batchCustomer: "BC-SA-FG01",
        qty: 200,
        satuan: "PCS",
        gudangId: "g2",
        keterangan: "FG dari produksi",
        qtySisa: 200,
      },
    ],
  },
  {
    id: "btb2",
    no: "260911-00002",
    tanggalTerima: "2026-09-11",
    jenisTransaksiId: "jt1",
    createdAt: "2026-09-11T09:30:00",
    items: [
      {
        itemId: "i1",
        batchCustomer: "BC-SA-01",
        qty: 500,
        satuan: "LBR",
        gudangId: "g1",
        keterangan: "Tambahan stok",
        qtySisa: 500,
      },
      {
        itemId: "i3",
        batchCustomer: "BC-MP-01",
        qty: 30,
        satuan: "KG",
        gudangId: "g1",
        keterangan: "",
        qtySisa: 30,
      },
    ],
    fgs: [
      {
        fgId: "f2",
        batchCustomer: "BC-MP-FG01",
        qty: 150,
        satuan: "PCS",
        gudangId: "g2",
        keterangan: "",
        qtySisa: 150,
      },
    ],
  },
];

export const bkbs: Bkb[] = [
  {
    id: "bkb1",
    no: "260912-00001",
    tanggalKeluar: "2026-09-12",
    jenisTransaksiId: "jt3",
    noSpk: "SPK-2026-001",
    bomId: "b1",
    bomMultiplier: 10,
    createdAt: "2026-09-12T10:00:00",
    items: [
      {
        itemId: "i1",
        btbId: "btb1",
        btbNo: "260910-00001",
        btbTanggalTerima: "2026-09-10",
        batchCustomer: "BC-SA-01",
        qty: 20,
        satuan: "LBR",
        gudangId: "g1",
        keterangan: "Dari BOM x10",
      },
    ],
    fgs: [],
  },
];

export const stockOpnames: StockOpname[] = [
  {
    id: "so1",
    no: "260913-00001",
    tanggal: "2026-09-13",
    keterangan: "Opname bulanan Gudang Item",
    createdAt: "2026-09-13T07:00:00",
    lines: [
      {
        jenis: "item",
        refId: "i1",
        kode: "MAT-001",
        nama: "Karton Duplex 300gsm",
        customerId: "c1",
        gudangId: "g1",
        qtySistem: 1380,
        qtyAktual: 1370,
        selisih: -10,
      },
    ],
  },
];

export const adjustments: Adjustment[] = [
  {
    id: "adj1",
    no: "260913-00002",
    tanggal: "2026-09-13",
    stockOpnameId: "so1",
    stockOpnameNo: "260913-00001",
    status: "menunggu_approval",
    keterangan: "Koreksi selisih opname",
    createdAt: "2026-09-13T08:00:00",
    lines: [
      {
        jenis: "item",
        refId: "i1",
        kode: "MAT-001",
        nama: "Karton Duplex 300gsm",
        qty: 10,
        out: 10,
        in: 0,
        keterangan: "Selisih fisik",
      },
    ],
  },
];

export const transfers: TransferGudang[] = [
  {
    id: "tf1",
    no: "260912-00003",
    tanggal: "2026-09-12",
    keterangan: "Pindah FG ke WIP",
    createdAt: "2026-09-12T14:00:00",
    lines: [
      {
        jenis: "fg",
        refId: "f1",
        kode: "FG-001",
        nama: "Box Premium 20x15",
        qty: 20,
        dariGudangId: "g2",
        keGudangId: "g3",
        keterangan: "",
      },
    ],
  },
];

export const activityLogs: ActivityLog[] = [
  {
    id: "log1",
    waktu: "2026-09-13T08:05:00",
    userId: "u2",
    userNama: "Bapak Andry",
    aksi: "Buat Adjustment",
    detail: "No 260913-00002 menunggu approval",
  },
  {
    id: "log2",
    waktu: "2026-09-12T10:05:00",
    userId: "u3",
    userNama: "Petugas Gudang",
    aksi: "Buat BKB",
    detail: "No 260912-00001",
  },
  {
    id: "log3",
    waktu: "2026-09-10T08:10:00",
    userId: "u3",
    userNama: "Petugas Gudang",
    aksi: "Buat BTB",
    detail: "No 260910-00001",
  },
];

export function buildStockRows(input?: {
  customers?: Customer[];
  gudangList?: Gudang[];
  items?: MaterialItem[];
  finishGoods?: FinishGood[];
  btbs?: Btb[];
}): StockRow[] {
  const custs = input?.customers ?? customers;
  const gudangs = input?.gudangList ?? gudangList;
  const mats = input?.items ?? items;
  const fgs = input?.finishGoods ?? finishGoods;
  const docs = input?.btbs ?? btbs;

  const rows: StockRow[] = [];
  const custMap = Object.fromEntries(custs.map((c) => [c.id, c]));
  const gudangMap = Object.fromEntries(gudangs.map((g) => [g.id, g]));
  const itemMap = Object.fromEntries(mats.map((i) => [i.id, i]));
  const fgMap = Object.fromEntries(fgs.map((f) => [f.id, f]));

  for (const btb of docs) {
    for (const line of btb.items) {
      if (line.qtySisa <= 0) continue;
      const item = itemMap[line.itemId];
      if (!item) continue;
      rows.push({
        jenis: "item",
        refId: item.id,
        kode: item.kode,
        nama: item.nama,
        customerId: item.customerId,
        customerNama: custMap[item.customerId]?.nama ?? "-",
        gudangId: line.gudangId,
        gudangNama: gudangMap[line.gudangId]?.nama ?? "-",
        batchCustomer: line.batchCustomer,
        qty: line.qtySisa,
      });
    }
    for (const line of btb.fgs) {
      if (line.qtySisa <= 0) continue;
      const fg = fgMap[line.fgId];
      if (!fg) continue;
      rows.push({
        jenis: "fg",
        refId: fg.id,
        kode: fg.kode,
        nama: fg.nama,
        customerId: fg.customerId,
        customerNama: custMap[fg.customerId]?.nama ?? "-",
        gudangId: line.gudangId,
        gudangNama: gudangMap[line.gudangId]?.nama ?? "-",
        batchCustomer: line.batchCustomer,
        qty: line.qtySisa,
      });
    }
  }
  return rows;
}

export function formatDocNo(dateStr: string, seq: number): string {
  const d = dateStr.replace(/-/g, "").slice(2);
  const n = seq % 100000;
  return `${d}-${String(n).padStart(5, "0")}`;
}

export function getLatestBomRevision(bom: Bom) {
  return [...bom.revisions].sort((a, b) => b.revisi - a.revisi)[0];
}
