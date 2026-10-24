import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <main id="konten" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-5 text-center">
      <Logo compact />
      <p className="text-6xl font-black text-line-strong">404</p>
      <h1 className="text-2xl font-black">Halaman ini tidak ditemukan</h1>
      <p className="text-sm text-muted">
        Mungkin tautannya salah, atau halaman sudah dipindahkan. Kembali ke peta misi, yuk.
      </p>
      <div className="flex gap-3">
        <ButtonLink href="/belajar">Ke peta misi</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Beranda
        </ButtonLink>
      </div>
    </main>
  );
}
