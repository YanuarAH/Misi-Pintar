import { ArrowRight, Check, Lock, Play } from "lucide-react";
import { startMissionAction } from "@/app/actions/student";
import { Button } from "@/components/ui/Button";
import type { MissionCard } from "@/server/types";
import { cn } from "@/lib/cn";
import { curriculumLabel } from "@/lib/curriculum";
import { missionVisual } from "./missionMeta";

function StatusBadge({ card }: { card: MissionCard }) {
  if (!card.unlocked) {
    return (
      <span className="chip border-line text-muted">
        <Lock className="size-3.5" aria-hidden="true" /> Terkunci
      </span>
    );
  }
  if (card.completed) {
    return (
      <span className="chip border-leaf/30 bg-leaf-soft text-[#1c5b36]">
        <Check className="size-3.5" aria-hidden="true" /> Selesai
      </span>
    );
  }
  if (card.openAttemptId) {
    return (
      <span className="chip border-sun/50 bg-sun-soft text-[#7a4a00]">
        <Play className="size-3.5" aria-hidden="true" /> Sedang dikerjakan
      </span>
    );
  }
  return (
    <span className="chip border-primary/30 bg-primary-soft text-primary-strong">
      <Play className="size-3.5" aria-hidden="true" /> Siap dimulai
    </span>
  );
}

export function MissionMap({ cards, emptyHint }: { cards: MissionCard[]; emptyHint?: string }) {
  if (cards.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="font-bold">Belum ada misi untukmu.</p>
        <p className="mt-1 text-sm text-muted">
          {emptyHint ?? "Tunggu gurumu menerbitkan misi untuk tingkat kelasmu, lalu muat ulang halaman ini."}
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-3.5">
      <span
        aria-hidden="true"
        className="absolute left-[26px] top-8 bottom-8 w-0.5 border-l-2 border-dashed border-line-strong"
      />
      {cards.map((card) => {
        const visual = missionVisual(card.slug);
        const nodeClass = !card.unlocked
          ? "border-line bg-paper text-muted"
          : card.completed
            ? "border-leaf bg-leaf text-white"
            : "border-primary bg-primary text-white";

        return (
          <li key={card.id} className="relative pl-16">
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-4 flex size-14 items-center justify-center rounded-full border-2 text-lg font-black shadow-sm",
                nodeClass,
              )}
            >
              {!card.unlocked ? <Lock className="size-5" /> : card.completed ? <Check className="size-6" /> : card.orderIndex}
            </span>

            <article
              className={cn(
                "card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5",
                !card.unlocked && "opacity-80",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("flex size-9 items-center justify-center rounded-xl text-lg", visual.tint)}>
                    <span aria-hidden="true">{visual.emoji}</span>
                  </span>
                  <h3 className="text-lg font-black leading-tight">{card.title}</h3>
                  <StatusBadge card={card} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{card.description}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted">
                  <span className="chip bg-primary-soft text-[10px] text-primary-strong">
                    {curriculumLabel({
                      gradeLevel: card.gradeLevel,
                      subjectLabel: card.subjectLabel,
                      topicLabel: card.topicLabel,
                    })}
                  </span>
                </p>
                <p className="mt-1.5 text-xs font-bold text-muted">
                  {card.questionCount} soal
                  {card.completed && card.bestScore !== null ? ` · skor terbaik ${card.bestScore}` : ""}
                  {card.attemptCount > 1 ? ` · ${card.attemptCount} percobaan` : ""}
                </p>
              </div>

              <div className="shrink-0">
                {card.unlocked ? (
                  <form action={startMissionAction} className="w-full sm:w-auto">
                    <input type="hidden" name="slug" value={card.slug} />
                    <Button
                      type="submit"
                      variant={card.completed ? "secondary" : "primary"}
                      className="w-full sm:w-auto"
                    >
                      {card.completed ? "Ulangi misi" : card.openAttemptId ? "Lanjutkan" : "Mulai misi"}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </form>
                ) : (
                  <p className="max-w-[12rem] text-xs font-semibold text-muted">
                    Selesaikan misi sebelumnya untuk membuka ini.
                  </p>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
