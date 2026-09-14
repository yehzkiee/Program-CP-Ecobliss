"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
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
import { formatDocNo, getLatestBomRevision } from "@/lib/mock/data";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Bkb, BkbLineFg, BkbLineItem } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

type BtbSourceOption = {
  key: string;
  btbId: string;
  btbNo: string;
  tanggalTerima: string;
  jenis: "item" | "fg";
  refId: string;
  label: string;
  batchCustomer: string;
  satuan: string;
  gudangId: string;
  qtySisa: number;
};

export default function BkbFormPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "baru";
  const router = useRouter();
  const bkbs = useDataStore((s) => s.bkbs);
  const btbs = useDataStore((s) => s.btbs);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const boms = useDataStore((s) => s.boms);
  const gudangList = useDataStore((s) => s.gudangList);
  const jenisList = useDataStore((s) =>
    s.jenisTransaksiList.filter(
      (j) => j.untuk === "bkb" || j.untuk === "keduanya",
    ),
  );
  const upsertBkb = useDataStore((s) => s.upsertBkb);
  const upsertBtb = useDataStore((s) => s.upsertBtb);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);

  const existing = bkbs.find((b) => b.id === params.id);
  const readOnly = !isNew;

  const [tanggal, setTanggal] = useState(
    existing?.tanggalKeluar ?? todayISO(),
  );
  const [jenisId, setJenisId] = useState(
    existing?.jenisTransaksiId ?? jenisList[0]?.id ?? "",
  );
  const [noSpk, setNoSpk] = useState(existing?.noSpk ?? "");
  const [gudangAsal, setGudangAsal] = useState(gudangList[0]?.id ?? "");
  const [bomId, setBomId] = useState(existing?.bomId ?? "");
  const [bomMultiplier, setBomMultiplier] = useState(
    existing?.bomMultiplier ?? 1,
  );
  const [lineItems, setLineItems] = useState<BkbLineItem[]>(
    existing?.items ?? [],
  );
  const [lineFgs, setLineFgs] = useState<BkbLineFg[]>(existing?.fgs ?? []);

  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  const sources: BtbSourceOption[] = useMemo(() => {
    const opts: BtbSourceOption[] = [];
    for (const btb of btbs) {
      btb.items.forEach((line, idx) => {
        if (line.qtySisa <= 0) return;
        if (gudangAsal && line.gudangId !== gudangAsal) return;
        const item = itemMap[line.itemId];
        opts.push({
          key: `${btb.id}-item-${idx}`,
          btbId: btb.id,
          btbNo: btb.no,
          tanggalTerima: btb.tanggalTerima,
          jenis: "item",
          refId: line.itemId,
          label: `${btb.no} · ${item?.kode} (sisa ${line.qtySisa})`,
          batchCustomer: line.batchCustomer,
          satuan: line.satuan,
          gudangId: line.gudangId,
          qtySisa: line.qtySisa,
        });
      });
      btb.fgs.forEach((line, idx) => {
        if (line.qtySisa <= 0) return;
        if (gudangAsal && line.gudangId !== gudangAsal) return;
        const fg = fgMap[line.fgId];
        opts.push({
          key: `${btb.id}-fg-${idx}`,
          btbId: btb.id,
          btbNo: btb.no,
          tanggalTerima: btb.tanggalTerima,
          jenis: "fg",
          refId: line.fgId,
          label: `${btb.no} · ${fg?.kode} (sisa ${line.qtySisa})`,
          batchCustomer: line.batchCustomer,
          satuan: line.satuan,
          gudangId: line.gudangId,
          qtySisa: line.qtySisa,
        });
      });
    }
    return opts;
  }, [btbs, gudangAsal, itemMap, fgMap]);

  function allocateFromSources(
    jenis: "item" | "fg",
    refId: string,
    needQty: number,
  ): (BkbLineItem | BkbLineFg)[] {
    let remaining = needQty;
    const result: (BkbLineItem | BkbLineFg)[] = [];
    const matched = sources.filter(
      (s) => s.jenis === jenis && s.refId === refId,
    );
    for (const src of matched) {
      if (remaining <= 0) break;
      const take = Math.min(src.qtySisa, remaining);
      if (take <= 0) continue;
      result.push({
        ...(jenis === "item"
          ? { itemId: refId }
          : { fgId: refId }),
        btbId: src.btbId,
        btbNo: src.btbNo,
        btbTanggalTerima: src.tanggalTerima,
        batchCustomer: src.batchCustomer,
        qty: take,
        satuan: src.satuan,
        gudangId: src.gudangId,
        keterangan: take < needQty ? "Split multi-BTB" : "",
      } as BkbLineItem & BkbLineFg);
      remaining -= take;
    }
    if (remaining > 0) {
      toast.warning(
        `Stok BTB tidak cukup untuk ${jenis} ${refId}. Kurang ${remaining}.`,
      );
    }
    return result;
  }

  function applyBom() {
    const bom = boms.find((b) => b.id === bomId);
    if (!bom) {
      toast.error("Pilih BOM");
      return;
    }
    const latest = getLatestBomRevision(bom);
    if (!latest) return;

    const newItems: BkbLineItem[] = [];
    const newFgs: BkbLineFg[] = [];

    for (const line of latest.items) {
      const allocated = allocateFromSources(
        "item",
        line.itemId,
        line.qty * bomMultiplier,
      ) as BkbLineItem[];
      newItems.push(...allocated);
    }
    for (const line of latest.fgs) {
      const allocated = allocateFromSources(
        "fg",
        line.fgId,
        line.qty * bomMultiplier,
      ) as BkbLineFg[];
      newFgs.push(...allocated);
    }

    setLineItems(newItems);
    setLineFgs(newFgs);
    toast.success(
      `BOM diterapkan ×${bomMultiplier}. Multi-BTB otomatis jika stok kurang.`,
    );
  }

  function addManualItem() {
    const src = sources.find((s) => s.jenis === "item");
    if (!src) {
      toast.error("Tidak ada stok item di gudang ini");
      return;
    }
    setLineItems([
      ...lineItems,
      {
        itemId: src.refId,
        btbId: src.btbId,
        btbNo: src.btbNo,
        btbTanggalTerima: src.tanggalTerima,
        batchCustomer: src.batchCustomer,
        qty: 1,
        satuan: src.satuan,
        gudangId: src.gudangId,
        keterangan: "",
      },
    ]);
  }

  function addManualFg() {
    const src = sources.find((s) => s.jenis === "fg");
    if (!src) {
      toast.error("Tidak ada stok FG di gudang ini");
      return;
    }
    setLineFgs([
      ...lineFgs,
      {
        fgId: src.refId,
        btbId: src.btbId,
        btbNo: src.btbNo,
        btbTanggalTerima: src.tanggalTerima,
        batchCustomer: src.batchCustomer,
        qty: 1,
        satuan: src.satuan,
        gudangId: src.gudangId,
        keterangan: "",
      },
    ]);
  }

  function save() {
    if (lineItems.length === 0 && lineFgs.length === 0) {
      toast.error("Minimal satu baris pengeluaran");
      return;
    }
    for (const line of lineItems) {
      if (!line.btbId) {
        toast.error("Setiap baris Item wajib punya No. BTB");
        return;
      }
    }
    for (const line of lineFgs) {
      if (!line.btbId) {
        toast.error("Setiap baris FG wajib punya No. BTB");
        return;
      }
    }

    // Deduct qtySisa from BTB (mock)
    const nextBtbs = structuredClone(btbs);
    for (const line of lineItems) {
      const btb = nextBtbs.find((b) => b.id === line.btbId);
      const src = btb?.items.find((i) => i.itemId === line.itemId);
      if (src) src.qtySisa = Math.max(0, src.qtySisa - line.qty);
    }
    for (const line of lineFgs) {
      const btb = nextBtbs.find((b) => b.id === line.btbId);
      const src = btb?.fgs.find((i) => i.fgId === line.fgId);
      if (src) src.qtySisa = Math.max(0, src.qtySisa - line.qty);
    }
    nextBtbs.forEach(upsertBtb);

    const payload: Bkb = {
      id: existing?.id ?? uid("bkb"),
      no: existing?.no ?? formatDocNo(tanggal, bkbs.length + 1),
      tanggalKeluar: tanggal,
      jenisTransaksiId: jenisId,
      noSpk,
      bomId: bomId || undefined,
      bomMultiplier: bomId ? bomMultiplier : undefined,
      items: lineItems,
      fgs: lineFgs,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsertBkb(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: "Buat BKB",
      detail: payload.no,
    });
    toast.success(`BKB ${payload.no} disimpan`);
    router.push(`/transaksi/bkb/${payload.id}`);
  }

  const itemSources = sources.filter((s) => s.jenis === "item");
  const fgSources = sources.filter((s) => s.jenis === "fg");

  return (
    <div>
      <BackLink href="/transaksi/bkb" />
      <PageHeader
        title={isNew ? "Buat BKB" : `BKB ${existing?.no}`}
        description="Pilih gudang asal → jenis transaksi → barang. Wajib No. BTB sumber."
        action={
          !isNew ? (
            <Button asChild variant="outline">
              <Link href={`/print/bkb/${params.id}`} target="_blank">
                Cetak
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-border/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>No. BKB</Label>
          <Input
            disabled
            value={
              existing?.no ??
              formatDocNo(tanggal, bkbs.length + 1) + " (preview)"
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Tanggal Keluar</Label>
          <Input
            type="date"
            value={tanggal}
            disabled={readOnly}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Gudang Asal</Label>
          <Select
            value={gudangAsal}
            onValueChange={(v) => setGudangAsal(v ?? "")}
            disabled={readOnly}
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
        <div className="space-y-2">
          <Label>No. SPK</Label>
          <Input
            value={noSpk}
            disabled={readOnly}
            onChange={(e) => setNoSpk(e.target.value)}
          />
        </div>
      </div>

      {isNew && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50/40 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Ambil dari BOM</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Kode BOM</Label>
              <Select value={bomId} onValueChange={(v) => setBomId(v ?? "")}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Pilih BOM" />
                </SelectTrigger>
                <SelectContent>
                  {boms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.kode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-2 sm:w-32">
              <Label>Kalikan Qty</Label>
              <Input
                type="number"
                min={1}
                value={bomMultiplier}
                onChange={(e) =>
                  setBomMultiplier(Number(e.target.value) || 1)
                }
                className="bg-white"
              />
            </div>
            <Button
              type="button"
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={applyBom}
            >
              <Wand2 className="mr-1 size-4" />
              Terapkan BOM
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Item (Atas)</CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={addManualItem}>
              <Plus className="mr-1 size-4" /> Baris Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border p-3 lg:grid-cols-7"
            >
              <div className="lg:col-span-2">
                <Label className="text-xs">Item</Label>
                <Select
                  value={line.itemId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const src = itemSources.find((s) => s.refId === vv);
                    const next = [...lineItems];
                    next[idx] = {
                      ...line,
                      itemId: vv,
                      btbId: src?.btbId ?? "",
                      btbNo: src?.btbNo ?? "",
                      btbTanggalTerima: src?.tanggalTerima ?? "",
                      batchCustomer: src?.batchCustomer ?? "",
                      satuan: src?.satuan ?? "",
                      gudangId: src?.gudangId ?? gudangAsal,
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
              <div className="lg:col-span-2">
                <Label className="text-xs">BTB Item (sumber)</Label>
                <Select
                  value={line.btbId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const src = itemSources.find(
                      (s) => s.btbId === vv && s.refId === line.itemId,
                    );
                    const next = [...lineItems];
                    next[idx] = {
                      ...line,
                      btbId: vv,
                      btbNo: src?.btbNo ?? "",
                      btbTanggalTerima: src?.tanggalTerima ?? "",
                      batchCustomer: src?.batchCustomer ?? line.batchCustomer,
                      gudangId: src?.gudangId ?? line.gudangId,
                    };
                    setLineItems(next);}}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih BTB" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemSources
                      .filter((s) => s.refId === line.itemId)
                      .map((s) => (
                        <SelectItem key={s.key} value={s.btbId}>
                          {s.label} · tgl {s.tanggalTerima}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                <Label className="text-xs">Tgl Terima BTB</Label>
                <Input value={line.btbTanggalTerima} disabled />
              </div>
              <div className="flex items-end">
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
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Finish Good (Bawah)</CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={addManualFg}>
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
              className="grid gap-2 rounded-lg border p-3 lg:grid-cols-7"
            >
              <div className="lg:col-span-2">
                <Label className="text-xs">FG</Label>
                <Select
                  value={line.fgId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const src = fgSources.find((s) => s.refId === vv);
                    const next = [...lineFgs];
                    next[idx] = {
                      ...line,
                      fgId: vv,
                      btbId: src?.btbId ?? "",
                      btbNo: src?.btbNo ?? "",
                      btbTanggalTerima: src?.tanggalTerima ?? "",
                      batchCustomer: src?.batchCustomer ?? "",
                      satuan: src?.satuan ?? "",
                      gudangId: src?.gudangId ?? gudangAsal,
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
              <div className="lg:col-span-2">
                <Label className="text-xs">BTB FG (sumber)</Label>
                <Select
                  value={line.btbId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const src = fgSources.find(
                      (s) => s.btbId === vv && s.refId === line.fgId,
                    );
                    const next = [...lineFgs];
                    next[idx] = {
                      ...line,
                      btbId: vv,
                      btbNo: src?.btbNo ?? "",
                      btbTanggalTerima: src?.tanggalTerima ?? "",
                    };
                    setLineFgs(next);}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fgSources
                      .filter((s) => s.refId === line.fgId)
                      .map((s) => (
                        <SelectItem key={s.key} value={s.btbId}>
                          {s.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
                <Label className="text-xs">Tgl Terima BTB</Label>
                <Input value={line.btbTanggalTerima} disabled />
              </div>
              <div className="flex items-end">
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
          Simpan BKB
        </Button>
      )}
    </div>
  );
}
