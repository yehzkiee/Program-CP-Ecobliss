"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useDataStore } from "@/lib/store";
import type { Customer, MaterialItem, StatusAktif } from "@/lib/types";
import { formatStatusLabel, uid } from "@/lib/utils";

const UOM_OPTIONS = ["LBR", "KG", "M", "PCS", "BOX", "ROLL", "SET"] as const;
const UOM_NONE = "-";

const blank = (): MaterialItem => ({
  id: "",
  kode: "",
  nama: "",
  customerId: "",
  kategori: "Bahan Baku",
  uom1: "PCS",
  konversi1: 1,
  uom2: "",
  konversi2: 0,
  uom3: "",
  konversi3: 0,
  batchCustomer: "",
  status: "aktif",
});

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
  items: MaterialItem[],
  excludeItemId?: string,
): string {
  const customer = customers.find((c) => c.id === customerId);
  const initials = customerInitials(customer?.nama ?? "XX");
  const prefix = `BC-${initials}-`;
  const seqs = items
    .filter((i) => i.customerId === customerId && i.id !== excludeItemId)
    .map((i) => {
      const match = i.batchCustomer.match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

export default function ItemPage() {
  const items = useDataStore((s) => s.items);
  const customers = useDataStore((s) => s.customers);
  const upsert = useDataStore((s) => s.upsertItem);
  const [filterItem, setFilterItem] = useState("all");
  const [filterCust, setFilterCust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MaterialItem>(blank());
  const [batchEdited, setBatchEdited] = useState(false);

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const fallbackCustomerId = customers[0]?.id ?? "";
  const fallbackCustomerNama = customers[0]?.nama ?? "PT Sinar Abadi";

  useEffect(() => {
    if (!fallbackCustomerId) return;
    for (const item of items) {
      if (!item.customerId || !custMap[item.customerId]) {
        upsert({ ...item, customerId: fallbackCustomerId });
      }
    }
  }, [items, custMap, fallbackCustomerId, upsert]);

  function resolveCustomerNama(customerId: string) {
    const nama = custMap[customerId]?.nama?.trim();
    return nama || fallbackCustomerNama;
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchItem = filterItem === "all" || i.id === filterItem;
      const matchCust = filterCust === "all" || i.customerId === filterCust;
      const matchStatus = filterStatus === "all" || i.status === filterStatus;
      return matchItem && matchCust && matchStatus;
    });
  }, [items, filterItem, filterCust, filterStatus]);

  const itemFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Material" },
      ...items.map((i) => ({
        value: i.id,
        label: `${i.kode} - ${i.nama}`,
      })),
    ],
    [items],
  );

  const statusFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Status" },
      { value: "aktif", label: "Aktif" },
      { value: "nonaktif", label: "Nonaktif" },
    ],
    [],
  );

  function openCreate() {
    const customerId = fallbackCustomerId;
    setBatchEdited(false);
    setForm({
      ...blank(),
      id: uid("item"),
      customerId,
      batchCustomer: customerId
        ? generateBatchCustomer(customerId, customers, items)
        : "",
    });
    setOpen(true);
  }

  function save() {
    if (!form.kode || !form.nama || !form.customerId) {
      toast.error("Lengkapi kode, nama, dan customer");
      return;
    }
    const batchCustomer =
      form.batchCustomer ||
      generateBatchCustomer(form.customerId, customers, items);
    upsert({ ...form, batchCustomer, konversi1: 1 });
    toast.success("Material disimpan");
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="DB Material"
        description="Master material dengan customer, UOM, batch, dan status."
        action={
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={openCreate}>
            Tambah Material
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select
          value={filterItem}
          onValueChange={(v) => setFilterItem(v ?? "all")}
          items={itemFilterItems}
        >
          <SelectTrigger className="w-full max-w-sm bg-white">
            <SelectValue placeholder="Pilih Material...">
              {(value: string | null) => {
                if (!value || value === "all") return "Semua Material";
                const item = items.find((row) => row.id === value);
                if (!item) return null;
                return (
                  <ItemNameWithType jenis="item">
                    {item.kode} - {item.nama}
                  </ItemNameWithType>
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Material</SelectItem>
            {items.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                <ItemNameWithType jenis="item">
                  {i.kode} - {i.nama}
                </ItemNameWithType>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CustomerFilterCombobox
          customers={customers}
          value={filterCust}
          onValueChange={setFilterCust}
          className="w-full sm:w-48"
        />
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v ?? "all")}
          items={statusFilterItems}
        >
          <SelectTrigger className="w-full bg-white sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <ExportExcelButton
          page="Material"
          rows={filtered.map((i) => ({
            kode: i.kode,
            nama: i.nama,
            customer: resolveCustomerNama(i.customerId),
            uom1: i.uom1 ? `${i.uom1} (${i.konversi1})` : "-",
            uom2: i.uom2 ? `${i.uom2} (${i.konversi2})` : "-",
            uom3: i.uom3 ? `${i.uom3} (${i.konversi3})` : "-",
            batch: i.batchCustomer || "-",
            status: formatStatusLabel(i.status),
          }))}
          headers={{
            kode: "Kode",
            nama: "Nama",
            customer: "Customer",
            uom1: "UOM 1",
            uom2: "UOM 2",
            uom3: "UOM 3",
            batch: "Batch Customer",
            status: "Status",
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>UOM 1</TableHead>
              <TableHead>UOM 2</TableHead>
              <TableHead>UOM 3</TableHead>
              <TableHead>Batch Customer</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <Link
                    href={`/master/item/${i.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {i.kode}
                  </Link>
                </TableCell>
                <TableCell>
                  <ItemNameWithType jenis="item">{i.nama}</ItemNameWithType>
                </TableCell>
                <TableCell>
                  {i.customerId ? (
                    <Link
                      href={`/master/customer/${i.customerId}`}
                      className="text-emerald-800 hover:underline"
                    >
                      {resolveCustomerNama(i.customerId)}
                    </Link>
                  ) : (
                    resolveCustomerNama(i.customerId)
                  )}
                </TableCell>
                <TableCell>
                  {i.uom1 ? `${i.uom1} (${i.konversi1})` : "-"}
                </TableCell>
                <TableCell>
                  {i.uom2 ? `${i.uom2} (${i.konversi2})` : "-"}
                </TableCell>
                <TableCell>
                  {i.uom3 ? `${i.uom3} (${i.konversi3})` : "-"}
                </TableCell>
                <TableCell>{i.batchCustomer || "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={i.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Material</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kode Material</Label>
              <Input
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nama Material</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={form.customerId || fallbackCustomerId}
                onValueChange={(v) => {
                  const customerId = v ?? "";
                  const keepManual = batchEdited && form.batchCustomer.trim() !== "";
                  setForm({
                    ...form,
                    customerId,
                    batchCustomer: keepManual
                      ? form.batchCustomer
                      : customerId
                        ? generateBatchCustomer(customerId, customers, items)
                        : "",
                  });
                }}
                items={customers.map((c) => ({ value: c.id, label: c.nama }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch Customer</Label>
              <Input
                value={form.batchCustomer}
                onChange={(e) => {
                  setBatchEdited(true);
                  setForm({ ...form, batchCustomer: e.target.value });
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-sm font-medium text-slate-700">
                Konversi UOM (3 tingkatan)
              </p>
            </div>
            <div className="space-y-2">
              <Label>UOM 1</Label>
              <Select
                value={form.uom1}
                onValueChange={(v) => setForm({ ...form, uom1: v ?? "PCS" })}
                items={UOM_OPTIONS.map((u) => ({ value: u, label: u }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih UOM 1" />
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
            <div className="hidden sm:block" aria-hidden />
            <div className="space-y-2">
              <Label>UOM 2</Label>
              <Select
                value={form.uom2 || UOM_NONE}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    uom2: !v || v === UOM_NONE ? "" : v,
                    konversi2: !v || v === UOM_NONE ? 0 : form.konversi2 || 1,
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
            <div className="space-y-2">
              <Label>Konversi UOM 2</Label>
              <Input
                type="number"
                min={0}
                disabled={!form.uom2}
                value={form.konversi2}
                onChange={(e) =>
                  setForm({ ...form, konversi2: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>UOM 3</Label>
              <Select
                value={form.uom3 || UOM_NONE}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    uom3: !v || v === UOM_NONE ? "" : v,
                    konversi3: !v || v === UOM_NONE ? 0 : form.konversi3 || 1,
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
            <div className="space-y-2">
              <Label>Konversi UOM 3</Label>
              <Input
                type="number"
                min={0}
                disabled={!form.uom3}
                value={form.konversi3}
                onChange={(e) =>
                  setForm({ ...form, konversi3: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as StatusAktif })
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
