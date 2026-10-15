/**
 * The message to show for a failed API call: a validation error lists what is wrong with each field
 * (the server's Thai messages, e.g. "เลขบัญชีต้องเป็นตัวเลข 6–20 หลัก") instead of "Request validation failed".
 */
export function errorText(json: unknown, fallback: string): string {
  const e = (json as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
  if (!e) return fallback;
  const details = Array.isArray(e.details) ? (e.details as { message?: string }[]).map((d) => d?.message).filter(Boolean) : [];
  if (e.code === "validation_error" && details.length) return [...new Set(details)].join(" · ");
  return e.message ?? fallback;
}
