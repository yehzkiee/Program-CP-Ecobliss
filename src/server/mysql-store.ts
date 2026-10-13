import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import {
  customers as seedCustomers,
  finishGoods as seedFinishGoods,
  gudangList as seedGudang,
  items as seedItems,
  jenisTransaksiList as seedJenis,
  adjustments as seedAdjustments,
  activityLogs as seedLogs,
  bkbs as seedBkbs,
  boms as seedBoms,
  btbs as seedBtbs,
  stockOpnames as seedOpnames,
  transfers as seedTransfers,
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
  StockRow,
  TransferGudang,
  User,
} from "@/lib/types";
import type { PersistedData } from "@/server/db";
import { buildBalanceRows, buildLedgerRows } from "@/server/ledger";
import { resolvePasswordHash, verifyPassword } from "@/server/password";

/**
 * Penyimpanan MySQL untuk hosting cPanel. Dipakai kalau PROGRAM_CP_DB=mysql;
 * kalau tidak diisi, aplikasi tetap memakai SQLite (dev lokal).
 *
 * Bentuk tabel dan urutan kolomnya sengaja sama dengan versi SQLite supaya
 * hitungan stok dan isi state tidak pernah berbeda antar backend.
 */
export function pakaiMysql() {
  return (process.env.PROGRAM_CP_DB ?? "").trim().toLowerCase() === "mysql";
}

const REVISION_KEY = "dataset_revision";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
    charset: "utf8mb4_unicode_ci",
    timezone: "Z",
  });
  return pool;
}

const TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    username VARCHAR(191) NOT NULL UNIQUE,
    nama VARCHAR(191) NOT NULL,
    role VARCHAR(32) NOT NULL,
    password_hash VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(128) NOT NULL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    created_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kode VARCHAR(191) NOT NULL,
    nama VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS gudang (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kode VARCHAR(191) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    tipe VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS jenis_transaksi (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kode VARCHAR(191) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    untuk VARCHAR(16) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kode VARCHAR(191) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    kategori VARCHAR(64) NOT NULL,
    uom1 VARCHAR(32) NOT NULL,
    konversi1 DOUBLE NOT NULL,
    uom2 VARCHAR(32) NOT NULL,
    konversi2 DOUBLE NOT NULL,
    uom3 VARCHAR(32) NOT NULL,
    konversi3 DOUBLE NOT NULL,
    batch_customer VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS finish_goods (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kode VARCHAR(191) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    kategori VARCHAR(64) NOT NULL,
    batch_customer VARCHAR(64) NOT NULL,
    uom1 VARCHAR(32) NOT NULL,
    konversi1 DOUBLE NOT NULL,
    uom2 VARCHAR(32) NOT NULL,
    konversi2 DOUBLE NOT NULL,
    uom3 VARCHAR(32) NOT NULL,
    konversi3 DOUBLE NOT NULL,
    status VARCHAR(16) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS boms (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    kode VARCHAR(191) NOT NULL,
    customer_id VARCHAR(64) NULL,
    fg_id VARCHAR(64) NOT NULL,
    body LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS btbs (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    no VARCHAR(64) NOT NULL,
    tanggal VARCHAR(40) NOT NULL,
    jenis_transaksi_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NULL,
    body LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS bkbs (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    no VARCHAR(64) NOT NULL,
    tanggal VARCHAR(40) NOT NULL,
    jenis_transaksi_id VARCHAR(64) NOT NULL,
    no_spk VARCHAR(64) NULL,
    body LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS transfers (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    no VARCHAR(64) NOT NULL,
    tanggal VARCHAR(40) NOT NULL,
    body LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS stock_opnames (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    no VARCHAR(64) NOT NULL,
    tanggal VARCHAR(40) NOT NULL,
    body LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS adjustments (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    no VARCHAR(64) NOT NULL,
    tanggal VARCHAR(40) NOT NULL,
    stock_opname_id VARCHAR(64) NULL,
    status VARCHAR(24) NOT NULL,
    body LONGTEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) NOT NULL PRIMARY KEY,
    waktu VARCHAR(40) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_nama VARCHAR(191) NOT NULL,
    aksi VARCHAR(64) NOT NULL,
    detail TEXT NOT NULL,
    no_transaksi VARCHAR(64) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS stock_ledger (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    waktu VARCHAR(40) NOT NULL,
    doc_type VARCHAR(24) NOT NULL,
    doc_id VARCHAR(64) NOT NULL,
    doc_no VARCHAR(64) NOT NULL,
    arah VARCHAR(8) NOT NULL,
    jenis VARCHAR(8) NOT NULL,
    ref_id VARCHAR(64) NOT NULL,
    gudang_id VARCHAR(64) NOT NULL,
    batch_customer VARCHAR(64) NOT NULL,
    qty DOUBLE NOT NULL,
    btb_id VARCHAR(64) NULL,
    KEY stock_ledger_doc (doc_type, doc_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS stock_balance (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    jenis VARCHAR(8) NOT NULL,
    ref_id VARCHAR(64) NOT NULL,
    kode VARCHAR(191) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    gudang_id VARCHAR(64) NOT NULL,
    batch_customer VARCHAR(64) NOT NULL,
    qty DOUBLE NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  CREATE TABLE IF NOT EXISTS app_meta (
    \`key\` VARCHAR(64) NOT NULL PRIMARY KEY,
    value VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

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

let ensured = false;

export async function ensureMysql() {
  if (ensured) return;
  const db = getPool();
  for (const statement of TABLE_DDL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.query(statement);
  }
  const [rows] = await db.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM users");
  if (Number(rows[0]?.n ?? 0) === 0) {
    const legacy = await legacyState();
    await saveStateMysql(legacy ?? seedData());
  }
  ensured = true;
}

/**
 * Database program-cp pernah dipakai versi lama yang menyimpan seluruh data
 * sebagai satu blob JSON (tabel app_state) dengan hash password terpisah di
 * user_secrets. Sekali saja, isinya dipindahkan ke tabel yang sekarang supaya
 * data yang sudah ada tidak hilang.
 */
async function legacyState(): Promise<PersistedData | null> {
  const db = getPool();
  try {
    const [tables] = await db.query<RowDataPacket[]>(
      "SHOW TABLES LIKE 'app_state'",
    );
    if (tables.length === 0) return null;
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT body FROM app_state WHERE id = 'main' LIMIT 1",
    );
    if (rows.length === 0) return null;
    const state = JSON.parse(String(rows[0].body)) as PersistedData;

    const hashes = new Map<string, string>();
    try {
      const [hashRows] = await db.query<RowDataPacket[]>(
        "SELECT id, password_hash FROM user_secrets",
      );
      for (const row of hashRows) {
        hashes.set(String(row.id), String(row.password_hash));
      }
    } catch {
      // user_secrets tidak ada: hash dibuat ulang saat simpan
    }
    state.users = (state.users ?? []).map((user) => ({
      ...user,
      password: hashes.get(user.id) ?? "",
    }));
    return state;
  } catch {
    return null;
  }
}

const CHUNK = 200;

async function replaceRows(
  conn: PoolConnection,
  table: string,
  columns: string[],
  rows: (string | number | null)[][],
) {
  await conn.query(`DELETE FROM ${table}`);
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK);
    const placeholders = part
      .map(() => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");
    await conn.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      part.flat(),
    );
  }
}

async function saveStateMysql(state: PersistedData): Promise<number> {
  const db = getPool();
  const conn = await db.getConnection();
  try {
    const [userRows] = await conn.query<RowDataPacket[]>(
      "SELECT id, password_hash FROM users",
    );
    const previous = new Map<string, string>(
      userRows.map((row) => [String(row.id), String(row.password_hash)]),
    );

    await conn.beginTransaction();
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
      "customers",
      ["id", "kode", "nama"],
      state.customers.map((row) => [row.id, row.kode, row.nama]),
    );
    await replaceRows(
      conn,
      "gudang",
      ["id", "kode", "nama", "tipe"],
      state.gudangList.map((row) => [row.id, row.kode, row.nama, row.tipe]),
    );
    await replaceRows(
      conn,
      "jenis_transaksi",
      ["id", "kode", "nama", "untuk"],
      state.jenisTransaksiList.map((row) => [
        row.id,
        row.kode,
        row.nama,
        row.untuk,
      ]),
    );
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
      "transfers",
      ["id", "no", "tanggal", "body"],
      state.transfers.map((row) => [
        row.id,
        row.no,
        row.tanggal,
        JSON.stringify(row),
      ]),
    );
    await replaceRows(
      conn,
      "stock_opnames",
      ["id", "no", "tanggal", "body"],
      state.stockOpnames.map((row) => [
        row.id,
        row.no,
        row.tanggal,
        JSON.stringify(row),
      ]),
    );
    await replaceRows(
      conn,
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
    await replaceRows(
      conn,
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

    const ledger = buildLedgerRows(state);
    await replaceRows(
      conn,
      "stock_ledger",
      [
        "waktu",
        "doc_type",
        "doc_id",
        "doc_no",
        "arah",
        "jenis",
        "ref_id",
        "gudang_id",
        "batch_customer",
        "qty",
        "btb_id",
      ],
      ledger as unknown as (string | number | null)[][],
    );
    await replaceRows(
      conn,
      "stock_balance",
      [
        "jenis",
        "ref_id",
        "kode",
        "nama",
        "customer_id",
        "gudang_id",
        "batch_customer",
        "qty",
      ],
      buildBalanceRows(state).map((row) => [
        row.jenis,
        row.refId,
        row.kode,
        row.nama,
        row.customerId,
        row.gudangId,
        row.batchCustomer,
        row.qty,
      ]),
    );

    const next = (await readRevisionMysql()) + 1;
    await conn.query(
      "INSERT INTO app_meta (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [REVISION_KEY, String(next)],
    );

    await conn.commit();
    return next;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function replacePersistedStateMysql(state: PersistedData) {
  await ensureMysql();
  return saveStateMysql(state);
}

export async function readRevisionMysql() {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT value FROM app_meta WHERE `key` = ?",
    [REVISION_KEY],
  );
  const value = Number(rows[0]?.value ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function jsonRows<T>(rows: RowDataPacket[]): T[] {
  return rows.map((row) => JSON.parse(String(row.body)) as T);
}

export async function loadStateMysql(): Promise<PersistedData> {
  await ensureMysql();
  const db = getPool();

  const [userRows] = await db.query<RowDataPacket[]>(
    "SELECT id, username, nama, role FROM users ORDER BY username",
  );
  const [customers] = await db.query<RowDataPacket[]>(
    "SELECT id, kode, nama FROM customers ORDER BY kode",
  );
  const [items] = await db.query<RowDataPacket[]>(
    "SELECT * FROM materials ORDER BY kode",
  );
  const [fgs] = await db.query<RowDataPacket[]>(
    "SELECT * FROM finish_goods ORDER BY kode",
  );
  const [gudangList] = await db.query<RowDataPacket[]>(
    "SELECT id, kode, nama, tipe FROM gudang ORDER BY kode",
  );
  const [jenisList] = await db.query<RowDataPacket[]>(
    "SELECT id, kode, nama, untuk FROM jenis_transaksi ORDER BY kode",
  );
  const [bomRows] = await db.query<RowDataPacket[]>(
    "SELECT body FROM boms ORDER BY kode",
  );
  const [btbRows] = await db.query<RowDataPacket[]>(
    "SELECT body FROM btbs ORDER BY tanggal DESC, no DESC",
  );
  const [bkbRows] = await db.query<RowDataPacket[]>(
    "SELECT body FROM bkbs ORDER BY tanggal DESC, no DESC",
  );
  const [transferRows] = await db.query<RowDataPacket[]>(
    "SELECT body FROM transfers ORDER BY tanggal DESC, no DESC",
  );
  const [opnameRows] = await db.query<RowDataPacket[]>(
    "SELECT body FROM stock_opnames ORDER BY tanggal DESC, no DESC",
  );
  const [adjustmentRows] = await db.query<RowDataPacket[]>(
    "SELECT body FROM adjustments ORDER BY tanggal DESC, no DESC",
  );
  const [logRows] = await db.query<RowDataPacket[]>(
    "SELECT id, waktu, user_id, user_nama, aksi, detail, no_transaksi FROM activity_logs ORDER BY waktu DESC",
  );

  return {
    users: userRows.map((row) => ({
      id: String(row.id),
      username: String(row.username),
      nama: String(row.nama),
      role: String(row.role) as Role,
      password: "",
    })) satisfies User[],
    customers: customers.map((row) => ({
      id: String(row.id),
      kode: String(row.kode),
      nama: String(row.nama),
    })) satisfies Customer[],
    items: items.map((row) => ({
      id: String(row.id),
      kode: String(row.kode),
      nama: String(row.nama),
      customerId: String(row.customer_id),
      kategori: String(row.kategori),
      uom1: String(row.uom1),
      konversi1: Number(row.konversi1),
      uom2: String(row.uom2),
      konversi2: Number(row.konversi2),
      uom3: String(row.uom3),
      konversi3: Number(row.konversi3),
      batchCustomer: String(row.batch_customer),
      status: String(row.status) as MaterialItem["status"],
    })) satisfies MaterialItem[],
    finishGoods: fgs.map((row) => ({
      id: String(row.id),
      kode: String(row.kode),
      nama: String(row.nama),
      customerId: String(row.customer_id),
      kategori: String(row.kategori),
      batchCustomer: String(row.batch_customer),
      uom1: String(row.uom1),
      konversi1: Number(row.konversi1),
      uom2: String(row.uom2),
      konversi2: Number(row.konversi2),
      uom3: String(row.uom3),
      konversi3: Number(row.konversi3),
      status: String(row.status) as FinishGood["status"],
    })) satisfies FinishGood[],
    gudangList: gudangList.map((row) => ({
      id: String(row.id),
      kode: String(row.kode),
      nama: String(row.nama),
      tipe: String(row.tipe) as Gudang["tipe"],
    })) satisfies Gudang[],
    jenisTransaksiList: jenisList.map((row) => ({
      id: String(row.id),
      kode: String(row.kode),
      nama: String(row.nama),
      untuk: String(row.untuk) as JenisTransaksi["untuk"],
    })) satisfies JenisTransaksi[],
    boms: jsonRows<Bom>(bomRows),
    btbs: jsonRows<Btb>(btbRows),
    bkbs: jsonRows<Bkb>(bkbRows),
    transfers: jsonRows<TransferGudang>(transferRows),
    stockOpnames: jsonRows<StockOpname>(opnameRows),
    adjustments: jsonRows<Adjustment>(adjustmentRows),
    activityLogs: logRows.map((row) => ({
      id: String(row.id),
      waktu: String(row.waktu),
      userId: String(row.user_id),
      userNama: String(row.user_nama),
      aksi: String(row.aksi),
      detail: String(row.detail),
      noTransaksi: row.no_transaksi ? String(row.no_transaksi) : undefined,
    })) satisfies ActivityLog[],
  };
}

function publicUser(row: RowDataPacket): User {
  return {
    id: String(row.id),
    username: String(row.username),
    nama: String(row.nama),
    role: String(row.role) as Role,
    password: "",
  };
}

export async function loginUserMysql(username: string, password: string) {
  await ensureMysql();
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT id, username, nama, role, password_hash FROM users WHERE username = ? LIMIT 1",
    [username],
  );
  const row = rows[0];
  if (!row || !verifyPassword(password, String(row.password_hash))) return null;
  const token = randomBytes(32).toString("hex");
  await db.query(
    "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
    [token, String(row.id), new Date().toISOString()],
  );
  return { token, user: publicUser(row) };
}

export async function userFromTokenMysql(token: string | undefined | null) {
  if (!token) return null;
  await ensureMysql();
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.username, u.nama, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?
     LIMIT 1`,
    [token],
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

export async function logoutTokenMysql(token: string | undefined | null) {
  if (!token) return;
  await ensureMysql();
  await getPool().query("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function readStockMysql() {
  await ensureMysql();
  const db = getPool();
  const [balances] = await db.query<RowDataPacket[]>(
    `SELECT jenis, ref_id AS refId, kode, nama, customer_id AS customerId,
            gudang_id AS gudangId, batch_customer AS batchCustomer, qty
     FROM stock_balance
     ORDER BY jenis, kode, gudang_id`,
  );
  const [counts] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM stock_ledger",
  );
  return {
    balances: balances.map((row) => ({
      jenis: String(row.jenis),
      refId: String(row.refId),
      kode: String(row.kode),
      nama: String(row.nama),
      customerId: String(row.customerId),
      gudangId: String(row.gudangId),
      batchCustomer: String(row.batchCustomer),
      qty: Number(row.qty),
    })) as StockRow[],
    ledgerCount: Number(counts[0]?.n ?? 0),
  };
}
