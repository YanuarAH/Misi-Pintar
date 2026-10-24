/**
 * Pembatas percobaan login sederhana di memori proses.
 * Cukup untuk deployment satu instance; lihat catatan batasan di README.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_ENTRIES = 5000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_ENTRIES) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  return { ok: true };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
