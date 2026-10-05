"use client";

import { useEffect } from "react";
import { cn, formatQty } from "@/lib/utils";

export { formatQty };

export function PrintShell({
  children,
  className,
  wide,
  paper = "a4",
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
  paper?: "a4" | "a5";
}) {
  useEffect(() => {
    if (paper !== "a5") return;
    document.documentElement.classList.add("print-page-a5");
    return () => document.documentElement.classList.remove("print-page-a5");
  }, [paper]);

  return (
    <div
      className={cn(
        "print-document mx-auto bg-white p-8 text-sm text-slate-900",
        wide ? "max-w-4xl" : "max-w-3xl",
        paper === "a5" && "max-w-[148mm] px-4 py-5 text-[13px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PrintDocHeader({
  title,
  docNo,
  meta,
  aside,
}: {
  title: string;
  docNo?: string;
  meta?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="print-doc-header mb-6 flex items-start justify-between gap-4 border-b border-slate-300 pb-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Ecobliss · Program-CP
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{title}</h1>
        {docNo ? <p className="mt-0.5 text-slate-800">{docNo}</p> : null}
        {meta ? <div className="mt-1 text-slate-600">{meta}</div> : null}
      </div>
      {aside ? <div className="shrink-0 text-right text-xs text-slate-600">{aside}</div> : null}
    </div>
  );
}

export type PrintColumn = {
  key: string;
  header: string;
  /** CSS width e.g. "18%", "120px" */
  width: string;
  align?: "left" | "right" | "center";
};

export function PrintTable({
  title,
  columns,
  rows,
  emptyMessage = "Tidak ada data",
  className,
}: {
  title?: string;
  columns: PrintColumn[];
  rows: React.ReactNode[][];
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <section className={cn("print-section mb-6", className)}>
      {title ? (
        <h2 className="mb-2 text-sm font-semibold text-slate-900">{title}</h2>
      ) : null}
      <table className="print-table w-full border-collapse">
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "print-th border-b border-slate-300 py-2 pr-3 text-left align-bottom text-xs font-medium tracking-normal text-slate-600",
                  col.align === "right" && "whitespace-nowrap pr-0 pl-3 text-right",
                  col.align === "center" && "text-center",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="print-td border-b border-slate-200 py-3 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((cells, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={cn(
                      "print-td border-b border-slate-200 py-2 pr-3 align-top text-slate-900",
                      col.align === "right" &&
                        "whitespace-nowrap pr-0 pl-3 text-right tabular-nums",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {cells[colIndex] ?? "-"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

export function PrintSignatures({
  left = "Pemberi",
  right = "Penerima",
}: {
  left?: string;
  right?: string;
}) {
  return (
    <div className="print-signatures mt-12 grid grid-cols-2 gap-10 text-center">
      <div className="print-signature-block">
        <p className="mb-20 text-slate-800">{left}</p>
        <p className="border-t border-slate-400 pt-2 text-slate-600">
          (Nama & TTD)
        </p>
      </div>
      <div className="print-signature-block">
        <p className="mb-20 text-slate-800">{right}</p>
        <p className="border-t border-slate-400 pt-2 text-slate-600">
          (Nama & TTD)
        </p>
      </div>
    </div>
  );
}
