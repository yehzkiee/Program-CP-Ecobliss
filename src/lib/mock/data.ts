import { resolveJenisTransaksiId } from "@/lib/jenis-transaksi";
import type {
  ActivityLog,
  Adjustment,
  Bkb,
  Bom,
  Btb,
  BtbLineFg,
  BtbLineItem,
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
    no: "260910-00001",
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
        qtySisa: 730,
      },
      {
        itemId: "i1",
        batchCustomer: "BC-SA-01",
        qty: 250,
        satuan: "LBR",
        gudangId: "g2",
        keterangan: "Hasil transfer gudang",
        qtySisa: 250,
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
        qtySisa: 180,
      },
      {
        fgId: "f1",
        batchCustomer: "BC-SA-FG01",
        qty: 20,
        satuan: "PCS",
        gudangId: "g3",
        keterangan: "Hasil transfer gudang",
        qtySisa: 20,
      },
    ],
  },
  {
    id: "btb2",
    no: "260911-00002",
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
    no: "260912-00001",
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
  {
    id: "tf-karton",
    no: "260912-00004",
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

type StockLot = StockRow & { tanggal: string };

/** Baris BTB yang lahir dari transfer, bukan penerimaan baru. */
export function isTransferGeneratedBtbLine(keterangan?: string | null) {
  const note = (keterangan ?? "").trim().toLowerCase();
  return note === "hasil transfer gudang" || note === "stok karton di gudang fg";
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
        if (line.out > 0) {
          takeFromLots(
            lots,
            (lot) => lot.jenis === line.jenis && lot.refId === line.refId,
            line.out,
          );
        }
        if (line.in > 0) {
          const host = lots.find(
            (lot) => lot.jenis === line.jenis && lot.refId === line.refId,
          );
          pushMasuk(
            line.jenis,
            line.refId,
            master?.kode ?? line.kode,
            master?.nama ?? line.nama,
            host?.customerId || master?.customerId || "",
            host?.gudangId || gudangs[0]?.id || "",
            host?.batchCustomer || "",
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
          lot.gudangId === line.dariGudangId,
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

export function formatDocNo(dateStr: string, seq: number): string {
  const d = dateStr.replace(/-/g, "").slice(2);
  const n = seq % 100000;
  return `${d}-${String(n).padStart(5, "0")}`;
}

export type TransferStockLine = {
  jenis: "item" | "fg";
  refId: string;
  qty: number;
  dariGudangId: string;
  keGudangId: string;
  kode?: string;
  nama?: string;
};

/**
 * Pindahkan stok antar gudang dengan menyesuaikan qtySisa pada baris BTB
 * (sumber stok sistem). Mengurangi di gudang asal, menambah di gudang tujuan.
 */
export function applyTransferToBtbs(
  docs: Btb[],
  lines: TransferStockLine[],
): { ok: true; btbs: Btb[] } | { ok: false; error: string } {
  const next = structuredClone(docs);

  for (const move of lines) {
    if (!move.refId || move.qty <= 0) continue;
    if (!move.dariGudangId || !move.keGudangId) {
      return {
        ok: false,
        error: "Gudang asal dan tujuan wajib diisi pada setiap baris",
      };
    }
    if (move.dariGudangId === move.keGudangId) {
      return {
        ok: false,
        error: `Gudang asal dan tujuan tidak boleh sama (${move.kode ?? move.refId})`,
      };
    }

    let remaining = move.qty;
    const label = move.kode
      ? `${move.kode}${move.nama ? ` - ${move.nama}` : ""}`
      : move.refId;

    type Lot = {
      btb: Btb;
      line: BtbLineItem | BtbLineFg;
    };

    const lots: Lot[] = [];
    for (const btb of next) {
      if (move.jenis === "item") {
        for (const line of btb.items) {
          if (
            line.itemId === move.refId &&
            line.gudangId === move.dariGudangId &&
            line.qtySisa > 0
          ) {
            lots.push({ btb, line });
          }
        }
      } else {
        for (const line of btb.fgs) {
          if (
            line.fgId === move.refId &&
            line.gudangId === move.dariGudangId &&
            line.qtySisa > 0
          ) {
            lots.push({ btb, line });
          }
        }
      }
    }

    // FIFO berdasarkan tanggal terima BTB
    lots.sort((a, b) => a.btb.tanggalTerima.localeCompare(b.btb.tanggalTerima));

    for (const { btb, line } of lots) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, line.qtySisa);
      if (take <= 0) continue;
      line.qtySisa -= take;

      if (move.jenis === "item") {
        const src = line as BtbLineItem;
        const dest = btb.items.find(
          (l) =>
            l.itemId === src.itemId &&
            l.gudangId === move.keGudangId &&
            l.batchCustomer === src.batchCustomer,
        );
        if (dest) {
          dest.qtySisa += take;
        } else {
          btb.items.push({
            itemId: src.itemId,
            batchCustomer: src.batchCustomer,
            qty: take,
            satuan: src.satuan,
            gudangId: move.keGudangId,
            keterangan: "Hasil transfer gudang",
            qtySisa: take,
          });
        }
      } else {
        const src = line as BtbLineFg;
        const dest = btb.fgs.find(
          (l) =>
            l.fgId === src.fgId &&
            l.gudangId === move.keGudangId &&
            l.batchCustomer === src.batchCustomer,
        );
        if (dest) {
          dest.qtySisa += take;
        } else {
          btb.fgs.push({
            fgId: src.fgId,
            batchCustomer: src.batchCustomer,
            qty: take,
            satuan: src.satuan,
            gudangId: move.keGudangId,
            keterangan: "Hasil transfer gudang",
            qtySisa: take,
          });
        }
      }

      remaining -= take;
    }

    if (remaining > 0) {
      return {
        ok: false,
        error: `Stok di gudang asal tidak cukup untuk ${label} (kurang ${remaining})`,
      };
    }
  }

  return { ok: true, btbs: next };
}

/** Balikkan efek transfer (untuk edit ulang dokumen). */
export function reverseTransferOnBtbs(
  docs: Btb[],
  lines: TransferStockLine[],
) {
  return applyTransferToBtbs(
    docs,
    lines.map((l) => ({
      ...l,
      dariGudangId: l.keGudangId,
      keGudangId: l.dariGudangId,
    })),
  );
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

/** Turunan batch masuk material dari baris BTB (mock). */
export function getBatchesForItem(
  itemId: string,
  docs: Btb[] = btbs,
): MaterialBatch[] {
  const rows: MaterialBatch[] = [];
  for (const btb of docs) {
    btb.items.forEach((line, idx) => {
      if (line.itemId !== itemId) return;
      rows.push({
        id: `${btb.id}-item-${idx}`,
        itemId,
        batchCustomer: line.batchCustomer,
        qtyMasuk: line.qty,
        qtySisa: line.qtySisa,
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
