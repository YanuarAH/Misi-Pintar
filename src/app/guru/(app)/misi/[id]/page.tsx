import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, EyeOff, ListChecks, Plus, Trash2 } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getMissionForEdit } from "@/server/teacher";
import {
  archiveMissionAction,
  archiveQuestionAction,
  setMissionClassesAction,
  togglePublishAction,
} from "@/app/actions/teacher";
import { gradeLabel } from "@/lib/curriculum";
import { MissionForm } from "@/components/teacher/MissionForm";
import { QuestionForm } from "@/components/teacher/QuestionForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Kelola misi", robots: { index: false } };

export default async function MissionEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tersimpan?: string }>;
}) {
  const session = await requireTeacher();
  const { id } = await params;
  const { error, tersimpan } = await searchParams;
  const data = await getMissionForEdit(viewerOf(session), id, session.id);
  if (!data) notFound();

  const { mission, questions, stats, publishIssues, slotCount, options, classes, assignedClassIds } = data;
  const compatibleClasses = classes.filter((item) => item.gradeLevel === mission.grade_level);
  const canPublish = publishIssues.length === 0;
  const nextOrder = questions.length + 1;
  const nextSlot = questions.reduce((max, question) => Math.max(max, question.slot_index), 0) + 1;

  return (
    <div className="space-y-5">
      <Link href="/guru/misi" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua misi
      </Link>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {tersimpan === "kelas" ? <Alert tone="success">Penugasan kelas tersimpan.</Alert> : null}

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "chip",
                  mission.is_published ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "bg-paper",
                )}
              >
                {mission.is_published ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}
                {mission.is_published ? "Terbit" : "Draf"}
              </span>
              <span className="chip bg-paper">
                <ListChecks className="size-3.5" aria-hidden="true" />
                {slotCount} soal per percobaan
              </span>
              <span className="chip bg-paper">{questions.length} soal tersimpan</span>
              <span className="chip bg-paper">Urutan {mission.order_index}</span>
              <span
                className={cn(
                  "chip",
                  mission.grade_level === null
                    ? "border-coral/40 bg-coral-soft text-[#7d2418]"
                    : "bg-primary-soft text-primary-strong",
                )}
              >
                {gradeLabel(mission.grade_level)}
              </span>
              {mission.subject_slug ? (
                <span className="chip bg-paper">
                  {options.subjects.find((item) => item.slug === mission.subject_slug)?.label ?? mission.subject_slug}
                </span>
              ) : null}
              {mission.topic_slug ? (
                <span className="chip bg-paper">
                  {options.subjects
                    .flatMap((item) => item.topics)
                    .find((item) => item.slug === mission.topic_slug)?.label ?? mission.topic_slug}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-black">{mission.title}</h1>
            <p className="font-mono text-xs text-muted">/{mission.slug}</p>
            <p className="mt-2 text-sm text-muted">
              {stats.attempts} percobaan selesai
              {stats.avgScore !== null ? ` · rata-rata skor ${stats.avgScore}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <form action={togglePublishAction}>
              <input type="hidden" name="missionId" value={mission.id} />
              <input type="hidden" name="publish" value={mission.is_published ? "false" : "true"} />
              <Button
                type="submit"
                variant={mission.is_published ? "secondary" : "primary"}
                disabled={!mission.is_published && !canPublish}
                title={!canPublish ? "Perbaiki dulu masalah validasi soal" : undefined}
              >
                {mission.is_published ? (
                  <>
                    <EyeOff className="size-4" aria-hidden="true" />
                    Tarik dari siswa
                  </>
                ) : (
                  <>
                    <Eye className="size-4" aria-hidden="true" />
                    Terbitkan misi
                  </>
                )}
              </Button>
            </form>
            <ConfirmSubmit
              action={archiveMissionAction}
              hiddenFields={{ missionId: mission.id }}
              triggerLabel="Arsipkan"
              confirmLabel="Ya, arsipkan"
              question="Arsipkan misi ini? Riwayat percobaan siswa tetap tersimpan."
              variant="secondary"
            />
          </div>
        </div>

        {!canPublish && !mission.is_published ? (
          <div className="mt-4">
            <Alert tone="error">
              <p className="font-bold">Misi belum bisa diterbitkan:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {publishIssues.slice(0, 6).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Alert>
          </div>
        ) : null}
        {mission.is_published && publishIssues.length > 0 ? (
          <div className="mt-4">
            <Alert tone="info">
              Misi sedang terbit, tetapi ada {publishIssues.length} masalah validasi pada soal. Siswa tetap bisa
              mengerjakan; sebaiknya perbaiki agar penilaian konsisten.
            </Alert>
          </div>
        ) : null}
      </header>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-black">Kelas belajar yang ditugaskan</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Kosongkan semua centang agar misi ini terbuka untuk semua kelas tingkat {gradeLabel(mission.grade_level)}.
              Penugasan tidak menyalin misi.
            </p>
          </div>
          <span className="chip bg-paper">{assignedClassIds.length} kelas</span>
        </div>

        {mission.grade_level === null ? (
          <div className="mt-3">
            <Alert tone="error">Pilih tingkat kelas misi lebih dulu sebelum menugaskan ke kelas belajar.</Alert>
          </div>
        ) : compatibleClasses.length === 0 ? (
          <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs text-muted">
            Belum ada kelas belajar tingkat {gradeLabel(mission.grade_level)}. Buat kelas dengan tingkat yang sama di
            menu Kelas &amp; siswa.
          </p>
        ) : (
          <form action={setMissionClassesAction} className="mt-3 space-y-3">
            <input type="hidden" name="missionId" value={mission.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              {compatibleClasses.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-bold"
                >
                  <input
                    type="checkbox"
                    name="classId"
                    value={item.id}
                    defaultChecked={assignedClassIds.includes(item.id)}
                    className="size-4"
                  />
                  {item.name}
                  <span className="ml-auto text-[11px] font-semibold text-muted">{gradeLabel(item.gradeLevel)}</span>
                </label>
              ))}
            </div>
            <Button type="submit" size="sm">
              Simpan penugasan
            </Button>
          </form>
        )}
      </section>

      <details className="card group p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="text-base font-black">Pengaturan misi</span>
          <span className="text-xs font-bold text-primary group-open:hidden">Buka</span>
          <span className="hidden text-xs font-bold text-muted group-open:inline">Tutup</span>
        </summary>
        <div className="mt-4 border-t border-line pt-4">
          <MissionForm mission={mission} options={options} />
        </div>
      </details>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black">Soal ({questions.length})</h2>
            <p className="text-sm text-muted">
              {slotCount} slot · siswa mengerjakan satu soal per slot, varian dipilih acak.
            </p>
          </div>
        </div>

        <details className="card group p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-black">
              <Plus className="size-4 text-primary" aria-hidden="true" />
              Tambah soal baru
            </span>
            <span className="text-xs font-bold text-primary group-open:hidden">Buka formulir</span>
            <span className="hidden text-xs font-bold text-muted group-open:inline">Tutup</span>
          </summary>
          <div className="mt-4 border-t border-line pt-4">
            <QuestionForm missionId={mission.id} nextOrder={nextOrder} nextSlot={nextSlot} />
          </div>
        </details>

        {questions.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="font-bold">Belum ada soal.</p>
            <p className="mt-1 text-sm text-muted">Tambahkan minimal satu soal agar misi bisa diterbitkan.</p>
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {questions.map((question) => (
              <details key={question.id} className="group">
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-paper text-xs font-black text-muted">
                    {question.order_index}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-bold leading-snug">{question.prompt}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="chip bg-primary-soft text-[10px] text-primary-strong">
                        Slot {question.slot_index}
                        {question.variant_index > 0 ? ` · varian ${question.variant_index + 1}` : ""}
                      </span>
                      <span className="chip bg-paper text-[10px]">
                        {question.question_type === "multiple_choice" ? "Pilihan ganda" : "Jawaban angka"}
                      </span>
                      <span className="chip bg-paper text-[10px]">{question.difficulty}</span>
                      {question.issues.length > 0 ? (
                        <span className="chip border-coral/30 bg-coral-soft text-[10px] text-[#7d2418]">
                          <AlertTriangle className="size-3" aria-hidden="true" />
                          {question.issues[0]}
                        </span>
                      ) : (
                        <span className="chip border-leaf/30 bg-leaf-soft text-[10px] text-[#1c5b36]">
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          Valid
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-primary group-open:hidden">Edit</span>
                </summary>

                <div className="space-y-4 border-t border-line bg-paper/40 p-4">
                  <div className="grid gap-2 rounded-2xl border border-line bg-surface p-3.5 text-sm">
                    <p>
                      <span className="font-bold">Jawaban benar: </span>
                      {question.correct_answer}
                      {question.answer_unit ? ` ${question.answer_unit}` : ""}
                    </p>
                    {question.options ? (
                      <p className="text-muted">
                        <span className="font-bold text-ink">Pilihan: </span>
                        {question.options.join(" · ")}
                      </p>
                    ) : null}
                    <p className="text-muted">
                      <span className="font-bold text-ink">Penjelasan: </span>
                      {question.explanation}
                    </p>
                    {question.hint ? (
                      <p className="text-muted">
                        <span className="font-bold text-ink">Petunjuk: </span>
                        {question.hint}
                      </p>
                    ) : null}
                  </div>

                  <QuestionForm
                    missionId={mission.id}
                    question={question}
                    nextOrder={nextOrder}
                    nextSlot={nextSlot}
                  />

                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <Trash2 className="size-4 text-coral" aria-hidden="true" />
                    <span className="text-xs text-muted">
                      Menghapus soal menyembunyikannya dari misi, tetapi riwayat jawaban lama tetap tersimpan.
                    </span>
                    <ConfirmSubmit
                      action={archiveQuestionAction}
                      hiddenFields={{ missionId: mission.id, questionId: question.id }}
                      triggerLabel="Hapus soal"
                      confirmLabel="Ya, hapus"
                      question="Hapus soal ini dari misi?"
                    />
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
