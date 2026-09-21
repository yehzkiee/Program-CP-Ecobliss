import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableColGroup,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { colGroupKodeNamaStatus } from "@/lib/table-styles";
import { formatStatusLabel } from "@/lib/utils";

export type RelatedRecordRow = {
  id: string;
  kode: string;
  nama: string;
  status: string;
  href: string;
};

const headerCellClass =
  "px-4 py-3 text-left text-sm font-semibold text-gray-700";
const bodyRowClass =
  "border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors";
const bodyCellClass = "px-4 py-3 text-sm text-gray-600";

export function RelatedRecordTable({
  rows,
  emptyMessage,
}: {
  rows: RelatedRecordRow[];
  emptyMessage: string;
}) {
  return (
    <Table className="table-fixed">
      <TableColGroup widths={colGroupKodeNamaStatus} />
      <TableHeader className="bg-gray-50 border-b border-gray-300">
        <TableRow className="hover:bg-gray-50">
          <TableHead className={headerCellClass}>Kode</TableHead>
          <TableHead className={headerCellClass}>Nama</TableHead>
          <TableHead className={headerCellClass}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow className={bodyRowClass}>
            <TableCell
              colSpan={3}
              className={`${bodyCellClass} text-muted-foreground`}
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id} className={bodyRowClass}>
              <TableCell className={bodyCellClass}>
                <Link
                  href={row.href}
                  className="block text-emerald-800 hover:underline"
                >
                  {row.kode}
                </Link>
              </TableCell>
              <TableCell className={`whitespace-normal ${bodyCellClass}`}>
                {row.nama}
              </TableCell>
              <TableCell className={bodyCellClass}>
                {formatStatusLabel(row.status)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
