import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/layout/Logo";
import { TeacherNav } from "@/components/teacher/TeacherNav";
import { Avatar } from "@/components/ui/Avatar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/guru/login");
  if (session.role !== "teacher") redirect("/belajar");

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar menempel (sticky) setinggi viewport: konten utama yang bergulir, bukan sidebar. */}
      <aside className="hidden border-r border-line bg-surface/70 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start lg:flex-col lg:gap-6 lg:overflow-y-auto lg:p-5">
        <Logo />
        <TeacherNav />
        <div className="mt-auto rounded-2xl bg-paper p-3.5">
          <div className="flex items-center gap-2.5">
            <Avatar avatarKey={session.avatarKey} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{session.displayName}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Guru</p>
            </div>
          </div>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2 text-xs font-bold text-muted hover:text-ink"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="lg:hidden">
            <Logo compact href="/guru/dashboard" />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Dasbor guru</p>
            <p className="text-sm font-bold text-ink">Misi Pintar</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-bold sm:inline">{session.displayName}</span>
            <Avatar avatarKey={session.avatarKey} size="sm" />
            <form action={logoutAction} className="lg:hidden">
              <button type="submit" className="rounded-full px-2 py-1.5 text-xs font-bold text-muted hover:text-ink">
                Keluar
              </button>
            </form>
          </div>
        </header>

        <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 lg:px-6 lg:py-7">
          {children}
        </main>

        <div className="sticky bottom-0 z-30 bg-surface/95 backdrop-blur lg:hidden">
          <TeacherNav orientation="horizontal" />
        </div>
      </div>
    </div>
  );
}
