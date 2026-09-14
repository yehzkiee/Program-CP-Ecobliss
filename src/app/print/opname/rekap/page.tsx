"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { buildStockRows } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";

export default function PrintOpnameRekapPage() {
  const customers = useDataStore((s) => s.customers);
  const gudangList = useDataStore((s) => s.gudangList);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const btbs = useDataStore((s) => s.btbs);
  const stock = useMemo(
    () =>
      buildStockRows({ customers, gudangList, items, finishGoods, btbs }),
    [customers, gudangList, items, finishGoods, btbs],
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
  const itemRows = aggregated.filter((r) => r.jenis === "item");
  const fgRows = aggregated.filter((r) => r.jenis === "fg");

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-sm">
      <div className="no-print mb-4">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak Rekap
        </Button>
      </div>
      <div className="mb-6 border-b pb-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Ecobliss · Program-CP
        </p>
        <h1 className="text-xl font-semibold">
          Rekap Qty Stock Opname
        </h1>
        <p className="text-slate-600">
          Acuan pengecekan fisik per gudang & customer
        </p>
      </div>

      <h2 className="mb-2 font-semibold">Part Item</h2>
      <table className="mb-8 w-full border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Kode Item</th>
            <th className="py-2">Nama Item</th>
            <th className="py-2">Cust</th>
            <th className="py-2">Gudang</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Aktual</th>
          </tr>
        </thead>
        <tbody>
          {itemRows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{r.kode}</td>
              <td className="py-2">{r.nama}</td>
              <td className="py-2">{custMap[r.customerId]?.nama}</td>
              <td className="py-2">{gudangMap[r.gudangId]?.nama}</td>
              <td className="py-2 text-right">{r.qty}</td>
              <td className="py-2 text-right">______</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">Part Finish Good</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Kode FG</th>
            <th className="py-2">Nama FG</th>
            <th className="py-2">Cust</th>
            <th className="py-2">Gudang</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Aktual</th>
          </tr>
        </thead>
        <tbody>
          {fgRows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{r.kode}</td>
              <td className="py-2">{r.nama}</td>
              <td className="py-2">{custMap[r.customerId]?.nama}</td>
              <td className="py-2">{gudangMap[r.gudangId]?.nama}</td>
              <td className="py-2 text-right">{r.qty}</td>
              <td className="py-2 text-right">______</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
