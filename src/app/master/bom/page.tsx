"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/ui/combobox";
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
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterFg, setFilterFg] = useState("all");
  const boms = useDataStore((s) => s.boms);
  const customers = useDataStore((s) => s.customers);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );
  const fgFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Finish Good" },
      ...finishGoods.map((fg) => ({
        value: fg.id,
        label: `${fg.kode} - ${fg.nama}`,
      })),
    ],
    [finishGoods],
  );
  const filtered = useMemo(() => {
    return boms.filter((bom) => {
      const customerId = bom.customerId || fgMap[bom.fgId]?.customerId || "";
      if (filterCustomer !== "all" && customerId !== filterCustomer) return false;
      if (filterFg !== "all" && bom.fgId !== filterFg) return false;
      return true;
    });
  }, [boms, fgMap, filterCustomer, filterFg]);

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

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <CustomerFilterCombobox
          customers={customers}
          value={filterCustomer}
          onValueChange={setFilterCustomer}
          className="w-full sm:w-56"
        />
        <div className="w-full min-w-0 sm:w-72">
          <SearchableCombobox
            items={fgFilterItems}
            value={filterFg}
            onValueChange={(next) => setFilterFg(next || "all")}
            filterItem={(item, query) =>
              item.value === "all" ||
              item.label.toLowerCase().includes(query.toLowerCase())
            }
            renderItem={(item) =>
              item.value === "all" ? (
                <span className="block truncate">{item.label}</span>
              ) : (
                <ItemNameWithType jenis="fg" className="w-full">
                  {item.label}
                </ItemNameWithType>
              )
            }
            endAdornment={
              filterFg !== "all" ? <ItemTypeBadge jenis="fg" /> : null
            }
            placeholder="Cari kode atau nama produk..."
            emptyText="Tidak ada produk yang cocok"
            itemNoun="produk"
            className="bg-white"
          />
        </div>
        <ExportExcelButton
          page="BOM"
          rows={filtered.map((b) => {
            const latest = getLatestBomRevision(b);
            const fg = fgMap[b.fgId];
            return {
              kode: b.kode,
              finishGood: fg ? `${fg.kode} - ${fg.nama}` : "-",
              revisi: latest ? `Rev. ${latest.revisi}` : "-",
              tanggal: formatDateID(latest?.tanggal ?? ""),
              lines: `${latest?.items.length ?? 0} material · ${latest?.fgs.length ?? 0} FG`,
            };
          })}
          headers={{
            kode: "Kode BOM",
            finishGood: "Finish Good",
            revisi: "Revisi Aktif",
            tanggal: "Tgl Revisi",
            lines: "Material / FG Lines",
          }}
        />
      </div>

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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Tidak ada BOM yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => {
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
            })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
