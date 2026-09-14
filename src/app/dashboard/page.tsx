"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ClipboardCheck,
  PackageMinus,
  PackagePlus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/lib/store";
import { buildStockRows } from "@/lib/mock/data";

export default function DashboardPage() {
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const items = useDataStore((s) => s.items);
  const fgs = useDataStore((s) => s.finishGoods);
  const customers = useDataStore((s) => s.customers);
  const gudangList = useDataStore((s) => s.gudangList);
  const adjustments = useDataStore((s) => s.adjustments);
  const stock = buildStockRows({
    btbs,
    items,
    finishGoods: fgs,
    customers,
    gudangList,
  });
  const pending = adjustments.filter((a) => a.status === "menunggu_approval");

  const shortcuts = [
    { href: "/transaksi/btb/baru", label: "Buat BTB", icon: PackagePlus },
    { href: "/transaksi/bkb/baru", label: "Buat BKB", icon: PackageMinus },
    { href: "/transaksi/stock-opname/baru", label: "Stock Opname", icon: ClipboardCheck },
    { href: "/transaksi/transfer/baru", label: "Transfer", icon: ArrowLeftRight },
  ];

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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 rounded-xl border border-border/80 bg-white/90 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-700/10 text-emerald-800">
                <Icon className="size-4" />
              </div>
              <span className="text-sm font-medium">{s.label}</span>
            </Link>
          );
        })}
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
                      Ref SO {a.stockOpnameNo}
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
            <CardTitle className="text-base">Cuplikan Stok (per BTB sisa)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Kode</th>
                    <th className="pb-2 font-medium">Gudang</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.slice(0, 6).map((r, idx) => (
                    <tr key={`${r.refId}-${r.gudangId}-${idx}`} className="border-b last:border-0">
                      <td className="py-2">
                        <span className="font-medium">{r.kode}</span>
                        <span className="ml-2 text-xs text-muted-foreground uppercase">
                          {r.jenis}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{r.gudangNama}</td>
                      <td className="py-2 text-right font-medium">{r.qty}</td>
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
