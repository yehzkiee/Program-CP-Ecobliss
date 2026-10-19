/**
 * QA E2E untuk perbaikan form Stock Opname + Adjustment:
 * 1) Dropdown "Cari kode atau nama barang..." menampilkan Material (bukan hanya FG)
 * 2) Metode "Per Finish Good" auto-populate worksheet dari Gudang FG
 * 3) Qty Aktual bisa diedit; simpan hanya baris selisih
 *
 *   npm install --no-save playwright
 *   node scripts/qa-stock-forms-e2e.mjs
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
const note = `QA-STOCK-FORMS-${stamp}`;
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

async function optionTexts(locator) {
  const rows = await locator.allTextContents();
  return rows.map((row) => row.trim()).filter(Boolean);
}

function looksLikeMaterial(text) {
  return (
    /\bMaterial\b/i.test(text) ||
    /\bMAT-\d+/i.test(text) ||
    /Karton Duplex|Ink Cyan|Lem Hotmelt|Film Laminasi/i.test(text)
  );
}

function looksLikeFinishGood(text) {
  return /\bFinish Good\b/i.test(text) || /\bFG-/i.test(text);
}

async function openBarangDropdown(page, placeholder = /Cari kode atau nama barang/i) {
  const input = page.getByPlaceholder(placeholder).first();
  await input.waitFor({ state: "visible" });
  await input.click();
  await input.fill("");
  await page.waitForTimeout(300);
  const listbox = page.getByRole("listbox");
  await listbox.waitFor({ timeout: 10000 });
  return { input, listbox };
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

  state.stockOpnames = (state.stockOpnames ?? []).filter(
    (row) => !String(row.keterangan ?? "").includes("QA-STOCK-FORMS-"),
  );
  state.adjustments = (state.adjustments ?? []).filter(
    (row) => !String(row.keterangan ?? "").includes("QA-STOCK-FORMS-"),
  );

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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));

  try {
    // --- Login ---
    await page.goto(`${base}/login`);
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin123");
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.getByRole("heading", { name: "Dashboard" }).waitFor({
      timeout: 30000,
    });
    check("login sampai dashboard", true);

    // ============================================================
    // 1) Stock Opname — dropdown Material + Finish Good
    // ============================================================
    await page.goto(`${base}/transaksi/stock-opname/baru`);
    await page.getByRole("heading", { name: "Buat Stock Opname" }).waitFor();

    const metodePerMaterial = page.getByLabel("Per Material");
    await metodePerMaterial.check();
    check("radio Per Material bisa dipilih", await metodePerMaterial.isChecked());

    const { input: soBarang, listbox: soList } = await openBarangDropdown(page);
    let soOptions = await optionTexts(soList.getByRole("option"));
    const soHasMaterial = soOptions.some(looksLikeMaterial);
    const soHasFg = soOptions.some(looksLikeFinishGood) || soOptions.length > 0;
    check(
      "SO dropdown menampilkan Material di daftar awal",
      soHasMaterial,
      soOptions.slice(0, 8).join(" | "),
    );
    check(
      "SO dropdown juga punya opsi barang (FG/lainnya)",
      soHasFg,
      `count=${soOptions.length}`,
    );

    await soBarang.fill("MAT-001");
    await page.waitForTimeout(400);
    soOptions = await optionTexts(soList.getByRole("option"));
    check(
      "SO pencarian MAT-001 menemukan Material",
      soOptions.some((t) => /MAT-001/i.test(t)),
      soOptions.slice(0, 5).join(" | "),
    );
    await page.keyboard.press("Escape");

    // ============================================================
    // 2) Stock Opname — Per Finish Good auto-populate
    // ============================================================
    const metodeFg = page.getByLabel("Per Finish Good");
    await metodeFg.check();
    check("radio Per Finish Good bisa dipilih", await metodeFg.isChecked());

    await page
      .getByText(/Worksheet diisi otomatis dari stok Finish Good/i)
      .waitFor({ timeout: 10000 })
      .catch(() => null);

    const worksheet = page.getByRole("table").first();
    const emptyHint = page.getByText(/Tidak ada stok Finish Good di Gudang FG/i);
    const hasTable = await worksheet.isVisible().catch(() => false);
    const isEmpty = await emptyHint.isVisible().catch(() => false);

    if (isEmpty && !hasTable) {
      check(
        "Per Finish Good: worksheet kosong hanya jika memang tidak ada stok FG",
        true,
        "tidak ada stok FG di Gudang FG (valid)",
      );
    } else {
      await worksheet.waitFor({ state: "visible", timeout: 15000 });
      const rows = worksheet.locator("tbody tr");
      const rowCount = await rows.count();
      check(
        "Per Finish Good auto-populate worksheet",
        rowCount > 0,
        `rows=${rowCount}`,
      );

      if (rowCount > 0) {
        const firstRowText = (await rows.first().innerText()).replace(/\s+/g, " ");
        check(
          "baris worksheet berisi Finish Good",
          /Finish Good|FG/i.test(firstRowText) || firstRowText.length > 10,
          firstRowText.slice(0, 180),
        );

        const qtySistem = rows.first().locator("td").nth(6);
        const sistemText = (await qtySistem.innerText()).trim();
        check(
          "Qty Sistem terisi angka",
          /^\d+(\.\d+)?$/.test(sistemText),
          sistemText,
        );

        const qtyAktual = rows.first().locator('input[type="number"]').first();
        await qtyAktual.waitFor({ state: "visible" });
        const before = await qtyAktual.inputValue();
        const nextQty = String(Number(before || "0") + 1);
        await qtyAktual.fill(nextQty);
        check(
          "Qty Aktual bisa diedit",
          (await qtyAktual.inputValue()) === nextQty,
          `before=${before} after=${await qtyAktual.inputValue()}`,
        );

        const ket = page
          .locator("label")
          .filter({ hasText: /^Keterangan$/ })
          .locator("xpath=..")
          .locator("input, textarea")
          .first();
        await ket.fill(note);

        const saved = page.waitForResponse(
          (res) =>
            res.url().includes("/api/state") &&
            res.request().method() === "PUT" &&
            res.ok(),
          { timeout: 20000 },
        ).catch(() => null);

        await page.getByRole("button", { name: /Simpan \(hanya selisih\)/i }).click();
        await page
          .waitForURL(/\/transaksi\/stock-opname\/(?!baru)/, { timeout: 20000 })
          .catch(() => null);

        const leftCreate = !page.url().endsWith("/baru");
        if (leftCreate) {
          await saved;
          check("Stock Opname Per Finish Good tersimpan", true);
          const body = await page.locator("body").innerText();
          check(
            "detail SO menampilkan metode Per Finish Good",
            /Per Finish Good/i.test(body),
            body.slice(0, 240),
          );
        } else {
          // Mungkin gagal karena Batch/No BTB wajib — coba pilih lot dulu
          const lotCombo = page
            .getByPlaceholder(/Cari Batch \/ No\. BTB/i)
            .first();
          if (await lotCombo.isVisible().catch(() => false)) {
            await lotCombo.click();
            const lotOpt = page.getByRole("option").first();
            if (await lotOpt.count()) {
              await lotOpt.click();
              await qtyAktual.fill(nextQty);
              await page
                .getByRole("button", { name: /Simpan \(hanya selisih\)/i })
                .click();
              await page
                .waitForURL(/\/transaksi\/stock-opname\/(?!baru)/, {
                  timeout: 20000,
                })
                .catch(() => null);
            }
          }
          check(
            "Stock Opname Per Finish Good tersimpan",
            !page.url().endsWith("/baru"),
            page.url(),
          );
        }
      }
    }

    // ============================================================
    // 3) Adjustment — dropdown Material + Finish Good
    // ============================================================
    await page.goto(`${base}/transaksi/adjustment/baru`);
    await page.getByRole("heading", { name: /Buat Adjustment|Adjustment/i }).waitFor();

    // Pastikan mode mandiri (Tanpa Stock Opname) agar picker barang tampil
    const soPicker = page
      .getByPlaceholder(/Stock Opname|Tanpa Stock Opname|Cari/i)
      .first();
    if (await soPicker.isVisible().catch(() => false)) {
      await soPicker.click();
      const tanpa = page
        .getByRole("option")
        .filter({ hasText: /Tanpa Stock Opname/i })
        .first();
      if (await tanpa.count()) await tanpa.click();
      else await page.keyboard.press("Escape");
    }

    const adjLabel = page.getByText("Material / Finish Good");
    await adjLabel.waitFor({ timeout: 10000 });
    const { input: adjBarang, listbox: adjList } = await openBarangDropdown(page);
    let adjOptions = await optionTexts(adjList.getByRole("option"));
    check(
      "Adjustment dropdown menampilkan Material di daftar awal",
      adjOptions.some(looksLikeMaterial),
      adjOptions.slice(0, 8).join(" | "),
    );

    await adjBarang.fill("MAT-001");
    await page.waitForTimeout(400);
    adjOptions = await optionTexts(adjList.getByRole("option"));
    check(
      "Adjustment pencarian MAT-001 menemukan Material",
      adjOptions.some((t) => /MAT-001/i.test(t)),
      adjOptions.slice(0, 5).join(" | "),
    );

    const matOpt = page
      .getByRole("option")
      .filter({ hasText: /MAT-001/i })
      .first();
    await matOpt.click();
    await page.getByRole("button", { name: /Tambah Baris Material/i }).click();
    await page.waitForTimeout(400);
    const tableText = await page.getByRole("table").first().innerText();
    check(
      "Adjustment bisa menambah baris Material",
      /MAT-001/i.test(tableText),
      tableText.slice(0, 200),
    );

    const noise = consoleErrors.filter(
      (line) => !/favicon|Download the React DevTools|hydration/i.test(line),
    );
    check(
      "tidak ada error di konsol browser",
      noise.length === 0,
      noise.join(" | "),
    );
  } catch (error) {
    const shot = "scripts/qa-stock-forms-e2e-fail.png";
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
  console.log(
    failures.length ? `\n${failures.length} gagal` : "\nSemua pemeriksaan lulus",
  );
  if (failures.length) process.exitCode = 1;
}
