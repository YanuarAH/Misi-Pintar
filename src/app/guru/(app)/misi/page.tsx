import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Filter, Plus, Users } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getCurriculumOptions, listTeacherMissions } from "@/server/teacher";
import { MissionForm } from "@/components/teacher/MissionForm";
import { ButtonLink } from "@/components/ui/Button";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Misi & soal", robots: { index: false } };

export default async function TeacherMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; subject?: string; uncategorized?: string }>;
}) {
  const session = await requireTeacher();
  const viewer = viewerOf(session);
  const params = await searchParams;

  const parsedGrade = params.grade ? Number(params.grade) : null;
  const gradeLevel = parsedGrade !== null && Number.isInteger(parsedGrade) ? parsedGrade : null;
  const subject = params.subject || null;
  const uncategorized = params.uncategorized === "1";

  const [missions, options, allMissions] = await Promise.all([
    listTeacherMissions(viewer, session.id, { gradeLevel, subject, uncategorized }),
    getCurriculumOptions(viewer),
    listTeacherMissions(viewer, session.id),
  ]);

  const uncategorizedCount = allMissions.filter((mission) => mission.grade_level === null).length;
  const filterActive = gradeLevel !== null || Boolean(subject) || uncategorized;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Misi &amp; soal</h1>
          <p className="mt-1 text-sm text-muted">
            Setiap misi punya tingkat kelas, mata pelajaran, dan topik. Konten antar tingkat tidak tercampur.
          </p>
        </div>
      </header>

      {uncategorizedCount > 0 ? (
        <div className="rounded-2xl border border-sun/50 bg-sun-soft px-4 py-3">
          <p className="flex items-start gap-2 text-sm font-bold text-[#7a4a00]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {uncategorizedCount} misi belum punya tingkat kelas dan tidak tampil ke siswa.
          </p>
          <p className="mt-1 pl-6 text-xs leading-relaxed text-[#7a4a00]/90">
            Data lama tidak dikategorikan otomatis karena tidak cukup bukti. Buka misinya, pilih tingkat kelas,
            mata pelajaran, dan topik, lalu simpan.
          </p>
          <div className="mt-2 pl-6">
            <Link href="/guru/misi?uncategorized=1" className="text-xs font-black text-[#7a4a00] underline">
              Tampilkan misi yang belum dikategorikan
            </Link>
          </div>
        </div>
      ) : null}

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4" aria-label="Filter daftar misi">
        <label className="grid gap-1">
          <span className="text-[11px] font-black uppercase tracking-wide text-muted">Tingkat kelas</span>
          <select name="grade" defaultValue={gradeLevel ?? ""} className="input min-w-40">
            <option value="">Semua tingkat</option>
            {GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {gradeLabel(grade)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-[11px] font-black uppercase tracking-wide text-muted">Mata pelajaran</span>
          <select name="subject" defaultValue={subject ?? ""} className="input min-w-44">
            <option value="">Semua mata pelajaran</option>
            {options.subjects.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pb-2.5 text-sm font-bold">
          <input type="checkbox" name="uncategorized" value="1" defaultChecked={uncategorized} className="size-4" />
          Hanya yang belum dikategorikan
        </label>

        <button
          type="submit"
          className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-strong"
        >
          <Filter className="size-4" aria-hidden="true" />
          Terapkan
        </button>
        {filterActive ? (
          <Link href="/guru/misi" className="text-sm font-bold text-muted underline">
            Reset
          </Link>
        ) : null}
      </form>

      <details className="card group p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between">
          <span className="flex items-center gap-2 text-base font-black">
            <Plus className="size-4 text-primary" aria-hidden="true" />
            Buat misi baru
          </span>
          <span className="text-xs font-bold text-primary group-open:hidden">Buka formulir</span>
          <span className="hidden text-xs font-bold text-muted group-open:inline">Tutup</span>
        </summary>
        <div className="mt-4 border-t border-line pt-4">
          <MissionForm options={options} />
        </div>
      </details>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <h2 className="text-base font-black">
            Daftar misi ({missions.length}
            {filterActive ? ` dari ${allMissions.length}` : ""})
          </h2>
        </div>
        {missions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-bold">Tidak ada misi pada filter ini.</p>
            <p className="mt-1 text-sm text-muted">
              {filterActive
                ? "Ubah filter atau buat misi baru untuk tingkat kelas ini."
                : "Gunakan formulir di atas atau jalankan npm run db:seed untuk memuat tiga misi contoh."}
            </p>
            {filterActive ? (
              <div className="mt-3">
                <ButtonLink href="/guru/misi" variant="secondary" size="sm">
                  Lihat semua misi
                </ButtonLink>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Misi</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-center">
                    Soal
                  </th>
                  <th scope="col">Validasi</th>
                  <th scope="col" className="text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {missions.map((mission) => (
                  <tr key={mission.id}>
                    <td>
                      <Link href={`/guru/misi/${mission.id}`} className="font-bold hover:text-primary">
                        {mission.title}
                      </Link>
                      <p className="font-mono text-[11px] text-muted">/{mission.slug}</p>
                      {mission.assignedClasses.length > 0 ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-muted">
                          <Users className="size-3" aria-hidden="true" />
                          {mission.assignedClasses.map((item) => item.name).join(", ")}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted">Belum ditugaskan ke kelas tertentu</p>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={cn(
                            "chip text-[10px]",
                            mission.grade_level === null
                              ? "border-coral/40 bg-coral-soft text-[#7d2418]"
                              : "bg-primary-soft text-primary-strong",
                          )}
                        >
                          {gradeLabel(mission.grade_level)}
                        </span>
                        {mission.subjectLabel ? (
                          <span className="chip bg-paper text-[10px]">{mission.subjectLabel}</span>
                        ) : null}
                        {mission.topicLabel ? (
                          <span className="chip bg-paper text-[10px]">{mission.topicLabel}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "chip",
                          mission.is_published ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "bg-paper",
                        )}
                      >
                        {mission.is_published ? "Terbit" : "Draf"}
                      </span>
                    </td>
                    <td className="text-center">{mission.questionCount}</td>
                    <td>
                      {mission.publishIssues.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1c5b36]">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          Siap terbit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-coral">
                          <AlertTriangle className="size-3.5" aria-hidden="true" />
                          {mission.publishIssues.length} masalah
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link href={`/guru/misi/${mission.id}`} className="text-sm font-bold text-primary hover:underline">
                        Kelola
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted">
        Misi hanya dapat diterbitkan bila punya tingkat kelas, mata pelajaran, topik, serta minimal satu soal valid
        di setiap slot.
      </p>
    </div>
  );
}
