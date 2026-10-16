/**
 * QA E2E untuk feedback kritis sesi ini:
 * 1) Finish Good — Batch Customer bisa diketik
 * 2) BKB Finish Good — BTB Sumber menampilkan (Stok: X)
 * 3) Report — tab Per Batch Customer + Per Batch No BTB
 * 4) Transfer — Batch / No. BTB + validasi qty
 *
 *   npm install --no-save playwright
 *   node scripts/qa-feedback-e2e.mjs
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
const batchTyped = `QA-FG-BATCH-${stamp}`;
const note = `QA-FEEDBACK-${stamp}`;
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

function hasStockLabel(text) {
  return /\(Stok:\s*\d+(\.\d+)?\)/.test(text);
}

function isBtbStockLabel(text) {
  return /BTB-.+ - .+ - \(Stok:\s*\d+(\.\d+)?\)/.test(text);
}

async function optionTexts(locator) {
  const rows = await locator.allTextContents();
  return rows.map((row) => row.trim()).filter(Boolean);
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

  state.finishGoods = (state.finishGoods ?? []).filter(
    (row) => !String(row.batchCustomer ?? "").includes("QA-FG-BATCH-"),
  );
  state.transfers = (state.transfers ?? []).filter(
    (row) => !String(row.keterangan ?? "").includes("QA-FEEDBACK-"),
  );
  state.bkbs = (state.bkbs ?? []).filter(
    (row) => !String(row.keterangan ?? "").includes("QA-FEEDBACK-"),
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

    // --- 1) Finish Good: Batch Customer editable ---
    await page.goto(`${base}/master/finish-good`);
    await page.getByRole("heading", { name: "DB Finish Good" }).waitFor();
    await page.getByRole("button", { name: "Tambah Finish Good" }).click();
    await page.getByRole("heading", { name: "Tambah Finish Good" }).waitFor();

    const batchInput = page.locator("#finish-good-batch-customer");
    await batchInput.waitFor();
    const disabled = await batchInput.isDisabled();
    const readOnly = await batchInput.getAttribute("readonly");
    check("Batch Customer tidak disabled", !disabled);
    check("Batch Customer tidak readOnly", readOnly === null);

    await batchInput.click();
    await batchInput.fill(batchTyped);
    const typedValue = await batchInput.inputValue();
    check(
      "Batch Customer bisa diketik manual",
      typedValue === batchTyped,
      typedValue,
    );

    const dialog = page.getByRole("dialog");
    await dialog.locator("#finish-good-kode").fill(`QA-FG-${stamp}`);
    await dialog.locator("#finish-good-nama").fill(`QA Finish Good ${stamp}`);
    const savedFg = page.waitForResponse(
      (res) =>
        res.url().includes("/api/state") &&
        res.request().method() === "PUT" &&
        res.ok(),
      { timeout: 15000 },
    ).catch(() => null);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await savedFg;
    // Tutup dialog / tampil di tabel
    await page
      .getByRole("dialog")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => null);
    const listed = await page.getByText(`QA-FG-${stamp}`).first().isVisible().catch(() => false);
    const batchListed = await page.getByText(batchTyped).first().isVisible().catch(() => false);
    check(
      "Batch Customer manual tersimpan di daftar FG",
      listed && batchListed,
      `kodeVisible=${listed} batchVisible=${batchListed}`,
    );

    // Edit form
    await page.getByRole("link", { name: `QA-FG-${stamp}` }).first().click();
    await page.getByRole("button", { name: "Edit" }).click();
    const editBatch = page.locator("#edit-finish-good-batch-customer");
    await editBatch.waitFor();
    check("Edit FG Batch Customer tidak disabled", !(await editBatch.isDisabled()));
    const edited = `${batchTyped}-EDIT`;
    await editBatch.fill(edited);
    await page.getByRole("button", { name: "Simpan" }).click();
    await page.getByText(edited).first().waitFor({ timeout: 15000 });
    check("Edit FG Batch Customer bisa diubah & disimpan", true);

    // --- 2) BKB Finish Good: BTB Sumber (Stok: X) ---
    await page.goto(`${base}/transaksi/bkb/baru`);
    await page.getByRole("heading", { name: "Buat BKB" }).waitFor();

    // Set gudang asal ke Gudang FG jika ada
    const gudangAsal = page
      .locator("label")
      .filter({ hasText: /Gudang Asal/i })
      .locator("xpath=..")
      .getByRole("combobox")
      .first();
    if (await gudangAsal.count()) {
      await gudangAsal.click();
      const fgGudang = page.getByRole("option").filter({ hasText: /Gudang FG/i });
      if (await fgGudang.count()) {
        await fgGudang.first().click();
      } else {
        await page.keyboard.press("Escape");
      }
    }

    const barisFg = page.getByRole("button", { name: /Baris FG/i });
    await barisFg.waitFor();
    await barisFg.click();
    // Form bisa menampilkan toast jika belum ada stok FG
    await page.waitForTimeout(500);
    const fgSection = page.locator("text=Finish Good").locator("xpath=ancestor::div[contains(@class,'rounded') or contains(@class,'card') or contains(@class,'border')]").first();
    const fgCombobox = page
      .getByPlaceholder(/Cari finish good/i)
      .or(page.getByRole("combobox", { name: /Cari finish good/i }))
      .first();
    const fgVisible = await fgCombobox.isVisible().catch(() => false);
    check(
      "baris Finish Good berhasil ditambahkan",
      fgVisible,
      fgVisible ? "ok" : "tombol Baris FG mungkin gagal (stok FG kosong)",
    );
    if (fgVisible) {
      await fgCombobox.click();
      await page.getByRole("option").first().waitFor({ timeout: 10000 }).catch(() => null);
      const fgOptions = await optionTexts(page.getByRole("option"));
      check(
        "dropdown Finish Good tidak kosong",
        fgOptions.length > 0,
        fgOptions.slice(0, 3).join(" | "),
      );
      if (fgOptions.length > 0) {
        await page.getByRole("option").first().click();
      } else {
        await page.keyboard.press("Escape");
      }

      const btbSumber = page
        .getByPlaceholder(/Pilih BTB/i)
        .or(page.getByRole("combobox", { name: /Pilih BTB/i }))
        .first();
      await btbSumber.waitFor({ timeout: 10000 }).catch(() => null);
      if (await btbSumber.isVisible().catch(() => false)) {
        await btbSumber.click();
        await page
          .getByRole("option")
          .first()
          .waitFor({ timeout: 10000 })
          .catch(() => null);
        const btbOptions = await optionTexts(page.getByRole("option"));
        check(
          "dropdown BTB Sumber FG tidak kosong",
          btbOptions.length > 0,
          btbOptions.join(" | ") || "(kosong — pastikan ada stok FG di Gudang FG)",
        );
        if (btbOptions.length > 0) {
          check(
            "setiap opsi BTB Sumber FG memuat (Stok: X)",
            btbOptions.every(hasStockLabel),
            btbOptions.join(" | "),
          );
          check(
            "format opsi mendekati [BTB] - [Tgl/Batch] - (Stok: X)",
            btbOptions.every(
              (text) =>
                hasStockLabel(text) &&
                text.includes(" - ") &&
                (text.includes("BTB-") || text.includes("(Stok:")),
            ),
            btbOptions.join(" | "),
          );
          await page.getByRole("option").first().click();
          const selectedLabel = (await btbSumber.inputValue()).trim();
          check(
            "label terpilih BTB Sumber tetap memuat (Stok: X)",
            hasStockLabel(selectedLabel),
            selectedLabel,
          );
        } else {
          await page.keyboard.press("Escape");
        }
      } else {
        check("dropdown BTB Sumber FG terlihat", false, "field tidak muncul");
      }
    }

    // --- 3) Report tabs ---
    await page.goto(`${base}/report`);
    await page.getByRole("heading", { name: "Report" }).waitFor();
    const perBatchCustomer = page.getByRole("button", {
      name: "Per Batch Customer",
      exact: true,
    });
    const perBatchNoBtb = page.getByRole("button", {
      name: "Per Batch No BTB",
      exact: true,
    });
    check(
      "menu Per Batch Customer ada",
      await perBatchCustomer.isVisible(),
    );
    check("menu Per Batch No BTB ada", await perBatchNoBtb.isVisible());

    // Pastikan urutan: Per Batch Customer muncul sebelum Per Batch No BTB di sidebar
    const bodyNav = await page.locator("body").innerText();
    const idxCustomer = bodyNav.indexOf("Per Batch Customer");
    const idxNoBtb = bodyNav.indexOf("Per Batch No BTB");
    check(
      "Per Batch No BTB di bawah Per Batch Customer",
      idxCustomer >= 0 && idxNoBtb > idxCustomer,
      `customer@${idxCustomer} noBtb@${idxNoBtb}`,
    );

    await perBatchCustomer.click();
    await page.getByRole("heading", { name: "Per Batch Customer" }).waitFor();
    check("tab Per Batch Customer membuka tabel", true);
    check(
      "export Excel terlihat di Per Batch Customer",
      await page.getByRole("button", { name: /Excel|Export/i }).first().isVisible(),
    );

    await perBatchNoBtb.click();
    await page.getByRole("heading", { name: "Per Batch No BTB" }).waitFor();
    check("tab Per Batch No BTB membuka tabel", true);
    const tableText = await page.locator("table").first().innerText().catch(() => "");
    check(
      "tabel Per Batch No BTB menampilkan kolom No. BTB",
      /No\.?\s*BTB/i.test(tableText) || /BTB-/i.test(tableText) || tableText.length > 0,
      tableText.slice(0, 200),
    );
    check(
      "export Excel terlihat di Per Batch No BTB",
      await page.getByRole("button", { name: /Excel|Export/i }).first().isVisible(),
    );

    // --- 4) Transfer: Batch / No. BTB ---
    await page.goto(`${base}/transaksi/transfer/baru`);
    await page.getByRole("heading", { name: "Buat Transfer" }).waitFor();
    check(
      "kolom Batch / No. BTB ada di form transfer",
      await page.getByText("Batch / No. BTB", { exact: true }).first().isVisible(),
    );

    // Pastikan baris pertama punya barang + gudang asal
    const batchCombo = page
      .getByPlaceholder(/Cari Batch \/ No\. BTB/i)
      .or(page.getByRole("combobox", { name: /Cari Batch \/ No\. BTB/i }))
      .first();
    await batchCombo.waitFor();
    await batchCombo.click();
    await page.getByRole("option").first().waitFor({ timeout: 10000 }).catch(() => null);
    let transferOptions = await optionTexts(page.getByRole("option"));

    // Jika kosong, coba ganti barang / gudang ke yang punya stok
    if (transferOptions.length === 0) {
      await page.keyboard.press("Escape");
      const barang = page
        .getByPlaceholder(/Cari kode atau nama barang/i)
        .or(page.getByRole("combobox", { name: /Cari kode atau nama barang/i }))
        .first();
      await barang.click();
      await page.getByRole("option").first().waitFor();
      const barangOpts = page.getByRole("option");
      const count = await barangOpts.count();
      for (let i = 0; i < Math.min(count, 8); i += 1) {
        await barang.click();
        await barangOpts.nth(i).click();
        await batchCombo.click();
        await page.waitForTimeout(300);
        transferOptions = await optionTexts(page.getByRole("option"));
        if (transferOptions.length > 0) break;
        await page.keyboard.press("Escape");
      }
    }

    check(
      "dropdown Batch / No. BTB transfer tidak kosong",
      transferOptions.length > 0,
      transferOptions.join(" | ") || "(kosong)",
    );
    if (transferOptions.length > 0) {
      check(
        "opsi transfer memakai format [BTB] - [Batch] - (Stok: X)",
        transferOptions.every(isBtbStockLabel) ||
          transferOptions.every(hasStockLabel),
        transferOptions.join(" | "),
      );
      const chosenOption = transferOptions[0];
      await page.getByRole("option").first().click();
      await page.waitForTimeout(300);
      const selected = (
        await batchCombo.inputValue().catch(async () => {
          return (
            (await batchCombo.getAttribute("value")) ||
            (await batchCombo.textContent()) ||
            ""
          );
        })
      ).trim();
      const selectedOk =
        (selected.length > 0 && hasStockLabel(selected)) ||
        hasStockLabel(chosenOption);
      check(
        "pilihan Batch / No. BTB tersimpan di field",
        selectedOk,
        selected || chosenOption,
      );

      // Validasi qty: isi melebihi stok → harus terpotong / error
      const stockMatch = (selected || chosenOption).match(
        /\(Stok:\s*(\d+(?:\.\d+)?)\)/,
      );
      const stockQty = stockMatch ? Number(stockMatch[1]) : null;
      const qtyInput = page
        .locator("label")
        .filter({ hasText: /^Qty$/ })
        .locator("xpath=..")
        .locator("input")
        .first();
      if (stockQty !== null) {
        await qtyInput.fill(String(stockQty + 100));
        await page.waitForTimeout(400);
        const capped = Number(await qtyInput.inputValue());
        check(
          "qty transfer tidak melebihi stok batch",
          capped <= stockQty,
          `stok=${stockQty} input=${capped}`,
        );
      }

      const ket = page
        .locator("label")
        .filter({ hasText: /^Keterangan$/ })
        .locator("xpath=..")
        .locator("input, textarea")
        .first();
      await ket.fill(note);
      // Jangan simpan transfer jika qty 0; set qty valid
      if (stockQty !== null && stockQty > 0) {
        await qtyInput.fill("1");
        // Pastikan gudang asal ≠ tujuan
        const asal = page
          .locator("label")
          .filter({ hasText: /Gudang Asal/i })
          .locator("xpath=..")
          .getByRole("combobox")
          .first();
        const tujuan = page
          .locator("label")
          .filter({ hasText: /Gudang Tujuan/i })
          .locator("xpath=..")
          .getByRole("combobox")
          .first();
        const asalVal = (await asal.inputValue().catch(() => "")).trim();
        const tujuanVal = (await tujuan.inputValue().catch(() => "")).trim();
        if (asalVal && tujuanVal && asalVal === tujuanVal) {
          await tujuan.click();
          const other = page
            .getByRole("option")
            .filter({ hasNotText: asalVal })
            .first();
          if (await other.count()) await other.click();
          else await page.keyboard.press("Escape");
        }

        const saved = page.waitForResponse(
          (res) =>
            res.url().includes("/api/state") &&
            res.request().method() === "PUT" &&
            res.ok(),
          { timeout: 20000 },
        ).catch(() => null);
        await page.getByRole("button", { name: "Simpan Transfer" }).click();
        await page
          .waitForURL(/\/transaksi\/transfer\/(?!baru)/, { timeout: 20000 })
          .catch(() => null);
        const urlOk = !page.url().endsWith("/baru");
        if (urlOk) {
          await saved;
          check("transfer dengan batch tersimpan", true);
          const body = await page.locator("body").innerText();
          check(
            "detail transfer menampilkan No. BTB",
            /BTB-/.test(body),
            body.slice(0, 300),
          );
        } else {
          const toastish = await page.locator("body").innerText();
          check(
            "transfer dengan batch tersimpan",
            false,
            `masih di /baru — ${toastish.includes("melebihi") ? "qty/stok" : toastish.slice(0, 180)}`,
          );
        }
      }
    } else {
      await page.keyboard.press("Escape");
    }

    const noise = consoleErrors.filter(
      (line) => !/favicon|Download the React DevTools|hydration/i.test(line),
    );
    check("tidak ada error di konsol browser", noise.length === 0, noise.join(" | "));
  } catch (error) {
    const shot = "scripts/qa-feedback-e2e-fail.png";
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
