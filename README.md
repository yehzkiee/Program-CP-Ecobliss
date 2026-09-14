# Program-CP (Ecobliss)

Sistem Stock Inventory Material & Finish Good — **Fase 1 UI/UX** dengan Next.js + mock data (tanpa backend/database).

## Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Akun demo

| Username | Password  | Role      |
|----------|-----------|-----------|
| admin    | admin123  | Admin     |
| andry    | andry123  | Non-Admin |
| gudang1  | gudang123 | Non-Admin |

Toggle role di sidebar untuk demo approval Adjustment.

## Modul

- Master: Customer, Material, Finish Good, BOM (+ revisi)
- Transaksi: BTB, BKB (trace BTB + BOM), Stock Opname, Adjustment, Transfer
- Report (9 laporan, tanpa Aging Stock)
- Setting: User/Role, Gudang, Jenis Transaksi, Activity Log
- Print: BOM, BTB, BKB, Rekap Opname
