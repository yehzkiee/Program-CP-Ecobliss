"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildStockRows, formatDocNo } from "@/lib/mock/data";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { StockOpname, StockOpnameLine } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

type DraftLine = StockOpnameLine & { qtyAktualInput: number };

export default function StockOpnameFormPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "baru";
  const router = useRouter();
  const stockOpnames = useDataStore((s) => s.stockOpnames);
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const btbs = useDataStore((s) => s.btbs);
  const upsert = useDataStore((s) => s.upsertStockOpname);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const existing = stockOpnames.find((s) => s.id === params.id);
  const readOnly = !isNew;

  const stock = useMemo(
    () =>
      buildStockRows({ customers, items, finishGoods, gudangList, btbs }),
    [customers, items, finishGoods, gudangList, btbs],
  );
  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const [tanggal, setTanggal] = useState(existing?.tanggal ?? todayISO());
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [drafts, setDrafts] = useState<DraftLine[]>(() => {
    if (existing) {
      return existing.lines.map((l) => ({
        ...l,
        qtyAktualInput: l.qtyAktual,
      }));
    }
    // Aggregate stock for opname worksheet
    const map = new Map<string, DraftLine>();
    for (const r of stock) {
      const key = `${r.jenis}-${r.refId}-${r.gudangId}`;
      const prev = map.get(key);
      if (prev) {
        prev.qtySistem += r.qty;
        prev.qtyAktualInput += r.qty;
      } else {
        map.set(key, {
          jenis: r.jenis,
          refId: r.refId,
          kode: r.kode,
          nama: r.nama,
          customerId: r.customerId,
          gudangId: r.gudangId,
          qtySistem: r.qty,
          qtyAktual: r.qty,
          selisih: 0,
          qtyAktualInput: r.qty,
        });
      }
    }
    return Array.from(map.values());
  });

  function save() {
    const lines: StockOpnameLine[] = drafts
      .map((d) => ({
        jenis: d.jenis,
        refId: d.refId,
        kode: d.kode,
        nama: d.nama,
        customerId: d.customerId,
        gudangId: d.gudangId,
        qtySistem: d.qtySistem,
        qtyAktual: d.qtyAktualInput,
        selisih: d.qtyAktualInput - d.qtySistem,
      }))
      .filter((l) => l.selisih !== 0);

    if (lines.length === 0) {
      toast.error("Tidak ada selisih — transaksi SO tidak dibuat");
      return;
    }

    const payload: StockOpname = {
      id: existing?.id ?? uid("so"),
      no: existing?.no ?? formatDocNo(tanggal, stockOpnames.length + 1),
      tanggal,
      keterangan,
      lines,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsert(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: "Stock Opname",
      detail: `${payload.no} (${lines.length} selisih)`,
    });
    toast.success(`SO ${payload.no} disimpan dengan ${lines.length} baris selisih`);
    router.push(`/transaksi/stock-opname/${payload.id}`);
  }

  const displayLines = readOnly ? existing?.lines ?? [] : drafts;

  return (
    <div>
      <BackLink href="/transaksi/stock-opname" />
      <PageHeader
        title={isNew ? "Buat Stock Opname" : `SO ${existing?.no}`}
        description="Isi qty aktual. Hanya baris dengan selisih yang masuk transaksi."
        action={
          !isNew ? (
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href={`/transaksi/adjustment/baru?so=${params.id}`}>
                Buat Adjustment
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tanggal</Label>
          <Input
            type="date"
            value={tanggal}
            disabled={readOnly}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Keterangan</Label>
          <Input
            value={keterangan}
            disabled={readOnly}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>
      </div>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {readOnly ? "Baris Selisih" : "Worksheet Opname"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Jenis</th>
                <th className="pb-2 font-medium">Kode</th>
                <th className="pb-2 font-medium">Nama</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 text-right font-medium">Qty Sistem</th>
                <th className="pb-2 text-right font-medium">Qty Aktual</th>
                <th className="pb-2 text-right font-medium">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {displayLines.map((line, idx) => {
                const aktual = readOnly
                  ? line.qtyAktual
                  : (line as DraftLine).qtyAktualInput;
                const selisih = readOnly
                  ? line.selisih
                  : aktual - line.qtySistem;
                return (
                  <tr key={idx} className="border-b">
                    <td className="py-2 uppercase">{line.jenis}</td>
                    <td className="py-2 font-medium">{line.kode}</td>
                    <td className="py-2">{line.nama}</td>
                    <td className="py-2">
                      {custMap[line.customerId]?.nama ?? "-"}
                    </td>
                    <td className="py-2 text-right">{line.qtySistem}</td>
                    <td className="py-2 text-right">
                      {readOnly ? (
                        aktual
                      ) : (
                        <Input
                          type="number"
                          className="ml-auto w-24 text-right"
                          value={aktual}
                          onChange={(e) => {
                            const next = [...drafts];
                            next[idx] = {
                              ...next[idx],
                              qtyAktualInput: Number(e.target.value) || 0,
                            };
                            setDrafts(next);
                          }}
                        />
                      )}
                    </td>
                    <td
                      className={`py-2 text-right font-medium ${
                        selisih !== 0 ? "text-amber-700" : ""
                      }`}
                    >
                      {selisih}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isNew && (
        <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
          Simpan (hanya selisih)
        </Button>
      )}
    </div>
  );
}
