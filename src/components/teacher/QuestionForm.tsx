"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
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
  const router = useRouter();
  const objectUrlRef = useRef<string | null>(null);
  const [storedId, setStoredId] = useState<string | null>(question?.image_id ?? null);
  const [localFile, setLocalFile] = useState<{ url: string; name: string } | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const preview = localFile?.url ?? (storedId ? `/media/${storedId}` : null);

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function showLocalPreview(file: File) {
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLocalFile({ url, name: file.name });
  }

  function clearImage() {
    revokeObjectUrl();
    setLocalFile(null);
    setStoredId(null);
    setRemoveImage(true);
    setImageError(null);
    const input = formRef.current?.elements.namedItem("image");
    if (input instanceof HTMLInputElement) input.value = "";
  }

  // Object URL hanya untuk pratinjau: jangan sampai menumpuk atau bocor saat form ditutup.
  useEffect(() => revokeObjectUrl, []);

  // Setelah server menyimpan gambar baru, ID dari database menggantikan pratinjau lokal.
  useEffect(() => {
    if (state?.success && question?.image_id) {
      revokeObjectUrl();
      setLocalFile(null);
      setStoredId(question.image_id);
      setRemoveImage(false);
    }
  }, [state, question?.image_id]);

  useEffect(() => {
    if (state?.success) {
      if (!question) {
        formRef.current?.reset();
        revokeObjectUrl();
        setLocalFile(null);
        setStoredId(null);
        setRemoveImage(false);
        setImageError(null);
      }
      router.refresh();
    }
  }, [state, question, router]);

  /**
   * Dikirim manual: kalau memakai `action={formAction}`, React mereset seluruh field
   * begitu action selesai — termasuk file yang sudah dipilih. Guru jadi kehilangan
   * isian soal hanya karena satu validasi server gagal.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formAction(new FormData(event.currentTarget));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
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

      <fieldset className="rounded-2xl border border-line bg-paper p-4">
        <legend className="label px-1">Gambar soal (opsional)</legend>
        <input type="hidden" name="removeImage" value={removeImage ? "1" : "0"} />

        {preview ? (
          <figure className="mb-3 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Pratinjau gambar soal"
              className="max-h-52 w-auto max-w-full rounded-xl border border-line bg-white object-contain"
              onError={() =>
                setImageError(
                  localFile
                    ? "Pratinjau gagal dimuat. Coba pilih file gambar lain."
                    : "Gambar tersimpan tidak bisa dimuat. Pilih ulang file untuk menggantinya.",
                )
              }
            />
            <figcaption className="text-xs text-muted">
              {localFile
                ? `Pratinjau lokal: ${localFile.name}, belum tersimpan sampai kamu menekan ${
                    question ? "Simpan soal" : "Tambah soal"
                  }.`
                : "Gambar tersimpan di server."}
            </figcaption>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={clearImage}>
                <X className="size-3.5" aria-hidden="true" />
                Hapus gambar
              </Button>
              {localFile && (storedId || question?.image_id) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    revokeObjectUrl();
                    setLocalFile(null);
                    setRemoveImage(false);
                    setStoredId(question?.image_id ?? null);
                    setImageError(null);
                    const input = formRef.current?.elements.namedItem("image");
                    if (input instanceof HTMLInputElement) input.value = "";
                  }}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Batalkan penggantian
                </Button>
              ) : null}
            </div>
          </figure>
        ) : (
          <p className="mb-3 rounded-xl border border-dashed border-line bg-white px-3 py-4 text-center text-xs text-muted">
            Belum ada gambar untuk soal ini.
          </p>
        )}

        <label
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-sm font-bold text-ink hover:border-primary"
          htmlFor={`image-${question?.id ?? "baru"}`}
        >
          <ImagePlus className="size-4 text-primary" aria-hidden="true" />
          {preview ? "Ganti gambar" : "Pilih gambar"}
        </label>
        <input
          id={`image-${question?.id ?? "baru"}`}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setImageError(null);
            if (!file) return;
            if (file.size > 3 * 1024 * 1024) {
              setImageError("Ukuran gambar maksimal 3 MB.");
              event.target.value = "";
              return;
            }
            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
              setImageError("Format gambar harus JPEG, PNG, atau WebP.");
              event.target.value = "";
              return;
            }
            setRemoveImage(false);
            setImageError(null);
            showLocalPreview(file);
          }}
        />
        <p className="mt-1.5 text-xs text-muted">JPEG, PNG, atau WebP · maksimal 3 MB. Tipe file diperiksa ulang di server.</p>
        {imageError ? <p className="mt-1 text-xs font-bold text-[#7d2418]">{imageError}</p> : null}
      </fieldset>

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
