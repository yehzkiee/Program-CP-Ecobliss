"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { stripBasePath } from "@/lib/base-path";
import {
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Settings,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

const nav = [
  {
    label: "Utama",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Master Data",
    items: [
      { href: "/master/customer", label: "Customer", icon: Users },
      { href: "/master/item", label: "Material", icon: Package },
      { href: "/master/finish-good", label: "Finish Good", icon: Boxes },
      { href: "/master/bom", label: "BOM", icon: ClipboardList },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { href: "/transaksi/btb", label: "BTB", icon: PackagePlus },
      { href: "/transaksi/bkb", label: "BKB", icon: PackageMinus },
      { href: "/transaksi/stock-opname", label: "Stock Opname", icon: ClipboardCheck },
      { href: "/transaksi/adjustment", label: "Adjustment", icon: PackageCheck },
      { href: "/transaksi/transfer", label: "Transfer Gudang", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { href: "/report", label: "Report", icon: FileText },
      { href: "/setting", label: "Setting", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = stripBasePath(usePathname());
  const router = useRouter();
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  const isPrint = pathname.startsWith("/print");
  const isLogin = pathname === "/login";

  if (!user || isLogin || isPrint) {
    return <>{children}</>;
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white">
            CP
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Program-CP
            </p>
            <p className="text-xs text-muted-foreground">Ecobliss Inventory</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {nav.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-emerald-700/10 font-medium text-emerald-800"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 rounded-md bg-muted/60 px-3 py-2">
          <p className="text-sm font-medium">{user.nama}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role === "admin" ? "Super Admin" : "User"}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          Keluar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f8faf9_0%,#eef2f0_45%,#f5f7f6_100%)]">
      <ScrollToTop />
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/90 backdrop-blur md:block">
          {SidebarContent}
        </aside>

        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
              <div className="flex justify-end p-2">
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              {SidebarContent}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-white/80 px-4 backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Warehouse className="size-4 text-emerald-700" />
              <span className="hidden sm:inline">Sistem Stock Inventory</span>
              <span className="sm:hidden">Program-CP</span>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              Fase 1 · UI Mock
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
