import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Flame, Sparkles, Star, Trophy } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { one } from "@/lib/db";
import { getStudentOverview } from "@/server/student";
import { MissionMap } from "@/components/student/MissionMap";
import { missionVisual } from "@/components/student/missionMeta";
import { Avatar } from "@/components/ui/Avatar";
import { AchievementBadge } from "@/components/ui/AchievementBadge";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { startMissionAction } from "@/app/actions/student";
import { ACHIEVEMENTS, ACHIEVEMENT_KEYS } from "@/lib/achievements";
import { formatDateTime, percent } from "@/lib/format";
import { gradeLabel } from "@/lib/curriculum";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Peta misi", robots: { index: false } };

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ baru?: string }>;
}) {
  const session = await requireStudent();
  const viewer = viewerOf(session);
  const [overview, profile, params] = await Promise.all([
    getStudentOverview(viewer, session.id),
    one<{ access_code: string }>(viewer, "select access_code from profiles where id = $1", [session.id]),
    searchParams,
  ]);

  const isNew = params.baru === "1";
  const earnedKeys = new Set(overview.achievements.map((item) => item.key));
  const continueCard = overview.continueCard;

  return (
    <div className="space-y-7">
      {isNew ? (
        <Alert tone="success">
          Akunmu sudah dibuat! Kode siswa kamu: <strong className="font-mono tracking-wider">{profile?.access_code}</strong>{" "}
          — simpan kode ini untuk masuk lagi. PIN tetap rahasia, ya.
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Avatar avatarKey={session.avatarKey} size="lg" />
          <div>
            <p className="text-sm font-semibold text-muted">Halo, selamat datang!</p>
            <h1 className="text-2xl font-black sm:text-3xl">{session.displayName}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {overview.completedMissions} dari {overview.totalMissions} misi selesai · {overview.xp} XP
            </p>
          </div>
        </div>
        <ButtonLink href="/progres" variant="secondary" size="sm" className="self-start sm:self-auto">
          Lihat progres lengkap
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </section>

      <section aria-label="Ringkasan belajar" className="grid grid-cols-3 gap-3">
        {[
          { icon: Star, label: "Total XP", value: overview.xp, tint: "bg-sun-soft text-[#8a5a00]" },
          { icon: BookOpen, label: "Misi selesai", value: `${overview.completedMissions}/${overview.totalMissions}`, tint: "bg-primary-soft text-primary-strong" },
          { icon: Trophy, label: "Lencana", value: `${earnedKeys.size}/${ACHIEVEMENT_KEYS.length}`, tint: "bg-sky-soft text-[#1d4b73]" },
        ].map((stat) => (
          <div key={stat.label} className="card p-3.5 sm:p-4">
            <span className={cn("mb-2 flex size-9 items-center justify-center rounded-xl", stat.tint)}>
              <stat.icon className="size-4.5" aria-hidden="true" />
            </span>
            <p className="stat-number">{stat.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      {continueCard ? (
        <section
          aria-labelledby="lanjut-judul"
          className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white sm:p-6"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/40 blur-2xl"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sun">
                {continueCard.openAttemptId ? "Lanjutkan misi" : continueCard.completed ? "Ulangi untuk skor lebih baik" : "Misi berikutnya"}
              </p>
              <h2 id="lanjut-judul" className="mt-1.5 flex items-center gap-2 text-xl font-black sm:text-2xl">
                <span aria-hidden="true">{missionVisual(continueCard.slug).emoji}</span>
                {continueCard.title}
              </h2>
              <p className="mt-1 max-w-md text-sm text-white/75">
                {continueCard.questionCount} soal · misi {continueCard.orderIndex} dari {overview.totalMissions}
                {continueCard.bestScore !== null ? ` · skor terbaik ${continueCard.bestScore}` : ""}
              </p>
            </div>
            <form action={startMissionAction} className="shrink-0">
              <input type="hidden" name="slug" value={continueCard.slug} />
              <Button type="submit" variant="sun">
                {continueCard.openAttemptId ? "Lanjutkan" : "Mulai sekarang"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="peta-judul">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="peta-judul" className="text-xl font-black">
              Peta petualangan
            </h2>
            <p className="text-sm text-muted">Pilih misi yang terbuka, lalu selesaikan satu per satu.</p>
          </div>
        </div>
        <MissionMap
          cards={overview.cards}
          emptyHint={
            overview.classCount === 0
              ? "Kamu belum tergabung di kelas belajar mana pun. Minta kode kelas kepada gurumu, lalu daftar ulang."
              : overview.classGrade === null
                ? "Gurumu belum mengatur tingkat kelas untuk kelas belajarmu, jadi misi belum bisa ditampilkan."
                : `Belum ada misi terbit untuk ${gradeLabel(overview.classGrade)}. Coba muat ulang nanti.`
          }
        />
      </section>

      <section aria-labelledby="lencana-judul" className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 id="lencana-judul" className="flex items-center gap-2 text-lg font-black">
            <Sparkles className="size-4 text-sun" aria-hidden="true" />
            Lencana
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENT_KEYS.map((key) => (
              <AchievementBadge key={key} achievementKey={key} locked={!earnedKeys.has(key)} />
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Flame className="size-4 text-coral" aria-hidden="true" />
            Aktivitas terakhir
          </h2>
          {overview.recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Belum ada misi yang selesai. Mulai dari misi pertama, ya!
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {overview.recent.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/hasil/${item.id}`} className="block truncate text-sm font-bold hover:text-primary">
                      {item.missionTitle}
                    </Link>
                    <p className="text-xs text-muted">{formatDateTime(item.completedAt)}</p>
                  </div>
                  <span
                    className={cn(
                      "chip shrink-0",
                      item.score >= 80 ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "border-sun/40 bg-sun-soft text-[#7a4a00]",
                    )}
                  >
                    {item.score}%
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 rounded-2xl bg-paper p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Kartu siswa</p>
            <p className="mt-1 font-mono text-lg font-black tracking-[0.2em] text-ink">{profile?.access_code ?? "-"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Kode ini dipakai untuk masuk. Tunjukkan kepada gurumu bila kamu lupa.
            </p>
            <p className="mt-2 text-xs text-muted">
              Akurasi rata-rata:{" "}
              <strong className="text-ink">
                {percent(
                  overview.recent.reduce((sum, item) => sum + item.score, 0),
                  Math.max(overview.recent.length, 1),
                )}
                %
              </strong>
            </p>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-muted">
        {Object.values(ACHIEVEMENTS).length} lencana bisa dikumpulkan · tidak ada peringkat publik di Misi Pintar
      </p>
    </div>
  );
}
