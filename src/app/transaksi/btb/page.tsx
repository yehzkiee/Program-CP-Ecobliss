"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

export default function BtbListPage() {
  const btbs = useDataStore((s) => s.btbs);
  const jenis = useDataStore((s) => s.jenisTransaksiList);
  const jenisMap = useMemo(
    () => Object.fromEntries(jenis.map((j) => [j.id, j])),
    [jenis],
  );

  return (
    <div>
      <PageHeader
        title="BTB — Bukti Terima Barang"
        description="Pencatatan barang masuk. Item di atas, Finish Good di bawah."
        action={
          <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
            <Link href="/transaksi/btb/baru">Buat BTB</Link>
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. BTB</TableHead>
              <TableHead>Tgl Terima</TableHead>
              <TableHead>Jenis Transaksi</TableHead>
              <TableHead>Item / FG</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {btbs.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.no}</TableCell>
                <TableCell>{formatDateID(b.tanggalTerima)}</TableCell>
                <TableCell>{jenisMap[b.jenisTransaksiId]?.nama ?? "-"}</TableCell>
                <TableCell>
                  {b.items.length} item · {b.fgs.length} FG
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/transaksi/btb/${b.id}`}>Detail</Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/print/btb/${b.id}`} target="_blank">
                      Cetak
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
