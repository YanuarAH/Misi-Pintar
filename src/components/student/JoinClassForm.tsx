"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { joinClassAction, type ClassState } from "@/app/actions/student";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function JoinClassForm() {
  const [state, formAction, pending] = useActionState<ClassState, FormData>(joinClassAction, null);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <label htmlFor="code" className="block text-sm font-bold text-ink">
        Kode kelas dari guru
      </label>
      <p className="text-sm text-muted">
        6 huruf/angka, contoh <span className="font-mono font-bold">MISI5A</span>. Tidak wajib:
        belajar mandiri tetap bisa tanpa kelas.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          id="code"
          name="code"
          className="input w-44 font-mono uppercase tracking-[0.3em]"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          required
          placeholder="MISI5A"
        />
        <Button type="submit" disabled={pending}>
          <KeyRound className="size-4" aria-hidden="true" />
          {pending ? "Menggabungkan..." : "Gabung kelas"}
        </Button>
      </div>
    </form>
  );
}
