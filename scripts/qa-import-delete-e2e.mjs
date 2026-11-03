/**
 * QA E2E untuk fitur baru:
 * 1) Bulk Import Master (Customer / Material / Finish Good) — parsing + validasi
 * 2) Hapus BTB / BKB — guard dependensi + revert stok
 * 3) Smoke UI (Playwright) — tombol Import, modal, tombol Hapus
 *
 *   npm install --no-save playwright tsx
 *   node scripts/qa-import-delete-e2e.mjs
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const stamp = Date.now();
const tag = `QA-IMPDEL-${stamp}`;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`PASS  ${name}`);
    return;
  }
  const line = `${name}${detail ? ` — ${detail}` : ""}`;
  failures.push(line);
  console.log(`FAIL  ${line}`);
}

function client() {
  let cookie = "";
  return {
    async req(path, options = {}) {
      const headers = { ...(options.headers ?? {}) };
      if (cookie) headers.cookie = cookie;
      if (options.body && !headers["content-type"]) {
        headers["content-type"] = "application/json";
      }
      const res = await fetch(`${base}${path}`, { ...options, headers });
      const setCookies = res.headers.getSetCookie?.() ?? [];
      for (const entry of setCookies) {
        const pair = entry.split(";")[0];
        if (pair.startsWith("cp_session=")) cookie = pair;
      }
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      return { status: res.status, json, text, cookie };
    },
  };
}

function qty(stock, refId, gudangId, batch) {
  return (stock.balances ?? [])
    .filter(
      (row) =>
        row.refId === refId &&
        row.gudangId === gudangId &&
        row.batchCustomer === batch,
    )
    .reduce((sum, row) => sum + Number(row.qty), 0);
}

async function login(username, password) {
  const api = client();
  const res = await api.req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return { api, res };
}

async function runImportUnitTests() {
  // Harus di dalam project root supaya `import("xlsx")` resolve ke node_modules.
  const testFile = join(process.cwd(), "scripts", `_qa-import-unit-${stamp}.mts`);
  const tmpXlsx = join(process.cwd(), "scripts", `_qa-import-unit-${stamp}.xlsx`);
  writeFileSync(
    testFile,
    `
import {
  buildCustomerImport,
  buildMaterialImport,
  buildFinishGoodImport,
  parseSpreadsheetRows,
  templateHeaders,
  templateSampleRows,
} from ${JSON.stringify(pathToFileURL(join(process.cwd(), "src/lib/master-import.ts")).href)};
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(${JSON.stringify(join(process.cwd(), "package.json"))});
const XLSX = require("xlsx");

const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log("PASS  " + name);
  else {
    const line = name + (detail ? " — " + detail : "");
    failures.push(line);
    console.log("FAIL  " + line);
  }
}

const customers = [{ id: "c1", kode: "CUST-001", nama: "Acme" }];
const existingCust = [{ id: "c0", kode: "CUST-OLD", nama: "Old" }];

const c = buildCustomerImport(
  ["Kode Customer", "Nama Customer"],
  [
    ["CUST-NEW", "Baru"],
    ["CUST-OLD", "Dup DB"],
    ["CUST-NEW", "Dup File"],
    ["", "No Kode"],
  ],
  existingCust,
);
check("import customer: 1 valid", c.okCount === 1, String(c.okCount));
check("import customer: 3 error", c.errorCount === 3, String(c.errorCount));
check("import customer: kode valid", c.valid[0]?.kode === "CUST-NEW");

const m = buildMaterialImport(
  ["Kode Material", "Nama Material", "Kode Customer", "UOM 1", "UOM 2", "Konversi UOM 2", "Status"],
  [
    ["MAT-OK", "Kertas", "CUST-001", "PCS", "BOX", "12", "aktif"],
    ["MAT-BAD-CUST", "X", "NOPE", "PCS", "", "", "aktif"],
    ["MAT-BAD-UOM", "Y", "CUST-001", "ZZZ", "", "", "aktif"],
    ["", "Z", "CUST-001", "PCS", "", "", "aktif"],
  ],
  [],
  customers,
);
check("import material: 1 valid", m.okCount === 1, String(m.okCount));
check("import material: errorCount 3", m.errorCount === 3, String(m.errorCount));
check("import material: konversi1 forced 1", m.valid[0]?.konversi1 === 1);
check("import material: customer mapped", m.valid[0]?.customerId === "c1");
check("import material: uom2 BOX", m.valid[0]?.uom2 === "BOX" && m.valid[0]?.konversi2 === 12);

const f = buildFinishGoodImport(
  ["Kode FG", "Nama FG", "Nama Customer", "UOM 1", "Status"],
  [["FG-OK", "Kotak", "Acme", "PCS", "nonaktif"]],
  [],
  customers,
);
check("import fg by nama customer", f.okCount === 1 && f.valid[0]?.customerId === "c1");
check("import fg status nonaktif", f.valid[0]?.status === "nonaktif");
check("import fg kategori", f.valid[0]?.kategori === "Finish Good");

// Template roundtrip via xlsx write+parse
const headers = templateHeaders("customer");
const sample = templateSampleRows("customer");
const sheet = XLSX.utils.json_to_sheet(
  sample.map((row: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, label] of Object.entries(headers)) out[label] = row[k] ?? "";
    return out;
  }),
);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "Data");
const buf = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
writeFileSync(${JSON.stringify(tmpXlsx)}, buf);
const file = new File([buf], "template-customer.xlsx", {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
const parsed = await parseSpreadsheetRows(file);
const rebuilt = buildCustomerImport(parsed.headers, parsed.rows, []);
check("template xlsx parseable", rebuilt.okCount === 1, String(rebuilt.okCount));
check("template headers mapped", rebuilt.valid[0]?.kode === "CUST-100");

if (failures.length) {
  console.error("UNIT_FAIL " + failures.length);
  process.exit(1);
}
console.log("UNIT_OK");
`,
  );

  return await new Promise((resolve) => {
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", "--tsconfig", "tsconfig.json", testFile],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
      process.stderr.write(d);
    });
    child.on("close", (code) => {
      try {
        unlinkSync(testFile);
      } catch {
        /* ignore */
      }
      try {
        unlinkSync(tmpXlsx);
      } catch {
        /* ignore */
      }
      resolve({ code: code ?? 1, out, err });
    });
  });
}

