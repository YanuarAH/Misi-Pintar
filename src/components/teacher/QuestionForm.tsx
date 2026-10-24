"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveQuestionAction, type ActionState } from "@/app/actions/teacher";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { SELECTABLE_TOPICS } from "@/lib/topics";
import type { QuestionRow } from "@/server/types";

const MAX_OPTIONS = 6;

export function QuestionForm({
  missionId,
  question,
  nextOrder,
  nextSlot,
}: {
  missionId: string;
  question?: QuestionRow;
  nextOrder: number;
  nextSlot: number;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveQuestionAction, null);
  const [type, setType] = useState<"multiple_choice" | "numeric">(question?.question_type ?? "multiple_choice");
  const [options, setOptions] = useState<string[]>(
    question?.options && question.options.length >= 2 ? question.options : ["", "", "", ""],
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && !question) formRef.current?.reset();
  }, [state, question]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="missionId" value={missionId} />
      {question ? <input type="hidden" name="questionId" value={question.id} /> : null}

      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Jenis jawaban" htmlFor={`type-${question?.id ?? "baru"}`}>
          <select
            id={`type-${question?.id ?? "baru"}`}
            name="questionType"
            value={type}
            onChange={(event) => setType(event.target.value as "multiple_choice" | "numeric")}
            className="input"
          >
            <option value="multiple_choice">Pilihan ganda</option>
            <option value="numeric">Jawaban angka</option>
          </select>
        </Field>

        <Field label="Tingkat kesulitan" htmlFor={`difficulty-${question?.id ?? "baru"}`}>
          <select
            id={`difficulty-${question?.id ?? "baru"}`}
            name="difficulty"
            defaultValue={question?.difficulty ?? "sedang"}
            className="input"
          >
            <option value="mudah">Mudah</option>
            <option value="sedang">Sedang</option>
            <option value="tantangan">Tantangan</option>
          </select>
        </Field>

        <Field label="Topik" htmlFor={`topic-${question?.id ?? "baru"}`}>
          <select
            id={`topic-${question?.id ?? "baru"}`}
            name="topic"
            defaultValue={question?.topic ?? "umum"}
            className="input"
          >
            {SELECTABLE_TOPICS.map((topic) => (
              <option key={topic.key} value={topic.key}>
                {topic.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Slot soal"
          htmlFor={`slot-${question?.id ?? "baru"}`}
          hint="Soal lain di slot yang sama menjadi varian. Satu varian dipilih acak tiap percobaan."
        >
          <input
            id={`slot-${question?.id ?? "baru"}`}
            name="slotIndex"
            type="number"
            min={1}
            max={50}
            defaultValue={question?.slot_index ?? nextSlot}
            className="input"
            required
          />
        </Field>

        <Field label="Urutan tampil" htmlFor={`order-${question?.id ?? "baru"}`}>
          <input
            id={`order-${question?.id ?? "baru"}`}
            name="orderIndex"
            type="number"
            min={1}
            max={99}
            defaultValue={question?.order_index ?? nextOrder}
            className="input"
            required
          />
        </Field>
      </div>

      <Field label="Pertanyaan" htmlFor={`prompt-${question?.id ?? "baru"}`}>
        <textarea
          id={`prompt-${question?.id ?? "baru"}`}
          name="prompt"
          defaultValue={question?.prompt ?? ""}
          className="input min-h-24"
          maxLength={1000}
          required
        />
      </Field>

      {type === "multiple_choice" ? (
        <fieldset className="space-y-2">
          <legend className="label">Pilihan jawaban</legend>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 text-sm font-black text-muted" aria-hidden="true">
                {String.fromCharCode(65 + index)}
              </span>
              <input
                name="option"
                value={option}
                onChange={(event) => {
                  const next = [...options];
                  next[index] = event.target.value;
                  setOptions(next);
                }}
                className="input"
                placeholder={`Pilihan ${String.fromCharCode(65 + index)}`}
                maxLength={200}
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setOptions(options.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-full p-2 text-muted hover:bg-coral-soft hover:text-coral"
                  aria-label={`Hapus pilihan ${String.fromCharCode(65 + index)}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
          {options.length < MAX_OPTIONS ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOptions([...options, ""])}>
              <Plus className="size-4" aria-hidden="true" />
              Tambah pilihan
            </Button>
          ) : null}
        </fieldset>
      ) : (
        <input type="hidden" name="option" value="" />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Jawaban benar"
          htmlFor={`answer-${question?.id ?? "baru"}`}
          hint={
            type === "multiple_choice"
              ? "Tulis persis sama dengan salah satu pilihan di atas."
              : "Angka saja, contoh: 25500 atau 1,5. Jawaban siswa akan dinormalisasi."
          }
        >
          <input
            id={`answer-${question?.id ?? "baru"}`}
            name="correctAnswer"
            defaultValue={question?.correct_answer ?? ""}
            className="input font-semibold"
            list={type === "multiple_choice" ? "daftar-pilihan" : undefined}
            maxLength={300}
            required
          />
          {type === "multiple_choice" ? (
            <datalist id="daftar-pilihan">
              {options.filter(Boolean).map((option, index) => (
                <option key={`${option}-${index}`} value={option} />
              ))}
            </datalist>
          ) : null}
        </Field>

        <Field label="Petunjuk (opsional)" htmlFor={`hint-${question?.id ?? "baru"}`} hint="Tidak mengurangi XP.">
          <input
            id={`hint-${question?.id ?? "baru"}`}
            name="hint"
            defaultValue={question?.hint ?? ""}
            className="input"
            maxLength={300}
          />
        </Field>
      </div>

      <Field label="Penjelasan jawaban" htmlFor={`explanation-${question?.id ?? "baru"}`} hint="Ditampilkan setelah siswa menjawab.">
        <textarea
          id={`explanation-${question?.id ?? "baru"}`}
          name="explanation"
          defaultValue={question?.explanation ?? ""}
          className="input min-h-20"
          maxLength={1200}
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" aria-hidden="true" />
        {pending ? "Menyimpan..." : question ? "Simpan soal" : "Tambah soal"}
      </Button>
    </form>
  );
}
