import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Daftar siswa", robots: { index: false } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string }>;
}) {
  const session = await getSession();
  if (session?.role === "student") redirect("/belajar");
  if (session?.role === "teacher") redirect("/guru/dashboard");

  const params = await searchParams;
  const initialJoinCode = (params.kelas ?? "").toUpperCase().slice(0, 6);

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="konten" className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-black sm:text-3xl">Buat akun siswa</h1>
          <p className="mt-2 text-sm text-muted">
            Kamu hanya perlu kode kelas dari guru. Tidak perlu email atau nomor telepon.
          </p>
          <div className="mt-6">
            <RegisterForm initialJoinCode={initialJoinCode} />
          </div>
          <p className="mt-6 text-sm text-muted">
            Sudah punya akun?{" "}
            <Link href="/masuk" className="font-bold text-primary underline-offset-4 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
