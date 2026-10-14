import type { ReactNode } from "react";
import {
  tableBodyCellClass,
  tableHeadCellClass,
  tableShellClass,
} from "@/lib/table-styles";
import { cn } from "@/lib/utils";

export type DocLineViewRow = {
  name: ReactNode;
  batch: string;
  /** Already formatted, e.g. "500 LBR" */
  qty: string;
  gudang: string;
  keterangan: string;
};

/** Fixed widths so Qty and Gudang never visually collide. */
const colGroup = [
  "w-[28%]",
  "w-[16%]",
  "w-[14%]",
  "w-[20%]",
  "w-auto",
] as const;

/** Read-only line table for BTB/BKB detail view. */
export function DocLineViewTable({
  nameHeader,
  rows,
}: {
  nameHeader: string;
  rows: DocLineViewRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className={cn(tableShellClass, "table-fixed")}>
        <colgroup>
          {colGroup.map((width, index) => (
            <col key={index} className={width} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/30">
            <th className={tableHeadCellClass}>{nameHeader}</th>
            <th className={tableHeadCellClass}>Batch</th>
            <th className={tableHeadCellClass}>Qty</th>
            <th className={tableHeadCellClass}>Gudang</th>
            <th className={tableHeadCellClass}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className={cn(tableBodyCellClass, "text-center text-muted-foreground")}
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b last:border-0">
                <td className={cn(tableBodyCellClass, "whitespace-normal")}>
                  {row.name || "-"}
                </td>
                <td className={tableBodyCellClass}>{row.batch || "-"}</td>
                <td className={cn(tableBodyCellClass, "whitespace-nowrap tabular-nums")}>
                  {row.qty || "-"}
                </td>
                <td className={cn(tableBodyCellClass, "whitespace-normal")}>
                  {row.gudang || "-"}
                </td>
                <td className={cn(tableBodyCellClass, "whitespace-normal")}>
                  {row.keterangan || "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
