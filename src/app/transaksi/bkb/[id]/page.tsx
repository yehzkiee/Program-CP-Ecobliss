"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { DetailField } from "@/components/shared/detail-field";
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
  formatBtbLotLabel,
  formatDocNo,
  getLatestBomRevision,
  findItem,
  findFinishGood,
  listBtbBatchStock,
  lotsForCustomer,
  syncBtbQtySisa,
} from "@/lib/mock/data";
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

function formatBatchStockLabel(
  btbNo: string,
  batch: string,
  qtySisa: number,
  gudangName?: string,
) {
  return formatBtbLotLabel(
    { btbNo, batchCustomer: batch, qty: qtySisa },
    gudangName,
  );
}

function batchGroupKey(refId: string, batch: string, gudangId: string) {
  return `${refId}::${batch.trim()}::${gudangId}`;
}

type BatchGroup<T> = {
  key: string;
  batchCustomer: string;
  gudangId: string;
  satuan: string;
  qtySisa: number;
  tanggalTerima: string;
  lots: T[];
};

function groupByBatch<
  T extends {
    batchCustomer: string;
    gudangId: string;
    qtySisa: number;
    tanggalTerima: string;
    satuan: string;
    btbNo: string;
  },
>(refId: string, lots: T[]): BatchGroup<T>[] {
  const grouped = new Map<string, BatchGroup<T>>();
  const ordered = [...lots].sort(
    (a, b) =>
      a.tanggalTerima.localeCompare(b.tanggalTerima) ||
      a.btbNo.localeCompare(b.btbNo),
  );
  for (const lot of ordered) {
    const key = batchGroupKey(refId, lot.batchCustomer, lot.gudangId);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        key,
        batchCustomer: lot.batchCustomer,
        gudangId: lot.gudangId,
        satuan: lot.satuan,
        qtySisa: lot.qtySisa,
        tanggalTerima: lot.tanggalTerima,
        lots: [lot],
      });
      continue;
    }
    current.qtySisa += lot.qtySisa;
    current.lots.push(lot);
    if (lot.tanggalTerima < current.tanggalTerima) {
      current.tanggalTerima = lot.tanggalTerima;
    }
  }
  return [...grouped.values()];
}

function collapseDrafts<
  T extends {
    qty: number;
    batchCustomer: string;
    gudangId: string;
    btbTanggalTerima: string;
  },
>(lines: T[], refOf: (line: T) => string): (T & { lotKey: string })[] {
  const order: (T & { lotKey: string })[] = [];
  const index = new Map<string, number>();
  for (const line of lines) {
    const key = batchGroupKey(refOf(line), line.batchCustomer, line.gudangId);
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, order.length);
      order.push({ ...line, lotKey: key, qty: Number(line.qty) || 0 });
      continue;
    }
    const prev = order[at];
    order[at] = {
      ...prev,
      qty: prev.qty + (Number(line.qty) || 0),
      btbTanggalTerima:
        line.btbTanggalTerima &&
        line.btbTanggalTerima < prev.btbTanggalTerima
          ? line.btbTanggalTerima
          : prev.btbTanggalTerima,
    };
  }
  return order;
}

function expandBatchLines<
  TLine extends { qty: number; keterangan: string; satuan: string },
  TLot extends {
    key: string;
    btbId: string;
    btbNo: string;
    tanggalTerima: string;
    batchCustomer: string;
    satuan: string;
    gudangId: string;
    qtySisa: number;
  },
  TExtra extends object,
