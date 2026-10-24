import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";

export function PublicHeader({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:py-6">
      <Logo />
      <nav aria-label="Navigasi utama" className="hidden items-center gap-6 text-sm font-semibold text-ink/80 sm:flex">
        <a className="hover:text-primary" href="/#misi">
          Peta misi
        </a>
        <a className="hover:text-primary" href="/#cara">
          Cara belajar
        </a>
        <a className="hover:text-primary" href="/#guru">
          Untuk guru
        </a>
      </nav>
      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <ButtonLink href="/belajar" size="sm">
            Lanjut belajar
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href="/masuk" variant="secondary" size="sm">
              Masuk
            </ButtonLink>
            <ButtonLink href="/daftar" size="sm" className="hidden sm:inline-flex">
              Mulai belajar
            </ButtonLink>
          </>
        )}
      </div>
    </header>
  );
}
