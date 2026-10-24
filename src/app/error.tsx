"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="konten" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 px-5 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-coral-soft text-coral">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-black">Ada gangguan sebentar</h1>
      <p className="text-sm text-muted">
        Halaman ini gagal dimuat. Coba muat ulang; progres yang sudah tersimpan tidak hilang.
      </p>
      <Button onClick={reset}>Coba lagi</Button>
    </main>
  );
}
