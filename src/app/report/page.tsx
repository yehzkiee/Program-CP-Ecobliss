"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarNav,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarSubnavLayout,
} from "@/components/shared/sidebar-subnav-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildStockRows,
  findFinishGood,
  findItem,
  isTransferGeneratedBtbLine,
} from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import {
  formatDateID,
  formatStatusLabel,
  formatKodeNama,
  formatJenisBarang,
  formatQty,
} from "@/lib/utils";

type ReportItem = { id: string; label: string };

type HistoriRow = {
  id: string;
  tanggal: string;
  jenis: "BTB" | "BKB" | "Transfer" | "Adjustment";
  no: string;
  keterangan: string;
  /** Nama jenis transaksi dokumen asal (BTB / BKB). */
  jenisTransaksi?: string;
  qty: number;
  /** Dampak ke saldo: BTB positif, BKB negatif, transfer 0, adjustment masuk−keluar. */
  delta: number;
  satuan: string;
  /** Hanya terisi untuk baris Material (item). */
  materialId?: string;
  href?: string;
};

const reportGroups: { label: string; items: ReportItem[] }[] = [
  {
    label: "Stok",
    items: [
      { id: "stock", label: "Stock" },
      { id: "per-customer", label: "Per Customer" },
      { id: "per-item", label: "Per Item" },
      { id: "per-fg", label: "Per FG" },
      { id: "per-batch", label: "Per Batch" },
      { id: "per-gudang", label: "Per Gudang" },
      { id: "titipan", label: "Barang Titipan" },
    ],
  },
  {
    label: "Mutasi & Histori",
    items: [
      { id: "mutasi", label: "Mutasi Stock" },
      { id: "histori", label: "Histori Transaksi" },
    ],
  },
];

const allReports = reportGroups.flatMap((g) => g.items);

function inDateRange(tanggal: string, from: string, to: string) {
  if (from && tanggal < from) return false;
  if (to && tanggal > to) return false;
  return true;
}

function movementDelta(
  jenis: HistoriRow["jenis"],
  qty: number,
  adjustment?: { in: number; out: number },
) {
  if (jenis === "BTB") return qty;
  if (jenis === "BKB") return -qty;
  if (jenis === "Adjustment") {
    return (adjustment?.in ?? 0) - (adjustment?.out ?? 0);
  }
  return 0;
}

