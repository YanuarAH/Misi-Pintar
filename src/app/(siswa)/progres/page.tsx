import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, History, Sparkles, Star, Trophy } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { getProgress } from "@/server/student";
import { AchievementBadge } from "@/components/ui/AchievementBadge";
import { ButtonLink } from "@/components/ui/Button";
import { ACHIEVEMENT_KEYS } from "@/lib/achievements";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Progres belajar", robots: { index: false } };

export default async function ProgressPage() {
  const session = await requireStudent();
  const progress = await getProgress(viewerOf(session), session.id);
  const earnedKeys = new Set(progress.achievements.map((item) => item.key));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">Progres belajar</h1>
        <p className="mt-1 text-sm text-muted">
          Semua riwayat percobaanmu tersimpan. Ulangi misi kapan saja untuk memperbaiki skor.
        </p>
      </header>

      <section aria-label="Ringkasan" className="grid grid-cols-3 gap-3">
        {[
          { icon: Star, label: "Total XP", value: progress.xp, tone: "bg-sun-soft text-[#8a5a00]" },
          {
            icon: BookOpenCheck,
            label: "Misi selesai",
            value: `${progress.completedMissions}/${progress.totalMissions}`,
            tone: "bg-primary-soft text-primary-strong",
          },
          {
            icon: Trophy,
            label: "Lencana",
            value: `${earnedKeys.size}/${ACHIEVEMENT_KEYS.length}`,
            tone: "bg-sky-soft text-[#1d4b73]",
          },
        ].map((stat) => (
          <div key={stat.label} className="card p-3.5 sm:p-4">
            <span className={cn("mb-2 flex size-9 items-center justify-center rounded-xl", stat.tone)}>
              <stat.icon className="size-4.5" aria-hidden="true" />
            </span>
            <p className="stat-number">{stat.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5 sm:px-5">
          <h2 className="text-lg font-black">Nilai per misi</h2>
          <ButtonLink href="/belajar" variant="ghost" size="sm">
            Peta misi
          </ButtonLink>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th scope="col">Misi</th>
                <th scope="col" className="text-center">
                  Nilai terakhir
                </th>
                <th scope="col" className="text-center">
                  Nilai terbaik
                </th>
                <th scope="col" className="text-center">
                  Percobaan
                </th>
                <th scope="col" className="text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {progress.perMission.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted">
                    Belum ada misi yang terbit.
                  </td>
                </tr>
              ) : (
                progress.perMission.map((mission) => (
                  <tr key={mission.slug}>
                    <td className="font-bold">{mission.title}</td>
                    <td className="text-center">
                      {mission.lastScore === null ? <span className="text-muted">—</span> : `${mission.lastScore}`}
                    </td>
                    <td className="text-center font-bold">
                      {mission.bestScore === null ? <span className="font-normal text-muted">—</span> : mission.bestScore}
                    </td>
                    <td className="text-center text-muted">{mission.attempts}</td>
                    <td className="text-right">
                      {mission.unlocked ? (
                        <Link
                          href={`/misi/${mission.slug}`}
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          {mission.attempts > 0 ? "Ulangi" : "Mulai"}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">Terkunci</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Sparkles className="size-4 text-sun" aria-hidden="true" />
          Lencana
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENT_KEYS.map((key) => (
            <AchievementBadge key={key} achievementKey={key} locked={!earnedKeys.has(key)} />
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3.5 sm:px-5">
          <History className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-black">Riwayat percobaan</h2>
        </div>
        {progress.history.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted">Belum ada percobaan. Mulai misi pertamamu, yuk!</p>
            <div className="mt-3">
              <ButtonLink href="/belajar" size="sm">
                Ke peta misi
              </ButtonLink>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Misi</th>
                  <th scope="col">Waktu</th>
                  <th scope="col" className="text-center">
                    Benar
                  </th>
                  <th scope="col" className="text-center">
                    Skor
                  </th>
                  <th scope="col" className="text-center">
                    XP
                  </th>
                  <th scope="col" className="text-right">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {progress.history.map((item) => (
                  <tr key={item.id}>
                    <td className="font-bold">{item.missionTitle}</td>
                    <td className="whitespace-nowrap text-xs text-muted">
                      {item.completedAt ? formatDateTime(item.completedAt) : "Belum selesai"}
                    </td>
                    <td className="text-center">
                      {item.correctCount}/{item.totalQuestions}
                    </td>
                    <td className="text-center">
                      <span
                        className={cn(
                          "chip",
                          item.score >= 80 ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "bg-paper",
                        )}
                      >
                        {item.score}
                      </span>
                    </td>
                    <td className="text-center text-muted">{item.xpEarned}</td>
                    <td className="text-right">
                      <Link href={`/hasil/${item.id}`} className="text-sm font-bold text-primary hover:underline">
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
