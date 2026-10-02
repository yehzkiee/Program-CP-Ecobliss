import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatStatusLabel } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white/50 px-6 py-12 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const map: Record<string, string> = {
    aktif: "bg-emerald-100 text-emerald-800",
    nonaktif: "bg-slate-100 text-slate-600",
    draft: "bg-slate-100 text-slate-700",
    menunggu_approval: "bg-amber-100 text-amber-800",
    disetujui: "bg-emerald-100 text-emerald-800",
    ditolak: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        map[status] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function BackLink({
  href,
  label = "Kembali",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
