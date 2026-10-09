import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  adjustments as seedAdjustments,
  activityLogs as seedLogs,
  bkbs as seedBkbs,
  boms as seedBoms,
  btbs as seedBtbs,
  buildStockRows,
  customers as seedCustomers,
  finishGoods as seedFinishGoods,
  gudangList as seedGudang,
  items as seedItems,
  jenisTransaksiList as seedJenis,
  stockOpnames as seedOpnames,
  transfers as seedTransfers,
  users as seedUsers,
} from "@/lib/mock/data";
import type { PersistedData } from "@/server/db";
import type { User } from "@/lib/types";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
};

type D1 = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
};

const READY = Symbol.for("program-cp-d1-ready");

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function seedState(): PersistedData {
  return {
    users: seedUsers.map((user) => ({ ...user, password: "" })),
    customers: seedCustomers.map((row) => ({ ...row })),
    items: seedItems.map((row) => ({ ...row })),
    finishGoods: seedFinishGoods.map((row) => ({ ...row })),
    boms: structuredClone(seedBoms),
    gudangList: seedGudang.map((row) => ({ ...row })),
    jenisTransaksiList: seedJenis.map((row) => ({ ...row })),
    btbs: structuredClone(seedBtbs),
    bkbs: structuredClone(seedBkbs),
    stockOpnames: structuredClone(seedOpnames),
    adjustments: structuredClone(seedAdjustments),
    transfers: structuredClone(seedTransfers),
    activityLogs: seedLogs.map((row) => ({ ...row })),
  };
}

export function onWorkers() {
  const agent = (globalThis as { navigator?: { userAgent?: string } }).navigator
    ?.userAgent;
  return agent === "Cloudflare-Workers";
}

async function database() {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: D1 }).DB;
  if (!db) throw new Error("Binding D1 DB tidak ditemukan");
  return db;
}

async function ready() {
  const db = await database();
  const globalState = globalThis as unknown as { [READY]?: Promise<void> };
  globalState[READY] ??= (async () => {
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, body TEXT NOT NULL)",
      )
      .run();
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS user_secrets (id TEXT PRIMARY KEY, password_hash TEXT NOT NULL)",
      )
      .run();
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL)",
      )
      .run();
    const existing = await db
      .prepare("SELECT id FROM app_state WHERE id = ?")
      .bind("main")
      .first<{ id: string }>();
    if (!existing) {
      const state = seedState();
      state.users = seedUsers.map((user) => ({ ...user }));
      await writeState(db, state, new Map());
    }
  })().catch((error: unknown) => {
    globalState[READY] = undefined;
    throw error;
  });
  await globalState[READY];
  return db;
}

function resolveHash(
  id: string,
  password: string,
  previous: Map<string, string>,
) {
  if (!password) {
    return previous.get(id) ?? hashPassword(randomBytes(16).toString("hex"));
  }
  if (password.startsWith("scrypt:")) return password;
  return hashPassword(password);
}

async function writeState(
  db: D1,
  state: PersistedData,
  previous: Map<string, string>,
) {
  const secrets = state.users.map((user) => ({
    id: user.id,
    hash: resolveHash(user.id, user.password ?? "", previous),
  }));
  const stored: PersistedData = {
    ...state,
    users: state.users.map((user) => ({ ...user, password: "" })),
  };
  await db.batch([
    db.prepare("DELETE FROM user_secrets"),
    ...secrets.map((row) =>
      db
        .prepare("INSERT INTO user_secrets (id, password_hash) VALUES (?, ?)")
        .bind(row.id, row.hash),
    ),
    db
      .prepare(
        "INSERT INTO app_state (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body",
      )
      .bind("main", JSON.stringify(stored)),
  ]);
}

async function hashes(db: D1) {
  const rows = await db
    .prepare("SELECT id, password_hash FROM user_secrets")
    .all<{ id: string; password_hash: string }>();
  return new Map(rows.results.map((row) => [row.id, row.password_hash]));
}

export async function loadStateD1(): Promise<PersistedData> {
  const db = await ready();
  const row = await db
    .prepare("SELECT body FROM app_state WHERE id = ?")
    .bind("main")
    .first<{ body: string }>();
  if (!row) return seedState();
  return JSON.parse(row.body) as PersistedData;
}

export async function replacePersistedStateD1(state: PersistedData) {
  const db = await ready();
  await writeState(db, state, await hashes(db));
}

export async function loginUserD1(username: string, password: string) {
  const db = await ready();
  const state = await loadStateD1();
  const user = state.users.find((row) => row.username === username);
  const secret = user
    ? await db
        .prepare("SELECT password_hash FROM user_secrets WHERE id = ?")
        .bind(user.id)
        .first<{ password_hash: string }>()
    : null;
  if (!user || !secret || !verifyPassword(password, secret.password_hash)) {
    return null;
  }
  const token = randomBytes(32).toString("hex");
  await db
    .prepare(
      "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
    )
    .bind(token, user.id, new Date().toISOString())
    .run();
  return { token, user: { ...user, password: "" } satisfies User };
}

export async function userFromTokenD1(token: string | undefined | null) {
  if (!token) return null;
  const db = await ready();
  const session = await db
    .prepare("SELECT user_id FROM sessions WHERE token = ?")
    .bind(token)
    .first<{ user_id: string }>();
  if (!session) return null;
  const state = await loadStateD1();
  const user = state.users.find((row) => row.id === session.user_id);
  if (!user) return null;
  return { ...user, password: "" } satisfies User;
}

export async function logoutTokenD1(token: string | undefined | null) {
  if (!token) return;
  const db = await ready();
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

export async function readStockD1() {
  const state = await loadStateD1();
  return {
    balances: buildStockRows({
      customers: state.customers,
      gudangList: state.gudangList,
      items: state.items,
      finishGoods: state.finishGoods,
      btbs: state.btbs,
      bkbs: state.bkbs,
      transfers: state.transfers,
      adjustments: state.adjustments,
    }),
    ledgerCount: state.btbs.length + state.bkbs.length + state.transfers.length,
  };
}
