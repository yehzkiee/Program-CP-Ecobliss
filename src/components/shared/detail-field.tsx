import Link from "next/link";
import { cn } from "@/lib/utils";

export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm text-slate-900">
        {value === "" || value === null || value === undefined ? "-" : value}
      </div>
    </div>
  );
}

export function DocLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-emerald-800 underline-offset-2 hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}
