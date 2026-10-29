"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "./Logo";

export function PublicHeader({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:py-6">
      <Logo />
      <nav aria-label="Navigasi utama" className="hidden items-center gap-6 text-sm font-semibold text-ink/80 sm:flex">
        <a className="hover:text-primary transition-colors" href="/#misi">
          Peta misi
        </a>
        <a className="hover:text-primary transition-colors" href="/#cara">
          Cara belajar
        </a>
        <a className="hover:text-primary transition-colors" href="/#guru">
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

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-paper sm:hidden"
        >
          {mobileMenuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <nav
          aria-label="Navigasi mobile"
          className="w-full animate-rise rounded-2xl border border-line bg-surface p-4 shadow-sm sm:hidden"
        >
          <ul className="space-y-1 text-sm font-bold text-ink">
            <li>
              <a
                href="/#misi"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 hover:bg-paper"
              >
                Peta misi
              </a>
            </li>
            <li>
              <a
                href="/#cara"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 hover:bg-paper"
              >
                Cara belajar
              </a>
            </li>
            <li>
              <a
                href="/#guru"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 hover:bg-paper"
              >
                Untuk guru
              </a>
            </li>
            {!isLoggedIn ? (
              <li className="pt-2">
                <ButtonLink href="/daftar" className="w-full justify-center">
                  Mulai belajar gratis
                </ButtonLink>
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
