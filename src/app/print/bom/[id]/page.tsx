"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getLatestBomRevision } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

export default function PrintBomPage() {
  const params = useParams<{ id: string }>();
  const bom = useDataStore((s) => s.boms.find((b) => b.id === params.id));
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  if (!bom) {
    return <p className="p-8">BOM tidak ditemukan.</p>;
  }

  const latest = getLatestBomRevision(bom);
  const fg = fgMap[bom.fgId];

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm text-slate-900">
      <div className="no-print mb-4 flex gap-2">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak
        </Button>
      </div>
      <div className="mb-6 flex items-start justify-between border-b pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Ecobliss · Program-CP
          </p>
          <h1 className="text-xl font-semibold">Bill of Materials</h1>
          <p className="text-slate-600">{bom.kode}</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <p>Rev. {latest?.revisi}</p>
          <p>{formatDateID(latest?.tanggal ?? "")}</p>
        </div>
      </div>

      <p className="mb-4">
        <span className="text-slate-500">Finish Good: </span>
        <strong>
          {fg?.kode} — {fg?.nama}
        </strong>
      </p>
      <p className="mb-6 text-slate-600">{bom.keterangan}</p>

      <h2 className="mb-2 font-semibold">Material (Atas)</h2>
      <table className="mb-6 w-full border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Kode</th>
            <th className="py-2">Nama</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2">UOM</th>
          </tr>
        </thead>
        <tbody>
          {latest?.items.map((l, i) => {
            const item = itemMap[l.itemId];
            return (
              <tr key={i} className="border-b">
                <td className="py-2">{item?.kode}</td>
                <td className="py-2">{item?.nama}</td>
                <td className="py-2 text-right">{l.qty}</td>
                <td className="py-2">{item?.uom}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">Finish Good (Bawah)</h2>
      {(latest?.fgs.length ?? 0) === 0 ? (
        <p className="text-slate-500">—</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Kode</th>
              <th className="py-2">Nama</th>
              <th className="py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {latest?.fgs.map((l, i) => {
              const f = fgMap[l.fgId];
              return (
                <tr key={i} className="border-b">
                  <td className="py-2">{f?.kode}</td>
                  <td className="py-2">{f?.nama}</td>
                  <td className="py-2 text-right">{l.qty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
