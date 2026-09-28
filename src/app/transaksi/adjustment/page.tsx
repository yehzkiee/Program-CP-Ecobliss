"use client";

import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
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

export default function AdjustmentListPage() {
  const adjustments = useDataStore((s) => s.adjustments);

  return (
    <div>
      <PageHeader
        title="Adjustment"
        description="Koreksi stok berdasarkan hasil stock opname. Approval hanya oleh Super Admin."
        action={
          <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
            <Link href="/transaksi/adjustment/baru">Buat Adjustment</Link>
          </Button>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Stock Opname</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/transaksi/adjustment/${a.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {a.no}
                  </Link>
                </TableCell>
                <TableCell>{formatDateID(a.tanggal)}</TableCell>
                <TableCell>{a.stockOpnameNo || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/transaksi/adjustment/${a.id}`}>Detail</Link>
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
