# Program-CP (Ecobliss)

Sistem Stock Inventory Material & Finish Good. Next.js (App Router) + API routes Node + SQLite.

## Kebutuhan

- Node.js >= 22.5. Di Node 22 modul `node:sqlite` masih memunculkan `ExperimentalWarning`, itu normal.
  Node 20 tidak punya modul ini sama sekali, aplikasi akan gagal start dengan `ERR_UNKNOWN_BUILTIN_MODULE`.
- npm

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

Data disimpan di `data/program-cp.sqlite` (tidak masuk git). Lokasi folder bisa dipindah dengan
env `PROGRAM_CP_DATA_DIR`, mis. di hosting diarahkan ke folder di luar `public_html` supaya file
database tidak bisa diunduh langsung dari web.

## Akun demo (seed awal)

| Username | Password  | Role      |
|----------|-----------|-----------|
| admin    | admin123  | Admin     |
| andry    | andry123  | Non-Admin |
| gudang1  | gudang123 | Non-Admin |

Ganti password ini sebelum dipakai klien.

## Impor master dari WMS Ecobliss

Login sebagai admin lalu `POST /api/import/ecobliss` (tombol impor ada di halaman Setting).
Sumber datanya API WMS, bisa diarahkan lewat env `ECOBLISS_API_BASE`
(default `https://foodgradepack.com/wms/api`). Hasil impor: customer + Finish Good.

## Uji integrasi

```bash
npm run qa
```

Prasyarat: aplikasi jalan di http://localhost:3000 dan impor Ecobliss sudah dilakukan (script
mengandaikan `customers >= 393` dan `finishGoods >= 2694`). Script menulis data uji ber-prefix
`qa-` lalu membersihkannya di akhir, jadi jangan diarahkan ke instance yang sedang dipakai klien.

Yang diperiksa: login dan session, akses tanpa login, penolakan simpan dengan revisi lama,
impor master, simpan BTB/BKB/transfer/opname/adjustment, hasil hitung stok dari ledger,
hak akses non-admin (tidak bisa menyetujui adjustment, mengubah role, atau impor), dan
respons 13 halaman utama.

## Cara data disimpan

- `GET /api/state` mengirim seluruh dataset + nomor `revision`.
- `PUT /api/state` menyimpan seluruh dataset dan wajib menyertakan `revision` terakhir yang dibaca.
  Kalau server sudah berubah, server menjawab 409 dan klien memuat ulang halaman supaya pekerjaan
  orang lain tidak tertimpa. Jangan hapus mekanisme ini selama penyimpanan masih borongan seperti ini.
- `stock_ledger` dan `stock_balance` dihitung ulang dari dokumen setiap kali menyimpan, dan stok
  dibaca dari `GET /api/stock`.

## Modul

- Master: Customer, Material, Finish Good, BOM (+ revisi)
- Transaksi: BTB, BKB (trace BTB + BOM), Stock Opname, Adjustment, Transfer
- Report (9 laporan, tanpa Aging Stock)
- Setting: User/Role, Gudang, Jenis Transaksi, Activity Log
- Print: BOM, BTB, BKB, Rekap Opname

## Login preset (form terisi otomatis)

Kalau hosting mengisi env `PROGRAM_CP_PRESET_USERNAME` dan `PROGRAM_CP_PRESET_PASSWORD`, halaman
login akan mengisi sendiri kedua kolom itu (diambil dari `GET /api/auth/preset`), jadi operator
tinggal menekan Masuk. Kalau env-nya kosong, form kosong dan daftar akun demo tampil seperti biasa.

Perlu diingat: nilai itu bisa dibaca siapa pun yang membuka halaman login, jadi anggap akun preset
sebagai akun bersama. Untuk membatasinya, pasang proteksi tambahan di `.htaccess` atau pakai akun
operator dengan role terbatas.

## Struktur singkat

```
src/app/            halaman (master, transaksi, print, report, setting) + src/app/api/* route API
src/server/         db.ts (SQLite + ledger stok), session.ts, import-ecobliss.ts
src/lib/store.ts    state klien (zustand) + sinkronisasi ke server
scripts/            qa-integrasi.mjs
```

## Catatan deploy cPanel

- Pilih Node.js 22 di cPanel (Node 20 tidak jalan).
- Isi `PROGRAM_CP_DATA_DIR` ke folder di luar `public_html`.
- `npm run build`, lalu jalankan aplikasi lewat fitur Node.js app cPanel.
