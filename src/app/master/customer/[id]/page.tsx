"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { BackLink, PageHeader } from "@/components/shared/page-header";
import { DetailField } from "@/components/shared/detail-field";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";
import { RelatedRecordTable } from "@/components/shared/related-record-table";
import { Button } from "@/components/ui/button";
import { ResponsiveInput } from "@/components/ui/responsive-input";
import { Label } from "@/components/ui/label";
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
import { formatDateID } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const jenisList = useDataStore((s) => s.jenisTransaksiList);
  const upsert = useDataStore((s) => s.upsertCustomer);
  const remove = useDataStore((s) => s.deleteCustomer);
  const addLog = useDataStore((s) => s.addLog);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const customer = customers.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Customer | null>(null);

  const relatedItems = useMemo(
    () => items.filter((i) => i.customerId === id),
    [items, id],
  );
  const relatedFg = useMemo(
    () => finishGoods.filter((f) => f.customerId === id),
    [finishGoods, id],
  );

  const itemIds = useMemo(
    () => new Set(relatedItems.map((i) => i.id)),
    [relatedItems],
  );
  const fgIds = useMemo(
    () => new Set(relatedFg.map((f) => f.id)),
    [relatedFg],
  );

  const relatedBtbs = useMemo(
    () =>
      btbs.filter(
        (b) =>
          b.customerId === id ||
          b.items.some((l) => itemIds.has(l.itemId)) ||
          b.fgs.some((l) => fgIds.has(l.fgId)),
      ),
    [btbs, id, itemIds, fgIds],
  );

  const relatedBkbs = useMemo(
    () =>
      bkbs.filter(
        (b) =>
          b.items.some((l) => itemIds.has(l.itemId)) ||
          b.fgs.some((l) => fgIds.has(l.fgId)),
      ),
    [bkbs, itemIds, fgIds],
  );

  const jenisMap = useMemo(
    () => Object.fromEntries(jenisList.map((j) => [j.id, j])),
    [jenisList],
  );

  if (!customer) {
    return (
      <div>
        <BackLink href="/master/customer" />
        <PageHeader title="Customer tidak ditemukan" />
      </div>
    );
  }

  const draft = form ?? customer;

  function startEdit() {
    setForm({ ...customer! });
    setEditing(true);
  }

  function save() {
    if (!form?.kode || !form.nama) {
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
    setEditing(false);
    setForm(null);
  }

  function handleDelete() {
    const target = customer!;
    askConfirm(() => {
      remove(target.id);
      addLog({
        waktu: new Date().toISOString(),
        userId: "local",
        userNama: "User",
        aksi: "Hapus Customer",
        detail: target.kode,
      });
      toast.success("Customer dihapus");
      router.push("/master/customer");
    });
  }

  return (
    <div>
      {confirmDialog}
      <BackLink href="/master/customer" />
      <PageHeader
        title={customer.nama}
        description={`Kode ${customer.kode}`}
        action={
          <div className="flex gap-2">
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

      <div className="mb-6 rounded-xl border border-border/80 bg-white p-4">
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-customer-kode">Kode Customer</Label>
              <ResponsiveInput
                id="edit-customer-kode"
                value={draft.kode}
                onChange={(kode) => setForm({ ...draft, kode })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-customer-nama">Nama Customer</Label>
              <ResponsiveInput
                id="edit-customer-nama"
                value={draft.nama}
                onChange={(nama) => setForm({ ...draft, nama })}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Kode Customer" value={customer.kode} />
            <DetailField label="Nama Customer" value={customer.nama} />
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Material</h3>
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-300 bg-white">
          <RelatedRecordTable
            rows={relatedItems.map((i) => ({
              id: i.id,
              kode: i.kode,
              nama: i.nama,
              status: i.status,
              href: `/master/item/${i.id}`,
              jenis: "item" as const,
            }))}
            emptyMessage="Belum ada material."
          />
        </div>

        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          Finish Good
        </h3>
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-300 bg-white">
          <RelatedRecordTable
            rows={relatedFg.map((f) => ({
              id: f.id,
              kode: f.kode,
              nama: f.nama,
              status: f.status,
              href: `/master/finish-good/${f.id}`,
              jenis: "fg" as const,
            }))}
            emptyMessage="Belum ada finish good."
          />
        </div>

        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          Bukti Terima Barang
        </h3>
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-300 bg-white">
          <Table>
            <TableHeader className="border-b border-gray-300 bg-gray-50">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  No. BTB
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Tanggal
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Jenis
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Baris
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedBtbs.length === 0 ? (
                <TableRow className="border-b border-gray-200 last:border-0 transition-colors hover:bg-gray-50">
                  <TableCell
                    colSpan={4}
                    className="px-4 py-3 text-sm text-muted-foreground"
                  >
                    Belum ada BTB terkait customer ini.
                  </TableCell>
                </TableRow>
              ) : (
                relatedBtbs.map((b) => (
                  <TableRow
                    key={b.id}
                    className="border-b border-gray-200 last:border-0 transition-colors hover:bg-gray-50"
                  >
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      <Link
                        href={`/transaksi/btb/${b.id}`}
                        className="text-emerald-800 hover:underline"
                      >
                        {b.no}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {formatDateID(b.tanggalTerima)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {jenisMap[b.jenisTransaksiId]?.nama ?? "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {b.items.length} material · {b.fgs.length} FG
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          Bukti Keluar Barang
        </h3>
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-300 bg-white">
          <Table>
            <TableHeader className="border-b border-gray-300 bg-gray-50">
              <TableRow className="hover:bg-gray-50">
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  No. BKB
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Tanggal
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Jenis
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  No. SPK
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Baris
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedBkbs.length === 0 ? (
                <TableRow className="border-b border-gray-200 last:border-0 transition-colors hover:bg-gray-50">
                  <TableCell
                    colSpan={5}
                    className="px-4 py-3 text-sm text-muted-foreground"
                  >
                    Belum ada BKB terkait customer ini.
                  </TableCell>
                </TableRow>
              ) : (
                relatedBkbs.map((b) => (
                  <TableRow
                    key={b.id}
                    className="border-b border-gray-200 last:border-0 transition-colors hover:bg-gray-50"
                  >
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      <Link
                        href={`/transaksi/bkb/${b.id}`}
                        className="text-emerald-800 hover:underline"
                      >
                        {b.no}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {formatDateID(b.tanggalKeluar)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {jenisMap[b.jenisTransaksiId]?.nama ?? "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {b.noSpk || "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600">
                      {b.items.length} material · {b.fgs.length} FG
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
