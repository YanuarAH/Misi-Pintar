import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { getPracticeState } from "@/server/student";
import { MissionPlayer } from "@/components/student/MissionPlayer";

export const metadata: Metadata = { title: "Latihan soal", robots: { index: false } };

export default async function PracticePage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await requireStudent();
  const { attemptId } = await params;
  const state = await getPracticeState(viewerOf(session), session.id, attemptId);
  if (!state) notFound();

  return (
    <div className="space-y-4">
      <p className="mx-auto flex max-w-2xl items-start gap-2 rounded-2xl bg-sky-soft px-4 py-3 text-xs leading-relaxed text-[#1d4b73]">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Ini latihan dari soal yang belum tepat. XP dan lencanamu tidak berubah, jadi kamu bebas mencoba
        berapa kali pun.
      </p>

      <MissionPlayer
        attemptId={state.attemptId}
        missionTitle={state.mission.title}
        questions={state.questions}
        startIndex={state.startIndex}
        allAnswered={state.allAnswered}
        mode="practice"
      />
    </div>
  );
}
