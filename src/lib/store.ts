"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { withBasePath } from "@/lib/base-path";
import {
  activityLogs as seedLogs,
  adjustments as seedAdj,
  bkbs as seedBkbs,
  boms as seedBoms,
  btbs as seedBtbs,
  customers as seedCustomers,
  ensureKartonTransfer,
  prefixStoredDocNos,
  withoutTransferBtbLines,
  ensureSeedById,
  finishGoods as seedFgs,
  gudangList as seedGudang,
  items as seedItems,
  jenisTransaksiList as seedJenis,
  stockOpnames as seedSo,
  syncBtbQtySisa,
  transfers as seedTf,
  users as seedUsers,
} from "@/lib/mock/data";
import type {
  ActivityLog,
  Adjustment,
  Bkb,
  Bom,
  Btb,
  Customer,
  FinishGood,
  Gudang,
  JenisTransaksi,
  MaterialItem,
  Role,
  StockOpname,
  TransferGudang,
  User,
} from "@/lib/types";
import { migrateUomFields } from "@/lib/utils";
import {
  resolveJenisTransaksiId,
} from "@/lib/jenis-transaksi";

interface AuthState {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setRoleDemo: (role: Role) => void;
}

interface DataState {
  users: User[];
  customers: Customer[];
  items: MaterialItem[];
  finishGoods: FinishGood[];
  boms: Bom[];
  gudangList: Gudang[];
  jenisTransaksiList: JenisTransaksi[];
  btbs: Btb[];
  bkbs: Bkb[];
  stockOpnames: StockOpname[];
  adjustments: Adjustment[];
  transfers: TransferGudang[];
  activityLogs: ActivityLog[];
  upsertCustomer: (c: Customer) => void;
  bulkUpsertCustomers: (rows: Customer[]) => void;
  deleteCustomer: (id: string) => void;
  upsertItem: (i: MaterialItem) => void;
  bulkUpsertItems: (rows: MaterialItem[]) => void;
  deleteItem: (id: string) => void;
  upsertFg: (f: FinishGood) => void;
  bulkUpsertFgs: (rows: FinishGood[]) => void;
  deleteFg: (id: string) => void;
  upsertBom: (b: Bom) => void;
  upsertBtb: (b: Btb) => void;
  deleteBtb: (id: string) => void;
  upsertBkb: (b: Bkb) => void;
  deleteBkb: (id: string) => void;
  upsertStockOpname: (s: StockOpname) => void;
  upsertAdjustment: (a: Adjustment) => void;
  upsertTransfer: (t: TransferGudang) => void;
  upsertGudang: (g: Gudang) => void;
  deleteGudang: (id: string) => void;
  upsertJenis: (j: JenisTransaksi) => void;
  deleteJenis: (id: string) => void;
  upsertUser: (u: User) => void;
  addLog: (log: Omit<ActivityLog, "id">) => void;
  resetDemo: () => void;
}

const seed = {
  users: seedUsers,
  customers: seedCustomers,
  items: seedItems,
  finishGoods: seedFgs,
  boms: seedBoms,
  gudangList: seedGudang,
  jenisTransaksiList: seedJenis,
  btbs: seedBtbs,
  bkbs: seedBkbs,
  stockOpnames: seedSo,
  adjustments: seedAdj,
  transfers: seedTf,
  activityLogs: seedLogs,
};

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = item;
  return next;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      login: async (username, password) => {
        const res = await fetch(withBasePath("/api/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as { user: User };
        set({ currentUser: { ...body.user, password: "" } });
        await useDataStore.persist.rehydrate();
        return true;
      },
      logout: () => {
        void fetch(withBasePath("/api/auth/logout"), { method: "POST" });
        set({ currentUser: null });
      },
      setRoleDemo: (role) => {
        const user = get().currentUser;
        if (!user) return;
        set({ currentUser: { ...user, role } });
      },
    }),
    {
      name: "program-cp-auth",
      partialize: (state) => ({
        currentUser: state.currentUser
          ? { ...state.currentUser, password: "" }
          : null,
      }),
    },
  ),
);

let writeQueue: Promise<void> = Promise.resolve();
/** Jangan timpa database dengan data awal sebelum pembacaan pertama berhasil. */
let persistWrites = false;

// Revisi dataset terakhir yang kita lihat dari server. Dipakai supaya dua orang
// yang menyimpan bersamaan tidak saling menimpa: server menolak dengan 409.
let serverRevision = 0;

