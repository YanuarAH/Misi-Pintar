"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { completeAttemptAction, submitAnswerAction } from "@/app/actions/student";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AudioSpeechButton } from "@/components/ui/AudioSpeechButton";
import type { PlayQuestion } from "@/server/types";
import { cn } from "@/lib/cn";

type Feedback = { isCorrect: boolean; correctAnswer: string; explanation: string };

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function QuestionImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm text-muted">
        Gambar soal tidak dapat dimuat. Kamu tetap bisa menjawab berdasarkan teks di atas.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Gambar pada soal"
      loading="lazy"
      onError={() => setFailed(true)}
      className="mt-3 h-auto max-h-[26rem] w-auto max-w-full rounded-2xl border border-line bg-white object-contain"
    />
  );
}

export function MissionPlayer({
  attemptId,
  missionTitle,
  questions,
  startIndex,
  allAnswered,
  mode = "mission",
}: {
  attemptId: string;
  missionTitle: string;
  questions: PlayQuestion[];
  startIndex: number;
  allAnswered: boolean;
  mode?: "mission" | "practice";
}) {
  const isPractice = mode === "practice";
  const router = useRouter();
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), questions.length - 1));
  const [selected, setSelected] = useState("");
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCompletion, setShowCompletion] = useState(allAnswered);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answer = question.type === "numeric" ? typed : selected;

  const resetForNext = useCallback(() => {
    setSelected("");
    setTyped("");
    setFeedback(null);
    setHintOpen(false);
    setError(null);
  }, []);

  async function handleCheck() {
    if (busy) return;
    if (!answer.trim()) {
      setError(question.type === "numeric" ? "Tulis jawabanmu dulu, ya." : "Pilih salah satu jawaban dulu.");
      return;
    }
    setBusy(true);
    setError(null);

    const result = await submitAnswerAction({ attemptId, questionId: question.id, answer });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFeedback(result.feedback);
    requestAnimationFrame(() => feedbackRef.current?.focus());
  }

  async function handleFinish() {
    if (busy) return;
    setBusy(true);
    const result = await completeAttemptAction(attemptId);
    if (!result.ok) {
      setBusy(false);
      setError(result.error ?? "Hasil gagal disimpan.");
      return;
    }
    router.push(`/hasil/${attemptId}`);
  }

  function handleNext() {
    if (isLast) {
      void handleFinish();
      return;
    }
    setIndex((current) => current + 1);
    resetForNext();
  }

  if (showCompletion) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="card p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-leaf-soft text-[#1c5b36]">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-xl font-black">
            {isPractice ? "Latihan selesai" : "Semua soal sudah dijawab"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Progresmu tersimpan. Tekan tombol di bawah untuk melihat nilai dan pembahasan.
          </p>
          {error ? (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button onClick={handleFinish} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPractice ? "Lihat hasil latihan" : "Lihat hasil misi"}
              {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
            </Button>
            <Button variant="secondary" onClick={() => setShowCompletion(false)} disabled={busy}>
              Periksa jawaban terakhir
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const isEnglish = /\b(the|is|are|choose|sentence|what|where|which|meaning)\b/i.test(question.prompt);
  const fullQuestionSpeech =
    question.type === "multiple_choice"
      ? `${question.prompt}. ` +
        question.options
          .map((opt, i) => `${isEnglish ? "Option" : "Pilihan"} ${OPTION_LETTERS[i]}: ${opt}`)
          .join(". ")
      : question.prompt;

  const selectedOptionIndex =
    question.type === "multiple_choice" ? question.options.indexOf(selected) : -1;
  const selectedLetter =
    selectedOptionIndex >= 0 ? OPTION_LETTERS[selectedOptionIndex] : "";

  return (
    <div className="mx-auto max-w-2xl pb-28 sm:pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {isPractice ? `Latihan · ${missionTitle}` : missionTitle}
          </p>
          <h1 className="text-lg font-black">
            Soal {index + 1} <span className="font-semibold text-muted">dari {questions.length}</span>
          </h1>
        </div>
        <span
          className={cn(
            "chip",
            question.difficulty === "mudah"
              ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]"
              : question.difficulty === "sedang"
                ? "border-sky/30 bg-sky-soft text-[#1d4b73]"
                : "border-sun/50 bg-sun-soft text-[#7a4a00]",
          )}
        >
          Tingkat: {question.difficulty}
        </span>
      </div>

      <ProgressBar value={index + (feedback ? 1 : 0)} total={questions.length} label="Kemajuan misi" />

      <section className="card mt-4 p-5 sm:p-6" aria-labelledby="soal-judul">
        <div className="flex items-start justify-between gap-3">
          <h2 id="soal-judul" className="text-lg font-bold leading-snug sm:text-xl">
            {question.prompt}
          </h2>
          <AudioSpeechButton text={fullQuestionSpeech} label="Bacakan soal dan pilihan" />
        </div>

        {question.imageUrl ? <QuestionImage src={question.imageUrl} /> : null}

        {question.type === "multiple_choice" ? (
          <fieldset className="mt-5">
            <legend className="sr-only">Pilihan jawaban</legend>
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => {
                const active = selected === option;
                const showCorrect = feedback && option === feedback.correctAnswer;
                return (
                  <button
                    key={`${option}-${optionIndex}`}
                    type="button"
                    disabled={Boolean(feedback) || busy}
                    aria-pressed={active}
                    onClick={() => {
                      if (feedback || busy) return;
                      try {
                        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                          navigator.vibrate(10);
                        }
                      } catch {
                        // Abaikan error haptik
                      }

                      // Jika sudah terpilih dan diketuk lagi, langsung submit jawaban
                      if (selected === option) {
                        void handleCheck();
                        return;
                      }

                      setSelected(option);
                      setError(null);
                    }}
                    className={cn(
                      "flex min-h-[56px] w-full cursor-pointer touch-manipulation items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition active:scale-[0.98]",
                      "disabled:cursor-default disabled:active:scale-100",
                      showCorrect
                        ? "border-leaf bg-leaf-soft text-[#1c5b36]"
                        : active
                          ? "border-primary bg-primary-soft text-primary shadow-sm ring-2 ring-primary/30"
                          : "border-line bg-surface hover:border-line-strong active:bg-paper",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors",
                        showCorrect
                          ? "bg-leaf text-white"
                          : active
                            ? "bg-primary text-white"
                            : "bg-paper text-muted border border-line",
                      )}
                    >
                      {showCorrect ? <CheckCircle2 className="size-5" /> : OPTION_LETTERS[optionIndex]}
                    </span>
                    <span className="flex-1 text-ink">{option}</span>
                    {active && !feedback ? (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                        Terpilih
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-xs text-muted sm:text-left">
              Ketuk pilihan untuk memilih, atau ketuk 2x untuk langsung mengirim jawaban.
            </p>
          </fieldset>
        ) : (
          <div className="mt-5">
            <label htmlFor="jawaban-angka" className="label">
              Jawabanmu
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="jawaban-angka"
                value={typed}
                onChange={(event) => {
                  setTyped(event.target.value);
                  setError(null);
                }}
                disabled={Boolean(feedback) || busy}
                inputMode="decimal"
                autoComplete="off"
                placeholder="Tulis angka saja"
                className="input min-h-12 text-lg font-bold"
              />
              {question.answerUnit ? (
                <span className="flex items-center rounded-2xl border border-line bg-paper px-3 text-sm font-bold text-muted">
                  {question.answerUnit}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Tulis angkanya saja, tanpa titik ribuan atau satuan. Contoh: 25500 atau 1,5.
            </p>
          </div>
        )}

        {question.hint && !feedback ? (
          <div className="mt-4">
            {hintOpen ? (
              <div className="flex gap-2 rounded-2xl border border-sun/40 bg-sun-soft px-4 py-3 text-sm text-[#6a4100]">
                <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  <strong className="font-black">Petunjuk: </strong>
                  {question.hint}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setHintOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                <Lightbulb className="size-4" aria-hidden="true" />
                Butuh petunjuk?
              </button>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 space-y-2">
            <Alert tone="error">{error}</Alert>
            <Button variant="secondary" size="sm" onClick={handleCheck} disabled={busy}>
              Coba lagi
            </Button>
          </div>
        ) : null}

        {!feedback ? (
          <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 rounded-b-3xl border-t border-line bg-surface/98 p-3.5 shadow-xl backdrop-blur-md sm:static sm:mx-0 sm:mb-0 sm:mt-5 sm:rounded-none sm:border-t-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none z-30">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Button
                onClick={handleCheck}
                disabled={busy}
                className={cn(
                  "h-12 w-full text-base font-bold sm:h-11 sm:w-auto shadow-md transition",
                  selected && "bg-primary text-white ring-2 ring-primary/40",
                )}
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                {busy
                  ? "Memeriksa..."
                  : selectedLetter
                    ? `Periksa Pilihan (${selectedLetter})`
                    : "Periksa jawaban"}
              </Button>
              <p className="text-center text-xs text-muted sm:text-left">
                {!answer.trim()
                  ? question.type === "numeric"
                    ? "Ketik angka jawabanmu di atas"
                    : "Pilih salah satu jawaban di atas"
                  : isPractice
                    ? "Latihan bebas mencoba tanpa takut salah."
                    : "Tidak ada pengurangan XP kalau salah."}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {feedback ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          aria-live="polite"
          className="mt-4 animate-rise space-y-3"
        >
          <div
            className={cn(
              "rounded-2xl border-2 p-4",
              feedback.isCorrect ? "border-leaf/40 bg-leaf-soft" : "border-coral/35 bg-coral-soft",
            )}
          >
            <p
              className={cn(
                "flex items-center gap-2 text-base font-black",
                feedback.isCorrect ? "text-[#1c5b36]" : "text-[#7d2418]",
              )}
            >
              {feedback.isCorrect ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : (
                <XCircle className="size-5" aria-hidden="true" />
              )}
              {feedback.isCorrect ? "Tepat sekali!" : "Belum tepat"}
              {feedback.isCorrect && !isPractice ? (
                <span className="chip border-leaf/30 bg-white/70 text-[#1c5b36]">+10 XP</span>
              ) : null}
            </p>
            {!feedback.isCorrect ? (
              <p className={cn("mt-1.5 text-sm font-semibold", "text-[#7d2418]")}>
                Jawaban benar: <strong>{feedback.correctAnswer}</strong>
                {question.answerUnit ? ` ${question.answerUnit}` : ""}
              </p>
            ) : null}
            <div className="mt-2 flex items-start justify-between gap-2">
              <p className="text-sm leading-relaxed text-ink/85">{feedback.explanation}</p>
              <AudioSpeechButton text={feedback.explanation} label="Bacakan penjelasan" size="sm" />
            </div>
          </div>

          <div className="sticky bottom-0 mt-4 rounded-2xl border border-line bg-surface/98 p-3.5 shadow-xl backdrop-blur-md sm:static sm:mt-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none z-30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button
                onClick={handleNext}
                disabled={busy}
                variant={isLast ? "sun" : "primary"}
                className="h-12 w-full text-base font-bold sm:h-11 sm:w-auto"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {isLast ? (isPractice ? "Lihat hasil latihan" : "Lihat hasil misi") : "Soal berikutnya"}
                {!busy ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted sm:justify-start">
                <Lightbulb className="size-3.5 text-sun shrink-0" aria-hidden="true" />
                Penjelasan ini membantu kamu mengingat caranya.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
