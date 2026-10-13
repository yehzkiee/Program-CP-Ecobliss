const base = "http://localhost:3000";
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`PASS  ${name}`);
    return;
  }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function client() {
  let cookie = "";
  return {
    async req(path, options = {}) {
      const headers = { ...(options.headers ?? {}) };
      if (cookie) headers.cookie = cookie;
      if (options.body) headers["content-type"] = "application/json";
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
      return { status: res.status, json, text };
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

function duplicates(values) {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

async function login(username, password) {
  const api = client();
  const res = await api.req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return { api, res };
}

const stamp = Date.now();
const ids = {
  customer: `qa-c-${stamp}`,
  item: `qa-i-${stamp}`,
  fg: `qa-f-${stamp}`,
  btb: `qa-btb-${stamp}`,
  bkb: `qa-bkb-${stamp}`,
  transfer: `qa-tf-${stamp}`,
  opname: `qa-so-${stamp}`,
  adjPending: `qa-adj-p-${stamp}`,
  adjReject: `qa-adj-r-${stamp}`,
  adjOk: `qa-adj-ok-${stamp}`,
};

async function main() {
  const bad = await login("admin", "salah");
  check("password salah ditolak", bad.res.status === 401, String(bad.res.status));

  const anon = client();
  const anonState = await anon.req("/api/state");
  check("tanpa login tidak bisa baca data", anonState.status === 401);

  const { api, res: adminLogin } = await login("admin", "admin123");
  check(
    "login admin",
    adminLogin.status === 200 && adminLogin.json?.user?.role === "admin",
  );

  const me = await api.req("/api/auth/me");
  check("session terbaca", me.status === 200 && me.json?.user?.username === "admin");

  const loaded = await api.req("/api/state");
  check("state setelah login", loaded.status === 200 && loaded.json?.state);
  const state = loaded.json.state;
  const revAwal = loaded.json.revision;
  check("revisi dataset dilaporkan", typeof revAwal === "number", String(revAwal));

  // Dua orang menyimpan bersamaan: penyimpan dengan revisi lama harus ditolak,
  // bukan menimpa data yang baru saja disimpan orang lain.
  const staleDraft = structuredClone(state);
  staleDraft.customers.unshift({
    id: `qa-c-stale-${stamp}`,
    kode: `QA-STALE-${stamp}`,
    nama: "QA Revisi Lama",
  });
  const stalePut = await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({
      state: staleDraft,
      version: 6,
      revision: revAwal - 1,
    }),
  });
  check(
    "simpan dengan revisi lama ditolak",
    stalePut.status === 409,
    String(stalePut.status),
  );
  const afterStale = await api.req("/api/state");
  check(
    "data dari revisi lama tidak ikut tersimpan",
    !afterStale.json.state.customers.some(
      (row) => row.id === `qa-c-stale-${stamp}`,
    ),
  );
  check(
    "revisi tidak berubah setelah penolakan",
    afterStale.json.revision === revAwal,
    `${afterStale.json.revision} vs ${revAwal}`,
  );

  const customerIds = new Set(state.customers.map((row) => row.id));
  const itemIds = new Set(state.items.map((row) => row.id));
  const fgIds = new Set(state.finishGoods.map((row) => row.id));
  const orphanFg = state.finishGoods.filter((row) => !customerIds.has(row.customerId));
  const orphanBomFg = state.boms.filter((row) => row.fgId && !fgIds.has(row.fgId));
  const orphanBtbItem = state.btbs.flatMap((doc) =>
    (doc.items ?? []).filter((line) => !itemIds.has(line.itemId)),
  );
  check("customer impor ada", state.customers.length >= 393, String(state.customers.length));
  check(
    "finish good impor ada",
    state.finishGoods.length >= 2694,
    String(state.finishGoods.length),
  );
  check("finish good punya customer", orphanFg.length === 0, String(orphanFg.length));
  check("kode customer unik", duplicates(state.customers.map((row) => row.kode)).length === 0);
  check(
    "kode finish good unik",
    duplicates(state.finishGoods.map((row) => row.kode)).length === 0,
  );
  check("BOM demo masih menunjuk FG", orphanBomFg.length === 0, String(orphanBomFg.length));
  check("baris BTB menunjuk material", orphanBtbItem.length === 0, String(orphanBtbItem.length));
  check(
    "password tidak dikirim ke browser",
    state.users.every((row) => !row.password),
  );

  const jenisBtb = state.jenisTransaksiList.find((row) => row.untuk !== "bkb");
  const jenisBkb = state.jenisTransaksiList.find((row) => row.untuk !== "btb");
  check("jenis transaksi BTB/BKB ada", Boolean(jenisBtb && jenisBkb));

  const before = await api.req("/api/stock");
  const batch = "QA-BATCH";
  const startQty = qty(before.json, ids.item, "g1", batch);

  state.customers.unshift({
    id: ids.customer,
    kode: `QA-${stamp}`,
    nama: "QA Integrasi",
  });
  state.items.unshift({
    id: ids.item,
    kode: `QA-MAT-${stamp}`,
    nama: "QA Material",
    customerId: ids.customer,
    kategori: "QA",
    uom1: "PCS",
    konversi1: 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
    batchCustomer: batch,
    status: "aktif",
  });
  state.finishGoods.unshift({
    id: ids.fg,
    kode: `QA-FG-${stamp}`,
    nama: "QA Finish Good",
    customerId: ids.customer,
    kategori: "Finish Good",
    batchCustomer: batch,
    uom1: "PCS",
    konversi1: 1,
    uom2: "",
    konversi2: 0,
    uom3: "",
    konversi3: 0,
    status: "aktif",
  });
  state.btbs.unshift({
    id: ids.btb,
    no: `BTB-QA-${stamp}`,
    tanggalTerima: "2026-10-09",
    jenisTransaksiId: jenisBtb.id,
    customerId: ids.customer,
    keterangan: "QA",
    items: [
      {
        itemId: ids.item,
        batchCustomer: batch,
        qty: 100,
        satuan: "PCS",
        gudangId: "g1",
        keterangan: "QA masuk",
        qtySisa: 100,
      },
    ],
    fgs: [],
    createdAt: "2026-10-09T01:00:00.000Z",
  });
  state.bkbs.unshift({
    id: ids.bkb,
    no: `BKB-QA-${stamp}`,
    tanggalKeluar: "2026-10-09",
    jenisTransaksiId: jenisBkb.id,
    noSpk: "QA",
    keterangan: "QA",
    items: [
      {
        itemId: ids.item,
        btbId: ids.btb,
        btbNo: `BTB-QA-${stamp}`,
        btbTanggalTerima: "2026-10-09",
        batchCustomer: batch,
        qty: 40,
        satuan: "PCS",
        gudangId: "g1",
        keterangan: "QA keluar",
      },
    ],
    fgs: [],
    createdAt: "2026-10-09T02:00:00.000Z",
  });
  state.transfers.unshift({
    id: ids.transfer,
    no: `TG-QA-${stamp}`,
    tanggal: "2026-10-09",
    keterangan: "QA",
    lines: [
      {
        jenis: "item",
        refId: ids.item,
        kode: `QA-MAT-${stamp}`,
        nama: "QA Material",
        qty: 10,
        dariGudangId: "g1",
        keGudangId: "g2",
        keterangan: "QA pindah",
      },
    ],
    createdAt: "2026-10-09T03:00:00.000Z",
  });
  state.stockOpnames.unshift({
    id: ids.opname,
    no: `SO-QA-${stamp}`,
    tanggal: "2026-10-09",
    lines: [],
    keterangan: "QA",
    createdAt: "2026-10-09T04:00:00.000Z",
  });
  state.adjustments.unshift(
    {
      id: ids.adjPending,
      no: `ADJ-QA-P-${stamp}`,
      tanggal: "2026-10-09",
      stockOpnameId: ids.opname,
      stockOpnameNo: `SO-QA-${stamp}`,
      lines: [
        {
          jenis: "item",
          refId: ids.item,
          kode: `QA-MAT-${stamp}`,
          nama: "QA Material",
          qty: 5,
          out: 5,
          in: 0,
          keterangan: "belum disetujui",
        },
      ],
      status: "menunggu_approval",
      keterangan: "QA",
      createdAt: "2026-10-09T05:00:00.000Z",
    },
    {
      id: ids.adjReject,
      no: `ADJ-QA-R-${stamp}`,
      tanggal: "2026-10-09",
      stockOpnameId: ids.opname,
      stockOpnameNo: `SO-QA-${stamp}`,
      lines: [
        {
          jenis: "item",
          refId: ids.item,
          kode: `QA-MAT-${stamp}`,
          nama: "QA Material",
          qty: 7,
          out: 7,
          in: 0,
          keterangan: "ditolak",
        },
      ],
      status: "ditolak",
      keterangan: "QA",
      createdAt: "2026-10-09T05:10:00.000Z",
    },
    {
      id: ids.adjOk,
      no: `ADJ-QA-OK-${stamp}`,
      tanggal: "2026-10-09",
      stockOpnameId: ids.opname,
      stockOpnameNo: `SO-QA-${stamp}`,
      lines: [
        {
          jenis: "item",
          refId: ids.item,
          kode: `QA-MAT-${stamp}`,
          nama: "QA Material",
          qty: 15,
          out: 15,
          in: 0,
          keterangan: "disetujui",
        },
      ],
      status: "disetujui",
      keterangan: "QA",
      createdAt: "2026-10-09T06:00:00.000Z",
    },
  );

  const saved = await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state, version: 6, revision: revAwal }),
  });
  check("simpan transaksi QA", saved.status === 200, String(saved.status));
  check(
    "revisi naik setelah simpan",
    saved.json?.revision === revAwal + 1,
    `${saved.json?.revision} vs ${revAwal + 1}`,
  );

  const again = await api.req("/api/state");
  const savedCustomer = again.json.state.customers.find((row) => row.id === ids.customer);
  const savedBtb = again.json.state.btbs.find((row) => row.id === ids.btb);
  check("customer QA tersimpan", savedCustomer?.nama === "QA Integrasi");
  check("BTB QA tersimpan", savedBtb?.items?.[0]?.qty === 100);

  const stock = await api.req("/api/stock");
  const g1 = qty(stock.json, ids.item, "g1", batch);
  const g2 = qty(stock.json, ids.item, "g2", batch);
  // 100 masuk - 40 keluar - 10 transfer - 15 adjustment disetujui = 35 di g1, 10 di g2
  check(
    "stok gudang asal setelah mutasi",
    g1 === startQty + 35,
    `dapat ${g1}, harap ${startQty + 35}`,
  );
  check(
    "stok gudang tujuan transfer",
    g2 === 10,
    `dapat ${g2}`,
  );

  const gudang = await login("gudang1", "gudang123");
  check("login non-admin", gudang.res.status === 200 && gudang.res.json?.user?.role === "user");
  const gudangState = await gudang.api.req("/api/state");
  const userDraft = structuredClone(gudangState.json.state);
  userDraft.customers.unshift({
    id: `qa-c-user-${stamp}`,
    kode: `QA-U-${stamp}`,
    nama: "QA Simpan User",
  });
  const userSave = await gudang.api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state: userDraft, version: 6 }),
  });
  check("non-admin tetap bisa menyimpan master", userSave.status === 200, String(userSave.status));

  const pending = gudangState.json.state.adjustments.find((row) => row.id === ids.adjPending);
  if (pending) pending.status = "disetujui";
  const sneak = await gudang.api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state: gudangState.json.state, version: 6 }),
  });
  const afterSneak = await api.req("/api/state");
  const pendingAfter = afterSneak.json.state.adjustments.find((row) => row.id === ids.adjPending);
  check(
    "non-admin tidak bisa menyetujui adjustment",
    sneak.status === 403 || pendingAfter?.status === "menunggu_approval",
    `status HTTP ${sneak.status}, status dokumen ${pendingAfter?.status}`,
  );
  const roleEscalation = structuredClone(gudangState.json.state);
  const self = roleEscalation.users.find((row) => row.username === "gudang1");
  if (self) self.role = "admin";
  const roleTry = await gudang.api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state: roleEscalation, version: 6 }),
  });
  const roles = await api.req("/api/state");
  const gudangUser = roles.json.state.users.find((row) => row.username === "gudang1");
  check(
    "non-admin tidak bisa mengubah role",
    roleTry.status === 403 && gudangUser?.role === "user",
    `HTTP ${roleTry.status}, role ${gudangUser?.role}`,
  );

  const importTry = await gudang.api.req("/api/import/ecobliss", { method: "POST" });
  check("non-admin tidak bisa impor", importTry.status === 401 || importTry.status === 403);

  const andry = await login("andry", "andry123");
  check("password andry tetap berlaku setelah simpan", andry.res.status === 200);

  for (const path of [
    "/login",
    "/dashboard",
    "/master/customer",
    "/master/item",
    "/master/finish-good",
    "/master/bom",
    "/transaksi/btb",
    "/transaksi/bkb",
    "/transaksi/transfer",
    "/transaksi/stock-opname",
    "/transaksi/adjustment",
    "/report",
    "/setting",
  ]) {
    const page = await anon.req(path);
    check(`halaman ${path} merespons`, page.status === 200, String(page.status));
  }

  // Halaman detail dan halaman cetak: dipakai operator tiap hari, jadi ikut dijaga.
  const detailPaths = [
    state.items[0]?.id ? `/master/item/${state.items[0].id}` : null,
    state.customers[0]?.id ? `/master/customer/${state.customers[0].id}` : null,
    state.finishGoods[0]?.id
      ? `/master/finish-good/${state.finishGoods[0].id}`
      : null,
    state.boms[0]?.id ? `/master/bom/${state.boms[0].id}` : null,
    `/transaksi/btb/${ids.btb}`,
    `/transaksi/bkb/${ids.bkb}`,
    `/transaksi/transfer/${ids.transfer}`,
    `/transaksi/stock-opname/${ids.opname}`,
    `/transaksi/adjustment/${ids.adjOk}`,
    `/print/btb/${ids.btb}`,
    `/print/bkb/${ids.bkb}`,
    state.boms[0]?.id ? `/print/bom/${state.boms[0].id}` : null,
    "/print/opname/rekap",
  ].filter(Boolean);

  for (const path of detailPaths) {
    const page = await anon.req(path);
    check(`halaman ${path} merespons`, page.status === 200, String(page.status));
  }
}

async function cleanup() {
  const { api, res } = await login("admin", "admin123");
  if (res.status !== 200) return;
  const loaded = await api.req("/api/state");
  const state = loaded.json?.state;
  if (!state) return;
  const drop = (row) => !String(row.id).startsWith("qa-");
  state.customers = state.customers.filter(drop);
  state.items = state.items.filter(drop);
  state.finishGoods = state.finishGoods.filter(drop);
  state.btbs = state.btbs.filter(drop);
  state.bkbs = state.bkbs.filter(drop);
  state.transfers = state.transfers.filter(drop);
  state.stockOpnames = state.stockOpnames.filter(drop);
  state.adjustments = state.adjustments.filter(drop);
  await api.req("/api/state", {
    method: "PUT",
    body: JSON.stringify({ state, version: 6 }),
  });
}

try {
  await main();
} finally {
  await cleanup();
  console.log(failures.length ? `\n${failures.length} gagal` : "\nSemua pemeriksaan lulus");
  if (failures.length) process.exitCode = 1;
}
