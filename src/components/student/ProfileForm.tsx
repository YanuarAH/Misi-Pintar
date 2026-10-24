"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { updateProfileAction, type ProfileState } from "@/app/actions/student";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/cn";

export function ProfileForm({
  displayName,
  avatarKey,
}: {
  displayName: string;
  avatarKey: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfileAction, null);
  const [avatar, setAvatar] = useState(avatarKey);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field
        label="Nama tampilan"
        htmlFor="displayName"
        hint="Nama panggilan yang dilihat gurumu. Jangan pakai nama lengkap."
      >
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          className="input"
          maxLength={40}
          required
          autoComplete="nickname"
        />
      </Field>

      <fieldset>
        <legend className="label">Avatar</legend>
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

      <Button type="submit" disabled={pending}>
        <Save className="size-4" aria-hidden="true" />
        {pending ? "Menyimpan..." : "Simpan profil"}
      </Button>
    </form>
  );
}
