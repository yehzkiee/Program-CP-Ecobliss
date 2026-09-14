"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { BackLink, PageHeader } from "@/components/shared/page-header";
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
import { getLatestBomRevision } from "@/lib/mock/data";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Bom, BomLineFg, BomLineItem } from "@/lib/types";
import { formatDateID, todayISO, uid } from "@/lib/utils";

export default function BomFormPage() {
  const params = useParams<{ id: string }>();
  const isNew = params.id === "baru";
  const router = useRouter();
  const boms = useDataStore((s) => s.boms);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const upsertBom = useDataStore((s) => s.upsertBom);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);

  const existing = boms.find((b) => b.id === params.id);
  const latest = existing ? getLatestBomRevision(existing) : null;

  const [kode, setKode] = useState(existing?.kode ?? "");
  const [fgId, setFgId] = useState(existing?.fgId ?? finishGoods[0]?.id ?? "");
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [bagianDirevisi, setBagianDirevisi] = useState(
    isNew ? "Inisial" : "",
  );
  const [revisiNote, setRevisiNote] = useState("");
  const [lineItems, setLineItems] = useState<BomLineItem[]>(
    latest?.items ?? [{ itemId: items[0]?.id ?? "", qty: 1 }],
  );
  const [lineFgs, setLineFgs] = useState<BomLineFg[]>(latest?.fgs ?? []);

  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  function save() {
    if (!kode || !fgId) {
      toast.error("Kode BOM dan Finish Good wajib");
      return;
    }
    if (!isNew && !bagianDirevisi) {
      toast.error("Isi bagian yang direvisi");
      return;
    }

    const nextRevisi = isNew ? 1 : (latest?.revisi ?? 0) + 1;
    const revision = {
      revisi: nextRevisi,
      tanggal: todayISO(),
      bagianDirevisi: bagianDirevisi || "Inisial",
      keterangan: revisiNote || (isNew ? "Pembuatan awal" : "Revisi"),
      items: lineItems.filter((l) => l.itemId),
      fgs: lineFgs.filter((l) => l.fgId),
    };

    const bom: Bom = {
      id: existing?.id ?? uid("bom"),
      kode,
      fgId,
      keterangan,
      revisions: isNew
        ? [revision]
        : [...(existing?.revisions ?? []), revision],
    };

    upsertBom(bom);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: isNew ? "Buat BOM" : "Revisi BOM",
      detail: `${bom.kode} Rev.${nextRevisi}`,
    });
    toast.success(isNew ? "BOM dibuat" : "Revisi BOM tersimpan");
    router.push(`/master/bom/${bom.id}`);
  }

  return (
    <div>
      <BackLink href="/master/bom" />
      <PageHeader
        title={isNew ? "Tambah BOM" : `BOM ${existing?.kode ?? ""}`}
        description="Bagian atas: Material. Bagian bawah: Finish Good turunan. Revisi tercatat dengan tanggal."
        action={
          !isNew ? (
            <Button asChild variant="outline">
              <Link href={`/print/bom/${params.id}`} target="_blank">
                Cetak
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-border/80 bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Header</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kode BOM</Label>
                <Input value={kode} onChange={(e) => setKode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Finish Good Utama</Label>
                <Select value={fgId} onValueChange={(v) => setFgId(v ?? "")}>
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
              <div className="space-y-2 sm:col-span-2">
                <Label>Keterangan</Label>
                <Textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                />
              </div>
              {!isNew && (
                <>
                  <div className="space-y-2">
                    <Label>Bagian Direvisi</Label>
                    <Input
                      value={bagianDirevisi}
                      onChange={(e) => setBagianDirevisi(e.target.value)}
                      placeholder="Contoh: Qty Item 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan Revisi</Label>
                    <Input
                      value={revisiNote}
                      onChange={(e) => setRevisiNote(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Material (Atas)</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setLineItems([
                    ...lineItems,
                    { itemId: items[0]?.id ?? "", qty: 1 },
                  ])
                }
              >
                <Plus className="mr-1 size-4" /> Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {lineItems.map((line, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    value={line.itemId}
                    onValueChange={(v) => { const vv = v ?? ""; 
                      const next = [...lineItems];
                      next[idx] = { ...line, itemId: vv };
                      setLineItems(next);
                     }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.kode} — {i.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="sm:w-28"
                    value={line.qty}
                    onChange={(e) => {
                      const next = [...lineItems];
                      next[idx] = {
                        ...line,
                        qty: Number(e.target.value) || 0,
                      };
                      setLineItems(next);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setLineItems(lineItems.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Finish Good (Bawah)</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setLineFgs([
                    ...lineFgs,
                    { fgId: finishGoods[0]?.id ?? "", qty: 1 },
                  ])
                }
              >
                <Plus className="mr-1 size-4" /> FG
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {lineFgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Opsional — tambah FG turunan bila diperlukan.
                </p>
              ) : (
                lineFgs.map((line, idx) => (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={line.fgId}
                      onValueChange={(v) => { const vv = v ?? ""; 
                        const next = [...lineFgs];
                        next[idx] = { ...line, fgId: vv };
                        setLineFgs(next);
                       }}
                    >
                      <SelectTrigger className="flex-1">
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
                    <Input
                      type="number"
                      className="sm:w-28"
                      value={line.qty}
                      onChange={(e) => {
                        const next = [...lineFgs];
                        next[idx] = {
                          ...line,
                          qty: Number(e.target.value) || 0,
                        };
                        setLineFgs(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setLineFgs(lineFgs.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
            {isNew ? "Simpan BOM" : "Simpan sebagai Revisi Baru"}
          </Button>
        </div>

        <Card className="h-fit border-border/80 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Riwayat Revisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!existing ? (
              <p className="text-sm text-muted-foreground">
                Belum ada riwayat — akan menjadi Rev. 1.
              </p>
            ) : (
              [...existing.revisions]
                .sort((a, b) => b.revisi - a.revisi)
                .map((r) => (
                  <div
                    key={r.revisi}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Rev. {r.revisi}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateID(r.tanggal)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {r.bagianDirevisi}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.keterangan}</p>
                    <p className="mt-1 text-xs">
                      {r.items.map((l) => itemMap[l.itemId]?.kode).join(", ")}
                      {r.fgs.length
                        ? ` · FG: ${r.fgs.map((l) => fgMap[l.fgId]?.kode).join(", ")}`
                        : ""}
                    </p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
