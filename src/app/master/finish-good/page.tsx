"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { SearchableCombobox } from "@/components/ui/combobox";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { MasterImportDialog } from "@/components/shared/master-import-dialog";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import type { Customer, FinishGood, StatusAktif } from "@/lib/types";
import { formatStatusLabel, uid } from "@/lib/utils";

const UOM_OPTIONS = ["PCS", "BOX", "SET", "PACK", "ROLL"] as const;
const UOM_NONE = "-";

const blank = (): FinishGood => ({
  id: "",
  kode: "",
  nama: "",
  customerId: "",
  kategori: "Finish Good",
  batchCustomer: "",
  uom1: "PCS",
  konversi1: 1,
  uom2: "",
  konversi2: 0,
  uom3: "",
  konversi3: 0,
  status: "aktif",
});

type CreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  fallbackCustomerId: string;
  onSave: (row: FinishGood) => void;
};

/** Form state hidup di sini — pengetikan tidak me-render ulang tabel di halaman. */
function FinishGoodCreateDialog({
  open,
  onOpenChange,
  customers,
  fallbackCustomerId,
  onSave,
}: CreateDialogProps) {
  const [form, setForm] = useState<FinishGood>(blank());

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
      id: uid("fg"),
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
          <DialogTitle>Tambah Finish Good</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="finish-good-kode">Kode FG</Label>
            <ResponsiveInput
              id="finish-good-kode"
              value={form.kode}
              onChange={(kode) => setForm((prev) => ({ ...prev, kode }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="finish-good-nama">Nama FG</Label>
            <ResponsiveInput
              id="finish-good-nama"
              value={form.nama}
              onChange={(nama) => setForm((prev) => ({ ...prev, nama }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Customer</Label>
            <SearchableCombobox
              items={customerItems}
              value={form.customerId || fallbackCustomerId}
              onValueChange={(next) =>
                setForm((prev) => ({ ...prev, customerId: next ?? "" }))
              }
              placeholder="Cari nama customer..."
              emptyText="Tidak ada customer yang cocok"
              itemNoun="customer"
              className="bg-white"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="finish-good-batch-customer">Batch Customer</Label>
            <ResponsiveInput
              id="finish-good-batch-customer"
              type="text"
              className="w-full bg-white"
              placeholder="Masukkan batch customer"
              value={form.batchCustomer}
              onChange={(batchCustomer) =>
                setForm((prev) => ({ ...prev, batchCustomer }))
              }
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
                setForm((prev) => ({
                  ...prev,
                  konversi2: Number(raw) || 0,
                }))
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
                setForm((prev) => ({
                  ...prev,
                  konversi3: Number(raw) || 0,
                }))
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

export default function FinishGoodPage() {
  const finishGoods = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const upsert = useDataStore((s) => s.upsertFg);
  const bulkUpsertFgs = useDataStore((s) => s.bulkUpsertFgs);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [filterCust, setFilterCust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const fallbackCustomerId = customers[0]?.id ?? "";
  const fallbackCustomerNama = customers[0]?.nama ?? "PT Sinar Abadi";

  // Perbaikan sekali saja, bukan di setiap render/keypress.
  useEffect(() => {
    if (!fallbackCustomerId) return;
    const broken = finishGoods.filter(
      (fg) => !fg.customerId || !custMap[fg.customerId],
    );
    if (broken.length === 0) return;
    for (const fg of broken) {
      upsert({ ...fg, customerId: fallbackCustomerId });
    }
    // Hanya saat daftar customer berubah; jangan ikuti finishGoods agar tidak loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot repair
  }, [fallbackCustomerId, custMap, upsert]);

  function resolveCustomerNama(customerId: string) {
    const nama = custMap[customerId]?.nama?.trim();
    return nama || fallbackCustomerNama;
  }

  const filtered = useMemo(() => {
    const needle = deferredQ.toLowerCase();
    return finishGoods.filter((i) => {
      const matchQ =
        !needle ||
        i.kode.toLowerCase().includes(needle) ||
        i.nama.toLowerCase().includes(needle);
      const matchCust = filterCust === "all" || i.customerId === filterCust;
      const matchStatus = filterStatus === "all" || i.status === filterStatus;
      return matchQ && matchCust && matchStatus;
    });
  }, [finishGoods, deferredQ, filterCust, filterStatus]);

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
        batch: i.batchCustomer?.trim() || "-",
        uom1: i.uom1 ? `${i.uom1} (${i.konversi1})` : "-",
        uom2: i.uom2 ? `${i.uom2} (${i.konversi2})` : "-",
        uom3: i.uom3 ? `${i.uom3} (${i.konversi3})` : "-",
        status: formatStatusLabel(i.status),
      })),
    // resolveCustomerNama stabil via custMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, custMap, fallbackCustomerNama],
  );

  return (
    <div>
      <PageHeader
        title="DB Finish Good"
        description="Master produk jadi dengan customer, batch, UOM, dan status."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => setOpen(true)}
            >
              Tambah Finish Good
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Cari kode / nama..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm bg-white"
        />
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
          page="Finish_Good"
          rows={exportRows}
          headers={{
            kode: "Kode FG",
            nama: "Nama FG",
            customer: "Customer",
            batch: "Batch Customer",
            uom1: "UOM 1",
            uom2: "UOM 2",
            uom3: "UOM 3",
            status: "Status",
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode FG</TableHead>
              <TableHead>Nama FG</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Batch Customer</TableHead>
              <TableHead>UOM 1</TableHead>
              <TableHead>UOM 2</TableHead>
              <TableHead>UOM 3</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <Link
                    href={`/master/finish-good/${i.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {i.kode}
                  </Link>
                </TableCell>
                <TableCell>
                  <ItemNameWithType jenis="fg">{i.nama}</ItemNameWithType>
                </TableCell>
                <TableCell>{resolveCustomerNama(i.customerId)}</TableCell>
                <TableCell>{i.batchCustomer?.trim() || "-"}</TableCell>
                <TableCell>
                  {i.uom1 ? `${i.uom1} (${i.konversi1})` : "-"}
                </TableCell>
                <TableCell>
                  {i.uom2 ? `${i.uom2} (${i.konversi2})` : "-"}
                </TableCell>
                <TableCell>
                  {i.uom3 ? `${i.uom3} (${i.konversi3})` : "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={i.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FinishGoodCreateDialog
        open={open}
        onOpenChange={setOpen}
        customers={customers}
        fallbackCustomerId={fallbackCustomerId}
        onSave={(row) => {
          upsert(row);
          toast.success("Finish Good disimpan");
        }}
      />

      <MasterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kind="finish-good"
        customers={customers}
        existingFinishGoods={finishGoods}
        onImportFinishGoods={(rows) => {
          bulkUpsertFgs(rows);
        }}
      />
    </div>
  );
}
