import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  XCircle,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { viewerOf } from "@/lib/auth";
import { getAttemptResult } from "@/server/student";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { startMissionAction, startPracticeAction } from "@/app/actions/student";
import { Avatar } from "@/components/ui/Avatar";
import { AchievementBadge } from "@/components/ui/AchievementBadge";
import { accuracyLabel } from "@/lib/scoring";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Hasil misi", robots: { index: false } };

export default async function AttemptResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { attemptId } = await params;
  const { error } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/masuk");
  const isTeacher = session.role === "teacher";
  const result = await getAttemptResult(viewerOf(session), attemptId);
  if (!result) notFound();

  const {
    attempt,
    mission,
    answers,
    earnedAchievements,
    nextMission,
    accuracy,
    xpPotential,
    previousBestXp,
    mode,
    wrongQuestionIds,
  } = result;
  const isPractice = mode === "practice";
  const correct = answers.filter((answer) => answer.isCorrect);
  const wrong = answers.filter((answer) => !answer.isCorrect);
  const inProgress = !attempt.completed_at;

  const earnedInAttempt = earnedAchievements.filter(
    (item) => attempt.completed_at && new Date(item.earnedAt) >= new Date(attempt.started_at),
  );

  const backHref = isTeacher ? `/guru/siswa/${attempt.student_id}` : "/belajar";
  const backLabel = isTeacher ? "Kembali ke laporan siswa" : "Kembali ke peta misi";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-5">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {inProgress ? (
        <div className="card p-6 text-center">
          <h1 className="text-xl font-black">Misi ini belum selesai</h1>
          <p className="mt-1.5 text-sm text-muted">Lanjutkan dulu sampai soal terakhir untuk melihat hasil.</p>
          {!isTeacher ? (
            <div className="mt-4">
              <ButtonLink href={`/misi/${mission.slug}/main`}>Lanjutkan misi</ButtonLink>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <section className="card overflow-hidden">
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
              <div className="mx-auto flex size-32 flex-col items-center justify-center rounded-full border-8 border-primary-soft bg-surface md:mx-0">
                <span className="text-4xl font-black leading-none">{attempt.score}</span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">skor</span>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                  {isPractice ? "Latihan selesai" : "Misi selesai"}
                </p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">{mission.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                  <Avatar avatarKey={result.student.avatarKey} size="sm" />
                  <span>{result.student.displayName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDateTime(attempt.completed_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-ink">{accuracyLabel(accuracy)}</span>
                </div>

                <dl className={cn("mt-4 grid gap-2.5", isPractice ? "grid-cols-2" : "grid-cols-3")}>
                  <div className="rounded-2xl bg-paper px-3 py-2.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">Benar</dt>
                    <dd className="text-lg font-black">
                      {attempt.correct_count}/{attempt.total_questions}
                    </dd>
                  </div>
                  {isPractice ? null : (
                    <div className="rounded-2xl bg-sun-soft px-3 py-2.5">
                      <dt className="text-[10px] font-bold uppercase tracking-wide text-[#7a4a00]">XP didapat</dt>
                      <dd className="text-lg font-black">{attempt.xp_earned}</dd>
                    </div>
                  )}
                  <div className="rounded-2xl bg-primary-soft px-3 py-2.5">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">Akurasi</dt>
                    <dd className="text-lg font-black">{accuracy}%</dd>
                  </div>
                </dl>
                {isPractice ? (
                  <p className="mt-2 rounded-xl bg-sky-soft px-3 py-2 text-xs leading-relaxed text-[#1d4b73]">
                    Latihan tidak memberi XP dan tidak membuka misi baru. Jawaban di sini tetap tercatat untuk
                    peta kemampuanmu.
                  </p>
                ) : attempt.xp_earned < xpPotential ? (
                  <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
                    Kamu sudah pernah mengumpulkan <strong className="text-ink">{previousBestXp} XP</strong> dari
                    misi ini. Percobaan ini menambah <strong className="text-ink">{attempt.xp_earned} XP</strong>{" "}
                    karena skor barumu belum melampaui rekor sebelumnya (potensi penuh {xpPotential} XP). XP
                    dirancang begini supaya tidak bisa ditambah dengan mengulang misi yang sama.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted">
                    {attempt.correct_count} jawaban benar × 10 XP + 20 XP bonus misi selesai ={" "}
                    {attempt.xp_earned} XP.
                  </p>
                )}
              </div>
            </div>
          </section>

          {earnedInAttempt.length > 0 ? (
            <section className="rounded-3xl border border-sun/50 bg-sun-soft p-5">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Sparkles className="size-5 text-sun" aria-hidden="true" />
                {isTeacher ? "Lencana yang didapat" : "Lencana baru!"}
              </h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {earnedInAttempt.map((item) => (
                  <AchievementBadge key={item.key} achievementKey={item.key} className="bg-white/70" />
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-base font-black text-[#1c5b36]">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                Sudah kamu kuasai ({correct.length})
              </h2>
              {correct.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Belum ada soal yang benar di percobaan ini.</p>
              ) : (
                <ul className="mt-2.5 space-y-1.5 text-sm text-ink/85">
                  {correct.map((answer) => (
                    <li key={answer.questionId} className="flex gap-2">
                      <span aria-hidden="true" className="text-leaf">
                        ✓
                      </span>
                      <span className="line-clamp-2">{answer.prompt}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <h2 className="flex items-center gap-2 text-base font-black text-[#7d2418]">
                <Target className="size-5" aria-hidden="true" />
                Perlu latihan tambahan ({wrong.length})
              </h2>
              {wrong.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Semua soal benar. Hebat! Coba misi berikutnya untuk tantangan baru.
                </p>
              ) : (
                <>
                  <ul className="mt-2.5 space-y-1.5 text-sm text-ink/85">
                    {wrong.map((answer) => (
                      <li key={answer.questionId} className="flex gap-2">
                        <span aria-hidden="true" className="text-coral">
                          –
                        </span>
                        <span className="line-clamp-2">{answer.prompt}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
                    Salah bukan berarti belum paham. Baca penjelasan di bawah, lalu ulangi misi ini kapan saja.
                  </p>
                  {!isTeacher && !isPractice ? (
                    <form action={startPracticeAction} className="mt-3">
                      <input type="hidden" name="sourceAttemptId" value={attempt.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Latih {wrongQuestionIds.length} soal ini saja
                      </Button>
                      <p className="mt-1.5 text-xs text-muted">
                        Latihan tidak mengubah XP, jadi kamu bisa mencoba tanpa khawatir.
                      </p>
                    </form>
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-black">Pembahasan soal</h2>
              <p className="text-sm text-muted">Buka setiap soal untuk melihat cara mengerjakannya.</p>
            </div>
            <ul className="divide-y divide-line/70">
              {answers.map((answer) => (
                <li key={answer.questionId} className="px-5 py-3.5">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                          answer.isCorrect ? "bg-leaf-soft text-[#1c5b36]" : "bg-coral-soft text-[#7d2418]",
                        )}
                      >
                        {answer.isCorrect ? (
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                        ) : (
                          <XCircle className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="text-sm font-semibold leading-snug">{answer.prompt}</span>
                        <span className="mt-0.5 block text-xs font-bold text-muted">
                          Soal {answer.orderIndex} · {answer.isCorrect ? "Benar" : "Belum tepat"} ·{" "}
                          {answer.difficulty}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-primary group-open:hidden">Buka</span>
                    </summary>
                    <div className="mt-2.5 space-y-1.5 pl-9 text-sm">
                      <p className="text-muted">
                        Jawabanmu: <strong className="text-ink">{answer.submittedAnswer}</strong>
                        {answer.answerUnit ? ` ${answer.answerUnit}` : ""}
                      </p>
                      {!answer.isCorrect ? (
                        <p className="text-muted">
                          Jawaban benar:{" "}
                          <strong className="text-ink">
                            {answer.correctAnswer}
                            {answer.answerUnit ? ` ${answer.answerUnit}` : ""}
                          </strong>
                        </p>
                      ) : null}
                      <p className="rounded-xl bg-paper px-3 py-2 leading-relaxed text-ink/85">{answer.explanation}</p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {isTeacher ? (
            <section className="card p-5">
              <h2 className="text-lg font-black">Catatan untuk guru</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Lihat jawaban salah sebagai bahan pengajaran, bukan diagnosis. Siswa dapat mengulangi misi ini
                kapan saja; setiap percobaan tercatat terpisah.
              </p>
              <div className="mt-4">
                <ButtonLink href={backHref} variant="secondary" size="sm">
                  Kembali ke laporan siswa
                </ButtonLink>
              </div>
            </section>
          ) : (
          <section className="card p-5">
            <h2 className="text-lg font-black">{isPractice ? "Latihan selesai" : "Langkah berikutnya"}</h2>
            <p className="mt-1 text-sm text-muted">
              {isPractice
                ? "Soal yang tadinya salah sudah kamu coba lagi. Kalau masih ada yang belum tepat, ulangi latihan dari hasil misi terakhir."
                : accuracy >= 80
                  ? "Kamu siap melanjutkan ke misi berikutnya."
                  : "Ulangi misi ini untuk memperkuat pemahaman, atau lanjut dan kembali lagi nanti."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {isPractice ? (
                <ButtonLink href={`/misi/${mission.slug}`}>
                  <Star className="size-4" aria-hidden="true" />
                  Kembali ke misi {mission.title}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
              ) : nextMission ? (
                <ButtonLink href={`/misi/${nextMission.slug}`}>
                  <Star className="size-4" aria-hidden="true" />
                  Misi berikutnya: {nextMission.title}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
              ) : (
                <ButtonLink href="/progres">
                  Lihat progres belajar
                  <ArrowRight className="size-4" aria-hidden="true" />
                </ButtonLink>
              )}
              {isPractice ? null : (
                <form action={startMissionAction}>
                  <input type="hidden" name="slug" value={mission.slug} />
                  <Button type="submit" variant="secondary">
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Ulangi misi ini
                  </Button>
                </form>
              )}
              <ButtonLink href="/belajar" variant="ghost">
                Ke peta misi
              </ButtonLink>
            </div>
          </section>
          )}
        </>
      )}
    </div>
  );
}
