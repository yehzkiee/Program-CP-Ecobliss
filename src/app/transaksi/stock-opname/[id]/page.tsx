"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/combobox";
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
import type {
  OpnameMetode,
  StockOpname,
  StockOpnameLine,
  StockRow,
} from "@/lib/types";
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
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { todayISO, uid } from "@/lib/utils";

type DraftLine = StockOpnameLine & { qtyAktualInput: number };

function metodeLabel(metode: OpnameMetode) {
  if (metode === "per_batch") return "Per Batch";
  if (metode === "per_gudang") return "Per Gudang";
  return "Per Material";
}

function metodeHint(metode: OpnameMetode) {
  if (metode === "per_batch") {
    return "Worksheet menampilkan stok per batch customer.";
  }
  if (metode === "per_gudang") {
    return "Worksheet menampilkan seluruh stok pada gudang yang dipilih, digabung per Material/FG.";
  }
  return "Worksheet menggabungkan stok per Material/FG dan gudang.";
}

function productKey(jenis: "item" | "fg", refId: string) {
  return `${jenis}:${refId}`;
}

function parseProductKey(key: string): { jenis: "item" | "fg"; refId: string } | null {
  const [jenis, refId] = key.split(":");
  if ((jenis !== "item" && jenis !== "fg") || !refId) return null;
  return { jenis, refId };
}

