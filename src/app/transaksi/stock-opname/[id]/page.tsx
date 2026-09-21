"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildStockRows, formatDocNo } from "@/lib/mock/data";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { StockOpname, StockOpnameLine, StockRow } from "@/lib/types";
import {
  colGroupOpnameWithBatch,
  colGroupOpnameWithoutBatch,
  tableBodyCellClass,
  tableBodyCellMutedClass,
  tableBodyCellRightClass,
  tableHeadCellClass,
  tableHeadCellRightClass,
  tableShellClass,
} from "@/lib/table-styles";
import { todayISO, uid, formatJenisBarang } from "@/lib/utils";

type OpnameMetode = "per_batch" | "per_item";
type DraftLine = StockOpnameLine & { qtyAktualInput: number };

function productKey(jenis: "item" | "fg", refId: string) {
  return `${jenis}:${refId}`;
}

function buildDraftsFromStock(
  stock: StockRow[],
  selectedProduct: string,
  metode: OpnameMetode,
): DraftLine[] {
  const filtered = selectedProduct
    ? stock.filter((r) => productKey(r.jenis, r.refId) === selectedProduct)
    : [];

  if (metode === "per_batch") {
    return filtered.map((r) => ({
      jenis: r.jenis,
      refId: r.refId,
      kode: r.kode,
      nama: r.nama,
      customerId: r.customerId,
      gudangId: r.gudangId,
      batchCustomer: r.batchCustomer,
      qtySistem: r.qty,
      qtyAktual: r.qty,
      selisih: 0,
      qtyAktualInput: r.qty,
    }));
  }

  const map = new Map<string, DraftLine>();
  for (const r of filtered) {
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
}

export default function StockOpnameFormPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const isNew = id === "baru";
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
  const existing = isNew ? undefined : stockOpnames.find((s) => s.id === id);
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
  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  const fallbackCustomerId = customers[0]?.id ?? "c1";
  const fallbackCustomerNama = customers[0]?.nama ?? "PT Sinar Abadi";

  function resolveCustomerNama(
    customerId: string,
    jenis: "item" | "fg",
    refId: string,
  ) {
    const direct = custMap[customerId]?.nama?.trim();
    if (direct) return direct;

    const masterCustomerId =
      jenis === "item"
        ? itemMap[refId]?.customerId
        : fgMap[refId]?.customerId;
    const fromMaster = masterCustomerId
      ? custMap[masterCustomerId]?.nama?.trim()
      : undefined;
    if (fromMaster) return fromMaster;

    return fallbackCustomerNama;
  }

  function resolveCustomerId(
    customerId: string,
    jenis: "item" | "fg",
    refId: string,
  ) {
    if (customerId && custMap[customerId]) return customerId;
    const masterCustomerId =
      jenis === "item"
        ? itemMap[refId]?.customerId
        : fgMap[refId]?.customerId;
    if (masterCustomerId && custMap[masterCustomerId]) return masterCustomerId;
    return fallbackCustomerId;
  }

  const productOptions = useMemo(() => {
    const fromStock = new Map<string, { value: string; label: string }>();
    for (const r of stock) {
      const value = productKey(r.jenis, r.refId);
      if (!fromStock.has(value)) {
        fromStock.set(value, {
          value,
          label: `${r.kode} - ${r.nama} (${r.jenis === "item" ? "Item" : "FG"})`,
        });
      }
    }
    for (const i of items.filter((x) => x.status === "aktif")) {
      const value = productKey("item", i.id);
      if (!fromStock.has(value)) {
        fromStock.set(value, {
          value,
          label: `${i.kode} - ${i.nama} (Item)`,
        });
      }
    }
    for (const f of finishGoods.filter((x) => x.status === "aktif")) {
      const value = productKey("fg", f.id);
      if (!fromStock.has(value)) {
        fromStock.set(value, {
          value,
          label: `${f.kode} - ${f.nama} (FG)`,
        });
      }
    }
    return Array.from(fromStock.values());
  }, [stock, items, finishGoods]);

  const [tanggal, setTanggal] = useState(existing?.tanggal ?? todayISO());
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [metode, setMetode] = useState<OpnameMetode>(
    existing?.metode ?? "per_item",
  );
  const [drafts, setDrafts] = useState<DraftLine[]>(() => {
    if (existing) {
      return existing.lines.map((l) => ({
        ...l,
        qtyAktualInput: l.qtyAktual,
      }));
    }
    return [];
  });

  useEffect(() => {
    if (!isNew || !selectedProduct) return;
    setDrafts(buildDraftsFromStock(stock, selectedProduct, metode));
  }, [isNew, selectedProduct, metode, stock]);

  function save() {
    if (!selectedProduct) {
      toast.error("Pilih Item atau Finish Good yang akan di-opname");
      return;
    }

    const lines: StockOpnameLine[] = drafts
      .map((d) => ({
        jenis: d.jenis,
        refId: d.refId,
        kode: d.kode,
        nama: d.nama,
        customerId: resolveCustomerId(d.customerId, d.jenis, d.refId),
        gudangId: d.gudangId,
        batchCustomer: d.batchCustomer,
        qtySistem: d.qtySistem,
        qtyAktual: d.qtyAktualInput,
        selisih: d.qtyAktualInput - d.qtySistem,
      }))
      .filter((l) => l.selisih !== 0);

    if (lines.length === 0) {
                      toast.error("Tidak ada selisih. Transaksi SO tidak dibuat");
      return;
    }

    const payload: StockOpname = {
      id: existing?.id ?? uid("so"),
      no: existing?.no ?? formatDocNo(tanggal, stockOpnames.length + 1),
      tanggal,
      keterangan,
      metode,
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
  const showBatch =
    (isNew && metode === "per_batch") ||
    (!isNew && (existing?.metode === "per_batch" || existing?.lines.some((l) => l.batchCustomer)));

  return (
    <div>
      <BackLink href="/transaksi/stock-opname" />
      <PageHeader
        title={isNew ? "Buat Stock Opname" : `SO ${existing?.no ?? ""}`}
        description="Pilih barang dan metode opname, lalu isi qty aktual. Hanya baris dengan selisih yang masuk transaksi."
        action={
          !isNew ? (
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href={`/transaksi/adjustment/baru?so=${id}`}>
                Buat Adjustment
              </Link>
            </Button>
          ) : undefined
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

        {isNew && (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cari Barang (Item / Finish Good)</Label>
              <Select
                value={selectedProduct}
                onValueChange={(v) => setSelectedProduct(v ?? "")}
                items={productOptions}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Cari Barang..." />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Metode Opname</Label>
              <div className="flex flex-wrap gap-4 rounded-lg border border-border/80 px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="metode-opname"
                    value="per_batch"
                    checked={metode === "per_batch"}
                    onChange={() => setMetode("per_batch")}
                    className="size-4 accent-emerald-700"
                  />
                  Per Batch
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="metode-opname"
                    value="per_item"
                    checked={metode === "per_item"}
                    onChange={() => setMetode("per_item")}
                    className="size-4 accent-emerald-700"
                  />
                  Per Item
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {metode === "per_batch"
                  ? "Worksheet menampilkan stok per batch customer."
                  : "Worksheet menggabungkan stok per item/FG dan gudang."}
              </p>
            </div>
          </>
        )}

        {!isNew && existing?.metode && (
          <div className="space-y-1 sm:col-span-2">
            <Label>Metode Opname</Label>
            <p className="text-sm text-slate-900">
              {existing.metode === "per_batch" ? "Per Batch" : "Per Item"}
            </p>
          </div>
        )}
      </div>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {readOnly ? "Daftar Item dengan Selisih" : "Worksheet Opname"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isNew && !selectedProduct ? (
            <p className="text-sm text-muted-foreground">
              Pilih barang dan metode opname terlebih dahulu untuk menampilkan
              worksheet perhitungan selisih.
            </p>
          ) : displayLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak ada stok untuk barang yang dipilih.
            </p>
          ) : (
            <table className={tableShellClass}>
              <colgroup>
                {(showBatch
                  ? colGroupOpnameWithBatch
                  : colGroupOpnameWithoutBatch
                ).map((width, index) => (
                  <col key={index} className={width} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className={tableHeadCellClass}>Jenis</th>
                  <th className={tableHeadCellClass}>Kode</th>
                  <th className={tableHeadCellClass}>Nama</th>
                  {showBatch && (
                    <th className={tableHeadCellClass}>Batch</th>
                  )}
                  <th className={tableHeadCellClass}>Customer</th>
                  <th className={tableHeadCellClass}>Gudang</th>
                  <th className={tableHeadCellRightClass}>Qty Sistem</th>
                  <th className={tableHeadCellRightClass}>Qty Aktual</th>
                  <th className={tableHeadCellRightClass}>Selisih</th>
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
                    <tr key={idx} className="border-b last:border-0">
                      <td className={tableBodyCellClass}>
                        {formatJenisBarang(line.jenis)}
                      </td>
                      <td className={`${tableBodyCellClass} font-medium`}>
                        {line.kode}
                      </td>
                      <td className={`${tableBodyCellClass} whitespace-normal`}>
                        {line.nama}
                      </td>
                      {showBatch && (
                        <td className={tableBodyCellMutedClass}>
                          {line.batchCustomer || "-"}
                        </td>
                      )}
                      <td className={tableBodyCellClass}>
                        {resolveCustomerNama(
                          line.customerId,
                          line.jenis,
                          line.refId,
                        )}
                      </td>
                      <td className={tableBodyCellMutedClass}>
                        {gudangMap[line.gudangId]?.nama ?? "-"}
                      </td>
                      <td className={tableBodyCellRightClass}>
                        {line.qtySistem}
                      </td>
                      <td className={tableBodyCellRightClass}>
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
                        className={`${tableBodyCellRightClass} font-medium ${
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
          )}
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
