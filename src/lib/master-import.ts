import type { Customer, FinishGood, MaterialItem, StatusAktif } from "@/lib/types";
import { uid } from "@/lib/utils";

export type MasterImportKind = "customer" | "material" | "finish-good";

export type ImportColumn = {
  key: string;
  header: string;
  required?: boolean;
};

export type ImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  status: "ok" | "error";
  error?: string;
};

export type ImportBuildResult<T> = {
  preview: ImportPreviewRow[];
  valid: T[];
  okCount: number;
  errorCount: number;
};

const MATERIAL_UOM = new Set(["LBR", "KG", "M", "PCS", "BOX", "ROLL", "SET"]);
const FG_UOM = new Set(["PCS", "BOX", "SET", "PACK", "ROLL"]);

export const CUSTOMER_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "kode", header: "Kode Customer", required: true },
  { key: "nama", header: "Nama Customer", required: true },
];

export const MATERIAL_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "kode", header: "Kode Material", required: true },
  { key: "nama", header: "Nama Material", required: true },
  { key: "kodeCustomer", header: "Kode Customer", required: true },
  { key: "batchCustomer", header: "Batch Customer" },
  { key: "uom1", header: "UOM 1" },
  { key: "uom2", header: "UOM 2" },
  { key: "konversi2", header: "Konversi UOM 2" },
  { key: "uom3", header: "UOM 3" },
  { key: "konversi3", header: "Konversi UOM 3" },
  { key: "status", header: "Status" },
];

export const FINISH_GOOD_IMPORT_COLUMNS: ImportColumn[] = [
  { key: "kode", header: "Kode FG", required: true },
  { key: "nama", header: "Nama FG", required: true },
  { key: "kodeCustomer", header: "Kode Customer", required: true },
  { key: "batchCustomer", header: "Batch Customer" },
  { key: "uom1", header: "UOM 1" },
  { key: "uom2", header: "UOM 2" },
  { key: "konversi2", header: "Konversi UOM 2" },
  { key: "uom3", header: "UOM 3" },
  { key: "konversi3", header: "Konversi UOM 3" },
  { key: "status", header: "Status" },
];

const SHARED_ALIASES: Record<string, string[]> = {
  batchCustomer: ["batch customer", "batch", "batch cust"],
  uom1: ["uom 1", "uom1", "satuan 1", "satuan"],
  uom2: ["uom 2", "uom2", "satuan 2"],
  uom3: ["uom 3", "uom3", "satuan 3"],
  konversi2: ["konversi uom 2", "konversi2", "konversi 2"],
  konversi3: ["konversi uom 3", "konversi3", "konversi 3"],
  status: ["status"],
};

const KIND_ALIASES: Record<MasterImportKind, Record<string, string[]>> = {
  customer: {
    kode: ["kode", "kode customer", "code"],
    nama: ["nama", "nama customer", "name"],
  },
  material: {
    kode: ["kode", "kode material", "code", "sku"],
    nama: ["nama", "nama material", "name"],
    kodeCustomer: [
      "kode customer",
      "customer kode",
      "customer code",
      "kode cust",
    ],
    namaCustomer: [
      "nama customer",
      "customer",
      "customer nama",
      "customer name",
    ],
  },
  "finish-good": {
    kode: ["kode", "kode fg", "code", "sku"],
    nama: ["nama", "nama fg", "name"],
    kodeCustomer: [
      "kode customer",
      "customer kode",
      "customer code",
      "kode cust",
    ],
    namaCustomer: [
      "nama customer",
      "customer",
      "customer nama",
      "customer name",
    ],
  },
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

function parseNumber(raw: string) {
  if (!raw) return 0;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function normalizeStatus(raw: string): StatusAktif | null {
  const v = raw.trim().toLowerCase();
  if (!v || v === "aktif" || v === "active" || v === "1" || v === "ya") {
    return "aktif";
  }
  if (v === "nonaktif" || v === "non aktif" || v === "inactive" || v === "0") {
    return "nonaktif";
  }
  return null;
}

function normalizeUom(raw: string, allowed: Set<string>, fallback: string) {
  const v = raw.trim().toUpperCase();
  if (!v) return fallback;
  if (allowed.has(v)) return v;
  return null;
}

function mapHeaders(kind: MasterImportKind, headers: string[]) {
  const aliases = { ...SHARED_ALIASES, ...KIND_ALIASES[kind] };
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    const norm = normalizeHeader(header);
    if (!norm) return;
    for (const [key, names] of Object.entries(aliases)) {
      if (names.includes(norm) && !map.has(key)) {
        map.set(key, index);
      }
    }
  });
  return map;
}

function pick(
  cells: unknown[],
  headerMap: Map<string, number>,
  key: string,
) {
  const idx = headerMap.get(key);
  if (idx == null) return "";
  return cellText(cells[idx]);
}

