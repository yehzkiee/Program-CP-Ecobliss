import { resolveJenisTransaksiId } from "@/lib/jenis-transaksi";
import type {
  ActivityLog,
  Adjustment,
  Bkb,
  Bom,
  Btb,
  Customer,
  FinishGood,
  Gudang,
  MaterialBatch,
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
  { id: "g1", kode: "GD-ITEM", nama: "Gudang Material", tipe: "item" },
  { id: "g2", kode: "GD-FG", nama: "Gudang FG", tipe: "fg" },
  { id: "g3", kode: "GD-WIP", nama: "Gudang WIP", tipe: "wip" },
  { id: "g4", kode: "GD-REJ", nama: "Gudang Reject", tipe: "reject" },
];

/**
 * Master Jenis Transaksi (dropdown BTB / BKB).
 * Sumber opsi: `src/lib/jenis-transaksi.ts` (JENIS_TRANSAKSI_BTB / JENIS_TRANSAKSI_BKB).
 * Bisa juga dikelola lewat Setting → tab "Jenis Transaksi".
 */
export { jenisTransaksiMaster as jenisTransaksiList } from "@/lib/jenis-transaksi";

export const items: MaterialItem[] = [
  {
    id: "i1",
    kode: "MAT-001",
    nama: "Karton Duplex 300gsm",
    customerId: "c1",
    kategori: "Bahan Baku",
    uom1: "LBR",
    konversi1: 1,
    uom2: "BOX",
    konversi2: 50,
    uom3: "SET",
    konversi3: 20,
    batchCustomer: "BC-SA-01",
    status: "aktif",
  },
  {
    id: "i2",
    kode: "MAT-002",
    nama: "Ink Cyan Industrial",
    customerId: "c1",
    kategori: "Bahan Baku",
    uom1: "KG",
    konversi1: 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
    batchCustomer: "BC-SA-02",
    status: "aktif",
  },
  {
    id: "i3",
    kode: "MAT-003",
    nama: "Lem Hotmelt",
    customerId: "c2",
    kategori: "Bahan Baku",
    uom1: "KG",
    konversi1: 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
    batchCustomer: "BC-MP-01",
    status: "aktif",
  },
  {
    id: "i4",
    kode: "MAT-004",
    nama: "Film Laminasi PET",
    customerId: "c3",
    kategori: "Bahan Baku",
    uom1: "M",
    konversi1: 1,
    uom2: "ROLL",
    konversi2: 100,
    uom3: "",
    konversi3: 0,
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
    uom1: "PCS",
    konversi1: 1,
    uom2: "BOX",
    konversi2: 12,
    uom3: "PACK",
    konversi3: 10,
    status: "aktif",
  },
  {
    id: "f2",
    kode: "FG-002",
    nama: "Sleeve Display Pack",
    customerId: "c2",
    kategori: "Finish Good",
    batchCustomer: "BC-MP-FG01",
    uom1: "PCS",
    konversi1: 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
    status: "aktif",
  },
  {
    id: "f3",
    kode: "FG-003",
    nama: "Tray Eco Series",
    customerId: "c3",
    kategori: "Finish Good",
    batchCustomer: "BC-ER-FG01",
    uom1: "PCS",
    konversi1: 1,
    uom2: "SET",
    konversi2: 6,
    uom3: "",
    konversi3: 0,
    status: "aktif",
  },
];

