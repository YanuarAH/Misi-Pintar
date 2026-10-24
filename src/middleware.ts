import { NextResponse, type NextRequest } from "next/server";

/**
 * Gerbang pertama: menolak permintaan tanpa cookie sesi sebelum halaman dirender.
 *
 * Ini mengembalikan redirect HTTP nyata (307) sehingga:
 *  - pengguna tanpa JavaScript tetap diarahkan dengan benar,
 *  - kerangka halaman ber-loading tidak sempat dikirim untuk area terproteksi.
 *
 * Validasi sesi yang sebenarnya tetap dilakukan di server (getSession + RLS), karena
 * middleware hanya melihat keberadaan cookie, bukan keabsahannya.
 */
const SESSION_COOKIE = "misi_session";

const STUDENT_PREFIXES = ["/belajar", "/misi", "/progres", "/profil", "/hasil"];

function isStudentArea(pathname: string): boolean {
  return STUDENT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isTeacherArea(pathname: string): boolean {
  return pathname === "/guru" || (pathname.startsWith("/guru/") && pathname !== "/guru/login");
}

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isStudentArea(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (isTeacherArea(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/guru/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/belajar/:path*", "/misi/:path*", "/progres/:path*", "/profil/:path*", "/hasil/:path*", "/guru/:path*"],
};