export async function parseSpreadsheetRows(file: File): Promise<{
  headers: string[];
  rows: unknown[][];
}> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array" });
  const sheetName = book.SheetNames[0];
  if (!sheetName) {
    throw new Error("File tidak berisi sheet");
  }
  const sheet = book.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "", raw: false },
  );
  if (!matrix.length) {
    throw new Error("File kosong");
  }
  const headers = (matrix[0] ?? []).map((h) => cellText(h));
  const rows = matrix
    .slice(1)
    .filter((row) => row.some((cell) => cellText(cell) !== ""));
  return { headers, rows };
}

function resolveCustomerId(
  customers: Customer[],
  kodeCustomer: string,
  namaCustomer: string,
): string | null {
  const byKode = kodeCustomer
    ? customers.find(
        (c) => c.kode.trim().toLowerCase() === kodeCustomer.toLowerCase(),
      )
    : undefined;
  if (byKode) return byKode.id;
  const byNama = namaCustomer
    ? customers.find(
        (c) => c.nama.trim().toLowerCase() === namaCustomer.toLowerCase(),
      )
    : undefined;
  return byNama?.id ?? null;
}

export function templateHeaders(kind: MasterImportKind): Record<string, string> {
  const cols =
    kind === "customer"
      ? CUSTOMER_IMPORT_COLUMNS
      : kind === "material"
        ? MATERIAL_IMPORT_COLUMNS
        : FINISH_GOOD_IMPORT_COLUMNS;
  return Object.fromEntries(cols.map((c) => [c.key, c.header]));
}

export function templateSampleRows(
  kind: MasterImportKind,
): Record<string, string | number>[] {
  if (kind === "customer") {
    return [{ kode: "CUST-100", nama: "Contoh Customer" }];
  }
  if (kind === "material") {
    return [
      {
        kode: "MAT-100",
        nama: "Contoh Material",
        kodeCustomer: "CUST-001",
        batchCustomer: "",
        uom1: "PCS",
        uom2: "BOX",
        konversi2: 12,
        uom3: "",
        konversi3: "",
        status: "aktif",
      },
    ];
  }
  return [
    {
      kode: "FG-100",
      nama: "Contoh Finish Good",
      kodeCustomer: "CUST-001",
      batchCustomer: "",
      uom1: "PCS",
      uom2: "BOX",
      konversi2: 24,
      uom3: "",
      konversi3: "",
      status: "aktif",
    },
  ];
}