>(
  lines: TLine[],
  resolve: (line: TLine) => BatchGroup<TLot> | null,
  identity: (line: TLine) => TExtra,
): (TExtra & {
  btbId: string;
  btbNo: string;
  btbTanggalTerima: string;
  batchCustomer: string;
  qty: number;
  satuan: string;
  gudangId: string;
  keterangan: string;
})[] | null {
  const used = new Map<string, number>();
  const out: (TExtra & {
    btbId: string;
    btbNo: string;
    btbTanggalTerima: string;
    batchCustomer: string;
    qty: number;
    satuan: string;
    gudangId: string;
    keterangan: string;
  })[] = [];
  for (const line of lines) {
    const group = resolve(line);
    if (!group) return null;
    let left = Number(line.qty) || 0;
    let first = true;
    for (const lot of group.lots) {
      if (left <= 0) break;
      const avail = lot.qtySisa - (used.get(lot.key) ?? 0);
      const take = Math.min(Math.max(avail, 0), left);
      if (take <= 0) continue;
      used.set(lot.key, (used.get(lot.key) ?? 0) + take);
      out.push({
        ...identity(line),
        btbId: lot.btbId,
        btbNo: lot.btbNo,
        btbTanggalTerima: lot.tanggalTerima,
        batchCustomer: lot.batchCustomer,
        qty: take,
        satuan: lot.satuan || line.satuan,
        gudangId: lot.gudangId,
        keterangan: first ? line.keterangan : "",
      });
      first = false;
      left -= take;
    }
    if (left > 0) return null;
  }
  return out;
}

type MaterialLotOption = {
  key: string;
  btbId: string;
  btbNo: string;
  tanggalTerima: string;
  itemId: string;
  batchCustomer: string;
  satuan: string;
  gudangId: string;
  qtySisa: number;
};

type FgLotOption = {
  key: string;
  btbId: string;
  btbNo: string;
  tanggalTerima: string;
  fgId: string;
  batchCustomer: string;
  satuan: string;
  gudangId: string;
  qtySisa: number;
};

type MaterialDraft = BkbLineItem & { lotKey?: string };
type FgDraft = BkbLineFg & { lotKey?: string };

