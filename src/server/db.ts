import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  ensureMysql,
  loadStateMysql,
  loginUserMysql,
  logoutTokenMysql,
  readLatestBatchesMysql,
  readRevisionMysql,
  readStockMysql,
  replacePersistedStateMysql,
  pakaiMysql,
  userFromTokenMysql,
} from "@/server/mysql-store";
import {
  resolvePasswordHash,
  verifyPassword,
} from "@/server/password";
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
  isApprovedAdjustment,
  isTransferGeneratedBtbLine,
  items as seedItems,
  jenisTransaksiList as seedJenis,
  stockOpnames as seedOpnames,
  transfers as seedTransfers,
  users as seedUsers,
  withoutTransferBtbLines,
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
  StockRow,
  TransferGudang,
  User,
} from "@/lib/types";

export const SESSION_COOKIE = "cp_session";

export type PersistedData = {
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
};

type UserRow = {
  id: string;
  username: string;
  nama: string;
  role: Role;
  password_hash: string;
};

const globalForDb = globalThis as unknown as { programCpDb?: DatabaseSync };

function seedData(): PersistedData {
  return {
    users: seedUsers.map((user) => ({ ...user })),
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

export { verifyPassword };

function dataDirectory() {
  const configured = process.env.PROGRAM_CP_DATA_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "data");
}

function openDatabase() {
  if (globalForDb.programCpDb) return globalForDb.programCpDb;
  const dir = dataDirectory();
  mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(path.join(dir, "program-cp.sqlite"));
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      nama TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gudang (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      tipe TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jenis_transaksi (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      untuk TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      kategori TEXT NOT NULL,
      uom1 TEXT NOT NULL,
      konversi1 REAL NOT NULL,
      uom2 TEXT NOT NULL,
      konversi2 REAL NOT NULL,
      uom3 TEXT NOT NULL,
      konversi3 REAL NOT NULL,
      batch_customer TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS finish_goods (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      kategori TEXT NOT NULL,
      batch_customer TEXT NOT NULL,
      uom1 TEXT NOT NULL,
      konversi1 REAL NOT NULL,
      uom2 TEXT NOT NULL,
      konversi2 REAL NOT NULL,
      uom3 TEXT NOT NULL,
      konversi3 REAL NOT NULL,
      status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS boms (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      customer_id TEXT,
      fg_id TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS btbs (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      jenis_transaksi_id TEXT NOT NULL,
      customer_id TEXT,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bkbs (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      jenis_transaksi_id TEXT NOT NULL,
      no_spk TEXT,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_opnames (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS adjustments (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      stock_opname_id TEXT,
      status TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      waktu TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_nama TEXT NOT NULL,
      aksi TEXT NOT NULL,
      detail TEXT NOT NULL,
      no_transaksi TEXT
    );
    CREATE TABLE IF NOT EXISTS stock_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waktu TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      doc_no TEXT NOT NULL,
      arah TEXT NOT NULL,
      jenis TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      gudang_id TEXT NOT NULL,
      batch_customer TEXT NOT NULL,
      qty REAL NOT NULL,
      btb_id TEXT
    );
    CREATE TABLE IF NOT EXISTS stock_balance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      kode TEXT NOT NULL,
      nama TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      gudang_id TEXT NOT NULL,
      batch_customer TEXT NOT NULL,
      qty REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const count = database.prepare("SELECT COUNT(*) AS n FROM users").get() as {
    n: number;
  };
  if (count.n === 0) saveState(database, seedData());
  globalForDb.programCpDb = database;
  return database;
}

function replaceDocs(
  database: DatabaseSync,
  table: string,
  columns: string[],
  rows: (string | number | null)[][],
) {
  database.exec(`DELETE FROM ${table}`);
  if (rows.length === 0) return;
  const placeholders = columns.map(() => "?").join(", ");
  const stmt = database.prepare(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
  );
  for (const row of rows) stmt.run(...row);
}

export function saveState(database: DatabaseSync, state: PersistedData) {
  const previous = new Map(
    (
      database.prepare("SELECT id, password_hash FROM users").all() as UserRow[]
    ).map((row) => [row.id, row.password_hash]),
  );

  database.exec("BEGIN");
  try {
    replaceDocs(
      database,
      "users",
      ["id", "username", "nama", "role", "password_hash"],
      state.users.map((user) => [
        user.id,
        user.username,
        user.nama,
        user.role,
        resolvePasswordHash(user.id, user.password ?? "", previous),
      ]),
    );
    replaceDocs(
      database,
      "customers",
      ["id", "kode", "nama"],
      state.customers.map((row) => [row.id, row.kode, row.nama]),
    );
    replaceDocs(
      database,
      "gudang",
      ["id", "kode", "nama", "tipe"],
      state.gudangList.map((row) => [row.id, row.kode, row.nama, row.tipe]),
    );
    replaceDocs(
      database,
      "jenis_transaksi",
      ["id", "kode", "nama", "untuk"],
      state.jenisTransaksiList.map((row) => [
        row.id,
        row.kode,
        row.nama,
        row.untuk,
      ]),
    );
    replaceDocs(
      database,
      "materials",
      [
        "id",
        "kode",
        "nama",
        "customer_id",
        "kategori",
        "uom1",
        "konversi1",
        "uom2",
        "konversi2",
        "uom3",
        "konversi3",
        "batch_customer",
        "status",
      ],
      state.items.map((row) => [
        row.id,
        row.kode,
        row.nama,
        row.customerId,
        row.kategori,
        row.uom1,
        row.konversi1,
        row.uom2,
        row.konversi2,
        row.uom3,
        row.konversi3,
        row.batchCustomer,
        row.status,
      ]),
    );
    replaceDocs(
      database,
      "finish_goods",
      [
        "id",
        "kode",
        "nama",
        "customer_id",
        "kategori",
        "batch_customer",
        "uom1",
        "konversi1",
        "uom2",
        "konversi2",
        "uom3",
        "konversi3",
        "status",
      ],
      state.finishGoods.map((row) => [
        row.id,
        row.kode,
        row.nama,
        row.customerId,
        row.kategori,
        row.batchCustomer,
        row.uom1,
        row.konversi1,
        row.uom2,
        row.konversi2,
        row.uom3,
        row.konversi3,
        row.status,
      ]),
    );
    replaceDocs(
      database,
      "boms",
      ["id", "kode", "customer_id", "fg_id", "body"],
      state.boms.map((row) => [
        row.id,
        row.kode,
        row.customerId ?? null,
        row.fgId,
        JSON.stringify(row),
      ]),
    );
    replaceDocs(
      database,
      "btbs",
      ["id", "no", "tanggal", "jenis_transaksi_id", "customer_id", "body"],
      state.btbs.map((row) => [
        row.id,
        row.no,
        row.tanggalTerima,
        row.jenisTransaksiId,
        row.customerId ?? null,
        JSON.stringify(row),
      ]),
    );
    replaceDocs(
      database,
      "bkbs",
      ["id", "no", "tanggal", "jenis_transaksi_id", "no_spk", "body"],
      state.bkbs.map((row) => [
        row.id,
        row.no,
        row.tanggalKeluar,
        row.jenisTransaksiId,
        row.noSpk ?? null,
        JSON.stringify(row),
      ]),
    );
    replaceDocs(
      database,
      "transfers",
      ["id", "no", "tanggal", "body"],
      state.transfers.map((row) => [
        row.id,
        row.no,
        row.tanggal,
        JSON.stringify(row),
      ]),
    );
    replaceDocs(
      database,
      "stock_opnames",
      ["id", "no", "tanggal", "body"],
      state.stockOpnames.map((row) => [
        row.id,
        row.no,
        row.tanggal,
        JSON.stringify(row),
      ]),
    );
    replaceDocs(
      database,
      "adjustments",
      ["id", "no", "tanggal", "stock_opname_id", "status", "body"],
      state.adjustments.map((row) => [
        row.id,
        row.no,
        row.tanggal,
        row.stockOpnameId,
        row.status,
        JSON.stringify(row),
      ]),
    );
    replaceDocs(
      database,
      "activity_logs",
      ["id", "waktu", "user_id", "user_nama", "aksi", "detail", "no_transaksi"],
      state.activityLogs.map((row) => [
        row.id,
        row.waktu,
        row.userId,
        row.userNama,
        row.aksi,
        row.detail,
        row.noTransaksi ?? null,
      ]),
    );
    rebuildLedger(database, state);
    bumpRevision(database);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function rebuildLedger(database: DatabaseSync, state: PersistedData) {
  database.exec("DELETE FROM stock_ledger");
  const insert = database.prepare(`
    INSERT INTO stock_ledger (
      waktu, doc_type, doc_id, doc_no, arah, jenis, ref_id, gudang_id, batch_customer, qty, btb_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const btb of state.btbs) {
    const waktu = btb.createdAt || btb.tanggalTerima;
    for (const line of btb.items ?? []) {
      if (isTransferGeneratedBtbLine(line.keterangan) || line.qty <= 0) continue;
      insert.run(
        waktu,
        "btb",
        btb.id,
        btb.no,
        "in",
        "item",
        line.itemId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        btb.id,
      );
    }
    for (const line of btb.fgs ?? []) {
      if (isTransferGeneratedBtbLine(line.keterangan) || line.qty <= 0) continue;
      insert.run(
        waktu,
        "btb",
        btb.id,
        btb.no,
        "in",
        "fg",
        line.fgId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        btb.id,
      );
    }
  }

  for (const transfer of state.transfers) {
    const waktu = transfer.createdAt || transfer.tanggal;
    for (const line of transfer.lines ?? []) {
      if (line.qty <= 0 || line.dariGudangId === line.keGudangId) continue;
      insert.run(
        waktu,
        "transfer",
        transfer.id,
        transfer.no,
        "out",
        line.jenis,
        line.refId,
        line.dariGudangId,
        line.batchCustomer ?? "",
        line.qty,
        line.btbId ?? null,
      );
      insert.run(
        waktu,
        "transfer",
        transfer.id,
        transfer.no,
        "in",
        line.jenis,
        line.refId,
        line.keGudangId,
        line.batchCustomer ?? "",
        line.qty,
        line.btbId ?? null,
      );
    }
  }

  for (const bkb of state.bkbs) {
    const waktu = bkb.createdAt || bkb.tanggalKeluar;
    for (const line of bkb.items ?? []) {
      if (line.qty <= 0) continue;
      insert.run(
        waktu,
        "bkb",
        bkb.id,
        bkb.no,
        "out",
        "item",
        line.itemId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        line.btbId,
      );
    }
    for (const line of bkb.fgs ?? []) {
      if (line.qty <= 0) continue;
      insert.run(
        waktu,
        "bkb",
        bkb.id,
        bkb.no,
        "out",
        "fg",
        line.fgId,
        line.gudangId,
        line.batchCustomer,
        line.qty,
        line.btbId,
      );
    }
  }

  for (const adjustment of state.adjustments) {
    if (!isApprovedAdjustment(adjustment.status)) continue;
    const waktu = adjustment.createdAt || adjustment.tanggal;
    for (const line of adjustment.lines ?? []) {
      if (line.out > 0) {
        insert.run(
          waktu,
          "adjustment",
          adjustment.id,
          adjustment.no,
          "out",
          line.jenis,
          line.refId,
          line.gudangId ?? "",
          line.batchCustomer ?? "",
          line.out,
          line.btbId ?? null,
        );
      }
      if (line.in > 0) {
        insert.run(
          waktu,
          "adjustment",
          adjustment.id,
          adjustment.no,
          "in",
          line.jenis,
          line.refId,
          line.gudangId ?? "",
          line.batchCustomer ?? "",
          line.in,
          line.btbId ?? null,
        );
      }
    }
  }

  const balances = buildStockRows({
    customers: state.customers,
    gudangList: state.gudangList,
    items: state.items,
    finishGoods: state.finishGoods,
    btbs: state.btbs,
    bkbs: state.bkbs,
    transfers: state.transfers,
    adjustments: state.adjustments,
  });
  database.exec("DELETE FROM stock_balance");
  const insertBalance = database.prepare(`
    INSERT INTO stock_balance (
      jenis, ref_id, kode, nama, customer_id, gudang_id, batch_customer, qty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of balances) {
    insertBalance.run(
      row.jenis,
      row.refId,
      row.kode,
      row.nama,
      row.customerId,
      row.gudangId,
      row.batchCustomer,
      row.qty,
    );
  }
}

function readJsonRows<T>(database: DatabaseSync, sql: string): T[] {
  const rows = database.prepare(sql).all() as { body: string }[];
  return rows.map((row) => JSON.parse(row.body) as T);
}

export async function loadState(): Promise<PersistedData> {
  if (pakaiMysql()) {
    await ensureMysql();
    return loadStateMysql();
  }
  return loadStateSqlite();
}

function loadStateSqlite(database = openDatabase()): PersistedData {
  const users = (
    database
      .prepare(
        "SELECT id, username, nama, role FROM users ORDER BY username",
      )
      .all() as Omit<UserRow, "password_hash">[]
  ).map((row) => ({
    id: row.id,
    username: row.username,
    nama: row.nama,
    role: row.role,
    password: "",
  }));

  return {
    users,
    customers: database
      .prepare("SELECT id, kode, nama FROM customers ORDER BY kode")
      .all() as Customer[],
    items: (
      database.prepare("SELECT * FROM materials ORDER BY kode").all() as {
        id: string;
        kode: string;
        nama: string;
        customer_id: string;
        kategori: string;
        uom1: string;
        konversi1: number;
        uom2: string;
        konversi2: number;
        uom3: string;
        konversi3: number;
        batch_customer: string;
        status: MaterialItem["status"];
      }[]
    ).map((row) => ({
      id: row.id,
      kode: row.kode,
      nama: row.nama,
      customerId: row.customer_id,
      kategori: row.kategori,
      uom1: row.uom1,
      konversi1: row.konversi1,
      uom2: row.uom2,
      konversi2: row.konversi2,
      uom3: row.uom3,
      konversi3: row.konversi3,
      batchCustomer: row.batch_customer,
      status: String(row.status ?? "aktif").trim() as MaterialItem["status"],
    })),
    finishGoods: (
      database.prepare("SELECT * FROM finish_goods ORDER BY kode").all() as {
        id: string;
        kode: string;
        nama: string;
        customer_id: string;
        kategori: string;
        batch_customer: string;
        uom1: string;
        konversi1: number;
        uom2: string;
        konversi2: number;
        uom3: string;
        konversi3: number;
        status: FinishGood["status"];
      }[]
    ).map((row) => ({
      id: row.id,
      kode: row.kode,
      nama: row.nama,
      customerId: row.customer_id,
      kategori: row.kategori,
      batchCustomer: row.batch_customer,
      uom1: row.uom1,
      konversi1: row.konversi1,
      uom2: row.uom2,
      konversi2: row.konversi2,
      uom3: row.uom3,
      konversi3: row.konversi3,
      status: String(row.status ?? "aktif").trim() as FinishGood["status"],
    })),
    gudangList: database
      .prepare("SELECT id, kode, nama, tipe FROM gudang ORDER BY kode")
      .all() as Gudang[],
    jenisTransaksiList: database
      .prepare("SELECT id, kode, nama, untuk FROM jenis_transaksi ORDER BY kode")
      .all() as JenisTransaksi[],
    boms: readJsonRows<Bom>(database, "SELECT body FROM boms ORDER BY kode"),
    btbs: readJsonRows<Btb>(
      database,
      "SELECT body FROM btbs ORDER BY tanggal DESC, no DESC",
    ).map(withoutTransferBtbLines),
    bkbs: readJsonRows<Bkb>(database, "SELECT body FROM bkbs ORDER BY tanggal DESC, no DESC"),
    transfers: readJsonRows<TransferGudang>(
      database,
      "SELECT body FROM transfers ORDER BY tanggal DESC, no DESC",
    ),
    stockOpnames: readJsonRows<StockOpname>(
      database,
      "SELECT body FROM stock_opnames ORDER BY tanggal DESC, no DESC",
    ),
    adjustments: readJsonRows<Adjustment>(
      database,
      "SELECT body FROM adjustments ORDER BY tanggal DESC, no DESC",
    ),
    activityLogs: (
      database
        .prepare(
          "SELECT id, waktu, user_id, user_nama, aksi, detail, no_transaksi FROM activity_logs ORDER BY waktu DESC",
        )
        .all() as {
        id: string;
        waktu: string;
        user_id: string;
        user_nama: string;
        aksi: string;
        detail: string;
        no_transaksi: string | null;
      }[]
    ).map((row) => ({
      id: row.id,
      waktu: row.waktu,
      userId: row.user_id,
      userNama: row.user_nama,
      aksi: row.aksi,
      detail: row.detail,
      noTransaksi: row.no_transaksi ?? undefined,
    })),
  };
}

export function getDb() {
  return openDatabase();
}

export function publicUser(row: {
  id: string;
  username: string;
  nama: string;
  role: Role;
}) {
  return {
    id: row.id,
    username: row.username,
    nama: row.nama,
    role: row.role,
    password: "",
  } satisfies User;
}

export async function loginUser(username: string, password: string) {
  if (pakaiMysql()) {
    await ensureMysql();
    return loginUserMysql(username, password);
  }
  return loginUserSqlite(username, password);
}

function loginUserSqlite(username: string, password: string) {
  const database = openDatabase();
  const row = database
    .prepare(
      "SELECT id, username, nama, role, password_hash FROM users WHERE username = ?",
    )
    .get(username) as UserRow | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  const token = randomBytes(32).toString("hex");
  database
    .prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)")
    .run(token, row.id, new Date().toISOString());
  return { token, user: publicUser(row) };
}

export async function userFromToken(token: string | undefined | null) {
  if (pakaiMysql()) {
    await ensureMysql();
    return userFromTokenMysql(token);
  }
  return userFromTokenSqlite(token);
}

function userFromTokenSqlite(token: string | undefined | null) {
  if (!token) return null;
  const database = openDatabase();
  const row = database
    .prepare(
      `SELECT u.id, u.username, u.nama, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as
    | { id: string; username: string; nama: string; role: Role }
    | undefined;
  return row ? publicUser(row) : null;
}

export async function logoutToken(token: string | undefined | null) {
  if (!token) return;
  if (pakaiMysql()) {
    await ensureMysql();
    return logoutTokenMysql(token);
  }
  openDatabase().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export async function readStock() {
  if (pakaiMysql()) {
    await ensureMysql();
    return readStockMysql();
  }
  return readStockSqlite();
}

export type LatestBatchKey = {
  value: string;
  lastUsedAt: string;
};

/** Tiga batch penerimaan terakhir, diurutkan dari pemakaian paling baru. */
export async function readLatestBatchKeys(
  limit = 3,
): Promise<LatestBatchKey[]> {
  if (pakaiMysql()) {
    await ensureMysql();
    return readLatestBatchesMysql(limit);
  }
  return readLatestBatchKeysSqlite(limit);
}

function latestBatchSql(limit: number) {
  const safe = Math.min(50, Math.max(1, Math.trunc(limit) || 3));
  return `
    SELECT batch_customer AS value, MAX(waktu) AS lastUsedAt
    FROM stock_ledger
    WHERE doc_type = 'btb'
      AND arah = 'in'
      AND TRIM(batch_customer) <> ''
    GROUP BY batch_customer
    ORDER BY MAX(waktu) DESC, batch_customer ASC
    LIMIT ${safe}
  `;
}

function readLatestBatchKeysSqlite(limit: number): LatestBatchKey[] {
  const database = openDatabase();
  const rows = database.prepare(latestBatchSql(limit)).all() as {
    value: string;
    lastUsedAt: string;
  }[];
  return rows
    .map((row) => ({
      value: String(row.value ?? "").trim(),
      lastUsedAt: String(row.lastUsedAt ?? ""),
    }))
    .filter((row) => row.value !== "");
}

function readStockSqlite() {
  const database = openDatabase();
  const balances = database
    .prepare(
      `SELECT jenis, ref_id AS refId, kode, nama, customer_id AS customerId,
              gudang_id AS gudangId, batch_customer AS batchCustomer, qty
       FROM stock_balance
       ORDER BY jenis, kode, gudang_id`,
    )
    .all() as StockRow[];
  const ledger = database
    .prepare("SELECT COUNT(*) AS n FROM stock_ledger")
    .get() as { n: number };
  return { balances, ledgerCount: ledger.n };
}

const REVISION_KEY = "dataset_revision";

export async function readRevision(): Promise<number> {
  if (pakaiMysql()) {
    await ensureMysql();
    return readRevisionMysql();
  }
  return readRevisionSqlite();
}

function readRevisionSqlite(database = openDatabase()): number {
  const row = database
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get(REVISION_KEY) as { value: string } | undefined;
  const value = Number(row?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function bumpRevision(database: DatabaseSync) {
  const next = readRevisionSqlite(database) + 1;
  database
    .prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(REVISION_KEY, String(next));
}

export async function replacePersistedState(state: PersistedData) {
  if (pakaiMysql()) {
    await ensureMysql();
    return replacePersistedStateMysql(state);
  }
  const database = openDatabase();
  saveState(database, state);
  return readRevisionSqlite(database);
}
