"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { DetailField, DocLink } from "@/components/shared/detail-field";
import { DocLineViewTable } from "@/components/shared/doc-line-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDocNo,
  findItem,
  findFinishGood,
  btbBatchName,
  findBtbDocument,
  withoutTransferBtbLines,
  syncBtbQtySisa,
} from "@/lib/mock/data";
import { JENIS_TRANSAKSI_BTB } from "@/lib/jenis-transaksi";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Btb, BtbLineFg, BtbLineItem } from "@/lib/types";
import { formatDateID, todayISO, uid, formatQty, formatKodeNama } from "@/lib/utils";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";

/** Opsi dropdown Jenis Transaksi BTB — `value` disimpan sebagai jenisTransaksiId. */
const JENIS_OPTIONS = JENIS_TRANSAKSI_BTB.map((o) => ({
  value: o.value,
  label: o.label,
}));

export default function BtbFormPage() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = rawId ?? "";
  const isNew = id === "baru";
  const router = useRouter();
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const gudangList = useDataStore((s) => s.gudangList);
  const upsertBtb = useDataStore((s) => s.upsertBtb);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const [lookupSettled, setLookupSettled] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const found = isNew ? undefined : findBtbDocument(btbs, id);
  const existing = found ? withoutTransferBtbLines(found) : undefined;
  const [editing, setEditing] = useState(false);
  const isView = !isNew && !editing;
  const notFound = !isNew && !existing;

  const [tanggal, setTanggal] = useState(
    existing?.tanggalTerima ?? todayISO(),
  );
  const [jenisId, setJenisId] = useState(
    existing?.jenisTransaksiId ?? JENIS_OPTIONS[0]?.value ?? "",
  );
  const [noPo, setNoPo] = useState(existing?.noPo ?? "");
  const [noSpk, setNoSpk] = useState(existing?.noSpk ?? "");
  const [batch, setBatch] = useState(isNew ? "" : btbBatchName(existing));
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [lineItems, setLineItems] = useState<BtbLineItem[]>(
    existing?.items ?? [],
  );
  const [lineFgs, setLineFgs] = useState<BtbLineFg[]>(existing?.fgs ?? []);
  const [customerId, setCustomerId] = useState(
    existing?.customerId ?? customers[0]?.id ?? "",
  );
  const [fotoBukti, setFotoBukti] = useState<UploadedFile[]>(
    (existing?.fotoBukti ?? []).map((dataUrl, i) => ({
      id: `foto-${i}`,
      name: `bukti-${i + 1}.jpg`,
      dataUrl,
    })),
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

  const jenisSelectItems = JENIS_OPTIONS;
  const itemSelectItems = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: formatKodeNama(i.kode, i.nama),
      })),
    [items],
  );
  const fgSelectItems = useMemo(
    () =>
      finishGoods.map((f) => ({
        value: f.id,
        label: formatKodeNama(f.kode, f.nama),
      })),
    [finishGoods],
  );
  const customerSelectItems = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.nama })),
    [customers],
  );
  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );
  const gudangSelectItems = useMemo(
    () => gudangList.map((g) => ({ value: g.id, label: g.nama })),
    [gudangList],
  );

  useEffect(() => {
    if (isNew) {
      setLookupSettled(true);
      return;
    }
    if (!id) {
      setLookupSettled(false);
      return;
    }
    let cancelled = false;
    setLookupSettled(false);
    void (async () => {
      if (!useDataStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useDataStore.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
          });
          if (useDataStore.persist.hasHydrated()) {
            unsubscribe();
            resolve();
          }
        });
      }
      if (!findBtbDocument(useDataStore.getState().btbs, id)) {
        await useDataStore.persist.rehydrate();
      }
      if (!cancelled) setLookupSettled(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  useEffect(() => {
    if (!lookupSettled || isNew || !existing) return;
    if (syncedId === existing.id) return;
    setTanggal(existing.tanggalTerima);
    setJenisId(existing.jenisTransaksiId);
    setNoPo(existing.noPo ?? "");
    setNoSpk(existing.noSpk ?? "");
    setBatch(btbBatchName(existing));
    setKeterangan(existing.keterangan ?? "");
    setCustomerId(existing.customerId ?? customers[0]?.id ?? "");
    setLineItems(existing.items ?? []);
    setLineFgs(existing.fgs ?? []);
    setFotoBukti(
      (existing.fotoBukti ?? []).map((dataUrl, i) => ({
        id: `foto-${i}`,
        name: `bukti-${i + 1}.jpg`,
        dataUrl,
      })),
    );
    setSyncedId(existing.id);
    if (id !== existing.id) {
      router.replace(`/transaksi/btb/${existing.id}`);
    }
  }, [customers, existing, id, isNew, lookupSettled, router, syncedId]);

  function resetFromExisting() {
    if (!existing) return;
    setTanggal(existing.tanggalTerima);
    setJenisId(existing.jenisTransaksiId);
    setNoPo(existing.noPo ?? "");
    setNoSpk(existing.noSpk ?? "");
    setBatch(btbBatchName(existing));
    setKeterangan(existing.keterangan ?? "");
    setCustomerId(existing.customerId ?? customers[0]?.id ?? "");
    setLineItems(existing.items ?? []);
    setLineFgs(existing.fgs ?? []);
    setFotoBukti(
      (existing.fotoBukti ?? []).map((dataUrl, i) => ({
        id: `foto-${i}`,
        name: `bukti-${i + 1}.jpg`,
        dataUrl,
      })),
    );
  }

  function addItemLine() {
    const item = items.find((i) => i.status === "aktif") ?? items[0];
    if (!item) return;
    setLineItems([
      ...lineItems,
      {
        itemId: item.id,
        batchCustomer: batch,
        qty: 0,
        satuan: item.uom1,
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
        batchCustomer: batch,
        qty: 0,
        satuan: fg.uom1,
        gudangId:
          gudangList.find((g) => g.tipe === "fg")?.id ?? gudangList[0]?.id ?? "",
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
      toast.error("Minimal satu baris Material atau FG");
      return;
    }
    const batchName = batch.trim();

    const no = existing?.no ?? formatDocNo("BTB", tanggal, btbs.length + 1);
    const payload: Btb = {
      id: existing?.id ?? uid("btb"),
      no,
      tanggalTerima: tanggal,
      jenisTransaksiId: jenisId,
      customerId,
      noPo,
      noSpk,
      batch: batchName,
      keterangan,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      fotoBukti: fotoBukti.map((f) => f.dataUrl),
      items: lineItems.map((line) => ({
        ...line,
        batchCustomer: batchName,
      })),
      fgs: lineFgs.map((line) => ({
        ...line,
        batchCustomer: batchName,
      })),
    };
    const [synced] = syncBtbQtySisa([payload], bkbs);

    upsertBtb(synced ?? payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: isNew ? "Buat BTB" : "Edit BTB",
      noTransaksi: payload.no,
      detail: "",
    });
    toast.success(`${payload.no} disimpan`);

    if (isNew) {
      router.push(`/transaksi/btb/${payload.id}`);
    } else {
      setEditing(false);
    }
  }

  if (!isNew && (!id || !lookupSettled)) {
    return (
      <div>
        <BackLink href="/transaksi/btb" />
        <PageHeader
          title="Memuat BTB"
          description="Mengambil dokumen dari data yang tersimpan."
        />
      </div>
    );
  }

  if (!isNew && existing && syncedId !== existing.id) {
    return (
      <div>
        <BackLink href="/transaksi/btb" />
        <PageHeader
          title="Memuat BTB"
          description="Mengambil dokumen dari data yang tersimpan."
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <BackLink href="/transaksi/btb" />
        <PageHeader
          title="BTB tidak ditemukan"
          description="Dokumen yang diminta tidak ada di data."
          action={
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => router.push("/transaksi/btb")}
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
      <BackLink href="/transaksi/btb" />
      <PageHeader
        title={isNew ? "Buat BTB" : (existing?.no ?? "BTB")}
        description="Catat barang yang diterima dari customer ke gudang. Material di bagian atas, finish good di bawah."
        action={
          !isNew && existing ? (
            <div className="flex flex-wrap gap-2">
              {isView ? (
                <>
                  <Button asChild variant="outline">
                    <Link href={`/print/btb/${id}`} target="_blank">
                      Cetak
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetFromExisting();
                      setEditing(false);
                    }}
                  >
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

      {isView ? (
        <div className="mb-4 grid gap-3 rounded-xl border border-border/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="No. BTB" value={existing?.no} />
          <DetailField
            label="Tanggal Terima"
            value={formatDateID(tanggal)}
          />
          <DetailField
            label="Jenis Transaksi"
            value={jenisMap[jenisId]?.nama}
          />
          <DetailField
            label="Customer"
            value={
              customerId ? (
                <DocLink href={`/master/customer/${customerId}`}>
                  {custMap[customerId]?.nama ?? "-"}
                </DocLink>
              ) : (
                "-"
              )
            }
          />
          <DetailField label="No PO" value={noPo} />
          <DetailField label="No SPK" value={noSpk} />
          <DetailField label="Batch" value={batch || "-"} />
          <DetailField
            className="sm:col-span-2 lg:col-span-4"
            label="Keterangan"
            value={
              <span className="whitespace-pre-wrap">{keterangan || "-"}</span>
            }
          />
        </div>
      ) : (
        <div className="mb-4 grid gap-3 rounded-xl border border-border/80 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>No. BTB</Label>
            <Input
              value={
                existing?.no ??
                formatDocNo("BTB", tanggal, btbs.length + 1) + " (preview)"
              }
              disabled
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal Terima</Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <SearchableCombobox
              items={customerSelectItems}
              value={customerId}
              onValueChange={(next) => setCustomerId(next ?? "")}
              placeholder="Cari nama customer..."
              emptyText="Tidak ada customer yang cocok"
              itemNoun="customer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>No PO</Label>
            <Input value={noPo} onChange={(e) => setNoPo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>No SPK</Label>
            <Input value={noSpk} onChange={(e) => setNoSpk(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Input
              value={batch}
              placeholder="Masukkan batch..."
              onChange={(e) => {
                const value = e.target.value;
                setBatch(value);
                setLineItems((lines) =>
                  lines.map((line) => ({ ...line, batchCustomer: value })),
                );
                setLineFgs((lines) =>
                  lines.map((line) => ({ ...line, batchCustomer: value })),
                );
              }}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label>Keterangan</Label>
            <Textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Material</CardTitle>
          {!isView && (
            <Button size="sm" variant="outline" onClick={addItemLine}>
              <Plus className="mr-1 size-4" /> Baris Material
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada baris material.</p>
          )}
          {isView ? (
            lineItems.length > 0 && (
              <DocLineViewTable
                nameHeader="Kode & Nama Material"
                rows={lineItems.map((line) => {
                  const item = findItem(line.itemId, items);
                  return {
                    name: item ? (
                      <ItemNameWithType jenis="item">
                        {formatKodeNama(item.kode, item.nama)}
                      </ItemNameWithType>
                    ) : (
                      line.itemId
                    ),
                    batch: line.batchCustomer,
                    qty: formatQty(line.qty, line.satuan),
                    gudang:
                      gudangMap[line.gudangId]?.nama ?? line.gudangId,
                    keterangan: line.keterangan,
                  };
                })}
              />
            )
          ) : (
            lineItems.map((line, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5"
              >
                <div className="sm:col-span-2">
                  <Label className="text-xs">Kode & Nama Material</Label>
                  <SearchableCombobox
                    items={itemSelectItems}
                    value={line.itemId}
                    onValueChange={(next) => {
                      const itemId = next ?? "";
                      const item = findItem(itemId, items);
                      const nextLines = [...lineItems];
                      nextLines[idx] = {
                        ...line,
                        itemId,
                        batchCustomer: batch,
                        satuan: item?.uom1 ?? "",
                      };
                      setLineItems(nextLines);
                    }}
                    renderItem={(item) => (
                      <ItemNameWithType jenis="item" className="w-full">
                        {item.label}
                      </ItemNameWithType>
                    )}
                    endAdornment={
                      line.itemId ? <ItemTypeBadge jenis="item" /> : null
                    }
                    placeholder="Cari material..."
                    emptyText="Tidak ada material yang cocok"
                    itemNoun="material"
                  />
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
                <div>
                  <Label className="text-xs">Gudang</Label>
                  <SearchableCombobox
                    items={gudangSelectItems}
                    value={line.gudangId}
                    onValueChange={(next) => {
                      const gudangId = next ?? "";
                      const nextLines = [...lineItems];
                      nextLines[idx] = { ...line, gudangId };
                      setLineItems(nextLines);
                    }}
                    placeholder="Cari gudang..."
                    emptyText="Tidak ada gudang yang cocok"
                    itemNoun="gudang"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Satuan / Ket.</Label>
                    <Input
                      value={line.keterangan}
                      placeholder={`${line.satuan}`}
                      onChange={(e) => {
                        const next = [...lineItems];
                        next[idx] = { ...line, keterangan: e.target.value };
                        setLineItems(next);
                      }}
                    />
                  </div>
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
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Finish Good</CardTitle>
          {!isView && (
            <Button size="sm" variant="outline" onClick={addFgLine}>
              <Plus className="mr-1 size-4" /> Baris FG
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lineFgs.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada baris FG.</p>
          )}
          {isView ? (
            lineFgs.length > 0 && (
              <DocLineViewTable
                nameHeader="Kode & Nama FG"
                rows={lineFgs.map((line) => {
                  const fg = findFinishGood(line.fgId, finishGoods);
                  return {
                    name: fg ? (
                      <ItemNameWithType jenis="fg">
                        {formatKodeNama(fg.kode, fg.nama)}
                      </ItemNameWithType>
                    ) : (
                      line.fgId
                    ),
                    batch: line.batchCustomer,
                    qty: formatQty(line.qty, line.satuan),
                    gudang:
                      gudangMap[line.gudangId]?.nama ?? line.gudangId,
                    keterangan: line.keterangan,
                  };
                })}
              />
            )
          ) : (
            lineFgs.map((line, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5"
              >
                <div className="sm:col-span-2">
                  <Label className="text-xs">Kode & Nama FG</Label>
                  <SearchableCombobox
                    items={fgSelectItems}
                    value={line.fgId}
                    onValueChange={(next) => {
                      const fgId = next ?? "";
                      const fg = findFinishGood(fgId, finishGoods);
                      const nextLines = [...lineFgs];
                      nextLines[idx] = {
                        ...line,
                        fgId,
                        batchCustomer: batch,
                        satuan: fg?.uom1 ?? "",
                      };
                      setLineFgs(nextLines);
                    }}
                    renderItem={(item) => (
                      <ItemNameWithType jenis="fg" className="w-full">
                        {item.label}
                      </ItemNameWithType>
                    )}
                    endAdornment={
                      line.fgId ? <ItemTypeBadge jenis="fg" /> : null
                    }
                    placeholder="Cari finish good..."
                    emptyText="Tidak ada finish good yang cocok"
                    itemNoun="finish good"
                  />
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
                <div>
                  <Label className="text-xs">Gudang</Label>
                  <SearchableCombobox
                    items={gudangSelectItems}
                    value={line.gudangId}
                    onValueChange={(next) => {
                      const gudangId = next ?? "";
                      const nextLines = [...lineFgs];
                      nextLines[idx] = { ...line, gudangId };
                      setLineFgs(nextLines);
                    }}
                    placeholder="Cari gudang..."
                    emptyText="Tidak ada gudang yang cocok"
                    itemNoun="gudang"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Keterangan</Label>
                    <Input
                      value={line.keterangan}
                      onChange={(e) => {
                        const next = [...lineFgs];
                        next[idx] = { ...line, keterangan: e.target.value };
                        setLineFgs(next);
                      }}
                    />
                  </div>
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
            ))
          )}
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Foto Bukti Fisik</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Bukti penerimaan barang"
            hint="Unggah foto barang yang diterima di gudang."
            files={fotoBukti}
            onChange={setFotoBukti}
            disabled={isView}
          />
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
