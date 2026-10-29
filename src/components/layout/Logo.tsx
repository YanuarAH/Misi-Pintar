import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-black tracking-tight text-ink", className)}>
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_3px_0_var(--color-primary-strong)]">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg leading-none">
        Misi<span className="text-primary">Pintar</span>
        {!compact ? <span className="block text-xs font-bold tracking-wider text-muted">Belajar seru</span> : null}
      </span>
    </Link>
  );
}
