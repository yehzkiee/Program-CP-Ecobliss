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
import { findItem, findFinishGood } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

const ITEM_COLS = [
  { key: "kode", header: "Kode", width: "16%" },
  { key: "nama", header: "Nama", width: "32%" },
  { key: "batch", header: "Batch", width: "18%" },
  { key: "qty", header: "Qty", width: "14%", align: "right" as const },
  { key: "gudang", header: "Gudang", width: "20%" },
];

export default function PrintBtbPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const btbs = useDataStore((s) => s.btbs);
  const items = useDataStore((s) => s.items);
  const fgs = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const customers = useDataStore((s) => s.customers);
  const jenis = useDataStore((s) => s.jenisTransaksiList);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useDataStore.persist.hasHydrated()) {
      finish();
    }
    return useDataStore.persist.onFinishHydration(finish);
  }, []);

  const btb = useMemo(() => btbs.find((b) => b.id === id), [btbs, id]);

  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );
  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  if (!hydrated) {
    return <p className="p-8 text-sm text-muted-foreground">Memuat dokumen...</p>;
  }

  if (!btb) return <p className="p-8">BTB tidak ditemukan.</p>;

  const itemRows = btb.items.map((l) => {
    const item = findItem(l.itemId, items);
    return [
      item?.kode ?? "-",
      item?.nama ?? "-",
      l.batchCustomer || "-",
      formatQty(l.qty, l.satuan),
      gudangMap[l.gudangId]?.nama ?? "-",
    ];
  });

  const fgRows = btb.fgs.map((l) => {
    const fg = findFinishGood(l.fgId, fgs);
    return [
      fg?.kode ?? "-",
      fg?.nama ?? "-",
      l.batchCustomer || "-",
      formatQty(l.qty, l.satuan),
      gudangMap[l.gudangId]?.nama ?? "-",
    ];
  });

  return (
    <PrintShell>
      <div className="no-print mb-4">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak
        </Button>
      </div>

      <PrintDocHeader
        title="Bukti Terima Barang (BTB)"
        docNo={btb.no}
        meta={
          <>
            Tanggal Terima: {formatDateID(btb.tanggalTerima)}
            {" · "}
            {jenis.find((j) => j.id === btb.jenisTransaksiId)?.nama ?? "-"}
            {btb.customerId ? (
              <>
                {" · "}
                Customer: {custMap[btb.customerId]?.nama ?? "-"}
              </>
            ) : null}
          </>
        }
      />

      <PrintTable title="Item" columns={ITEM_COLS} rows={itemRows} />
      <PrintTable title="Finish Good" columns={ITEM_COLS} rows={fgRows} />
      <PrintSignatures />
    </PrintShell>
  );
}
