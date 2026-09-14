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
import { getLatestBomRevision } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

export default function BomListPage() {
  const boms = useDataStore((s) => s.boms);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  return (
    <div>
      <PageHeader
        title="Bill of Materials (BOM)"
        description="Komposisi Material (atas) dan Finish Good (bawah). Revisi terakhir dipakai transaksi."
        action={
          <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
            <Link href="/master/bom/baru">Tambah BOM</Link>
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode BOM</TableHead>
              <TableHead>Finish Good</TableHead>
              <TableHead>Revisi Aktif</TableHead>
              <TableHead>Tgl Revisi</TableHead>
              <TableHead>Item / FG Lines</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boms.map((b) => {
              const latest = getLatestBomRevision(b);
              const fg = fgMap[b.fgId];
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.kode}</TableCell>
                  <TableCell>
                    {fg ? `${fg.kode} — ${fg.nama}` : "-"}
                  </TableCell>
                  <TableCell>Rev. {latest?.revisi ?? "-"}</TableCell>
                  <TableCell>{formatDateID(latest?.tanggal ?? "")}</TableCell>
                  <TableCell>
                    {latest?.items.length ?? 0} item · {latest?.fgs.length ?? 0} FG
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/master/bom/${b.id}`}>Detail / Revisi</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/print/bom/${b.id}`} target="_blank">
                        Cetak
                      </Link>
                    </Button>
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
