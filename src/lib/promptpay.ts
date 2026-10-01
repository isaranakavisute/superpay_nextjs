/**
 * Thai PromptPay QR payloads (EMVCo, tag 29). Same algorithm as the backend's
 * src/shared/promptpay.js, plus the bank-account target (sub-tag 04), which
 * most Thai banking apps do not accept.
 */
const f = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, "0")}${value}`;

function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePromptPayId(raw: string) {
  const d = raw.replace(/\D/g, "");
  return /^0\d{9}$/.test(d) || /^\d{13}$/.test(d) || /^\d{15}$/.test(d) ? d : null;
}

/** 3-digit bank codes used by the bank-account target. */
export const BANK_NUMERIC: Record<string, string> = { BBL: "002", KBANK: "004", KTB: "006", TTB: "011", SCB: "014", BAY: "025" };

function build(target: string, amount?: number) {
  const body =
    f("00", "01") + f("01", amount ? "12" : "11") + f("29", f("00", "A000000677010111") + target) + f("53", "764") +
    (amount ? f("54", amount.toFixed(2)) : "") + f("58", "TH") + "6304";
  return body + crc16(body);
}

export function promptPayPayload(rawId: string, amount?: number) {
  const id = normalizePromptPayId(rawId);
  if (!id) return null;
  return build(id.length === 10 ? f("01", `0066${id.slice(1)}`) : id.length === 13 ? f("02", id) : f("03", id), amount);
}

export function bankAccountPayload(bankCode: string, accountNo: string, amount?: number) {
  const n = BANK_NUMERIC[bankCode];
  const acc = accountNo.replace(/\D/g, "");
  if (!n || acc.length < 6) return null;
  return build(f("04", `${n}${acc}`), amount);
}
