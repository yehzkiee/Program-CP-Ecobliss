"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PrintDocHeader,
  PrintShell,
  PrintTable,
} from "@/components/print/print-document";
import { ItemNameWithType } from "@/components/shared/ItemTypeBadge";
import { getLatestBomRevision } from "@/lib/mock/data";
import { useDataStore } from "@/lib/store";
import { formatDateID } from "@/lib/utils";

const MATERIAL_COLS = [
  { key: "kode", header: "Kode", width: "20%" },
  { key: "nama", header: "Nama", width: "48%" },
  { key: "qty", header: "Qty", width: "16%", align: "right" as const },
  { key: "uom", header: "UOM", width: "16%" },
];

const FG_COLS = [
  { key: "kode", header: "Kode", width: "24%" },
  { key: "nama", header: "Nama", width: "56%" },
  { key: "qty", header: "Qty", width: "20%", align: "right" as const },
];

export default function PrintBomPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const boms = useDataStore((s) => s.boms);
  const items = useDataStore((s) => s.items);
  const finishGoods = useDataStore((s) => s.finishGoods);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useDataStore.persist.hasHydrated()) {
      finish();
    }
    return useDataStore.persist.onFinishHydration(finish);
  }, []);

  const bom = useMemo(() => boms.find((b) => b.id === id), [boms, id]);
  const itemMap = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i])),
    [items],
  );
  const fgMap = useMemo(
    () => Object.fromEntries(finishGoods.map((f) => [f.id, f])),
    [finishGoods],
  );

  if (!hydrated) {
    return <p className="p-8 text-sm text-muted-foreground">Memuat dokumen...</p>;
  }

  if (!bom) {
    return <p className="p-8">BOM tidak ditemukan.</p>;
  }

  const latest = getLatestBomRevision(bom);
  const fg = fgMap[bom.fgId];

  const materialRows =
    latest?.items.map((l) => {
      const item = itemMap[l.itemId];
      return [
        item?.kode ?? "-",
        <ItemNameWithType jenis="item">{item?.nama ?? "-"}</ItemNameWithType>,
        String(l.qty),
        item?.uom1 ?? "-",
      ];
    }) ?? [];

  const fgRows =
    latest?.fgs.map((l) => {
      const f = fgMap[l.fgId];
      return [
        f?.kode ?? "-",
        <ItemNameWithType jenis="fg">{f?.nama ?? "-"}</ItemNameWithType>,
        String(l.qty),
      ];
    }) ?? [];

  return (
    <PrintShell>
      <div className="no-print mb-4 flex gap-2">
        <Button onClick={() => window.print()} className="bg-emerald-700">
          Cetak
        </Button>
      </div>

      <PrintDocHeader
        title="Bill of Materials"
        docNo={bom.kode}
        aside={
          <>
            <p>Rev. {latest?.revisi ?? "-"}</p>
            <p>{formatDateID(latest?.tanggal ?? "")}</p>
          </>
        }
      />

      <p className="mb-2 text-slate-800">
        <span className="text-slate-500">Finish Good: </span>
        {fg ? (
          <ItemNameWithType jenis="fg">
            {fg.kode} - {fg.nama}
          </ItemNameWithType>
        ) : (
          "-"
        )}
      </p>
      {bom.keterangan ? (
        <p className="mb-6 text-slate-600">{bom.keterangan}</p>
      ) : (
        <div className="mb-6" />
      )}

      <PrintTable
        title="Material"
        columns={MATERIAL_COLS}
        rows={materialRows}
      />
      <PrintTable
        title="Finish Good terkait"
        columns={FG_COLS}
        rows={fgRows}
      />
    </PrintShell>
  );
}
