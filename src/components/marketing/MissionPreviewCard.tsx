import { ArrowRight, ListChecks } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

const emojiBySlug: Record<string, string> = {
  "pasar-pintar": "🛒",
  "koki-pecahan": "🧁",
  "arsitek-mini": "📐",
};

export function MissionPreviewCard({
  orderIndex,
  slug,
  title,
  description,
  questionCount,
}: {
  orderIndex: number;
  slug: string;
  title: string;
  description: string;
  questionCount: number;
}) {
  return (
    <article className="card flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-paper text-2xl ring-1 ring-line">
          <span aria-hidden="true">{emojiBySlug[slug] ?? "✨"}</span>
        </span>
        <span className="chip">Misi {orderIndex}</span>
      </div>
      <h3 className="text-xl font-black">{title}</h3>
      <p className="flex-1 text-sm leading-relaxed text-muted">{description}</p>
      <div className="flex items-center gap-2 text-xs font-bold text-muted">
        <ListChecks className="size-4" aria-hidden="true" />
        {questionCount} soal · umpan balik langsung
      </div>
      <ButtonLink href="/masuk" variant="secondary" size="sm" className="mt-1 w-full justify-between">
        Coba misi ini
        <ArrowRight className="size-4" aria-hidden="true" />
      </ButtonLink>
    </article>
  );
}
