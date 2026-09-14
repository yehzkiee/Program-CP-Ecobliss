"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildStockRows } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import { formatDateID, formatDateTimeID } from "@/lib/utils";

const reports = [
  { id: "stock", label: "1. Stock" },
  { id: "mutasi", label: "2. Mutasi Stock" },
  { id: "per-customer", label: "3. Stock per Customer" },
  { id: "per-item", label: "4. Stock per Item" },
  { id: "per-fg", label: "5. Stock per FG" },
  { id: "per-batch", label: "6. Stock per Batch Cust" },
  { id: "per-gudang", label: "7. Stock per Gudang" },
  { id: "histori", label: "9. Histori Transaksi" },
  { id: "titipan", label: "10. Rekap Barang Titipan" },
] as const;

export default function ReportPage() {
  const customers = useDataStore((s) => s.customers);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const gudangList = useDataStore((s) => s.gudangList);
  const btbs = useDataStore((s) => s.btbs);
  const bkbs = useDataStore((s) => s.bkbs);
  const transfers = useDataStore((s) => s.transfers);
  const adjustments = useDataStore((s) => s.adjustments);

  const [tab, setTab] = useState<string>("stock");
  const [filterCust, setFilterCust] = useState("all");
  const [filterGudang, setFilterGudang] = useState("all");
  const [q, setQ] = useState("");

  const stock = useMemo(
    () =>
      buildStockRows({ customers, items, finishGoods, gudangList, btbs }),
    [customers, items, finishGoods, gudangList, btbs],
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

  const histori = useMemo(() => {
    const rows: {
      tanggal: string;
      jenis: string;
      no: string;
      keterangan: string;
    }[] = [];
    for (const b of btbs) {
      rows.push({
        tanggal: b.tanggalTerima,
        jenis: "BTB",
        no: b.no,
        keterangan: `${b.items.length} item, ${b.fgs.length} FG`,
      });
    }
    for (const b of bkbs) {
      rows.push({
        tanggal: b.tanggalKeluar,
        jenis: "BKB",
        no: b.no,
        keterangan: b.noSpk ? `SPK ${b.noSpk}` : "Pengeluaran",
      });
    }
    for (const t of transfers) {
      rows.push({
        tanggal: t.tanggal,
        jenis: "Transfer",
        no: t.no,
        keterangan: t.keterangan || `${t.lines.length} baris`,
      });
    }
    for (const a of adjustments) {
      rows.push({
        tanggal: a.tanggal,
        jenis: "Adjustment",
        no: a.no,
        keterangan: `${a.status} · SO ${a.stockOpnameNo}`,
      });
    }
    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [btbs, bkbs, transfers, adjustments]);

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

  return (
    <div>
      <PageHeader
        title="Report"
        description="Laporan stok & transaksi (data mock). Aging stock tidak termasuk."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Cari kode / nama / batch..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm bg-white"
        />
        <Select value={filterCust} onValueChange={(v) => setFilterCust(v ?? "")}>
          <SelectTrigger className="w-full bg-white sm:w-48">
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
        <Select value={filterGudang} onValueChange={(v) => setFilterGudang(v ?? "")}>
          <SelectTrigger className="w-full bg-white sm:w-48">
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

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "")}>
        <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {reports.map((r) => (
            <TabsTrigger
              key={r.id}
              value={r.id}
              className="rounded-md border bg-white data-[state=active]:border-emerald-300 data-[state=active]:bg-emerald-50"
            >
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="stock">
          <StockTable rows={filteredStock} />
        </TabsContent>

        <TabsContent value="mutasi">
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>No Dokumen</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histori.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDateID(h.tanggal)}</TableCell>
                    <TableCell>{h.jenis}</TableCell>
                    <TableCell className="font-medium">{h.no}</TableCell>
                    <TableCell>{h.keterangan}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="per-customer">
          <SimpleGroupTable
            title="Customer"
            rows={groupSum((r) => r.customerNama)}
          />
        </TabsContent>
        <TabsContent value="per-item">
          <SimpleGroupTable
            title="Item"
            rows={groupSum((r) =>
              r.jenis === "item" ? `${r.kode} — ${r.nama}` : "",
            ).filter((r) => r.key)}
          />
        </TabsContent>
        <TabsContent value="per-fg">
          <SimpleGroupTable
            title="Finish Good"
            rows={groupSum((r) =>
              r.jenis === "fg" ? `${r.kode} — ${r.nama}` : "",
            ).filter((r) => r.key)}
          />
        </TabsContent>
        <TabsContent value="per-batch">
          <SimpleGroupTable
            title="Batch Customer"
            rows={groupSum((r) => r.batchCustomer || "-")}
          />
        </TabsContent>
        <TabsContent value="per-gudang">
          <SimpleGroupTable
            title="Gudang"
            rows={groupSum((r) => r.gudangNama)}
          />
        </TabsContent>
        <TabsContent value="histori">
          <div className="overflow-x-auto rounded-xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>No</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histori.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDateID(h.tanggal)}</TableCell>
                    <TableCell>{h.jenis}</TableCell>
                    <TableCell className="font-medium">{h.no}</TableCell>
                    <TableCell>{h.keterangan}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {h.jenis === "BTB" ? (
                        <Link className="underline" href="/transaksi/btb">
                          Lihat
                        </Link>
                      ) : h.jenis === "BKB" ? (
                        <Link className="underline" href="/transaksi/bkb">
                          Lihat
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="titipan">
          <StockTable
            rows={filteredStock}
            caption="Rekap barang titipan customer (stok per BTB sisa)."
          />
        </TabsContent>
      </Tabs>
    </div>
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
              <TableCell className="uppercase">{r.jenis}</TableCell>
              <TableCell className="font-medium">{r.kode}</TableCell>
              <TableCell>{r.nama}</TableCell>
              <TableCell>{r.customerNama}</TableCell>
              <TableCell>{r.gudangNama}</TableCell>
              <TableCell>{r.batchCustomer}</TableCell>
              <TableCell className="text-right">{r.qty}</TableCell>
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
