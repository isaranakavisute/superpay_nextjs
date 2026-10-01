export type Params = Record<string, string | string[] | undefined>;

/** First string value of a search param. */
export const param = (params: Params, key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

/** `path?…` with `patch` applied to the current params; null/"" removes a key. Paging resets unless patched. */
export function withParams(path: string, params: Params, patch: Record<string, string | number | null | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v) q.set(k, v);
  if (!("page" in patch)) q.delete("page");
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export const PAGE_SIZE = 20;

/** 1-based page from ?page=, clamped to ≥ 1. */
export function pageFrom(params: Params) {
  const n = Number.parseInt(param(params, "page") ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
