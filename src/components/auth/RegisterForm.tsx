"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { registerStudentAction, type AuthState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { AVATARS } from "@/lib/avatars";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";
import { cn } from "@/lib/cn";

export function RegisterForm({ initialJoinCode = "" }: { initialJoinCode?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(registerStudentAction, null);
  const [avatar, setAvatar] = useState<string>("rubah");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field
        label="Kode kelas (opsional)"
        htmlFor="joinCode"
        hint="Punya kode dari guru? Isi 6 huruf/angka. Kosongkan bila ingin belajar mandiri."
      >
        <input
          id="joinCode"
          name="joinCode"
          defaultValue={initialJoinCode}
          className="input font-mono uppercase tracking-widest"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={6}
          placeholder="MISI5A"
        />
      </Field>

      <Field label="Tingkat kelas (opsional)" htmlFor="gradeLevel" hint="Boleh dipilih nanti di halaman Kelas saya.">
        <select id="gradeLevel" name="gradeLevel" defaultValue="" className="input">
          <option value="">Pilih nanti</option>
          {GRADE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {gradeLabel(level)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Nama tampilan" htmlFor="displayName" hint="Boleh nama panggilan. Jangan pakai nama lengkap.">
        <input
          id="displayName"
          name="displayName"
          className="input"
          maxLength={40}
          required
          autoComplete="nickname"
          placeholder="Contoh: Rani"
        />
      </Field>

      <fieldset>
        <legend className="label">Pilih avatar</legend>
        <input type="hidden" name="avatarKey" value={avatar} />
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {AVATARS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setAvatar(item.key)}
              aria-pressed={avatar === item.key}
              aria-label={item.label}
              className={cn(
                "flex min-h-14 items-center justify-center rounded-2xl border text-2xl transition",
                avatar === item.key
                  ? "border-primary bg-primary-soft ring-2 ring-primary/30"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span aria-hidden="true">{item.emoji}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PIN" htmlFor="pin" hint="4–6 angka. Ingat baik-baik, ya.">
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            required
            className="input tracking-[0.4em]"
            placeholder="••••"
          />
        </Field>
        <Field label="Ulangi PIN" htmlFor="confirmPin">
          <input
            id="confirmPin"
            name="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            maxLength={6}
            required
            className="input tracking-[0.4em]"
            placeholder="••••"
          />
        </Field>
      </div>

      <p className="rounded-2xl bg-sky-soft px-4 py-3 text-xs leading-relaxed text-[#1d4b73]">
        Kami tidak meminta email, nomor telepon, atau alamat. Setelah mendaftar, kamu akan mendapat{" "}
        <strong>kode siswa</strong> untuk masuk kembali. Belajar mandiri bisa langsung dimulai; kelas dari guru
        bersifat opsional.
      </p>

      <Button type="submit" className="w-full" disabled={pending}>
        <UserPlus className="size-4" aria-hidden="true" />
        {pending ? "Membuat akun..." : "Buat akun siswa"}
      </Button>
    </form>
  );
}
