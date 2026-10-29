import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Info, LogOut, UserRound, Users } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { one } from "@/lib/db";
import { getStudentClasses } from "@/server/student";
import { GradePicker } from "@/components/student/GradePicker";
import { JoinClassForm } from "@/components/student/JoinClassForm";
import { leaveClassAction } from "@/app/actions/student";
import { Alert } from "@/components/ui/Alert";
import { gradeLabel } from "@/lib/curriculum";

export const metadata: Metadata = { title: "Kelas saya", robots: { index: false } };

export default async function MyClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ baru?: string; keluar?: string }>;
}) {
  const session = await requireStudent();
  const viewer = viewerOf(session);
  const [profile, myClasses, params] = await Promise.all([
    one<{ access_code: string }>(viewer, "select access_code from profiles where id = $1", [session.id]),
    getStudentClasses(viewer, session.id),
    searchParams,
  ]);

  const isNew = params.baru === "1";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isNew ? (
        <Alert tone="success">
          Akunmu sudah dibuat. Kode siswa:{" "}
          <strong className="font-mono tracking-wider">{profile?.access_code}</strong>, simpan kode ini untuk
          masuk lagi. Pilih tingkat kelasmu di bawah agar misi bisa dimulai.
        </Alert>
      ) : null}

      {params.keluar === "1" ? <Alert tone="info">Kamu keluar dari kelas. Progres belajarmu tetap tersimpan.</Alert> : null}

      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
          <Users className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Kelas saya</h1>
          <p className="text-sm text-muted">Belajar mandiri tetap bisa tanpa kelas.</p>
        </div>
      </header>

      <section className="card p-5 sm:p-6" aria-labelledby="tingkat-judul">
        <h2 id="tingkat-judul" className="text-lg font-black">
          Tingkat kelas
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Saat ini:{" "}
          <strong className="text-ink">
            {myClasses.gradeLevel === null ? "belum dipilih" : gradeLabel(myClasses.gradeLevel)}
          </strong>
          . Jika mengikuti kelas, misi juga disaring berdasarkan mata pelajaran kelas tersebut.
        </p>
        <GradePicker gradeLevel={myClasses.gradeLevel} />
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="gabung-judul">
        <h2 id="gabung-judul" className="text-lg font-black">
          Gabung kelas
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Pakai kode undangan dari gurumu. Kamu tidak perlu membuat akun baru, dan boleh ikut beberapa kelas.
        </p>
        <JoinClassForm />
      </section>

      <section aria-labelledby="daftar-kelas-judul" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="daftar-kelas-judul" className="text-lg font-black">
            Kelas yang diikuti ({myClasses.classes.length})
          </h2>
          <Link href="/belajar" className="text-sm font-bold text-primary hover:underline">
            Peta misi
          </Link>
        </div>

        {myClasses.classes.length === 0 ? (
          <div className="card p-5">
            <p className="flex items-start gap-2 text-sm text-muted">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Kamu belum bergabung ke kelas mana pun. Misi belajar mandiri yang terbit untuk tingkat kelasmu tetap
              bisa dikerjakan di peta misi.
            </p>
          </div>
        ) : (
          myClasses.classes.map((classroom) => (
            <article key={classroom.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black">{classroom.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                    <UserRound className="size-3.5" aria-hidden="true" />
                    Guru: {classroom.teacherName}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
                    {classroom.gradeLevel === null ? "Tingkat kelas belum diatur guru" : gradeLabel(classroom.gradeLevel)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
                    Mata pelajaran: {classroom.subjectLabel ?? "belum diatur guru"}
                  </p>
                </div>
                <form action={leaveClassAction}>
                  <input type="hidden" name="classId" value={classroom.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted hover:border-line-strong hover:text-ink"
                  >
                    <LogOut className="size-3.5" aria-hidden="true" />
                    Keluar kelas
                  </button>
                </form>
              </div>

              <div className="mt-4 rounded-2xl bg-paper p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  Misi {classroom.subjectLabel ?? "kelas"} yang tersedia otomatis
                </p>
                {classroom.tasks.length === 0 ? (
                  <p className="mt-1.5 text-sm text-muted">
                    {classroom.subjectLabel
                      ? "Belum ada misi terbit untuk tingkat dan mata pelajaran kelas ini."
                      : "Minta guru mengatur mata pelajaran kelas agar misi yang sesuai dapat muncul."}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {classroom.tasks.map((task) => (
                      <li key={task.slug} className="flex items-center justify-between gap-3">
                        <Link
                          href={`/misi/${task.slug}`}
                          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-bold hover:text-primary"
                        >
                          <span className="truncate">{task.title}</span>
                          <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                        </Link>
                        <span className="shrink-0 text-xs font-bold text-muted">
                          {task.completed ? "Selesai" : "Belum dikerjakan"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <p className="text-center text-xs text-muted">
        Misi di peta dipisahkan berdasarkan mata pelajaran kelas yang kamu ikuti. Progres dan riwayat tetap milikmu.
      </p>
    </div>
  );
}
