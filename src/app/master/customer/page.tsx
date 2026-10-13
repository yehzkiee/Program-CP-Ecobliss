"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { PageHeader } from "@/components/shared/page-header";
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

export default function CustomerPage() {
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const upsert = useDataStore((s) => s.upsertCustomer);
  const addLog = useDataStore((s) => s.addLog);
  const [filterCust, setFilterCust] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Customer>(empty);

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

  function openCreate() {
    setForm({ ...empty, id: uid("cust") });
    setOpen(true);
  }

  function save() {
    if (!form.kode || !form.nama) {
      toast.error("Kode dan nama wajib diisi");
      return;
    }
    upsert(form);
    addLog({
      waktu: new Date().toISOString(),
      userId: "local",
      userNama: "User",
      aksi: "Simpan Customer",
      detail: form.kode,
    });
    toast.success("Customer disimpan");
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="DB Customer"
        description="Master data customer untuk Material dan Finish Good."
        action={
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={openCreate}>
            Tambah Customer
          </Button>
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
          rows={filtered.map((c) => ({
            nama: c.nama,
            kode: c.kode,
            material: counts.get(c.id)?.materials ?? 0,
            finishGood: counts.get(c.id)?.finishGoods ?? 0,
          }))}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Kode Customer</Label>
              <Input
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Customer</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
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