export default function ReportPage() {
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const transfers = useDataStore((s) => s.transfers);
  const adjustments = useDataStore((s) => s.adjustments);
  const jenisTransaksiList = useDataStore((s) => s.jenisTransaksiList);

  const [tab, setTab] = useState<string>("stock");
  const [filterCust, setFilterCust] = useState("all");
  const [filterGudang, setFilterGudang] = useState("all");
  const [q, setQ] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const stock = useMemo(
    () =>
      buildStockRows({
        customers,
        items,
        finishGoods,
        gudangList,
        btbs,
        bkbs,
        transfers,
      }),
    [customers, items, finishGoods, gudangList, btbs, bkbs, transfers],
  );

  const filteredStock = useMemo(() => {
    return stock.filter((r) => {
      const matchCust = filterCust === "all" || r.customerId === filterCust;
      const matchGudang = filterGudang === "all" || r.gudangId === filterGudang;
      const matchQ =
        !q ||
        r.kode.toLowerCase().includes(q.toLowerCase()) ||
        r.nama.toLowerCase().includes(q.toLowerCase()) ||
        r.batchCustomer.toLowerCase().includes(q.toLowerCase());
      return matchCust && matchGudang && matchQ;
    });
  }, [stock, filterCust, filterGudang, q]);

  const customerFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Customer" },
      ...customers.map((c) => ({ value: c.id, label: c.nama })),
    ],
    [customers],
  );

  const gudangFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Gudang" },
      ...gudangList.map((g) => ({ value: g.id, label: g.nama })),
    ],
    [gudangList],
  );

  const materialFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Material/Item" },
      ...items.map((i) => ({
        value: i.id,
        label: formatKodeNama(i.kode, i.nama),
      })),
    ],
    [items],
  );

  const jenisNama = useMemo(() => {
    const map = Object.fromEntries(
      jenisTransaksiList.map((j) => [j.id, j.nama]),
    );
    return (id: string | undefined) => {
      const nama = id ? map[id]?.trim() : "";
      return nama || "-";
    };
  }, [jenisTransaksiList]);

  /** Satu baris per line transaksi — menyertakan Qty. */
  const histori = useMemo(() => {
    const rows: HistoriRow[] = [];

    for (const b of btbs) {
      const jenisTransaksi = jenisNama(b.jenisTransaksiId);
      (b.items ?? []).forEach((line, idx) => {
        if (isTransferGeneratedBtbLine(line.keterangan)) return;
        const item = findItem(line.itemId, items);
        rows.push({
          id: `btb-${b.id}-item-${idx}`,
          tanggal: b.tanggalTerima,
          jenis: "BTB",
          no: b.no,
          jenisTransaksi,
          keterangan: `Masuk ${formatKodeNama(item?.kode ?? line.itemId, item?.nama)} · batch ${line.batchCustomer || "-"}`,
          qty: line.qty,
          delta: movementDelta("BTB", line.qty),
          satuan: line.satuan,
          materialId: line.itemId,
          href: `/transaksi/btb/${b.id}`,
        });
      });
      (b.fgs ?? []).forEach((line, idx) => {
        if (isTransferGeneratedBtbLine(line.keterangan)) return;
        const fg = findFinishGood(line.fgId, finishGoods);
        rows.push({
          id: `btb-${b.id}-fg-${idx}`,
          tanggal: b.tanggalTerima,
          jenis: "BTB",
          no: b.no,
          jenisTransaksi,
          keterangan: `Masuk FG ${formatKodeNama(fg?.kode ?? line.fgId, fg?.nama)} · batch ${line.batchCustomer || "-"}`,
          qty: line.qty,
          delta: movementDelta("BTB", line.qty),
          satuan: line.satuan,
          href: `/transaksi/btb/${b.id}`,
        });
      });
    }

    for (const b of bkbs) {
      const jenisTransaksi = jenisNama(b.jenisTransaksiId);
      (b.items ?? []).forEach((line, idx) => {
        const item = findItem(line.itemId, items);
        rows.push({
          id: `bkb-${b.id}-item-${idx}`,
          tanggal: b.tanggalKeluar,
          jenis: "BKB",
          no: b.no,
          jenisTransaksi,
          keterangan: `Keluar ${formatKodeNama(item?.kode ?? line.itemId, item?.nama)}${b.noSpk ? ` · SPK ${b.noSpk}` : ""}`,
          qty: line.qty,
          delta: movementDelta("BKB", line.qty),
          satuan: line.satuan,
          materialId: line.itemId,
          href: `/transaksi/bkb/${b.id}`,
        });
      });
      (b.fgs ?? []).forEach((line, idx) => {
        const fg = findFinishGood(line.fgId, finishGoods);
        rows.push({
          id: `bkb-${b.id}-fg-${idx}`,
          tanggal: b.tanggalKeluar,
          jenis: "BKB",
          no: b.no,
          jenisTransaksi,
          keterangan: `Keluar FG ${formatKodeNama(fg?.kode ?? line.fgId, fg?.nama)}${b.noSpk ? ` · SPK ${b.noSpk}` : ""}`,
          qty: line.qty,
          delta: movementDelta("BKB", line.qty),
          satuan: line.satuan,
          href: `/transaksi/bkb/${b.id}`,
        });
      });
    }

    for (const t of transfers) {
      (t.lines ?? []).forEach((line, idx) => {
        const satuan =
          line.jenis === "item"
            ? (findItem(line.refId, items)?.uom1 ?? "")
            : (findFinishGood(line.refId, finishGoods)?.uom1 ?? "");
        rows.push({
          id: `tf-${t.id}-${idx}`,
          tanggal: t.tanggal,
          jenis: "Transfer",
          no: t.no,
          keterangan:
            t.keterangan ||
            `${formatKodeNama(line.kode, line.nama)} dipindah`,
          qty: line.qty,
          delta: movementDelta("Transfer", line.qty),
          satuan,
          materialId: line.jenis === "item" ? line.refId : undefined,
          href: `/transaksi/transfer/${t.id}`,
        });
      });
    }

    for (const a of adjustments) {
      (a.lines ?? []).forEach((line, idx) => {
        const qty = line.qty || Math.max(line.out, line.in) || 0;
        const satuan =
          line.jenis === "item"
            ? (findItem(line.refId, items)?.uom1 ?? "")
            : (findFinishGood(line.refId, finishGoods)?.uom1 ?? "");
        rows.push({
          id: `adj-${a.id}-${idx}`,
          tanggal: a.tanggal,
          jenis: "Adjustment",
          no: a.no,
          keterangan: `${formatStatusLabel(a.status)} · ${formatKodeNama(line.kode, line.nama)}${a.stockOpnameNo ? ` · SO ${a.stockOpnameNo}` : ""}`,
          qty,
          delta: movementDelta("Adjustment", qty, {
            in: line.in,
            out: line.out,
          }),
          satuan,
          materialId: line.jenis === "item" ? line.refId : undefined,
          href: `/transaksi/adjustment/${a.id}`,
        });
      });
    }

    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [btbs, bkbs, transfers, adjustments, items, finishGoods, jenisNama]);

  const filteredHistori = useMemo(() => {
    return histori.filter((h) => {
      if (!inDateRange(h.tanggal, dateFrom, dateTo)) return false;
      if (filterMaterial !== "all" && h.materialId !== filterMaterial) {
        return false;
      }
      return true;
    });
  }, [histori, filterMaterial, dateFrom, dateTo]);

  const historiSaldo = useMemo(() => {
    const matchesMaterial = (row: HistoriRow) =>
      filterMaterial === "all" || row.materialId === filterMaterial;
    const stokAwal = dateFrom
      ? histori
          .filter((row) => matchesMaterial(row) && row.tanggal < dateFrom)
          .reduce((sum, row) => sum + row.delta, 0)
      : 0;
    const mutasi = filteredHistori.reduce((sum, row) => sum + row.delta, 0);
    return { stokAwal, stokAkhir: stokAwal + mutasi };
  }, [histori, filteredHistori, filterMaterial, dateFrom]);

  const saldoScoped = filterMaterial !== "all";
  const saldoSatuan = saldoScoped
    ? (items.find((item) => item.id === filterMaterial)?.uom1 ?? "")
    : "";

  const groupSum = (
    keyFn: (r: (typeof filteredStock)[0]) => string,
  ) => {
    const map = new Map<string, number>();
    for (const r of filteredStock) {
      const k = keyFn(r);
      map.set(k, (map.get(k) ?? 0) + r.qty);
    }
    return Array.from(map.entries()).map(([key, qty]) => ({ key, qty }));
  };

  /** Per Gudang: filter stok mentah by kode/nama, lalu jumlahkan qty per gudang. */
  const perGudangRows = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    const matched = stock.filter((row) => {
      if (filterCust !== "all" && row.customerId !== filterCust) return false;
      if (filterGudang !== "all" && row.gudangId !== filterGudang) return false;
      if (!keyword) return true;
      return (
        row.kode.toLowerCase().includes(keyword) ||
        row.nama.toLowerCase().includes(keyword)
      );
    });

    const totals = new Map<string, number>();
    for (const row of matched) {
      const gudang = row.gudangNama.trim() || "-";
      totals.set(gudang, (totals.get(gudang) ?? 0) + row.qty);
    }
    return Array.from(totals.entries()).map(([key, qty]) => ({ key, qty }));
  }, [stock, q, filterCust, filterGudang]);

  const activeLabel =
    allReports.find((r) => r.id === tab)?.label ?? "Laporan";

  return (
    <div>
      <PageHeader
        title="Report"
        description="Laporan stok & transaksi (data mock). Aging stock tidak termasuk."
      />

      <SidebarSubnavLayout
        sidebar={
          <SidebarNav>
            {reportGroups.map((group) => (
              <SidebarNavGroup key={group.label} label={group.label}>
                {group.items.map((r) => (
                  <SidebarNavItem
                    key={r.id}
                    label={r.label}
                    active={tab === r.id}
                    onClick={() => setTab(r.id)}
                  />
                ))}
              </SidebarNavGroup>
            ))}
          </SidebarNav>
        }
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {activeLabel}
          </h2>
          {tab !== "histori" && tab !== "mutasi" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Cari kode / nama / batch..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="max-w-sm bg-white"
              />
              <Select
                value={filterCust}
                onValueChange={(v) => setFilterCust(v ?? "all")}
                items={customerFilterItems}
              >
                <SelectTrigger className="w-full bg-white sm:w-44">
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Customer</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterGudang}
                onValueChange={(v) => setFilterGudang(v ?? "all")}
                items={gudangFilterItems}
              >
                <SelectTrigger className="w-full bg-white sm:w-44">
                  <SelectValue placeholder="Gudang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Gudang</SelectItem>
                  {gudangList.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {tab === "stock" && <StockTable rows={filteredStock} />}

        {tab === "mutasi" && (
          <HistoriTable
            rows={histori}
            emptyText="Belum ada mutasi stok."
            showNet
          />
        )}

        {tab === "per-customer" && (
          <SimpleGroupTable
            title="Customer"
            rows={groupSum((r) => r.customerNama)}
          />
        )}
        {tab === "per-item" && (
          <SimpleGroupTable
            title="Item"
            rows={groupSum((r) =>
              r.jenis === "item" ? formatKodeNama(r.kode, r.nama) : "",
            ).filter((r) => r.key)}
          />
        )}
        {tab === "per-fg" && (
          <SimpleGroupTable
            title="Finish Good"
            rows={groupSum((r) =>
              r.jenis === "fg" ? formatKodeNama(r.kode, r.nama) : "",
            ).filter((r) => r.key)}
          />
        )}
        {tab === "per-batch" && (
          <SimpleGroupTable
            title="Batch Customer"
            rows={groupSum((r) => r.batchCustomer || "-")}
          />
        )}
        {tab === "per-gudang" && (
          <SimpleGroupTable title="Gudang" rows={perGudangRows} />
        )}
        {tab === "histori" && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label>Pilih Material/Item</Label>
                <Select
                  value={filterMaterial}
                  onValueChange={(v) => setFilterMaterial(v ?? "all")}
                  items={materialFilterItems}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Pilih Material/Item" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--anchor-width)] w-max max-w-[min(100vw-2rem,28rem)]">
                    <SelectItem value="all">Semua Material/Item</SelectItem>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.kode} - {i.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Dari</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Sampai</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            <HistoriTable
              rows={filteredHistori}
              emptyText="Tidak ada transaksi untuk filter yang dipilih."
              showLink
              showJenisTransaksi
              showSaldo
              stokAwal={saldoScoped ? historiSaldo.stokAwal : null}
              stokAkhir={saldoScoped ? historiSaldo.stokAkhir : null}
              saldoSatuan={saldoSatuan}
              saldoHint={
                saldoScoped
                  ? undefined
                  : "Pilih satu material agar saldo dihitung dalam satu satuan."
              }
            />
          </div>
        )}
        {tab === "titipan" && (
          <StockTable
            rows={filteredStock}
            caption="Rekap barang titipan customer (stok per BTB sisa)."
          />
        )}
      </SidebarSubnavLayout>
    </div>
  );
}