export const boms: Bom[] = [
  {
    id: "b1",
    kode: "BOM-001",
    customerId: "c1",
    fgId: "f1",
    keterangan: "Komposisi Box Premium 20x15",
    revisions: [
      {
        revisi: 1,
        tanggal: "2026-08-01",
        bagianDirevisi: "Inisial",
        keterangan: "Pembuatan awal",
        detailPerubahan: ["Before: -", "After: Pembuatan awal"],
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
        detailPerubahan: [
          "Before: Material MAT-002 Qty 0.05",
          "After: Material MAT-002 Qty 0.08",
          "Before: -",
          "After: Material MAT-003 Qty 0.02",
        ],
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
    customerId: "c2",
    fgId: "f2",
    keterangan: "Komposisi Sleeve Display",
    revisions: [
      {
        revisi: 1,
        tanggal: "2026-09-01",
        bagianDirevisi: "Inisial",
        keterangan: "Pembuatan awal",
        detailPerubahan: ["Before: -", "After: Pembuatan awal"],
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
    no: "BTB-260910-00001",
    tanggalTerima: "2026-09-10",
    jenisTransaksiId: "btb-titipan-customer",
    customerId: "c1",
    createdAt: "2026-09-10T08:00:00",
    items: [
      {
        itemId: "i1",
        batchCustomer: "BC-SA-01",
        qty: 1000,
        satuan: "LBR",
        gudangId: "g1",
        keterangan: "Penerimaan awal",
        qtySisa: 980,
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
    no: "BTB-260911-00002",
    tanggalTerima: "2026-09-11",
    jenisTransaksiId: "btb-titipan-customer",
    customerId: "c2",
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
    no: "BKB-260912-00001",
    tanggalKeluar: "2026-09-12",
    jenisTransaksiId: "bkb-keluar-produksi",
    noSpk: "SPK-2026-001",
    bomId: "b1",
    bomMultiplier: 10,
    createdAt: "2026-09-12T10:00:00",
    items: [
      {
        itemId: "i1",
        btbId: "btb1",
        btbNo: "BTB-260910-00001",
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
    no: "SO-260913-00001",
    tanggal: "2026-09-13",
    keterangan: "Opname bulanan Gudang Material",
    metode: "per_item",
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
    no: "ADJ-260913-00002",
    tanggal: "2026-09-13",
    stockOpnameId: "so1",
    stockOpnameNo: "SO-260913-00001",
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
    no: "TG-260912-00003",
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
  {
    id: "tf-karton",
    no: "TG-260912-00004",
    tanggal: "2026-09-12",
    keterangan: "Pindah Karton dari Gudang Material ke Gudang FG",
    createdAt: "2026-09-12T15:00:00",
    lines: [
      {
        jenis: "item",
        refId: "i1",
        kode: "MAT-001",
        nama: "Karton Duplex 300gsm",
        qty: 250,
        dariGudangId: "g1",
        keGudangId: "g2",
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
    noTransaksi: "ADJ-260913-00002",
    detail: "menunggu approval",
  },
  {
    id: "log2",
    waktu: "2026-09-12T10:05:00",
    userId: "u3",
    userNama: "Petugas Gudang",
    aksi: "Buat BKB",
    noTransaksi: "BKB-260912-00001",
    detail: "",
  },
  {
    id: "log3",
    waktu: "2026-09-10T08:10:00",
    userId: "u3",
    userNama: "Petugas Gudang",
    aksi: "Buat BTB",
    noTransaksi: "BTB-260910-00001",
    detail: "",
  },
];

type StockLot = StockRow & { tanggal: string };

/** Baris BTB yang lahir dari transfer, bukan penerimaan baru. */
export function isTransferGeneratedBtbLine(keterangan?: string | null) {
  const note = (keterangan ?? "").trim().toLowerCase();
  return note === "hasil transfer gudang" || note === "stok karton di gudang fg";
}

/** BTB hanya menyimpan penerimaan. Baris hasil transfer dibuang dari dokumen. */
export function withoutTransferBtbLines<T extends Btb>(doc: T): T {
  return {
    ...doc,
    items: (doc.items ?? []).filter(
      (line) => !isTransferGeneratedBtbLine(line.keterangan),
    ),
    fgs: (doc.fgs ?? []).filter(
      (line) => !isTransferGeneratedBtbLine(line.keterangan),
    ),
  };
}

function takeFromLots(
  lots: StockLot[],
  match: (lot: StockLot) => boolean,
  qty: number,
) {
  const ordered = lots
    .filter((lot) => match(lot) && lot.qty > 0)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.batchCustomer.localeCompare(b.batchCustomer));
  const taken: { lot: StockLot; qty: number }[] = [];
  let remaining = qty;
  for (const lot of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(lot.qty, remaining);
    lot.qty -= take;
    remaining -= take;
    taken.push({ lot, qty: take });
  }
  return taken;
}

function addLotQty(lots: StockLot[], incoming: StockLot) {
  const dest = lots.find(
    (lot) =>
      lot.jenis === incoming.jenis &&
      lot.refId === incoming.refId &&
      lot.gudangId === incoming.gudangId &&
      lot.batchCustomer === incoming.batchCustomer,
  );
  if (dest) {
    dest.qty += incoming.qty;
    return;
  }
  lots.push(incoming);
}

/** Adjustment mengubah stok hanya setelah status Disetujui. Menunggu Approval / Pending diabaikan. */
export function isApprovedAdjustment(status?: string | null) {
  return status === "disetujui";
}

/**
 * Stok gudang = BTB masuk − BKB keluar + transfer + adjustment yang sudah disetujui.
 * Baris BTB yang lahir dari transfer tidak dihitung lagi sebagai penerimaan.
 */
export function buildStockRows(input?: {
  customers?: Customer[];
  gudangList?: Gudang[];
  items?: MaterialItem[];
  finishGoods?: FinishGood[];
  btbs?: Btb[];
  bkbs?: Bkb[];
  transfers?: TransferGudang[];
  adjustments?: Adjustment[];
}): StockRow[] {
  const custs = input?.customers ?? customers;
  const gudangs = input?.gudangList ?? gudangList;
  const mats = input?.items ?? items;
  const fgs = input?.finishGoods ?? finishGoods;
  const docs = input?.btbs ?? btbs;
  const bkbDocs = input?.bkbs ?? bkbs;
  const transferDocs = input?.transfers ?? transfers;
  const adjustmentDocs = input?.adjustments ?? adjustments;

  const custMap = Object.fromEntries(custs.map((c) => [c.id, c]));
  const gudangMap = Object.fromEntries(gudangs.map((g) => [g.id, g]));
  const itemMap = Object.fromEntries(mats.map((i) => [i.id, i]));
  const fgMap = Object.fromEntries(fgs.map((f) => [f.id, f]));

  const lots: StockLot[] = [];

  function pushMasuk(
    jenis: "item" | "fg",
    refId: string,
    kode: string,
    nama: string,
    customerId: string,
    gudangId: string,
    batchCustomer: string,
    qty: number,
    tanggal: string,
  ) {
    if (qty <= 0) return;
    addLotQty(lots, {
      jenis,
      refId,
      kode,
      nama,
      customerId,
      customerNama: custMap[customerId]?.nama ?? "-",
      gudangId,
      gudangNama: gudangMap[gudangId]?.nama ?? "-",
      batchCustomer,
      qty,
      tanggal,
    });
  }

  type StockEvent =
    | { at: string; rank: number; kind: "btb"; doc: Btb }
    | { at: string; rank: number; kind: "bkb"; doc: Bkb }
    | { at: string; rank: number; kind: "transfer"; doc: TransferGudang }
    | { at: string; rank: number; kind: "adjustment"; doc: Adjustment };

  function eventAt(date: string, createdAt?: string) {
    if (createdAt) return createdAt;
    return date ? `${date}T00:00:00` : "";
  }

  const events: StockEvent[] = [
    ...docs.map((doc) => ({
      at: eventAt(doc.tanggalTerima, doc.createdAt),
      rank: 0,
      kind: "btb" as const,
      doc,
    })),
    ...transferDocs.map((doc) => ({
      at: eventAt(doc.tanggal, doc.createdAt),
      rank: 1,
      kind: "transfer" as const,
      doc,
    })),
    ...bkbDocs.map((doc) => ({
      at: eventAt(doc.tanggalKeluar, doc.createdAt),
      rank: 2,
      kind: "bkb" as const,
      doc,
    })),
    ...adjustmentDocs.map((doc) => ({
      at: eventAt(doc.tanggal, doc.createdAt),
      rank: 3,
      kind: "adjustment" as const,
      doc,
    })),
  ];
  events.sort((a, b) => a.at.localeCompare(b.at) || a.rank - b.rank);

  for (const event of events) {
    if (event.kind === "btb") {
      const btb = event.doc;
      for (const line of btb.items ?? []) {
        if (isTransferGeneratedBtbLine(line.keterangan)) continue;
        const item = itemMap[line.itemId];
        if (!item) continue;
        pushMasuk(
          "item",
          item.id,
          item.kode,
          item.nama,
          item.customerId,
          line.gudangId,
          line.batchCustomer,
          line.qty,
          btb.tanggalTerima,
        );
      }
      for (const line of btb.fgs ?? []) {
        if (isTransferGeneratedBtbLine(line.keterangan)) continue;
        const fg = fgMap[line.fgId];
        if (!fg) continue;
        pushMasuk(
          "fg",
          fg.id,
          fg.kode,
          fg.nama,
          fg.customerId,
          line.gudangId,
          line.batchCustomer,
          line.qty,
          btb.tanggalTerima,
        );
      }
      continue;
    }

    if (event.kind === "bkb") {
      const bkb = event.doc;
      for (const line of bkb.items ?? []) {
        takeFromLots(
          lots,
          (lot) =>
            lot.jenis === "item" &&
            lot.refId === line.itemId &&
            lot.gudangId === line.gudangId &&
            lot.batchCustomer === line.batchCustomer,
          line.qty,
        );
      }
      for (const line of bkb.fgs ?? []) {
        takeFromLots(
          lots,
          (lot) =>
            lot.jenis === "fg" &&
            lot.refId === line.fgId &&
            lot.gudangId === line.gudangId &&
            lot.batchCustomer === line.batchCustomer,
          line.qty,
        );
      }
      continue;
    }

    if (event.kind === "adjustment") {
      if (!isApprovedAdjustment(event.doc.status)) continue;
      for (const line of event.doc.lines ?? []) {
        const master =
          line.jenis === "item" ? itemMap[line.refId] : fgMap[line.refId];
        const specific = Boolean(line.gudangId && line.batchCustomer);
        if (line.out > 0) {
          takeFromLots(
            lots,
            (lot) =>
              lot.jenis === line.jenis &&
              lot.refId === line.refId &&
              (!specific ||
                (lot.gudangId === line.gudangId &&
                  lot.batchCustomer === line.batchCustomer)),
            line.out,
          );
        }
        if (line.in > 0) {
          const host = lots.find(
            (lot) =>
              lot.jenis === line.jenis &&
              lot.refId === line.refId &&
              (!specific ||
                (lot.gudangId === line.gudangId &&
                  lot.batchCustomer === line.batchCustomer)),
          );
          pushMasuk(
            line.jenis,
            line.refId,
            master?.kode ?? line.kode,
            master?.nama ?? line.nama,
            host?.customerId || master?.customerId || "",
            specific ? line.gudangId || "" : host?.gudangId || gudangs[0]?.id || "",
            specific ? line.batchCustomer || "" : host?.batchCustomer || "",
            line.in,
            event.doc.tanggal,
          );
        }
      }
      continue;
    }

    for (const line of event.doc.lines ?? []) {
      if (line.qty <= 0 || line.dariGudangId === line.keGudangId) continue;
      const taken = takeFromLots(
        lots,
        (lot) =>
          lot.jenis === line.jenis &&
          lot.refId === line.refId &&
          lot.gudangId === line.dariGudangId &&
          (!line.batchCustomer || lot.batchCustomer === line.batchCustomer),
        line.qty,
      );
      for (const part of taken) {
        addLotQty(lots, {
          ...part.lot,
          gudangId: line.keGudangId,
          gudangNama: gudangMap[line.keGudangId]?.nama ?? "-",
          qty: part.qty,
          tanggal: event.doc.tanggal,
        });
      }
    }
  }

  return lots
    .filter((lot) => lot.qty > 0)
    .map(({ tanggal: _tanggal, ...row }) => row);
}

const TITIPAN_JENIS_ID = "btb-titipan-customer";

/**
 * Sisa barang titipan di satu gudang =
 * BTB titipan masuk − BKB keluar + transfer masuk − transfer keluar.
 * Baris BTB yang lahir dari transfer tidak dihitung lagi sebagai penerimaan.
 * Semua penerimaan dijumlah dulu, baru pengeluaran dan transfer, supaya
 * pindah gudang tetap masuk ke gudang tujuan.
 */
export function buildTitipanRows(input?: {
  customers?: Customer[];
  gudangList?: Gudang[];
  items?: MaterialItem[];
  finishGoods?: FinishGood[];
  btbs?: Btb[];
  bkbs?: Bkb[];
  transfers?: TransferGudang[];
}): StockRow[] {
  const custs = input?.customers ?? customers;
  const gudangs = input?.gudangList ?? gudangList;
  const mats = input?.items ?? items;
  const fgs = input?.finishGoods ?? finishGoods;
  const docs = input?.btbs ?? btbs;
  const bkbDocs = input?.bkbs ?? bkbs;
  const transferDocs = input?.transfers ?? transfers;

  const custMap = Object.fromEntries(custs.map((c) => [c.id, c]));
  const gudangMap = Object.fromEntries(gudangs.map((g) => [g.id, g]));
  const itemMap = Object.fromEntries(mats.map((i) => [i.id, i]));
  const fgMap = Object.fromEntries(fgs.map((f) => [f.id, f]));

  const titipanBtbs = docs.filter(
    (btb) => resolveJenisTransaksiId(btb.jenisTransaksiId) === TITIPAN_JENIS_ID,
  );
  const titipanBtbIds = new Set(titipanBtbs.map((btb) => btb.id));
  const lots: StockLot[] = [];
  const titipanRefs = new Set<string>();

  function pushMasuk(
    jenis: "item" | "fg",
    refId: string,
    kode: string,
    nama: string,
    customerId: string,
    gudangId: string,
    batchCustomer: string,
    qty: number,
    tanggal: string,
  ) {
    if (qty <= 0) return;
    titipanRefs.add(`${jenis}:${refId}`);
    addLotQty(lots, {
      jenis,
      refId,
      kode,
      nama,
      customerId,
      customerNama: custMap[customerId]?.nama ?? "-",
      gudangId,
      gudangNama: gudangMap[gudangId]?.nama ?? "-",
      batchCustomer,
      qty,
      tanggal,
    });
  }

  for (const btb of titipanBtbs) {
    for (const line of btb.items ?? []) {
      if (isTransferGeneratedBtbLine(line.keterangan)) continue;
      const item = itemMap[line.itemId];
      if (!item) continue;
      pushMasuk(
        "item",
        item.id,
        item.kode,
        item.nama,
        btb.customerId || item.customerId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        btb.tanggalTerima,
      );
    }
    for (const line of btb.fgs ?? []) {
      if (isTransferGeneratedBtbLine(line.keterangan)) continue;
      const fg = fgMap[line.fgId];
      if (!fg) continue;
      pushMasuk(
        "fg",
        fg.id,
        fg.kode,
        fg.nama,
        btb.customerId || fg.customerId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        btb.tanggalTerima,
      );
    }
  }

  for (const bkb of bkbDocs) {
    for (const line of bkb.items ?? []) {
      if (line.btbId && !titipanBtbIds.has(line.btbId)) continue;
      takeFromLots(
        lots,
        (lot) =>
          lot.jenis === "item" &&
          lot.refId === line.itemId &&
          lot.gudangId === line.gudangId &&
          lot.batchCustomer === line.batchCustomer,
        line.qty,
      );
    }
    for (const line of bkb.fgs ?? []) {
      if (line.btbId && !titipanBtbIds.has(line.btbId)) continue;
      takeFromLots(
        lots,
        (lot) =>
          lot.jenis === "fg" &&
          lot.refId === line.fgId &&
          lot.gudangId === line.gudangId &&
          lot.batchCustomer === line.batchCustomer,
        line.qty,
      );
    }
  }

  for (const transfer of transferDocs) {
    for (const line of transfer.lines ?? []) {
      if (line.qty <= 0 || line.dariGudangId === line.keGudangId) continue;
      const refKey = `${line.jenis}:${line.refId}`;
      if (!titipanRefs.has(refKey)) continue;

      const taken = takeFromLots(
        lots,
        (lot) =>
          lot.jenis === line.jenis &&
          lot.refId === line.refId &&
          lot.gudangId === line.dariGudangId,
        line.qty,
      );
      let moved = 0;
      for (const part of taken) {
        moved += part.qty;
        addLotQty(lots, {
          ...part.lot,
          gudangId: line.keGudangId,
          gudangNama: gudangMap[line.keGudangId]?.nama ?? "-",
          qty: part.qty,
          tanggal: transfer.tanggal,
        });
      }

      const shortfall = line.qty - moved;
      if (shortfall <= 0) continue;
      const host = lots.find(
        (lot) => lot.jenis === line.jenis && lot.refId === line.refId,
      );
      const master =
        line.jenis === "item" ? itemMap[line.refId] : fgMap[line.refId];
      pushMasuk(
        line.jenis,
        line.refId,
        master?.kode ?? line.kode ?? "",
        master?.nama ?? line.nama ?? "",
        host?.customerId || master?.customerId || "",
        line.keGudangId,
        host?.batchCustomer || "",
        shortfall,
        transfer.tanggal,
      );
    }
  }

  return lots
    .filter((lot) => lot.qty > 0)
    .map(({ tanggal: _tanggal, ...row }) => row);
}

/** Pastikan mutasi Karton Item → FG ada di data yang sudah tersimpan. */
export function ensureKartonTransfer(list: TransferGudang[]): TransferGudang[] {
  const hasKartonMove = list.some((doc) =>
    doc.lines.some(
      (line) =>
        line.jenis === "item" &&
        line.refId === "i1" &&
        line.dariGudangId === "g1" &&
        line.keGudangId === "g2" &&
        line.qty > 0,
    ),
  );
  if (hasKartonMove) return list;
  const seed = transfers.find((doc) => doc.id === "tf-karton");
  return seed ? [...list, seed] : list;
}

export type DocNoPrefix = "BTB" | "BKB" | "SO" | "ADJ" | "TG";

const DOC_NO_PREFIX = /^(BTB|BKB|SO|ADJ|TG)-/i;
const BARE_DOC_NO = /^\d{6}-\d{5}$/;

export function withDocPrefix(
  no: string | undefined | null,
  prefix: DocNoPrefix,
) {
  const value = (no ?? "").trim();
  if (!value) return value;
  if (DOC_NO_PREFIX.test(value)) {
    return value.replace(DOC_NO_PREFIX, (match) => match.toUpperCase());
  }
  if (BARE_DOC_NO.test(value)) return `${prefix}-${value}`;
  return value;
}

export function formatDocNo(
  prefix: DocNoPrefix,
  dateStr: string,
  seq: number,
): string {
  const d = dateStr.replace(/-/g, "").slice(2, 8);
  const n = seq % 100000;
  return `${prefix}-${d}-${String(n).padStart(5, "0")}`;
}

function prefixForAksi(aksi: string): DocNoPrefix | null {
  const label = aksi.toLowerCase();
  if (label.includes("btb")) return "BTB";
  if (label.includes("bkb")) return "BKB";
  if (label.includes("opname")) return "SO";
  if (label.includes("adjustment")) return "ADJ";
  if (label.includes("transfer")) return "TG";
  return null;
}

function normalizeHistoricalAksi(aksi: string) {
  if (aksi.trim() === "Simpan BTB") return "Edit BTB";
  return aksi;
}

function prefixActivityLog(log: ActivityLog): ActivityLog {
  const aksi = normalizeHistoricalAksi(log.aksi ?? "");
  const next = aksi === log.aksi ? log : { ...log, aksi };
  const prefix = prefixForAksi(next.aksi);
  if (!prefix) return next;
  const detailText = next.detail ?? "";
  const embedded =
    detailText.match(/\b((?:BTB|BKB|SO|ADJ|TG)-\d{6}-\d{5})\b/i)?.[1] ??
    detailText.match(/\b(\d{6}-\d{5})\b/)?.[1];
  const noTransaksi = withDocPrefix(
    next.noTransaksi?.trim() || embedded || "",
    prefix,
  );
  const detail = embedded
    ? detailText
        .replace(
          new RegExp(
            `\\bNo\\.?\\s*${embedded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i",
          ),
          "",
        )
        .replace(embedded, "")
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : detailText;
  return { ...next, noTransaksi: noTransaksi || undefined, detail };
}

export function prefixStoredDocNos<
  T extends {
    btbs?: Btb[];
    bkbs?: Bkb[];
    stockOpnames?: StockOpname[];
    adjustments?: Adjustment[];
    transfers?: TransferGudang[];
    activityLogs?: ActivityLog[];
  },
>(state: T): T {
  return {
    ...state,
    btbs: state.btbs?.map((doc) => ({
      ...doc,
      no: withDocPrefix(doc.no, "BTB"),
    })),
    bkbs: state.bkbs?.map((doc) => ({
      ...doc,
      no: withDocPrefix(doc.no, "BKB"),
      items: (doc.items ?? []).map((line) => ({
        ...line,
        btbNo: withDocPrefix(line.btbNo, "BTB"),
      })),
      fgs: (doc.fgs ?? []).map((line) => ({
        ...line,
        btbNo: withDocPrefix(line.btbNo, "BTB"),
      })),
    })),
    stockOpnames: state.stockOpnames?.map((doc) => ({
      ...doc,
      no: withDocPrefix(doc.no, "SO"),
    })),
    adjustments: state.adjustments?.map((doc) => ({
      ...doc,
      no: withDocPrefix(doc.no, "ADJ"),
      stockOpnameNo: doc.stockOpnameNo
        ? withDocPrefix(doc.stockOpnameNo, "SO")
        : doc.stockOpnameNo,
    })),
    transfers: state.transfers?.map((doc) => ({
      ...doc,
      no: withDocPrefix(doc.no, "TG"),
    })),
    activityLogs: state.activityLogs?.map(prefixActivityLog),
  };
}

/** Cari BTB dari id internal atau nomor dokumen (mis. BTB-261013-00003). */
export function findBtbDocument(docs: Btb[], key: string) {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    decoded = key;
  }
  const normalized = decoded.trim();
  if (!normalized) return undefined;
  return (
    docs.find((doc) => doc.id === normalized) ??
    docs.find((doc) => doc.no === normalized)
  );
}

/** Nama batch dokumen. Dokumen lama memakai nama yang sama di setiap baris. */
export function btbBatchName(
  doc: Pick<Btb, "batch" | "items" | "fgs"> | undefined,
) {
  const named = doc?.batch?.trim() ?? "";
  if (named) return named;
  const names = [...(doc?.items ?? []), ...(doc?.fgs ?? [])]
    .map((line) => line.batchCustomer.trim())
    .filter(Boolean);
  if (names.length === 0) return "";
  return names.every((name) => name === names[0]) ? names[0] : "";
}

export function getLatestBomRevision(bom: Bom) {
  return [...bom.revisions].sort((a, b) => b.revisi - a.revisi)[0];
}

/** Resolve material from live store, with seed fallback (avoids raw ids like "i1"). */
export function findItem(
  itemId: string,
  live: MaterialItem[] = [],
): MaterialItem | undefined {
  if (!itemId) return undefined;
  return live.find((i) => i.id === itemId) ?? items.find((i) => i.id === itemId);
}

/** Resolve finish good from live store, with seed fallback. */
export function findFinishGood(
  fgId: string,
  live: FinishGood[] = [],
): FinishGood | undefined {
  if (!fgId) return undefined;
  return (
    live.find((f) => f.id === fgId) ?? finishGoods.find((f) => f.id === fgId)
  );
}

/** Ensure seed master rows exist in persisted lists (missing ids get restored). */
export function ensureSeedById<T extends { id: string }>(
  seed: T[],
  live: T[],
): T[] {
  const map = new Map(live.map((row) => [row.id, row]));
  for (const row of seed) {
    if (!map.has(row.id)) map.set(row.id, row);
  }
  return Array.from(map.values());
}

function normLotText(value: string | undefined | null) {
  return (value ?? "").trim();
}

/** Kunci baris penerimaan: satu BTB, satu jenis, satu indeks baris. */
export function btbLineKey(
  btbId: string,
  jenis: "item" | "fg",
  index: number,
) {
  return `${btbId}::${jenis}::${index}`;
}

type BtbLotRef = {
  btbId: string;
  btbNo: string;
  refId: string;
  batchCustomer: string;
  gudangId: string;
  qty: number;
};

function bkbLotRefs(doc: Bkb, jenis: "item" | "fg"): BtbLotRef[] {
  if (jenis === "item") {
    return (doc.items ?? []).map((line) => ({
      btbId: line.btbId,
      btbNo: line.btbNo,
      refId: line.itemId,
      batchCustomer: line.batchCustomer,
      gudangId: line.gudangId,
      qty: Number(line.qty) || 0,
    }));
  }
  return (doc.fgs ?? []).map((line) => ({
    btbId: line.btbId,
    btbNo: line.btbNo,
    refId: line.fgId,
    batchCustomer: line.batchCustomer,
    gudangId: line.gudangId,
    qty: Number(line.qty) || 0,
  }));
}

function resolveIssuedBtbId(ref: BtbLotRef, docs: Btb[]) {
  if (ref.btbId && docs.some((doc) => doc.id === ref.btbId)) return ref.btbId;
  const no = normLotText(ref.btbNo);
  if (!no) return null;
  const matches = docs.filter((doc) => normLotText(doc.no) === no);
  return matches.length === 1 ? matches[0].id : null;
}

function lotBucketKey(
  btbId: string,
  jenis: "item" | "fg",
  refId: string,
  batchCustomer: string,
  gudangId: string,
) {
  return [
    btbId,
    jenis,
    refId,
    normLotText(batchCustomer),
    gudangId,
  ].join("\u0001");
}

/**
 * Sisa tiap baris BTB = qty awal baris itu − qty BKB yang merujuk
 * dokumen BTB yang sama, material/FG yang sama, batch yang sama, dan gudang yang sama.
 * Qty keluar tidak dijumlah lintas material atau lintas batch.
 * Beberapa baris dengan identitas sama dipotong berurutan, supaya sisa tidak dihitung dua kali.
 */
export function remainingQtyByBtbLine(docs: Btb[], bkbDocs: Bkb[]) {
  const issued = new Map<string, number>();
  for (const jenis of ["item", "fg"] as const) {
    for (const bkb of bkbDocs) {
      for (const ref of bkbLotRefs(bkb, jenis)) {
        if (ref.qty <= 0) continue;
        const btbId = resolveIssuedBtbId(ref, docs);
        if (!btbId) continue;
        const key = lotBucketKey(
          btbId,
          jenis,
          ref.refId,
          ref.batchCustomer,
          ref.gudangId,
        );
        issued.set(key, (issued.get(key) ?? 0) + ref.qty);
      }
    }
  }

  const remaining = new Map<string, number>();
  for (const btb of docs) {
    for (const jenis of ["item", "fg"] as const) {
      const lines = jenis === "item" ? (btb.items ?? []) : (btb.fgs ?? []);
      const consumed = new Map<string, number>();
      lines.forEach((line, index) => {
        const mapKey = btbLineKey(btb.id, jenis, index);
        if (isTransferGeneratedBtbLine(line.keterangan)) {
          remaining.set(mapKey, 0);
          return;
        }
        const refId = "itemId" in line ? line.itemId : line.fgId;
        const key = lotBucketKey(
          btb.id,
          jenis,
          refId,
          line.batchCustomer,
          line.gudangId,
        );
        const awal = Math.max(0, Number(line.qty) || 0);
        const totalIssued = issued.get(key) ?? 0;
        const used = consumed.get(key) ?? 0;
        const take = Math.min(awal, Math.max(0, totalIssued - used));
        consumed.set(key, used + take);
        remaining.set(mapKey, awal - take);
      });
    }
  }
  return remaining;
}

export type BtbBatchStock = {
  key: string;
  btbId: string;
  btbNo: string;
  jenis: "item" | "fg";
  refId: string;
  /** Customer pada dokumen BTB asal. Kosong berarti batch umum. */
  customerId: string;
  batchCustomer: string;
  gudangId: string;
  qty: number;
  tanggal: string;
};

/** Label opsi: `No. BTB - Batch Customer - (Stok: Qty)`. Batch kosong tidak menambah pemisah ganda. */
export function formatBtbLotLabel(
  lot: { btbNo: string; batchCustomer?: string; qty: number },
  gudangName?: string,
) {
  const no = lot.btbNo.trim() || "-";
  const batch = (lot.batchCustomer ?? "").trim();
  const place = gudangName ? ` · ${gudangName}` : "";
  const stock = `(Stok: ${lot.qty})`;
  if (!batch) return `${no}${place} - ${stock}`;
  return `${no} - ${batch}${place} - ${stock}`;
}

/**
 * Lot milik customer yang dipilih.
 * Jika customer itu tidak punya lot, yang tersisa adalah batch umum (tanpa customer).
 */
export function lotsForCustomer<T extends { customerId?: string }>(
  lots: T[],
  customerId: string | undefined,
) {
  const selected = (customerId ?? "").trim();
  const general = lots.filter((lot) => !(lot.customerId ?? "").trim());
  if (!selected) return general;
  const owned = lots.filter(
    (lot) => (lot.customerId ?? "").trim() === selected,
  );
  return owned.length > 0 ? owned : general;
}

type BtbBatchLot = BtbBatchStock;

function btbBatchKey(lot: {
  btbId: string;
  jenis: "item" | "fg";
  refId: string;
  batchCustomer: string;
  gudangId: string;
}) {
  return [
    lot.btbId,
    lot.jenis,
    lot.refId,
    normLotText(lot.batchCustomer),
    lot.gudangId,
  ].join("\u0001");
}

function addBtbBatchQty(lots: Map<string, BtbBatchLot>, incoming: BtbBatchLot) {
  if (incoming.qty <= 0) return;
  const key = btbBatchKey(incoming);
  const current = lots.get(key);
  if (current) {
    current.qty += incoming.qty;
    if (incoming.tanggal < current.tanggal) current.tanggal = incoming.tanggal;
    return;
  }
  lots.set(key, { ...incoming, key, batchCustomer: normLotText(incoming.batchCustomer) });
}

function takeBtbBatchQty(
  lots: Map<string, BtbBatchLot>,
  match: (lot: BtbBatchLot) => boolean,
  qty: number,
) {
  const ordered = [...lots.values()]
    .filter((lot) => match(lot) && lot.qty > 0)
    .sort(
      (a, b) =>
        a.tanggal.localeCompare(b.tanggal) || a.btbNo.localeCompare(b.btbNo),
    );
  const taken: { lot: BtbBatchLot; qty: number }[] = [];
  let remaining = qty;
  for (const lot of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(lot.qty, remaining);
    lot.qty -= take;
    remaining -= take;
    taken.push({ lot, qty: take });
  }
  return taken;
}

/**
 * Sisa stok per No. BTB di tiap gudang.
 * BKB, transfer, dan adjustment yang sudah disetujui mengurangi atau menambah lot itu.
 * Transfer memindahkan lot yang sama ke gudang tujuan.
 */
export function listBtbBatchStock(input?: {
  btbs?: Btb[];
  bkbs?: Bkb[];
  transfers?: TransferGudang[];
  adjustments?: Adjustment[];
  excludeTransferId?: string;
  excludeBkbId?: string;
  excludeAdjustmentId?: string;
}): BtbBatchStock[] {
  const docs = input?.btbs ?? btbs;
  const bkbDocs = (input?.bkbs ?? bkbs).filter(
    (doc) => doc.id !== input?.excludeBkbId,
  );
  const transferDocs = (input?.transfers ?? transfers).filter(
    (doc) => doc.id !== input?.excludeTransferId,
  );
  const adjustmentDocs = (input?.adjustments ?? adjustments).filter(
    (doc) => doc.id !== input?.excludeAdjustmentId,
  );
  const lots = new Map<string, BtbBatchLot>();

  type BatchEvent =
    | { at: string; rank: number; kind: "btb"; doc: Btb }
    | { at: string; rank: number; kind: "bkb"; doc: Bkb }
    | { at: string; rank: number; kind: "transfer"; doc: TransferGudang }
    | { at: string; rank: number; kind: "adjustment"; doc: Adjustment };

  function eventAt(date: string, createdAt?: string) {
    if (createdAt) return createdAt;
    return date ? `${date}T00:00:00` : "";
  }

  const events: BatchEvent[] = [
    ...docs.map((doc) => ({
      at: eventAt(doc.tanggalTerima, doc.createdAt),
      rank: 0,
      kind: "btb" as const,
      doc,
    })),
    ...transferDocs.map((doc) => ({
      at: eventAt(doc.tanggal, doc.createdAt),
      rank: 1,
      kind: "transfer" as const,
      doc,
    })),
    ...bkbDocs.map((doc) => ({
      at: eventAt(doc.tanggalKeluar, doc.createdAt),
      rank: 2,
      kind: "bkb" as const,
      doc,
    })),
    ...adjustmentDocs.map((doc) => ({
      at: eventAt(doc.tanggal, doc.createdAt),
      rank: 3,
      kind: "adjustment" as const,
      doc,
    })),
  ];
  events.sort((a, b) => a.at.localeCompare(b.at) || a.rank - b.rank);

  for (const event of events) {
    if (event.kind === "btb") {
      const btb = event.doc;
      for (const jenis of ["item", "fg"] as const) {
        const lines = jenis === "item" ? (btb.items ?? []) : (btb.fgs ?? []);
        lines.forEach((line) => {
          if (isTransferGeneratedBtbLine(line.keterangan)) return;
          const refId = "itemId" in line ? line.itemId : line.fgId;
          addBtbBatchQty(lots, {
            key: "",
            btbId: btb.id,
            btbNo: btb.no,
            jenis,
            refId,
            customerId: (btb.customerId ?? "").trim(),
            batchCustomer: line.batchCustomer,
            gudangId: line.gudangId,
            qty: Math.max(0, Number(line.qty) || 0),
            tanggal: btb.tanggalTerima,
          });
        });
      }
      continue;
    }

    if (event.kind === "bkb") {
      for (const jenis of ["item", "fg"] as const) {
        for (const ref of bkbLotRefs(event.doc, jenis)) {
          if (ref.qty <= 0) continue;
          const btbId = resolveIssuedBtbId(ref, docs);
          if (!btbId) continue;
          takeBtbBatchQty(
            lots,
            (lot) =>
              lot.btbId === btbId &&
              lot.jenis === jenis &&
              lot.refId === ref.refId &&
              lot.gudangId === ref.gudangId &&
              lot.batchCustomer === normLotText(ref.batchCustomer),
            ref.qty,
          );
        }
      }
      continue;
    }

    if (event.kind === "adjustment") {
      if (!isApprovedAdjustment(event.doc.status)) continue;
      for (const line of event.doc.lines ?? []) {
        const specific = Boolean(line.btbId && line.gudangId);
        if (line.out > 0) {
          const taken = takeBtbBatchQty(
            lots,
            (lot) =>
              lot.jenis === line.jenis &&
              lot.refId === line.refId &&
              (specific
                ? lot.btbId === line.btbId &&
                  lot.gudangId === line.gudangId &&
                  (!line.batchCustomer ||
                    lot.batchCustomer === normLotText(line.batchCustomer))
                : true),
            line.out,
          );
          void taken;
        }
        if (line.in > 0 && specific && line.btbId && line.gudangId) {
          const host = [...lots.values()].find(
            (lot) => lot.btbId === line.btbId && lot.jenis === line.jenis,
          );
          const sourceDoc = docs.find((doc) => doc.id === line.btbId);
          addBtbBatchQty(lots, {
            key: "",
            btbId: line.btbId,
            btbNo: line.btbNo || host?.btbNo || "",
            jenis: line.jenis,
            refId: line.refId,
            customerId: host?.customerId || (sourceDoc?.customerId ?? "").trim(),
            batchCustomer: line.batchCustomer || host?.batchCustomer || "",
            gudangId: line.gudangId,
            qty: line.in,
            tanggal: event.doc.tanggal,
          });
        }
      }
      continue;
    }

    for (const line of event.doc.lines ?? []) {
      if (line.qty <= 0 || line.dariGudangId === line.keGudangId) continue;
      const specific = Boolean(line.btbId);
      const taken = takeBtbBatchQty(
        lots,
        (lot) =>
          lot.jenis === line.jenis &&
          lot.refId === line.refId &&
          lot.gudangId === line.dariGudangId &&
          (specific
            ? lot.btbId === line.btbId &&
              (!line.batchCustomer ||
                lot.batchCustomer === normLotText(line.batchCustomer))
            : true),
        line.qty,
      );
      for (const part of taken) {
        addBtbBatchQty(lots, {
          ...part.lot,
          key: "",
          gudangId: line.keGudangId,
          qty: part.qty,
          tanggal: event.doc.tanggal,
        });
      }
    }
  }

  return [...lots.values()].filter((lot) => lot.qty > 0);
}

/** Tulis ulang qtySisa dari transaksi, bukan dari penambahan/pengurangan bertahap. */
export function syncBtbQtySisa(docs: Btb[], bkbDocs: Bkb[]): Btb[] {
  const remaining = remainingQtyByBtbLine(docs, bkbDocs);
  return docs.map((btb) => ({
    ...btb,
    items: (btb.items ?? []).map((line, index) => ({
      ...line,
      qtySisa: remaining.get(btbLineKey(btb.id, "item", index)) ?? 0,
    })),
    fgs: (btb.fgs ?? []).map((line, index) => ({
      ...line,
      qtySisa: remaining.get(btbLineKey(btb.id, "fg", index)) ?? 0,
    })),
  }));
}

/** Turunan batch masuk material dari baris BTB (mock). */
export function getBatchesForItem(
  itemId: string,
  docs: Btb[] = btbs,
  bkbDocs: Bkb[] = bkbs,
): MaterialBatch[] {
  const remaining = remainingQtyByBtbLine(docs, bkbDocs);
  const rows: MaterialBatch[] = [];
  for (const btb of docs) {
    btb.items.forEach((line, idx) => {
      if (line.itemId !== itemId) return;
      if (isTransferGeneratedBtbLine(line.keterangan)) return;
      rows.push({
        id: `${btb.id}-item-${idx}`,
        itemId,
        batchCustomer: line.batchCustomer,
        qtyMasuk: line.qty,
        qtySisa: remaining.get(btbLineKey(btb.id, "item", idx)) ?? 0,
        satuan: line.satuan,
        tanggalMasuk: btb.tanggalTerima,
        sumberBtbId: btb.id,
        sumberBtbNo: btb.no,
        gudangId: line.gudangId,
        keterangan: line.keterangan,
      });
    });
  }
  return rows.sort((a, b) => b.tanggalMasuk.localeCompare(a.tanggalMasuk));
}
