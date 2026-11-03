import type {
  Adjustment,
  Bkb,
  Btb,
  StockOpname,
  TransferGudang,
} from "@/lib/types";

function sameBtbRef(
  btb: Btb,
  btbId?: string | null,
  btbNo?: string | null,
) {
  if (btbId && btbId === btb.id) return true;
  const no = (btbNo ?? "").trim();
  return Boolean(no) && no === btb.no.trim();
}

/** Alasan kenapa BTB belum boleh dihapus (dokumen lain masih merujuk lot-nya). */
export function getBtbDeleteBlockReason(
  btb: Btb,
  deps: {
    bkbs: Bkb[];
    transfers: TransferGudang[];
    adjustments: Adjustment[];
    stockOpnames: StockOpname[];
  },
): string | null {
  const bkbNos = deps.bkbs
    .filter((doc) =>
      [...(doc.items ?? []), ...(doc.fgs ?? [])].some((line) =>
        sameBtbRef(btb, line.btbId, line.btbNo),
      ),
    )
    .map((doc) => doc.no);
  if (bkbNos.length) {
    return `Dokumen masih dipakai di BKB: ${uniqueJoin(bkbNos)}. Hapus BKB terkait terlebih dahulu.`;
  }

  const transferNos = deps.transfers
    .filter((doc) =>
      (doc.lines ?? []).some((line) =>
        sameBtbRef(btb, line.btbId, line.btbNo),
      ),
    )
    .map((doc) => doc.no);
  if (transferNos.length) {
    return `Dokumen masih dipakai di Transfer Gudang: ${uniqueJoin(transferNos)}.`;
  }

  const adjustmentNos = deps.adjustments
    .filter((doc) =>
      (doc.lines ?? []).some((line) =>
        sameBtbRef(btb, line.btbId, line.btbNo),
      ),
    )
    .map((doc) => doc.no);
  if (adjustmentNos.length) {
    return `Dokumen masih dipakai di Adjustment: ${uniqueJoin(adjustmentNos)}.`;
  }

  const opnameNos = deps.stockOpnames
    .filter((doc) =>
      (doc.lines ?? []).some((line) =>
        sameBtbRef(btb, line.btbId, line.btbNo),
      ),
    )
    .map((doc) => doc.no);
  if (opnameNos.length) {
    return `Dokumen masih dipakai di Stock Opname: ${uniqueJoin(opnameNos)}.`;
  }

  return null;
}

export function deleteDocConfirmDescription(noDokumen: string) {
  return `Apakah Anda yakin ingin menghapus dokumen ${noDokumen}? Tindakan ini tidak dapat dibatalkan dan akan mengembalikan status stok barang terkait.`;
}

function uniqueJoin(values: string[]) {
  return [...new Set(values)].join(", ");
}
