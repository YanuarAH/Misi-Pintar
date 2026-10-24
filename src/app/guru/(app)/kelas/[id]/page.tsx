import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw, Target, Users } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getClassDetail } from "@/server/teacher";
import {
  regenerateJoinCodeAction,
  removeMemberAction,
  resetPinAction,
  setClassGradeAction,
} from "@/app/actions/teacher";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { CopyButton } from "@/components/teacher/CopyButton";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Detail kelas", robots: { index: false } };

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; pinReset?: string; kelasDiatur?: string }>;
}) {
  const session = await requireTeacher();
  const { id } = await params;
  const query = await searchParams;
  const data = await getClassDetail(viewerOf(session), id);
  if (!data) notFound();

  const { classroom, students, missionStats, hardestQuestions } = data;
  const totalCompletions = missionStats.reduce((sum, item) => sum + item.completions, 0);
  const scores = students.map((student) => student.avgAccuracy).filter((score): score is number => score !== null);
  const avgAccuracy = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;

  return (
    <div className="space-y-5">
      <Link href="/guru/kelas" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Semua kelas
      </Link>

      {query.error ? <Alert tone="error">{query.error}</Alert> : null}
      {query.pinReset ? <Alert tone="success">PIN siswa berhasil diatur ulang. Sesi lama siswa tersebut sudah diakhiri.</Alert> : null}
      {query.kelasDiatur ? <Alert tone="success">Tingkat kelas tersimpan.</Alert> : null}

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{classroom.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <span
                className={cn(
                  "chip text-[10px]",
                  classroom.grade_level === null
                    ? "border-coral/40 bg-coral-soft text-[#7d2418]"
                    : "bg-primary-soft text-primary-strong",
                )}
              >
                {gradeLabel(classroom.grade_level)}
              </span>
              {students.length} siswa · {totalCompletions} penyelesaian misi ·{" "}
              {avgAccuracy === null ? "belum ada akurasi" : `rata-rata akurasi ${avgAccuracy}%`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Kode kelas</span>
              <span className="font-mono text-base font-black tracking-[0.2em]">{classroom.join_code}</span>
              <CopyButton value={classroom.join_code} />
            </div>
            <ConfirmSubmit
              action={regenerateJoinCodeAction}
              hiddenFields={{ classId: classroom.id }}
              triggerLabel="Ganti kode"
              confirmLabel="Ya, ganti kode"
              question="Kode lama tidak berlaku lagi untuk pendaftaran baru."
              variant="secondary"
            />
          </div>
        </div>
        {classroom.grade_level === null ? (
          <div className="mt-3 rounded-2xl border border-sun/50 bg-sun-soft p-3">
            <p className="flex items-start gap-2 text-xs font-bold text-[#7a4a00]">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Kelas ini belum punya tingkat kelas, sehingga siswa belum menerima misi apa pun.
            </p>
            <form action={setClassGradeAction} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="classId" value={classroom.id} />
              <label className="grid gap-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#7a4a00]">Tingkat kelas</span>
                <select name="gradeLevel" className="input min-w-36" defaultValue="" required>
                  <option value="" disabled>
                    Pilih tingkat
                  </option>
                  {GRADE_LEVELS.map((grade) => (
                    <option key={grade} value={grade}>
                      {gradeLabel(grade)}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="sm">
                Simpan tingkat
              </Button>
            </form>
          </div>
        ) : null}

        <p className="mt-3 rounded-2xl bg-sky-soft px-4 py-2.5 text-xs leading-relaxed text-[#1d4b73]">
          Siswa mendaftar di <span className="font-mono">/daftar</span> memakai kode kelas di atas. Setelah
          mendaftar, mereka menerima kode siswa masing-masing. Guru dapat melihat kode tersebut di tabel bawah dan
          mengatur ulang PIN bila siswa lupa.
        </p>
      </header>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-black">
            <Users className="size-4 text-primary" aria-hidden="true" />
            Daftar siswa
          </h2>
          <span className="chip bg-paper">{students.length} siswa</span>
        </div>

        {students.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-bold">Belum ada siswa di kelas ini.</p>
            <p className="mt-1 text-sm text-muted">
              Bagikan kode <span className="font-mono font-bold">{classroom.join_code}</span> kepada siswa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Siswa</th>
                  <th scope="col">Kode siswa</th>
                  <th scope="col" className="text-center">
                    Misi
                  </th>
                  <th scope="col" className="text-center">
                    Akurasi
                  </th>
                  <th scope="col">Terakhir aktif</th>
                  <th scope="col" className="text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar avatarKey={student.avatarKey} size="sm" />
                        <Link href={`/guru/siswa/${student.id}`} className="font-bold hover:text-primary">
                          {student.displayName}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold tracking-wider">{student.accessCode}</span>
                        <CopyButton value={student.accessCode} label="Salin" />
                      </div>
                    </td>
                    <td className="text-center">
                      {student.completedMissions}
                      <span className="text-muted">/{missionStats.length}</span>
                    </td>
                    <td className="text-center">
                      {student.avgAccuracy === null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span
                          className={cn(
                            "chip",
                            student.avgAccuracy >= 80
                              ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]"
                              : "border-sun/40 bg-sun-soft text-[#7a4a00]",
                          )}
                        >
                          {student.avgAccuracy}%
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted">
                      {student.lastActiveAt ? formatDateTime(student.lastActiveAt) : "Belum mulai"}
                    </td>
                    <td>
                      <div className="flex flex-col items-end gap-1.5">
                        <details className="text-right">
                          <summary className="cursor-pointer list-none text-xs font-bold text-primary">Atur PIN</summary>
                          <form action={resetPinAction} className="mt-1.5 flex items-center justify-end gap-1.5">
                            <input type="hidden" name="classId" value={classroom.id} />
                            <input type="hidden" name="studentId" value={student.id} />
                            <label className="sr-only" htmlFor={`pin-${student.id}`}>
                              PIN baru untuk {student.displayName}
                            </label>
                            <input
                              id={`pin-${student.id}`}
                              name="pin"
                              inputMode="numeric"
                              pattern="[0-9]{4,6}"
                              minLength={4}
                              maxLength={6}
                              required
                              placeholder="PIN baru"
                              className="input h-9 w-24 px-2 py-1 text-sm"
                            />
                            <Button type="submit" size="sm">
                              Simpan
                            </Button>
                          </form>
                        </details>
                        <ConfirmSubmit
                          action={removeMemberAction}
                          hiddenFields={{ classId: classroom.id, studentId: student.id }}
                          triggerLabel="Keluarkan"
                          confirmLabel="Ya, keluarkan"
                          question={`Keluarkan ${student.displayName} dari kelas? Akun dan riwayatnya tetap ada.`}
                          variant="secondary"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3.5">
            <h2 className="flex items-center gap-2 text-base font-black">
              <Target className="size-4 text-primary" aria-hidden="true" />
              Hasil per misi
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Misi</th>
                  <th scope="col" className="text-center">
                    Penyelesaian
                  </th>
                  <th scope="col" className="text-center">
                    Rata-rata skor
                  </th>
                </tr>
              </thead>
              <tbody>
                {missionStats.map((mission) => (
                  <tr key={mission.id}>
                    <td className="font-bold">{mission.title}</td>
                    <td className="text-center">{mission.completions}</td>
                    <td className="text-center">
                      {mission.avgScore === null ? <span className="text-muted">—</span> : mission.avgScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-base font-black">
            <AlertTriangle className="size-4 text-sun" aria-hidden="true" />
            Soal yang perlu diulang
          </h2>
          <p className="mt-1 text-xs text-muted">Berdasarkan jawaban salah siswa di kelas ini.</p>
          {hardestQuestions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada cukup data untuk menampilkan pola kesalahan.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {hardestQuestions.map((question) => (
                <li key={question.id}>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{question.prompt}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-muted">
                    {question.wrong} dari {question.answers} jawaban salah ({question.wrongRate}%)
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
            Jawaban salah bukan bukti pasti siswa belum paham. Gunakan data ini untuk memilih materi yang perlu
            dijelaskan ulang.
          </p>
        </section>
      </div>
    </div>
  );
}
