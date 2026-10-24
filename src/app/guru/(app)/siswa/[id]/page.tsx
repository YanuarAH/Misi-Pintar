import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Sparkles, Target } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getStudentReport } from "@/server/teacher";
import { Avatar } from "@/components/ui/Avatar";
import { AchievementBadge } from "@/components/ui/AchievementBadge";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { accuracyLabel } from "@/lib/scoring";

export const metadata: Metadata = { title: "Laporan siswa", robots: { index: false } };

export default async function StudentReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireTeacher();
  const { id } = await params;
  const report = await getStudentReport(viewerOf(session), id);
  if (!report) notFound();

  const completed = report.attempts.filter((attempt) => attempt.completedAt);
  const avgScore = completed.length
    ? Math.round(completed.reduce((sum, attempt) => sum + attempt.score, 0) / completed.length)
    : null;
  const bestScore = completed.length ? Math.max(...completed.map((attempt) => attempt.score)) : null;

  return (
    <div className="space-y-5">
      <Link
        href={report.classroom ? `/guru/kelas/${report.classroom.id}` : "/guru/kelas"}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {report.classroom ? `Kembali ke ${report.classroom.name}` : "Kembali ke daftar kelas"}
      </Link>

      <header className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Avatar avatarKey={report.student.avatarKey} size="lg" />
            <div>
              <h1 className="text-2xl font-black">{report.student.displayName}</h1>
              <p className="text-sm text-muted">
                {report.classroom?.name ?? "Tanpa kelas"} · kode siswa{" "}
                <span className="font-mono font-bold text-ink">{report.student.accessCode}</span>
              </p>
              <p className="text-xs text-muted">Terdaftar {formatDateTime(report.student.createdAt)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-sun-soft px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase text-[#7a4a00]">XP</dt>
              <dd className="text-lg font-black">{report.xp}</dd>
            </div>
            <div className="rounded-xl bg-primary-soft px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase text-primary-strong">Rata-rata</dt>
              <dd className="text-lg font-black">{avgScore === null ? "—" : `${avgScore}%`}</dd>
            </div>
            <div className="rounded-xl bg-leaf-soft px-3 py-2 text-center">
              <dt className="text-[10px] font-bold uppercase text-[#1c5b36]">Terbaik</dt>
              <dd className="text-lg font-black">{bestScore === null ? "—" : bestScore}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <h2 className="flex items-center gap-2 text-base font-black">
              <BookOpenCheck className="size-4 text-primary" aria-hidden="true" />
              Riwayat percobaan
            </h2>
            <span className="chip bg-paper">{report.attempts.length} percobaan</span>
          </div>
          {report.attempts.length === 0 ? (
            <p className="p-5 text-sm text-muted">Siswa ini belum pernah memulai misi.</p>
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
                    <th scope="col" className="text-right">
                      Detail
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.attempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td className="font-bold">{attempt.missionTitle}</td>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {attempt.completedAt ? formatDateTime(attempt.completedAt) : "Belum selesai"}
                      </td>
                      <td className="text-center">
                        {attempt.correctCount}/{attempt.totalQuestions}
                      </td>
                      <td className="text-center">
                        <span
                          className={cn(
                            "chip",
                            attempt.score >= 80
                              ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]"
                              : attempt.completedAt
                                ? "border-sun/40 bg-sun-soft text-[#7a4a00]"
                                : "bg-paper",
                          )}
                        >
                          {attempt.completedAt ? attempt.score : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        {attempt.completedAt ? (
                          <Link href={`/hasil/${attempt.id}`} className="text-sm font-bold text-primary hover:underline">
                            Lihat
                          </Link>
                        ) : (
                          <span className="text-xs text-muted">Berjalan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Target className="size-4 text-sun" aria-hidden="true" />
              Materi untuk diulang
            </h2>
            <p className="mt-1 text-xs text-muted">Diurutkan dari yang paling sering salah.</p>
            {report.weakTopics.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Belum ada jawaban salah yang tercatat.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {report.weakTopics.map((topic) => (
                  <li key={topic.prompt}>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{topic.prompt}</p>
                    <p className="text-[11px] font-bold text-muted">
                      {topic.missionTitle} · salah {topic.wrong} dari {topic.total} jawaban
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {avgScore !== null ? (
              <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs font-semibold text-ink/80">
                Status belajar: {accuracyLabel(avgScore)}
              </p>
            ) : null}
          </section>

          <section className="card p-4">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Sparkles className="size-4 text-sun" aria-hidden="true" />
              Lencana
            </h2>
            {report.achievements.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Belum ada lencana.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {report.achievements.map((achievement) => (
                  <AchievementBadge key={achievement.key} achievementKey={achievement.key} />
                ))}
              </div>
            )}
          </section>

          <ButtonLink href="/guru/dashboard" variant="secondary" size="sm" className="w-full">
            Kembali ke ringkasan
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
