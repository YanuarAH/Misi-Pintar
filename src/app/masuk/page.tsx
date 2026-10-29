import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info, KeyRound, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { StudentLoginForm } from "@/components/auth/StudentLoginForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Masuk siswa", robots: { index: false } };

export default async function StudentLoginPage() {
  const session = await getSession();
  if (session?.role === "student") redirect("/belajar");
  if (session?.role === "teacher") redirect("/guru/dashboard");

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="konten" className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="card p-6 sm:p-8">
            <h1 className="text-2xl font-black sm:text-3xl">Masuk sebagai siswa</h1>
            <p className="mt-2 text-sm text-muted">
              Gunakan kode siswa dan PIN yang kamu pilih saat mendaftar.
            </p>
            <div className="mt-6">
              <StudentLoginForm />
            </div>
            <p className="mt-6 text-sm text-muted">
              Belum punya akun?{" "}
              <Link href="/daftar" className="font-bold text-primary underline-offset-4 hover:underline">
                Daftar dengan kode kelas
              </Link>
            </p>
            <p className="mt-2 text-sm text-muted">
              Guru?{" "}
              <Link href="/guru/login" className="font-bold text-primary underline-offset-4 hover:underline">
                Masuk di halaman guru
              </Link>
            </p>
          </section>

          <aside className="space-y-4">
            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-base font-black">
                <KeyRound className="size-4 text-primary" aria-hidden="true" />
                Lupa kode siswa?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Minta bantuan gurumu. Guru dapat melihat kode siswa dan mengatur ulang PIN dari dasbor kelas.
              </p>
            </div>
            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-base font-black">
                <ShieldCheck className="size-4 text-leaf" aria-hidden="true" />
                Data yang kami simpan
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li>Nama tampilan dan avatar pilihanmu</li>
                <li>Hasil misi dan XP</li>
                <li>Tidak ada email, nomor telepon, atau alamat</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-sun/40 bg-sun-soft p-5">
              <p className="flex items-center gap-2 text-sm font-black text-ink">
                <Info className="size-4 text-[#8a5a00]" aria-hidden="true" />
                Akun demo untuk mencoba
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/75">
                Kode <strong className="font-mono">DEMO1234</strong> dengan PIN <strong>1234</strong> tersedia bila
                guru menjalankan seed data demo.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
