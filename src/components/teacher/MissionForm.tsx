"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { saveMissionAction, type ActionState } from "@/app/actions/teacher";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { MissionRow } from "@/server/types";
import type { CurriculumOptions } from "@/server/teacher";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function MissionForm({
  mission,
  options,
}: {
  mission?: MissionRow;
  options: CurriculumOptions;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveMissionAction, null);
  const [slug, setSlug] = useState(mission?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(mission?.slug));
  const [title, setTitle] = useState(mission?.title ?? "");
  const [subject, setSubject] = useState(mission?.subject_slug ?? options.subjects[0]?.slug ?? "");
  const [topic, setTopic] = useState(mission?.topic_slug ?? "");
  const topics = options.subjects.find((item) => item.slug === subject)?.topics ?? [];

  // Sama seperti form soal: kirim manual agar React tidak mereset isian saat validasi server gagal.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    formAction(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {mission ? <input type="hidden" name="missionId" value={mission.id} /> : null}
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <Field label="Judul misi" htmlFor="title" hint="Singkat dan menarik, misalnya “Pasar Pintar”.">
          <input
            id="title"
            name="title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className="input"
            maxLength={80}
            required
          />
        </Field>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Slug URL" htmlFor="slug" hint="Huruf kecil dan tanda hubung.">
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              className="input font-mono text-sm"
              maxLength={60}
              required
            />
          </Field>
          <Field label="Urutan" htmlFor="orderIndex" hint="1 = pertama">
            <input
              id="orderIndex"
              name="orderIndex"
              type="number"
              min={1}
              max={99}
              defaultValue={mission?.order_index ?? 1}
              className="input w-20"
              required
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-paper/60 p-3.5">
        <p className="text-xs font-black uppercase tracking-wide text-muted">Siapa yang bisa melihat</p>
        <div className="mt-2.5">
          <Field
            label="Audiens misi"
            htmlFor="audience"
            hint="Misi kelas otomatis tampil untuk anggota kelas dengan tingkat dan mata pelajaran yang cocok. Misi belajar mandiri juga bisa dilihat siswa tanpa kelas."
          >
            <select
              id="audience"
              name="audience"
              defaultValue={mission?.audience ?? "class_only"}
              className="input"
            >
              <option value="class_only">Kelas dengan kurikulum yang cocok</option>
              <option value="public">Kelas yang cocok dan siswa belajar mandiri</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-paper/60 p-3.5">
        <p className="text-xs font-black uppercase tracking-wide text-muted">Kategori pembelajaran</p>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
          <Field label="Tingkat kelas" htmlFor="gradeLevel" hint="Siswa hanya menerima misi tingkat kelasnya.">
            <select
              id="gradeLevel"
              name="gradeLevel"
              defaultValue={mission?.grade_level ?? ""}
              className="input"
              required
            >
              <option value="" disabled>
                Pilih tingkat
              </option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>
                  {gradeLabel(grade)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mata pelajaran" htmlFor="subject">
            <select
              id="subject"
              name="subject"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setTopic("");
              }}
              className="input"
              required
            >
              {options.subjects.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Topik / materi" htmlFor="topic" hint="Topik dari mata pelajaran yang dipilih.">
            <select
              id="topic"
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="input"
              required
            >
              <option value="" disabled>
                Pilih topik
              </option>
              {topics.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted">
          Tingkat kelas berbeda dari kelas belajar (mis. 5A). Kelas belajar diatur di menu Kelas &amp; siswa.
        </p>
      </div>

      <Field label="Deskripsi singkat" htmlFor="description" hint="Tampil di peta misi. Maksimal 600 karakter.">
        <textarea
          id="description"
          name="description"
          defaultValue={mission?.description ?? ""}
          className="input min-h-20"
          maxLength={600}
        />
      </Field>

      <Field label="Cerita misi" htmlFor="story" hint="Pengantar singkat sebelum siswa mengerjakan soal.">
        <textarea
          id="story"
          name="story"
          defaultValue={mission?.story ?? ""}
          className="input min-h-28"
          maxLength={2000}
        />
      </Field>

      <Field
        label="Tujuan pembelajaran"
        htmlFor="learningObjectives"
        hint="Satu tujuan per baris. Maksimal 8 baris."
      >
        <textarea
          id="learningObjectives"
          name="learningObjectives"
          defaultValue={(mission?.learning_objectives ?? []).join("\n")}
          className="input min-h-24"
          placeholder={"Menghitung total belanja\nMenghitung uang kembalian"}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Menyimpan..." : mission ? "Simpan perubahan" : "Buat misi"}
        </Button>
        <p className="text-xs text-muted">
          {mission ? "Perubahan langsung terlihat oleh siswa bila misi sudah terbit." : "Misi baru dibuat sebagai draf."}
        </p>
      </div>
    </form>
  );
}
