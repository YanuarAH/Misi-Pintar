export function ProgressBar({
  value,
  total,
  label,
  tone = "primary",
}: {
  value: number;
  total: number;
  label: string;
  tone?: "primary" | "sun";
}) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.min(100, Math.round((value / safeTotal) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-muted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-line/70"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={tone === "sun" ? "h-full rounded-full bg-sun" : "h-full rounded-full bg-primary"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
