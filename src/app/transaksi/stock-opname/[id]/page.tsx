"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveInput } from "@/components/ui/responsive-input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildStockRows,
  formatDocNo,
  listBtbBatchStock,
  type BtbBatchStock,
} from "@/lib/mock/data";
import { batchLabel } from "@/lib/batches";
import {
  barangKey,
  buildBarangOptions,
  compareBarangOption,
  filterBarangByKodeNama,
} from "@/lib/barang-options";
import { useAuthStore, useDataStore } from "@/lib/store";
import type {
  FinishGood,
  OpnameMetode,
  StockOpname,
  StockOpnameLine,
  StockRow,
} from "@/lib/types";
import {
  colGroupOpnameWithBatch,
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
  if (metode === "per_finish_good") return "Per Finish Good";
  return "Per Material";
}

function metodeHint(metode: OpnameMetode) {
  if (metode === "per_batch") {
    return "Worksheet menampilkan stok per batch customer.";
  }
  if (metode === "per_gudang") {
    return "Worksheet menampilkan seluruh stok pada gudang yang dipilih, digabung per Material/FG.";
  }
  if (metode === "per_finish_good") {
    return "Worksheet otomatis memuat seluruh Finish Good di Gudang FG, per Batch / No. BTB.";
  }
  return "Worksheet menggabungkan stok per Material/FG dan gudang.";
}

function productKey(jenis: "item" | "fg", refId: string) {
  return barangKey(jenis, refId);
}

function parseProductKey(key: string): { jenis: "item" | "fg"; refId: string } | null {
  const [jenis, refId] = key.split(":");
  if ((jenis !== "item" && jenis !== "fg") || !refId) return null;
  return { jenis, refId };
}

