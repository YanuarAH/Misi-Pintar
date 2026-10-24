"use client";

import { useState } from "react";
import { Button } from "./Button";

/**
 * Konfirmasi dua langkah tanpa alert() bawaan browser.
 * Dipakai untuk tindakan guru yang menghapus data.
 */
export function ConfirmSubmit({
  action,
  hiddenFields,
  triggerLabel,
  confirmLabel,
  question,
  variant = "danger",
  size = "sm",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  triggerLabel: string;
  confirmLabel: string;
  question: string;
  variant?: "danger" | "secondary";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-2xl border border-coral/30 bg-coral-soft/60 p-2">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="text-xs font-semibold text-[#7d2418]">{question}</span>
      <Button type="submit" variant="danger" size="sm">
        {confirmLabel}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
        Batal
      </Button>
    </form>
  );
}