function draftLineKey(d: DraftLine, metode: OpnameMetode) {
  if (metode === "per_batch") {
    return `${d.jenis}-${d.refId}-${d.gudangId}-${d.batchCustomer ?? ""}`;
  }
  return `${d.jenis}-${d.refId}-${d.gudangId}`;
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

/** Semua stok di satu gudang, batch digabung per Material/FG. */
function buildDraftsFromGudang(stock: StockRow[], gudangId: string): DraftLine[] {
  const map = new Map<string, DraftLine>();
  for (const r of stock) {
    if (r.gudangId !== gudangId) continue;
    const key = `${r.jenis}-${r.refId}`;
    const prev = map.get(key);
    if (prev) {
      prev.qtySistem += r.qty;
      prev.qtyAktualInput += r.qty;
      continue;
    }
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
  return Array.from(map.values());
}

/** Zero-stock placeholder when barang belum punya stok di sistem. */
function buildEmptyDraft(
  key: string,
  items: { id: string; kode: string; nama: string; customerId: string }[],
  finishGoods: { id: string; kode: string; nama: string; customerId: string }[],
  gudangId: string,
): DraftLine | null {
  const parsed = parseProductKey(key);
  if (!parsed) return null;
  if (parsed.jenis === "item") {
    const item = items.find((i) => i.id === parsed.refId);
    if (!item) return null;
    return {
      jenis: "item",
      refId: item.id,
      kode: item.kode,
      nama: item.nama,
      customerId: item.customerId,
      gudangId,
      qtySistem: 0,
      qtyAktual: 0,
      selisih: 0,
      qtyAktualInput: 0,
    };
  }
  const fg = finishGoods.find((f) => f.id === parsed.refId);
  if (!fg) return null;
  return {
    jenis: "fg",
    refId: fg.id,
    kode: fg.kode,
    nama: fg.nama,
    customerId: fg.customerId,
    gudangId,
    qtySistem: 0,
    qtyAktual: 0,
    selisih: 0,
    qtyAktualInput: 0,
  };
}

export default function StockOpnameFormPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id ?? "";
  const isNew = id === "baru";
  const router = useRouter();
  const stockOpnames = useDataStore((s) => s.stockOpnames);
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const transfers = useDataStore((s) => s.transfers);
  const adjustments = useDataStore((s) => s.adjustments);
  const upsert = useDataStore((s) => s.upsertStockOpname);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const existing = isNew ? undefined : stockOpnames.find((s) => s.id === id);
  const notFound = !isNew && !existing;

  const [editing, setEditing] = useState(
    () => !isNew && searchParams.get("edit") === "1",
  );
  const isView = !isNew && !editing;

  const stock = useMemo(
    () =>
      buildStockRows({
        customers,
        items,
        finishGoods,
        gudangList,
        btbs,
        bkbs,
        transfers,
        adjustments,
      }),
    [
      customers,
      items,
      finishGoods,
      gudangList,
      btbs,
      bkbs,
      transfers,
      adjustments,
    ],
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
  const fallbackGudangId = gudangList[0]?.id ?? "";

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

  /** Pilihan barang: Material + Finish Good. Dicari lewat kode atau nama. */
  const productOptions = useMemo(() => {
    const fromStock = new Map<
      string,
      {
        value: string;
        label: string;
        kode: string;
        nama: string;
        jenis: "item" | "fg";
      }
    >();
    for (const r of stock) {
      const value = productKey(r.jenis, r.refId);
      if (!fromStock.has(value)) {
        fromStock.set(value, {
          value,
          kode: r.kode,
          nama: r.nama,
          jenis: r.jenis,
          label: `${r.kode} - ${r.nama}`,
        });
      }
    }
    for (const i of items.filter((x) => x.status === "aktif")) {
      const value = productKey("item", i.id);
      if (!fromStock.has(value)) {
        fromStock.set(value, {
          value,
          kode: i.kode,
          nama: i.nama,
          jenis: "item",
          label: `${i.kode} - ${i.nama}`,
        });
      }
    }
    for (const f of finishGoods.filter((x) => x.status === "aktif")) {
      const value = productKey("fg", f.id);
      if (!fromStock.has(value)) {
        fromStock.set(value, {
          value,
          kode: f.kode,
          nama: f.nama,
          jenis: "fg",
          label: `${f.kode} - ${f.nama}`,
        });
      }
    }
    return Array.from(fromStock.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "id"),
    );
  }, [stock, items, finishGoods]);

  const [tanggal, setTanggal] = useState(existing?.tanggal ?? todayISO());
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [metode, setMetode] = useState<OpnameMetode>(
    existing?.metode ?? "per_item",
  );
  const [pickerValue, setPickerValue] = useState("");
  const [drafts, setDrafts] = useState<DraftLine[]>(() => {
    if (existing) {
      return existing.lines.map((l) => ({
        ...l,
        qtyAktualInput: l.qtyAktual,
      }));
    }
    return [];
  });

  const selectedProductKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const d of drafts) keys.add(productKey(d.jenis, d.refId));
    return Array.from(keys);
  }, [drafts]);

  const selectedGudangIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of drafts) ids.add(d.gudangId);
    return Array.from(ids);
  }, [drafts]);

  const availableToAdd = useMemo(
    () =>
      productOptions.filter((p) => !selectedProductKeys.includes(p.value)),
    [productOptions, selectedProductKeys],
  );

  const gudangOptions = useMemo(
    () =>
      gudangList.map((g) => ({
        value: g.id,
        label: `${g.kode} - ${g.nama}`,
      })),
    [gudangList],
  );

  const availableGudang = useMemo(
    () => gudangOptions.filter((g) => !selectedGudangIds.includes(g.value)),
    [gudangOptions, selectedGudangIds],
  );

  function resetFromExisting() {
    if (!existing) return;
    setTanggal(existing.tanggal);
    setKeterangan(existing.keterangan);
    setMetode(existing.metode ?? "per_item");
    setDrafts(
      existing.lines.map((l) => ({
        ...l,
        qtyAktualInput: l.qtyAktual,
      })),
    );
    setPickerValue("");
  }

  function addGudang(gudangId: string) {
    if (!gudangId) return;
    if (selectedGudangIds.includes(gudangId)) {
      toast.error("Gudang sudah ada di worksheet");
      setPickerValue("");
      return;
    }
    const nextLines = buildDraftsFromGudang(stock, gudangId);
    if (nextLines.length === 0) {
      toast.error("Gudang tidak memiliki stok");
      setPickerValue("");
      return;
    }
    setDrafts((prev) => [...prev, ...nextLines]);
    setPickerValue("");
  }

  function removeGudang(gudangId: string) {
    setDrafts((prev) => prev.filter((d) => d.gudangId !== gudangId));
  }

  function addProduct(key: string) {
    if (!key) return;
    if (selectedProductKeys.includes(key)) {
      toast.error("Barang sudah ada di worksheet");
      setPickerValue("");
      return;
    }

    let nextLines = buildDraftsFromStock(stock, key, metode);
    if (nextLines.length === 0) {
      const empty = buildEmptyDraft(key, items, finishGoods, fallbackGudangId);
      if (!empty) {
        toast.error("Barang tidak ditemukan");
        setPickerValue("");
        return;
      }
      nextLines = [empty];
    }

    setDrafts((prev) => [...prev, ...nextLines]);
    setPickerValue("");
  }

  function removeProduct(key: string) {
    setDrafts((prev) =>
      prev.filter((d) => productKey(d.jenis, d.refId) !== key),
    );
  }

  function removeDraftRow(idx: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
  }

  function changeMetode(next: OpnameMetode) {
    if (next === metode) return;

    const prevByKey = new Map(
      drafts.map((d) => [draftLineKey(d, metode), d.qtyAktualInput]),
    );
    function withPrevQty(line: DraftLine) {
      const prevQty = prevByKey.get(draftLineKey(line, next));
      if (prevQty !== undefined) line.qtyAktualInput = prevQty;
      return line;
    }

    if (drafts.length === 0) {
      setMetode(next);
      setPickerValue("");
      return;
    }

    if (next === "per_gudang") {
      const rebuilt: DraftLine[] = [];
      for (const gudangId of selectedGudangIds) {
        for (const line of buildDraftsFromGudang(stock, gudangId)) {
          rebuilt.push(withPrevQty(line));
        }
      }
      setMetode(next);
      setDrafts(rebuilt);
      setPickerValue("");
      return;
    }

    if (metode === "per_gudang" && next === "per_item") {
      setMetode(next);
      setPickerValue("");
      return;
    }

    const gudangFilter =
      metode === "per_gudang" ? new Set(selectedGudangIds) : null;
    const rebuilt: DraftLine[] = [];
    for (const key of selectedProductKeys) {
      let lines = buildDraftsFromStock(stock, key, next);
      if (gudangFilter) {
        lines = lines.filter((line) => gudangFilter.has(line.gudangId));
      }
      if (lines.length === 0) {
        const empty = buildEmptyDraft(
          key,
          items,
          finishGoods,
          fallbackGudangId,
        );
        if (empty && (!gudangFilter || gudangFilter.has(empty.gudangId))) {
          lines = [empty];
        }
      }
      for (const line of lines) rebuilt.push(withPrevQty(line));
    }
    setMetode(next);
    setDrafts(rebuilt);
    setPickerValue("");
  }

  function save() {
    if (drafts.length === 0) {
      toast.error("Tambahkan minimal satu Material atau Finish Good");
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
      aksi: isNew ? "Stock Opname" : "Edit Stock Opname",
      detail: `${payload.no} (${lines.length} selisih)`,
    });
    toast.success(
      `SO ${payload.no} disimpan dengan ${lines.length} baris selisih`,
    );
    setEditing(false);
    router.push(`/transaksi/stock-opname/${payload.id}`);
  }

  const displayLines = isView ? (existing?.lines ?? []) : drafts;
  const showBatch =
    (!isView && metode === "per_batch") ||
    (isView &&
      (existing?.metode === "per_batch" ||
        existing?.lines.some((l) => l.batchCustomer)));

  if (notFound) {
    return (
      <div>
        <BackLink href="/transaksi/stock-opname" />
        <p className="text-sm text-muted-foreground">
          Stock Opname tidak ditemukan.
        </p>
      </div>
    );
  }

  return (
    <div>
      <BackLink href="/transaksi/stock-opname" />
      <PageHeader
        title={isNew ? "Buat Stock Opname" : `SO ${existing?.no ?? ""}`}
        description="Tambah beberapa Material dan/atau Finish Good, isi qty aktual. Hanya baris dengan selisih yang masuk transaksi."
        action={
          <div className="flex flex-wrap gap-2">
            {isView && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetFromExisting();
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
                <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
                  <Link href={`/transaksi/adjustment/baru?so=${id}`}>
                    Buat Adjustment
                  </Link>
                </Button>
              </>
            )}
            {editing && (
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
                  Simpan Perubahan
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tanggal</Label>
          {isView ? (
            <p className="text-sm text-slate-900">{tanggal}</p>
          ) : (
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Keterangan</Label>
          {isView ? (
            <p className="text-sm text-slate-900">{keterangan || "-"}</p>
          ) : (
            <Input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          )}
        </div>

        {!isView && (
          <>
            <div className="space-y-2 sm:col-span-2">
              <Label>Metode Opname</Label>
              <div className="flex flex-wrap gap-4 rounded-lg border border-border/80 px-3 py-2.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="metode-opname"
                    value="per_batch"
                    checked={metode === "per_batch"}
                    onChange={() => changeMetode("per_batch")}
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
                    onChange={() => changeMetode("per_item")}
                    className="size-4 accent-emerald-700"
                  />
                  Per Material
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="metode-opname"
                    value="per_gudang"
                    checked={metode === "per_gudang"}
                    onChange={() => changeMetode("per_gudang")}
                    className="size-4 accent-emerald-700"
                  />
                  Per Gudang
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{metodeHint(metode)}</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>
                {metode === "per_gudang"
                  ? "Tambah Gudang"
                  : "Tambah Barang (Material / Finish Good)"}
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  {metode === "per_gudang" ? (
                    <Select
                      value={pickerValue}
                      onValueChange={(v) => setPickerValue(v ?? "")}
                      items={availableGudang}
                    >
                      <SelectTrigger className="h-8 w-full bg-white">
                        <SelectValue placeholder="Pilih gudang..." />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,36rem)]">
                        {availableGudang.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Semua gudang sudah ditambahkan
                          </div>
                        ) : (
                          availableGudang.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <SearchableCombobox
                      items={availableToAdd}
                      value={pickerValue}
                      onValueChange={setPickerValue}
                      filterItem={(item, query) => {
                        const q = query.toLowerCase();
                        return (
                          item.kode.toLowerCase().includes(q) ||
                          item.nama.toLowerCase().includes(q)
                        );
                      }}
                      renderItem={(item) => (
                        <ItemNameWithType jenis={item.jenis}>
                          {item.label}
                        </ItemNameWithType>
                      )}
                      placeholder={
                        availableToAdd.length === 0
                          ? "Semua barang sudah ditambahkan"
                          : "Cari kode atau nama barang..."
                      }
                      emptyText="Tidak ada barang yang cocok"
                      disabled={availableToAdd.length === 0}
                      className="bg-white"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-emerald-700 hover:bg-emerald-800"
                  disabled={!pickerValue}
                  onClick={() =>
                    metode === "per_gudang"
                      ? addGudang(pickerValue)
                      : addProduct(pickerValue)
                  }
                >
                  <Plus className="mr-1 size-4" />
                  Tambah Baris
                </Button>
              </div>
              {metode === "per_gudang"
                ? selectedGudangIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedGudangIds.map((gudangId) => {
                        const gudang = gudangMap[gudangId];
                        const label = gudang
                          ? `${gudang.kode} - ${gudang.nama}`
                          : gudangId;
                        return (
                          <span
                            key={gudangId}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                          >
                            {label}
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:bg-white hover:text-destructive"
                              onClick={() => removeGudang(gudangId)}
                              aria-label={`Hapus ${label}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )
                : selectedProductKeys.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedProductKeys.map((key) => {
                        const opt = productOptions.find((p) => p.value === key);
                        const sample = drafts.find(
                          (d) => productKey(d.jenis, d.refId) === key,
                        );
                        const label =
                          opt?.label ??
                          (sample ? `${sample.kode} - ${sample.nama}` : key);
                        const jenis = opt?.jenis ?? sample?.jenis;
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs"
                          >
                            <ItemNameWithType jenis={jenis}>{label}</ItemNameWithType>
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:bg-white hover:text-destructive"
                              onClick={() => removeProduct(key)}
                              aria-label={`Hapus ${label}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
            </div>
          </>
        )}

        {isView && existing?.metode && (
          <div className="space-y-1 sm:col-span-2">
            <Label>Metode Opname</Label>
            <p className="text-sm text-slate-900">
              {metodeLabel(existing.metode)}
            </p>
          </div>
        )}
      </div>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {isView ? "Daftar Material dengan Selisih" : "Worksheet Opname"}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {displayLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isView
                ? "Tidak ada baris selisih."
                : metode === "per_gudang"
                  ? "Tambahkan gudang untuk mulai mengisi worksheet."
                  : "Tambahkan Material atau Finish Good untuk mulai mengisi worksheet."}
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
                {!isView && <col className="w-[56px]" />}
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
                  {!isView && (
                    <th className={tableHeadCellClass} />
                  )}
                </tr>
              </thead>
              <tbody>
                {displayLines.map((line, idx) => {
                  const aktual = isView
                    ? line.qtyAktual
                    : (line as DraftLine).qtyAktualInput;
                  const selisih = isView
                    ? line.selisih
                    : aktual - line.qtySistem;
                  return (
                    <tr key={idx} className="border-b last:border-0">
                      <td className={tableBodyCellClass}>
                        <ItemTypeBadge jenis={line.jenis} />
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
                        {isView ? (
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
                      {!isView && (
                        <td className={tableBodyCellClass}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => removeDraftRow(idx)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      )}
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
