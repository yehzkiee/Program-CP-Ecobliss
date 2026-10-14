/**
 * Aplikasi ini dipasang di subfolder hosting (mis. /program-cp) lewat Passenger,
 * jadi Next butuh basePath. Nilainya dari NEXT_PUBLIC_BASE_PATH dan hanya dipakai
 * kalau diisi, supaya dev lokal tetap jalan di "/" tanpa perubahan apa pun.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Tempel prefix basePath untuk path yang dipanggil manual (fetch, URL string).
 * Link dan router Next sudah otomatis ikut basePath, jadi tidak perlu dibungkus.
 */
export function withBasePath(path: string) {
  if (!BASE_PATH || !path.startsWith("/")) return path;
  return path === "/" ? BASE_PATH : `${BASE_PATH}${path}`;
}

/**
 * Buang prefix basePath dari hasil usePathname() supaya pembandingan path di
 * dalam aplikasi tetap memakai bentuk "/login", "/print/..." dan seterusnya.
 */
export function stripBasePath(pathname: string) {
  if (!BASE_PATH || !pathname.startsWith(BASE_PATH)) return pathname;
  const rest = pathname.slice(BASE_PATH.length);
  return rest === "" ? "/" : rest;
}
