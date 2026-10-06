import type { WorkBook } from "xlsx";

export type ExcelCell = string | number | boolean | null | undefined;
export type ExcelRow = Record<string, ExcelCell>;

export function exportFileName(page: string, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const safePage = page.trim().replace(/\s+/g, "_");
  return `Export_${safePage}_${y}${m}${d}.xlsx`;
}

function sheetRows(data: ExcelRow[], headers?: Record<string, string>) {
  if (!headers) {
    return data.map((row) => {
      const out: Record<string, ExcelCell> = {};
      for (const [key, value] of Object.entries(row)) out[key] = value ?? "";
      return out;
    });
  }
  return data.map((row) => {
    const out: Record<string, ExcelCell> = {};
    for (const [key, label] of Object.entries(headers)) {
      out[label] = row[key] ?? "";
    }
    return out;
  });
}

export async function exportToExcel({
  data,
  filename,
  headers,
}: {
  data: ExcelRow[];
  filename: string;
  headers?: Record<string, string>;
}) {
  const XLSX = await import("xlsx");
  const rows = sheetRows(data, headers);
  const sheet =
    rows.length === 0 && headers
      ? XLSX.utils.aoa_to_sheet([Object.values(headers)])
      : XLSX.utils.json_to_sheet(rows);
  const book: WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Data");
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const out = XLSX.write(book, { bookType: "xlsx", type: "array" }) as
    | ArrayBuffer
    | number[];
  const bytes = out instanceof ArrayBuffer ? new Uint8Array(out) : new Uint8Array(out);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
