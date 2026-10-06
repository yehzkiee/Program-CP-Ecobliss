"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/store";
import { buildStockRows } from "@/lib/mock/data";
import {
  colGroupDashboardStock,
  tableBodyCellClass,
  tableBodyCellMutedClass,
  tableBodyCellRightClass,
  tableHeadCellClass,
  tableHeadCellRightClass,
  tableShellClass,
} from "@/lib/table-styles";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { formatKodeNama } from "@/lib/utils";

export default function DashboardPage() {
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const transfers = useDataStore((s) => s.transfers);
  const items = useDataStore((s) => s.items);
  const fgs = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const gudangList = useDataStore((s) => s.gudangList);
  const adjustments = useDataStore((s) => s.adjustments);
  const stock = buildStockRows({
    btbs,
    bkbs,
    transfers,
    adjustments,
    items,
    finishGoods: fgs,
    customers,
    gudangList,
  });
  const pending = adjustments.filter((a) => a.status === "menunggu_approval");
  const cuplikanStok = stock
    .filter((r) => r.customerNama.trim() !== "" && r.customerNama !== "-")
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan stok dan aktivitas Program-CP (data mock)."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Material Aktif", value: items.filter((i) => i.status === "aktif").length },
          { label: "Finish Good Aktif", value: fgs.filter((f) => f.status === "aktif").length },
          { label: "Dokumen BTB", value: btbs.length },
          { label: "Dokumen BKB", value: bkbs.length },
        ].map((s) => (
          <Card key={s.label} className="border-border/80 bg-white/90 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Menunggu Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada adjustment pending.</p>
            ) : (
              pending.map((a) => (
                <Link
                  key={a.id}
                  href={`/transaksi/adjustment/${a.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{a.no}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.stockOpnameNo
                        ? `Ref ${a.stockOpnameNo}`
                        : "Adjustment mandiri"}
                    </p>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Cuplikan Stok BTB Sisa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className={tableShellClass}>
                <colgroup>
                  {colGroupDashboardStock.map((width, index) => (
                    <col key={index} className={width} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className={tableHeadCellClass}>Nama Customer</th>
                    <th className={tableHeadCellClass}>Produk/Material</th>
                    <th className={tableHeadCellClass}>Gudang</th>
                    <th className={tableHeadCellRightClass}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {cuplikanStok.map((r, idx) => (
                    <tr
                      key={`${r.refId}-${r.gudangId}-${idx}`}
                      className="border-b last:border-0"
                    >
                      <td className={`${tableBodyCellClass} font-medium`}>
                        {r.customerNama}
                      </td>
                      <td className={`${tableBodyCellClass} whitespace-normal`}>
                        <ItemNameWithType jenis={r.jenis}>
                          {formatKodeNama(r.kode, r.nama)}
                        </ItemNameWithType>
                      </td>
                      <td className={tableBodyCellMutedClass}>{r.gudangNama}</td>
                      <td className={`${tableBodyCellRightClass} font-medium`}>
                        {r.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
