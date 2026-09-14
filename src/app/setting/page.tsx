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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function SettingPage() {
  const users = useDataStore((s) => s.users);
  const gudangList = useDataStore((s) => s.gudangList);
  const jenisList = useDataStore((s) => s.jenisTransaksiList);
  const logs = useDataStore((s) => s.activityLogs);
  const upsertUser = useDataStore((s) => s.upsertUser);
  const upsertGudang = useDataStore((s) => s.upsertGudang);
  const deleteGudang = useDataStore((s) => s.deleteGudang);
  const upsertJenis = useDataStore((s) => s.upsertJenis);
  const deleteJenis = useDataStore((s) => s.deleteJenis);
  const resetDemo = useDataStore((s) => s.resetDemo);

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

  return (
    <div>
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

      <Tabs defaultValue="users">
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1 bg-transparent p-0">
          {[
            ["users", "Users & Role"],
            ["gudang", "Gudang"],
            ["jenis", "Jenis Transaksi"],
            ["log", "Activity Log"],
          ].map(([v, label]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="rounded-md border bg-white data-[state=active]:border-emerald-300 data-[state=active]:bg-emerald-50"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="users">
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
                  <TableHead className="text-right">Aksi</TableHead>
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
                        {u.role === "admin" ? "Admin" : "Non-Admin"}
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
            Role Admin khusus untuk approval Adjustment. Demo: toggle role di
            sidebar.
          </p>
        </TabsContent>

        <TabsContent value="gudang">
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
                  <TableHead className="text-right">Aksi</TableHead>
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
                          deleteGudang(g.id);
                          toast.success("Gudang dihapus");
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
        </TabsContent>

        <TabsContent value="jenis">
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
                  <TableHead className="text-right">Aksi</TableHead>
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
                          deleteJenis(j.id);
                          toast.success("Jenis dihapus");
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
        </TabsContent>

        <TabsContent value="log">
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
        </TabsContent>
      </Tabs>

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
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Non-Admin</SelectItem>
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
