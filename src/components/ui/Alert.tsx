import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { className: string; Icon: typeof AlertCircle }> = {
  error: { className: "border-coral/30 bg-coral-soft text-[#7d2418]", Icon: AlertCircle },
  success: { className: "border-leaf/30 bg-leaf-soft text-[#1c5b36]", Icon: CheckCircle2 },
  info: { className: "border-sky/30 bg-sky-soft text-[#1d4b73]", Icon: Info },
};

export function Alert({
  tone = "error",
  children,
  className,
  role,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const { className: toneClass, Icon } = tones[tone];
  return (
    <div
      role={role ?? (tone === "error" ? "alert" : "status")}
      className={cn("flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium", toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
