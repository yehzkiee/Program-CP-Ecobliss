"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, useDataStore } from "@/lib/store";
import { stripBasePath, withBasePath } from "@/lib/base-path";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.currentUser);
  const userId = useAuthStore((s) => s.currentUser?.id ?? null);
  const router = useRouter();
  const pathname = stripBasePath(usePathname());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useAuthStore.persist.hasHydrated()) {
      finish();
    }
    return useAuthStore.persist.onFinishHydration(finish);
  }, []);

  useEffect(() => {
    if (!hydrated || !userId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(withBasePath("/api/auth/me"));
      if (cancelled) return;
      if (!res.ok) {
        useAuthStore.getState().logout();
        return;
      }
      await useDataStore.persist.rehydrate();
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (user && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [hydrated, user, pathname, router]);

  if (!hydrated || (!user && pathname !== "/login")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  return <>{children}</>;
}
