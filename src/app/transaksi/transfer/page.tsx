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

export default function TransferListPage() {
  const transfers = useDataStore((s) => s.transfers);
  const gudangList = useDataStore((s) => s.gudangList);
  const gudangMap = useMemo(
    () => Object.fromEntries(gudangList.map((g) => [g.id, g])),
    [gudangList],
  );

  return (
    <div>
      <PageHeader
        title="Transfer Gudang"
        description="Pindah Item/FG antar gudang (termasuk Item↔FG)."
        action={
          <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
            <Link href="/transaksi/transfer/baru">Buat Transfer</Link>
          </Button>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Ringkasan</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.no}</TableCell>
                <TableCell>{formatDateID(t.tanggal)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.lines
                    .slice(0, 2)
                    .map(
                      (l) =>
                        `${l.kode}: ${gudangMap[l.dariGudangId]?.kode}→${gudangMap[l.keGudangId]?.kode}`,
                    )
                    .join("; ")}
                </TableCell>
                <TableCell>{t.keterangan || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/transaksi/transfer/${t.id}`}>Detail</Link>
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
