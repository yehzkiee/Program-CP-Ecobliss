"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { SearchableCombobox } from "@/components/ui/combobox";
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

export default function FinishGoodPage() {
  const finishGoods = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const upsert = useDataStore((s) => s.upsertFg);
  const [q, setQ] = useState("");
  const [filterCust, setFilterCust] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [batchEdited, setBatchEdited] = useState(false);
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
      form.batchCustomer.trim() ||
      generateBatchCustomer(form.customerId, customers, finishGoods, form.id);
    upsert({ ...form, batchCustomer, konversi1: 1 });
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
          rows={filtered.map((i) => ({
            kode: i.kode,
            nama: i.nama,
            customer: resolveCustomerNama(i.customerId),
            batch: i.batchCustomer?.trim() || "-",
            uom1: i.uom1 ? `${i.uom1} (${i.konversi1})` : "-",
            uom2: i.uom2 ? `${i.uom2} (${i.konversi2})` : "-",
            uom3: i.uom3 ? `${i.uom3} (${i.konversi3})` : "-",
            status: formatStatusLabel(i.status),
          }))}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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
              <SearchableCombobox
                items={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.nama,
                }))}
                value={form.customerId || fallbackCustomerId}
                onValueChange={(next) => {
                  const customerId = next ?? "";
                  const keepManual = batchEdited && form.batchCustomer.trim() !== "";
                  setForm({
                    ...form,
                    customerId,
                    batchCustomer: keepManual
                      ? form.batchCustomer
                      : customerId
                        ? generateBatchCustomer(
                            customerId,
                            customers,
                            finishGoods,
                            form.id,
                          )
                        : "",
                  });
                }}
                placeholder="Cari nama customer..."
                emptyText="Tidak ada customer yang cocok"
                itemNoun="customer"
                className="bg-white"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="finish-good-batch-customer">Batch Customer</Label>
              <Input
                id="finish-good-batch-customer"
                className="w-full"
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
