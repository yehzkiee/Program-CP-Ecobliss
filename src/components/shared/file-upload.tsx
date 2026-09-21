"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  id: string;
  name: string;
  /** data URL for local preview / mock persistence */
  dataUrl: string;
};

type FileUploadProps = {
  label?: string;
  hint?: string;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  accept?: string;
  maxFiles?: number;
  className?: string;
};

export function FileUpload({
  label = "Foto bukti",
  hint = "Unggah foto bukti fisik (JPG, PNG). Maks. beberapa file.",
  files,
  onChange,
  disabled = false,
  accept = "image/jpeg,image/png,image/webp",
  maxFiles = 5,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(list: FileList | null) {
    if (!list || disabled) return;
    const remaining = Math.max(0, maxFiles - files.length);
    const picked = Array.from(list).slice(0, remaining);
    const next: UploadedFile[] = [];
    for (const file of picked) {
      const dataUrl = await readAsDataUrl(file);
      next.push({
        id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        dataUrl,
      });
    }
    if (next.length) onChange([...files, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : null}
      <div
        className={cn(
          "rounded-lg border border-dashed border-border/80 bg-muted/20 p-3",
          disabled && "opacity-60",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || files.length >= maxFiles}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Pilih foto
          </Button>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            disabled={disabled}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        {files.length > 0 && (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((f) => (
              <li
                key={f.id}
                className="relative overflow-hidden rounded-md border bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.dataUrl}
                  alt={f.name}
                  className="h-28 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="truncate text-xs text-slate-700">
                    {f.name}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => remove(f.id)}
                      aria-label={`Hapus ${f.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
