"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { SearchableCombobox } from "@/components/ui/combobox";
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ResponsiveInput } from "@/components/ui/responsive-input";
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

type CreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  fallbackCustomerId: string;
  onSave: (row: MaterialItem) => void;
};

function MaterialCreateDialog({
  open,
  onOpenChange,
  customers,
  fallbackCustomerId,
  onSave,
}: CreateDialogProps) {
  const [form, setForm] = useState<MaterialItem>(blank());

  const customerItems = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: customer.nama,
      })),
    [customers],
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      ...blank(),
      id: uid("item"),
      customerId: fallbackCustomerId,
    });
  }, [open, fallbackCustomerId]);

  function save() {
    if (!form.kode || !form.nama || !form.customerId) {
      toast.error("Lengkapi kode, nama, dan customer");
      return;
    }
    onSave({
      ...form,
      batchCustomer: form.batchCustomer.trim(),
      konversi1: 1,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Material</DialogTitle>
        </DialogHeader>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="material-kode">Kode Material</Label>
            <ResponsiveInput
              id="material-kode"
              value={form.kode}
              onChange={(kode) => setForm((prev) => ({ ...prev, kode }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="material-nama">Nama Material</Label>
            <ResponsiveInput
              id="material-nama"
              value={form.nama}
              onChange={(nama) => setForm((prev) => ({ ...prev, nama }))}
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label>Customer</Label>
              <SearchableCombobox
                items={customerItems}
                value={form.customerId || fallbackCustomerId}
                onValueChange={(next) =>
                  setForm((prev) => ({ ...prev, customerId: next ?? "" }))
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
            <div className="min-w-0 space-y-2">
              <Label htmlFor="material-batch-customer">Batch Customer</Label>
              <ResponsiveInput
                id="material-batch-customer"
                className="w-full bg-white"
                value={form.batchCustomer}
                onChange={(batchCustomer) =>
                  setForm((prev) => ({ ...prev, batchCustomer }))
                }
              />
            </div>
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
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, uom1: v ?? "PCS" }))
              }
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
                setForm((prev) => ({
                  ...prev,
                  uom2: !v || v === UOM_NONE ? "" : v,
                  konversi2: !v || v === UOM_NONE ? 0 : prev.konversi2 || 1,
                }))
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
            <ResponsiveInput
              type="number"
              min={0}
              disabled={!form.uom2}
              value={form.konversi2}
              onChange={(raw) =>
                setForm((prev) => ({ ...prev, konversi2: Number(raw) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>UOM 3</Label>
            <Select
              value={form.uom3 || UOM_NONE}
              onValueChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  uom3: !v || v === UOM_NONE ? "" : v,
                  konversi3: !v || v === UOM_NONE ? 0 : prev.konversi3 || 1,
                }))
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
            <ResponsiveInput
              type="number"
              min={0}
              disabled={!form.uom3}
              value={form.konversi3}
              onChange={(raw) =>
                setForm((prev) => ({ ...prev, konversi3: Number(raw) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, status: v as StatusAktif }))
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={save}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ItemPage() {
  const items = useDataStore((s) => s.items);
  const customers = useDataStore((s) => s.customers);
  const upsert = useDataStore((s) => s.upsertItem);
  const [filterItem, setFilterItem] = useState("all");
  const [filterCust, setFilterCust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const fallbackCustomerId = customers[0]?.id ?? "";
  const fallbackCustomerNama = customers[0]?.nama ?? "PT Sinar Abadi";

  useEffect(() => {
    if (!fallbackCustomerId) return;
    const broken = items.filter(
      (item) => !item.customerId || !custMap[item.customerId],
    );
    if (broken.length === 0) return;
    for (const item of broken) {
      upsert({ ...item, customerId: fallbackCustomerId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot repair
  }, [fallbackCustomerId, custMap, upsert]);

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

  const exportRows = useMemo(
    () =>
      filtered.map((i) => ({
        kode: i.kode,
        nama: i.nama,
        customer: resolveCustomerNama(i.customerId),
        uom1: i.uom1 ? `${i.uom1} (${i.konversi1})` : "-",
        uom2: i.uom2 ? `${i.uom2} (${i.konversi2})` : "-",
        uom3: i.uom3 ? `${i.uom3} (${i.konversi3})` : "-",
        batch: i.batchCustomer || "-",
        status: formatStatusLabel(i.status),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, custMap, fallbackCustomerNama],
  );

  return (
    <div>
      <PageHeader
        title="DB Material"
        description="Master material dengan customer, UOM, batch, dan status."
        action={
          <Button
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={() => setOpen(true)}
          >
            Tambah Material
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="w-full min-w-0 max-w-sm">
          <SearchableCombobox
            items={itemFilterItems}
            value={filterItem}
            onValueChange={(next) => setFilterItem(next || "all")}
            filterItem={(item, query) =>
              item.value === "all" ||
              item.label.toLowerCase().includes(query.toLowerCase())
            }
            renderItem={(item) =>
              item.value === "all" ? (
                <span className="block truncate">{item.label}</span>
              ) : (
                <ItemNameWithType jenis="item" className="w-full">
                  {item.label}
                </ItemNameWithType>
              )
            }
            endAdornment={
              filterItem !== "all" ? <ItemTypeBadge jenis="item" /> : null
            }
            placeholder="Cari kode atau nama material..."
            emptyText="Tidak ada material yang cocok"
            itemNoun="material"
            className="bg-white"
          />
        </div>
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
          rows={exportRows}
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

      <MaterialCreateDialog
        open={open}
        onOpenChange={setOpen}
        customers={customers}
        fallbackCustomerId={fallbackCustomerId}
        onSave={(row) => {
          upsert(row);
          toast.success("Material disimpan");
        }}
      />
    </div>
  );
}