export function buildCustomerImport(
  headers: string[],
  rows: unknown[][],
  existing: Customer[],
): ImportBuildResult<Customer> {
  const headerMap = mapHeaders("customer", headers);
  const existingKodes = new Set(
    existing.map((c) => c.kode.trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();
  const preview: ImportPreviewRow[] = [];
  const valid: Customer[] = [];

  rows.forEach((cells, index) => {
    const rowNumber = index + 2;
    const kode = pick(cells, headerMap, "kode");
    const nama = pick(cells, headerMap, "nama");
    const values = { kode, nama };
    const kodeKey = kode.toLowerCase();

    let error: string | undefined;
    if (!kode || !nama) error = "Kode dan nama wajib diisi";
    else if (seenInFile.has(kodeKey)) error = `Kode duplikat di file: ${kode}`;
    else if (existingKodes.has(kodeKey))
      error = `Kode sudah ada di database: ${kode}`;

    if (error) {
      preview.push({ rowNumber, values, status: "error", error });
      return;
    }

    seenInFile.add(kodeKey);
    const row: Customer = { id: uid("cust"), kode, nama };
    valid.push(row);
    preview.push({ rowNumber, values, status: "ok" });
  });

  return {
    preview,
    valid,
    okCount: valid.length,
    errorCount: preview.length - valid.length,
  };
}

function buildItemLikeImport<T extends MaterialItem | FinishGood>({
  kind,
  headers,
  rows,
  existing,
  customers,
  allowedUom,
  idPrefix,
  kategori,
  make,
}: {
  kind: "material" | "finish-good";
  headers: string[];
  rows: unknown[][];
  existing: { kode: string }[];
  customers: Customer[];
  allowedUom: Set<string>;
  idPrefix: string;
  kategori: string;
  make: (base: {
    id: string;
    kode: string;
    nama: string;
    customerId: string;
    kategori: string;
    batchCustomer: string;
    uom1: string;
    konversi1: number;
    uom2: string;
    konversi2: number;
    uom3: string;
    konversi3: number;
    status: StatusAktif;
  }) => T;
}): ImportBuildResult<T> {
  const headerMap = mapHeaders(kind, headers);
  const existingKodes = new Set(
    existing.map((c) => c.kode.trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();
  const preview: ImportPreviewRow[] = [];
  const valid: T[] = [];

  rows.forEach((cells, index) => {
    const rowNumber = index + 2;
    const kode = pick(cells, headerMap, "kode");
    const nama = pick(cells, headerMap, "nama");
    const kodeCustomer = pick(cells, headerMap, "kodeCustomer");
    const namaCustomer = pick(cells, headerMap, "namaCustomer");
    const batchCustomer = pick(cells, headerMap, "batchCustomer");
    const uom1Raw = pick(cells, headerMap, "uom1");
    const uom2Raw = pick(cells, headerMap, "uom2");
    const uom3Raw = pick(cells, headerMap, "uom3");
    const konversi2Raw = pick(cells, headerMap, "konversi2");
    const konversi3Raw = pick(cells, headerMap, "konversi3");
    const statusRaw = pick(cells, headerMap, "status");

    const values: Record<string, string> = {
      kode,
      nama,
      kodeCustomer: kodeCustomer || namaCustomer,
      batchCustomer,
      uom1: uom1Raw || "PCS",
      uom2: uom2Raw,
      konversi2: konversi2Raw,
      uom3: uom3Raw,
      konversi3: konversi3Raw,
      status: statusRaw || "aktif",
    };

    const kodeKey = kode.toLowerCase();
    let error: string | undefined;

    if (!kode || !nama) error = "Kode dan nama wajib diisi";
    else if (!kodeCustomer && !namaCustomer)
      error = "Kode Customer (atau Nama Customer) wajib diisi";
    else if (seenInFile.has(kodeKey)) error = `Kode duplikat di file: ${kode}`;
    else if (existingKodes.has(kodeKey))
      error = `Kode sudah ada di database: ${kode}`;

    const customerId =
      !error
        ? resolveCustomerId(customers, kodeCustomer, namaCustomer)
        : null;
    if (!error && !customerId) {
      error = `Customer tidak ditemukan: ${kodeCustomer || namaCustomer}`;
    }

    const uom1 = !error
      ? normalizeUom(uom1Raw, allowedUom, "PCS")
      : null;
    if (!error && uom1 == null) {
      error = `UOM 1 tidak valid: ${uom1Raw}`;
    }

    let uom2 = "";
    let konversi2 = 0;
    if (!error && uom2Raw) {
      const normalized = normalizeUom(uom2Raw, allowedUom, "");
      if (!normalized) error = `UOM 2 tidak valid: ${uom2Raw}`;
      else {
        uom2 = normalized;
        konversi2 = parseNumber(konversi2Raw);
        if (!Number.isFinite(konversi2) || konversi2 <= 0) {
          error = "Konversi UOM 2 harus angka > 0";
        }
      }
    }

    let uom3 = "";
    let konversi3 = 0;
    if (!error && uom3Raw) {
      if (!uom2) error = "UOM 3 membutuhkan UOM 2";
      else {
        const normalized = normalizeUom(uom3Raw, allowedUom, "");
        if (!normalized) error = `UOM 3 tidak valid: ${uom3Raw}`;
        else {
          uom3 = normalized;
          konversi3 = parseNumber(konversi3Raw);
          if (!Number.isFinite(konversi3) || konversi3 <= 0) {
            error = "Konversi UOM 3 harus angka > 0";
          }
        }
      }
    }

    const status = !error ? normalizeStatus(statusRaw) : null;
    if (!error && status == null) {
      error = `Status tidak valid: ${statusRaw}`;
    }

    if (error || !customerId || !uom1 || !status) {
      preview.push({ rowNumber, values, status: "error", error: error ?? "Data tidak valid" });
      return;
    }

    seenInFile.add(kodeKey);
    const row = make({
      id: uid(idPrefix),
      kode,
      nama,
      customerId,
      kategori,
      batchCustomer,
      uom1,
      konversi1: 1,
      uom2,
      konversi2: uom2 ? konversi2 : 0,
      uom3,
      konversi3: uom3 ? konversi3 : 0,
      status,
    });
    valid.push(row);
    preview.push({ rowNumber, values, status: "ok" });
  });

  return {
    preview,
    valid,
    okCount: valid.length,
    errorCount: preview.length - valid.length,
  };
}

export function buildMaterialImport(
  headers: string[],
  rows: unknown[][],
  existing: MaterialItem[],
  customers: Customer[],
): ImportBuildResult<MaterialItem> {
  return buildItemLikeImport({
    kind: "material",
    headers,
    rows,
    existing,
    customers,
    allowedUom: MATERIAL_UOM,
    idPrefix: "item",
    kategori: "Bahan Baku",
    make: (base) => base,
  });
}

export function buildFinishGoodImport(
  headers: string[],
  rows: unknown[][],
  existing: FinishGood[],
  customers: Customer[],
): ImportBuildResult<FinishGood> {
  return buildItemLikeImport({
    kind: "finish-good",
    headers,
    rows,
    existing,
    customers,
    allowedUom: FG_UOM,
    idPrefix: "fg",
    kategori: "Finish Good",
    make: (base) => base,
  });
}
