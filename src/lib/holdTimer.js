const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function holdSecondsUntil(expiresAt, now = Date.now()) {
  if (!expiresAt) return 0;
  const raw = String(expiresAt).trim();
  const normalized = TIMEZONE_SUFFIX.test(raw) ? raw : `${raw}Z`;
  const expiresAtMs = Date.parse(normalized);
  if (!Number.isFinite(expiresAtMs)) return 0;
  return Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
}
