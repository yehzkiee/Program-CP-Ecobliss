"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { SearchableCombobox } from "@/components/ui/combobox";
import {
  BackLink,
  PageHeader,
  StatusBadge,
} from "@/components/shared/page-header";
import { DetailField, DocLink } from "@/components/shared/detail-field";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestBomRevision } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import type { Customer, FinishGood, StatusAktif } from "@/lib/types";
import { formatDateID } from "@/lib/utils";

const UOM_OPTIONS = ["PCS", "BOX", "SET", "PACK", "ROLL"] as const;
const UOM_NONE = "-";

function customerInitials(nama: string): string {
  const cleaned = nama.replace(/^(PT|CV|UD)\.?\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "XX";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function generateBatchCustomer(
  customerId: string,
  customers: Customer[],
  finishGoods: FinishGood[],
  excludeId?: string,
): string {
  const customer = customers.find((c) => c.id === customerId);
  const initials = customerInitials(customer?.nama ?? "XX");
  const prefix = `BC-${initials}-FG`;
  const seqs = finishGoods
    .filter((f) => f.customerId === customerId && f.id !== excludeId)
    .map((f) => {
      const match = (f.batchCustomer ?? "").match(/FG(\d+)$/i);
      return match ? Number(match[1]) : 0;
    });
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

export default function FinishGoodDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const finishGoods = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const boms = useDataStore((s) => s.boms);
  const upsert = useDataStore((s) => s.upsertFg);
  const remove = useDataStore((s) => s.deleteFg);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const fg = finishGoods.find((f) => f.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FinishGood | null>(null);

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  const relatedBom = useMemo(
    () => boms.find((b) => b.fgId === id),
    [boms, id],
  );
  const latestRev = relatedBom
    ? getLatestBomRevision(relatedBom)
    : undefined;

  if (!fg) {
    return (
      <div>
        <BackLink href="/master/finish-good" />
        <PageHeader title="Finish Good tidak ditemukan" />
      </div>
    );
  }

  const draft = form ?? fg;

  function startEdit() {
    const current = fg!;
    const batchCustomer =
      current.batchCustomer?.trim() ||
      (current.customerId
        ? generateBatchCustomer(
            current.customerId,
            customers,
            finishGoods,
            current.id,
          )
        : "");
    setForm({ ...current, batchCustomer });
    setEditing(true);
  }

  function save() {
    if (!form?.kode || !form.nama || !form.customerId) {
      toast.error("Lengkapi kode, nama, dan customer");
      return;
    }
    const batchCustomer =
      form.batchCustomer.trim() ||
      generateBatchCustomer(
        form.customerId,
        customers,
        finishGoods,
        form.id,
      );
    upsert({ ...form, batchCustomer });
    toast.success("Finish Good disimpan");
    setEditing(false);
    setForm(null);
  }

  function handleDelete() {
    const target = fg!;
    askConfirm(() => {
      remove(target.id);
      toast.success("FG dihapus");
      router.push("/master/finish-good");
    });
  }

  return (
    <div>
      {confirmDialog}
      <BackLink href="/master/finish-good" />
      <PageHeader
        title={<ItemNameWithType jenis="fg">{fg.nama}</ItemNameWithType>}
        description={`Kode ${fg.kode}`}
        action={
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setForm(null);
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
            ) : (
              <>
                <Button variant="outline" onClick={startEdit}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={handleDelete}>
                  Hapus
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card className="mb-6 border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Informasi Finish Good</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Kode FG</Label>
                <Input
                  value={draft.kode}
                  onChange={(e) => setForm({ ...draft, kode: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nama FG</Label>
                <Input
                  value={draft.nama}
                  onChange={(e) => setForm({ ...draft, nama: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <SearchableCombobox
                  items={customers.map((customer) => ({
                    value: customer.id,
                    label: customer.nama,
                  }))}
                  value={draft.customerId}
                  onValueChange={(next) =>
                    setForm({ ...draft, customerId: next ?? "" })
                  }
                  placeholder="Cari nama customer..."
                  emptyText="Tidak ada customer yang cocok"
                  itemNoun="customer"
                />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="edit-finish-good-batch-customer">
                  Batch Customer
                </Label>
                <Input
                  id="edit-finish-good-batch-customer"
                  type="text"
                  className="w-full"
                  value={draft.batchCustomer}
                  onChange={(e) =>
                    setForm({ ...draft, batchCustomer: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <p className="text-sm font-medium text-slate-700">
                  Konversi UOM (3 tingkatan)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>UOM 1</Label>
                <Select
                  value={draft.uom1}
                  onValueChange={(v) =>
                    setForm({ ...draft, uom1: v ?? "PCS" })
                  }
                  items={UOM_OPTIONS.map((u) => ({ value: u, label: u }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UOM_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Konversi UOM 1</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.konversi1}
                  onChange={(e) =>
                    setForm({
                      ...draft,
                      konversi1: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>UOM 2</Label>
                <Select
                  value={draft.uom2 || UOM_NONE}
                  onValueChange={(v) =>
                    setForm({
                      ...draft,
                      uom2: !v || v === UOM_NONE ? "" : v,
                      konversi2:
                        !v || v === UOM_NONE ? 0 : draft.konversi2 || 1,
                    })
                  }
                  items={[
                    { value: UOM_NONE, label: "—" },
                    ...UOM_OPTIONS.map((u) => ({ value: u, label: u })),
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opsional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UOM_NONE}>—</SelectItem>
                    {UOM_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Konversi UOM 2</Label>
                <Input
                  type="number"
                  min={0}
                  disabled={!draft.uom2}
                  value={draft.konversi2}
                  onChange={(e) =>
                    setForm({
                      ...draft,
                      konversi2: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>UOM 3</Label>
                <Select
                  value={draft.uom3 || UOM_NONE}
                  onValueChange={(v) =>
                    setForm({
                      ...draft,
                      uom3: !v || v === UOM_NONE ? "" : v,
                      konversi3:
                        !v || v === UOM_NONE ? 0 : draft.konversi3 || 1,
                    })
                  }
                  items={[
                    { value: UOM_NONE, label: "—" },
                    ...UOM_OPTIONS.map((u) => ({ value: u, label: u })),
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opsional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UOM_NONE}>—</SelectItem>
                    {UOM_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Konversi UOM 3</Label>
                <Input
                  type="number"
                  min={0}
                  disabled={!draft.uom3}
                  value={draft.konversi3}
                  onChange={(e) =>
                    setForm({
                      ...draft,
                      konversi3: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) =>
                    setForm({ ...draft, status: v as StatusAktif })
                  }
                  items={[
                    { value: "aktif", label: "Aktif" },
                    { value: "nonaktif", label: "Nonaktif" },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailField label="Kode FG" value={fg.kode} />
              <DetailField
                label="Nama FG"
                value={<ItemNameWithType jenis="fg">{fg.nama}</ItemNameWithType>}
              />
              <DetailField
                label="Customer"
                value={
                  fg.customerId ? (
                    <DocLink href={`/master/customer/${fg.customerId}`}>
                      {custMap[fg.customerId]?.nama ?? "-"}
                    </DocLink>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailField label="Batch Customer" value={fg.batchCustomer} />
              <DetailField
                label="UOM 1"
                value={fg.uom1 ? `${fg.uom1} (${fg.konversi1})` : "-"}
              />
              <DetailField
                label="UOM 2"
                value={fg.uom2 ? `${fg.uom2} (${fg.konversi2})` : "-"}
              />
              <DetailField
                label="UOM 3"
                value={fg.uom3 ? `${fg.uom3} (${fg.konversi3})` : "-"}
              />
              <DetailField
                label="Status"
                value={<StatusBadge status={fg.status} />}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">BOM</CardTitle>
            {relatedBom && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/master/bom/${relatedBom.id}`}>Buka BOM</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!relatedBom || !latestRev ? (
              <p className="text-sm text-muted-foreground">
                Belum ada BOM untuk finish good ini.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Kode" value={relatedBom.kode} />
                  <DetailField
                    label="Revisi terkini"
                    value={`Rev. ${latestRev.revisi}`}
                  />
                  <DetailField
                    label="Keterangan"
                    value={relatedBom.keterangan}
                    className="sm:col-span-2"
                  />
                </div>

                <div>
                  <h3 className="mb-2 text-xs text-muted-foreground">
                    Komposisi material
                  </h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {latestRev.items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="text-muted-foreground"
                            >
                              Tidak ada material.
                            </TableCell>
                          </TableRow>
                        ) : (
                          latestRev.items.map((line) => {
                            const mat = itemMap[line.itemId];
                            return (
                              <TableRow key={line.itemId}>
                                <TableCell>
                                  {mat ? (
                                    <ItemNameWithType jenis="item">
                                      <Link
                                        href={`/master/item/${mat.id}`}
                                        className="text-emerald-800 hover:underline"
                                      >
                                        {mat.kode} - {mat.nama}
                                      </Link>
                                    </ItemNameWithType>
                                  ) : (
                                    line.itemId
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {line.qty}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {latestRev.fgs.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs text-muted-foreground">
                      Komposisi finish good terkait
                    </h3>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Finish Good</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {latestRev.fgs.map((line) => {
                            const child = fgMap[line.fgId];
                            return (
                              <TableRow key={line.fgId}>
                                <TableCell>
                                  {child ? (
                                    <ItemNameWithType jenis="fg">
                                      <Link
                                        href={`/master/finish-good/${child.id}`}
                                        className="text-emerald-800 hover:underline"
                                      >
                                        {child.kode} - {child.nama}
                                      </Link>
                                    </ItemNameWithType>
                                  ) : (
                                    line.fgId
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {line.qty}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Riwayat Revisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!relatedBom ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada riwayat revisi.
              </p>
            ) : (
              [...relatedBom.revisions]
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        Before: {r.bagianDirevisi || "-"}
                        <br />
                        After: {r.keterangan || "-"}
                      </p>
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
