"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
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
  const upsert = useDataStore((s) => s.upsertCustomer);
  const remove = useDataStore((s) => s.deleteCustomer);
  const addLog = useDataStore((s) => s.addLog);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Customer>(empty);

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.kode.toLowerCase().includes(q.toLowerCase()) ||
          c.nama.toLowerCase().includes(q.toLowerCase()),
      ),
    [customers, q],
  );

  function openCreate() {
    setForm({ ...empty, id: uid("cust") });
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setForm(c);
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

      <div className="mb-4">
        <Input
          placeholder="Cari kode / nama..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm bg-white"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Customer</TableHead>
              <TableHead>Nama Customer</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.kode}</TableCell>
                <TableCell>{c.nama}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      remove(c.id);
                      toast.success("Customer dihapus");
                    }}
                  >
                    Hapus
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {customers.some((c) => c.id === form.id) ? "Edit" : "Tambah"} Customer
            </DialogTitle>
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
