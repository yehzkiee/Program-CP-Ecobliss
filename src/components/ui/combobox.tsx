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

function defaultFilterItem(item: SearchableComboboxItem, query: string) {
  return item.label.toLowerCase().includes(query.toLowerCase())
}

type SearchableComboboxProps<T extends SearchableComboboxItem> = {
  items: T[]
  value: string
  onValueChange: (value: string) => void
  /** Return true when `item` matches the typed query. Query is already trimmed. */
  filterItem?: (item: T, query: string) => boolean
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  /**
   * When false, typing only filters the list. The current value stays
   * until the user picks another item.
   */
  clearValueOnInput?: boolean
  /**
   * Keep the typed text, including an empty string, until the user clicks
   * a list item. Closing the field does not restore the selected label.
   */
  preserveSearchQuery?: boolean
  /** Noun used when the list is longer than the visible limit. */
  itemNoun?: string
  listClassName?: string
  itemClassName?: string
  /** Extra classes for the popup panel (width, max-width, etc.). */
  popupClassName?: string
  /** Extra classes for the text input inside the field. */
  inputClassName?: string
  renderItem?: (item: T) => React.ReactNode
  /**
   * Shown inside the field, beside the text and before the chevron, while the
   * user is not typing. Keep it short so the name keeps its own space.
   */
  endAdornment?: React.ReactNode
}

function SearchableComboboxInner<T extends SearchableComboboxItem>({
  items,
  value,
  onValueChange,
  filterItem = defaultFilterItem,
  placeholder = "Cari...",
  emptyText = "Tidak ada hasil",
  disabled = false,
  className,
  clearValueOnInput = false,
  preserveSearchQuery = true,
  itemNoun = "barang",
  listClassName,
  itemClassName,
  popupClassName,
  inputClassName,
  renderItem,
  endAdornment,
}: SearchableComboboxProps<T>) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState(false)
  const typingRef = React.useRef(false)
  const prevValueRef = React.useRef(value)

  const selected = React.useMemo(
    () => items.find((item) => item.value === value) ?? null,
    [items, value],
  )

  const idleLabel = selected?.label ?? ""

  // Sync label idle hanya saat value/selected berubah — jangan setState di render
  // (itu memicu re-render berantai setiap parent mengetik di field lain).
  React.useEffect(() => {
    const valueChanged = prevValueRef.current !== value
    prevValueRef.current = value
    if (valueChanged) {
      typingRef.current = false
      if (!value) {
        setQuery("")
        setEditing(false)
        return
      }
    }
    if (typingRef.current || editing) return
    setQuery((current) => (current === idleLabel ? current : idleLabel))
  }, [value, idleLabel, editing])

  const { visible, hint } = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const browsing =
      q.length === 0 ||
      (selected != null && q === selected.label.trim().toLowerCase())
    const matched = browsing
      ? items
      : items.filter((item) => filterItem(item, query.trim()))
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
      hintText = `Menampilkan ${visibleItems.length} dari ${items.length} ${itemNoun}. Ketik kode atau nama untuk mencari.`
    } else if (!browsing && matched.length > visibleItems.length) {
      hintText = `Menampilkan ${visibleItems.length} dari ${matched.length} hasil. Perjelas pencarian.`
    }

    return { visible: visibleItems, hint: hintText }
  }, [filterItem, itemNoun, items, query, selected])

  return (
    <ComboboxPrimitive.Root
      items={visible}
      value={selected}
      inputValue={query}
      onValueChange={(next, details) => {
        if (preserveSearchQuery && details.reason !== "item-press") {
          details.cancel()
          return
        }
        if (details.reason === "item-press") {
          typingRef.current = false
          setEditing(false)
          setQuery(next?.label ?? "")
        }
        onValueChange(next?.value ?? "")
      }}
      onOpenChange={(open) => {
        if (open) {
          requestAnimationFrame(() => inputRef.current?.select())
          return
        }
        setEditing(false)
      }}
      onInputValueChange={(next, details) => {
        if (
          details.reason === "input-change" ||
          (preserveSearchQuery && details.reason === "input-clear")
        ) {
          setQuery(next)
          setEditing(true)
          typingRef.current = true
          if (clearValueOnInput && details.reason === "input-change") {
            onValueChange("")
          }
          return
        }
        if (
          preserveSearchQuery &&
          typingRef.current &&
          details.reason !== "item-press"
        ) {
          return
        }
        setQuery(next)
        setEditing(false)
        typingRef.current = false
      }}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
      filter={() => true}
      autoHighlight
      disabled={disabled}
    >
      <ComboboxPrimitive.InputGroup
        className={cn(
          "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg border border-input bg-transparent pr-1 pl-2.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          disabled && "cursor-not-allowed bg-input/50 opacity-50",
          className,
        )}
      >
        <ComboboxPrimitive.Input
          ref={inputRef}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={(event) => event.currentTarget.select()}
          data-slot="combobox-input"
          title={idleLabel || undefined}
          className={cn(
            "h-full min-w-0 flex-1 truncate border-0 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
            inputClassName,
          )}
        />
        {endAdornment && !editing ? (
          <span className="flex shrink-0 items-center">{endAdornment}</span>
        ) : null}
        <ComboboxPrimitive.Trigger
          type="button"
          disabled={disabled}
          aria-label="Buka daftar"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
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
            className={cn(
              "relative z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              popupClassName,
            )}
          >
            <ComboboxPrimitive.List
              className={cn(
                "max-h-60 overflow-y-auto scroll-smooth overscroll-contain p-1 data-empty:p-0",
                listClassName,
              )}
            >
              {(item: T) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className={cn(
                    "relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-3 text-left text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                    itemClassName,
                  )}
                >
                  <span className="min-w-0 flex-1">
                    {renderItem ? (
                      renderItem(item)
                    ) : (
                      <span className="block truncate" title={item.label}>
                        {item.label}
                      </span>
                    )}
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

const SearchableCombobox = React.memo(
  SearchableComboboxInner,
) as typeof SearchableComboboxInner

export { SearchableCombobox }
