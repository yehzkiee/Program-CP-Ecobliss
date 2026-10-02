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
              <TableHead>Material / FG Lines</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {boms.map((b) => {
              const latest = getLatestBomRevision(b);
              const fg = fgMap[b.fgId];
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/master/bom/${b.id}`}
                      className="text-emerald-800 hover:underline"
                    >
                      {b.kode}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {fg ? (
                      <ItemNameWithType jenis="fg">
                        {fg.kode} - {fg.nama}
                      </ItemNameWithType>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>Rev. {latest?.revisi ?? "-"}</TableCell>
                  <TableCell>{formatDateID(latest?.tanggal ?? "")}</TableCell>
                  <TableCell>
                    {latest?.items.length ?? 0} material · {latest?.fgs.length ?? 0} FG
                  </TableCell>
                  <TableCell className="text-right">
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
