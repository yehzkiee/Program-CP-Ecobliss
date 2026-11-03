"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteDocConfirmDescription } from "@/lib/delete-transaksi-doc";
import { useAuthStore, useDataStore } from "@/lib/store";
import type { Bkb } from "@/lib/types";
import { formatDateID, formatQty, sortByDateDesc } from "@/lib/utils";

type QtyLine = { qty?: number; satuan?: string };

function formatLineQty(qty: number | undefined, satuan?: string) {
  const n = Number(qty);
  const formatted = Number.isFinite(n) ? n.toLocaleString("id-ID") : "0";
  return formatQty(formatted, satuan);
}

function documentLines<T extends QtyLine>(
  lines: T[],
  nameOf: (line: T) => string | undefined,
) {
  return lines.map((line) => ({
    name: nameOf(line)?.trim() || "-",
    qty: formatLineQty(line.qty, line.satuan),
  }));
}

const detailLineClass = "m-0 block h-5 p-0 leading-5 whitespace-nowrap";

export default function BkbListPage() {
  const [searchSPK, setSearchSPK] = useState("");
  const [searchPO, setSearchPO] = useState("");
  const bkbs = useDataStore((s) => s.bkbs);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const jenis = useDataStore((s) => s.jenisTransaksiList);
  const deleteBkb = useDataStore((s) => s.deleteBkb);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const { askConfirm, confirmDialog } = useConfirmDialog();
  const jenisMap = useMemo(
    () => Object.fromEntries(jenis.map((j) => [j.id, j])),
    [jenis],
  );
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((fg) => [fg.id, fg])),
    [finishGoods],
  );

  const sorted = useMemo(
    () => sortByDateDesc(bkbs, "tanggalKeluar", "createdAt"),
    [bkbs],
  );
  const filtered = useMemo(() => {
    const spkQuery = searchSPK.trim().toLowerCase();
    const poQuery = searchPO.trim().toLowerCase();
    return sorted.filter((row) => {
      const matchesSpk =
        !spkQuery || (row.noSpk ?? "").toLowerCase().includes(spkQuery);
      const matchesPo =
        !poQuery || (row.noPo ?? "").toLowerCase().includes(poQuery);
      return matchesSpk && matchesPo;
    });
  }, [sorted, searchSPK, searchPO]);
  function handleDelete(doc: Bkb) {
    askConfirm(
      () => {
        try {
          deleteBkb(doc.id);
          addLog({
            waktu: new Date().toISOString(),
            userId: user?.id ?? "local",
            userNama: user?.nama ?? "User",
            aksi: "Hapus BKB",
            noTransaksi: doc.no,
            detail: "Stok keluar dibatalkan",
          });
          toast.success(`${doc.no} dihapus`);
        } catch (err) {
          console.error(err);
          toast.error(`Gagal menghapus ${doc.no}`);
        }
      },
      {
        title: "Hapus dokumen BKB",
        description: deleteDocConfirmDescription(doc.no),
        confirmLabel: "Ya, Hapus",
        cancelLabel: "Batal",
      },
    );
  }

  const exportRows = filtered.map((b) => {
    const details = [
      ...documentLines(b.items, (line) => itemMap[line.itemId]?.nama),
      ...documentLines(b.fgs, (line) => fgMap[line.fgId]?.nama),
    ];
    return {
      no: b.no,
      tanggal: formatDateID(b.tanggalKeluar),
      jenis: jenisMap[b.jenisTransaksiId]?.nama ?? "-",
      nama: details.map((line) => line.name).join("\n") || "-",
      qty: details.map((line) => line.qty).join("\n") || "-",
      spk: b.noSpk || "-",
      po: b.noPo || "-",
      ringkasan: `${b.items.length} material · ${b.fgs.length} FG`,
    };
  });

  return (
    <div>
      {confirmDialog}
      <PageHeader
        title="Bukti Keluar Barang (BKB)"
        description="Daftar pengeluaran barang dari gudang. Setiap baris wajib merujuk ke nomor BTB sumber agar stok sisa tetap akurat."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              type="text"
              value={searchSPK}
              onChange={(e) => setSearchSPK(e.target.value)}
              placeholder="Cari SPK..."
              className="bg-white sm:w-44"
            />
            <Input
              type="text"
              value={searchPO}
              onChange={(e) => setSearchPO(e.target.value)}
              placeholder="Cari PO..."
              className="bg-white sm:w-44"
            />
            <ExportExcelButton
              page="BKB"
              rows={exportRows}
              headers={{
                no: "No. BKB",
                tanggal: "Tgl Keluar",
                jenis: "Jenis",
                nama: "Nama Material / FG",
                qty: "Qty",
                spk: "No SPK",
                po: "No PO",
                ringkasan: "Material / FG",
              }}
            />
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href="/transaksi/bkb/baru">Buat BKB</Link>
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. BKB</TableHead>
              <TableHead>Tgl Keluar</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Nama Material / FG</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>No SPK</TableHead>
              <TableHead>No PO</TableHead>
              <TableHead>Material / FG</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  Tidak ada BKB yang cocok dengan pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => {
                const details = [
                  ...documentLines(b.items, (line) => itemMap[line.itemId]?.nama),
                  ...documentLines(b.fgs, (line) => fgMap[line.fgId]?.nama),
                ];
                return (
              <TableRow key={b.id} className="[&>td]:align-top">
                <TableCell>
                  <Link
                    href={`/transaksi/bkb/${b.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {b.no}
                  </Link>
                </TableCell>
                <TableCell>{formatDateID(b.tanggalKeluar)}</TableCell>
                <TableCell>{jenisMap[b.jenisTransaksiId]?.nama ?? "-"}</TableCell>
                <TableCell className="align-top">
                  {details.length === 0
                    ? "-"
                    : details.map((line, index) => (
                        <div key={index} className={detailLineClass}>
                          {line.name}
                        </div>
                      ))}
                </TableCell>
                <TableCell className="align-top text-right tabular-nums">
                  {details.length === 0
                    ? "-"
                    : details.map((line, index) => (
                        <div key={index} className={detailLineClass}>
                          {line.qty}
                        </div>
                      ))}
                </TableCell>
                <TableCell>{b.noSpk || "-"}</TableCell>
                <TableCell>{b.noPo || "-"}</TableCell>
                <TableCell>
                  {b.items.length} material · {b.fgs.length} FG
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-start justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(
                          `/print/bkb/${b.id}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      Cetak
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      className="text-red-700 hover:bg-red-50 hover:text-red-800"
                      aria-label={`Hapus ${b.no}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(b);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
