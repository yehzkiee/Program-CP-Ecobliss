"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { formatDocNo } from "@/lib/mock/data";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Btb, BtbLineFg, BtbLineItem } from "@/lib/types";
import { formatDateID, todayISO, uid } from "@/lib/utils";

export default function BtbFormPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "baru";
  const router = useRouter();
  const btbs = useDataStore((s) => s.btbs);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const jenisList = useDataStore((s) =>
    s.jenisTransaksiList.filter(
      (j) => j.untuk === "btb" || j.untuk === "keduanya",
    ),
  );
  const upsertBtb = useDataStore((s) => s.upsertBtb);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);

  const existing = btbs.find((b) => b.id === params.id);
  const readOnly = !isNew;

  const [tanggal, setTanggal] = useState(
    existing?.tanggalTerima ?? todayISO(),
  );
  const [jenisId, setJenisId] = useState(
    existing?.jenisTransaksiId ?? jenisList[0]?.id ?? "",
  );
  const [lineItems, setLineItems] = useState<BtbLineItem[]>(
    existing?.items ?? [],
  );
  const [lineFgs, setLineFgs] = useState<BtbLineFg[]>(existing?.fgs ?? []);

  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );
  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

  function addItemLine() {
    const item = items.find((i) => i.status === "aktif") ?? items[0];
    if (!item) return;
    setLineItems([
      ...lineItems,
      {
        itemId: item.id,
        batchCustomer: item.batchCustomer,
        qty: 0,
        satuan: item.uom,
        gudangId: gudangList[0]?.id ?? "",
        keterangan: "",
        qtySisa: 0,
      },
    ]);
  }

  function addFgLine() {
    const fg = finishGoods.find((f) => f.status === "aktif") ?? finishGoods[0];
    if (!fg) return;
    setLineFgs([
      ...lineFgs,
      {
        fgId: fg.id,
        batchCustomer: fg.batchCustomer,
        qty: 0,
        satuan: fg.uom,
        gudangId: gudangList.find((g) => g.tipe === "fg")?.id ?? gudangList[0]?.id ?? "",
        keterangan: "",
        qtySisa: 0,
      },
    ]);
  }

  function save() {
    if (!jenisId) {
      toast.error("Pilih jenis transaksi");
      return;
    }
    if (lineItems.length === 0 && lineFgs.length === 0) {
      toast.error("Minimal satu baris Item atau FG");
      return;
    }

    const no = existing?.no ?? formatDocNo(tanggal, btbs.length + 1);
    const payload: Btb = {
      id: existing?.id ?? uid("btb"),
      no,
      tanggalTerima: tanggal,
      jenisTransaksiId: jenisId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      items: lineItems.map((l) => ({
        ...l,
        qtySisa: isNew ? l.qty : l.qtySisa,
      })),
      fgs: lineFgs.map((l) => ({
        ...l,
        qtySisa: isNew ? l.qty : l.qtySisa,
      })),
    };

    upsertBtb(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: "Buat BTB",
      detail: payload.no,
    });
    toast.success(`BTB ${payload.no} disimpan`);
    router.push(`/transaksi/btb/${payload.id}`);
  }

  return (
    <div>
      <BackLink href="/transaksi/btb" />
      <PageHeader
        title={isNew ? "Buat BTB" : `BTB ${existing?.no}`}
        description="Penerimaan barang ke gudang tujuan."
        action={
          !isNew ? (
            <Button asChild variant="outline">
              <Link href={`/print/btb/${params.id}`} target="_blank">
                Cetak
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-border/80 bg-white p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>No. BTB</Label>
          <Input
            value={
              existing?.no ??
              formatDocNo(tanggal, btbs.length + 1) + " (preview)"
            }
            disabled
          />
        </div>
        <div className="space-y-2">
          <Label>Tanggal Terima</Label>
          <Input
            type="date"
            value={tanggal}
            disabled={readOnly}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Jenis Transaksi</Label>
          <Select
            value={jenisId}
            onValueChange={(v) => setJenisId(v ?? "")}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jenisList.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Item (Atas)</CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={addItemLine}>
              <Plus className="mr-1 size-4" /> Baris Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada baris item.</p>
          )}
          {lineItems.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6"
            >
              <div className="sm:col-span-2">
                <Label className="text-xs">Kode & Nama Item</Label>
                <Select
                  value={line.itemId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const item = itemMap[vv];
                    const next = [...lineItems];
                    next[idx] = {
                      ...line,
                      itemId: vv,
                      batchCustomer: item?.batchCustomer ?? "",
                      satuan: item?.uom ?? "",
                    };
                    setLineItems(next);}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.kode} — {i.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Batch Cust</Label>
                <Input
                  value={line.batchCustomer}
                  disabled={readOnly}
                  onChange={(e) => {
                    const next = [...lineItems];
                    next[idx] = { ...line, batchCustomer: e.target.value };
                    setLineItems(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={line.qty}
                  disabled={readOnly}
                  onChange={(e) => {
                    const next = [...lineItems];
                    next[idx] = { ...line, qty: Number(e.target.value) || 0 };
                    setLineItems(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Gudang</Label>
                <Select
                  value={line.gudangId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? ""; 
                    const next = [...lineItems];
                    next[idx] = { ...line, gudangId: vv };
                    setLineItems(next);
                   }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gudangList.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Satuan / Ket.</Label>
                  <Input
                    value={line.keterangan}
                    disabled={readOnly}
                    placeholder={`${line.satuan}`}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = { ...line, keterangan: e.target.value };
                      setLineItems(next);
                    }}
                  />
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setLineItems(lineItems.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              {readOnly && (
                <p className="text-xs text-muted-foreground sm:col-span-6">
                  Qty sisa: {line.qtySisa} · Gudang:{" "}
                  {gudangMap[line.gudangId]?.nama}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Finish Good (Bawah)</CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={addFgLine}>
              <Plus className="mr-1 size-4" /> Baris FG
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineFgs.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada baris FG.</p>
          )}
          {lineFgs.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6"
            >
              <div className="sm:col-span-2">
                <Label className="text-xs">Kode & Nama FG</Label>
                <Select
                  value={line.fgId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const fg = fgMap[vv];
                    const next = [...lineFgs];
                    next[idx] = {
                      ...line,
                      fgId: vv,
                      batchCustomer: fg?.batchCustomer ?? "",
                      satuan: fg?.uom ?? "",
                    };
                    setLineFgs(next);}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {finishGoods.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.kode} — {f.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Batch Cust</Label>
                <Input
                  value={line.batchCustomer}
                  disabled={readOnly}
                  onChange={(e) => {
                    const next = [...lineFgs];
                    next[idx] = { ...line, batchCustomer: e.target.value };
                    setLineFgs(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={line.qty}
                  disabled={readOnly}
                  onChange={(e) => {
                    const next = [...lineFgs];
                    next[idx] = { ...line, qty: Number(e.target.value) || 0 };
                    setLineFgs(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Gudang</Label>
                <Select
                  value={line.gudangId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? ""; 
                    const next = [...lineFgs];
                    next[idx] = { ...line, gudangId: vv };
                    setLineFgs(next);
                   }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gudangList.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Keterangan</Label>
                  <Input
                    value={line.keterangan}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = [...lineFgs];
                      next[idx] = { ...line, keterangan: e.target.value };
                      setLineFgs(next);
                    }}
                  />
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setLineFgs(lineFgs.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isNew && (
        <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
          Simpan BTB
        </Button>
      )}
      {existing && (
        <p className="text-xs text-muted-foreground">
          Dibuat {formatDateID(existing.createdAt)}
        </p>
      )}
    </div>
  );
}
