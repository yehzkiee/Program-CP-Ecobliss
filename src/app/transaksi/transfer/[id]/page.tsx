"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { DetailField } from "@/components/shared/detail-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveInput } from "@/components/ui/responsive-input";
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
import {
  formatDocNo,
  listBtbBatchStock,
  type BtbBatchStock,
} from "@/lib/mock/data";
import { batchLabel } from "@/lib/batches";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Btb, TransferGudang, TransferLine } from "@/lib/types";
import { todayISO, uid, formatDateID } from "@/lib/utils";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";

type TransferSnapshot = {
  tanggal: string;
  keterangan: string;
  lines: TransferLine[];
};

function cloneLines(lines: TransferLine[]) {
  return lines.map((l) => ({ ...l }));
}

function transferLotLabel(lot: BtbBatchStock, docs: Btb[]) {
  const no = (lot.btbNo ?? "").trim() || "-";
  const batch =
    (batchLabel(lot.batchCustomer, docs) || lot.batchCustomer).trim() || "-";
  const qty =
    typeof lot.qty === "number" && Number.isFinite(lot.qty)
      ? lot.qty
      : Number(lot.qty) || 0;
  return `${no} - ${batch} - (Stok: ${qty})`;
}

function parseTransferQty(value: string) {
  const qty = Number(value);
  return Number.isFinite(qty) ? qty : 0;
}

