"use client";

import { useActionState } from "react";
import { GraduationCap } from "lucide-react";
import { setGradeAction, type ClassState } from "@/app/actions/student";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { GRADE_LEVELS, gradeLabel } from "@/lib/curriculum";

export function GradePicker({ gradeLevel }: { gradeLevel: number | null }) {
  const [state, formAction, pending] = useActionState<ClassState, FormData>(setGradeAction, null);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <label htmlFor="gradeLevel" className="block text-sm font-bold text-ink">
        Tingkat kelas
      </label>
      <p className="text-sm text-muted">
        Dipakai untuk menampilkan misi yang sesuai. Boleh diubah kapan saja.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <select
          id="gradeLevel"
          name="gradeLevel"
          defaultValue={gradeLevel === null ? "" : String(gradeLevel)}
          className="input w-full max-w-56"
          required
        >
          <option value="" disabled>
            Pilih tingkat kelas
          </option>
          {GRADE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {gradeLabel(level)}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending} variant="secondary">
          <GraduationCap className="size-4" aria-hidden="true" />
          {pending ? "Menyimpan..." : "Simpan tingkat"}
        </Button>
      </div>
    </form>
  );
}
