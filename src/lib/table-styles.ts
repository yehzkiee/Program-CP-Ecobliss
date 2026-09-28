/** Shared table layout tokens — keep th/td padding identical for column alignment. */

export const tableShellClass =
  "w-full table-fixed border-collapse text-sm";

export const tableHeadCellClass =
  "px-3 py-2.5 text-left align-middle text-xs font-medium tracking-normal text-muted-foreground";

export const tableHeadCellRightClass =
  "px-3 py-2.5 text-right align-middle text-xs font-medium tracking-normal text-muted-foreground";

export const tableBodyCellClass =
  "px-3 py-2.5 align-middle text-sm text-foreground";

export const tableBodyCellRightClass =
  "px-3 py-2.5 align-middle text-right text-sm tabular-nums text-foreground";

export const tableBodyCellMutedClass =
  "px-3 py-2.5 align-middle text-sm text-muted-foreground";

/** Kode / Nama / Status — detail pages (customer related lists). */
export const colGroupKodeNamaStatus = ["w-[28%]", "w-auto", "w-[120px]"] as const;

/** Batch history on material detail. */
export const colGroupBatchHistory = [
  "w-[120px]",
  "w-[130px]",
  "w-[120px]",
  "w-[140px]",
  "w-[100px]",
  "w-[100px]",
  "w-auto",
] as const;

/** BTB/BKB line items in view mode. */
export const colGroupDocLineItems = [
  "w-[28%]",
  "w-[22%]",
  "w-[12%]",
  "w-[16%]",
  "w-auto",
] as const;

/** Adjustment line items. */
export const colGroupAdjustmentLines = [
  "w-[72px]",
  "w-[120px]",
  "w-auto",
  "w-[80px]",
  "w-[80px]",
  "w-[80px]",
  "w-[140px]",
] as const;

/** Stock opname worksheet (with batch column). */
export const colGroupOpnameWithBatch = [
  "w-[72px]",
  "w-[120px]",
  "w-auto",
  "w-[120px]",
  "w-[140px]",
  "w-[120px]",
  "w-[96px]",
  "w-[96px]",
  "w-[96px]",
] as const;

/** Stock opname worksheet (without batch column). */
export const colGroupOpnameWithoutBatch = [
  "w-[72px]",
  "w-[120px]",
  "w-auto",
  "w-[140px]",
  "w-[120px]",
  "w-[96px]",
  "w-[96px]",
  "w-[96px]",
] as const;

/** Dashboard stock snapshot. */
export const colGroupDashboardStock = [
  "w-[24%]",
  "w-auto",
  "w-[20%]",
  "w-[96px]",
] as const;
