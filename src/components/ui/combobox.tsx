"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchableComboboxItem = {
  value: string
  label: string
}

const RESULT_LIMIT = 100

type SearchableComboboxProps<T extends SearchableComboboxItem> = {
  items: T[]
  value: string
  onValueChange: (value: string) => void
  /** Return true when `item` matches the typed query. Query is already trimmed. */
  filterItem: (item: T, query: string) => boolean
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  renderItem?: (item: T) => React.ReactNode
}

function SearchableCombobox<T extends SearchableComboboxItem>({
  items,
  value,
  onValueChange,
  filterItem,
  placeholder = "Cari...",
  emptyText = "Tidak ada hasil",
  disabled = false,
  className,
  renderItem,
}: SearchableComboboxProps<T>) {
  const [query, setQuery] = React.useState("")
  const [trackedValue, setTrackedValue] = React.useState(value)
  const typingRef = React.useRef(false)
  const filterItemRef = React.useRef(filterItem)
  filterItemRef.current = filterItem

  if (value !== trackedValue) {
    setTrackedValue(value)
    if (trackedValue && !value && !typingRef.current) {
      setQuery("")
    }
    typingRef.current = false
  }

  const selected = React.useMemo(
    () => items.find((item) => item.value === value) ?? null,
    [items, value],
  )

  const { visible, hint } = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const browsing =
      q.length === 0 ||
      (selected != null && q === selected.label.trim().toLowerCase())
    const matched = browsing
      ? items
      : items.filter((item) => filterItemRef.current(item, query.trim()))
    let visibleItems = matched.slice(0, RESULT_LIMIT)
    if (
      selected &&
      matched.some((item) => item.value === selected.value) &&
      !visibleItems.some((item) => item.value === selected.value)
    ) {
      visibleItems = [selected, ...visibleItems.slice(0, RESULT_LIMIT - 1)]
    }

    let hintText: string | null = null
    if (browsing && items.length > visibleItems.length) {
      hintText = `Menampilkan ${visibleItems.length} dari ${items.length} barang. Ketik kode atau nama untuk mencari.`
    } else if (!browsing && matched.length > visibleItems.length) {
      hintText = `Menampilkan ${visibleItems.length} dari ${matched.length} hasil. Perjelas pencarian.`
    }

    return { visible: visibleItems, hint: hintText }
  }, [items, query, selected])

  return (
    <ComboboxPrimitive.Root
      items={visible}
      value={selected}
      inputValue={query}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
      onInputValueChange={(next, details) => {
        setQuery(next)
        if (details.reason === "input-change") {
          typingRef.current = true
          onValueChange("")
        }
      }}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={() => true}
      autoHighlight
      disabled={disabled}
    >
      <ComboboxPrimitive.InputGroup className="relative w-full">
        <ComboboxPrimitive.Input
          disabled={disabled}
          placeholder={placeholder}
          data-slot="combobox-input"
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
            className,
          )}
        />
        <ComboboxPrimitive.Trigger
          type="button"
          disabled={disabled}
          aria-label="Buka daftar"
          className="absolute top-1/2 right-1 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <ChevronDownIcon className="size-4" />
        </ComboboxPrimitive.Trigger>
      </ComboboxPrimitive.InputGroup>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            className="relative z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <ComboboxPrimitive.List className="max-h-72 overflow-y-auto overscroll-contain p-1 data-empty:p-0">
              {(item: T) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-left text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <span className="whitespace-normal">
                    {renderItem ? renderItem(item) : item.label}
                  </span>
                  <ComboboxPrimitive.ItemIndicator
                    render={
                      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                    }
                  >
                    <CheckIcon className="pointer-events-none size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
            <ComboboxPrimitive.Empty className="px-2 py-1.5 text-center text-sm text-muted-foreground empty:p-0">
              {emptyText}
            </ComboboxPrimitive.Empty>
            {hint ? (
              <p className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                {hint}
              </p>
            ) : null}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { SearchableCombobox }
