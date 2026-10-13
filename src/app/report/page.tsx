"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CustomerFilterCombobox } from "@/components/shared/customer-filter-combobox";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelRow } from "@/lib/export-to-excel";
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
  buildTitipanRows,
  isApprovedAdjustment,
  findFinishGood,
  findItem,
  isTransferGeneratedBtbLine,
} from "@/lib/mock/data";
import { ItemNameWithType, ItemTypeBadge } from "@/components/shared/ItemTypeBadge";
import { SearchableCombobox } from "@/components/ui/combobox";
import { useDataStore } from "@/lib/store";
import type { AdjustmentStatus, StockRow } from "@/lib/types";
import {
  formatDateID,
  formatStatusLabel,
  formatKodeNama,
  formatQty,
} from "@/lib/utils";

function filterItemByKodeNama(
  item: { kode: string; nama: string },
  query: string,
) {
  const keyword = query.toLowerCase();
  return (
    item.kode.toLowerCase().includes(keyword) ||
    item.nama.toLowerCase().includes(keyword)
  );
}

function filterItemByLabelKodeNama(
  item: { label: string; kode: string; nama: string },
  query: string,
) {
  const keyword = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(keyword) ||
    item.kode.toLowerCase().includes(keyword) ||
    item.nama.toLowerCase().includes(keyword)
  );
}

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
  /** `item:<id>` atau `fg:<id>`. */
  barangKey?: string;
  noPo?: string;
  noSpk?: string;
  href?: string;
  /** Hanya terisi untuk baris Adjustment. */
  adjustmentStatus?: AdjustmentStatus;
};

