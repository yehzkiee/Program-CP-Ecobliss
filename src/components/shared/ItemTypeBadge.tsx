import type { ReactNode } from "react"
import { cn, formatJenisBarang } from "@/lib/utils"

/** `item` = Material, `fg` = Finish Good. Sumber yang sama dengan `formatJenisBarang`. */
export type ItemJenis = "item" | "fg"

export function ItemTypeBadge({
  jenis,
  className,
}: {
  jenis?: string | null
  className?: string
}) {
  if (jenis !== "item" && jenis !== "fg") return null

  const material = jenis === "item"

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        material
          ? "bg-blue-100 text-blue-800"
          : "bg-teal-100 text-teal-800",
        className,
      )}
    >
      {formatJenisBarang(jenis)}
    </span>
  )
}

/** Nama barang dengan badge tipe menempel di sampingnya. */
export function ItemNameWithType({
  children,
  jenis,
  className,
}: {
  children: ReactNode
  jenis?: string | null
  className?: string
}) {
  return (
    <span className={cn("inline-flex max-w-full min-w-0 flex-nowrap items-center gap-2", className)}>
      <span className="min-w-0 truncate">{children}</span>
      <ItemTypeBadge jenis={jenis} />
    </span>
  )
}
