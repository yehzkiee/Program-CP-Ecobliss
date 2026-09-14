"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

export default function PrintBtbPage() {
  const params = useParams<{ id: string }>();
  const btb = useDataStore((s) => s.btbs.find((b) => b.id === params.id));
  const items = useDataStore((s) => s.items);
  const fgs = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const jenis = useDataStore((s) => s.jenisTransaksiList);

  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(fgs.map((f) => [f.id, f])),
    [fgs],
  );
  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

  if (!btb) return <p className="p-8">BTB tidak ditemukan.</p>;

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-sm">
      <div className="no-print mb-4">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak
        </Button>
      </div>
      <div className="mb-6 border-b pb-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Ecobliss · Program-CP
        </p>
        <h1 className="text-xl font-semibold">Bukti Terima Barang (BTB)</h1>
        <p className="font-medium">{btb.no}</p>
        <p className="text-slate-600">
          Tanggal Terima: {formatDateID(btb.tanggalTerima)} ·{" "}
          {jenis.find((j) => j.id === btb.jenisTransaksiId)?.nama}
        </p>
      </div>

      <h2 className="mb-2 font-semibold">Item</h2>
      <table className="mb-6 w-full border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Kode</th>
            <th className="py-2">Nama</th>
            <th className="py-2">Batch</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2">Gudang</th>
          </tr>
        </thead>
        <tbody>
          {btb.items.map((l, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{itemMap[l.itemId]?.kode}</td>
              <td className="py-2">{itemMap[l.itemId]?.nama}</td>
              <td className="py-2">{l.batchCustomer}</td>
              <td className="py-2 text-right">
                {l.qty} {l.satuan}
              </td>
              <td className="py-2">{gudangMap[l.gudangId]?.nama}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">Finish Good</h2>
      <table className="mb-10 w-full border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Kode</th>
            <th className="py-2">Nama</th>
            <th className="py-2">Batch</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2">Gudang</th>
          </tr>
        </thead>
        <tbody>
          {btb.fgs.map((l, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">{fgMap[l.fgId]?.kode}</td>
              <td className="py-2">{fgMap[l.fgId]?.nama}</td>
              <td className="py-2">{l.batchCustomer}</td>
              <td className="py-2 text-right">
                {l.qty} {l.satuan}
              </td>
              <td className="py-2">{gudangMap[l.gudangId]?.nama}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-2 gap-8 text-center">
        <div>
          <p className="mb-16">Pemberi</p>
          <p className="border-t pt-2">(Nama & TTD)</p>
        </div>
        <div>
          <p className="mb-16">Penerima</p>
          <p className="border-t pt-2">(Nama & TTD)</p>
        </div>
      </div>
    </div>
  );
}
