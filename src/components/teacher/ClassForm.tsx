"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createClassAction, type ActionState } from "@/app/actions/teacher";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";

export function ClassForm({ subjects }: { subjects: { slug: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createClassAction, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}
      <div className="grid gap-5">
        <Field label="Nama kelas baru" htmlFor="class-name" hint="Contoh: 5A - Matematika">
          <input
            id="class-name"
            name="name"
            className="input"
            placeholder="Contoh: 5B - Matematika"
            maxLength={60}
            required
          />
        </Field>
        <Field label="Tingkat kelas" htmlFor="class-grade" hint="Menentukan misi yang boleh diterima.">
          <select id="class-grade" name="gradeLevel" className="input" defaultValue="" required>
            <option value="" disabled>
              Pilih tingkat
            </option>
            {GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {gradeLabel(grade)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mata pelajaran" htmlFor="class-subject" hint="Misi mapel ini tampil otomatis ke siswa kelas.">
          <select id="class-subject" name="subject" className="input" defaultValue="" required>
            <option value="" disabled>
              Pilih mata pelajaran
            </option>
            {subjects.map((subject) => (
              <option key={subject.slug} value={subject.slug}>
                {subject.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" aria-hidden="true" />
        {pending ? "Membuat..." : "Buat kelas"}
      </Button>
    </form>
  );
}
