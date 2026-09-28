"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  PrintDocHeader,
  PrintShell,
  PrintTable,
} from "@/components/print/print-document";
import { buildStockRows } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";

const REKAP_COLS = [
  { key: "kode", header: "Kode", width: "14%" },
  { key: "nama", header: "Nama", width: "28%" },
  { key: "cust", header: "Customer", width: "20%" },
  { key: "gudang", header: "Gudang", width: "18%" },
  { key: "qty", header: "Qty Sistem", width: "10%", align: "right" as const },
  { key: "aktual", header: "Qty Aktual", width: "10%", align: "right" as const },
];

export default function PrintOpnameRekapPage() {
  const customers = useDataStore((s) => s.customers);
  const gudangList = useDataStore((s) => s.gudangList);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const transfers = useDataStore((s) => s.transfers);
  const stock = useMemo(
    () =>
      buildStockRows({
        customers,
        gudangList,
        items,
        finishGoods,
        btbs,
        bkbs,
        transfers,
      }),
    [customers, gudangList, items, finishGoods, btbs, bkbs, transfers],
  );

  const aggregated = useMemo(() => {
    const map = new Map<
      string,
      {
        jenis: "item" | "fg";
        kode: string;
        nama: string;
        customerId: string;
        gudangId: string;
        qty: number;
      }
    >();
    for (const r of stock) {
      const key = `${r.jenis}-${r.refId}-${r.gudangId}-${r.customerId}`;
      const prev = map.get(key);
      if (prev) prev.qty += r.qty;
      else
        map.set(key, {
          jenis: r.jenis,
          kode: r.kode,
          nama: r.nama,
          customerId: r.customerId,
          gudangId: r.gudangId,
          qty: r.qty,
        });
    }
    return Array.from(map.values());
  }, [stock]);

  const custMap = Object.fromEntries(customers.map((c) => [c.id, c]));
  const gudangMap = Object.fromEntries(gudangList.map((g) => [g.id, g]));
  const itemRows = aggregated
    .filter((r) => r.jenis === "item")
    .map((r) => [
      r.kode,
      r.nama,
      custMap[r.customerId]?.nama ?? "-",
      gudangMap[r.gudangId]?.nama ?? "-",
      String(r.qty),
      "______",
    ]);
  const fgRows = aggregated
    .filter((r) => r.jenis === "fg")
    .map((r) => [
      r.kode,
      r.nama,
      custMap[r.customerId]?.nama ?? "-",
      gudangMap[r.gudangId]?.nama ?? "-",
      String(r.qty),
      "______",
    ]);

  return (
    <PrintShell wide>
      <div className="no-print mb-4">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak Rekap
        </Button>
      </div>

      <PrintDocHeader
        title="Rekap Qty Stock Opname"
        meta="Acuan pengecekan fisik per gudang & customer"
      />

      <PrintTable title="Part Item" columns={REKAP_COLS} rows={itemRows} />
      <PrintTable
        title="Part Finish Good"
        columns={REKAP_COLS}
        rows={fgRows}
      />
    </PrintShell>
  );
}
