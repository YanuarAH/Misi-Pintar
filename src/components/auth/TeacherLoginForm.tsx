"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginTeacherAction, type AuthState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function TeacherLoginForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(loginTeacherAction, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

      <Field label="Email guru" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          placeholder="nama@sekolah.sch.id"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          className="input"
          placeholder="Minimal 8 karakter"
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn className="size-4" aria-hidden="true" />
        {pending ? "Memeriksa..." : "Masuk sebagai guru"}
      </Button>
    </form>
  );
}
