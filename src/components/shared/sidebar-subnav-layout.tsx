import { cn } from "@/lib/utils";

/** Two-column layout: fixed-width sidebar (~250px) + main content. */
export function SidebarSubnavLayout({
  sidebar,
  children,
  className,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-6 md:grid-cols-[250px_minmax(0,1fr)]",
        className,
      )}
    >
      <aside className="w-full shrink-0 md:sticky md:top-[4.5rem] md:self-start">
        {sidebar}
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function SidebarNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl border border-border/80 bg-white p-3",
        className,
      )}
    >
      {children}
    </nav>
  );
}

export function SidebarNavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex w-full flex-col gap-0.5">{children}</div>
    </div>
  );
}

export function SidebarNavItem({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "w-full rounded-md px-3 text-left transition-colors",
        description ? "flex flex-col gap-0.5 py-2.5" : "py-2",
        active
          ? "bg-emerald-700/10 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-700/25"
          : "font-medium text-slate-700 hover:bg-muted/60",
      )}
    >
      <span className="block text-sm leading-snug">{label}</span>
      {description ? (
        <span className="block text-xs font-normal leading-snug text-muted-foreground">
          {description}
        </span>
      ) : null}
    </button>
  );
}