function netMutasi(rows: HistoriRow[]) {
  const net = rows.reduce((sum, row) => sum + row.delta, 0);
  const units = new Set(
    rows
      .filter((row) => row.delta !== 0)
      .map((row) => (row.satuan ?? "").trim())
      .filter(Boolean),
  );
  return {
    net,
    satuan: units.size === 1 ? ([...units][0] ?? "") : "",
    mixed: units.size > 1,
  };
}

function HistoriTable({
  rows,
  emptyText,
  showLink = false,
  showJenisTransaksi = false,
  showSaldo = false,
  showNet = false,
  stokAwal = 0,
  stokAkhir = 0,
  saldoSatuan = "",
  saldoHint,
}: {
  rows: HistoriRow[];
  emptyText: string;
  showLink?: boolean;
  showJenisTransaksi?: boolean;
  showSaldo?: boolean;
  showNet?: boolean;
  stokAwal?: number | null;
  stokAkhir?: number | null;
  saldoSatuan?: string;
  saldoHint?: string;
}) {
  const colSpan = 5 + (showJenisTransaksi ? 1 : 0) + (showLink ? 1 : 0);
  const saldoLabelSpan = colSpan - 1 - (showLink ? 1 : 0);
  const net = showNet ? netMutasi(rows) : null;
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>No Dokumen</TableHead>
            {showJenisTransaksi && <TableHead>Jenis Transaksi</TableHead>}
            <TableHead>Keterangan</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            {showLink && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {showSaldo && (
            <SaldoRow
              label="Stok Awal"
              hint={saldoHint}
              qty={stokAwal}
              satuan={saldoSatuan}
              labelSpan={saldoLabelSpan}
              showLink={showLink}
            />
          )}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{formatDateID(h.tanggal)}</TableCell>
                <TableCell>{h.jenis}</TableCell>
                <TableCell className="font-medium">{h.no}</TableCell>
                {showJenisTransaksi && (
                  <TableCell>{h.jenisTransaksi || "-"}</TableCell>
                )}
                <TableCell>{h.keterangan}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQty(h.qty, h.satuan)}
                </TableCell>
                {showLink && (
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {h.href ? (
                      <Link className="underline" href={h.href}>
                        Lihat
                      </Link>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
        {(showSaldo || (showNet && rows.length > 0)) && (
          <TableFooter>
            {showSaldo && (
              <SaldoRow
                label="Stok Akhir"
                qty={stokAkhir}
                satuan={saldoSatuan}
                labelSpan={saldoLabelSpan}
                showLink={showLink}
              />
            )}
            {showNet && net && rows.length > 0 && (
              <SaldoRow
                label="Net mutasi"
                hint={
                  net.mixed
                    ? "Satuan berbeda, qty tidak dijumlahkan."
                    : undefined
                }
                qty={net.mixed ? null : net.net}
                satuan={net.satuan}
                labelSpan={saldoLabelSpan}
                showLink={showLink}
              />
            )}
          </TableFooter>
        )}
      </Table>
    </div>
  );
}

function SaldoRow({
  label,
  hint,
  qty,
  satuan,
  labelSpan,
  showLink,
}: {
  label: string;
  hint?: string;
  qty: number | null;
  satuan: string;
  labelSpan: number;
  showLink: boolean;
}) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell colSpan={labelSpan} className="font-medium">
        {label}
        {hint ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {qty === null ? "—" : formatQty(qty, satuan)}
      </TableCell>
      {showLink && <TableCell />}
    </TableRow>
  );
}

function StockTable({
  rows,
  caption,
}: {
  rows: ReturnType<typeof buildStockRows>;
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      {caption && (
        <p className="border-b px-4 py-3 text-sm text-muted-foreground">
          {caption}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jenis</TableHead>
            <TableHead>Kode</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Gudang</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead className="text-right">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{formatJenisBarang(r.jenis)}</TableCell>
              <TableCell>{r.kode}</TableCell>
              <TableCell>{r.nama}</TableCell>
              <TableCell>{r.customerNama}</TableCell>
              <TableCell>{r.gudangNama}</TableCell>
              <TableCell>{r.batchCustomer || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">{r.qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SimpleGroupTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; qty: number }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{title}</TableHead>
            <TableHead className="text-right">Total Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="font-medium">{r.key}</TableCell>
              <TableCell className="text-right">{r.qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
