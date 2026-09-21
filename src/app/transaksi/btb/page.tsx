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
import { formatDateID, sortByDateDesc } from "@/lib/utils";

export default function BtbListPage() {
  const btbs = useDataStore((s) => s.btbs);
  const jenis = useDataStore((s) => s.jenisTransaksiList);
  const jenisMap = useMemo(
    () => Object.fromEntries(jenis.map((j) => [j.id, j])),
    [jenis],
  );

  const sorted = useMemo(
    () => sortByDateDesc(btbs, "tanggalTerima", "createdAt"),
    [btbs],
  );

  return (
    <div>
      <PageHeader
        title="Bukti Terima Barang (BTB)"
        description="Daftar penerimaan barang dari customer ke gudang. Buka dokumen untuk melihat detail material dan finish good."
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
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link
                    href={`/transaksi/btb/${b.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {b.no}
                  </Link>
                </TableCell>
                <TableCell>{formatDateID(b.tanggalTerima)}</TableCell>
                <TableCell>{jenisMap[b.jenisTransaksiId]?.nama ?? "-"}</TableCell>
                <TableCell>
                  {b.items.length} item · {b.fgs.length} FG
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(
                        `/print/btb/${b.id}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Cetak
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