function draftLineKey(d: DraftLine, metode: OpnameMetode) {
  if (metode === "per_batch" || metode === "per_finish_good") {
    return `${d.jenis}-${d.refId}-${d.gudangId}-${d.batchCustomer ?? ""}-${d.btbId ?? ""}`;
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

/** Seluruh lot Finish Good di Gudang FG (per Batch / No. BTB). */
function buildDraftsFromFinishGood(
  batchStock: BtbBatchStock[],
  finishGoods: FinishGood[],
  gudangFgIds: Set<string>,
): DraftLine[] {
  const fgMap = Object.fromEntries(finishGoods.map((f) => [f.id, f]));
  const lines: DraftLine[] = [];
  for (const lot of batchStock) {
    if (lot.jenis !== "fg") continue;
    if (!gudangFgIds.has(lot.gudangId)) continue;
    if (lot.qty <= 0) continue;
    const fg = fgMap[lot.refId];
    if (!fg) continue;
    lines.push({
      jenis: "fg",
      refId: lot.refId,
      kode: fg.kode,
      nama: fg.nama,
      customerId: lot.customerId || fg.customerId,
      gudangId: lot.gudangId,
      batchCustomer: lot.batchCustomer,
      btbId: lot.btbId,
      btbNo: lot.btbNo,
      qtySistem: lot.qty,
      qtyAktual: lot.qty,
      selisih: 0,
      qtyAktualInput: lot.qty,
    });
  }
  return lines.sort(
    (a, b) =>
      a.kode.localeCompare(b.kode, "id") ||
      (a.btbNo ?? "").localeCompare(b.btbNo ?? "", "id") ||
      (a.batchCustomer ?? "").localeCompare(b.batchCustomer ?? "", "id"),
  );
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
  const batchStock = useMemo(
    () => listBtbBatchStock({ btbs, bkbs, transfers, adjustments }),
    [adjustments, bkbs, btbs, transfers],
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

  function lotsForOpname(line: {
    jenis: "item" | "fg";
    refId: string;
    gudangId: string;
  }) {
    return batchStock
      .filter(
        (lot) =>
          lot.jenis === line.jenis &&
          lot.refId === line.refId &&
          lot.gudangId === line.gudangId &&
          lot.qty > 0 &&
          lot.btbId.trim() !== "",
      )
      .sort(
        (a, b) =>
          a.btbNo.localeCompare(b.btbNo) ||
          a.batchCustomer.localeCompare(b.batchCustomer),
      );
  }

  function opnameLotLabel(lot: BtbBatchStock) {
    const no = lot.btbNo.trim() || "-";
    const batch =
      (batchLabel(lot.batchCustomer, btbs) || lot.batchCustomer).trim() || "-";
    return `${no} - ${batch} - (Stok: ${lot.qty})`;
  }

  function applyOpnameLot(line: DraftLine, lot: BtbBatchStock): DraftLine {
    const followSistem = line.qtyAktualInput === line.qtySistem;
    const qtyAktualInput = followSistem ? lot.qty : line.qtyAktualInput;
    return {
      ...line,
      btbId: lot.btbId,
      btbNo: lot.btbNo,
      batchCustomer: lot.batchCustomer,
      gudangId: lot.gudangId,
      qtySistem: lot.qty,
      qtyAktual: qtyAktualInput,
      qtyAktualInput,
    };
  }

  function withDefaultLot(line: DraftLine): DraftLine {
    const lots = lotsForOpname(line);
    const preferred =
      lots.find(
        (lot) =>
          (!line.batchCustomer || lot.batchCustomer === line.batchCustomer) &&
          (!line.btbId || lot.btbId === line.btbId),
      ) ?? lots[0];
    if (!preferred) return line;
    return applyOpnameLot({ ...line, qtyAktualInput: line.qtySistem }, preferred);
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

  /** Pilihan barang: master Material + Finish Good (digabung), plus yang masih ada di stok. */
  const productOptions = useMemo(() => {
    const merged = new Map(
      buildBarangOptions(items, finishGoods).map((opt) => [opt.value, opt]),
    );
    for (const r of stock) {
      const value = productKey(r.jenis, r.refId);
      if (merged.has(value)) continue;
      merged.set(value, {
        value,
        kode: r.kode,
        nama: r.nama,
        jenis: r.jenis,
        label: `${r.kode} - ${r.nama}`,
      });
    }
    return Array.from(merged.values()).sort(compareBarangOption);
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

  const gudangFgIds = useMemo(
    () =>
      new Set(gudangList.filter((g) => g.tipe === "fg").map((g) => g.id)),
    [gudangList],
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
    const nextLines = buildDraftsFromGudang(stock, gudangId).map(withDefaultLot);
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

    let nextLines = buildDraftsFromStock(stock, key, metode).map(withDefaultLot);
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

  function loadFinishGoodWorksheet(preserveQty = false): DraftLine[] {
    if (gudangFgIds.size === 0) {
      toast.error("Gudang Finish Good tidak ditemukan");
      return [];
    }
    const prevByKey = preserveQty
      ? new Map(
          drafts.map((d) => [
            draftLineKey(d, "per_finish_good"),
            d.qtyAktualInput,
          ]),
        )
      : null;
    const lines = buildDraftsFromFinishGood(
      batchStock,
      finishGoods,
      gudangFgIds,
    ).map((line) => {
      if (prevByKey) {
        const prevQty = prevByKey.get(draftLineKey(line, "per_finish_good"));
        if (prevQty !== undefined) line.qtyAktualInput = prevQty;
      }
      return line;
    });
    if (lines.length === 0) {
      toast.error("Tidak ada stok Finish Good di Gudang FG");
    }
    return lines;
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

    if (next === "per_finish_good") {
      setMetode(next);
      setDrafts(loadFinishGoodWorksheet(drafts.length > 0));
      setPickerValue("");
      return;
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
          rebuilt.push(withDefaultLot(withPrevQty(line)));
        }
      }
      setMetode(next);
      setDrafts(rebuilt);
      setPickerValue("");
      return;
    }

    if (
      (metode === "per_gudang" || metode === "per_finish_good") &&
      next === "per_item"
    ) {
      setMetode(next);
      setPickerValue("");
      return;
    }

    const gudangFilter =
      metode === "per_gudang" || metode === "per_finish_good"
        ? new Set(selectedGudangIds)
        : null;
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
      for (const line of lines) rebuilt.push(withDefaultLot(withPrevQty(line)));
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
        btbId: d.btbId,
        btbNo: d.btbNo,
        qtySistem: d.qtySistem,
        qtyAktual: d.qtyAktualInput,
        selisih: d.qtyAktualInput - d.qtySistem,
      }))
      .filter((l) => l.selisih !== 0);

    if (
      lines.some(
        (line) =>
          !line.btbId &&
          lotsForOpname(line).length > 0,
      )
    ) {
      toast.error("Setiap baris wajib memilih Batch / No. BTB");
      return;
    }

    if (lines.length === 0) {
      toast.error("Tidak ada selisih. Transaksi SO tidak dibuat");
      return;
    }

    const payload: StockOpname = {
      id: existing?.id ?? uid("so"),
      no: existing?.no ?? formatDocNo("SO", tanggal, stockOpnames.length + 1),
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
      noTransaksi: payload.no,
      detail: `${lines.length} selisih`,
    });
    toast.success(
      `${payload.no} disimpan dengan ${lines.length} baris selisih`,
    );
    setEditing(false);
    router.push(`/transaksi/stock-opname/${payload.id}`);
  }

  const displayLines = isView ? (existing?.lines ?? []) : drafts;

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
        title={isNew ? "Buat Stock Opname" : (existing?.no ?? "Stock Opname")}
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
            <ResponsiveInput value={keterangan} onChange={setKeterangan} />
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
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="metode-opname"
                    value="per_finish_good"
                    checked={metode === "per_finish_good"}
                    onChange={() => changeMetode("per_finish_good")}
                    className="size-4 accent-emerald-700"
                  />
                  Per Finish Good
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{metodeHint(metode)}</p>
            </div>

            {metode === "per_finish_good" ? (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Worksheet diisi otomatis dari stok Finish Good di Gudang FG.
                  Isi Qty Aktual pada tiap baris, lalu simpan.
                </p>
                {drafts.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDrafts(loadFinishGoodWorksheet())}
                  >
                    Muat Ulang dari Gudang FG
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  {metode === "per_gudang"
                    ? "Tambah Gudang"
                    : "Tambah Barang (Material / Finish Good)"}
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    {metode === "per_gudang" ? (
                      <SearchableCombobox
                        items={availableGudang}
                        value={pickerValue}
                        onValueChange={setPickerValue}
                        placeholder={
                          availableGudang.length === 0
                            ? "Semua gudang sudah ditambahkan"
                            : "Cari gudang..."
                        }
                        emptyText="Tidak ada gudang yang cocok"
                        disabled={availableGudang.length === 0}
                        itemNoun="gudang"
                        className="bg-white"
                      />
                    ) : (
                      <SearchableCombobox
                        items={availableToAdd}
                        value={pickerValue}
                        onValueChange={setPickerValue}
                        filterItem={filterBarangByKodeNama}
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
                              <ItemNameWithType jenis={jenis}>
                                {label}
                              </ItemNameWithType>
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
            )}
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
                : metode === "per_finish_good"
                  ? "Tidak ada stok Finish Good di Gudang FG."
                  : metode === "per_gudang"
                    ? "Tambahkan gudang untuk mulai mengisi worksheet."
                    : "Tambahkan Material atau Finish Good untuk mulai mengisi worksheet."}
            </p>
          ) : (
            <table className={`${tableShellClass} min-w-[1530px]`}>
              <colgroup>
                {colGroupOpnameWithBatch.map((width, index) => (
                  <col key={index} className={width} />
                ))}
                {!isView && <col className="w-[64px]" />}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className={`${tableHeadCellClass} min-w-[132px] whitespace-nowrap`}>
                    Jenis
                  </th>
                  <th className={`${tableHeadCellClass} min-w-[124px] whitespace-nowrap`}>
                    Kode
                  </th>
                  <th className={`${tableHeadCellClass} min-w-[180px] whitespace-nowrap`}>
                    Nama Barang
                  </th>
                  <th className={`${tableHeadCellClass} min-w-[180px] whitespace-nowrap`}>
                    Batch / No. BTB
                  </th>
                  <th className={`${tableHeadCellClass} whitespace-nowrap`}>Customer</th>
                  <th className={`${tableHeadCellClass} whitespace-nowrap`}>Gudang</th>
                  <th className={`${tableHeadCellRightClass} whitespace-nowrap`}>
                    Qty Sistem
                  </th>
                  <th className={`${tableHeadCellRightClass} whitespace-nowrap`}>
                    Qty Aktual
                  </th>
                  <th className={`${tableHeadCellRightClass} whitespace-nowrap`}>
                    Selisih
                  </th>
                  {!isView && (
                    <th className={`${tableHeadCellClass} whitespace-nowrap`}>Aksi</th>
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
                      <td className={`${tableBodyCellClass} min-w-[132px]`}>
                        <div className="flex items-center">
                          <ItemTypeBadge jenis={line.jenis} />
                        </div>
                      </td>
                      <td className={`${tableBodyCellClass} min-w-[124px] font-medium whitespace-nowrap`}>
                        {line.kode}
                      </td>
                      <td className={`${tableBodyCellClass} min-w-[180px] overflow-hidden`}>
                        <p className="line-clamp-2 break-words" title={line.nama}>
                          {line.nama}
                        </p>
                      </td>
                      <td className={`${tableBodyCellClass} min-w-[180px] overflow-hidden`}>
                        {isView ? (
                          <p
                            className="line-clamp-2 break-words"
                            title={
                              line.btbNo
                                ? `${line.btbNo} - ${(batchLabel(line.batchCustomer ?? "", btbs) || line.batchCustomer || "-").trim()}`
                                : line.batchCustomer || "-"
                            }
                          >
                            {line.btbNo
                              ? `${line.btbNo} - ${(batchLabel(line.batchCustomer ?? "", btbs) || line.batchCustomer || "-").trim()}`
                              : line.batchCustomer || "-"}
                          </p>
                        ) : (
                          <SearchableCombobox
                            items={lotsForOpname(line).map((lot) => ({
                              value: `${lot.btbId}:${lot.gudangId}:${lot.batchCustomer}`,
                              label: opnameLotLabel(lot),
                            }))}
                            value={
                              line.btbId
                                ? `${line.btbId}:${line.gudangId}:${line.batchCustomer ?? ""}`
                                : ""
                            }
                            onValueChange={(next) => {
                              const lot = lotsForOpname(line).find(
                                (row) =>
                                  `${row.btbId}:${row.gudangId}:${row.batchCustomer}` ===
                                  next,
                              );
                              if (!lot) return;
                              setDrafts((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? applyOpnameLot(row, lot) : row,
                                ),
                              );
                            }}
                            placeholder="Cari Batch / No. BTB..."
                            emptyText="Tidak ada batch di gudang ini"
                            itemNoun="batch"
                            className="w-full min-w-0 bg-white"
                          />
                        )}
                      </td>
                      <td className={`${tableBodyCellClass} overflow-hidden`}>
                        <p
                          className="truncate"
                          title={resolveCustomerNama(
                            line.customerId,
                            line.jenis,
                            line.refId,
                          )}
                        >
                          {resolveCustomerNama(
                            line.customerId,
                            line.jenis,
                            line.refId,
                          )}
                        </p>
                      </td>
                      <td className={`${tableBodyCellMutedClass} overflow-hidden`}>
                        <p className="truncate" title={gudangMap[line.gudangId]?.nama ?? "-"}>
                          {gudangMap[line.gudangId]?.nama ?? "-"}
                        </p>
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
                          <div className="flex items-center justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => removeDraftRow(idx)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          </div>
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
