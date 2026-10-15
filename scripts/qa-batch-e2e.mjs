/**
 * QA E2E dropdown Batch pada Buat BTB dan Buat BKB.
 * Menjalankan browser sungguhan terhadap server lokal, lalu menghapus dokumen QA.
 *
 *   npm install --no-save playwright
 *   node scripts/qa-batch-e2e.mjs
 */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "Playwright belum terpasang. Jalankan: npm install --no-save playwright",
  );
  process.exit(1);
}

const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const stamp = Date.now();
const batchName = `QA E2E ${stamp}`;
const note = `QA-E2E-${stamp}`;
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

function optionTexts(locator) {
  return locator.allTextContents().then((rows) => rows.map((row) => row.trim()).filter(Boolean));
}

function isShortBatchLabel(text) {
  return /^.+ - .+ - \(Stok: [^)]+\)$/.test(text);
}

async function cleanup() {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const cookie = (login.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .find((entry) => entry.startsWith("cp_session="));
  if (!cookie || login.status !== 200) return;
  const loaded = await fetch(`${base}/api/state`, { headers: { cookie } });
  const body = await loaded.json();
  const state = body?.state;
  if (!state) return;
  const marked = (row) =>
    String(row.keterangan ?? "").includes("QA-E2E-") ||
    String(row.batch ?? "") === batchName ||
    [...(row.items ?? []), ...(row.fgs ?? [])].some(
      (line) => line.batchCustomer === batchName,
    );
  state.btbs = state.btbs.filter((row) => !marked(row));
  state.bkbs = state.bkbs.filter((row) => !marked(row));
  const saved = await fetch(`${base}/api/state`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      state,
      version: 6,
      revision: body.revision,
    }),
  });
  console.log(`cleanup ${saved.status}`);
}

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));

  try {
    await page.goto(`${base}/login`);
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin123");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 30000 });
    check("login sampai dashboard", true);

    const latestReady = page.waitForResponse(
      (res) => res.url().includes("/api/batches/latest") && res.ok(),
    );
    await page.goto(`${base}/transaksi/btb/baru`);
    await page.getByRole("heading", { name: "Buat BTB" }).waitFor();
    const latestRes = await latestReady;
    const latest = await latestRes.json();
    check(
      "API batch terakhir maksimal 3",
      Array.isArray(latest.batches) && latest.batches.length > 0 && latest.batches.length <= 3,
      JSON.stringify(latest.batches?.map((row) => row.label)),
    );
    check(
      "API tidak mengirim kode BC atau nomor BTB sebagai nama",
      latest.batches.every(
        (row) =>
          !/^BTB-/.test(row.label) &&
          !/^BC-/.test(row.label) &&
          !row.label.includes("BTB-"),
      ),
    );

    const batchButton = page.getByRole("button", { name: "Pilih batch" });
    await batchButton.click();
    const listbox = page.getByRole("listbox");
    await listbox.waitFor();
    const beforeCreate = await optionTexts(listbox.getByRole("option"));
    check(
      "dropdown BTB hanya menampilkan 3 batch",
      beforeCreate.length === latest.batches.length && beforeCreate.length <= 3,
      beforeCreate.join(" | "),
    );
    check(
      "opsi BTB sama dengan 3 batch dari server",
      latest.batches.every((row) => beforeCreate.includes(row.label)) &&
        beforeCreate.every((label) => latest.batches.some((row) => row.label === label)),
      beforeCreate.join(" | "),
    );
    check(
      "dropdown BTB punya aksi buat batch baru",
      await page.getByRole("button", { name: "Buat batch baru" }).isVisible(),
    );

    await page.getByRole("button", { name: "Buat batch baru" }).click();
    const nameInput = page.getByRole("textbox", { name: "Nama batch baru" });
    await nameInput.waitFor();
    const suggested = await nameInput.inputValue();
    check("nama batch baru yang disarankan mudah dibaca", /^Batch \d+$/.test(suggested), suggested);
    await nameInput.fill("");
    await page.getByRole("button", { name: "Buat", exact: true }).click();
    check(
      "nama kosong tidak membuat batch",
      await nameInput.isVisible(),
    );
    await nameInput.fill(batchName);
    await page.getByRole("button", { name: "Buat", exact: true }).click();
    await page.getByRole("button", { name: batchName }).waitFor();
    check("batch baru terpilih di form BTB", true);

    await page.getByRole("button", { name: "Baris Material" }).click();
    const materialInput = page.getByRole("combobox", { name: "Cari material..." });
    await materialInput.waitFor();
    const materialLabel = (await materialInput.inputValue()).trim();
    check("baris material terisi", materialLabel.length > 0, materialLabel);
    const gudangLabel = (
      await page.getByRole("combobox", { name: "Cari gudang..." }).inputValue()
    ).trim();
    const ownerState = await (await context.request.get(`${base}/api/state`)).json();
    const ownerItem = ownerState.state.items.find((row) =>
      materialLabel.includes(row.kode),
    );
    const owner = ownerState.state.customers.find(
      (row) => row.id === ownerItem?.customerId,
    );
    check("customer pemilik material ditemukan", Boolean(owner?.nama), ownerItem?.customerId);
    const customerInput = page.getByRole("combobox", { name: "Cari nama customer..." });
    await customerInput.click();
    await customerInput.fill(owner.nama);
    await page.getByRole("option").filter({ hasText: owner.nama }).first().click();
    await page.getByText("Qty", { exact: true }).locator("xpath=..").locator("input").fill("4");
    await page.locator("textarea").first().fill(note);

    const savedBtb = page.waitForResponse(
      (res) =>
        res.url().includes("/api/state") &&
        res.request().method() === "PUT" &&
        res.ok(),
    );
    await page.getByRole("button", { name: "Simpan BTB" }).click();
    await page.waitForURL(/\/transaksi\/btb\/(?!baru)/);
    await savedBtb;
    check("BTB tersimpan", !page.url().endsWith("/baru"));
    await page.getByText(batchName, { exact: true }).first().waitFor();
    check("halaman BTB menampilkan nama batch", true);

    const afterSave = await context.request.get(`${base}/api/batches/latest`);
    const afterJson = await afterSave.json();
    check(
      "batch baru masuk 3 terakhir di server",
      afterSave.ok() &&
        afterJson.batches?.length <= 3 &&
        afterJson.batches?.some((row) => row.value === batchName && row.label === batchName),
      JSON.stringify(afterJson.batches?.map((row) => row.label)),
    );

    await page.goto(`${base}/transaksi/btb/baru`);
    await page.getByRole("heading", { name: "Buat BTB" }).waitFor();
    await page.getByRole("button", { name: "Pilih batch" }).click();
    const afterOptions = await optionTexts(page.getByRole("listbox").getByRole("option"));
    check(
      "form BTB baru tetap membatasi 3 batch dan memuat batch yang baru dibuat",
      afterOptions.length <= 3 && afterOptions.includes(batchName),
      afterOptions.join(" | "),
    );
    await page.keyboard.press("Escape");

    await page.goto(`${base}/transaksi/bkb/baru`);
    await page.getByRole("heading", { name: "Buat BKB" }).waitFor();
    await page.getByRole("button", { name: "Baris Material" }).click();
    const bkbMaterial = page.getByRole("combobox", { name: "Cari material..." });
    await bkbMaterial.click();
    await bkbMaterial.fill(materialLabel);
    const materialOption = page.getByRole("option").filter({ hasText: materialLabel }).first();
    await materialOption.waitFor();
    await materialOption.click();

    const bkbBatch = page.getByRole("combobox", { name: "Pilih batch" });
    await bkbBatch.click();
    await page.getByRole("option").first().waitFor();
    const bkbOptions = await optionTexts(page.getByRole("option"));
    check(
      "dropdown batch BKB tidak kosong",
      bkbOptions.length > 0,
      bkbOptions.join(" | "),
    );
    check(
      "setiap opsi BKB memakai format nama, gudang, dan stok",
      bkbOptions.every(isShortBatchLabel),
      bkbOptions.join(" | "),
    );
    check(
      "opsi BKB tidak memuat nomor BTB, kode BC, atau tanggal",
      bkbOptions.every(
        (text) =>
          !text.includes("BTB-") &&
          !/\bBC-[A-Z0-9-]+/.test(text) &&
          !/\d{4}-\d{2}-\d{2}/.test(text) &&
          !/\d{2}\/\d{2}\/\d{4}/.test(text),
      ),
      bkbOptions.join(" | "),
    );
    const ours = bkbOptions.find((text) => text.startsWith(`${batchName} - `));
    check(
      "batch baru tampil dengan gudang dan stok",
      Boolean(ours) &&
        ours.includes(gudangLabel) &&
        ours.includes("(Stok: 4)"),
      ours ?? bkbOptions.join(" | "),
    );
    if (!ours) throw new Error(`Opsi batch QA tidak ada: ${bkbOptions.join(" | ")}`);
    await page.getByRole("option").filter({ hasText: batchName }).first().click();
    await page.getByText("Qty", { exact: true }).locator("xpath=..").locator("input").fill("1");
    await page.locator("textarea").first().fill(note);

    const savedBkb = page.waitForResponse(
      (res) =>
        res.url().includes("/api/state") &&
        res.request().method() === "PUT" &&
        res.ok(),
    );
    await page.getByRole("button", { name: "Simpan BKB" }).click();
    await page.waitForURL(/\/transaksi\/bkb\/(?!baru)/);
    await savedBkb;
    check("BKB tersimpan", !page.url().endsWith("/baru"));
    await page.getByText(batchName, { exact: true }).first().waitFor();
    const viewText = await page.locator("body").innerText();
    check(
      "detail BKB tidak menampilkan kode batch BC",
      viewText.includes(batchName) && !viewText.includes("BC-"),
    );

    const noise = consoleErrors.filter(
      (line) => !/favicon|Download the React DevTools/.test(line),
    );
    check("tidak ada error di konsol browser", noise.length === 0, noise.join(" | "));
  } catch (error) {
    const shot = `scripts/qa-batch-e2e-fail.png`;
    await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
    check("skenario berjalan sampai selesai", false, `${error}\nlihat ${shot}`);
  } finally {
    await browser.close();
  }
}

try {
  await main();
} finally {
  await cleanup();
  console.log(failures.length ? `\n${failures.length} gagal` : "\nSemua pemeriksaan lulus");
  if (failures.length) process.exitCode = 1;
}