async function runDeleteBlockUnit() {
  const testFile = join(process.cwd(), "scripts", `_qa-delete-unit-${stamp}.mts`);
  writeFileSync(
    testFile,
    `
import {
  getBtbDeleteBlockReason,
  deleteDocConfirmDescription,
} from ${JSON.stringify(pathToFileURL(join(process.cwd(), "src/lib/delete-transaksi-doc.ts")).href)};

const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log("PASS  " + name);
  else {
    const line = name + (detail ? " — " + detail : "");
    failures.push(line);
    console.log("FAIL  " + line);
  }
}

const btb = { id: "btb1", no: "BTB-1", tanggalTerima: "2026-01-01", jenisTransaksiId: "j1", items: [], fgs: [], createdAt: "" };

const free = getBtbDeleteBlockReason(btb, {
  bkbs: [],
  transfers: [],
  adjustments: [],
  stockOpnames: [],
});
check("btb tanpa dependensi boleh dihapus", free === null, String(free));

const blockedBkb = getBtbDeleteBlockReason(btb, {
  bkbs: [{
    id: "bkb1", no: "BKB-9", tanggalKeluar: "2026-01-02", jenisTransaksiId: "j2", noSpk: "",
    items: [{ itemId: "i1", btbId: "btb1", btbNo: "BTB-1", btbTanggalTerima: "2026-01-01", batchCustomer: "", qty: 1, satuan: "PCS", gudangId: "g1", keterangan: "" }],
    fgs: [], createdAt: "",
  }],
  transfers: [],
  adjustments: [],
  stockOpnames: [],
});
check("btb diblokir jika ada BKB", Boolean(blockedBkb && blockedBkb.includes("BKB-9")), String(blockedBkb));

const blockedTf = getBtbDeleteBlockReason(btb, {
  bkbs: [],
  transfers: [{
    id: "tf1", no: "TG-1", tanggal: "2026-01-02", keterangan: "", createdAt: "",
    lines: [{ jenis: "item", refId: "i1", kode: "X", nama: "X", qty: 1, dariGudangId: "g1", keGudangId: "g2", keterangan: "", btbId: "btb1", btbNo: "BTB-1" }],
  }],
  adjustments: [],
  stockOpnames: [],
});
check("btb diblokir jika ada Transfer", Boolean(blockedTf && blockedTf.includes("TG-1")), String(blockedTf));

const desc = deleteDocConfirmDescription("BTB-99");
check("teks konfirmasi memuat no dokumen", desc.includes("BTB-99") && desc.includes("mengembalikan status stok"));

if (failures.length) {
  console.error("UNIT_FAIL " + failures.length);
  process.exit(1);
}
console.log("UNIT_OK");
`,
  );

  return await new Promise((resolve) => {
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsx", "--tsconfig", "tsconfig.json", testFile],
      {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      },
    );
    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => {
      try {
        unlinkSync(testFile);
      } catch {
        /* ignore */
      }
      resolve({ code: code ?? 1 });
    });
  });
}

