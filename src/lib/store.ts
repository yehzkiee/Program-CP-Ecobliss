"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  activityLogs as seedLogs,
  adjustments as seedAdj,
  bkbs as seedBkbs,
  boms as seedBoms,
  btbs as seedBtbs,
  customers as seedCustomers,
  ensureKartonTransfer,
  prefixStoredDocNos,
  ensureSeedById,
  finishGoods as seedFgs,
  gudangList as seedGudang,
  items as seedItems,
  jenisTransaksiList as seedJenis,
  stockOpnames as seedSo,
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
  deleteCustomer: (id: string) => void;
  upsertItem: (i: MaterialItem) => void;
  deleteItem: (id: string) => void;
  upsertFg: (f: FinishGood) => void;
  deleteFg: (id: string) => void;
  upsertBom: (b: Bom) => void;
  upsertBtb: (b: Btb) => void;
  upsertBkb: (b: Bkb) => void;
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
        const res = await fetch("/api/auth/login", {
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
        void fetch("/api/auth/logout", { method: "POST" });
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

const databaseStorage = {
  getItem: async () => {
    const res = await fetch("/api/state");
    if (!res.ok) return null;
    return (await res.json()) as {
      state: Partial<DataState>;
      version: number;
    };
  },
  setItem: (
    _name: string,
    value: { state: Partial<DataState>; version?: number },
  ) => {
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(async () => {
        const res = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        if (res.status === 403) {
          await useDataStore.persist.rehydrate();
          return;
        }
        if (!res.ok) {
          console.error("Gagal menyimpan data ke database", res.status);
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
      deleteCustomer: (id) =>
        set({ customers: get().customers.filter((x) => x.id !== id) }),
      upsertItem: (i) => set({ items: upsertById(get().items, i) }),
      deleteItem: (id) =>
        set({ items: get().items.filter((x) => x.id !== id) }),
      upsertFg: (f) => set({ finishGoods: upsertById(get().finishGoods, f) }),
      deleteFg: (id) =>
        set({ finishGoods: get().finishGoods.filter((x) => x.id !== id) }),
      upsertBom: (b) => set({ boms: upsertById(get().boms, b) }),
      upsertBtb: (b) => set({ btbs: upsertById(get().btbs, b) }),
      upsertBkb: (b) => set({ bkbs: upsertById(get().bkbs, b) }),
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
          btbs: (state.btbs ?? []).map((b) => ({
            ...b,
            jenisTransaksiId: resolveJenisTransaksiId(b.jenisTransaksiId),
          })),
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
            btbs: (p.btbs ?? current.btbs).map((b) => ({
              ...b,
              jenisTransaksiId: resolveJenisTransaksiId(b.jenisTransaksiId),
            })),
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