const reportGroups: { label: string; items: ReportItem[] }[] = [
  {
    label: "Stok",
    items: [
      { id: "stock", label: "Stock" },
      { id: "per-customer", label: "Per Customer" },
      { id: "per-item", label: "Per Material" },
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

/** Adjustment baru mengubah saldo setelah statusnya Disetujui. */
function countsTowardStock(row: HistoriRow) {
  if (row.jenis !== "Adjustment") return true;
  return isApprovedAdjustment(row.adjustmentStatus);
}

function barangKey(jenis: "item" | "fg", id: string) {
  return `${jenis}:${id}`;
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
  const [selectedItem, setSelectedItem] = useState("");
  const [filterBarang, setFilterBarang] = useState("all");
  const [searchPO, setSearchPO] = useState("");
  const [searchSPK, setSearchSPK] = useState("");
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
        adjustments,
      }),
    [
      customers,
      items,
      finishGoods,
      gudangList,
      btbs,
      bkbs,
      transfers,
      adjustments,
    ],
  );

  const barangOptions = useMemo(() => {
    const rows = [
      ...items
        .filter((item) => item.status === "aktif")
        .map((item) => ({
          value: `item:${item.id}`,
          label: `${item.kode} - ${item.nama}`,
          kode: item.kode,
          nama: item.nama,
          jenis: "item" as const,
          refId: item.id,
        })),
      ...finishGoods
        .filter((fg) => fg.status === "aktif")
        .map((fg) => ({
          value: `fg:${fg.id}`,
          label: `${fg.kode} - ${fg.nama}`,
          kode: fg.kode,
          nama: fg.nama,
          jenis: "fg" as const,
          refId: fg.id,
        })),
    ];
    return rows.sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [items, finishGoods]);

  const selectedBarang = useMemo(
    () => barangOptions.find((option) => option.value === selectedItem) ?? null,
    [barangOptions, selectedItem],
  );

  const titipan = useMemo(
    () =>
      buildTitipanRows({
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

  const matchStockFilters = useCallback(
    (row: StockRow) => {
      const matchCust = filterCust === "all" || row.customerId === filterCust;
      const matchGudang =
        filterGudang === "all" || row.gudangId === filterGudang;
      const matchBarang =
        !selectedBarang ||
        (row.jenis === selectedBarang.jenis &&
          row.refId === selectedBarang.refId);
      return matchCust && matchGudang && matchBarang;
    },
    [filterCust, filterGudang, selectedBarang],
  );

  const filteredStock = useMemo(() => {
    return stock.filter((r) => matchStockFilters(r));
  }, [stock, matchStockFilters]);

  const filteredTitipan = useMemo(() => {
    return titipan.filter((r) => matchStockFilters(r));
  }, [titipan, matchStockFilters]);

  const gudangFilterItems = useMemo(
    () => [
      { value: "all", label: "Semua Gudang" },
      ...gudangList.map((g) => ({ value: g.id, label: g.nama })),
    ],
    [gudangList],
  );

  const historiBarangOptions = useMemo(() => {
    const rows = [
      ...items.map((item) => ({
        value: barangKey("item", item.id),
        label: formatKodeNama(item.kode, item.nama),
        kode: item.kode,
        nama: item.nama,
        jenis: "item" as const,
      })),
      ...finishGoods.map((fg) => ({
        value: barangKey("fg", fg.id),
        label: formatKodeNama(fg.kode, fg.nama),
        kode: fg.kode,
        nama: fg.nama,
        jenis: "fg" as const,
      })),
    ].sort((a, b) => a.label.localeCompare(b.label, "id"));
    return [
      {
        value: "all",
        label: "Semua Item/Barang",
        kode: "",
        nama: "Semua Item/Barang",
        jenis: "all" as const,
      },
      ...rows,
    ];
  }, [items, finishGoods]);

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
          barangKey: barangKey("item", line.itemId),
          noPo: b.noPo,
          noSpk: b.noSpk,
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
          barangKey: barangKey("fg", line.fgId),
          noPo: b.noPo,
          noSpk: b.noSpk,
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
          barangKey: barangKey("item", line.itemId),
          noPo: b.noPo,
          noSpk: b.noSpk,
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
          barangKey: barangKey("fg", line.fgId),
          noPo: b.noPo,
          noSpk: b.noSpk,
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
          barangKey: barangKey(line.jenis, line.refId),
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
          keterangan: `${formatStatusLabel(a.status)} · ${formatKodeNama(line.kode, line.nama)}${a.stockOpnameNo ? ` · ${a.stockOpnameNo}` : ""}`,
          qty,
          delta: movementDelta("Adjustment", qty, {
            in: line.in,
            out: line.out,
          }),
          satuan,
          barangKey: barangKey(line.jenis, line.refId),
          href: `/transaksi/adjustment/${a.id}`,
          adjustmentStatus: a.status,
        });
      });
    }

    return rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [btbs, bkbs, transfers, adjustments, items, finishGoods, jenisNama]);

  const filteredHistori = useMemo(() => {
    const poQuery = searchPO.trim().toLowerCase();
    const spkQuery = searchSPK.trim().toLowerCase();
    return histori.filter((h) => {
      if (!inDateRange(h.tanggal, dateFrom, dateTo)) return false;
      if (
        filterBarang &&
        filterBarang !== "all" &&
        h.barangKey !== filterBarang
      ) {
        return false;
      }
      if (poQuery && !(h.noPo ?? "").toLowerCase().includes(poQuery)) {
        return false;
      }
      if (spkQuery && !(h.noSpk ?? "").toLowerCase().includes(spkQuery)) {
        return false;
      }
      const menungguApproval =
        h.jenis === "Adjustment" &&
        (h.adjustmentStatus === "menunggu_approval" ||
          h.keterangan.toLowerCase().includes("menunggu approval"));
      if (menungguApproval) return false;
      return true;
    });
  }, [histori, filterBarang, searchPO, searchSPK, dateFrom, dateTo]);

  const historiSaldo = useMemo(() => {
    const poQuery = searchPO.trim().toLowerCase();
    const spkQuery = searchSPK.trim().toLowerCase();
    const matchesBarang = (row: HistoriRow) => {
      if (
        filterBarang &&
        filterBarang !== "all" &&
        row.barangKey !== filterBarang
      ) {
        return false;
      }
      if (poQuery && !(row.noPo ?? "").toLowerCase().includes(poQuery)) {
        return false;
      }
      if (spkQuery && !(row.noSpk ?? "").toLowerCase().includes(spkQuery)) {
        return false;
      }
      return true;
    };
    const stokAwal = dateFrom
      ? histori
          .filter(
            (row) =>
              matchesBarang(row) &&
              row.tanggal < dateFrom &&
              countsTowardStock(row),
          )
          .reduce((sum, row) => sum + row.delta, 0)
      : 0;
    const mutasi = filteredHistori
      .filter(countsTowardStock)
      .reduce((sum, row) => sum + row.delta, 0);
    return { stokAwal, stokAkhir: stokAwal + mutasi };
  }, [histori, filteredHistori, filterBarang, searchPO, searchSPK, dateFrom]);

  const saldoScoped =
    filterBarang.startsWith("item:") || filterBarang.startsWith("fg:");
  const saldoSatuan = filterBarang.startsWith("fg:")
    ? (finishGoods.find((fg) => barangKey("fg", fg.id) === filterBarang)
        ?.uom1 ?? "")
    : filterBarang.startsWith("item:")
      ? (items.find((item) => barangKey("item", item.id) === filterBarang)
          ?.uom1 ?? "")
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

  /** Per Gudang: filter stok mentah by barang terpilih, lalu jumlahkan qty per gudang. */
  const perGudangRows = useMemo(() => {
    const matched = stock.filter((row) => {
      if (filterCust !== "all" && row.customerId !== filterCust) return false;
      if (filterGudang !== "all" && row.gudangId !== filterGudang) return false;
      if (!selectedBarang) return true;
      return (
        row.jenis === selectedBarang.jenis && row.refId === selectedBarang.refId
      );
    });

    const totals = new Map<string, number>();
    for (const row of matched) {
      const gudang = row.gudangNama.trim() || "-";
      totals.set(gudang, (totals.get(gudang) ?? 0) + row.qty);
    }
    return Array.from(totals.entries()).map(([key, qty]) => ({ key, qty }));
  }, [stock, selectedBarang, filterCust, filterGudang]);

  const activeLabel =
    allReports.find((r) => r.id === tab)?.label ?? "Laporan";

  const reportExport: {
    page: string;
    headers: Record<string, string>;
    rows: ExcelRow[];
  } = (() => {
    if (tab === "stock" || tab === "titipan") {
      const source = tab === "stock" ? filteredStock : filteredTitipan;
      return {
        page: tab === "stock" ? "Report_Stock" : "Report_Barang_Titipan",
        headers: {
          jenis: "Jenis",
          kode: "Kode",
          nama: "Nama",
          customer: "Customer",
          gudang: "Gudang",
          batch: "Batch",
          qty: "Qty",
        } as Record<string, string>,
        rows: source.map((r) => ({
          jenis: r.jenis === "fg" ? "Finish Good" : "Material",
          kode: r.kode,
          nama: r.nama,
          customer: r.customerNama,
          gudang: r.gudangNama,
          batch: r.batchCustomer || "-",
          qty: r.qty,
        })),
      };
    }
    if (tab === "mutasi" || tab === "histori") {
      const source = tab === "histori" ? filteredHistori : histori;
      return {
        page: tab === "histori" ? "Report_Histori_Transaksi" : "Report_Mutasi_Stock",
        headers: {
          tanggal: "Tanggal",
          jenis: "Jenis",
          no: "No Dokumen",
          jenisTransaksi: "Jenis Transaksi",
          keterangan: "Keterangan",
          qty: "Qty",
        } as Record<string, string>,
        rows: source.map((h) => ({
          tanggal: formatDateID(h.tanggal),
          jenis: h.jenis,
          no: h.no,
          jenisTransaksi: h.jenisTransaksi || "-",
          keterangan: h.keterangan,
          qty: formatQty(h.qty, h.satuan),
        })),
      };
    }
    const grouped =
      tab === "per-customer"
        ? groupSum((r) => r.customerNama)
        : tab === "per-item"
          ? groupSum((r) =>
              r.jenis === "item" ? formatKodeNama(r.kode, r.nama) : "",
            ).filter((r) => r.key)
          : tab === "per-fg"
            ? groupSum((r) =>
                r.jenis === "fg" ? formatKodeNama(r.kode, r.nama) : "",
              ).filter((r) => r.key)
            : tab === "per-batch"
              ? groupSum((r) => r.batchCustomer || "-")
              : perGudangRows;
    const title =
      tab === "per-customer"
        ? "Customer"
        : tab === "per-item"
          ? "Material"
          : tab === "per-fg"
            ? "Finish Good"
            : tab === "per-batch"
              ? "Batch Customer"
              : "Gudang";
    const page =
      tab === "per-customer"
        ? "Report_Per_Customer"
        : tab === "per-item"
          ? "Report_Per_Material"
          : tab === "per-fg"
            ? "Report_Per_FG"
            : tab === "per-batch"
              ? "Report_Per_Batch"
              : "Report_Per_Gudang";
    return {
      page,
      headers: { key: title, qty: "Total Qty" } as Record<string, string>,
      rows: grouped.map((r) => ({ key: r.key, qty: r.qty })),
    };
  })();

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {tab !== "histori" && tab !== "mutasi" && (
            <>
              <div className="w-full sm:w-80">
                <SearchableCombobox
                  items={barangOptions}
                  value={selectedItem}
                  onValueChange={setSelectedItem}
                  filterItem={filterItemByKodeNama}
                  renderItem={(item) => (
                    <ItemNameWithType jenis={item.jenis}>
                      {item.label}
                    </ItemNameWithType>
                  )}
                  placeholder="Cari kode atau nama barang..."
                  emptyText="Tidak ada barang yang cocok"
                  className="bg-white"
                />
              </div>
              <CustomerFilterCombobox
                customers={customers}
                value={filterCust}
                onValueChange={setFilterCust}
                className="w-full sm:w-44"
              />
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
            </>
          )}
            <ExportExcelButton
              page={reportExport.page}
              rows={reportExport.rows}
              headers={reportExport.headers}
            />
          </div>
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
            title="Material"
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
                <Label>Pilih Item/Barang</Label>
                <SearchableCombobox
                  items={historiBarangOptions}
                  value={filterBarang}
                  onValueChange={setFilterBarang}
                  filterItem={filterItemByLabelKodeNama}
                  renderItem={(item) =>
                    item.jenis === "all" ? (
                      item.label
                    ) : (
                      <ItemNameWithType jenis={item.jenis}>
                        {item.label}
                      </ItemNameWithType>
                    )
                  }
                  placeholder="Semua Item/Barang"
                  emptyText="Tidak ada barang yang cocok"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>No. PO</Label>
                <Input
                  type="text"
                  value={searchPO}
                  onChange={(e) => setSearchPO(e.target.value)}
                  placeholder="Cari No. PO..."
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>No. SPK</Label>
                <Input
                  type="text"
                  value={searchSPK}
                  onChange={(e) => setSearchSPK(e.target.value)}
                  placeholder="Cari No. SPK..."
                  className="bg-white"
                />
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
                  : "Pilih satu item/barang agar saldo dihitung dalam satu satuan."
              }
            />
          </div>
        )}
        {tab === "titipan" && (
          <StockTable
            rows={filteredTitipan}
            caption="Rekap sisa barang titipan per gudang, sudah termasuk transfer."
          />
        )}
      </SidebarSubnavLayout>
    </div>
  );
}

function netMutasi(rows: HistoriRow[]) {
  const net = rows
    .filter(countsTowardStock)
    .reduce((sum, row) => sum + row.delta, 0);
  const units = new Set(
    rows
      .filter((row) => countsTowardStock(row) && row.delta !== 0)
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
              <TableRow
                key={h.id}
                className={
                  h.adjustmentStatus === "menunggu_approval"
                    ? "text-muted-foreground opacity-60"
                    : undefined
                }
              >
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
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tidak ada data
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>
                  <ItemTypeBadge jenis={r.jenis} />
                </TableCell>
                <TableCell>{r.kode}</TableCell>
                <TableCell>{r.nama}</TableCell>
                <TableCell>{r.customerNama}</TableCell>
                <TableCell>{r.gudangNama}</TableCell>
                <TableCell>{r.batchCustomer || "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.qty}</TableCell>
              </TableRow>
            ))
          )}
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
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                Tidak ada data
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="font-medium">{r.key}</TableCell>
                <TableCell className="text-right">{r.qty}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