export default function BkbFormPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const isNew = id === "baru";
  const router = useRouter();
  const bkbs = useDataStore((s) => s.bkbs);
  const btbs = useDataStore((s) => s.btbs);
  const transfers = useDataStore((s) => s.transfers);
  const adjustments = useDataStore((s) => s.adjustments);
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
  const [lineItems, setLineItems] = useState<MaterialDraft[]>(() =>
    collapseDrafts(existing?.items ?? [], (line) => line.itemId),
  );
  const [lineFgs, setLineFgs] = useState<FgDraft[]>(() =>
    collapseDrafts(existing?.fgs ?? [], (line) => line.fgId),
  );
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

  /** Sisa per No. BTB di tiap gudang, sudah dikurangi BKB, transfer, dan adjustment disetujui. */
  const batchStock = useMemo(
    () =>
      listBtbBatchStock({
        btbs,
        bkbs: existing ? bkbs.filter((doc) => doc.id !== existing.id) : bkbs,
        transfers,
        adjustments,
      }),
    [adjustments, bkbs, btbs, existing, transfers],
  );

  const stockForCustomer = useMemo(() => {
    const grouped = new Map<string, typeof batchStock>();
    for (const lot of batchStock) {
      if (lot.qty <= 0) continue;
      const key = `${lot.jenis}\u0001${lot.refId}`;
      const list = grouped.get(key) ?? [];
      list.push(lot);
      grouped.set(key, list);
    }
    const visible: typeof batchStock = [];
    for (const [key, lots] of grouped) {
      const separator = key.indexOf("\u0001");
      const jenis = key.slice(0, separator);
      const refId = key.slice(separator + 1);
      const customerId =
        jenis === "item"
          ? (findItem(refId, items)?.customerId ?? "")
          : (findFinishGood(refId, finishGoods)?.customerId ?? "");
      visible.push(...lotsForCustomer(lots, customerId));
    }
    return visible;
  }, [batchStock, finishGoods, items]);

  const sources: BtbSourceOption[] = useMemo(() => {
    const opts: BtbSourceOption[] = [];
    for (const lot of stockForCustomer) {
      if (lot.qty <= 0) continue;
      if (gudangAsal && lot.gudangId !== gudangAsal) continue;
      const btb = btbs.find((doc) => doc.id === lot.btbId);
      const master =
        lot.jenis === "item"
          ? findItem(lot.refId, items)
          : findFinishGood(lot.refId, finishGoods);
      const satuan =
        lot.jenis === "item"
          ? (btb?.items.find((line) => line.itemId === lot.refId)?.satuan ||
            master?.uom1 ||
            "")
          : (btb?.fgs.find((line) => line.fgId === lot.refId)?.satuan ||
            master?.uom1 ||
            "");
      opts.push({
        key: lot.key,
        btbId: lot.btbId,
        btbNo: lot.btbNo,
        tanggalTerima: lot.tanggal,
        jenis: lot.jenis,
        refId: lot.refId,
        label: `${lot.btbNo} · ${master ? formatKodeNama(master.kode, master.nama) : lot.jenis === "item" ? "Material" : "FG"} (sisa ${lot.qty})`,
        batchCustomer: lot.batchCustomer,
        satuan,
        gudangId: lot.gudangId,
        qtySisa: lot.qty,
      });
    }
    return opts;
  }, [btbs, finishGoods, gudangAsal, items, stockForCustomer]);

  /** Lot penerimaan yang masih punya stok, sebelum digabung per nama batch. */
  const materialLots = useMemo(() => {
    const lots: MaterialLotOption[] = [];
    for (const lot of stockForCustomer) {
      if (lot.jenis !== "item" || lot.qty <= 0) continue;
      const line = btbs
        .find((doc) => doc.id === lot.btbId)
        ?.items.find((row) => row.itemId === lot.refId);
      lots.push({
        key: lot.key,
        btbId: lot.btbId,
        btbNo: lot.btbNo,
        tanggalTerima: lot.tanggal,
        itemId: lot.refId,
        batchCustomer: lot.batchCustomer,
        satuan: line?.satuan || findItem(lot.refId, items)?.uom1 || "",
        gudangId: lot.gudangId,
        qtySisa: lot.qty,
      });
    }
    return lots;
  }, [btbs, items, stockForCustomer]);

  const fgLots = useMemo(() => {
    const lots: FgLotOption[] = [];
    for (const lot of stockForCustomer) {
      if (lot.jenis !== "fg" || lot.qty <= 0) continue;
      const line = btbs
        .find((doc) => doc.id === lot.btbId)
        ?.fgs.find((row) => row.fgId === lot.refId);
      lots.push({
        key: lot.key,
        btbId: lot.btbId,
        btbNo: lot.btbNo,
        tanggalTerima: lot.tanggal,
        fgId: lot.refId,
        batchCustomer: lot.batchCustomer,
        satuan: line?.satuan || findFinishGood(lot.refId, finishGoods)?.uom1 || "",
        gudangId: lot.gudangId,
        qtySisa: lot.qty,
      });
    }
    return lots;
  }, [btbs, finishGoods, stockForCustomer]);

  const materialGroups = useMemo(() => {
    const byItem = new Map<string, MaterialLotOption[]>();
    for (const lot of materialLots) {
      const list = byItem.get(lot.itemId) ?? [];
      list.push(lot);
      byItem.set(lot.itemId, list);
    }
    return new Map(
      [...byItem.entries()].map(([itemId, lots]) => [
        itemId,
        groupByBatch(itemId, lots),
      ]),
    );
  }, [materialLots]);

  const fgGroups = useMemo(() => {
    const byFg = new Map<string, FgLotOption[]>();
    for (const lot of fgLots) {
      const list = byFg.get(lot.fgId) ?? [];
      list.push(lot);
      byFg.set(lot.fgId, list);
    }
    return new Map(
      [...byFg.entries()].map(([fgId, lots]) => [fgId, groupByBatch(fgId, lots)]),
    );
  }, [fgLots]);

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

    setLineItems(collapseDrafts(newItems, (line) => line.itemId));
    setLineFgs(collapseDrafts(newFgs, (line) => line.fgId));
    toast.success(`BOM diterapkan ×${bomMultiplier}.`);
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
        lotKey: batchGroupKey(src.refId, src.batchCustomer, src.gudangId),
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
        lotKey: batchGroupKey(src.refId, src.batchCustomer, src.gudangId),
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
    setLineItems(collapseDrafts(existing.items, (line) => line.itemId));
    setLineFgs(collapseDrafts(existing.fgs, (line) => line.fgId));
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

  function groupsForItem(itemId: string) {
    return materialGroups.get(itemId) ?? [];
  }

  function groupsForFg(fgId: string) {
    return fgGroups.get(fgId) ?? [];
  }

  function resolveMaterialGroup(line: MaterialDraft) {
    const groups = groupsForItem(line.itemId);
    if (line.lotKey) {
      const byKey = groups.find((group) => group.key === line.lotKey);
      if (byKey) return byKey;
    }
    return (
      groups.find(
        (group) =>
          group.batchCustomer === line.batchCustomer &&
          group.gudangId === line.gudangId,
      ) ?? null
    );
  }

  function resolveFgGroup(line: FgDraft) {
    const groups = groupsForFg(line.fgId);
    if (line.lotKey) {
      const byKey = groups.find((group) => group.key === line.lotKey);
      if (byKey) return byKey;
    }
    return (
      groups.find(
        (group) =>
          group.batchCustomer === line.batchCustomer &&
          group.gudangId === line.gudangId,
      ) ?? null
    );
  }

  function batchOptionLabel<
    T extends {
      batchCustomer: string;
      gudangId: string;
      qtySisa: number;
      lots: { btbNo: string }[];
    },
  >(group: T, groups: T[]) {
    const name = group.batchCustomer.trim();
    const sharedName =
      groups.filter((row) => row.batchCustomer.trim() === name).length > 1;
    const btbNo = [
      ...new Set(group.lots.map((lot) => lot.btbNo.trim()).filter(Boolean)),
    ].join(", ");
    return formatBatchStockLabel(
      btbNo,
      group.batchCustomer,
      group.qtySisa,
      sharedName ? gudangMap[group.gudangId]?.nama : undefined,
    );
  }

  function groupMaxQty(
    idx: number,
    stock: number,
    lines: { qty: number }[],
    sameGroup: (index: number) => boolean,
  ) {
    const reserved = lines.reduce((sum, _line, otherIdx) => {
      if (otherIdx === idx || !sameGroup(otherIdx)) return sum;
      return sum + (Number(lines[otherIdx].qty) || 0);
    }, 0);
    return Math.max(0, stock - reserved);
  }

  function materialMaxQty(idx: number) {
    const line = lineItems[idx];
    if (!line) return null;
    const group = resolveMaterialGroup(line);
    if (!group) return null;
    return groupMaxQty(
      idx,
      group.qtySisa,
      lineItems,
      (otherIdx) => resolveMaterialGroup(lineItems[otherIdx])?.key === group.key,
    );
  }

  function fgMaxQty(idx: number) {
    const line = lineFgs[idx];
    if (!line) return null;
    const group = resolveFgGroup(line);
    if (!group) return null;
    return groupMaxQty(
      idx,
      group.qtySisa,
      lineFgs,
      (otherIdx) => resolveFgGroup(lineFgs[otherIdx])?.key === group.key,
    );
  }

  function qtyPositive(qty: number) {
    return Number(qty) > 0;
  }

  function materialQtyOver(idx: number) {
    const maxQty = materialMaxQty(idx);
    if (maxQty === null) return false;
    return lineItems[idx].qty > maxQty;
  }

  function fgQtyOver(idx: number) {
    const maxQty = fgMaxQty(idx);
    if (maxQty === null) return false;
    return lineFgs[idx].qty > maxQty;
  }

  function save() {
    if (
      lineItems.some((line) => !qtyPositive(line.qty)) ||
      lineFgs.some((line) => !qtyPositive(line.qty))
    ) {
      toast.error("Qty harus lebih besar dari 0");
      return;
    }
    if (lineItems.some((line) => !resolveMaterialGroup(line))) {
      toast.error("Setiap baris Material wajib memilih batch yang masih ada stoknya");
      return;
    }
    if (lineFgs.some((line) => !resolveFgGroup(line))) {
      toast.error("Setiap baris FG wajib memilih batch yang masih ada stoknya");
      return;
    }
    if (lineItems.some((_, idx) => materialQtyOver(idx))) {
      toast.error("Qty material melebihi stok batch yang tersedia");
      return;
    }
    if (lineFgs.some((_, idx) => fgQtyOver(idx))) {
      toast.error("Qty FG melebihi stok batch yang tersedia");
      return;
    }
    if (lineItems.length === 0 && lineFgs.length === 0) {
      toast.error("Minimal satu baris pengeluaran");
      return;
    }

    const stampedItems = expandBatchLines(lineItems, resolveMaterialGroup, (line) => ({
      itemId: line.itemId,
    }));
    const stampedFgs = expandBatchLines(lineFgs, resolveFgGroup, (line) => ({
      fgId: line.fgId,
    }));
    if (!stampedItems || !stampedFgs) {
      toast.error("Qty melebihi stok batch yang tersedia");
      return;
    }

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
      items: stampedItems,
      fgs: stampedFgs,
      fotoBukti: fotoBukti.map((f) => f.dataUrl),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const nextBkbs = bkbs.some((doc) => doc.id === payload.id)
      ? bkbs.map((doc) => (doc.id === payload.id ? payload : doc))
      : [payload, ...bkbs];
    syncBtbQtySisa(btbs, nextBkbs).forEach(upsertBtb);
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

  const materialQtyInvalid =
    lineItems.some(
      (line, idx) => !qtyPositive(line.qty) || materialQtyOver(idx),
    ) ||
    lineFgs.some((line, idx) => !qtyPositive(line.qty) || fgQtyOver(idx));

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
        description="Catat barang yang keluar dari gudang asal. Setiap baris memilih batch sumber, dan qty dibatasi oleh sisa stok batch itu."
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
                    disabled={materialQtyInvalid}
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
              <SearchableCombobox
                items={gudangSelectItems}
                value={gudangAsal}
                onValueChange={(next) => setGudangAsal(next ?? "")}
                placeholder="Cari gudang..."
                emptyText="Tidak ada gudang yang cocok"
                itemNoun="gudang"
              />
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
              <Label>Kode BOM</Label>
              <SearchableCombobox
                items={bomSelectItems}
                value={bomId}
                onValueChange={(next) => setBomId(next ?? "")}
                placeholder="Cari kode BOM..."
                emptyText="Tidak ada BOM yang cocok"
                itemNoun="BOM"
                className="bg-white"
              />
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
                <DetailField label="Batch" value={line.batchCustomer || "-"} />
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
                  <SearchableCombobox
                    items={itemSelectItems}
                    value={line.itemId}
                    onValueChange={(next) => {
                      const itemId = next ?? "";
                      const item = findItem(itemId, items);
                      const groups = groupsForItem(itemId);
                      const src =
                        groups.find((group) => group.gudangId === gudangAsal) ??
                        groups[0];
                      const nextLines = [...lineItems];
                      nextLines[idx] = {
                        ...line,
                        itemId,
                        lotKey: src?.key,
                        btbId: src?.lots[0]?.btbId ?? "",
                        btbNo: src?.lots[0]?.btbNo ?? "",
                        btbTanggalTerima: src?.tanggalTerima ?? "",
                        batchCustomer: src?.batchCustomer ?? "",
                        satuan: src?.satuan ?? item?.uom1 ?? "",
                        gudangId: src?.gudangId ?? gudangAsal,
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
                <div className="min-w-0 lg:col-span-3">
                  <Label className="text-xs">Batch</Label>
                  <SearchableCombobox
                    items={groupsForItem(line.itemId).map((group) => ({
                      value: group.key,
                      label: batchOptionLabel(
                        group,
                        groupsForItem(line.itemId),
                      ),
                    }))}
                    value={resolveMaterialGroup(line)?.key ?? ""}
                    onValueChange={(next) => {
                      const group = groupsForItem(line.itemId).find(
                        (row) => row.key === next,
                      );
                      if (!group) return;
                      const nextLines = [...lineItems];
                      nextLines[idx] = {
                        ...line,
                        lotKey: group.key,
                        btbId: group.lots[0]?.btbId ?? "",
                        btbNo: group.lots[0]?.btbNo ?? "",
                        btbTanggalTerima: group.tanggalTerima,
                        batchCustomer: group.batchCustomer,
                        satuan: group.satuan,
                        gudangId: group.gudangId,
                      };
                      setLineItems(nextLines);
                    }}
                    placeholder="Masukkan batch..."
                    emptyText="Tidak ada batch untuk customer ini"
                    itemNoun="batch"
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    max={materialMaxQty(idx) ?? undefined}
                    value={line.qty}
                    aria-invalid={
                      !qtyPositive(line.qty) || materialQtyOver(idx) || undefined
                    }
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
                {!qtyPositive(line.qty) ? (
                  <p className="text-xs text-destructive lg:col-span-8">
                    Qty harus lebih besar dari 0
                  </p>
                ) : materialQtyOver(idx) ? (
                  <p className="text-xs text-destructive lg:col-span-8">
                    Qty melebihi stok BTB yang tersedia (Maks:{" "}
                    {formatQty(materialMaxQty(idx) ?? 0)})
                  </p>
                ) : null}
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
                <DetailField label="Batch" value={line.batchCustomer || "-"} />
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
                  <SearchableCombobox
                    items={fgSelectItems}
                    value={line.fgId}
                    onValueChange={(next) => {
                      const fgId = next ?? "";
                      const fg = findFinishGood(fgId, finishGoods);
                      const groups = groupsForFg(fgId);
                      const src =
                        groups.find((group) => group.gudangId === gudangAsal) ??
                        groups[0];
                      const nextLines = [...lineFgs];
                      nextLines[idx] = {
                        ...line,
                        fgId,
                        lotKey: src?.key,
                        btbId: src?.lots[0]?.btbId ?? "",
                        btbNo: src?.lots[0]?.btbNo ?? "",
                        btbTanggalTerima: src?.tanggalTerima ?? "",
                        batchCustomer: src?.batchCustomer ?? "",
                        satuan: src?.satuan ?? fg?.uom1 ?? "",
                        gudangId: src?.gudangId ?? gudangAsal,
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
                <div className="min-w-0 lg:col-span-3">
                  <Label className="text-xs">Batch</Label>
                  <SearchableCombobox
                    items={groupsForFg(line.fgId).map((group) => ({
                      value: group.key,
                      label: batchOptionLabel(group, groupsForFg(line.fgId)),
                    }))}
                    value={resolveFgGroup(line)?.key ?? ""}
                    onValueChange={(next) => {
                      const group = groupsForFg(line.fgId).find(
                        (row) => row.key === next,
                      );
                      if (!group) return;
                      const nextLines = [...lineFgs];
                      nextLines[idx] = {
                        ...line,
                        lotKey: group.key,
                        btbId: group.lots[0]?.btbId ?? "",
                        btbNo: group.lots[0]?.btbNo ?? "",
                        btbTanggalTerima: group.tanggalTerima,
                        batchCustomer: group.batchCustomer,
                        satuan: group.satuan,
                        gudangId: group.gudangId,
                      };
                      setLineFgs(nextLines);
                    }}
                    placeholder="Masukkan batch..."
                    emptyText="Tidak ada batch untuk customer ini"
                    itemNoun="batch"
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    max={fgMaxQty(idx) ?? undefined}
                    value={line.qty}
                    aria-invalid={
                      !qtyPositive(line.qty) || fgQtyOver(idx) || undefined
                    }
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
                {!qtyPositive(line.qty) ? (
                  <p className="text-xs text-destructive lg:col-span-8">
                    Qty harus lebih besar dari 0
                  </p>
                ) : fgQtyOver(idx) ? (
                  <p className="text-xs text-destructive lg:col-span-8">
                    Qty melebihi stok BTB yang tersedia (Maks:{" "}
                    {formatQty(fgMaxQty(idx) ?? 0)})
                  </p>
                ) : null}
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
        <Button
          className="bg-emerald-700 hover:bg-emerald-800"
          onClick={save}
          disabled={materialQtyInvalid}
        >
          Simpan BKB
        </Button>
      )}
    </div>
  );
}
