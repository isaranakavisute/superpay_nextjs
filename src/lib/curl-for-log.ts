import type { ApiLogRow } from "./rows";

/**
 * The curl command equivalent to a logged request — rebuilt from what the server received (method, path, query,
 * headers). Keys, secrets and signatures are never stored, so they are placeholders; request bodies are not stored
 * either (pass `body` when it is known from elsewhere, e.g. the audit log).
 */
export function curlFor(r: ApiLogRow, body?: string): string {
  const url = `${r.path}${r.query ? `?${r.query}` : ""}`;
  const write = r.method !== "GET";
  const data = write ? (body ?? "<request body>") : "";
  if (r.source === "console") {
    // Internal admin API — only reachable on the production server (the console calls it).
    return [
      `curl -sS -X ${r.method} "http://127.0.0.1:4650${url}"`,
      `  -H "x-console-key: <CONSOLE_API_KEY>"`,
      `  -H "x-console-actor: ${r.actor ?? "<admin>"}"`,
      ...(write ? [`  -H "content-type: application/json"`, `  -d '${data}'`] : []),
    ].join(" \\\n");
  }
  if (!r.keyPrefix) return `curl -sS -X ${r.method} "https://optionpay.co${url}"`;
  const sub = r.keyMerchantId != null && r.merchantId != null && r.keyMerchantId !== r.merchantId;
  return [
    `API_KEY="${r.keyPrefix.replace("…", "")}…"   # full API key${r.keyUser ? ` of ${r.keyUser}` : ""}`,
    `SECRET="<secret key>"`,
    `PATHQ="${url}"`,
    `BODY='${data}'`,
    `TS=$(date +%s)`,
    `SIG=$(printf '%s' "\${TS}.${r.method}.\${PATHQ}.\${BODY}" | openssl dgst -sha256 -hmac "\${SECRET}" | awk '{print $NF}')`,
    [
      `curl -sS -X ${r.method} "https://optionpay.co\${PATHQ}"`,
      `  -H "X-API-Key: \${API_KEY}"`,
      `  -H "X-Timestamp: \${TS}"`,
      `  -H "X-Signature: \${SIG}"`,
      ...(sub ? [`  -H "X-Sub-Merchant: ${r.merchantId}"`] : []),
      ...(write ? [`  -H "Content-Type: application/json"`, `  -d "\${BODY}"`] : []),
    ].join(" \\\n"),
  ].join("\n");
}
