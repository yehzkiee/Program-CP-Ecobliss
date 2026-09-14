"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(username, password);
    if (!ok) {
      toast.error("Username atau password salah");
      return;
    }
    toast.success("Berhasil masuk");
    router.push("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#d1fae5_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_#e2e8f0_0%,_transparent_45%),linear-gradient(160deg,#f8fafc,#ecfdf5)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,#94a3b822_1px,transparent_1px),linear-gradient(to_bottom,#94a3b822_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white/85 p-8 shadow-xl shadow-slate-900/5 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white">
            CP
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Program-CP
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ecobliss · Sistem Stock Inventory
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800">
            Masuk
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-slate-700">Akun demo:</p>
          <p>admin / admin123 (Admin)</p>
          <p>andry / andry123 (Non-Admin)</p>
          <p>gudang1 / gudang123 (Non-Admin)</p>
        </div>
      </div>
    </div>
  );
}
