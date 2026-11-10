type Bucket = { count: number; resetAt: number };

type GlobalWithBuckets = typeof globalThis & { __wishlistBuckets?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  const g = globalThis as GlobalWithBuckets;
  if (!g.__wishlistBuckets) g.__wishlistBuckets = new Map();
  return g.__wishlistBuckets;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const map = buckets();
  const now = Date.now();
  if (map.size > 5000) {
    for (const [k, bucket] of map) {
      if (bucket.resetAt < now) map.delete(k);
    }
  }
  const existing = map.get(key);
  if (!existing || existing.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
