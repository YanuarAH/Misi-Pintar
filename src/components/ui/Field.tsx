import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="hint-text" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-coral" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
