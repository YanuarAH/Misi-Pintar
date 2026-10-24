"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createClassAction, type ActionState } from "@/app/actions/teacher";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function ClassForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createClassAction, null);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label="Nama kelas baru" htmlFor="class-name">
        <input
          id="class-name"
          name="name"
          className="input"
          placeholder="Contoh: Kelas 5B - Matematika"
          maxLength={60}
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" aria-hidden="true" />
        {pending ? "Membuat..." : "Buat kelas"}
      </Button>
    </form>
  );
}
