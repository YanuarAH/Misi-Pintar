import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, ListChecks, PlayCircle } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { getMissionDetail, getOpenAttemptState } from "@/server/student";
import { startMissionAction } from "@/app/actions/student";
import { MissionPlayer } from "@/components/student/MissionPlayer";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Kerjakan misi", robots: { index: false } };

export default async function MissionPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireStudent();
  const viewer = viewerOf(session);

  const detail = await getMissionDetail(viewer, session.id, slug);
  if (!detail) notFound();

  // Render GET tidak pernah membuat percobaan baru; hanya membaca yang sudah ada.
  const state = await getOpenAttemptState(viewer, session.id, slug);

  if (!state) {
    const locked = !detail.card.unlocked;
    const empty = detail.card.questionCount === 0;

    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/belajar" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke peta misi
        </Link>
        <div className="card p-6 text-center">
          {locked ? (
            <>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-paper text-muted">
                <Lock className="size-6" aria-hidden="true" />
              </span>
              <h1 className="mt-3 text-xl font-black">Misi ini masih terkunci</h1>
              <p className="mt-1.5 text-sm text-muted">
                Selesaikan misi sebelumnya dulu, lalu kembali ke sini.
              </p>
            </>
          ) : empty ? (
            <>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-paper text-muted">
                <ListChecks className="size-6" aria-hidden="true" />
              </span>
              <h1 className="mt-3 text-xl font-black">Misi belum punya soal</h1>
              <p className="mt-1.5 text-sm text-muted">
                Guru belum menambahkan soal untuk misi ini. Coba misi lain dulu.
              </p>
            </>
          ) : (
            <>
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                <PlayCircle className="size-6" aria-hidden="true" />
              </span>
              <h1 className="mt-3 text-xl font-black">Misi belum dimulai</h1>
              <p className="mt-1.5 text-sm text-muted">
                Tekan tombol di bawah untuk memulai &ldquo;{detail.mission.title}&rdquo;. Progres setiap soal
                tersimpan otomatis.
              </p>
              <form action={startMissionAction} className="mt-4 flex justify-center">
                <input type="hidden" name="slug" value={slug} />
                <Button type="submit">Mulai misi sekarang</Button>
              </form>
            </>
          )}

          {locked || empty ? (
            <div className="mt-5 flex justify-center">
              <ButtonLink href="/belajar" variant="secondary">
                Kembali ke peta misi
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const answeredCount = state.answeredIndexes.length;

  return (
    <div>
      <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between gap-3">
        <Link
          href={`/misi/${state.mission.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Keluar dari misi
        </Link>
        {answeredCount > 0 ? (
          <span className="chip bg-surface">{answeredCount} soal sudah dijawab</span>
        ) : null}
      </div>

      {answeredCount > 0 ? (
        <div className="mx-auto mb-3 max-w-2xl">
          <Alert tone="info">Progresmu tersimpan. Kamu melanjutkan dari soal yang belum dijawab.</Alert>
        </div>
      ) : null}

      <MissionPlayer
        attemptId={state.attemptId}
        missionTitle={state.mission.title}
        questions={state.questions}
        startIndex={state.startIndex}
      />
    </div>
  );
}
