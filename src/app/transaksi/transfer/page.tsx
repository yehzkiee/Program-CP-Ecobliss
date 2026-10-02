"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
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

function gudangHint(tipe?: string) {
  switch (tipe) {
    case "wip":
      return "WIP (barang dalam proses)";
    case "fg":
      return "FG (finish good)";
    case "item":
      return "Material";
    case "reject":
      return "Reject";
    default:
      return "";
  }
}

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
        description="Pindahkan material atau finish good dari satu gudang ke gudang lain, misalnya dari Gudang FG (finish good) ke Gudang WIP (barang dalam proses)."
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
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.no}</TableCell>
                <TableCell>{formatDateID(t.tanggal)}</TableCell>
                <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                  {t.lines.slice(0, 2).map((l, index) => {
                    const dari = gudangMap[l.dariGudangId];
                    const ke = gudangMap[l.keGudangId];
                    const dariHint = gudangHint(dari?.tipe);
                    const keHint = gudangHint(ke?.tipe);
                    return (
                      <span key={`${l.refId}-${index}`}>
                        {index > 0 ? "; " : null}
                        <ItemNameWithType jenis={l.jenis}>{l.nama}</ItemNameWithType>
                        {` dipindah dari ${dari?.nama ?? "-"}${dariHint ? ` (${dariHint})` : ""} ke ${ke?.nama ?? "-"}${keHint ? ` (${keHint})` : ""}`}
                      </span>
                    );
                  })}
                  {t.lines.length > 2 ? ` (+${t.lines.length - 2} baris)` : ""}
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
