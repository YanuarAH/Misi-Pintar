import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { listTeacherClasses } from "@/server/teacher";
import { ClassForm } from "@/components/teacher/ClassForm";
import { CopyButton } from "@/components/teacher/CopyButton";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Kelas & siswa", robots: { index: false } };

export default async function TeacherClassesPage() {
  const session = await requireTeacher();
  const classes = await listTeacherClasses(viewerOf(session), session.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">Kelas &amp; siswa</h1>
        <p className="mt-1 text-sm text-muted">
          Setiap kelas punya kode 6 karakter. Siswa mendaftar sendiri dengan kode ini, tanpa email.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-black">
            <GraduationCap className="size-4 text-primary" aria-hidden="true" />
            Buat kelas
          </h2>
          <p className="mt-1 text-sm text-muted">Nama kelas hanya terlihat oleh Anda dan siswa di kelas itu.</p>
          <div className="mt-4">
            <ClassForm />
          </div>
        </section>

        <section aria-label="Daftar kelas" className="space-y-3">
          {classes.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="font-bold">Belum ada kelas</p>
              <p className="mt-1 text-sm text-muted">Buat kelas pertama di formulir sebelah.</p>
            </div>
          ) : (
            classes.map((classroom) => (
              <article key={classroom.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">{classroom.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">Dibuat {formatDate(classroom.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Kode kelas</span>
                    <span className="font-mono text-base font-black tracking-[0.2em]">{classroom.join_code}</span>
                    <CopyButton value={classroom.join_code} label="Salin" />
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Siswa</dt>
                    <dd className="flex items-center gap-1 text-base font-black">
                      <Users className="size-3.5 text-muted" aria-hidden="true" />
                      {Number(classroom.student_count)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Penyelesaian</dt>
                    <dd className="text-base font-black">{Number(classroom.completion_count)}</dd>
                  </div>
                  <div className="rounded-xl bg-paper px-3 py-2">
                    <dt className="text-[10px] font-bold uppercase text-muted">Rata-rata</dt>
                    <dd className="text-base font-black">
                      {classroom.avg_accuracy === null ? "—" : `${classroom.avg_accuracy}%`}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <Link
                    href={`/guru/kelas/${classroom.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                  >
                    Buka kelas &amp; laporan
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
