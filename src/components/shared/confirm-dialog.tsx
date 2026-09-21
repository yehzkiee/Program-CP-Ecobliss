"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const DEFAULTS: Required<ConfirmOptions> = {
  title: "Konfirmasi hapus",
  description: "Apakah Anda yakin ingin menghapus data ini?",
  confirmLabel: "Hapus",
  cancelLabel: "Batal",
  destructive: true,
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  confirmLabel = DEFAULTS.confirmLabel,
  cancelLabel = DEFAULTS.cancelLabel,
  destructive = DEFAULTS.destructive,
  onConfirm,
}: ConfirmOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className={
              destructive ? undefined : "bg-emerald-700 hover:bg-emerald-800"
            }
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Hook: call `askConfirm(fn, opts?)` then render `{confirmDialog}`. */
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Required<ConfirmOptions>>(DEFAULTS);
  const [action, setAction] = useState<(() => void) | null>(null);

  const askConfirm = useCallback(
    (onConfirm: () => void, opts?: ConfirmOptions) => {
      setOptions({ ...DEFAULTS, ...opts });
      setAction(() => onConfirm);
      setOpen(true);
    },
    [],
  );

  const confirmDialog = (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      destructive={options.destructive}
      onConfirm={() => action?.()}
    />
  );

  return { askConfirm, confirmDialog };
}
