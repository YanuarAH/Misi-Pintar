import type { Metadata } from "next";
import { BookOpenCheck, Compass, GraduationCap, ListChecks, Trophy, Users } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { HeroMap } from "@/components/marketing/HeroMap";
import { MissionPreviewCard } from "@/components/marketing/MissionPreviewCard";
import { ButtonLink } from "@/components/ui/Button";
import { rows } from "@/lib/db";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Misi Pintar: Belajar Seru, Selesaikan Misi!",
  description:
    "Platform belajar Matematika, IPAS, Bahasa Indonesia, dan Bahasa Inggris untuk siswa kelas 5–6 SD: misi bertema, umpan balik langsung, XP, dan lencana.",
};

const steps = [
  {
    icon: Compass,
    tint: "bg-primary-soft text-primary-strong",
    badge: "Langkah 1",
    title: "Pilih misi petualangan",
    body: "Setiap misi punya latar cerita: berbelanja di pasar, membantu koki, atau merancang taman.",
  },
  {
    icon: BookOpenCheck,
    tint: "bg-sun-soft text-[#7a4a00]",
    badge: "Langkah 2",
    title: "Pahami konteks cerita",
    body: "Tujuan pembelajaran ditulis dengan bahasa sederhana dan ramah, tanpa istilah yang membingungkan.",
  },
  {
    icon: ListChecks,
    tint: "bg-sky-soft text-[#1d4b73]",
    badge: "Langkah 3",
    title: "Kerjakan soal interaktif",
    body: "Satu soal setiap kali. Ada petunjuk saat bingung, dan penjelasan lengkap setiap kali menjawab.",
  },
  {
    icon: Trophy,
    tint: "bg-leaf-soft text-[#1c5b36]",
    badge: "Langkah 4",
    title: "Raih XP & lencana",
    body: "Progresmu tersimpan rapi. Kamu bebas mengulangi misi kapan saja untuk memperbaiki skor.",
  },
];

export default async function LandingPage() {
  const [session, missions] = await Promise.all([
    getSession(),
    rows<{ id: string; slug: string; title: string; description: string; order_index: number; question_count: string }>(
      null,
      `select m.id, m.slug, m.title, m.description, m.order_index,
              (select count(*) from questions q where q.mission_id = m.id and q.archived_at is null) as question_count
         from missions m
        where m.is_published and m.archived_at is null
        order by m.order_index asc`,
    ),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader isLoggedIn={Boolean(session)} />

      <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-5">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-14">
          <div className="animate-rise">
            <p className="chip mb-4 bg-primary-soft text-primary-strong ring-1 ring-primary/20">
              <GraduationCap className="size-4 text-primary" aria-hidden="true" />
              Untuk siswa kelas 5–6 SD
            </p>
            <h1 className="text-4xl font-black leading-[1.05] sm:text-5xl lg:text-6xl">
              Belajar seru,
              <br />
              selesaikan <span className="text-primary">misi!</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Misi Pintar mengubah pelajaran sekolah menjadi petualangan. Hitung uang kembalian di pasar, selidiki
              makhluk hidup di kebun, dan ucapkan kalimat pertama dalam bahasa Inggris. Setiap jawaban langsung
              dapat penjelasan.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={session ? "/belajar" : "/masuk"} className="px-7 text-base">
                {session ? "Lanjut belajar" : "Mulai belajar gratis"}
              </ButtonLink>
              <ButtonLink href="/guru/login" variant="secondary">
                <Users className="size-4" aria-hidden="true" />
                Saya guru
              </ButtonLink>
            </div>
            <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3 text-center">
              {[
                { term: `${missions.length} misi`, desc: "bertema cerita" },
                {
                  term: `${missions.reduce((sum, mission) => sum + Number(mission.question_count), 0)} soal`,
                  desc: "dengan penjelasan",
                },
                { term: "0 iklan", desc: "aman untuk anak" },
              ].map((item) => (
                <div key={item.term} className="rounded-2xl border border-line bg-surface/70 px-2 py-3">
                  <dt className="text-lg font-black text-ink">{item.term}</dt>
                  <dd className="text-xs font-semibold text-muted">{item.desc}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroMap />
        </section>

        <section id="misi" className="scroll-mt-6 py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">Peta misi belajar</h2>
              <p className="mt-1 text-sm text-muted">
                Misi pertama di setiap mata pelajaran langsung terbuka. Misi berikutnya terbuka setelah misi
                sebelumnya selesai.
              </p>
            </div>
            <ButtonLink href="/masuk" variant="ghost" size="sm">
              Masuk untuk mulai
            </ButtonLink>
          </div>

          {missions.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-bold">Misi belum diterbitkan.</p>
              <p className="mt-1 text-sm text-muted">
                Guru dapat menerbitkan misi dari dasbor guru. Jalankan <code>npm run db:seed</code> untuk memuat
                contoh misi.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {missions.map((mission) => (
                <MissionPreviewCard
                  key={mission.id}
                  orderIndex={mission.order_index}
                  slug={mission.slug}
                  title={mission.title}
                  description={mission.description}
                  questionCount={Number(mission.question_count)}
                />
              ))}
            </div>
          )}
        </section>

        <section id="cara" className="scroll-mt-6 py-10">
          <h2 className="text-2xl font-black sm:text-3xl">Cara belajar di Misi Pintar</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Tidak ada ujian mendadak dan tidak ada hukuman karena salah. Kamu belajar dari penjelasan, lalu
            mencoba lagi.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.title} className="card flex flex-col justify-between gap-3 p-5 transition-transform hover:-translate-y-0.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`flex size-11 items-center justify-center rounded-xl ${step.tint}`}>
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-black text-muted">{step.badge}</span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="guru" className="scroll-mt-6 py-10">
          <div className="card overflow-hidden">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Untuk guru</p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">Kelola misi dan lihat progres kelas</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Guru dapat membuat misi dan soal sendiri, menerbitkannya hanya setelah tervalidasi, membagikan
                  kode kelas untuk pendaftaran siswa, serta melihat laporan hasil belajar per kelas. Semua data
                  siswa dilindungi aturan akses di server dan database.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <ButtonLink href="/guru/login">Masuk dasbor guru</ButtonLink>
                  <ButtonLink href="/masuk" variant="secondary">
                    Saya siswa
                  </ButtonLink>
                </div>
              </div>
              <ul className="space-y-2.5 rounded-2xl bg-paper p-4 text-sm">
                {[
                  "Misi dan soal bisa diubah tanpa menyentuh kode",
                  "Validasi soal sebelum terbit",
                  "Laporan akurasi dan soal tersulit per kelas",
                  "Tanpa email pribadi siswa",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-medium text-ink/85">
                    <span aria-hidden="true" className="mt-0.5 text-leaf">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
