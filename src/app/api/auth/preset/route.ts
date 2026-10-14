export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Isian awal form login. Nilainya datang dari env hosting
 * (PROGRAM_CP_PRESET_USERNAME / PROGRAM_CP_PRESET_PASSWORD) supaya operator tidak
 * perlu mengetik dan akunnya bisa diganti dari panel hosting tanpa build ulang.
 *
 * Catatan keamanan: siapa pun yang bisa membuka halaman login juga bisa membaca
 * nilai ini, jadi anggap akun preset ini akun bersama, bukan rahasia.
 */
export async function GET() {
  const username = (process.env.PROGRAM_CP_PRESET_USERNAME ?? "").trim();
  const password = process.env.PROGRAM_CP_PRESET_PASSWORD ?? "";
  if (!username || !password) {
    return Response.json({ configured: false });
  }
  return Response.json({ configured: true, username, password });
}
