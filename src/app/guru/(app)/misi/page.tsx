import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { requireTeacher, viewerOf } from "@/lib/auth";
import { listTeacherMissions } from "@/server/teacher";
import { MissionForm } from "@/components/teacher/MissionForm";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Misi & soal", robots: { index: false } };

export default async function TeacherMissionsPage() {
  const session = await requireTeacher();
  const missions = await listTeacherMissions(viewerOf(session), session.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Misi &amp; soal</h1>
          <p className="mt-1 text-sm text-muted">
            Buat misi, tambahkan soal, lalu terbitkan setelah semua soal valid.
          </p>
        </div>
      </header>

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
          <MissionForm />
        </div>
      </details>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <h2 className="text-base font-black">Daftar misi ({missions.length})</h2>
        </div>
        {missions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-bold">Belum ada misi.</p>
            <p className="mt-1 text-sm text-muted">
              Gunakan formulir di atas atau jalankan <code className="font-mono text-xs">npm run db:seed</code> untuk
              memuat tiga misi contoh.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Misi</th>
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
        Misi hanya dapat diterbitkan bila memiliki minimal satu soal dan semua soal lolos validasi (pilihan ganda
        punya jawaban yang cocok, soal angka punya jawaban numerik).
      </p>
    </div>
  );
}
