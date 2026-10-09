import {
  loadState,
  replacePersistedState,
  type PersistedData,
} from "@/server/db";
import type { Customer, FinishGood, User } from "@/lib/types";

const ECOBLISS_API =
  process.env.ECOBLISS_API_BASE || "https://foodgradepack.com/wms/api";

type RemoteCustomer = {
  id?: string | number;
  code?: string | null;
  name?: string | null;
};

type RemoteProduct = {
  id?: string | number;
  sku?: string | null;
  name?: string | null;
  unit?: string | null;
  customer_code?: string | null;
  packing?: string | null;
  pcs_inner?: string | number | null;
};

export type ImportSummary = {
  customers: number;
  finishGoods: number;
  customersCreatedFromProduct: number;
  skippedProducts: number;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function asList<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? (data as T[]) : [];
}

async function fetchAll<T>(path: string) {
  const response = await fetch(`${ECOBLISS_API}/${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Ecobliss ${path} gagal (${response.status})`);
  }
  return asList<T>(await response.json());
}

function upsertCustomer(customers: Customer[], incoming: Customer) {
  const sameKode = customers.find((row) => row.kode === incoming.kode);
  if (sameKode) {
    sameKode.nama = incoming.nama || sameKode.nama;
    return sameKode.id;
  }
  const sameId = customers.find((row) => row.id === incoming.id);
  if (sameId) {
    sameId.kode = incoming.kode;
    sameId.nama = incoming.nama;
    return sameId.id;
  }
  customers.push(incoming);
  return incoming.id;
}

function upsertFinishGood(finishGoods: FinishGood[], incoming: FinishGood) {
  const sameKode = finishGoods.find((row) => row.kode === incoming.kode);
  const target = sameKode ?? finishGoods.find((row) => row.id === incoming.id);
  if (target) {
    target.kode = incoming.kode;
    target.nama = incoming.nama;
    target.customerId = incoming.customerId;
    target.kategori = incoming.kategori;
    target.uom1 = incoming.uom1;
    target.konversi1 = incoming.konversi1;
    target.uom2 = incoming.uom2;
    target.konversi2 = incoming.konversi2;
    return;
  }
  finishGoods.push(incoming);
}

export async function importEcoblissMasters(actor: User): Promise<ImportSummary> {
  const [remoteCustomers, remoteProducts] = await Promise.all([
    fetchAll<RemoteCustomer>("customers.php?limit=5000"),
    fetchAll<RemoteProduct>("products.php?limit=5000"),
  ]);

  const state: PersistedData = await loadState();
  const customerIdByKode = new Map<string, string>();
  let customersCreatedFromProduct = 0;
  let skippedProducts = 0;

  for (const row of remoteCustomers) {
    const kode = text(row.code) || `C${text(row.id)}`;
    const nama = text(row.name) || kode;
    if (!kode) continue;
    const id = upsertCustomer(state.customers, {
      id: `eco-c-${text(row.id) || kode}`,
      kode,
      nama,
    });
    customerIdByKode.set(kode, id);
  }

  for (const row of remoteProducts) {
    const kode = text(row.sku);
    const nama = text(row.name);
    if (!kode || !nama) {
      skippedProducts += 1;
      continue;
    }
    const customerKode = text(row.customer_code) || "TANPA-KODE";
    let customerId = customerIdByKode.get(customerKode);
    if (!customerId) {
      customerId = upsertCustomer(state.customers, {
        id: `eco-c-code-${customerKode}`,
        kode: customerKode,
        nama: customerKode === "TANPA-KODE" ? "Tanpa kode customer" : customerKode,
      });
      customerIdByKode.set(customerKode, customerId);
      customersCreatedFromProduct += 1;
    }

    const packing = text(row.packing);
    const inner = Number(row.pcs_inner);
    const hasInner = packing !== "" && Number.isFinite(inner) && inner > 0;
    upsertFinishGood(state.finishGoods, {
      id: `eco-fg-${text(row.id) || kode}`,
      kode,
      nama,
      customerId,
      kategori: "Finish Good",
      batchCustomer: "",
      uom1: text(row.unit) || "PCS",
      konversi1: 1,
      uom2: hasInner ? packing : "",
      konversi2: hasInner ? inner : 0,
      uom3: "",
      konversi3: 0,
      status: "aktif",
    });
  }

  const importedCustomers = state.customers.filter((row) =>
    row.id.startsWith("eco-c-"),
  ).length;
  const importedFinishGoods = state.finishGoods.filter((row) =>
    row.id.startsWith("eco-fg-"),
  ).length;

  state.activityLogs = [
    {
      id: `log-import-ecobliss-${Date.now()}`,
      waktu: new Date().toISOString(),
      userId: actor.id,
      userNama: actor.nama,
      aksi: "Impor master Ecobliss",
      detail: `${importedCustomers} customer, ${importedFinishGoods} finish good`,
    },
    ...state.activityLogs,
  ];

  await replacePersistedState(state);

  return {
    customers: importedCustomers,
    finishGoods: importedFinishGoods,
    customersCreatedFromProduct,
    skippedProducts,
  };
}
