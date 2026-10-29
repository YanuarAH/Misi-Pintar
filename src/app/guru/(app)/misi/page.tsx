import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Archive, CheckCircle2, Eye, Filter, Plus } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getCurriculumOptions, listTeacherMissions, type MissionStatusFilter } from "@/server/teacher";
import { MissionForm } from "@/components/teacher/MissionForm";
import { MissionActions } from "@/components/teacher/MissionActions";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Misi & soal", robots: { index: false } };

const STATUS_TABS: { value: MissionStatusFilter; label: string }[] = [
  { value: "active", label: "Semua aktif" },
  { value: "draft", label: "Draf" },
  { value: "published", label: "Terbit" },
  { value: "archived", label: "Arsip" },
];

const MESSAGES: Record<string, string> = {
  arsip: "Misi diarsipkan. Riwayat pengerjaan siswa tetap tersimpan.",
  pulih: "Misi dipulihkan. Misi kembali tampil sebagai draf dan bisa diterbitkan lagi.",
  hapus: "Misi kosong berhasil dihapus permanen.",
};

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

function statusFrom(value: string | undefined): MissionStatusFilter {
  return STATUS_TABS.some((tab) => tab.value === value) ? (value as MissionStatusFilter) : "active";
}

export default async function TeacherMissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    grade?: string;
    subject?: string;
    uncategorized?: string;
    status?: string;
    pesan?: string;
    error?: string;
  }>;
}) {
  const session = await requireTeacher();
  const viewer = viewerOf(session);
  const params = await searchParams;

  const parsedGrade = params.grade ? Number(params.grade) : null;
  const gradeLevel = parsedGrade !== null && Number.isInteger(parsedGrade) ? parsedGrade : null;
  const subject = params.subject || null;
  const uncategorized = params.uncategorized === "1";
  const status = statusFrom(params.status);

  const [missions, options, allMissions, archivedMissions] = await Promise.all([
    listTeacherMissions(viewer, session.id, { gradeLevel, subject, uncategorized, status }),
    getCurriculumOptions(viewer),
    listTeacherMissions(viewer, session.id),
    listTeacherMissions(viewer, session.id, { status: "archived" }),
  ]);

  const uncategorizedCount = allMissions.filter((mission) => mission.grade_level === null).length;
  const filterActive = gradeLevel !== null || Boolean(subject) || uncategorized || status !== "active";
  const isArchive = status === "archived";

  const tabHref = (value: MissionStatusFilter) => {
    const query = new URLSearchParams();
    if (value !== "active") query.set("status", value);
    if (gradeLevel !== null) query.set("grade", String(gradeLevel));
    if (subject) query.set("subject", subject);
    if (uncategorized) query.set("uncategorized", "1");
    const search = query.toString();
    return search ? `/guru/misi?${search}` : "/guru/misi";
  };

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

      {params.pesan && MESSAGES[params.pesan] ? <Alert tone="success">{MESSAGES[params.pesan]}</Alert> : null}
      {params.error ? <Alert tone="error">{params.error}</Alert> : null}

      {uncategorizedCount > 0 && !isArchive ? (
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

      <nav className="flex flex-wrap gap-2" aria-label="Status misi">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            aria-current={status === tab.value ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold",
              status === tab.value
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-muted hover:border-primary hover:text-primary",
            )}
          >
            {tab.value === "archived" ? <Archive className="size-3.5" aria-hidden="true" /> : null}
            {tab.label}
            {tab.value === "archived" ? ` (${archivedMissions.length})` : null}
          </Link>
        ))}
      </nav>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4" aria-label="Filter daftar misi">
        <input type="hidden" name="status" value={status} />
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

      {isArchive ? (
        <div className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-muted">
          Misi arsip tidak tampil di daftar belajar siswa. Semua riwayat
          pengerjaan tetap ada. Pulihkan misi bila ingin memakainya lagi.
        </div>
      ) : (
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
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-black">
            {isArchive ? "Misi diarsipkan" : "Daftar misi"} ({missions.length}
            {filterActive && !isArchive ? ` dari ${allMissions.length}` : ""})
          </h2>
        </div>
        {missions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-bold">
              {isArchive ? "Belum ada misi yang diarsipkan." : "Tidak ada misi pada filter ini."}
            </p>
            <p className="mt-1 text-sm text-muted">
              {isArchive
                ? "Misi yang kamu arsipkan akan muncul di sini dan bisa dipulihkan kapan saja."
                : filterActive
                  ? "Ubah filter atau buat misi baru untuk tingkat kelas ini."
                  : "Gunakan formulir di atas atau jalankan npm run db:seed untuk memuat misi contoh."}
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
                  <th scope="col">Diperbarui</th>
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
                      <p className="mt-0.5 text-[11px] text-muted">
                        Otomatis untuk kelas dengan kurikulum yang cocok
                      </p>
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
                      {mission.archived_at ? (
                        <span className="chip border-line-strong bg-paper">
                          <Archive className="size-3" aria-hidden="true" />
                          Arsip
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "chip",
                            mission.is_published ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "bg-paper",
                          )}
                        >
                          {mission.is_published ? "Terbit" : "Draf"}
                        </span>
                      )}
                      <p className="mt-1 text-[11px] font-bold text-muted">
                        {mission.audience === "class_only" ? "Misi kelas" : "Belajar mandiri"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {mission.attemptCount} dikerjakan
                        {mission.publishIssues.length > 0 && !mission.archived_at
                          ? ` · ${mission.publishIssues.length} masalah`
                          : ""}
                      </p>
                    </td>
                    <td className="text-center">
                      <span className="font-bold">{mission.questionCount}</span>
                      <p className="text-[11px] text-muted">{mission.validQuestionCount} valid</p>
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted">
                      {dateFormat.format(new Date(mission.updated_at))}
                    </td>
                    <td>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {mission.archived_at ? (
                            <span className="text-[11px] font-bold text-muted">Pulihkan untuk mengelola</span>
                          ) : (
                            <Link
                              href={`/guru/misi/${mission.id}`}
                              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                            >
                              <Eye className="size-3.5" aria-hidden="true" />
                              Kelola
                            </Link>
                          )}
                          {mission.publishIssues.length === 0 && !mission.archived_at ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1c5b36]">
                              <CheckCircle2 className="size-3" aria-hidden="true" />
                              Siap terbit
                            </span>
                          ) : null}
                        </div>
                        <MissionActions
                          missionId={mission.id}
                          title={mission.title}
                          archived={mission.archived_at !== null}
                          isPublished={mission.is_published}
                          attemptCount={mission.attemptCount}
                          questionCount={mission.questionCount}
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

      <p className="text-xs text-muted">
        Misi hanya dapat diterbitkan bila punya tingkat kelas, mata pelajaran, topik, serta minimal satu soal valid
        di setiap slot. Misi yang punya riwayat pengerjaan hanya bisa diarsipkan, tidak dihapus permanen.
      </p>
    </div>
  );
}
