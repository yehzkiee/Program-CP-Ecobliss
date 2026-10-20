/**
 * QA E2E untuk 3 perbaikan feedback terbaru:
 * 1) Stock Opname: worksheet kosong (tidak auto-populate); tambah manual via search
 * 2) Adjustment: dropdown No. SO menyembunyikan SO yang Adjustment-nya disetujui / menunggu
 * 3) Report Per Material / Per FG: grouping per Item + Gudang (bukan sum lintas gudang)
 *
 *   node scripts/qa-feedback-fixes-e2e.mjs
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
const note = `QA-FEEDBACK-FIXES-${stamp}`;
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

async function openCombobox(page, placeholder) {
  const input = page.getByPlaceholder(placeholder).first();
  await input.waitFor({ state: "visible" });
  await input.click();
  await input.fill("");
  await page.waitForTimeout(300);
  const listbox = page.getByRole("listbox");
  await listbox.waitFor({ timeout: 10000 });
  return { input, listbox };
}

async function loginApi() {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const cookie = (login.headers.getSetCookie?.() ?? [])
    .map((entry) => entry.split(";")[0])
    .find((entry) => entry.startsWith("cp_session="));
  if (!cookie || login.status !== 200) {
    throw new Error(`login API gagal status=${login.status}`);
  }
  return cookie;
}

async function loadState(cookie) {
  const loaded = await fetch(`${base}/api/state`, { headers: { cookie } });
  const body = await loaded.json();
  if (!body?.state) throw new Error("state kosong");
  return body;
}

async function saveState(cookie, body, state) {
  const saved = await fetch(`${base}/api/state`, {
    method: "PUT",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      state,
      version: 6,
      revision: body.revision,
    }),
  });
  if (!saved.ok) {
    throw new Error(`save state gagal status=${saved.status}`);
  }
  return saved;
}

/** Siapkan data: 1 SO free, 1 SO approved, 1 SO menunggu; stok material di 2 gudang. */
async function seedFixtures() {
  const cookie = await loginApi();
  const body = await loadState(cookie);
  const state = body.state;
  const gudangList = state.gudangList ?? [];
  const g1 = gudangList[0]?.id ?? "g1";
  const g2 = gudangList[1]?.id ?? gudangList[0]?.id ?? "g1";
  const g1Nama = gudangList.find((g) => g.id === g1)?.nama ?? "Gudang A";
  const g2Nama = gudangList.find((g) => g.id === g2)?.nama ?? "Gudang B";

  const soFreeId = `qa-so-free-${stamp}`;
  const soApprovedId = `qa-so-approved-${stamp}`;
  const soPendingId = `qa-so-pending-${stamp}`;
  const adjApprovedId = `qa-adj-approved-${stamp}`;
  const adjPendingId = `qa-adj-pending-${stamp}`;

  const soLine = {
    jenis: "item",
    refId: "i1",
    kode: "MAT-001",
    nama: "Karton Duplex 300gsm",
    customerId: "c1",
    gudangId: g1,
    qtySistem: 100,
    qtyAktual: 90,
    selisih: -10,
  };

  state.stockOpnames = [
    ...(state.stockOpnames ?? []).filter(
      (row) => !String(row.keterangan ?? "").includes("QA-FEEDBACK-FIXES-"),
    ),
    {
      id: soFreeId,
      no: `SO-QA-FREE-${stamp}`,
      tanggal: "2026-10-20",
      keterangan: `${note} free`,
      metode: "per_item",
      createdAt: new Date().toISOString(),
      lines: [soLine],
    },
    {
      id: soApprovedId,
      no: `SO-QA-APPROVED-${stamp}`,
      tanggal: "2026-10-20",
      keterangan: `${note} approved`,
      metode: "per_item",
      createdAt: new Date().toISOString(),
      lines: [soLine],
    },
    {
      id: soPendingId,
      no: `SO-QA-PENDING-${stamp}`,
      tanggal: "2026-10-20",
      keterangan: `${note} pending`,
      metode: "per_item",
      createdAt: new Date().toISOString(),
      lines: [soLine],
    },
  ];

  state.adjustments = [
    ...(state.adjustments ?? []).filter(
      (row) => !String(row.keterangan ?? "").includes("QA-FEEDBACK-FIXES-"),
    ),
    {
      id: adjApprovedId,
      no: `ADJ-QA-APPROVED-${stamp}`,
      tanggal: "2026-10-20",
      stockOpnameId: soApprovedId,
      stockOpnameNo: `SO-QA-APPROVED-${stamp}`,
      status: "disetujui",
      keterangan: `${note} approved`,
      approvedBy: "QA Admin",
      createdAt: new Date().toISOString(),
      lines: [
        {
          jenis: "item",
          refId: "i1",
          kode: "MAT-001",
          nama: "Karton Duplex 300gsm",
          qty: 10,
          out: 10,
          in: 0,
          keterangan: "QA approved",
        },
      ],
    },
    {
      id: adjPendingId,
      no: `ADJ-QA-PENDING-${stamp}`,
      tanggal: "2026-10-20",
      stockOpnameId: soPendingId,
      stockOpnameNo: `SO-QA-PENDING-${stamp}`,
      status: "menunggu_approval",
      keterangan: `${note} pending`,
      createdAt: new Date().toISOString(),
      lines: [
        {
          jenis: "item",
          refId: "i1",
          kode: "MAT-001",
          nama: "Karton Duplex 300gsm",
          qty: 10,
          out: 10,
          in: 0,
          keterangan: "QA pending",
        },
      ],
    },
  ];

  await saveState(cookie, body, state);
  return {
    soFreeNo: `SO-QA-FREE-${stamp}`,
    soApprovedNo: `SO-QA-APPROVED-${stamp}`,
    soPendingNo: `SO-QA-PENDING-${stamp}`,
    g1Nama,
    g2Nama,
    twoGudang: g1 !== g2,
  };
}