const databaseStorage = {
  getItem: async () => {
    try {
      const res = await fetch(withBasePath("/api/state"), { cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        state: Partial<DataState>;
        version: number;
        revision?: number;
      };
      serverRevision = body.revision ?? 0;
      persistWrites = true;
      return body;
    } catch {
      return null;
    }
  },
  setItem: (
    _name: string,
    value: { state: Partial<DataState>; version?: number },
  ) => {
    if (!persistWrites) return Promise.resolve();
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(async () => {
        const res = await fetch(withBasePath("/api/state"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...value, revision: serverRevision }),
        });
        if (res.status === 409) {
          toast.warning(
            "Data sudah diubah pengguna lain. Halaman dimuat ulang supaya tidak ada perubahan yang tertimpa.",
            { duration: 8000 },
          );
          await useDataStore.persist.rehydrate();
          return;
        }
        if (res.status === 403) {
          toast.error(
            "Hanya admin yang dapat mengubah user atau menyetujui adjustment.",
          );
          await useDataStore.persist.rehydrate();
          return;
        }
        if (!res.ok) {
          toast.error("Gagal menyimpan data ke database. Coba lagi.");
          console.error("Gagal menyimpan data ke database", res.status);
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          revision?: number;
        } | null;
        if (typeof body?.revision === "number") {
          serverRevision = body.revision;
        }
      });
    return writeQueue;
  },
  removeItem: async () => undefined,
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      ...seed,
      upsertCustomer: (c) =>
        set({ customers: upsertById(get().customers, c) }),
      bulkUpsertCustomers: (rows) => {
        if (!rows.length) return;
        // Sisipkan di depan sekali jalan agar urutan file terjaga (bukan terbalik).
        set({ customers: [...rows, ...get().customers] });
      },
      deleteCustomer: (id) =>
        set({ customers: get().customers.filter((x) => x.id !== id) }),
      upsertItem: (i) => set({ items: upsertById(get().items, i) }),
      bulkUpsertItems: (rows) => {
        if (!rows.length) return;
        set({ items: [...rows, ...get().items] });
      },
      deleteItem: (id) =>
        set({ items: get().items.filter((x) => x.id !== id) }),
      upsertFg: (f) => set({ finishGoods: upsertById(get().finishGoods, f) }),
      bulkUpsertFgs: (rows) => {
        if (!rows.length) return;
        set({ finishGoods: [...rows, ...get().finishGoods] });
      },
      deleteFg: (id) =>
        set({ finishGoods: get().finishGoods.filter((x) => x.id !== id) }),
      upsertBom: (b) => set({ boms: upsertById(get().boms, b) }),
      upsertBtb: (b) => set({ btbs: upsertById(get().btbs, b) }),
      deleteBtb: (id) =>
        set({ btbs: get().btbs.filter((x) => x.id !== id) }),
      upsertBkb: (b) => set({ bkbs: upsertById(get().bkbs, b) }),
      /** Hapus BKB dan sync qtySisa BTB dalam satu persist (stok out ikut ter-revert). */
      deleteBkb: (id) => {
        const nextBkbs = get().bkbs.filter((x) => x.id !== id);
        set({
          bkbs: nextBkbs,
          btbs: syncBtbQtySisa(get().btbs, nextBkbs),
        });
      },
      upsertStockOpname: (s) =>
        set({ stockOpnames: upsertById(get().stockOpnames, s) }),
      upsertAdjustment: (a) =>
        set({ adjustments: upsertById(get().adjustments, a) }),
      upsertTransfer: (t) =>
        set({ transfers: upsertById(get().transfers, t) }),
      upsertGudang: (g) =>
        set({ gudangList: upsertById(get().gudangList, g) }),
      deleteGudang: (id) =>
        set({ gudangList: get().gudangList.filter((x) => x.id !== id) }),
      upsertJenis: (j) =>
        set({
          jenisTransaksiList: upsertById(get().jenisTransaksiList, j),
        }),
      deleteJenis: (id) =>
        set({
          jenisTransaksiList: get().jenisTransaksiList.filter(
            (x) => x.id !== id,
          ),
        }),
      upsertUser: (u) => set({ users: upsertById(get().users, u) }),
      addLog: (log) =>
        set({
          activityLogs: [
            { ...log, id: `log-${Date.now()}` },
            ...get().activityLogs,
          ],
        }),
      resetDemo: () => set({ ...seed }),
    }),
    {
      name: "program-cp-data",
      storage: databaseStorage,
      skipHydration: true,
      version: 6,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<DataState>;
        return prefixStoredDocNos({
          ...state,
          items: ensureSeedById(
            seedItems,
            (state.items ?? []).map((row) => migrateUomFields(row)),
          ),
          finishGoods: ensureSeedById(
            seedFgs,
            (state.finishGoods ?? []).map((row) => migrateUomFields(row)),
          ),
          customers: ensureSeedById(seedCustomers, state.customers ?? []),
          gudangList: ensureSeedById(seedGudang, state.gudangList ?? []),
          // Ganti penuh agar opsi lama tidak ikut muncul di Setting/list.
          jenisTransaksiList: seedJenis,
          btbs: (state.btbs ?? []).map((b) =>
            withoutTransferBtbLines({
              ...b,
              jenisTransaksiId: resolveJenisTransaksiId(b.jenisTransaksiId),
            }),
          ),
          bkbs: (state.bkbs ?? []).map((b) => ({
            ...b,
            jenisTransaksiId: resolveJenisTransaksiId(b.jenisTransaksiId),
          })),
        });
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DataState>;
        return {
          ...current,
          ...p,
          items: ensureSeedById(
            seedItems,
            (p.items ?? current.items).map((row) => migrateUomFields(row)),
          ),
          finishGoods: ensureSeedById(
            seedFgs,
            (p.finishGoods ?? current.finishGoods).map((row) =>
              migrateUomFields(row),
            ),
          ),
          customers: ensureSeedById(
            seedCustomers,
            p.customers ?? current.customers,
          ),
          gudangList: ensureSeedById(
            seedGudang,
            p.gudangList ?? current.gudangList,
          ),
          jenisTransaksiList: ensureSeedById(
            seedJenis,
            p.jenisTransaksiList ?? current.jenisTransaksiList,
          ),
          ...prefixStoredDocNos({
            btbs: (p.btbs ?? current.btbs).map((b) =>
              withoutTransferBtbLines({
                ...b,
                jenisTransaksiId: resolveJenisTransaksiId(b.jenisTransaksiId),
              }),
            ),
            bkbs: (p.bkbs ?? current.bkbs).map((b) => ({
              ...b,
              jenisTransaksiId: resolveJenisTransaksiId(b.jenisTransaksiId),
            })),
            transfers: ensureKartonTransfer(p.transfers ?? current.transfers),
            stockOpnames: p.stockOpnames ?? current.stockOpnames,
            adjustments: p.adjustments ?? current.adjustments,
            activityLogs: p.activityLogs ?? current.activityLogs,
          }),
        };
      },
    },
  ),
);
