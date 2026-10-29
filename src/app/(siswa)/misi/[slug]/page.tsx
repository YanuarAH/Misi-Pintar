import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, HelpCircle, ListChecks, Lock, Star, Target } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { getMissionDetail } from "@/server/student";
import { Button } from "@/components/ui/Button";
import { startMissionAction } from "@/app/actions/student";
import { missionVisual } from "@/components/student/missionMeta";
import { Alert } from "@/components/ui/Alert";
import { curriculumLabel } from "@/lib/curriculum";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Misi ${slug.replace(/-/g, " ")}`, robots: { index: false } };
}

export default async function MissionOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await requireStudent();
  const detail = await getMissionDetail(viewerOf(session), session.id, slug);
  if (!detail) notFound();

  const { mission, card, nextMission, estimatedMinutes, rewardXp, subjectLabel, topicLabel } = detail;
  const visual = missionVisual(mission.slug);

  return (
    <div className="space-y-5">
      <Link href="/belajar" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke peta misi
      </Link>

      {query.error ? <Alert tone="error">{query.error}</Alert> : null}

      <header className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper/60 px-5 py-3">
          <span className="chip bg-surface">Misi {card.orderIndex}</span>
          <span className="chip bg-primary-soft text-primary-strong">
            {curriculumLabel({ gradeLevel: card.gradeLevel, subjectLabel, topicLabel })}
          </span>
          <span className="chip bg-surface">
            <ListChecks className="size-3.5" aria-hidden="true" /> {card.questionCount} soal
          </span>
          <span className="chip bg-surface">
            <Clock className="size-3.5" aria-hidden="true" /> {estimatedMinutes} menit
          </span>
          <span className="chip border-sun/40 bg-sun-soft text-[#7a4a00]">
            <Star className="size-3.5 text-sun" aria-hidden="true" /> hingga {rewardXp} XP
          </span>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="flex items-start gap-3">
              <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${visual.tint}`}>
                <span aria-hidden="true">{visual.emoji}</span>
              </span>
              <div>
                <h1 className="text-2xl font-black sm:text-3xl">{mission.title}</h1>
                <p className="mt-1 text-sm leading-relaxed text-muted">{mission.description}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-paper/70 p-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-muted">Cerita misi</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/85">{mission.story}</p>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-line p-4">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <Target className="size-4 text-primary" aria-hidden="true" />
                Yang akan kamu pelajari
              </h2>
              <ul className="mt-2.5 space-y-1.5">
                {mission.learning_objectives.length === 0 ? (
                  <li className="text-sm text-muted">Guru belum menuliskan tujuan pembelajaran.</li>
                ) : (
                  mission.learning_objectives.map((objective) => (
                    <li key={objective} className="flex gap-2 text-sm leading-snug text-ink/85">
                      <span aria-hidden="true" className="mt-0.5 text-leaf">
                        ✓
                      </span>
                      {objective}
                    </li>
                  ))
                )}
              </ul>
            </div>

            {card.unlocked ? (
              <div className="space-y-2.5">
                <form action={startMissionAction}>
                  <input type="hidden" name="slug" value={mission.slug} />
                  <Button type="submit" className="w-full">
                    {card.openAttemptId ? "Lanjutkan misi" : card.completed ? "Ulangi misi" : "Mulai misi"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </form>
                {card.completed ? (
                  <p className="text-center text-xs leading-relaxed text-muted">
                    Skor terbaikmu {card.bestScore}. Percobaan baru selalu dicatat di riwayat, tetapi XP hanya
                    bertambah bila skormu melampaui rekor sebelumnya (maksimal {rewardXp} XP per misi).
                  </p>
                ) : (
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                    <HelpCircle className="size-3.5" aria-hidden="true" />
                    Ada petunjuk di setiap soal, tidak mengurangi XP.
                  </p>
                )}
                {nextMission ? (
                  <p className="rounded-xl bg-leaf-soft px-3 py-2 text-center text-xs font-semibold text-[#1c5b36]">
                    Setelah selesai, misi “{nextMission.title}” akan terbuka.
                  </p>
                ) : (
                  <p className="rounded-xl bg-paper px-3 py-2 text-center text-xs font-semibold text-muted">
                    Ini misi terakhir yang tersedia untuk {subjectLabel ?? "mata pelajaran ini"} saat ini.
                  </p>
                )}
              </div>
            ) : (
              <Alert tone="info">
                <span className="flex items-center gap-1.5 font-bold">
                  <Lock className="size-4" aria-hidden="true" />
                  Misi ini masih terkunci
                </span>
                <span className="mt-1 block">
                  Selesaikan misi sebelumnya dulu. Tidak perlu nilai sempurna, yang penting selesai.
                </span>
              </Alert>
            )}
          </aside>
        </div>
      </header>
    </div>
  );
}
