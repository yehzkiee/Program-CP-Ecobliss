"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
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
import type {
  Bom,
  BomLineFg,
  BomLineItem,
  FinishGood,
  MaterialItem,
} from "@/lib/types";
import { formatDateID, todayISO, uid } from "@/lib/utils";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";

type BomSnapshot = {
  kode: string;
  fgId: string;
  keterangan: string;
  lineItems: BomLineItem[];
  lineFgs: BomLineFg[];
};

function cloneLines<T>(lines: T[]): T[] {
  return lines.map((l) => ({ ...l }));
}

function detectBomChanges(
  before: BomSnapshot,
  after: BomSnapshot,
  itemMap: Record<string, MaterialItem>,
  fgMap: Record<string, FinishGood>,
): string[] {
  const changes: string[] = [];

  if (before.kode !== after.kode) {
    changes.push(`Before: ${before.kode}`);
    changes.push(`After: ${after.kode}`);
  }
  if (before.fgId !== after.fgId) {
    const from = fgMap[before.fgId]?.nama ?? before.fgId;
    const to = fgMap[after.fgId]?.nama ?? after.fgId;
    changes.push(`Before: ${from}`);
    changes.push(`After: ${to}`);
  }
  if (before.keterangan !== after.keterangan) {
    changes.push(`Before: ${before.keterangan || "-"}`);
    changes.push(`After: ${after.keterangan || "-"}`);
  }

  const beforeItems = new Map(
    before.lineItems.filter((l) => l.itemId).map((l) => [l.itemId, l.qty]),
  );
  const afterItems = new Map(
    after.lineItems.filter((l) => l.itemId).map((l) => [l.itemId, l.qty]),
  );

  for (const [itemId, qty] of afterItems) {
    const label = itemMap[itemId]?.kode ?? itemMap[itemId]?.nama ?? itemId;
    if (!beforeItems.has(itemId)) {
      changes.push(`Before: -`);
      changes.push(`After: Material ${label} Qty ${qty}`);
    } else if (beforeItems.get(itemId) !== qty) {
      changes.push(`Before: Material ${label} Qty ${beforeItems.get(itemId)}`);
      changes.push(`After: Material ${label} Qty ${qty}`);
    }
  }
  for (const [itemId, qty] of beforeItems) {
    if (!afterItems.has(itemId)) {
      const label = itemMap[itemId]?.kode ?? itemMap[itemId]?.nama ?? itemId;
      changes.push(`Before: Material ${label} Qty ${qty}`);
      changes.push(`After: -`);
    }
  }

  const beforeFgs = new Map(
    before.lineFgs.filter((l) => l.fgId).map((l) => [l.fgId, l.qty]),
  );
  const afterFgs = new Map(
    after.lineFgs.filter((l) => l.fgId).map((l) => [l.fgId, l.qty]),
  );

  for (const [fgId, qty] of afterFgs) {
    const label = fgMap[fgId]?.kode ?? fgMap[fgId]?.nama ?? fgId;
    if (!beforeFgs.has(fgId)) {
      changes.push(`Before: -`);
      changes.push(`After: Finish Good ${label} Qty ${qty}`);
    } else if (beforeFgs.get(fgId) !== qty) {
      changes.push(`Before: Finish Good ${label} Qty ${beforeFgs.get(fgId)}`);
      changes.push(`After: Finish Good ${label} Qty ${qty}`);
    }
  }
  for (const [fgId, qty] of beforeFgs) {
    if (!afterFgs.has(fgId)) {
      const label = fgMap[fgId]?.kode ?? fgMap[fgId]?.nama ?? fgId;
      changes.push(`Before: Finish Good ${label} Qty ${qty}`);
      changes.push(`After: -`);
    }
  }

  return changes;
}

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
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const existing = boms.find((b) => b.id === params.id);
  const latest = existing ? getLatestBomRevision(existing) : null;

  const [isEditing, setIsEditing] = useState(isNew);
  const [baseline, setBaseline] = useState<BomSnapshot | null>(null);

  const [kode, setKode] = useState(existing?.kode ?? "");
  const [fgId, setFgId] = useState(existing?.fgId ?? finishGoods[0]?.id ?? "");
  const [keterangan, setKeterangan] = useState(existing?.keterangan ?? "");
  const [lineItems, setLineItems] = useState<BomLineItem[]>(
    latest?.items ?? [{ itemId: items[0]?.id ?? "", qty: 1 }],
  );
  const [lineFgs, setLineFgs] = useState<BomLineFg[]>(latest?.fgs ?? []);

  const canEdit = isNew || isEditing;
  const isViewMode = !isNew && !isEditing;

  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  const fgSelectItems = useMemo(
    () => finishGoods.map((f) => ({ value: f.id, label: f.nama })),
    [finishGoods],
  );
  const itemSelectItems = useMemo(
    () => items.map((i) => ({ value: i.id, label: i.nama })),
    [items],
  );

  const currentSnapshot = (): BomSnapshot => ({
    kode,
    fgId,
    keterangan,
    lineItems: cloneLines(lineItems),
    lineFgs: cloneLines(lineFgs),
  });

  function applySnapshot(snap: BomSnapshot) {
    setKode(snap.kode);
    setFgId(snap.fgId);
    setKeterangan(snap.keterangan);
    setLineItems(cloneLines(snap.lineItems));
    setLineFgs(cloneLines(snap.lineFgs));
  }

  function startEdit() {
    const snap = currentSnapshot();
    setBaseline(snap);
    setIsEditing(true);
  }

  function cancelEdit() {
    if (baseline) applySnapshot(baseline);
    else if (existing) {
      const rev = getLatestBomRevision(existing);
      applySnapshot({
        kode: existing.kode,
        fgId: existing.fgId,
        keterangan: existing.keterangan,
        lineItems: rev?.items ?? [],
        lineFgs: rev?.fgs ?? [],
      });
    }
    setBaseline(null);
    setIsEditing(false);
  }

  function save() {
    if (!kode || !fgId) {
      toast.error("Kode BOM dan Finish Good wajib");
      return;
    }

    const after = currentSnapshot();
    after.lineItems = after.lineItems.filter((l) => l.itemId);
    after.lineFgs = after.lineFgs.filter((l) => l.fgId);

    if (isNew) {
      const revision = {
        revisi: 1,
        tanggal: todayISO(),
        bagianDirevisi: "Inisial",
        keterangan: "Pembuatan awal",
        detailPerubahan: ["Pembuatan awal BOM"],
        items: after.lineItems,
        fgs: after.lineFgs,
      };
      const bom: Bom = {
        id: uid("bom"),
        kode: after.kode,
        fgId: after.fgId,
        keterangan: after.keterangan,
        revisions: [revision],
      };
      upsertBom(bom);
      addLog({
        waktu: new Date().toISOString(),
        userId: user?.id ?? "local",
        userNama: user?.nama ?? "User",
        aksi: "Buat BOM",
        detail: `${bom.kode} Rev.1`,
      });
      toast.success("BOM dibuat");
      router.push(`/master/bom/${bom.id}`);
      return;
    }

    if (!existing) {
      toast.error("BOM tidak ditemukan");
      return;
    }

    const before =
      baseline ??
      ({
        kode: existing.kode,
        fgId: existing.fgId,
        keterangan: existing.keterangan,
        lineItems: cloneLines(latest?.items ?? []),
        lineFgs: cloneLines(latest?.fgs ?? []),
      } satisfies BomSnapshot);

    const changes = detectBomChanges(before, after, itemMap, fgMap);
    if (changes.length === 0) {
      toast.error("Tidak ada perubahan untuk disimpan");
      return;
    }

    const nextRevisi = (latest?.revisi ?? 0) + 1;
    const revision = {
      revisi: nextRevisi,
      tanggal: todayISO(),
      bagianDirevisi: changes.slice(0, 2).join("; "),
      keterangan: changes.join("; "),
      detailPerubahan: changes,
      items: after.lineItems,
      fgs: after.lineFgs,
    };

    const bom: Bom = {
      id: existing.id,
      kode: after.kode,
      fgId: after.fgId,
      keterangan: after.keterangan,
      revisions: [...existing.revisions, revision],
    };

    upsertBom(bom);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: "Revisi BOM",
      detail: `${bom.kode} Rev.${nextRevisi}`,
    });
    toast.success(`Revisi ${nextRevisi} tersimpan`);
    setBaseline(null);
    setIsEditing(false);
    applySnapshot(after);
  }

  if (!isNew && !existing) {
    return (
      <div>
        <BackLink href="/master/bom" />
        <PageHeader
          title="BOM tidak ditemukan"
          description="Dokumen yang diminta tidak ada di data."
        />
      </div>
    );
  }

  return (
    <div>
      {confirmDialog}
      <BackLink href="/master/bom" />
      <PageHeader
        title={isNew ? "Tambah BOM" : "BOM"}
        description={
          isViewMode
            ? "Mode detail (hanya baca). Klik Edit untuk mengubah data."
            : "Bagian atas: Material. Bagian bawah: Finish Good terkait. Revisi tercatat dengan format Before / After."
        }
        action={
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <Button asChild variant="outline">
                <Link href={`/print/bom/${params.id}`} target="_blank">
                  Cetak
                </Link>
              </Button>
            )}
            {isViewMode && (
              <Button
                className="bg-emerald-700 hover:bg-emerald-800"
                onClick={startEdit}
              >
                Edit
              </Button>
            )}
          </div>
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
                <Input
                  value={kode}
                  onChange={(e) => setKode(e.target.value)}
                  disabled={!canEdit}
                  readOnly={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>Finish Good</Label>
                <Select
                  value={fgId}
                  onValueChange={(v) => setFgId(v ?? "")}
                  items={fgSelectItems}
                  disabled={!canEdit}
                >
                  <SelectTrigger disabled={!canEdit}>
                    <SelectValue placeholder="Pilih Finish Good">
                      {(value: string | null) => {
                        const fg = finishGoods.find((row) => row.id === value);
                        if (!fg) return "Pilih Finish Good";
                        return (
                          <ItemNameWithType jenis="fg">{fg.nama}</ItemNameWithType>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {finishGoods.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <ItemNameWithType jenis="fg">{f.nama}</ItemNameWithType>
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
                  disabled={!canEdit}
                  readOnly={!canEdit}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Material</CardTitle>
              {canEdit && (
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
                  <Plus className="mr-1 size-4" /> Material
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada material.</p>
              ) : (
                lineItems.map((line, idx) => (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={line.itemId}
                      onValueChange={(v) => {
                        const vv = v ?? "";
                        const next = [...lineItems];
                        next[idx] = { ...line, itemId: vv };
                        setLineItems(next);
                      }}
                      items={itemSelectItems}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="flex-1" disabled={!canEdit}>
                        <SelectValue placeholder="Pilih material">
                          {(value: string | null) => {
                            const item = items.find((row) => row.id === value);
                            if (!item) return "Pilih material";
                            return (
                              <ItemNameWithType jenis="item">{item.nama}</ItemNameWithType>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            <ItemNameWithType jenis="item">{i.nama}</ItemNameWithType>
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
                      disabled={!canEdit}
                      readOnly={!canEdit}
                    />
                    {canEdit && (
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
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Finish Good</CardTitle>
              {canEdit && (
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
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {lineFgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Opsional. Komposisi finish good terkait juga tampil di halaman detail Finish Good.
                </p>
              ) : (
                lineFgs.map((line, idx) => (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={line.fgId}
                      onValueChange={(v) => {
                        const vv = v ?? "";
                        const next = [...lineFgs];
                        next[idx] = { ...line, fgId: vv };
                        setLineFgs(next);
                      }}
                      items={fgSelectItems}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="flex-1" disabled={!canEdit}>
                        <SelectValue placeholder="Pilih Finish Good">
                          {(value: string | null) => {
                            const fg = finishGoods.find((row) => row.id === value);
                            if (!fg) return "Pilih Finish Good";
                            return (
                              <ItemNameWithType jenis="fg">{fg.nama}</ItemNameWithType>
                            );
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {finishGoods.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <ItemNameWithType jenis="fg">{f.nama}</ItemNameWithType>
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
                      disabled={!canEdit}
                      readOnly={!canEdit}
                    />
                    {canEdit && (
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
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
                {isNew ? "Simpan BOM" : "Simpan Revisi"}
              </Button>
              {!isNew && (
                <Button variant="outline" onClick={cancelEdit}>
                  Batal
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="h-fit border-border/80 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Riwayat Revisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!existing ? (
              <p className="text-sm text-muted-foreground">
                Belum ada riwayat. Akan menjadi Rev. 1.
              </p>
            ) : (
              [...existing.revisions]
                .sort((a, b) => b.revisi - a.revisi)
                .map((r) => (
                  <div
                    key={r.revisi}
                    className="rounded-lg border border-border/70 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>Rev. {r.revisi}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateID(r.tanggal)}
                      </span>
                    </div>
                    {r.detailPerubahan && r.detailPerubahan.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {r.detailPerubahan.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        <p>Before: {r.bagianDirevisi || "-"}</p>
                        <p>After: {r.keterangan || "-"}</p>
                      </div>
                    )}
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
