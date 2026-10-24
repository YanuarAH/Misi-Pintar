import Link from "next/link";
import { Map, Star, TrendingUp } from "lucide-react";
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
  active?: "belajar" | "progres" | "misi";
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
        </nav>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-xs font-black text-ink ring-1 ring-sun/40">
            <Star className="size-3.5 text-sun" aria-hidden="true" />
            {xp} XP
          </span>
          <span className="hidden text-sm font-bold text-ink sm:inline">{displayName}</span>
          <Avatar avatarKey={avatarKey} size="sm" />
          <form action={logoutAction}>
            <button type="submit" className="rounded-full px-2 py-1.5 text-xs font-bold text-muted hover:text-ink">
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
      </nav>
    </header>
  );
}
