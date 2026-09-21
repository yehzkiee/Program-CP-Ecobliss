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

interface AuthState {
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
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
      login: (username, password) => {
        const user = seedUsers.find(
          (u) => u.username === username && u.password === password,
        );
        if (!user) return false;
        set({ currentUser: user });
        return true;
      },
      logout: () => set({ currentUser: null }),
      setRoleDemo: (role) => {
        const user = get().currentUser;
        if (!user) return;
        set({ currentUser: { ...user, role } });
      },
    }),
    { name: "program-cp-auth" },
  ),
);

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
      version: 2,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<DataState>;
        return {
          ...state,
          items: ensureSeedById(seedItems, state.items ?? []),
          finishGoods: ensureSeedById(seedFgs, state.finishGoods ?? []),
          customers: ensureSeedById(seedCustomers, state.customers ?? []),
          gudangList: ensureSeedById(seedGudang, state.gudangList ?? []),
        };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DataState>;
        return {
          ...current,
          ...p,
          items: ensureSeedById(seedItems, p.items ?? current.items),
          finishGoods: ensureSeedById(seedFgs, p.finishGoods ?? current.finishGoods),
          customers: ensureSeedById(
            seedCustomers,
            p.customers ?? current.customers,
          ),
          gudangList: ensureSeedById(
            seedGudang,
            p.gudangList ?? current.gudangList,
          ),
        };
      },
    },
  ),
);
