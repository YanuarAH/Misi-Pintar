import Link from "next/link";
import { Map, Star, TrendingUp, UserRound, Users } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

export function StudentHeader({
  displayName,
  avatarKey,
  xp,
  active,
}: {
  displayName: string;
  avatarKey: string;
  xp: number;
  active?: "belajar" | "progres" | "misi" | "profil" | "kelas";
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Logo compact href="/belajar" />

        <nav aria-label="Navigasi siswa" className="hidden items-center gap-1 sm:flex">
          <Link
            href="/belajar"
            aria-current={active === "belajar" ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-bold",
              active === "belajar" ? "bg-primary-soft text-primary-strong" : "text-ink/75 hover:bg-white",
            )}
          >
            <Map className="mr-1.5 inline size-4" aria-hidden="true" />
            Peta misi
          </Link>
          <Link
            href="/progres"
            aria-current={active === "progres" ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-bold",
              active === "progres" ? "bg-primary-soft text-primary-strong" : "text-ink/75 hover:bg-white",
            )}
          >
            <TrendingUp className="mr-1.5 inline size-4" aria-hidden="true" />
            Progres
          </Link>
          <Link
            href="/kelas-saya"
            aria-current={active === "kelas" ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-bold",
              active === "kelas" ? "bg-primary-soft text-primary-strong" : "text-ink/75 hover:bg-white",
            )}
          >
            <Users className="mr-1.5 inline size-4" aria-hidden="true" />
            Kelas saya
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-xs font-black text-ink ring-1 ring-sun/40">
            <Star className="size-3.5 text-sun" aria-hidden="true" />
            {xp} XP
          </span>
          <Link
            href="/profil"
            className="hidden items-center gap-2 rounded-full px-1.5 py-1 text-sm font-bold text-ink hover:bg-white sm:flex"
            aria-label="Buka profil saya"
          >
            {displayName}
          </Link>
          <Link href="/profil" aria-label="Buka profil saya" className="rounded-full">
            <Avatar avatarKey={avatarKey} size="sm" />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-xs font-bold text-muted hover:bg-white hover:text-ink focus-visible:ring-2"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>

      <nav aria-label="Navigasi siswa (layar kecil)" className="flex border-t border-line sm:hidden">
        <Link
          href="/belajar"
          aria-current={active === "belajar" ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs font-bold",
            active === "belajar" ? "text-primary" : "text-muted",
          )}
        >
          <Map className="size-4" aria-hidden="true" /> Peta misi
        </Link>
        <Link
          href="/progres"
          aria-current={active === "progres" ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs font-bold",
            active === "progres" ? "text-primary" : "text-muted",
          )}
        >
          <TrendingUp className="size-4" aria-hidden="true" /> Progres
        </Link>
        <Link
          href="/kelas-saya"
          aria-current={active === "kelas" ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs font-bold",
            active === "kelas" ? "text-primary" : "text-muted",
          )}
        >
          <Users className="size-4" aria-hidden="true" /> Kelas
        </Link>
        <Link
          href="/profil"
          aria-current={active === "profil" ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center gap-1.5 text-xs font-bold",
            active === "profil" ? "text-primary" : "text-muted",
          )}
        >
          <UserRound className="size-4" aria-hidden="true" /> Profil
        </Link>
      </nav>
    </header>
  );
}