async function cleanupQaDocs(api) {
  const loaded = await api.req("/api/state");
  if (loaded.status !== 200 || !loaded.json?.state) return;
  const state = loaded.json.state;
  const keep = (row) =>
    !String(row.id ?? "").includes(`qa-impdel-`) &&
    !String(row.no ?? "").includes(tag) &&
    !String(row.kode ?? "").includes(tag) &&
    !String(row.keterangan ?? "").includes(tag);

  state.customers = (state.customers ?? []).filter(keep);
  state.items = (state.items ?? []).filter(keep);
  state.finishGoods = (state.finishGoods ?? []).filter(keep);
  state.btbs = (state.btbs ?? []).filter(keep);
  state.bkbs = (state.bkbs ?? []).filter(keep);
  state.transfers = (state.transfers ?? []).filter(keep);
  state.adjustments = (state.adjustments ?? []).filter(keep);
  state.stockOpnames = (state.stockOpnames ?? []).filter(keep);

  const saved = await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({
      state,
      version: 6,
      revision: loaded.json.revision,
    }),
  });
  console.log(`cleanup ${saved.status}`);
}

async function runApiStockDelete() {
  console.log("\n=== API: hapus BTB/BKB + revert stok ===");
  const { api, res: loginRes } = await login("admin", "admin123");
  check("login admin", loginRes.status === 200, String(loginRes.status));
  if (loginRes.status !== 200) return api;

  await cleanupQaDocs(api);

  const loaded = await api.req("/api/state");
  check("load state", loaded.status === 200);
  const state = structuredClone(loaded.json.state);
  const rev = loaded.json.revision;
  const jenisBtb = state.jenisTransaksiList.find((row) => row.untuk !== "bkb");
  const jenisBkb = state.jenisTransaksiList.find((row) => row.untuk !== "btb");
  check("jenis transaksi ada", Boolean(jenisBtb && jenisBkb));

  const gudangId = state.gudangList.find((g) => g.tipe === "item")?.id ?? state.gudangList[0]?.id;
  check("gudang material ada", Boolean(gudangId), String(gudangId));

  const ids = {
    customer: `qa-impdel-c-${stamp}`,
    item: `qa-impdel-i-${stamp}`,
    btb: `qa-impdel-btb-${stamp}`,
    btb2: `qa-impdel-btb2-${stamp}`,
    bkb: `qa-impdel-bkb-${stamp}`,
  };
  const batch = `QA-IMPDEL-BATCH`;
  const beforeStock = await api.req("/api/stock");
  const startQty = qty(beforeStock.json, ids.item, gudangId, batch);

  state.customers.unshift({
    id: ids.customer,
    kode: `${tag}-C`,
    nama: "QA Import Delete Customer",
  });
  state.items.unshift({
    id: ids.item,
    kode: `${tag}-MAT`,
    nama: "QA Import Delete Material",
    customerId: ids.customer,
    kategori: "Bahan Baku",
    uom1: "PCS",
    konversi1: 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
    batchCustomer: batch,
    status: "aktif",
  });
  state.btbs.unshift({
    id: ids.btb,
    no: `${tag}-BTB`,
    tanggalTerima: "2026-10-20",
    jenisTransaksiId: jenisBtb.id,
    customerId: ids.customer,
    keterangan: tag,
    items: [
      {
        itemId: ids.item,
        batchCustomer: batch,
        qty: 100,
        satuan: "PCS",
        gudangId,
        keterangan: "QA masuk",
        qtySisa: 100,
      },
    ],
    fgs: [],
    createdAt: "2026-10-20T01:00:00.000Z",
  });
  state.bkbs.unshift({
    id: ids.bkb,
    no: `${tag}-BKB`,
    tanggalKeluar: "2026-10-20",
    jenisTransaksiId: jenisBkb.id,
    noSpk: tag,
    keterangan: tag,
    items: [
      {
        itemId: ids.item,
        btbId: ids.btb,
        btbNo: `${tag}-BTB`,
        btbTanggalTerima: "2026-10-20",
        batchCustomer: batch,
        qty: 40,
        satuan: "PCS",
        gudangId,
        keterangan: "QA keluar",
      },
    ],
    fgs: [],
    createdAt: "2026-10-20T02:00:00.000Z",
  });

  const saved = await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state, version: 6, revision: rev }),
  });
  check("seed BTB+BKB tersimpan", saved.status === 200, String(saved.status));

  const stock1 = await api.req("/api/stock");
  const afterSeed = qty(stock1.json, ids.item, gudangId, batch);
  check(
    "stok setelah BTB100-BKB40 = +60",
    afterSeed === startQty + 60,
    `dapat ${afterSeed}, harap ${startQty + 60}`,
  );

  // Simulasikan deleteBkb: hapus BKB + sync qtySisa (sama seperti store.deleteBkb)
  const mid = await api.req("/api/state");
  const midState = structuredClone(mid.json.state);
  midState.bkbs = midState.bkbs.filter((row) => row.id !== ids.bkb);
  midState.btbs = midState.btbs.map((btb) => {
    if (btb.id !== ids.btb) return btb;
    return {
      ...btb,
      items: (btb.items ?? []).map((line) => ({
        ...line,
        qtySisa: line.qty, // setelah BKB dihapus, sisa kembali ke qty masuk
      })),
    };
  });
  const afterDelBkb = await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({
      state: midState,
      version: 6,
      revision: mid.json.revision,
    }),
  });
  check("hapus BKB tersimpan", afterDelBkb.status === 200, String(afterDelBkb.status));

  const stock2 = await api.req("/api/stock");
  const afterBkbGone = qty(stock2.json, ids.item, gudangId, batch);
  check(
    "stok setelah hapus BKB kembali +100",
    afterBkbGone === startQty + 100,
    `dapat ${afterBkbGone}, harap ${startQty + 100}`,
  );

  const afterState = await api.req("/api/state");
  const btbQtySisa = afterState.json.state.btbs.find((b) => b.id === ids.btb)?.items?.[0]
    ?.qtySisa;
  check("qtySisa BTB kembali 100", btbQtySisa === 100, String(btbQtySisa));

  // Hapus BTB tanpa dependensi → stok hilang
  const beforeBtbDel = await api.req("/api/state");
  const btbDelState = structuredClone(beforeBtbDel.json.state);
  btbDelState.btbs = btbDelState.btbs.filter((row) => row.id !== ids.btb);
  const afterDelBtb = await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({
      state: btbDelState,
      version: 6,
      revision: beforeBtbDel.json.revision,
    }),
  });
  check("hapus BTB tersimpan", afterDelBtb.status === 200, String(afterDelBtb.status));

  const stock3 = await api.req("/api/stock");
  const afterBtbGone = qty(stock3.json, ids.item, gudangId, batch);
  check(
    "stok setelah hapus BTB kembali ke awal",
    afterBtbGone === startQty,
    `dapat ${afterBtbGone}, harap ${startQty}`,
  );

  // Seed BTB kedua + BKB untuk uji bahwa BTB bertahan di state bila masih ada BKB
  // (guard client-side; di API kita pastikan data inkonsisten tidak terjadi di happy path)
  const s4 = await api.req("/api/state");
  const st4 = structuredClone(s4.json.state);
  st4.btbs.unshift({
    id: ids.btb2,
    no: `${tag}-BTB2`,
    tanggalTerima: "2026-10-21",
    jenisTransaksiId: jenisBtb.id,
    customerId: ids.customer,
    keterangan: tag,
    items: [
      {
        itemId: ids.item,
        batchCustomer: batch,
        qty: 50,
        satuan: "PCS",
        gudangId,
        keterangan: "QA masuk 2",
        qtySisa: 50,
      },
    ],
    fgs: [],
    createdAt: "2026-10-21T01:00:00.000Z",
  });
  st4.bkbs.unshift({
    id: `${ids.bkb}-2`,
    no: `${tag}-BKB2`,
    tanggalKeluar: "2026-10-21",
    jenisTransaksiId: jenisBkb.id,
    noSpk: tag,
    keterangan: tag,
    items: [
      {
        itemId: ids.item,
        btbId: ids.btb2,
        btbNo: `${tag}-BTB2`,
        btbTanggalTerima: "2026-10-21",
        batchCustomer: batch,
        qty: 10,
        satuan: "PCS",
        gudangId,
        keterangan: "QA keluar 2",
      },
    ],
    fgs: [],
    createdAt: "2026-10-21T02:00:00.000Z",
  });
  await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state: st4, version: 6, revision: s4.json.revision }),
  });
  const stock4 = await api.req("/api/stock");
  check(
    "stok BTB2-BKB2 = +40",
    qty(stock4.json, ids.item, gudangId, batch) === startQty + 40,
    String(qty(stock4.json, ids.item, gudangId, batch)),
  );

  return { api, ids, gudangId, batch, startQty, tag };
}

