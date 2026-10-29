import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Archive, ArrowRight, GraduationCap, Users } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getCurriculumOptions, listTeacherClasses } from "@/server/teacher";
import { ClassForm } from "@/components/teacher/ClassForm";
import { ClassActions } from "@/components/teacher/ClassActions";
import { CopyButton } from "@/components/teacher/CopyButton";
import { Alert } from "@/components/ui/Alert";
import { gradeLabel } from "@/lib/curriculum";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Kelas & siswa", robots: { index: false } };

const MESSAGES: Record<string, string> = {
  arsip: "Kelas diarsipkan. Anggota dan riwayatnya tetap tersimpan.",
  hapus: "Kelas kosong berhasil dihapus permanen.",
  pulih: "Kelas dipulihkan dan kembali aktif.",
};

export default async function TeacherClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string; error?: string }>;
}) {
  const session = await requireTeacher();
  const viewer = viewerOf(session);
  const [classes, options, params] = await Promise.all([
    listTeacherClasses(viewer, session.id),
    getCurriculumOptions(viewer),
    searchParams,
  ]);

  const active = classes.filter((classroom) => classroom.archived_at === null);
  const archived = classes.filter((classroom) => classroom.archived_at !== null);
  const message = params.pesan ? MESSAGES[params.pesan] : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">Kelas &amp; siswa</h1>
        <p className="mt-1 text-sm text-muted">
          Setiap kelas punya kode 6 karakter. Siswa mendaftar sendiri dengan kode ini, tanpa email.
          Tingkat kelas dan mata pelajaran menentukan misi yang otomatis mereka terima.
        </p>
      </header>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {params.error ? <Alert tone="error">{params.error}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-black">
            <GraduationCap className="size-4 text-primary" aria-hidden="true" />
            Buat kelas
          </h2>
          <p className="mt-1 text-sm text-muted">Pilih satu mata pelajaran; misi terbitnya akan muncul otomatis untuk siswa kelas.</p>
          <div className="mt-4">
            <ClassForm subjects={options.subjects.map(({ slug, label }) => ({ slug, label }))} />
          </div>
        </section>

        <section aria-label="Daftar kelas aktif" className="space-y-3">
          {active.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="font-bold">Belum ada kelas aktif</p>
              <p className="mt-1 text-sm text-muted">Buat kelas pertama di formulir sebelah.</p>
            </div>
          ) : (
            active.map((classroom) => (
              <article key={classroom.id} className="card p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <h3 className="break-words text-xl font-black leading-tight">{classroom.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          classroom.grade_level === null || classroom.subject_slug === null
                            ? "chip border-coral/40 bg-coral-soft px-3 py-1.5 text-xs text-[#7d2418]"
                            : "chip bg-primary-soft px-3 py-1.5 text-xs text-primary-strong"
                        }
                      >
                        {gradeLabel(classroom.grade_level)}
                      </span>
                      <span className="chip bg-paper px-3 py-1.5 text-xs">
                        {classroom.subject_label ?? "Mata pelajaran belum diatur"}
                      </span>
                    </div>
                    <p className="text-xs text-muted">Dibuat {formatDate(classroom.created_at)}</p>
                  </div>
                  <div className="flex w-fit items-center gap-2 rounded-2xl border border-line bg-paper px-3.5 py-2 lg:shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Kode kelas</span>
                    <span className="font-mono text-base font-black tracking-[0.2em]">{classroom.join_code}</span>
                    <CopyButton value={classroom.join_code} label="Salin" />
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Siswa</dt>
                    <dd className="flex items-center gap-1 text-base font-black">
                      <Users className="size-3.5 text-muted" aria-hidden="true" />
                      {classroom.studentCount}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Misi mapel</dt>
                    <dd className="text-base font-black">{classroom.missionCount}</dd>
                  </div>
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Penyelesaian</dt>
                    <dd className="text-base font-black">{classroom.completionCount}</dd>
                  </div>
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Rata-rata</dt>
                    <dd className="text-base font-black">
                      {classroom.avg_accuracy === null ? "—" : `${classroom.avg_accuracy}%`}
                    </dd>
                  </div>
                </dl>

                {classroom.grade_level === null || classroom.subject_slug === null ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-sun-soft px-3 py-2 text-[11px] font-bold text-[#7a4a00]">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    Tingkat atau mata pelajaran belum diatur, jadi misi belum dapat dipilih otomatis. Atur di halaman
                    kelas.
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/guru/kelas/${classroom.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                  >
                    Buka kelas &amp; laporan
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <ClassActions
                    classId={classroom.id}
                    name={classroom.name}
                    gradeLevel={classroom.grade_level}
                    studentCount={classroom.studentCount}
                    archived={false}
                  />
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      {archived.length > 0 ? (
        <section aria-label="Kelas diarsipkan" className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="size-4 text-muted" aria-hidden="true" />
            <h2 className="text-lg font-black">Kelas diarsipkan ({archived.length})</h2>
          </div>
          <p className="text-sm text-muted">
            Kelas arsip tidak lagi membuka akses misi baru. Anggota dan riwayat belajar tetap tersimpan.
          </p>
          {archived.map((classroom) => (
            <article key={classroom.id} className="card border-line/70 bg-paper p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <h3 className="break-words text-lg font-black leading-tight text-ink/80">{classroom.name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip border-line bg-surface px-3 py-1.5 text-xs text-muted">Diarsipkan</span>
                    <span className="chip bg-surface px-3 py-1.5 text-xs text-muted">{gradeLabel(classroom.grade_level)}</span>
                    <span className="chip bg-surface px-3 py-1.5 text-xs text-muted">
                      {classroom.subject_label ?? "Mata pelajaran belum diatur"}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {classroom.studentCount} siswa <span aria-hidden="true">·</span> {classroom.missionCount} misi
                  </p>
                </div>
                <ClassActions
                  classId={classroom.id}
                  name={classroom.name}
                  gradeLevel={classroom.grade_level}
                  studentCount={classroom.studentCount}
                  archived
                />
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
