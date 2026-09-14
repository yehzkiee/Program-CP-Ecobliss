"use client";

import Link from "next/link";
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
import { StatusBadge } from "@/components/shared/page-header";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

export default function StockOpnameListPage() {
  const stockOpnames = useDataStore((s) => s.stockOpnames);
  const adjustments = useDataStore((s) => s.adjustments);

  return (
    <div>
      <PageHeader
        title="Stock Opname"
        description="Hanya buat transaksi jika ada selisih. Print rekap untuk cek fisik."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/print/opname/rekap" target="_blank">
                Print Rekap
              </Link>
            </Button>
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href="/transaksi/stock-opname/baru">Buat Opname</Link>
            </Button>
          </div>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. SO</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Baris Selisih</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockOpnames.map((s) => {
              const adj = adjustments.find((a) => a.stockOpnameId === s.id);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.no}</TableCell>
                  <TableCell>{formatDateID(s.tanggal)}</TableCell>
                  <TableCell>{s.lines.length}</TableCell>
                  <TableCell>
                    {adj ? (
                      <span className="inline-flex items-center gap-2">
                        {adj.no} <StatusBadge status={adj.status} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Belum</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/transaksi/stock-opname/${s.id}`}>
                        Detail
                      </Link>
                    </Button>
                    {!adj && (
                      <Button
                        asChild
                        size="sm"
                        className="bg-emerald-700 hover:bg-emerald-800"
                      >
                        <Link href={`/transaksi/adjustment/baru?so=${s.id}`}>
                          Buat Adjustment
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
