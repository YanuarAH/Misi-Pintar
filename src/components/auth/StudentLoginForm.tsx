"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginStudentAction, type AuthState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginStudentAction, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Kode siswa" htmlFor="accessCode" hint="Contoh: DEMO1234. Kode ini diberikan gurumu.">
        <input
          id="accessCode"
          name="accessCode"
          className="input font-mono uppercase tracking-widest"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          required
          placeholder="DEMO1234"
          aria-describedby="accessCode-hint"
        />
      </Field>

      <Field label="PIN" htmlFor="pin" hint="4–6 angka yang kamu pilih saat mendaftar.">
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          pattern="[0-9]{4,6}"
          maxLength={6}
          required
          className="input tracking-[0.4em]"
          placeholder="••••"
          aria-describedby="pin-hint"
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn className="size-4" aria-hidden="true" />
        {pending ? "Memeriksa..." : "Masuk dan belajar"}
      </Button>
    </form>
  );
}
