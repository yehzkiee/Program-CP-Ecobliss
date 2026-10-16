"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import {
  BackLink,
  PageHeader,
  StatusBadge,
} from "@/components/shared/page-header";
import { DetailField, DocLink } from "@/components/shared/detail-field";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";
import { SearchableCombobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveInput } from "@/components/ui/responsive-input";
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
  TableColGroup,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { colGroupBatchHistory } from "@/lib/table-styles";
import {
  getBatchesForItem,
  isTransferGeneratedBtbLine,
} from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import type { MaterialItem, StatusAktif } from "@/lib/types";
import { formatDateID, formatQty } from "@/lib/utils";

const UOM_OPTIONS = ["LBR", "KG", "M", "PCS", "BOX", "ROLL", "SET"] as const;
const UOM_NONE = "-";

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const items = useDataStore((s) => s.items);
  const customers = useDataStore((s) => s.customers);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const gudangList = useDataStore((s) => s.gudangList);
  const upsert = useDataStore((s) => s.upsertItem);
  const remove = useDataStore((s) => s.deleteItem);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const item = items.find((i) => i.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MaterialItem | null>(null);

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );
  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

  const batches = useMemo(
    () => (item ? getBatchesForItem(item.id, btbs, bkbs) : []),
    [item, btbs, bkbs],
  );

  if (!item) {
    return (
      <div>
        <BackLink href="/master/item" />
        <PageHeader title="Material tidak ditemukan" />
      </div>
    );
  }

  const draft = form ?? item;
  const totalMasuk = batches.reduce(
    (sum, batch) =>
      sum +
      (isTransferGeneratedBtbLine(batch.keterangan) ? 0 : batch.qtyMasuk),
    0,
  );
  const totalSisa = batches.reduce((s, b) => s + b.qtySisa, 0);

  function startEdit() {
    setForm({ ...item! });
    setEditing(true);
  }

  function save() {
    if (!form?.kode || !form.nama || !form.customerId) {
      toast.error("Lengkapi kode, nama, dan customer");
      return;
    }
    upsert({ ...form, batchCustomer: form.batchCustomer.trim() });
    toast.success("Material disimpan");
    setEditing(false);
    setForm(null);
  }

  function handleDelete() {
    const target = item!;
    askConfirm(() => {
      remove(target.id);
      toast.success("Material dihapus");
      router.push("/master/item");
    });
  }

  return (
    <div>
      {confirmDialog}
      <BackLink href="/master/item" />
      <PageHeader
        title={<ItemNameWithType jenis="item">{item.nama}</ItemNameWithType>}
        description={`Kode ${item.kode}`}
        action={
          <div className="flex flex-wrap gap-2">
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
          <CardTitle className="text-base">Informasi Material</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-material-kode">Kode Material</Label>
                <ResponsiveInput
                  id="edit-material-kode"
                  value={draft.kode}
                  onChange={(kode) => setForm({ ...draft, kode })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="edit-material-nama">Nama Material</Label>
                <ResponsiveInput
                  id="edit-material-nama"
                  value={draft.nama}
                  onChange={(nama) => setForm({ ...draft, nama })}
                />
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
                <div className="min-w-0 space-y-1.5">
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
                    filterItem={(item, query) =>
                      item.label.toLowerCase().includes(query.toLowerCase())
                    }
                    clearValueOnInput={false}
                    preserveSearchQuery
                    placeholder="Cari nama customer..."
                    emptyText="Tidak ada customer yang cocok"
                    itemNoun="customer"
                    className="w-full bg-white"
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor="edit-material-batch-customer">Batch Customer</Label>
                  <ResponsiveInput
                    id="edit-material-batch-customer"
                    type="text"
                    className="w-full bg-white"
                    value={draft.batchCustomer}
                    onChange={(batchCustomer) =>
                      setForm({ ...draft, batchCustomer })
                    }
                  />
                </div>
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
              <DetailField label="Kode" value={item.kode} />
              <DetailField
                label="Nama"
                value={<ItemNameWithType jenis="item">{item.nama}</ItemNameWithType>}
              />
              <DetailField
                label="Customer"
                value={
                  item.customerId ? (
                    <DocLink href={`/master/customer/${item.customerId}`}>
                      {custMap[item.customerId]?.nama ?? "-"}
                    </DocLink>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailField
                label="UOM 1"
                value={
                  item.uom1 ? `${item.uom1} (${item.konversi1})` : "-"
                }
              />
              <DetailField
                label="UOM 2"
                value={
                  item.uom2 ? `${item.uom2} (${item.konversi2})` : "-"
                }
              />
              <DetailField
                label="UOM 3"
                value={
                  item.uom3 ? `${item.uom3} (${item.konversi3})` : "-"
                }
              />
              <DetailField label="Batch Customer" value={item.batchCustomer} />
              <DetailField
                label="Status"
                value={<StatusBadge status={item.status} />}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Riwayat Batch ({batches.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Total masuk {formatQty(totalMasuk, item.uom1)} · Sisa{" "}
            {formatQty(totalSisa, item.uom1)}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="table-fixed">
            <TableColGroup widths={colGroupBatchHistory} />
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Masuk</TableHead>
                <TableHead>No. BTB</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Gudang</TableHead>
                <TableHead className="text-right">Qty Masuk</TableHead>
                <TableHead className="text-right">Qty Sisa</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Belum ada penerimaan batch untuk material ini.
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{formatDateID(b.tanggalMasuk)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/transaksi/btb/${b.sumberBtbId}`}
                        className="text-emerald-800 hover:underline"
                      >
                        {b.sumberBtbNo}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {b.batchCustomer}
                    </TableCell>
                    <TableCell>
                      {gudangMap[b.gudangId]?.nama ?? "-"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {formatQty(b.qtyMasuk, b.satuan)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {formatQty(b.qtySisa, b.satuan)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {b.keterangan || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
