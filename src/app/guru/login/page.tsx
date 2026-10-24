import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Lock, Users } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { TeacherLoginForm } from "@/components/auth/TeacherLoginForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Masuk guru", robots: { index: false } };

export default async function TeacherLoginPage() {
  const session = await getSession();
  if (session?.role === "teacher") redirect("/guru/dashboard");
  if (session?.role === "student") redirect("/belajar");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link href="/masuk" className="text-sm font-bold text-primary underline-offset-4 hover:underline">
          Masuk sebagai siswa
        </Link>
      </header>

      <main id="konten" className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-5 py-6 lg:grid-cols-[0.95fr_1fr] lg:items-center">
        <section className="card p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Dasbor guru</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Masuk untuk mengelola kelas</h1>
          <p className="mt-2 text-sm text-muted">
            Akun guru dibuat oleh administrator sekolah. Hubungi pengelola sistem bila belum punya akun.
          </p>
          <div className="mt-6">
            <TeacherLoginForm />
          </div>
          <p className="mt-6 flex items-start gap-2 rounded-2xl bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Halaman ini hanya untuk guru. Siswa tidak dapat membuka dasbor guru meskipun mengetik alamatnya
            langsung, karena hak akses diperiksa di server dan database.
          </p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Users className="size-4 text-primary" aria-hidden="true" />
              Kelola kelas &amp; siswa
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Bagikan kode kelas, lihat kode siswa, dan atur ulang PIN tanpa mengumpulkan email anak.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-black">
              <BarChart3 className="size-4 text-primary" aria-hidden="true" />
              Laporan yang berguna
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Akurasi per misi, aktivitas terbaru, dan soal dengan tingkat kesalahan tertinggi — dipakai sebagai
              bahan pengajaran, bukan penilaian akhir.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
