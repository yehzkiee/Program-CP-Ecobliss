"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PrintDocHeader,
  PrintShell,
  PrintSignatures,
  PrintTable,
  formatQty,
} from "@/components/print/print-document";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { findItem, findFinishGood } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import { formatDateID, formatDateShort } from "@/lib/utils";

const LINE_COLS = [
  { key: "kode", header: "Kode", width: "12%" },
  { key: "nama", header: "Nama", width: "24%" },
  { key: "btb", header: "BTB Sumber", width: "22%" },
  { key: "tgl", header: "Tgl Terima", width: "12%" },
  { key: "qty", header: "Qty", width: "12%", align: "right" as const },
  { key: "gudang", header: "Gudang", width: "18%" },
];

export default function PrintBkbPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const bkbs = useDataStore((s) => s.bkbs);
  const items = useDataStore((s) => s.items);
  const fgs = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const jenis = useDataStore((s) => s.jenisTransaksiList);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useDataStore.persist.hasHydrated()) {
      finish();
    }
    return useDataStore.persist.onFinishHydration(finish);
  }, []);

  const bkb = useMemo(() => bkbs.find((b) => b.id === id), [bkbs, id]);

  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

  if (!hydrated) {
    return <p className="p-8 text-sm text-muted-foreground">Memuat dokumen...</p>;
  }

  if (!bkb) return <p className="p-8">BKB tidak ditemukan.</p>;

  const itemRows = bkb.items.map((l) => {
    const item = findItem(l.itemId, items);
    return [
      item?.kode ?? "-",
      <ItemNameWithType jenis="item">{item?.nama ?? "-"}</ItemNameWithType>,
      l.btbNo || "-",
      l.btbTanggalTerima ? formatDateShort(l.btbTanggalTerima) : "-",
      formatQty(l.qty, l.satuan),
      gudangMap[l.gudangId]?.nama ?? "-",
    ];
  });

  const fgRows = bkb.fgs.map((l) => {
    const fg = findFinishGood(l.fgId, fgs);
    return [
      fg?.kode ?? "-",
      <ItemNameWithType jenis="fg">{fg?.nama ?? "-"}</ItemNameWithType>,
      l.btbNo || "-",
      l.btbTanggalTerima ? formatDateShort(l.btbTanggalTerima) : "-",
      formatQty(l.qty, l.satuan),
      gudangMap[l.gudangId]?.nama ?? "-",
    ];
  });

  return (
    <PrintShell paper="a5">
      <div className="no-print mb-4">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak
        </Button>
      </div>

      <PrintDocHeader
        title="Bukti Keluar Barang (BKB)"
        docNo={bkb.no}
        meta={
          <>
            Tanggal Keluar: {formatDateID(bkb.tanggalKeluar)}
            {" · "}
            SPK: {bkb.noSpk || "-"}
            {" · "}
            {jenis.find((j) => j.id === bkb.jenisTransaksiId)?.nama ?? "-"}
          </>
        }
      />

      <PrintTable title="Material" columns={LINE_COLS} rows={itemRows} />
      <PrintTable title="Finish Good" columns={LINE_COLS} rows={fgRows} />
      <PrintSignatures />
    </PrintShell>
  );
}
