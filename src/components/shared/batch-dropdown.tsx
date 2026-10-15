"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NamedBatch } from "@/lib/batches";

type BatchDropdownProps = {
  options: NamedBatch[];
  value: string;
  label: string;
  suggestedName: string;
  onValueChange: (value: string) => void;
  onCreate: (name: string) => void;
  disabled?: boolean;
};

export function BatchDropdown({
  options,
  value,
  label,
  suggestedName,
  onValueChange,
  onCreate,
  disabled = false,
}: BatchDropdownProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(suggestedName);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, creating]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setCreating(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setCreating(false);
  }

  function startCreate() {
    setDraft(suggestedName);
    setCreating(true);
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    close();
  }

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            style={{ top: box.top, left: box.left, width: box.width }}
            className="fixed z-50 min-w-56 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {options.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Belum ada batch.
                </p>
              ) : (
                options.map((option) => {
                  const selected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "relative flex w-full items-center rounded-md py-2 pr-8 pl-3 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                        selected && "bg-accent/60",
                      )}
                      onClick={() => {
                        onValueChange(option.value);
                        close();
                      }}
                    >
                      <span className="truncate">{option.label}</span>
                      {selected ? (
                        <CheckIcon className="pointer-events-none absolute right-2 size-4" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t p-1">
              {creating ? (
                <form className="flex items-center gap-1 p-1" onSubmit={submitCreate}>
                  <Input
                    autoFocus
                    className="min-w-0 flex-1"
                    value={draft}
                    aria-label="Nama batch baru"
                    placeholder="Nama batch"
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="shrink-0 bg-emerald-700 hover:bg-emerald-800"
                  >
                    Buat
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={startCreate}
                >
                  <Plus className="size-4 shrink-0" />
                  Buat batch baru
                </button>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex h-8 w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          if (disabled) return;
          setOpen((current) => {
            if (current) setCreating(false);
            return !current;
          });
        }}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !label && "text-muted-foreground",
          )}
        >
          {label || "Pilih batch"}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {panel}
    </div>
  );
}
