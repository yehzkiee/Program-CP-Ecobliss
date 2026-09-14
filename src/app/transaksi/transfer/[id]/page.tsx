"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import type { TransferGudang, TransferLine } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

export default function TransferFormPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "baru";
  const router = useRouter();
  const transfers = useDataStore((s) => s.transfers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const upsert = useDataStore((s) => s.upsertTransfer);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const existing = transfers.find((t) => t.id === params.id);
  const readOnly = !isNew;

  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

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

  function save() {
    const payload: TransferGudang = {
      id: existing?.id ?? uid("tf"),
      no: existing?.no ?? formatDocNo(tanggal, transfers.length + 1),
      tanggal,
      keterangan,
      lines,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    upsert(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: "Transfer Gudang",
      detail: payload.no,
    });
    toast.success("Transfer disimpan");
    router.push(`/transaksi/transfer/${payload.id}`);
  }

  return (
    <div>
      <BackLink href="/transaksi/transfer" />
      <PageHeader
        title={isNew ? "Buat Transfer" : `Transfer ${existing?.no}`}
        description="Item dapat ditransfer ke gudang FG dan sebaliknya."
      />

      <div className="mb-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
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
          <Label>Keterangan</Label>
          <Input
            value={keterangan}
            disabled={readOnly}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>
      </div>

      <Card className="mb-4 border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Baris Transfer</CardTitle>
          {!readOnly && (
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
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-lg border p-3 lg:grid-cols-6"
            >
              <div>
                <Label className="text-xs">Jenis</Label>
                <Select
                  value={line.jenis}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const jenis = vv as "item" | "fg";
                    const ref = jenis === "item" ? items[0] : finishGoods[0];
                    const next = [...lines];
                    next[idx] = {
                      ...line,
                      jenis,
                      refId: ref?.id ?? "",
                      kode: ref?.kode ?? "",
                      nama: ref?.nama ?? "",
                    };
                    setLines(next);}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="fg">FG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">
                <Label className="text-xs">Barang</Label>
                <Select
                  value={line.refId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? "";
                    const ref =
                      line.jenis === "item"
                        ? items.find((i) => i.id === vv)
                        : finishGoods.find((f) => f.id === vv);
                    const next = [...lines];
                    next[idx] = {
                      ...line,
                      refId: vv,
                      kode: ref?.kode ?? "",
                      nama: ref?.nama ?? "",
                    };
                    setLines(next);}}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(line.jenis === "item" ? items : finishGoods).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.kode} — {r.nama}
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
                    const next = [...lines];
                    next[idx] = { ...line, qty: Number(e.target.value) || 0 };
                    setLines(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs">Dari</Label>
                <Select
                  value={line.dariGudangId}
                  disabled={readOnly}
                  onValueChange={(v) => { const vv = v ?? ""; 
                    const next = [...lines];
                    next[idx] = { ...line, dariGudangId: vv };
                    setLines(next);
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
                  <Label className="text-xs">Ke</Label>
                  <Select
                    value={line.keGudangId}
                    disabled={readOnly}
                    onValueChange={(v) => { const vv = v ?? ""; 
                      const next = [...lines];
                      next[idx] = { ...line, keGudangId: vv };
                      setLines(next);
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
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              {readOnly && (
                <p className="text-xs text-muted-foreground lg:col-span-6">
                  {gudangMap[line.dariGudangId]?.nama} →{" "}
                  {gudangMap[line.keGudangId]?.nama}
                </p>
              )}
            </div>
          ))}
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
