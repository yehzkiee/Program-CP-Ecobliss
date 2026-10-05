"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { useDataStore } from "@/lib/store";
import { formatDateID, sortByDateDesc } from "@/lib/utils";

function joinedNames(names: Array<string | undefined>) {
  const unique = [...new Set(names.filter((name): name is string => Boolean(name)))];
  return unique.join(", ");
}

function documentTotalQty(doc: {
  totalQty?: number;
  items?: { qty?: number }[];
  fgs?: { qty?: number }[];
}) {
  if (typeof doc.totalQty === "number" && Number.isFinite(doc.totalQty)) {
    return doc.totalQty;
  }
  return [...(doc.items ?? []), ...(doc.fgs ?? [])].reduce(
    (sum, line) => sum + (Number(line.qty) || 0),
    0,
  );
}

export default function BtbListPage() {
  const [searchSPK, setSearchSPK] = useState("");
  const [searchPO, setSearchPO] = useState("");
  const btbs = useDataStore((s) => s.btbs);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const jenis = useDataStore((s) => s.jenisTransaksiList);
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
    () => sortByDateDesc(btbs, "tanggalTerima", "createdAt"),
    [btbs],
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

  return (
    <div>
      <PageHeader
        title="Bukti Terima Barang (BTB)"
        description="Daftar penerimaan barang dari customer ke gudang. Buka dokumen untuk melihat detail material dan finish good."
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
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href="/transaksi/btb/baru">Buat BTB</Link>
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. BTB</TableHead>
              <TableHead>Tgl Terima</TableHead>
              <TableHead>Jenis Transaksi</TableHead>
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
                  Tidak ada BTB yang cocok dengan pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
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
                <TableCell className="max-w-64">
                  <span className="line-clamp-2">
                    {joinedNames([
                      ...b.items.map((line) => itemMap[line.itemId]?.nama),
                      ...b.fgs.map((line) => fgMap[line.fgId]?.nama),
                    ]) || "-"}
                  </span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">
                  {documentTotalQty(b).toLocaleString("id-ID")}
                </TableCell>
                <TableCell>{b.noSpk || "-"}</TableCell>
                <TableCell>{b.noPo || "-"}</TableCell>
                <TableCell>
                  {b.items.length} material · {b.fgs.length} FG
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
