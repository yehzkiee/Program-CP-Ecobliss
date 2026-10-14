import {
  buildStockRows,
  isApprovedAdjustment,
  isTransferGeneratedBtbLine,
} from "@/lib/mock/data";
import type { StockRow } from "@/lib/types";
import type { PersistedData } from "@/server/db";

/**
 * Satu baris kartu stok, dipakai bersama oleh penyimpanan SQLite dan MySQL
 * supaya hitungan stok tidak pernah berbeda antara dua backend.
 * Urutan kolom: waktu, doc_type, doc_id, doc_no, arah, jenis, ref_id,
 * gudang_id, batch_customer, qty, btb_id.
 */
export type LedgerRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string | null,
];

export function buildLedgerRows(state: PersistedData): LedgerRow[] {
  const rows: LedgerRow[] = [];

  for (const btb of state.btbs) {
    const waktu = btb.createdAt || btb.tanggalTerima;
    for (const line of btb.items ?? []) {
      if (isTransferGeneratedBtbLine(line.keterangan) || line.qty <= 0) continue;
      rows.push([
        waktu,
        "btb",
        btb.id,
        btb.no,
        "in",
        "item",
        line.itemId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        btb.id,
      ]);
    }
    for (const line of btb.fgs ?? []) {
      if (isTransferGeneratedBtbLine(line.keterangan) || line.qty <= 0) continue;
      rows.push([
        waktu,
        "btb",
        btb.id,
        btb.no,
        "in",
        "fg",
        line.fgId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        btb.id,
      ]);
    }
  }

  for (const transfer of state.transfers) {
    const waktu = transfer.createdAt || transfer.tanggal;
    for (const line of transfer.lines ?? []) {
      if (line.qty <= 0 || line.dariGudangId === line.keGudangId) continue;
      rows.push([
        waktu,
        "transfer",
        transfer.id,
        transfer.no,
        "out",
        line.jenis,
        line.refId,
        line.dariGudangId,
        line.batchCustomer ?? "",
        line.qty,
        line.btbId ?? null,
      ]);
      rows.push([
        waktu,
        "transfer",
        transfer.id,
        transfer.no,
        "in",
        line.jenis,
        line.refId,
        line.keGudangId,
        line.batchCustomer ?? "",
        line.qty,
        line.btbId ?? null,
      ]);
    }
  }

  for (const bkb of state.bkbs) {
    const waktu = bkb.createdAt || bkb.tanggalKeluar;
    for (const line of bkb.items ?? []) {
      if (line.qty <= 0) continue;
      rows.push([
        waktu,
        "bkb",
        bkb.id,
        bkb.no,
        "out",
        "item",
        line.itemId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        line.btbId,
      ]);
    }
    for (const line of bkb.fgs ?? []) {
      if (line.qty <= 0) continue;
      rows.push([
        waktu,
        "bkb",
        bkb.id,
        bkb.no,
        "out",
        "fg",
        line.fgId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        line.btbId,
      ]);
    }
  }

  for (const adjustment of state.adjustments) {
    if (!isApprovedAdjustment(adjustment.status)) continue;
    const waktu = adjustment.createdAt || adjustment.tanggal;
    for (const line of adjustment.lines ?? []) {
      if (line.out > 0) {
        rows.push([
          waktu,
          "adjustment",
          adjustment.id,
          adjustment.no,
          "out",
          line.jenis,
          line.refId,
          line.gudangId ?? "",
          line.batchCustomer ?? "",
          line.out,
          line.btbId ?? null,
        ]);
      }
      if (line.in > 0) {
        rows.push([
          waktu,
          "adjustment",
          adjustment.id,
          adjustment.no,
          "in",
          line.jenis,
          line.refId,
          line.gudangId ?? "",
          line.batchCustomer ?? "",
          line.in,
          line.btbId ?? null,
        ]);
      }
    }
  }

  return rows;
}

export function buildBalanceRows(state: PersistedData): StockRow[] {
  return buildStockRows({
    customers: state.customers,
    gudangList: state.gudangList,
    items: state.items,
    finishGoods: state.finishGoods,
    btbs: state.btbs,
    bkbs: state.bkbs,
    transfers: state.transfers,
    adjustments: state.adjustments,
  });
}
