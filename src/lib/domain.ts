// Shared domain types and lookups. Data itself comes from the backend (src/lib/api.ts).

export type PaymentStatus = "pending" | "approved" | "rejected" | "refunded" | "expired";
export type OutflowStatus = "pending" | "approved" | "rejected";
export type OutflowCategory = "withdraw" | "settlement" | "expense" | "refund";

export type Bank = { code: string; short: string; name: string; bg: string; fg: string };

// Bank chips: short code on the bank's colour. Names also come back from the API.
export const BANKS: Bank[] = [
  { code: "SCB", short: "SCB", name: "ธนาคารไทยพาณิชย์", bg: "#4e2a84", fg: "#ffffff" },
  { code: "BAY", short: "BAY", name: "ธนาคารกรุงศรีอยุธยา", bg: "#fec43b", fg: "#1f2937" },
  { code: "KKP", short: "KKP", name: "ธนาคารเกียรตินาคิน", bg: "#594f9d", fg: "#ffffff" },
  { code: "KTB", short: "KTB", name: "ธนาคารกรุงไทย", bg: "#1ba5e1", fg: "#ffffff" },
  { code: "UOB", short: "UOB", name: "ธนาคารยูโอบี", bg: "#0b3b8c", fg: "#ffffff" },
  { code: "HSBC", short: "HSBC", name: "ธนาคารฮ่องกงและเซี่ยงไฮ้แบงกิ้งคอร์ปอเรชั่น จำกัด", bg: "#db0011", fg: "#ffffff" },
  { code: "GHB", short: "GHB", name: "ธนาคารอาคารสงเคราะห์", bg: "#f57d20", fg: "#ffffff" },
  { code: "TISCO", short: "TSC", name: "ธนาคารทิสโก้", bg: "#12549f", fg: "#ffffff" },
  { code: "BBL", short: "BBL", name: "ธนาคารกรุงเทพ", bg: "#1e4291", fg: "#ffffff" },
  { code: "KBANK", short: "KBK", name: "ธนาคารกสิกรไทย", bg: "#138f2d", fg: "#ffffff" },
  { code: "CIMB", short: "CIMB", name: "ธนาคาร ซีไอเอ็มบี", bg: "#7e2f36", fg: "#ffffff" },
  { code: "GSB", short: "GSB", name: "ธนาคารออมสิน", bg: "#eb198d", fg: "#ffffff" },
  { code: "BAAC", short: "BAAC", name: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร", bg: "#4b9b3b", fg: "#ffffff" },
  { code: "LHBANK", short: "LHB", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์", bg: "#6d6e71", fg: "#ffffff" },
  { code: "MHCB", short: "MHCB", name: "ธนาคารมิซูโฮ", bg: "#150b78", fg: "#ffffff" },
  { code: "TTB", short: "TTB", name: "ธนาคารธนชาต", bg: "#1279be", fg: "#ffffff" },
  { code: "CITI", short: "CITI", name: "ซิตี้แบงก์ เอ็น.เอ.", bg: "#1d70b8", fg: "#ffffff" },
  { code: "SCBT", short: "SCBT", name: "ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)", bg: "#0473ea", fg: "#ffffff" },
  { code: "ISBT", short: "ISBT", name: "ธนาคารอิสลามแห่งประเทศไทย", bg: "#184615", fg: "#ffffff" },
  { code: "ACL", short: "ACL", name: "ธนาคารเอซีแอล", bg: "#6b7280", fg: "#ffffff" },
  { code: "TCRB", short: "TCRB", name: "ธนาคารไทยเครดิต เพื่อรายย่อย", bg: "#0055a5", fg: "#ffffff" },
  { code: "ANZ", short: "ANZ", name: "ธนาคารเอเอ็นแซด (ไทย)", bg: "#007dba", fg: "#ffffff" },
  { code: "SMTB", short: "SMTB", name: "ธนาคารซูมิโตโม มิตซุย ทรัสต์ (ไทย)", bg: "#a8873a", fg: "#ffffff" },
  { code: "SMEB", short: "SME", name: "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย", bg: "#0a5ca8", fg: "#ffffff" },
  { code: "ABN", short: "ABN", name: "ABN Amro Bank N.V.", bg: "#009286", fg: "#ffffff" },
  { code: "TRUEMONEY", short: "TMN", name: "ทรูมันนี่", bg: "#f26f21", fg: "#ffffff" },
  { code: "ICBC", short: "ICBC", name: "ธนาคารอุตสาหกรรมและการค้าจีน (ไทย)", bg: "#c4161c", fg: "#ffffff" },
  { code: "SMBC", short: "SMBC", name: "ธนาคารซูมิโตโม มิตซุย", bg: "#004831", fg: "#ffffff" },
  { code: "BOC", short: "BOC", name: "ธนาคารแห่งประเทศจีน (ไทย)", bg: "#a71e22", fg: "#ffffff" },
  { code: "DB", short: "DB", name: "ธนาคารดอยซ์แบงค์ (ไทย)", bg: "#0018a8", fg: "#ffffff" },
  { code: "IOB", short: "IOB", name: "ธนาคารอินเดียโอเวอร์ซี (ไทย)", bg: "#2e3192", fg: "#ffffff" },
];

export const findBank = (code: string) => BANKS.find((b) => b.code === code);

const DAY = 86_400_000;
const BKK_OFFSET = 7 * 3_600_000;

/** Midnight (Bangkok) of the day containing `ts`, as a UTC epoch. */
export function bkkDayStart(ts: number) {
  return Math.floor((ts + BKK_OFFSET) / DAY) * DAY - BKK_OFFSET;
}
