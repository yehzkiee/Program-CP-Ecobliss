"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, StatusBadge } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarNav,
  SidebarNavItem,
  SidebarSubnavLayout,
} from "@/components/shared/sidebar-subnav-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataStore } from "@/lib/store";
import type { Gudang, JenisTransaksi, Role, User } from "@/lib/types";
import { formatDateTimeID, uid } from "@/lib/utils";
import { useConfirmDialog } from "@/components/shared/confirm-dialog";

const settingTabs = [
  { id: "users", label: "Users & Role", desc: "Akun dan hak akses" },
  { id: "gudang", label: "Gudang", desc: "Lokasi penyimpanan" },
  { id: "jenis", label: "Jenis Transaksi", desc: "Kategori BTB / BKB" },
  { id: "log", label: "Activity Log", desc: "Riwayat aktivitas" },
] as const;

export default function SettingPage() {
  const users = useDataStore((s) => s.users);
  const gudangList = useDataStore((s) => s.gudangList);
  const jenisList = useDataStore((s) => s.jenisTransaksiList);
  const { askConfirm, confirmDialog } = useConfirmDialog();
  const logs = useDataStore((s) => s.activityLogs);
  const upsertUser = useDataStore((s) => s.upsertUser);
  const upsertGudang = useDataStore((s) => s.upsertGudang);
  const deleteGudang = useDataStore((s) => s.deleteGudang);
  const upsertJenis = useDataStore((s) => s.upsertJenis);
  const deleteJenis = useDataStore((s) => s.deleteJenis);
  const resetDemo = useDataStore((s) => s.resetDemo);

  const [tab, setTab] = useState("users");
  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState<User>({
    id: "",
    username: "",
    nama: "",
    role: "user",
    password: "",
  });

  const [gudangOpen, setGudangOpen] = useState(false);
  const [gudangForm, setGudangForm] = useState<Gudang>({
    id: "",
    kode: "",
    nama: "",
    tipe: "lainnya",
  });

  const [jenisOpen, setJenisOpen] = useState(false);
  const [jenisForm, setJenisForm] = useState<JenisTransaksi>({
    id: "",
    kode: "",
    nama: "",
    untuk: "keduanya",
  });

  const active = settingTabs.find((t) => t.id === tab);

  return (
    <div>
      {confirmDialog}
      <PageHeader
        title="Setting & Hak Akses"
        description="User, role, gudang, jenis transaksi, dan log aktivitas (mock)."
        action={
          <Button
            variant="outline"
            onClick={() => {
              resetDemo();
              toast.success("Data demo di-reset");
            }}
          >
            Reset Data Demo
          </Button>
        }
      />

      <SidebarSubnavLayout
        sidebar={
          <SidebarNav>
            {settingTabs.map((t) => (
              <SidebarNavItem
                key={t.id}
                label={t.label}
                description={t.desc}
                active={tab === t.id}
                onClick={() => setTab(t.id)}
              />
            ))}
          </SidebarNav>
        }
      >
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          {active?.label}
        </h2>

        {tab === "users" && (
          <>
              <div className="mb-3 flex justify-end">
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => {
                    setUserForm({
                      id: uid("user"),
                      username: "",
                      nama: "",
                      role: "user",
                      password: "demo123",
                    });
                    setUserOpen(true);
                  }}
                >
                  Tambah User
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>{u.nama}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={u.role === "admin" ? "disetujui" : "draft"}
                          />{" "}
                          <span className="text-xs text-muted-foreground">
                            {u.role === "admin" ? "Super Admin" : "User"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserForm(u);
                              setUserOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Role Super Admin khusus untuk approval Adjustment. Demo: toggle role di
                sidebar.
              </p>
          </>
        )}

        {tab === "gudang" && (
          <>
              <div className="mb-3 flex justify-end">
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => {
                    setGudangForm({
                      id: uid("gd"),
                      kode: "",
                      nama: "",
                      tipe: "lainnya",
                    });
                    setGudangOpen(true);
                  }}
                >
                  Tambah Gudang
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gudangList.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.kode}</TableCell>
                        <TableCell>{g.nama}</TableCell>
                        <TableCell className="uppercase">{g.tipe}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGudangForm(g);
                              setGudangOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              askConfirm(() => {
                                deleteGudang(g.id);
                                toast.success("Gudang dihapus");
                              });
                            }}
                          >
                            Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </>
        )}

        {tab === "jenis" && (
          <>
              <div className="mb-3 flex justify-end">
                <Button
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => {
                    setJenisForm({
                      id: uid("jt"),
                      kode: "",
                      nama: "",
                      untuk: "keduanya",
                    });
                    setJenisOpen(true);
                  }}
                >
                  Tambah Jenis
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Untuk</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jenisList.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.kode}</TableCell>
                        <TableCell>{j.nama}</TableCell>
                        <TableCell className="uppercase">{j.untuk}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setJenisForm(j);
                              setJenisOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              askConfirm(() => {
                                deleteJenis(j.id);
                                toast.success("Jenis dihapus");
                              });
                            }}
                          >
                            Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </>
        )}

        {tab === "log" && (
          <>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Aksi</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{formatDateTimeID(l.waktu)}</TableCell>
                        <TableCell>{l.userNama}</TableCell>
                        <TableCell className="font-medium">{l.aksi}</TableCell>
                        <TableCell>{l.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </>
        )}
      </SidebarSubnavLayout>

      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={userForm.nama}
                onChange={(e) =>
                  setUserForm({ ...userForm, nama: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={userForm.role}
                onValueChange={(v) =>
                  setUserForm({ ...userForm, role: v as Role })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Super Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => {
                upsertUser(userForm);
                toast.success("User disimpan");
                setUserOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gudangOpen} onOpenChange={setGudangOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gudang</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input
                value={gudangForm.kode}
                onChange={(e) =>
                  setGudangForm({ ...gudangForm, kode: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={gudangForm.nama}
                onChange={(e) =>
                  setGudangForm({ ...gudangForm, nama: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select
                value={gudangForm.tipe}
                onValueChange={(v) =>
                  setGudangForm({
                    ...gudangForm,
                    tipe: v as Gudang["tipe"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Item</SelectItem>
                  <SelectItem value="fg">FG</SelectItem>
                  <SelectItem value="wip">WIP</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGudangOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => {
                upsertGudang(gudangForm);
                toast.success("Gudang disimpan");
                setGudangOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={jenisOpen} onOpenChange={setJenisOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jenis Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input
                value={jenisForm.kode}
                onChange={(e) =>
                  setJenisForm({ ...jenisForm, kode: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={jenisForm.nama}
                onChange={(e) =>
                  setJenisForm({ ...jenisForm, nama: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Untuk</Label>
              <Select
                value={jenisForm.untuk}
                onValueChange={(v) =>
                  setJenisForm({
                    ...jenisForm,
                    untuk: v as JenisTransaksi["untuk"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="btb">BTB</SelectItem>
                  <SelectItem value="bkb">BKB</SelectItem>
                  <SelectItem value="keduanya">Keduanya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJenisOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => {
                upsertJenis(jenisForm);
                toast.success("Jenis transaksi disimpan");
                setJenisOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
