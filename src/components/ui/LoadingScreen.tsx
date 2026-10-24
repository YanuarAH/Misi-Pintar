export function LoadingScreen({ label = "Memuat halaman...", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-5" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="mb-5 h-6 w-40 animate-pulse rounded-full bg-line/80" />
      <div className="mb-6 h-4 w-64 animate-pulse rounded-full bg-line/60" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-3xl border border-line bg-surface/70" />
        ))}
      </div>
    </div>
  );
}
