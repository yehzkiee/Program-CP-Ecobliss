"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import type { Customer, FinishGood, StatusAktif } from "@/lib/types";
import { uid } from "@/lib/utils";

const UOM_OPTIONS = ["PCS", "BOX", "SET", "PACK", "ROLL"] as const;

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
      const match = f.batchCustomer.match(/FG(\d+)$/i);
      return match ? Number(match[1]) : 0;
    });
  const next = (seqs.length ? Math.max(...seqs) : 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

export default function FinishGoodPage() {
  const finishGoods = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const upsert = useDataStore((s) => s.upsertFg);
  const [q, setQ] = useState("");
  const [filterCust, setFilterCust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FinishGood>(blank());

  const custMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers],
  );

  const fallbackCustomerId = customers[0]?.id ?? "";
  const fallbackCustomerNama = customers[0]?.nama ?? "PT Sinar Abadi";

  useEffect(() => {
    if (!fallbackCustomerId) return;
    for (const fg of finishGoods) {
      if (!fg.customerId || !custMap[fg.customerId]) {
        upsert({ ...fg, customerId: fallbackCustomerId });
      }
    }
  }, [finishGoods, custMap, fallbackCustomerId, upsert]);

  function resolveCustomerNama(customerId: string) {
    const nama = custMap[customerId]?.nama?.trim();
    return nama || fallbackCustomerNama;
  }

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

  const customerFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Customer" },
      ...customers.map((c) => ({ value: c.id, label: c.nama })),
    ],
    [customers],
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
    setForm({
      ...blank(),
      id: uid("fg"),
      customerId,
      batchCustomer: customerId
        ? generateBatchCustomer(customerId, customers, finishGoods)
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
      generateBatchCustomer(form.customerId, customers, finishGoods);
    upsert({ ...form, batchCustomer });
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
        <Select
          value={filterCust}
          onValueChange={(v) => setFilterCust(v ?? "all")}
          items={customerFilterItems}
        >
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode FG</TableHead>
              <TableHead>Nama FG</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Batch Customer</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Konversi</TableHead>
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
                <TableCell>{i.nama}</TableCell>
                <TableCell>{resolveCustomerNama(i.customerId)}</TableCell>
                <TableCell>{i.batchCustomer}</TableCell>
                <TableCell>{i.uom}</TableCell>
                <TableCell>{i.konversi}</TableCell>
                <TableCell>
                  <StatusBadge status={i.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Finish Good</DialogTitle>
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
                value={form.customerId || fallbackCustomerId}
                onValueChange={(v) => {
                  const customerId = v ?? "";
                  setForm({
                    ...form,
                    customerId,
                    batchCustomer: customerId
                      ? generateBatchCustomer(
                          customerId,
                          customers,
                          finishGoods,
                        )
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
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {form.batchCustomer || "-"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>UOM</Label>
              <Select
                value={form.uom}
                onValueChange={(v) => setForm({ ...form, uom: v ?? "PCS" })}
                items={UOM_OPTIONS.map((u) => ({ value: u, label: u }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih UOM" />
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
