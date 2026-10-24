import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Target, TrendingUp, Users } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { getTeacherDashboard } from "@/server/teacher";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/teacher/CopyButton";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Ringkasan guru", robots: { index: false } };

export default async function TeacherDashboardPage() {
  const session = await requireTeacher();
  const data = await getTeacherDashboard(viewerOf(session), session.id);
  const { summary, recent, hardest, classes, missions } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Ringkasan belajar</h1>
          <p className="mt-1 text-sm text-muted">
            Data dari kelas yang Anda kelola. Gunakan sebagai bahan pengajaran, bukan penilaian akhir.
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/guru/misi" variant="secondary" size="sm">
            Kelola misi
          </ButtonLink>
          <ButtonLink href="/guru/kelas" size="sm">
            Kelola kelas
          </ButtonLink>
        </div>
      </header>

      <section aria-label="Angka ringkasan" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Users, label: "Siswa terdaftar", value: summary.students, tone: "bg-primary-soft text-primary-strong" },
          { icon: CheckCircle2, label: "Misi diselesaikan", value: summary.completions, tone: "bg-leaf-soft text-[#1c5b36]" },
          {
            icon: Target,
            label: "Rata-rata akurasi",
            value: summary.avgAccuracy === null ? "—" : `${summary.avgAccuracy}%`,
            tone: "bg-sun-soft text-[#7a4a00]",
          },
          { icon: TrendingUp, label: "Aktif 7 hari", value: summary.activeThisWeek, tone: "bg-sky-soft text-[#1d4b73]" },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <span className={cn("mb-2.5 flex size-9 items-center justify-center rounded-xl", card.tone)}>
              <card.icon className="size-4.5" aria-hidden="true" />
            </span>
            <p className="stat-number">{card.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{card.label}</p>
          </div>
        ))}
      </section>

      {summary.students === 0 ? (
        <div className="card p-6">
          <h2 className="text-lg font-black">Belum ada siswa</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            Buat kelas, lalu bagikan <strong>kode kelas</strong> kepada siswa. Mereka mendaftar sendiri dengan nama
            panggilan dan PIN — tanpa email. Setelah itu kode siswa mereka muncul di daftar kelas.
          </p>
          <div className="mt-4">
            <ButtonLink href="/guru/kelas" size="sm">
              Buat kelas pertama
            </ButtonLink>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <h2 className="text-base font-black">Aktivitas terbaru</h2>
            <span className="chip bg-paper">{recent.length} terakhir</span>
          </div>
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted">Belum ada misi yang diselesaikan siswa.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {recent.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar avatarKey={item.avatarKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {item.studentName}{" "}
                      <span className="font-normal text-muted">menyelesaikan {item.missionTitle}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {item.className} · {formatDateTime(item.completedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "chip shrink-0",
                      item.score >= 80 ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "border-sun/40 bg-sun-soft text-[#7a4a00]",
                    )}
                  >
                    {item.score}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-base font-black">
            <AlertTriangle className="size-4 text-sun" aria-hidden="true" />
            Perlu latihan tambahan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Soal dengan tingkat kesalahan tertinggi di kelas Anda.
          </p>
          {hardest.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada cukup data jawaban.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {hardest.map((item) => (
                <li key={item.id}>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.prompt}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-muted">{item.missionTitle}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
                      <div className="h-full rounded-full bg-coral" style={{ width: `${item.wrongRate}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-coral">{item.wrongRate}% salah</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black">Kelas Anda</h2>
            <Link href="/guru/kelas" className="text-xs font-bold text-primary hover:underline">
              Semua kelas
            </Link>
          </div>
          {classes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada kelas.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {classes.map((classroom) => (
                <li key={classroom.id} className="rounded-2xl border border-line px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/guru/kelas/${classroom.id}`} className="text-sm font-bold hover:text-primary">
                      {classroom.name}
                    </Link>
                    <span className="chip bg-paper font-mono">{classroom.join_code}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {Number(classroom.student_count)} siswa · {Number(classroom.completion_count)} penyelesaian · rata-rata{" "}
                    {classroom.avg_accuracy === null ? "—" : `${classroom.avg_accuracy}%`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black">Status misi</h2>
            <Link href="/guru/misi" className="text-xs font-bold text-primary hover:underline">
              Kelola
            </Link>
          </div>
          {missions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada misi. Buat misi pertama Anda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {missions.map((mission) => (
                <li key={mission.id} className="flex items-center justify-between gap-2 rounded-2xl border border-line px-3.5 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/guru/misi/${mission.id}`} className="truncate text-sm font-bold hover:text-primary">
                      {mission.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {mission.questionCount} soal
                      {mission.publishIssues.length > 0 ? ` · ${mission.publishIssues.length} masalah validasi` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "chip shrink-0",
                      mission.is_published ? "border-leaf/30 bg-leaf-soft text-[#1c5b36]" : "bg-paper",
                    )}
                  >
                    {mission.is_published ? "Terbit" : "Draf"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-line bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-black">
          <BookOpen className="size-4 text-primary" aria-hidden="true" />
          Bagikan kode kelas
        </h2>
        <p className="mt-1 text-sm text-muted">
          Siswa membuka <span className="font-mono text-xs">/daftar</span> lalu memasukkan kode kelas untuk membuat
          akun dengan nama panggilan.
        </p>
        {classes.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {classes.map((classroom) => (
              <li key={classroom.id} className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-2">
                <span className="text-xs font-bold text-muted">{classroom.name}</span>
                <span className="font-mono text-sm font-black tracking-widest">{classroom.join_code}</span>
                <CopyButton value={classroom.join_code} label="Salin kode" />
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <ArrowRight className="size-3.5" aria-hidden="true" />
          Kode siswa dan PIN dapat dilihat serta diatur ulang dari halaman kelas.
        </p>
      </section>
    </div>
  );
}
