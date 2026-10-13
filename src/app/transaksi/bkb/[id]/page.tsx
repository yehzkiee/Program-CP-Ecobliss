"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { DetailField, DocLink } from "@/components/shared/detail-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDocNo, getLatestBomRevision, findItem, findFinishGood } from "@/lib/mock/data";
import { JENIS_TRANSAKSI_BKB } from "@/lib/jenis-transaksi";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Bkb, BkbLineFg, BkbLineItem } from "@/lib/types";
import { todayISO, uid, formatDateID, formatDateShort, formatQty, formatKodeNama } from "@/lib/utils";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";

/** Opsi dropdown Jenis Transaksi BKB — `value` disimpan sebagai jenisTransaksiId. */
const JENIS_OPTIONS = JENIS_TRANSAKSI_BKB.map((o) => ({
  value: o.value,
  label: o.label,
}));

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

/** Label ringkas No. BTB + tanggal agar muat di kolom sempit. */
function formatBtbSumberLabel(btbNo: string, tanggal?: string) {
  const no = (btbNo || "").trim() || "-";
  if (!tanggal) return no;
  return `${no} · ${formatDateShort(tanggal)}`;
}

export default function BkbFormPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const isNew = id === "baru";
  const router = useRouter();
  const bkbs = useDataStore((s) => s.bkbs);
  const btbs = useDataStore((s) => s.btbs);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const boms = useDataStore((s) => s.boms);
  const gudangList = useDataStore((s) => s.gudangList);
  const upsertBkb = useDataStore((s) => s.upsertBkb);
  const upsertBtb = useDataStore((s) => s.upsertBtb);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const existing = isNew ? undefined : bkbs.find((b) => b.id === id);
  const [editing, setEditing] = useState(false);
  const isView = !isNew && !editing;
  const notFound = !isNew && !existing;

  const [tanggal, setTanggal] = useState(
    existing?.tanggalKeluar ?? todayISO(),
  );
  const [jenisId, setJenisId] = useState(
    existing?.jenisTransaksiId ?? JENIS_OPTIONS[0]?.value ?? "",
  );
  const [noSpk, setNoSpk] = useState(existing?.noSpk ?? "");
  const [noPo, setNoPo] = useState(existing?.noPo ?? "");
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [gudangAsal, setGudangAsal] = useState(gudangList[0]?.id ?? "");
  const [bomId, setBomId] = useState(existing?.bomId ?? "");
  const [bomMultiplier, setBomMultiplier] = useState(
    existing?.bomMultiplier ?? 1,
  );
  const [lineItems, setLineItems] = useState<BkbLineItem[]>(
    existing?.items ?? [],
  );
  const [lineFgs, setLineFgs] = useState<BkbLineFg[]>(existing?.fgs ?? []);
  const [fotoBukti, setFotoBukti] = useState<UploadedFile[]>(
    (existing?.fotoBukti ?? []).map((dataUrl, i) => ({
      id: `foto-${i}`,
      name: `bukti-${i + 1}.jpg`,
      dataUrl,
    })),
  );

  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );
  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );
  const jenisMap = useMemo(
    () =>
      Object.fromEntries(JENIS_OPTIONS.map((j) => [j.value, { nama: j.label }])),
    [],
  );

  const gudangSelectItems = useMemo(
    () => gudangList.map((g) => ({ value: g.id, label: g.nama })),
    [gudangList],
  );
  const jenisSelectItems = JENIS_OPTIONS;
  const bomSelectItems = useMemo(
    () =>
      boms.map((b) => ({
        value: b.id,
        label: `${b.kode} - ${fgMap[b.fgId]?.nama ?? (b.keterangan || "BOM")}`,
      })),
    [boms, fgMap],
  );
  const itemSelectItems = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: `${i.kode} - ${i.nama}`,
      })),
    [items],
  );
  const fgSelectItems = useMemo(
    () =>
      finishGoods.map((f) => ({
        value: f.id,
        label: `${f.kode} - ${f.nama}`,
      })),
    [finishGoods],
  );

  const displayGudangId =
    lineItems[0]?.gudangId ?? lineFgs[0]?.gudangId ?? gudangAsal;

  const sources: BtbSourceOption[] = useMemo(() => {
    const opts: BtbSourceOption[] = [];
    for (const btb of btbs) {
      btb.items.forEach((line, idx) => {
        if (line.qtySisa <= 0) return;
        if (gudangAsal && line.gudangId !== gudangAsal) return;
        const item = findItem(line.itemId, items);
        opts.push({
          key: `${btb.id}-item-${idx}`,
          btbId: btb.id,
          btbNo: btb.no,
          tanggalTerima: btb.tanggalTerima,
          jenis: "item",
          refId: line.itemId,
          label: `${btb.no} · ${item ? formatKodeNama(item.kode, item.nama) : "Material"} (sisa ${line.qtySisa})`,
          batchCustomer: line.batchCustomer,
          satuan: line.satuan,
          gudangId: line.gudangId,
          qtySisa: line.qtySisa,
        });
      });
      btb.fgs.forEach((line, idx) => {
        if (line.qtySisa <= 0) return;
        if (gudangAsal && line.gudangId !== gudangAsal) return;
        const fg = findFinishGood(line.fgId, finishGoods);
        opts.push({
          key: `${btb.id}-fg-${idx}`,
          btbId: btb.id,
          btbNo: btb.no,
          tanggalTerima: btb.tanggalTerima,
          jenis: "fg",
          refId: line.fgId,
          label: `${btb.no} · ${fg ? formatKodeNama(fg.kode, fg.nama) : "FG"} (sisa ${line.qtySisa})`,
          batchCustomer: line.batchCustomer,
          satuan: line.satuan,
          gudangId: line.gudangId,
          qtySisa: line.qtySisa,
        });
      });
    }
    return opts;
  }, [btbs, finishGoods, gudangAsal, items]);

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
      toast.error("Tidak ada stok material di gudang ini");
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

  function cancelEdit() {
    if (!existing) return;
    setTanggal(existing.tanggalKeluar);
    setJenisId(existing.jenisTransaksiId);
    setNoSpk(existing.noSpk);
    setNoPo(existing.noPo ?? "");
    setKeterangan(existing.keterangan ?? "");
    setBomId(existing.bomId ?? "");
    setBomMultiplier(existing.bomMultiplier ?? 1);
    setLineItems(existing.items);
    setLineFgs(existing.fgs);
    setFotoBukti(
      (existing.fotoBukti ?? []).map((dataUrl, i) => ({
        id: `foto-${i}`,
        name: `bukti-${i + 1}.jpg`,
        dataUrl,
      })),
    );
    setGudangAsal(
      existing.items[0]?.gudangId ??
        existing.fgs[0]?.gudangId ??
        gudangList[0]?.id ??
        "",
    );
    setEditing(false);
  }

  function save() {
    if (lineItems.length === 0 && lineFgs.length === 0) {
      toast.error("Minimal satu baris pengeluaran");
      return;
    }
    for (const line of lineItems) {
      if (!line.btbId) {
        toast.error("Setiap baris Material wajib punya No. BTB");
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
      no: existing?.no ?? formatDocNo("BKB", tanggal, bkbs.length + 1),
      tanggalKeluar: tanggal,
      jenisTransaksiId: jenisId,
      noPo,
      noSpk,
      keterangan,
      bomId: bomId || undefined,
      bomMultiplier: bomId ? bomMultiplier : undefined,
      items: lineItems,
      fgs: lineFgs,
      fotoBukti: fotoBukti.map((f) => f.dataUrl),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsertBkb(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: isNew ? "Buat BKB" : "Edit BKB",
      noTransaksi: payload.no,
      detail: "",
    });
    toast.success(`${payload.no} disimpan`);
    if (isNew) {
      router.push(`/transaksi/bkb/${payload.id}`);
    } else {
      setEditing(false);
    }
  }

  const itemSources = sources.filter((s) => s.jenis === "item");
  const fgSources = sources.filter((s) => s.jenis === "fg");

  if (notFound) {
    return (
      <div>
        <BackLink href="/transaksi/bkb" />
        <PageHeader
          title="BKB tidak ditemukan"
          description="Dokumen yang diminta tidak ada di data."
          action={
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => router.push("/transaksi/bkb")}
            >
              Kembali ke daftar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      {confirmDialog}
      <BackLink href="/transaksi/bkb" />
      <PageHeader
        title={isNew ? "Buat BKB" : (existing?.no ?? "BKB")}
        description="Catat barang yang keluar dari gudang asal. Setiap baris harus memilih nomor BTB sumber agar sisa stok terhitung benar."
        action={
          !isNew && existing ? (
            <div className="flex flex-wrap gap-2">
              {isView ? (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(
                        `/print/bkb/${id}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Cetak
                  </Button>
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={cancelEdit}>
                    Batal
                  </Button>
                  <Button
                    className="bg-emerald-700 hover:bg-emerald-800"
                    onClick={save}
                  >
                    Simpan
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-border/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {isView ? (
          <>
            <DetailField label="No. BKB" value={existing?.no} />
            <DetailField label="Tanggal Keluar" value={formatDateID(tanggal)} />
            <DetailField
              label="Gudang Asal"
              value={gudangMap[displayGudangId]?.nama}
            />
            <DetailField
              label="Jenis Transaksi"
              value={jenisMap[jenisId]?.nama}
            />
            <DetailField label="No. SPK" value={noSpk} />
            <DetailField label="No PO" value={noPo} />
            <DetailField
              className="sm:col-span-2 lg:col-span-4"
              label="Keterangan"
              value={
                <span className="whitespace-pre-wrap">{keterangan || "-"}</span>
              }
            />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>No. BKB</Label>
              <Input
                disabled
                value={
                  existing?.no ??
                  formatDocNo("BKB", tanggal, bkbs.length + 1) + " (preview)"
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Keluar</Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gudang Asal</Label>
              <Select
                value={gudangAsal}
                onValueChange={(v) => setGudangAsal(v ?? "")}
                items={gudangSelectItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih gudang" />
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
                items={jenisSelectItems}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_OPTIONS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>No. SPK</Label>
              <Input
                value={noSpk}
                onChange={(e) => setNoSpk(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>No PO</Label>
              <Input value={noPo} onChange={(e) => setNoPo(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <Label>Keterangan</Label>
              <Textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}
      </div>

      {isNew && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50/40 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Ambil dari BOM</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 w-full flex-1 space-y-2 sm:min-w-[300px]">
              <Label htmlFor="bkb-bom-kode">Kode BOM</Label>
              <Select
                value={bomId}
                onValueChange={(v) => setBomId(v ?? "")}
                items={bomSelectItems}
              >
                <SelectTrigger
                  id="bkb-bom-kode"
                  className="h-8 w-full min-w-[300px] bg-white"
                >
                  <SelectValue placeholder="Pilih BOM">
                    {(() => {
                      const bom = boms.find((b) => b.id === bomId);
                      if (!bom) return undefined;
                      return `${bom.kode} - ${fgMap[bom.fgId]?.nama ?? (bom.keterangan || "BOM")}`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,36rem)]">
                  {boms.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.kode} -{" "}
                      {fgMap[b.fgId]?.nama ?? (b.keterangan || "BOM")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full shrink-0 space-y-2 sm:w-32">
              <Label htmlFor="bkb-bom-multiplier">Kalikan Qty</Label>
              <Input
                id="bkb-bom-multiplier"
                type="number"
                min={1}
                value={bomMultiplier}
                onChange={(e) =>
                  setBomMultiplier(Number(e.target.value) || 1)
                }
                className="h-8 bg-white"
              />
            </div>
            <div className="flex w-full shrink-0 sm:w-auto">
              <Button
                type="button"
                size="sm"
                className="h-8 w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto"
                onClick={applyBom}
              >
                <Wand2 className="mr-1 size-4" />
                Terapkan BOM
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Material</CardTitle>
          {!isView && (
            <Button size="sm" variant="outline" onClick={addManualItem}>
              <Plus className="mr-1 size-4" /> Baris Material
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.length === 0 && isView && (
            <p className="text-sm text-muted-foreground">Belum ada baris material.</p>
          )}
          {lineItems.map((line, idx) =>
            isView ? (
              <div
                key={idx}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <DetailField
                  label="Nama Material"
                  value={(() => {
                    const item = findItem(line.itemId, items);
                    return item ? (
                      <ItemNameWithType jenis="item">
                        {formatKodeNama(item.kode, item.nama)}
                      </ItemNameWithType>
                    ) : (
                      line.itemId || "-"
                    );
                  })()}
                />
                <DetailField
                  label="BTB Sumber"
                  value={
                    line.btbId ? (
                      <DocLink href={`/transaksi/btb/${line.btbId}`}>
                        {formatBtbSumberLabel(
                          line.btbNo || line.btbId,
                          line.btbTanggalTerima,
                        )}
                      </DocLink>
                    ) : (
                      formatBtbSumberLabel(line.btbNo, line.btbTanggalTerima)
                    )
                  }
                />
                <DetailField label="Batch" value={line.batchCustomer} />
                <DetailField
                  label="Qty"
                  value={formatQty(line.qty, line.satuan)}
                />
                <DetailField
                  label="Gudang Asal"
                  value={gudangMap[line.gudangId]?.nama}
                />
                <DetailField
                  label="Ket"
                  value={line.keterangan}
                  className="sm:col-span-2 lg:col-span-2"
                />
              </div>
            ) : (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border p-3 lg:grid-cols-8"
              >
                <div className="lg:col-span-2">
                  <Label className="text-xs">Nama Material</Label>
                  <Select
                    value={line.itemId}
                    items={itemSelectItems}
                    onValueChange={(v) => {
                      const vv = v ?? "";
                      const item = findItem(vv, items);
                      const src = itemSources.find((s) => s.refId === vv);
                      const next = [...lineItems];
                      next[idx] = {
                        ...line,
                        itemId: vv,
                        btbId: src?.btbId ?? "",
                        btbNo: src?.btbNo ?? "",
                        btbTanggalTerima: src?.tanggalTerima ?? "",
                        batchCustomer:
                          src?.batchCustomer ?? item?.batchCustomer ?? "",
                        satuan: src?.satuan ?? item?.uom1 ?? "",
                        gudangId: src?.gudangId ?? gudangAsal,
                      };
                      setLineItems(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih material">
                        {(() => {
                          const item = findItem(line.itemId, items);
                          return item ? (
                            <ItemNameWithType jenis="item">
                              {formatKodeNama(item.kode, item.nama)}
                            </ItemNameWithType>
                          ) : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          <ItemNameWithType jenis="item">
                            {i.kode} - {i.nama}
                          </ItemNameWithType>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 lg:col-span-3">
                  <Label className="text-xs">BTB Sumber</Label>
                  <Select
                    value={line.btbId}
                    items={itemSources
                      .filter((s) => s.refId === line.itemId)
                      .map((s) => ({
                        value: s.btbId,
                        label: formatBtbSumberLabel(s.btbNo, s.tanggalTerima),
                      }))}
                    onValueChange={(v) => {
                      const vv = v ?? "";
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
                      setLineItems(next);
                    }}
                  >
                    <SelectTrigger className="w-full min-w-[12rem]">
                      <SelectValue placeholder="Pilih No. BTB">
                        {line.btbId
                          ? formatBtbSumberLabel(
                              line.btbNo,
                              line.btbTanggalTerima,
                            )
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,28rem)]">
                      {itemSources
                        .filter((s) => s.refId === line.itemId)
                        .map((s) => (
                          <SelectItem key={s.key} value={s.btbId}>
                            {formatBtbSumberLabel(s.btbNo, s.tanggalTerima)}
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
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = { ...line, qty: Number(e.target.value) || 0 };
                      setLineItems(next);
                    }}
                  />
                </div>
                <div className="min-w-[7rem]">
                  <Label className="text-xs">Tgl Terima BTB</Label>
                  <Input
                    className="min-w-[7rem] tabular-nums"
                    value={
                      line.btbTanggalTerima
                        ? formatDateShort(line.btbTanggalTerima)
                        : ""
                    }
                    disabled
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      askConfirm(() => {
                        setLineItems(lineItems.filter((_, i) => i !== idx));
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Finish Good</CardTitle>
          {!isView && (
            <Button size="sm" variant="outline" onClick={addManualFg}>
              <Plus className="mr-1 size-4" /> Baris FG
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineFgs.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada baris FG.</p>
          )}
          {lineFgs.map((line, idx) =>
            isView ? (
              <div
                key={idx}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <DetailField
                  label="Nama Finish Good"
                  value={(() => {
                    const fg = findFinishGood(line.fgId, finishGoods);
                    return fg ? (
                      <ItemNameWithType jenis="fg">
                        {formatKodeNama(fg.kode, fg.nama)}
                      </ItemNameWithType>
                    ) : (
                      line.fgId || "-"
                    );
                  })()}
                />
                <DetailField
                  label="BTB Sumber"
                  value={
                    line.btbId ? (
                      <DocLink href={`/transaksi/btb/${line.btbId}`}>
                        {formatBtbSumberLabel(
                          line.btbNo || line.btbId,
                          line.btbTanggalTerima,
                        )}
                      </DocLink>
                    ) : (
                      formatBtbSumberLabel(line.btbNo, line.btbTanggalTerima)
                    )
                  }
                />
                <DetailField label="Batch" value={line.batchCustomer} />
                <DetailField
                  label="Qty"
                  value={formatQty(line.qty, line.satuan)}
                />
                <DetailField
                  label="Gudang Asal"
                  value={gudangMap[line.gudangId]?.nama}
                />
                <DetailField
                  label="Ket"
                  value={line.keterangan}
                  className="sm:col-span-2 lg:col-span-2"
                />
              </div>
            ) : (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border p-3 lg:grid-cols-8"
              >
                <div className="lg:col-span-2">
                  <Label className="text-xs">Nama Finish Good</Label>
                  <Select
                    value={line.fgId}
                    items={fgSelectItems}
                    onValueChange={(v) => {
                      const vv = v ?? "";
                      const fg = findFinishGood(vv, finishGoods);
                      const src = fgSources.find((s) => s.refId === vv);
                      const next = [...lineFgs];
                      next[idx] = {
                        ...line,
                        fgId: vv,
                        btbId: src?.btbId ?? "",
                        btbNo: src?.btbNo ?? "",
                        btbTanggalTerima: src?.tanggalTerima ?? "",
                        batchCustomer:
                          src?.batchCustomer ?? fg?.batchCustomer ?? "",
                        satuan: src?.satuan ?? fg?.uom1 ?? "",
                        gudangId: src?.gudangId ?? gudangAsal,
                      };
                      setLineFgs(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih FG">
                        {(() => {
                          const fg = findFinishGood(line.fgId, finishGoods);
                          return fg ? (
                            <ItemNameWithType jenis="fg">
                              {formatKodeNama(fg.kode, fg.nama)}
                            </ItemNameWithType>
                          ) : undefined;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {finishGoods.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <ItemNameWithType jenis="fg">
                            {f.kode} - {f.nama}
                          </ItemNameWithType>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 lg:col-span-3">
                  <Label className="text-xs">BTB Sumber</Label>
                  <Select
                    value={line.btbId}
                    items={fgSources
                      .filter((s) => s.refId === line.fgId)
                      .map((s) => ({
                        value: s.btbId,
                        label: formatBtbSumberLabel(s.btbNo, s.tanggalTerima),
                      }))}
                    onValueChange={(v) => {
                      const vv = v ?? "";
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
                      setLineFgs(next);
                    }}
                  >
                    <SelectTrigger className="w-full min-w-[12rem]">
                      <SelectValue placeholder="Pilih No. BTB">
                        {line.btbId
                          ? formatBtbSumberLabel(
                              line.btbNo,
                              line.btbTanggalTerima,
                            )
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,28rem)]">
                      {fgSources
                        .filter((s) => s.refId === line.fgId)
                        .map((s) => (
                          <SelectItem key={s.key} value={s.btbId}>
                            {formatBtbSumberLabel(s.btbNo, s.tanggalTerima)}
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
                    onChange={(e) => {
                      const next = [...lineFgs];
                      next[idx] = { ...line, qty: Number(e.target.value) || 0 };
                      setLineFgs(next);
                    }}
                  />
                </div>
                <div className="min-w-[7rem]">
                  <Label className="text-xs">Tgl Terima BTB</Label>
                  <Input
                    className="min-w-[7rem] tabular-nums"
                    value={
                      line.btbTanggalTerima
                        ? formatDateShort(line.btbTanggalTerima)
                        : ""
                    }
                    disabled
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      askConfirm(() => {
                        setLineFgs(lineFgs.filter((_, i) => i !== idx));
                      });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Foto Bukti Fisik</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Bukti pengeluaran barang"
            hint="Unggah foto barang yang dikeluarkan dari gudang."
            files={fotoBukti}
            onChange={setFotoBukti}
            disabled={isView}
          />
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
