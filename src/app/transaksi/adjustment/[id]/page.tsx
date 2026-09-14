"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BackLink, PageHeader, StatusBadge } from "@/components/shared/page-header";
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
import { todayISO, uid } from "@/lib/utils";

function AdjustmentFormInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const isNew = params.id === "baru";
  const router = useRouter();
  const adjustments = useDataStore((s) => s.adjustments);
  const stockOpnames = useDataStore((s) => s.stockOpnames);
  const upsert = useDataStore((s) => s.upsertAdjustment);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const existing = adjustments.find((a) => a.id === params.id);
  const readOnly = !isNew;

  const soFromQuery = search.get("so");
  const initialSo =
    existing?.stockOpnameId ?? soFromQuery ?? stockOpnames[0]?.id ?? "";

  const [tanggal, setTanggal] = useState(existing?.tanggal ?? todayISO());
  const [soId, setSoId] = useState(initialSo);
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [status, setStatus] = useState(existing?.status ?? "draft");

  const selectedSo = stockOpnames.find((s) => s.id === soId);

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
    const so = stockOpnames.find((s) => s.id === id);
    if (!so) return;
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

  function save(nextStatus: Adjustment["status"] = "menunggu_approval") {
    if (!soId || !selectedSo) {
      toast.error("Pilih No. Stock Opname");
      return;
    }
    if (lines.length === 0) {
      toast.error("Tidak ada baris adjustment");
      return;
    }
    const payload: Adjustment = {
      id: existing?.id ?? uid("adj"),
      no: existing?.no ?? formatDocNo(tanggal, adjustments.length + 1),
      tanggal,
      stockOpnameId: soId,
      stockOpnameNo: selectedSo.no,
      lines,
      status: nextStatus,
      keterangan,
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
    if (user?.role !== "admin") {
      toast.error("Hanya Admin yang dapat approve");
      return;
    }
    if (!existing) return;
    const payload: Adjustment = {
      ...existing,
      status: ok ? "disetujui" : "ditolak",
      approvedBy: user.nama,
    };
    upsert(payload);
    setStatus(payload.status);
    addLog({
      waktu: new Date().toISOString(),
      userId: user.id,
      userNama: user.nama,
      aksi: ok ? "Approve Adjustment" : "Tolak Adjustment",
      detail: payload.no,
    });
    toast.success(ok ? "Adjustment disetujui" : "Adjustment ditolak");
  }

  return (
    <div>
      <BackLink href="/transaksi/adjustment" />
      <PageHeader
        title={isNew ? "Buat Adjustment" : `Adjustment ${existing?.no}`}
        description="Merujuk No. Stock Opname. Approval khusus Admin."
        action={
          !isNew ? <StatusBadge status={status} /> : null
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
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
          <Label>No. Stock Opname</Label>
          <Select
            value={soId}
            onValueChange={(v) => { if (v) loadFromSo(v); }}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih SO" />
            </SelectTrigger>
            <SelectContent>
              {stockOpnames.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.no}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
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
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Jenis</th>
                <th className="pb-2 font-medium">Kode</th>
                <th className="pb-2 font-medium">Nama</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Out</th>
                <th className="pb-2 text-right font-medium">In</th>
                <th className="pb-2 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 uppercase">{l.jenis}</td>
                  <td className="py-2 font-medium">{l.kode}</td>
                  <td className="py-2">{l.nama}</td>
                  <td className="py-2 text-right">{l.qty}</td>
                  <td className="py-2 text-right">{l.out}</td>
                  <td className="py-2 text-right">{l.in}</td>
                  <td className="py-2">{l.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          {user?.role === "admin" ? (
            <>
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={() => approve(true)}
              >
                Setujui
              </Button>
              <Button variant="destructive" onClick={() => approve(false)}>
                Tolak
              </Button>
            </>
          ) : (
            <p className="text-sm text-amber-700">
              Menunggu Admin. Toggle role di sidebar untuk demo approval.
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
