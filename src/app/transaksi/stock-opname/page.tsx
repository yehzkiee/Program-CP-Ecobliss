"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
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
import { useAuthStore, useDataStore } from "@/lib/store";
import { formatDateID, formatStatusLabel, isSuperAdmin } from "@/lib/utils";
import { toast } from "sonner";
import type { Adjustment } from "@/lib/types";

export default function StockOpnameListPage() {
  const [searchNoSO, setSearchNoSO] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const stockOpnames = useDataStore((s) => s.stockOpnames);
  const adjustments = useDataStore((s) => s.adjustments);
  const upsert = useDataStore((s) => s.upsertAdjustment);
  const addLog = useDataStore((s) => s.addLog);
  const user = useAuthStore((s) => s.currentUser);
  const canApprove = isSuperAdmin(user?.role);
  const filtered = useMemo(() => {
    const query = searchNoSO.trim().toLowerCase();
    return stockOpnames.filter((row) => {
      const matchesNo =
        !query || (row.no ?? "").toLowerCase().includes(query);
      const matchesMonth =
        !selectedMonth || (row.tanggal ?? "").slice(0, 7) === selectedMonth;
      return matchesNo && matchesMonth;
    });
  }, [stockOpnames, searchNoSO, selectedMonth]);
  const exportRows = filtered.map((s) => {
    const adj = adjustments.find((a) => a.stockOpnameId === s.id);
    return {
      no: s.no,
      tanggal: formatDateID(s.tanggal),
      selisih: s.lines.length,
      status: adj ? formatStatusLabel(adj.status) : "Belum ada",
      adjustment: adj?.no ?? "Belum",
    };
  });

  function approveAdj(adj: Adjustment, ok: boolean) {
    if (!canApprove) {
      toast.error("Hanya Super Admin yang dapat approve/reject");
      return;
    }
    const payload: Adjustment = {
      ...adj,
      status: ok ? "disetujui" : "ditolak",
      approvedBy: user?.nama,
    };
    upsert(payload);
    addLog({
      waktu: new Date().toISOString(),
      userId: user?.id ?? "local",
      userNama: user?.nama ?? "User",
      aksi: ok ? "Approve Adjustment" : "Tolak Adjustment",
      noTransaksi: payload.no,
      detail: "",
    });
    toast.success(ok ? "Adjustment disetujui" : "Adjustment ditolak");
  }

  return (
    <div>
      <PageHeader
        title="Stock Opname"
        description="Hitung stok fisik dan catat selisih. Buat adjustment hanya setelah opname selesai."
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              type="text"
              value={searchNoSO}
              onChange={(e) => setSearchNoSO(e.target.value)}
              placeholder="Cari No SO..."
              className="bg-white sm:w-44"
            />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Bulan"
              className="bg-white sm:w-44"
            />
            <ExportExcelButton
              page="Stock_Opname"
              rows={exportRows}
              headers={{
                no: "No. SO",
                tanggal: "Tanggal",
                selisih: "Material dengan Selisih",
                status: "Status",
                adjustment: "Adjustment",
              }}
            />
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
              <TableHead>Material dengan Selisih</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Tidak ada Stock Opname yang cocok dengan pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
              const adj = adjustments.find((a) => a.stockOpnameId === s.id);
              const status = adj?.status ?? "draft";
              const hideCreateAdj =
                adj?.status === "menunggu_approval" ||
                adj?.status === "disetujui";
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/transaksi/stock-opname/${s.id}`}
                      className="text-emerald-800 hover:underline"
                    >
                      {s.no}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateID(s.tanggal)}</TableCell>
                  <TableCell>{s.lines.length}</TableCell>
                  <TableCell>
                    {adj ? (
                      <StatusBadge status={status} />
                    ) : (
                      <span className="text-muted-foreground">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {adj ? (
                      <Link
                        href={`/transaksi/adjustment/${adj.id}`}
                        className="text-emerald-800 hover:underline"
                      >
                        {adj.no}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Belum</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/transaksi/stock-opname/${s.id}`}>
                          Lihat
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/transaksi/stock-opname/${s.id}?edit=1`}>
                          Edit
                        </Link>
                      </Button>
                      {adj?.status === "menunggu_approval" && canApprove && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800"
                            onClick={() => approveAdj(adj, true)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => approveAdj(adj, false)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {!hideCreateAdj && !adj && (
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
                      {adj?.status === "ditolak" && (
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
