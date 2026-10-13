import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Diisi (mis. "/program-cp") saat build untuk hosting subfolder; kosong = root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  experimental: {
    // Hosting cPanel membatasi jumlah proses per akun; build default memakai
    // puluhan worker dan mati dengan `spawn ... EAGAIN`.
    cpus: 2,
  },
};

export default nextConfig;
