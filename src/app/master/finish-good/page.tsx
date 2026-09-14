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
import type { FinishGood, StatusAktif } from "@/lib/types";
import { uid } from "@/lib/utils";

const blank = (): FinishGood => ({
  id: "",
  kode: "",
  nama: "",
  customerId: "",
  kategori: "Finish Good",
  batchCustomer: "",
  uom: "PCS",
  konversi: 1,
  status: "aktif",
});

export default function FinishGoodPage() {
  const finishGoods = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const upsert = useDataStore((s) => s.upsertFg);
  const remove = useDataStore((s) => s.deleteFg);
  const [q, setQ] = useState("");
  const [filterCust, setFilterCust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FinishGood>(blank());

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const filtered = useMemo(() => {
    return finishGoods.filter((i) => {
      const matchQ =
        i.kode.toLowerCase().includes(q.toLowerCase()) ||
        i.nama.toLowerCase().includes(q.toLowerCase());
      const matchCust = filterCust === "all" || i.customerId === filterCust;
      const matchStatus = filterStatus === "all" || i.status === filterStatus;
      return matchQ && matchCust && matchStatus;
    });
  }, [finishGoods, q, filterCust, filterStatus]);

  function openCreate() {
    setForm({
      ...blank(),
      id: uid("fg"),
      customerId: customers[0]?.id ?? "",
    });
    setOpen(true);
  }

  function save() {
    if (!form.kode || !form.nama || !form.customerId) {
      toast.error("Lengkapi kode, nama, dan customer");
      return;
    }
    upsert(form);
    toast.success("Finish Good disimpan");
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="DB Finish Good"
        description="Master produk jadi dengan customer, batch, UOM, dan status."
        action={
          <Button className="bg-emerald-700 hover:bg-emerald-800" onClick={openCreate}>
            Tambah Finish Good
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Cari kode / nama..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm bg-white"
        />
        <Select value={filterCust} onValueChange={(v) => setFilterCust(v ?? "")}>
          <SelectTrigger className="w-full bg-white sm:w-48">
            <SelectValue placeholder="Customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Customer</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "")}>
          <SelectTrigger className="w-full bg-white sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode FG</TableHead>
              <TableHead>Nama FG</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Batch Cust</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Konversi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.kode}</TableCell>
                <TableCell>{i.nama}</TableCell>
                <TableCell>{custMap[i.customerId]?.nama ?? "-"}</TableCell>
                <TableCell>{i.kategori}</TableCell>
                <TableCell>{i.batchCustomer}</TableCell>
                <TableCell>{i.uom}</TableCell>
                <TableCell>{i.konversi}</TableCell>
                <TableCell>
                  <StatusBadge status={i.status} />
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm(i);
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      remove(i.id);
                      toast.success("FG dihapus");
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {finishGoods.some((i) => i.id === form.id) ? "Edit" : "Tambah"} Finish Good
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kode FG</Label>
              <Input
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Nama FG</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v ?? "" })}
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
              <Label>Kategori</Label>
              <Input
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Customer</Label>
              <Input
                value={form.batchCustomer}
                onChange={(e) =>
                  setForm({ ...form, batchCustomer: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>UOM</Label>
              <Input
                value={form.uom}
                onChange={(e) => setForm({ ...form, uom: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Konversi</Label>
              <Input
                type="number"
                value={form.konversi}
                onChange={(e) =>
                  setForm({ ...form, konversi: Number(e.target.value) || 0 })
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
