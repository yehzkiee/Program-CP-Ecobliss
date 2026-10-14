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
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    const unsubscribe = useAuthStore.persist.onFinishHydration(finish);
    if (useAuthStore.persist.hasHydrated()) finish();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated || !userId) {
      setDataReady(false);
      return;
    }
    let cancelled = false;
    setDataReady(false);
    void (async () => {
      const res = await fetch(withBasePath("/api/auth/me"));
      if (cancelled) return;
      if (!res.ok) {
        useAuthStore.getState().logout();
        return;
      }
      await useDataStore.persist.rehydrate();
      if (!useDataStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsubscribe = useDataStore.persist.onFinishHydration(() => {
            unsubscribe();
            resolve();
          });
          if (useDataStore.persist.hasHydrated()) {
            unsubscribe();
            resolve();
          }
        });
      }
      if (!cancelled) setDataReady(true);
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

  if (
    !hydrated ||
    (!user && pathname !== "/login") ||
    (user && pathname !== "/login" && !dataReady)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Memuat...
      </div>
    );
  }

  return <>{children}</>;
}