async function runUiSmoke({ ids }) {
  console.log("\n=== UI smoke (Playwright) ===");
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    check("playwright terpasang", false, "jalankan npm install --no-save playwright");
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#username").waitFor({ timeout: 10000 });
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin123");
    await page.getByRole("button", { name: /masuk/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Customer import modal + upload E2E
    await page.goto(`${base}/master/customer`, { waitUntil: "networkidle" });
    const importBtn = page.getByRole("button", { name: /^Import$/i });
    check("tombol Import di Customer", await importBtn.count() > 0);
    if (await importBtn.count()) {
      await importBtn.first().click();
      await page.getByRole("heading", { name: /Import Data Customer/i }).waitFor({ timeout: 8000 });
      const hint = page.getByText(/Pilih file \.csv \/ \.xlsx atau drop file ke area ini/i);
      check("copy dropzone Customer", await hint.count() > 0);
      check(
        "tombol Download Template",
        (await page.getByRole("button", { name: /Download Template Excel/i }).count()) > 0,
      );

      const importKode = `${tag}-UI-C`;
      const importNama = `QA UI Import ${stamp}`;
      const XLSX = require("xlsx");
      const sheet = XLSX.utils.aoa_to_sheet([
        ["Kode Customer", "Nama Customer"],
        [importKode, importNama],
        ["", "baris invalid tanpa kode"],
      ]);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Data");
      const xlsxPath = join(process.cwd(), "scripts", `_qa-ui-import-${stamp}.xlsx`);
      XLSX.writeFile(book, xlsxPath);
      try {
        await page.locator('input[type="file"]').setInputFiles(xlsxPath);
        await page.getByText(/Preview:/i).waitFor({ timeout: 8000 });
        check(
          "preview menampilkan baris OK + gagal",
          (await page.getByText(/1 siap import/i).count()) > 0 &&
            (await page.getByText(/1 gagal/i).count()) > 0,
        );
        await page.getByRole("button", { name: /Proses Import/i }).click();
        await page.getByText(/berhasil diimpor/i).waitFor({ timeout: 8000 });
        check("toast sukses import customer", true);
        await page.getByRole("link", { name: importNama }).waitFor({ timeout: 8000 });
        check("customer hasil import muncul di tabel", true);
      } finally {
        try {
          unlinkSync(xlsxPath);
        } catch {
          /* ignore */
        }
      }
    }

    await page.goto(`${base}/master/item`, { waitUntil: "networkidle" });
    check(
      "tombol Import di Material",
      (await page.getByRole("button", { name: /^Import$/i }).count()) > 0,
    );
    if ((await page.getByRole("button", { name: /^Import$/i }).count()) > 0) {
      await page.getByRole("button", { name: /^Import$/i }).first().click();
      await page.getByRole("heading", { name: /Import Data Material/i }).waitFor({ timeout: 8000 });
      check(
        "copy dropzone Material",
        (await page.getByText(/Pilih file \.csv \/ \.xlsx atau drop file ke area ini/i).count()) > 0,
      );
      await page.getByRole("button", { name: /^Batal$/i }).click();
    }

    await page.goto(`${base}/master/finish-good`, { waitUntil: "networkidle" });
    check(
      "tombol Import di Finish Good",
      (await page.getByRole("button", { name: /^Import$/i }).count()) > 0,
    );

    // BTB list delete affordance
    await page.goto(`${base}/transaksi/btb`, { waitUntil: "networkidle" });
    const trashBtb = page.getByRole("button", { name: /Hapus /i });
    check("ikon hapus ada di daftar BTB", (await trashBtb.count()) > 0, String(await trashBtb.count()));

    // Detail BTB2: hapus harus ditolak karena ada BKB
    if (ids?.btb2) {
      await page.goto(`${base}/transaksi/btb/${ids.btb2}`, { waitUntil: "networkidle" });
      const hapusDoc = page.getByRole("button", { name: /Hapus Dokumen/i });
      check("tombol Hapus Dokumen di detail BTB", (await hapusDoc.count()) > 0);
      if (await hapusDoc.count()) {
        await hapusDoc.click();
        // Either confirm dialog appears then we cancel, OR toast error if blocked before dialog
        await page.waitForTimeout(800);
        const toastBlocked = page.getByText(/masih dipakai di BKB/i);
        const confirmYa = page.getByRole("button", { name: /Ya, Hapus/i });
        if (await toastBlocked.count()) {
          check("hapus BTB terblokir oleh BKB (toast)", true);
        } else if (await confirmYa.count()) {
          // Should not reach confirm if blocked — fail
          check("hapus BTB terblokir sebelum konfirmasi", false, "dialog konfirmasi muncul padahal ada BKB");
          await page.getByRole("button", { name: /^Batal$/i }).click();
        } else {
          check("hapus BTB terblokir oleh BKB (toast)", false, "tidak ada toast/dialog");
        }
      }

      // Hapus BKB dulu via UI
      await page.goto(`${base}/transaksi/bkb`, { waitUntil: "networkidle" });
      const bkbLink = page.getByRole("link", { name: new RegExp(`${tag}-BKB2`) });
      if (await bkbLink.count()) {
        await bkbLink.first().click();
        await page.waitForURL(/\/transaksi\/bkb\//);
        const hapusBkb = page.getByRole("button", { name: /Hapus Dokumen/i });
        check("tombol Hapus Dokumen di detail BKB", (await hapusBkb.count()) > 0);
        if (await hapusBkb.count()) {
          await hapusBkb.click();
          await page.getByRole("button", { name: /Ya, Hapus/i }).waitFor({ timeout: 5000 });
          const desc = page.getByText(/mengembalikan status stok barang terkait/i);
          check("teks konfirmasi hapus BKB", (await desc.count()) > 0);
          await page.getByRole("button", { name: /Ya, Hapus/i }).click();
          await page.waitForURL(/\/transaksi\/bkb\/?$/, { timeout: 10000 });
          check("redirect ke daftar setelah hapus BKB", true);
        }
      } else {
        check("link BKB2 di daftar", false, "dokumen seed tidak terlihat (mungkin belum rehydrate)");
      }

      // Setelah BKB dihapus, BTB bisa dihapus
      await page.goto(`${base}/transaksi/btb/${ids.btb2}`, { waitUntil: "networkidle" });
      const hapusBtb = page.getByRole("button", { name: /Hapus Dokumen/i });
      if (await hapusBtb.count()) {
        await hapusBtb.click();
        await page.getByRole("button", { name: /Ya, Hapus/i }).waitFor({ timeout: 5000 });
        await page.getByRole("button", { name: /Ya, Hapus/i }).click();
        await page.waitForURL(/\/transaksi\/btb\/?$/, { timeout: 10000 });
        check("hapus BTB sukses setelah BKB hilang", true);
      } else {
        check("hapus BTB sukses setelah BKB hilang", false, "tombol tidak ada / halaman not found");
      }
    }
  } catch (err) {
    check("UI smoke tanpa exception", false, String(err?.message ?? err));
    try {
      await page.screenshot({ path: "scripts/qa-import-delete-fail.png", fullPage: true });
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`QA base=${base} tag=${tag}`);

  // Ensure tsx available for unit tests
  try {
    require.resolve("tsx");
  } catch {
    console.log("Installing tsx (no-save)...");
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["install", "--no-save", "tsx"],
        { cwd: process.cwd(), stdio: "inherit", shell: true },
      );
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("npm tsx failed"))));
    });
  }

  console.log("\n=== Unit: master import ===");
  const unitImport = await runImportUnitTests();
  check("unit import exit 0", unitImport.code === 0, String(unitImport.code));

  console.log("\n=== Unit: delete blockers ===");
  const unitDel = await runDeleteBlockUnit();
  check("unit delete blockers exit 0", unitDel.code === 0, String(unitDel.code));

  // Health check
  try {
    const ping = await fetch(`${base}/api/auth/me`);
    check("server merespons", ping.status === 401 || ping.status === 200, String(ping.status));
  } catch (err) {
    check("server merespons", false, String(err.message));
    throw err;
  }

  const ctx = await runApiStockDelete();

  // Playwright optional but preferred
  try {
    require.resolve("playwright");
  } catch {
    console.log("Installing playwright (no-save)...");
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["install", "--no-save", "playwright"],
        { cwd: process.cwd(), stdio: "inherit", shell: true },
      );
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("npm playwright failed"))));
    });
  }

  await runUiSmoke(ctx ?? {});

  if (ctx?.api) await cleanupQaDocs(ctx.api);

  console.log("\n=== RINGKASAN ===");
  if (failures.length) {
    console.log(`FAILED ${failures.length}`);
    for (const f of failures) console.log(` - ${f}`);
    process.exit(1);
  }
  console.log("ALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
