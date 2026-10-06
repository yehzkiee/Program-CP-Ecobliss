"use client";

import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportFileName,
  exportToExcel,
  type ExcelRow,
} from "@/lib/export-to-excel";

export function ExportExcelButton({
  page,
  rows,
  headers,
}: {
  page: string;
  rows: ExcelRow[];
  headers?: Record<string, string>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="bg-white"
      onClick={() => {
        void exportToExcel({
          data: rows,
          filename: exportFileName(page),
          headers,
        }).catch(() => {
          toast.error("Gagal mengekspor Excel");
        });
      }}
    >
      <FileSpreadsheet />
      Export Excel
    </Button>
  );
}