export default function TransferFormPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "baru";
  const router = useRouter();
  const transfers = useDataStore((s) => s.transfers);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const adjustments = useDataStore((s) => s.adjustments);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const upsert = useDataStore((s) => s.upsertTransfer);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const existing = transfers.find((t) => t.id === params.id);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const [editing, setEditing] = useState(false);
  const [baseline, setBaseline] = useState<TransferSnapshot | null>(null);

  const isViewMode = !isNew && !editing;
  const canEdit = isNew || editing;

  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

  const jenisSelectItems = useMemo(
    () => [
      { value: "item", label: "Material" },
      { value: "fg", label: "Finish Good" },
    ],
    [],
  );
  const itemSelectItems = useMemo(
    () => items.map((i) => ({ value: i.id, label: `${i.kode} - ${i.nama}` })),
    [items],
  );
  const fgSelectItems = useMemo(
    () =>
      finishGoods.map((f) => ({ value: f.id, label: `${f.kode} - ${f.nama}` })),
    [finishGoods],
  );
  const gudangSelectItems = useMemo(
    () => gudangList.map((g) => ({ value: g.id, label: g.nama })),
    [gudangList],
  );
  const batchStock = useMemo(
    () =>
      listBtbBatchStock({
        btbs,
        bkbs,
        adjustments,
        transfers: existing
          ? transfers.filter((doc) => doc.id !== existing.id)
          : transfers,
      }),
    [adjustments, bkbs, btbs, existing, transfers],
  );

  function lotsFor(line: TransferLine) {
    return batchStock
      .filter(
        (lot) =>
          lot.jenis === line.jenis &&
          lot.refId === line.refId &&
          lot.gudangId === line.dariGudangId &&
          lot.qty > 0 &&
          lot.btbId.trim() !== "",
      )
      .sort(
        (a, b) =>
          a.tanggal.localeCompare(b.tanggal) || a.btbNo.localeCompare(b.btbNo),
      );
  }

  function selectedTransferLot(line: TransferLine) {
    if (!line.btbId) return null;
    return (
      lotsFor(line).find(
        (lot) =>
          lot.btbId === line.btbId &&
          lot.gudangId === line.dariGudangId &&
          lot.batchCustomer === (line.batchCustomer ?? ""),
      ) ?? null
    );
  }

  function remainingTransfer(line: TransferLine, index: number) {
    const lot = selectedTransferLot(line);
    if (!lot) return null;
    const reserved = lines.reduce((sum, other, otherIdx) => {
      if (otherIdx === index) return sum;
      const sameLot =
        other.btbId === lot.btbId &&
        other.dariGudangId === lot.gudangId &&
        other.refId === lot.refId &&
        (other.batchCustomer ?? "") === lot.batchCustomer;
      return sameLot ? sum + (Number(other.qty) || 0) : sum;
    }, 0);
    return Math.max(0, lot.qty - reserved);
  }

  const [tanggal, setTanggal] = useState(existing?.tanggal ?? todayISO());
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [lines, setLines] = useState<TransferLine[]>(
    existing?.lines ?? [
      {
        jenis: "item",
        refId: items[0]?.id ?? "",
        kode: items[0]?.kode ?? "",
        nama: items[0]?.nama ?? "",
        qty: 1,
        dariGudangId: gudangList[0]?.id ?? "",
        keGudangId: gudangList[1]?.id ?? "",
        keterangan: "",
      },
    ],
  );

  function currentSnapshot(): TransferSnapshot {
    return { tanggal, keterangan, lines: cloneLines(lines) };
  }

  function applySnapshot(snap: TransferSnapshot) {
    setTanggal(snap.tanggal);
    setKeterangan(snap.keterangan);
    setLines(cloneLines(snap.lines));
  }

  function startEdit() {
    setBaseline(currentSnapshot());
    setEditing(true);
  }

  function cancelEdit() {
    if (baseline) applySnapshot(baseline);
    else if (existing) {
      applySnapshot({
        tanggal: existing.tanggal,
        keterangan: existing.keterangan,
        lines: cloneLines(existing.lines),
      });
    }
    setBaseline(null);
    setEditing(false);
  }

  function save() {
    if (lines.length === 0) {
      toast.error("Minimal satu baris transfer");
      return;
    }
    for (const line of lines) {
      if (!line.refId) {
        toast.error("Setiap baris wajib memilih barang");
        return;
      }
      if (line.qty <= 0) {
        toast.error("Qty transfer harus lebih dari 0");
        return;
      }
      if (!line.dariGudangId || !line.keGudangId) {
        toast.error("Gudang asal dan tujuan wajib diisi");
        return;
      }
      if (line.dariGudangId === line.keGudangId) {
        toast.error("Gudang asal dan tujuan tidak boleh sama");
        return;
      }
      const chosen = lotsFor(line).find(
        (lot) =>
          lot.btbId === (line.btbId ?? "") &&
          lot.batchCustomer === (line.batchCustomer ?? "") &&
          lot.gudangId === line.dariGudangId,
      );
      if (!chosen || !line.btbId) {
        toast.error("Setiap baris wajib memilih Batch / No. BTB");
        return;
      }
    }

    const savedLines = lines.map((line) => ({
      ...line,
      qty: Number(line.qty),
    }));
    const requested = new Map<string, number>();
    for (const line of savedLines) {
      const key = `${line.btbId}:${line.dariGudangId}:${line.batchCustomer ?? ""}`;
      requested.set(key, (requested.get(key) ?? 0) + line.qty);
    }
    for (const line of savedLines) {
      const key = `${line.btbId}:${line.dariGudangId}:${line.batchCustomer ?? ""}`;
      const available =
        batchStock.find(
          (lot) =>
            lot.btbId === line.btbId &&
            lot.gudangId === line.dariGudangId &&
            lot.refId === line.refId &&
            lot.batchCustomer === (line.batchCustomer ?? ""),
        )?.qty ?? 0;
      const need = requested.get(key) ?? line.qty;
      if (need > available) {
        const gudangNama = gudangMap[line.dariGudangId]?.nama ?? "gudang asal";
        const batchNama = line.batchCustomer || line.btbNo || "ini";
        if (available <= 0) {
          toast.error(
            `Stok fisik batch ${batchNama} di ${gudangNama} belum ada. Buat BTB barang masuk untuk batch ini terlebih dahulu.`,
          );
          return;
        }
        toast.error(
          `Qty transfer melebihi stok ${line.btbNo || batchNama} (tersedia ${available}, diminta ${need})`,
        );
        return;
      }
    }

    const payload: TransferGudang = {
      id: existing?.id ?? uid("tf"),
      no: existing?.no ?? formatDocNo("TG", tanggal, transfers.length + 1),
      tanggal,
      keterangan,
      lines: savedLines,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsert(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: existing ? "Edit Transfer Gudang" : "Transfer Gudang",
      noTransaksi: payload.no,
      detail: savedLines
        .map(
          (line) =>
            `${line.btbNo || "-"} · ${line.qty} dari ${gudangMap[line.dariGudangId]?.nama ?? "asal"} ke ${gudangMap[line.keGudangId]?.nama ?? "tujuan"}`,
        )
        .join(", "),
    });
    toast.success("Transfer disimpan — stok antar gudang sudah diperbarui");
    setBaseline(null);
    setEditing(false);
    router.push(`/transaksi/transfer/${payload.id}`);
  }

  if (!isNew && !existing) {
    return (
      <div>
        <BackLink href="/transaksi/transfer" />
        <PageHeader
          title="Transfer tidak ditemukan"
          description="Dokumen yang diminta tidak ada di data."
        />
      </div>
    );
  }

  return (
    <div>
      {confirmDialog}
      <BackLink href="/transaksi/transfer" />
      <PageHeader
        title={isNew ? "Buat Transfer" : (existing?.no ?? "Transfer")}
        description={
          isViewMode
            ? "Detail pemindahan barang antar gudang. Setiap baris menjelaskan barang mana dipindah dari gudang asal ke gudang tujuan."
            : "Pilih barang, No. BTB di gudang asal, lalu qty. Qty tidak boleh melebihi sisa stok batch itu."
        }
        action={
          isViewMode ? (
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={startEdit}
            >
              Edit
            </Button>
          ) : !isNew ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                Batal
              </Button>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={save}
              >
                Simpan
              </Button>
            </div>
          ) : undefined
        }
      />

      {isViewMode ? (
        <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
          <DetailField label="Tanggal" value={formatDateID(tanggal)} />
          <DetailField label="Keterangan" value={keterangan} />
        </div>
      ) : (
        <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Keterangan</Label>
            <ResponsiveInput value={keterangan} onChange={setKeterangan} />
          </div>
        </div>
      )}

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Baris Transfer</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    jenis: "fg",
                    refId: finishGoods[0]?.id ?? "",
                    kode: finishGoods[0]?.kode ?? "",
                    nama: finishGoods[0]?.nama ?? "",
                    qty: 1,
                    dariGudangId: gudangList[1]?.id ?? "",
                    keGudangId: gudangList[0]?.id ?? "",
                    keterangan: "",
                  },
                ])
              }
            >
              <Plus className="mr-1 size-4" /> Baris
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, idx) =>
            isViewMode ? (
              <div
                key={idx}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <DetailField
                  label="Jenis"
                  value={<ItemTypeBadge jenis={line.jenis} />}
                />
                <DetailField
                  label="Barang"
                  value={
                    <ItemNameWithType jenis={line.jenis}>
                      {line.kode} - {line.nama}
                    </ItemNameWithType>
                  }
                  className="sm:col-span-2 lg:col-span-1"
                />
                <DetailField
                  label="Batch / No. BTB"
                  value={
                    line.btbNo
                      ? `${line.btbNo} - ${(batchLabel(line.batchCustomer ?? "", btbs) || line.batchCustomer || "-").trim()}`
                      : "-"
                  }
                />
                <DetailField label="Qty" value={line.qty} />
                <DetailField
                  label="Pemindahan"
                  value={`${line.nama} dipindah dari ${gudangMap[line.dariGudangId]?.nama ?? "Gudang Asal"} ke ${gudangMap[line.keGudangId]?.nama ?? "Gudang Tujuan"}`}
                  className="sm:col-span-2 lg:col-span-4"
                />
                {line.keterangan ? (
                  <DetailField
                    label="Keterangan"
                    value={line.keterangan}
                    className="sm:col-span-2 lg:col-span-4"
                  />
                ) : null}
              </div>
            ) : (
              <div
                key={idx}
                className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
              >
                <div className="w-[8.5rem] shrink-0">
                  <Label className="text-xs">Jenis</Label>
                  <Select
                    value={line.jenis}
                    items={jenisSelectItems}
                    onValueChange={(v) => {
                      const vv = v ?? "";
                      const jenis = vv as "item" | "fg";
                      const ref = jenis === "item" ? items[0] : finishGoods[0];
                      const next = [...lines];
                      next[idx] = {
                        ...line,
                        jenis,
                        refId: ref?.id ?? "",
                        kode: ref?.kode ?? "",
                        nama: ref?.nama ?? "",
                        btbId: "",
                        btbNo: "",
                        batchCustomer: "",
                      };
                      setLines(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="item">Material</SelectItem>
                      <SelectItem value="fg">Finish Good</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[12rem] flex-1 basis-[12rem]">
                  <Label className="text-xs">Barang</Label>
                  <SearchableCombobox
                    items={
                      line.jenis === "item" ? itemSelectItems : fgSelectItems
                    }
                    value={line.refId}
                    onValueChange={(next) => {
                      const refId = next ?? "";
                      const ref =
                        line.jenis === "item"
                          ? items.find((i) => i.id === refId)
                          : finishGoods.find((f) => f.id === refId);
                      const nextLines = [...lines];
                      nextLines[idx] = {
                        ...line,
                        refId,
                        kode: ref?.kode ?? "",
                        nama: ref?.nama ?? "",
                        btbId: "",
                        btbNo: "",
                        batchCustomer: "",
                      };
                      setLines(nextLines);
                    }}
                    renderItem={(item) => (
                      <ItemNameWithType jenis={line.jenis} className="w-full">
                        {item.label}
                      </ItemNameWithType>
                    )}
                    endAdornment={
                      line.refId ? <ItemTypeBadge jenis={line.jenis} /> : null
                    }
                    placeholder="Cari kode atau nama barang..."
                    emptyText="Tidak ada barang yang cocok"
                    itemNoun="barang"
                  />
                </div>
                <div className="w-full max-w-[280px] min-w-[12rem] shrink-0">
                  <Label className="text-xs">Batch / No. BTB</Label>
                  <SearchableCombobox
                    items={lotsFor(line).map((lot) => ({
                      value: `${lot.btbId}:${lot.gudangId}:${lot.batchCustomer}`,
                      label: transferLotLabel(lot, btbs),
                    }))}
                    value={
                      line.btbId
                        ? `${line.btbId}:${line.dariGudangId}:${line.batchCustomer ?? ""}`
                        : ""
                    }
                    onValueChange={(next) => {
                      const matched = lotsFor(line).find(
                        (lot) =>
                          `${lot.btbId}:${lot.gudangId}:${lot.batchCustomer}` ===
                          next,
                      );
                      if (!matched) return;
                      const reserved = lines.reduce((sum, other, otherIdx) => {
                        if (otherIdx === idx) return sum;
                        const sameLot =
                          other.btbId === matched.btbId &&
                          other.dariGudangId === matched.gudangId &&
                          other.refId === matched.refId &&
                          (other.batchCustomer ?? "") === matched.batchCustomer;
                        return sameLot ? sum + (Number(other.qty) || 0) : sum;
                      }, 0);
                      const cap = Math.max(0, matched.qty - reserved);
                      const qty = Math.min(Number(line.qty) || 0, cap);
                      if ((Number(line.qty) || 0) > cap) {
                        toast.error(
                          `Qty transfer dibatasi sisa stok batch (maks ${cap})`,
                        );
                      }
                      const nextLines = [...lines];
                      nextLines[idx] = {
                        ...line,
                        btbId: matched.btbId,
                        btbNo: matched.btbNo,
                        batchCustomer: matched.batchCustomer,
                        qty,
                      };
                      setLines(nextLines);
                    }}
                    placeholder="Cari Batch / No. BTB..."
                    emptyText="Tidak ada batch di gudang asal"
                    itemNoun="batch"
                    renderItem={(item) => (
                      <span className="block truncate" title={item.label}>
                        {item.label}
                      </span>
                    )}
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    max={remainingTransfer(line, idx) ?? undefined}
                    value={line.qty}
                    aria-invalid={
                      (() => {
                        const cap = remainingTransfer(line, idx);
                        return (
                          cap !== null &&
                          Number(line.qty) > cap
                        ) || undefined;
                      })()
                    }
                    onChange={(e) => {
                      let qty = parseTransferQty(e.target.value);
                      const cap = remainingTransfer(line, idx);
                      if (cap !== null && qty > cap) {
                        toast.error(
                          `Qty transfer dibatasi sisa stok batch (maks ${cap})`,
                        );
                        qty = cap;
                      }
                      const next = [...lines];
                      next[idx] = { ...line, qty };
                      setLines(next);
                    }}
                  />
                  {(() => {
                    const cap = remainingTransfer(line, idx);
                    if (cap === null || Number(line.qty) <= cap) return null;
                    return (
                      <p className="text-xs text-red-700">
                        Melebihi stok batch (maks {cap})
                      </p>
                    );
                  })()}
                </div>
                <div className="min-w-[10rem] flex-1 basis-[10rem]">
                  <Label className="text-xs">Gudang Asal</Label>
                  <SearchableCombobox
                    items={gudangSelectItems}
                    value={line.dariGudangId}
                    onValueChange={(next) => {
                      const dariGudangId = next ?? "";
                      const nextLines = [...lines];
                      nextLines[idx] = {
                        ...line,
                        dariGudangId,
                        btbId: "",
                        btbNo: "",
                        batchCustomer: "",
                      };
                      setLines(nextLines);
                    }}
                    placeholder="Cari gudang asal..."
                    emptyText="Tidak ada gudang yang cocok"
                    itemNoun="gudang"
                  />
                </div>
                <div className="flex min-w-[10rem] flex-1 basis-[10rem] items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs">Gudang Tujuan</Label>
                    <SearchableCombobox
                      items={gudangSelectItems}
                      value={line.keGudangId}
                      onValueChange={(next) => {
                        const keGudangId = next ?? "";
                        const nextLines = [...lines];
                        nextLines[idx] = { ...line, keGudangId };
                        setLines(nextLines);
                      }}
                      placeholder="Cari gudang tujuan..."
                      emptyText="Tidak ada gudang yang cocok"
                      itemNoun="gudang"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      askConfirm(() => {
                        setLines(lines.filter((_, i) => i !== idx));
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

      {isNew && (
        <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
          Simpan Transfer
        </Button>
      )}
    </div>
  );
}
