import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireStudent, viewerOf } from "@/lib/auth";
import { one } from "@/lib/db";
import { ProfileForm } from "@/components/student/ProfileForm";
import { Avatar } from "@/components/ui/Avatar";

export const metadata: Metadata = { title: "Profil saya", robots: { index: false } };

export default async function ProfilePage() {
  const session = await requireStudent();
  const profile = await one<{ display_name: string; avatar_key: string; access_code: string }>(
    viewerOf(session),
    "select display_name, avatar_key, access_code from profiles where id = $1",
    [session.id],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/belajar" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali ke peta misi
      </Link>

      <header className="card flex items-center gap-4 p-5">
        <Avatar avatarKey={profile?.avatar_key ?? session.avatarKey} size="lg" />
        <div>
          <h1 className="text-2xl font-black">Profil saya</h1>
          <p className="text-sm text-muted">
            Kode siswa:{" "}
            <span className="font-mono font-bold tracking-wider text-ink">{profile?.access_code ?? "-"}</span>
          </p>
        </div>
      </header>

      <section className="card p-5 sm:p-6">
        <ProfileForm
          displayName={profile?.display_name ?? session.displayName}
          avatarKey={profile?.avatar_key ?? session.avatarKey}
        />
      </section>

      <p className="flex items-start gap-2 rounded-2xl bg-sky-soft px-4 py-3 text-xs leading-relaxed text-[#1d4b73]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Kami hanya menyimpan nama tampilan, avatar, dan hasil belajarmu. Tidak ada email, nomor telepon,
        atau alamat. Untuk mengganti PIN, mintalah bantuan gurumu.
      </p>
    </div>
  );
}
