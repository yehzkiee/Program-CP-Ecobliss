"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { MasterImportDialog } from "@/components/shared/master-import-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataStore } from "@/lib/store";
import type { Customer } from "@/lib/types";
import { uid } from "@/lib/utils";

const empty: Customer = { id: "", kode: "", nama: "" };

type CreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (row: Customer) => void;
};

function CustomerCreateDialog({
  open,
  onOpenChange,
  onSave,
}: CreateDialogProps) {
  const [form, setForm] = useState<Customer>(empty);

  useEffect(() => {
    if (!open) return;
    setForm({ ...empty, id: uid("cust") });
  }, [open]);

  function save() {
    if (!form.kode || !form.nama) {
      toast.error("Kode dan nama wajib diisi");
      return;
    }
    onSave(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customer-kode">Kode Customer</Label>
            <ResponsiveInput
              id="customer-kode"
              value={form.kode}
              onChange={(kode) => setForm((prev) => ({ ...prev, kode }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-nama">Nama Customer</Label>
            <ResponsiveInput
              id="customer-nama"
              value={form.nama}
              onChange={(nama) => setForm((prev) => ({ ...prev, nama }))}
            />
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

export default function CustomerPage() {
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const upsert = useDataStore((s) => s.upsertCustomer);
  const bulkUpsertCustomers = useDataStore((s) => s.bulkUpsertCustomers);
  const addLog = useDataStore((s) => s.addLog);
  const [filterCust, setFilterCust] = useState("all");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<
      string,
      { materials: number; finishGoods: number }
    >();
    for (const c of customers) {
      map.set(c.id, { materials: 0, finishGoods: 0 });
    }
    for (const i of items) {
      const row = map.get(i.customerId);
      if (row) row.materials += 1;
    }
    for (const f of finishGoods) {
      const row = map.get(f.customerId);
      if (row) row.finishGoods += 1;
    }
    return map;
  }, [customers, items, finishGoods]);

  const filtered = useMemo(
    () =>
      customers.filter((c) => filterCust === "all" || c.id === filterCust),
    [customers, filterCust],
  );

  const exportRows = useMemo(
    () =>
      filtered.map((c) => ({
        nama: c.nama,
        kode: c.kode,
        material: counts.get(c.id)?.materials ?? 0,
        finishGood: counts.get(c.id)?.finishGoods ?? 0,
      })),
    [filtered, counts],
  );

  return (
    <div>
      <PageHeader
        title="DB Customer"
        description="Master data customer untuk Material dan Finish Good."
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
              Tambah Customer
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <CustomerFilterCombobox
          customers={customers}
          value={filterCust}
          onValueChange={setFilterCust}
          className="w-full max-w-sm"
        />
        <ExportExcelButton
          page="Customer"
          rows={exportRows}
          headers={{
            nama: "Nama Customer",
            kode: "Kode Customer",
            material: "Material",
            finishGood: "Finish Good",
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Customer</TableHead>
              <TableHead>Kode Customer</TableHead>
              <TableHead className="text-right">Material</TableHead>
              <TableHead className="text-right">Finish Good</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const ccount = counts.get(c.id);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/master/customer/${c.id}`}
                      className="text-emerald-800 hover:underline"
                    >
                      {c.nama}
                    </Link>
                  </TableCell>
                  <TableCell>{c.kode}</TableCell>
                  <TableCell className="text-right">
                    {ccount?.materials ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {ccount?.finishGoods ?? 0}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CustomerCreateDialog
        open={open}
        onOpenChange={setOpen}
        onSave={(form) => {
          upsert(form);
          addLog({
            waktu: new Date().toISOString(),
            userId: "local",
            userNama: "User",
            aksi: "Simpan Customer",
            detail: form.kode,
          });
          toast.success("Customer disimpan");
        }}
      />

      <MasterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kind="customer"
        customers={customers}
        existingCustomers={customers}
        onImportCustomers={(rows) => {
          bulkUpsertCustomers(rows);
          addLog({
            waktu: new Date().toISOString(),
            userId: "local",
            userNama: "User",
            aksi: "Import Customer",
            detail: `${rows.length} baris`,
          });
        }}
      />
    </div>
  );
}
