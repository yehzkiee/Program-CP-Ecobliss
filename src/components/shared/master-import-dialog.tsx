"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportToExcel } from "@/lib/export-to-excel";
import {
  buildCustomerImport,
  buildFinishGoodImport,
  buildMaterialImport,
  parseSpreadsheetRows,
  templateHeaders,
  templateSampleRows,
  type ImportPreviewRow,
  type MasterImportKind,
} from "@/lib/master-import";
import type { Customer, FinishGood, MaterialItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<MasterImportKind, string> = {
  customer: "Customer",
  material: "Material",
  "finish-good": "Finish Good",
};

type MasterImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MasterImportKind;
  customers: Customer[];
  existingCustomers?: Customer[];
  existingItems?: MaterialItem[];
  existingFinishGoods?: FinishGood[];
  onImportCustomers?: (rows: Customer[]) => void;
  onImportItems?: (rows: MaterialItem[]) => void;
  onImportFinishGoods?: (rows: FinishGood[]) => void;
};

export function MasterImportDialog({
  open,
  onOpenChange,
  kind,
  customers,
  existingCustomers = [],
  existingItems = [],
  existingFinishGoods = [],
  onImportCustomers,
  onImportItems,
  onImportFinishGoods,
}: MasterImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([]);
  const [pendingItems, setPendingItems] = useState<MaterialItem[]>([]);
  const [pendingFgs, setPendingFgs] = useState<FinishGood[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFileName("");
    setParsing(false);
    setImporting(false);
    setPreview([]);
    setPendingCustomers([]);
    setPendingItems([]);
    setPendingFgs([]);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [open]);

  const okCount = useMemo(
    () => preview.filter((r) => r.status === "ok").length,
    [preview],
  );
  const errorCount = preview.length - okCount;

  const previewColumns = useMemo(() => {
    if (kind === "customer") return ["kode", "nama"] as const;
    return [
      "kode",
      "nama",
      "kodeCustomer",
      "uom1",
      "status",
    ] as const;
  }, [kind]);

  async function downloadTemplate() {
    try {
      await exportToExcel({
        data: templateSampleRows(kind),
        filename: `Template_Import_${KIND_LABEL[kind].replace(/\s+/g, "_")}`,
        headers: templateHeaders(kind),
      });
    } catch {
      toast.error("Gagal mengunduh template");
    }
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls") && !lower.endsWith(".csv")) {
      toast.error("Format file harus .csv atau .xlsx");
      return;
    }

    setParsing(true);
    setFileName(file.name);
    try {
      const { headers, rows } = await parseSpreadsheetRows(file);
      if (!rows.length) {
        toast.error("Tidak ada baris data di file");
        setPreview([]);
        setPendingCustomers([]);
        setPendingItems([]);
        setPendingFgs([]);
        return;
      }

      if (kind === "customer") {
        const result = buildCustomerImport(headers, rows, existingCustomers);
        setPreview(result.preview);
        setPendingCustomers(result.valid);
        setPendingItems([]);
        setPendingFgs([]);
      } else if (kind === "material") {
        const result = buildMaterialImport(
          headers,
          rows,
          existingItems,
          customers,
        );
        setPreview(result.preview);
        setPendingItems(result.valid);
        setPendingCustomers([]);
        setPendingFgs([]);
      } else {
        const result = buildFinishGoodImport(
          headers,
          rows,
          existingFinishGoods,
          customers,
        );
        setPreview(result.preview);
        setPendingFgs(result.valid);
        setPendingCustomers([]);
        setPendingItems([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal membaca file. Pastikan format kolom sesuai template.");
      setPreview([]);
      setPendingCustomers([]);
      setPendingItems([]);
      setPendingFgs([]);
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function processImport() {
    const count =
      kind === "customer"
        ? pendingCustomers.length
        : kind === "material"
          ? pendingItems.length
          : pendingFgs.length;
    if (count === 0) {
      toast.error("Tidak ada baris valid untuk diimpor");
      return;
    }

    setImporting(true);
    try {
      if (kind === "customer") onImportCustomers?.(pendingCustomers);
      else if (kind === "material") onImportItems?.(pendingItems);
      else onImportFinishGoods?.(pendingFgs);

      const failNote =
        errorCount > 0 ? ` ${errorCount} baris dilewati karena error.` : "";
      toast.success(`${count} ${KIND_LABEL[kind]} berhasil diimpor.${failNote}`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Data {KIND_LABEL[kind]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void downloadTemplate()}>
              <Download className="size-4" />
              Download Template Excel
            </Button>
            <p className="text-xs text-muted-foreground">
              Isi template lalu unggah file .csv / .xlsx
            </p>
          </div>

          <div
            className={cn(
              "rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 transition-colors",
              dragOver && "border-emerald-600 bg-emerald-50/50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={parsing}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="size-4" />
                {parsing ? "Membaca..." : "Pilih file"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {fileName
                  ? fileName
                  : "Pilih file .csv / .xlsx atau drop file ke area ini"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {preview.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <FileSpreadsheet className="size-4 text-emerald-700" />
                <span>
                  Preview: <strong>{okCount}</strong> siap import
                  {errorCount > 0 ? (
                    <>
                      , <strong className="text-red-700">{errorCount}</strong>{" "}
                      gagal
                    </>
                  ) : null}
                </span>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border border-border/80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Baris</TableHead>
                      {previewColumns.map((col) => (
                        <TableHead key={col}>{colLabel(kind, col)}</TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={
                          row.status === "error" ? "bg-red-50/70" : undefined
                        }
                      >
                        <TableCell>{row.rowNumber}</TableCell>
                        {previewColumns.map((col) => (
                          <TableCell key={col}>
                            {row.values[col] || "-"}
                          </TableCell>
                        ))}
                        <TableCell
                          className={
                            row.status === "ok"
                              ? "text-emerald-800"
                              : "text-red-700"
                          }
                        >
                          {row.status === "ok" ? "OK" : row.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={okCount === 0 || parsing || importing}
            onClick={processImport}
          >
            {importing ? "Memproses..." : "Proses Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function colLabel(kind: MasterImportKind, key: string) {
  const headers = templateHeaders(kind);
  return headers[key] ?? key;
}