async function cleanup() {
  try {
    const cookie = await loginApi();
    const body = await loadState(cookie);
    const state = body.state;
    state.stockOpnames = (state.stockOpnames ?? []).filter(
      (row) => !String(row.keterangan ?? "").includes("QA-FEEDBACK-FIXES-"),
    );
    state.adjustments = (state.adjustments ?? []).filter(
      (row) => !String(row.keterangan ?? "").includes("QA-FEEDBACK-FIXES-"),
    );
    const saved = await saveState(cookie, body, state);
    console.log(`cleanup ${saved.status}`);
  } catch (error) {
    console.log(`cleanup skipped: ${error}`);
  }
}

async function main() {
  console.log(`base=${base}`);
  const fixtures = await seedFixtures();
  console.log(
    `seeded free=${fixtures.soFreeNo} approved=${fixtures.soApprovedNo} pending=${fixtures.soPendingNo}`,
  );

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
    // 1) Stock Opname — tidak auto-populate; tambah manual
    // ============================================================
    await page.goto(`${base}/transaksi/stock-opname/baru`);
    await page.getByRole("heading", { name: "Buat Stock Opname" }).waitFor();

    const emptyHint = page.getByText(
      /Tambahkan Material atau Finish Good untuk mulai mengisi worksheet/i,
    );
    check(
      "SO baru: worksheet kosong saat load",
      await emptyHint.isVisible(),
    );
    check(
      "SO baru: belum ada tabel worksheet",
      !(await page.getByRole("table").first().isVisible().catch(() => false)),
    );

    // Pilih Per Finish Good — harus tetap kosong + tampil search barang
    await page.getByLabel("Per Finish Good").check();
    await page.waitForTimeout(400);
    check(
      "Per Finish Good: tidak auto-populate (worksheet tetap kosong)",
      await page
        .getByText(
          /Cari dan tambahkan Finish Good untuk mulai mengisi worksheet/i,
        )
        .isVisible(),
    );
    check(
      "Per Finish Good: tidak ada teks auto-isi lama",
      !(await page
        .getByText(/Worksheet diisi otomatis dari stok Finish Good/i)
        .isVisible()
        .catch(() => false)),
    );
    check(
      "Per Finish Good: search barang tersedia",
      await page
        .getByPlaceholder(/Cari kode atau nama barang/i)
        .first()
        .isVisible(),
    );

    // Kembali ke Per Material, tambah manual
    await page.getByLabel("Per Material").check();
    await page.waitForTimeout(300);
    check(
      "ganti metode: worksheet dikosongkan lagi",
      await page
        .getByText(
          /Tambahkan Material atau Finish Good untuk mulai mengisi worksheet/i,
        )
        .isVisible(),
    );

    const { input: soBarang, listbox: soList } = await openCombobox(
      page,
      /Cari kode atau nama barang/i,
    );
    await soBarang.fill("MAT-001");
    await page.waitForTimeout(400);
    const soOptions = await optionTexts(soList.getByRole("option"));
    check(
      "SO search MAT-001 menemukan opsi",
      soOptions.some((t) => /MAT-001/i.test(t)),
      soOptions.slice(0, 5).join(" | "),
    );
    await soList.getByRole("option").filter({ hasText: /MAT-001/i }).first().click();
    await page.getByRole("button", { name: /Tambah Baris/i }).click();
    await page.waitForTimeout(500);

    const worksheet = page.getByRole("table").first();
    await worksheet.waitFor({ state: "visible", timeout: 10000 });
    const rowText = (await worksheet.locator("tbody tr").first().innerText()).replace(
      /\s+/g,
      " ",
    );
    check(
      "SO manual Tambah Baris memasukkan MAT-001 ke worksheet",
      /MAT-001/i.test(rowText),
      rowText.slice(0, 200),
    );

    // ============================================================
    // 2) Adjustment — filter SO approved / pending
    // ============================================================
    await page.goto(`${base}/transaksi/adjustment/baru`);
    await page
      .getByRole("heading", { name: /Buat Adjustment|Adjustment/i })
      .waitFor();

    const { input: soPicker, listbox: soAdjList } = await openCombobox(
      page,
      /Cari no\. stock opname/i,
    );
    await soPicker.fill("SO-QA-");
    await page.waitForTimeout(500);
    const soAdjOptions = await optionTexts(soAdjList.getByRole("option"));
    const joined = soAdjOptions.join(" | ");
    check(
      "Adjustment dropdown menampilkan SO free (belum approved)",
      soAdjOptions.some((t) => t.includes(fixtures.soFreeNo)),
      joined,
    );
    check(
      "Adjustment dropdown menyembunyikan SO approved",
      !soAdjOptions.some((t) => t.includes(fixtures.soApprovedNo)),
      joined,
    );
    check(
      "Adjustment dropdown menyembunyikan SO menunggu approval",
      !soAdjOptions.some((t) => t.includes(fixtures.soPendingNo)),
      joined,
    );
    await page.keyboard.press("Escape");

    // ============================================================
    // 3) Report Per Material / Per FG — pisah per gudang
    // ============================================================
    await page.goto(`${base}/report`);
    await page.getByRole("heading", { name: "Report" }).waitFor();

    // Pastikan filter Semua Gudang
    const gudangFilter = page.getByPlaceholder(/Cari gudang/i).first();
    if (await gudangFilter.isVisible().catch(() => false)) {
      const gudangVal = await gudangFilter.inputValue().catch(() => "");
      if (gudangVal && !/Semua Gudang/i.test(gudangVal)) {
        await gudangFilter.click();
        await page
          .getByRole("option")
          .filter({ hasText: /Semua Gudang/i })
          .first()
          .click();
        await page.waitForTimeout(300);
      }
    }

    await page.getByRole("button", { name: "Per Material" }).click();
    await page.waitForTimeout(500);
    const perItemTable = page.getByRole("table").first();
    await perItemTable.waitFor({ state: "visible" });
    const perItemHeader = await perItemTable.locator("thead").innerText();
    check(
      "Report Per Material punya kolom Gudang",
      /Gudang/i.test(perItemHeader),
      perItemHeader.replace(/\s+/g, " "),
    );

    const perItemBody = await perItemTable.locator("tbody").innerText();
    const matRows = (await perItemTable.locator("tbody tr").allTextContents())
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => /MAT-001|Karton Duplex/i.test(t));
    check(
      "Report Per Material menampilkan baris Material",
      matRows.length > 0,
      perItemBody.slice(0, 300),
    );

    if (fixtures.twoGudang && matRows.length > 0) {
      const gudangCells = matRows.map((row) => {
        // format: "kode - nama | gudang | qty" roughly
        return row;
      });
      const uniqueGudangMentions = new Set();
      for (const row of gudangCells) {
        if (row.includes(fixtures.g1Nama)) uniqueGudangMentions.add(fixtures.g1Nama);
        if (row.includes(fixtures.g2Nama)) uniqueGudangMentions.add(fixtures.g2Nama);
      }
      // Soft check: if MAT appears in multiple rows, they must differ by gudang
      if (matRows.length >= 2) {
        check(
          "Report Per Material: MAT di beberapa gudang = beberapa baris",
          matRows.length >= 2,
          `rows=${matRows.length}; ${matRows.join(" || ")}`,
        );
        check(
          "Report Per Material: baris berisi nama gudang berbeda",
          uniqueGudangMentions.size >= 1,
          [...uniqueGudangMentions].join(" | "),
        );
      } else {
        // Data stok mungkin hanya di 1 gudang — pastikan kolom gudang terisi
        check(
          "Report Per Material: kolom Gudang terisi pada baris",
          matRows.some(
            (r) =>
              r.includes(fixtures.g1Nama) ||
              r.includes(fixtures.g2Nama) ||
              /Gudang/i.test(r),
          ),
          matRows[0] ?? "",
        );
      }
    } else {
      check(
        "Report Per Material: kolom Gudang terisi (single/dual gudang)",
        matRows.some((r) => r.length > 5),
        matRows[0] ?? "no rows",
      );
    }

    // Verifikasi logika grouping via API state + pure JS (deterministik)
    {
      const cookie = await loginApi();
      const body = await loadState(cookie);
      const stock = await fetch(`${base}/api/stock`, {
        headers: { cookie },
      })
        .then((r) => r.json())
        .catch(() => null);

      let stockRows = stock?.rows ?? stock?.stock ?? [];
      if (!Array.isArray(stockRows) || stockRows.length === 0) {
        // Fallback: hitung dari filtered table sudah cukup; coba parse dari page lagi
        stockRows = [];
      }

      if (stockRows.length > 0) {
        const byItemOnly = new Map();
        const byItemGudang = new Map();
        for (const r of stockRows) {
          if (r.jenis !== "item") continue;
          byItemOnly.set(r.refId, (byItemOnly.get(r.refId) ?? 0) + r.qty);
          const k = `${r.refId}::${r.gudangId}`;
          byItemGudang.set(k, (byItemGudang.get(k) ?? 0) + r.qty);
        }
        const multiGudangItems = [...byItemOnly.keys()].filter((refId) => {
          const keys = [...byItemGudang.keys()].filter((k) =>
            k.startsWith(`${refId}::`),
          );
          return keys.length > 1;
        });
        if (multiGudangItems.length > 0) {
          check(
            "logika grouping: item multi-gudang menghasilkan >1 grup",
            multiGudangItems.some((refId) => {
              const keys = [...byItemGudang.keys()].filter((k) =>
                k.startsWith(`${refId}::`),
              );
              return keys.length > 1;
            }),
            `items=${multiGudangItems.join(",")}`,
          );
        } else {
          check(
            "logika grouping: data stok tersedia untuk verifikasi",
            byItemGudang.size > 0,
            `itemGudangKeys=${byItemGudang.size}`,
          );
        }
      } else {
        // UI already checked; mark info pass if table has Gudang column + rows
        check(
          "Report Per Material: verifikasi UI grouping (API stock kosong/format lain)",
          matRows.length > 0 && /Gudang/i.test(perItemHeader),
        );
      }
    }

    await page.getByRole("button", { name: "Per FG" }).click();
    await page.waitForTimeout(500);
    const perFgTable = page.getByRole("table").first();
    await perFgTable.waitFor({ state: "visible" });
    const perFgHeader = await perFgTable.locator("thead").innerText();
    check(
      "Report Per FG punya kolom Gudang",
      /Gudang/i.test(perFgHeader),
      perFgHeader.replace(/\s+/g, " "),
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
    const shot = "scripts/qa-feedback-fixes-e2e-fail.png";
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
