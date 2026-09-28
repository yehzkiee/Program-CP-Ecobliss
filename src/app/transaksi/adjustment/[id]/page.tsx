"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  BackLink,
  PageHeader,
  StatusBadge,
} from "@/components/shared/page-header";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
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
import type { Adjustment, AdjustmentLine } from "@/lib/types";
import {
  colGroupAdjustmentLines,
  tableBodyCellClass,
  tableBodyCellRightClass,
  tableHeadCellClass,
  tableHeadCellRightClass,
  tableShellClass,
} from "@/lib/table-styles";
import { todayISO, uid, isSuperAdmin, cn, formatJenisBarang } from "@/lib/utils";

const NO_SO = "__none__";

function movementLabel(line: AdjustmentLine) {
  if (line.in > 0 && line.out === 0) return "Menambah stok";
  if (line.out > 0 && line.in === 0) return "Mengurangi stok";
  if (line.in > 0 && line.out > 0) return "Koreksi campuran";
  return "Tanpa perubahan";
}

function signedQty(line: AdjustmentLine) {
  if (line.out > 0 && line.in === 0) return -line.out;
  if (line.in > 0 && line.out === 0) return line.in;
  return 0;
}

function AdjustmentFormInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const isNew = params.id === "baru";
  const router = useRouter();
  const adjustments = useDataStore((s) => s.adjustments);
  const stockOpnames = useDataStore((s) => s.stockOpnames);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const upsert = useDataStore((s) => s.upsertAdjustment);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const existing = adjustments.find((a) => a.id === params.id);
  const readOnly = !isNew;
  const canApprove = isSuperAdmin(user?.role);

  const soFromQuery = search.get("so");
  const initialSo = existing?.stockOpnameId ?? soFromQuery ?? "";

  const [tanggal, setTanggal] = useState(existing?.tanggal ?? todayISO());
  const [soId, setSoId] = useState(initialSo);
  const [picker, setPicker] = useState("");
  const [qtyText, setQtyText] = useState<Record<number, string>>({});
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [status, setStatus] = useState(existing?.status ?? "draft");
  const [fotoBukti, setFotoBukti] = useState<UploadedFile[]>(
    (existing?.fotoBukti ?? []).map((dataUrl, i) => ({
      id: `foto-${i}`,
      name: `bukti-${i + 1}.jpg`,
      dataUrl,
    })),
  );

  const selectedSo = stockOpnames.find((s) => s.id === soId);

  const soSelectItems = useMemo(
    () => [
      { value: NO_SO, label: "Tanpa Stock Opname" },
      ...stockOpnames.map((s) => ({ value: s.id, label: s.no })),
    ],
    [stockOpnames],
  );

  const productOptions = useMemo(() => {
    const rows = [
      ...items
        .filter((item) => item.status === "aktif")
        .map((item) => ({
          value: `item:${item.id}`,
          label: `${item.kode} - ${item.nama} (Material)`,
        })),
      ...finishGoods
        .filter((fg) => fg.status === "aktif")
        .map((fg) => ({
          value: `fg:${fg.id}`,
          label: `${fg.kode} - ${fg.nama} (Finish Good)`,
        })),
    ];
    return rows.sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [items, finishGoods]);

  const mandiri = !soId;

  const [lines, setLines] = useState<AdjustmentLine[]>(() => {
    if (existing) return existing.lines;
    const so = stockOpnames.find((s) => s.id === initialSo);
    return (
      so?.lines.map((l) => ({
        jenis: l.jenis,
        refId: l.refId,
        kode: l.kode,
        nama: l.nama,
        qty: Math.abs(l.selisih),
        out: l.selisih < 0 ? Math.abs(l.selisih) : 0,
        in: l.selisih > 0 ? l.selisih : 0,
        keterangan: "Dari stock opname",
      })) ?? []
    );
  });

  function loadFromSo(id: string) {
    setSoId(id);
    setQtyText({});
    const so = stockOpnames.find((s) => s.id === id);
    if (!so) {
      setLines([]);
      return;
    }
    setLines(
      so.lines.map((l) => ({
        jenis: l.jenis,
        refId: l.refId,
        kode: l.kode,
        nama: l.nama,
        qty: Math.abs(l.selisih),
        out: l.selisih < 0 ? Math.abs(l.selisih) : 0,
        in: l.selisih > 0 ? l.selisih : 0,
        keterangan: "Dari stock opname",
      })),
    );
  }

  function addManualLine() {
    const [jenis, refId] = picker.split(":");
    if ((jenis !== "item" && jenis !== "fg") || !refId) return;
    if (lines.some((line) => line.jenis === jenis && line.refId === refId)) {
      toast.error("Barang sudah ada di baris adjustment");
      setPicker("");
      return;
    }
    const ref =
      jenis === "item"
        ? items.find((item) => item.id === refId)
        : finishGoods.find((fg) => fg.id === refId);
    if (!ref) {
      toast.error("Barang tidak ditemukan");
      setPicker("");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        jenis,
        refId: ref.id,
        kode: ref.kode,
        nama: ref.nama,
        qty: 0,
        out: 0,
        in: 0,
        keterangan: "Adjustment mandiri",
      },
    ]);
    setPicker("");
  }

  function applySignedQty(idx: number, raw: string) {
    setQtyText((prev) => ({ ...prev, [idx]: raw }));
    if (raw === "" || raw === "-" || raw === "+") return;
    const value = Number(raw);
    if (Number.isNaN(value)) return;
    const abs = Math.abs(value);
    setLines((prev) =>
      prev.map((line, i) =>
        i === idx
          ? {
              ...line,
              qty: abs,
              in: value > 0 ? abs : 0,
              out: value < 0 ? abs : 0,
            }
          : line,
      ),
    );
  }

  function save(nextStatus: Adjustment["status"] = "menunggu_approval") {
    if (lines.length === 0) {
      toast.error("Tambahkan minimal satu baris item");
      return;
    }
    if (lines.some((line) => !line.refId || (line.in <= 0 && line.out <= 0))) {
      toast.error("Setiap baris wajib memilih barang dan Qty plus atau minus");
      return;
    }
    const payload: Adjustment = {
      id: existing?.id ?? uid("adj"),
      no: existing?.no ?? formatDocNo(tanggal, adjustments.length + 1),
      tanggal,
      stockOpnameId: selectedSo?.id ?? "",
      stockOpnameNo: selectedSo?.no ?? "",
      lines,
      status: nextStatus,
      keterangan,
      fotoBukti: fotoBukti.map((f) => f.dataUrl),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      approvedBy:
        nextStatus === "disetujui" || nextStatus === "ditolak"
          ? user?.nama
          : existing?.approvedBy,
    };
    upsert(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: `Adjustment ${nextStatus}`,
      detail: payload.no,
    });
    toast.success(`Adjustment ${payload.no} disimpan`);
    router.push(`/transaksi/adjustment/${payload.id}`);
  }

  function approve(ok: boolean) {
    if (!canApprove) {
      toast.error("Hanya Super Admin yang dapat approve");
      return;
    }
    if (!existing) return;
    const payload: Adjustment = {
      ...existing,
      status: ok ? "disetujui" : "ditolak",
      approvedBy: user?.nama,
      fotoBukti: fotoBukti.map((f) => f.dataUrl),
    };
    upsert(payload);
    setStatus(payload.status);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: ok ? "Approve Adjustment" : "Tolak Adjustment",
      detail: payload.no,
    });
    toast.success(ok ? "Adjustment disetujui" : "Adjustment ditolak");
  }

  if (!isNew && !existing) {
    return (
      <div>
        <BackLink href="/transaksi/adjustment" />
        <PageHeader
          title="Adjustment tidak ditemukan"
          description="Dokumen yang diminta tidak ada di data."
        />
      </div>
    );
  }

  return (
    <div>
      <BackLink href="/transaksi/adjustment" />
      <PageHeader
        title={isNew ? "Buat Adjustment" : `Adjustment ${existing?.no ?? ""}`}
        description="Bisa merujuk Stock Opname, atau dibuat mandiri tanpa referensi SO. Persetujuan hanya oleh Super Admin."
        action={!isNew ? <StatusBadge status={status} /> : null}
      />

      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Tanggal</Label>
          <Input
            type="date"
            value={tanggal}
            disabled={readOnly}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>No. Stock Opname</Label>
          {readOnly ? (
            <p className="text-sm text-slate-900">
              {selectedSo?.no || "Tanpa Stock Opname"}
            </p>
          ) : (
            <Select
              value={soId || NO_SO}
              onValueChange={(v) => loadFromSo(!v || v === NO_SO ? "" : v)}
              items={soSelectItems}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opsional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SO}>Tanpa Stock Opname</SelectItem>
                {stockOpnames.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1.5">
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
          <CardTitle className="text-base">Baris Adjustment</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto space-y-3">
          {!readOnly && mandiri && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label>Material / Finish Good</Label>
                <Select
                  value={picker}
                  onValueChange={(v) => setPicker(v ?? "")}
                  items={productOptions}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pilih Material atau Finish Good..." />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,36rem)]">
                    {productOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                className="bg-emerald-700 hover:bg-emerald-800"
                disabled={!picker}
                onClick={addManualLine}
              >
                <Plus className="mr-1 size-4" />
                Tambah Baris Item
              </Button>
            </div>
          )}
          <table className={tableShellClass}>
            <colgroup>
              {colGroupAdjustmentLines.map((width, index) => (
                <col key={index} className={width} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/30">
                <th className={tableHeadCellClass}>Jenis</th>
                <th className={tableHeadCellClass}>Kode</th>
                <th className={tableHeadCellClass}>Nama</th>
                <th className={tableHeadCellRightClass}>Qty</th>
                <th className={tableHeadCellRightClass}>Out</th>
                <th className={tableHeadCellRightClass}>In</th>
                <th className={tableHeadCellClass}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-sm text-muted-foreground"
                  >
                    {mandiri
                      ? "Tambahkan Material atau Finish Good, lalu isi Qty Adjustment (plus atau minus)."
                      : "Stock Opname ini tidak memiliki baris selisih."}
                  </td>
                </tr>
              )}
              {lines.map((l, idx) => (
                <tr key={`${l.jenis}-${l.refId}-${idx}`} className="border-b last:border-0">
                  <td className={tableBodyCellClass}>
                    {formatJenisBarang(l.jenis)}
                  </td>
                  <td className={tableBodyCellClass}>{l.kode}</td>
                  <td className={`${tableBodyCellClass} whitespace-normal`}>
                    {l.nama}
                  </td>
                  <td className={tableBodyCellRightClass}>
                    {!readOnly && mandiri ? (
                      <Input
                        type="number"
                        className="ml-auto w-24 text-right"
                        value={qtyText[idx] ?? String(signedQty(l))}
                        onChange={(e) => applySignedQty(idx, e.target.value)}
                      />
                    ) : (
                      l.qty
                    )}
                  </td>
                  <td
                    className={cn(
                      tableBodyCellRightClass,
                      l.out > 0 && "text-red-700",
                    )}
                  >
                    {l.out}
                  </td>
                  <td
                    className={cn(
                      tableBodyCellRightClass,
                      l["in"] > 0 && "text-emerald-700",
                    )}
                  >
                    {l["in"]}
                  </td>
                  <td className={`${tableBodyCellClass} whitespace-normal`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{l.keterangan}</span>
                      {!readOnly && mandiri && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          onClick={() =>
                            setLines((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2 rounded-lg border border-dashed bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">
              Ringkasan arah stok per baris
            </p>
            <ul className="space-y-1.5 text-sm">
              {lines.map((l, idx) => (
                <li key={idx} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-slate-800">
                    {l.kode} - {l.nama}:
                  </span>
                  <span
                    className={cn(
                      l.in > 0 && l.out === 0 && "text-emerald-700",
                      l.out > 0 && l.in === 0 && "text-red-700",
                    )}
                  >
                    {movementLabel(l)}
                    {l.out > 0 ? ` (Out ${l.out})` : ""}
                    {l.in > 0 ? ` (In ${l.in})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Foto Bukti Alasan</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            label="Bukti alasan adjustment"
            hint="Unggah foto pendukung (mis. hasil hitung fisik)."
            files={fotoBukti}
            onChange={setFotoBukti}
            disabled={readOnly && status !== "draft"}
          />
        </CardContent>
      </Card>

      {isNew && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save("draft")}>
            Simpan Draft
          </Button>
          <Button
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={() => save("menunggu_approval")}
          >
            Ajukan Approval
          </Button>
        </div>
      )}

      {!isNew && existing?.status === "menunggu_approval" && (
        <div className="flex flex-wrap gap-2">
          {canApprove ? (
            <>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => approve(true)}
              >
                Approve
              </Button>
              <Button variant="destructive" onClick={() => approve(false)}>
                Reject
              </Button>
            </>
          ) : (
            <p className="text-sm text-amber-700">
              Menunggu Super Admin. Ganti role di sidebar untuk demo approval.
            </p>
          )}
        </div>
      )}

      {existing?.approvedBy && (
        <p className="mt-3 text-xs text-muted-foreground">
          Diproses oleh: {existing.approvedBy}
        </p>
      )}
    </div>
  );
}

export default function AdjustmentFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Memuat...</div>}>
      <AdjustmentFormInner />
    </Suspense>
  );
}
