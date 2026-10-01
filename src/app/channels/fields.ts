// Per-type field layout for the channel cards (shared by server page and client card).
export type FieldDef =
  | { key: string; label: string; kind: "text" | "number"; placeholder?: string; full?: boolean }
  | { key: string; label: string; kind: "secret"; placeholder?: string; full?: boolean; random?: boolean }
  | { key: string; label: string; kind: "check"; full?: boolean }
  | { key: string; label: string; kind: "readonly"; full?: boolean };

export type ChannelType = "telegram" | "line" | "facebook" | "email" | "sms";

export const TYPES: { type: ChannelType; label: string; about: string }[] = [
  { type: "telegram", label: "Telegram", about: "รับข้อความ + รูปสลิปจาก Telegram Bot — เพิ่มได้หลายตัว แต่ละตัวมี Bot Token ของตัวเอง" },
  { type: "line", label: "LINE", about: "รับสลิปจาก LINE Official Account — ใช้ Messaging API ของแต่ละ OA" },
  { type: "facebook", label: "Facebook", about: "รับข้อความและรูปจาก Facebook Page ผ่าน Messenger webhook" },
  { type: "email", label: "Email", about: "อ่านอีเมลแจ้งเงินเข้าจากธนาคารผ่าน IMAP — เพิ่มได้หลายกล่องอีเมล" },
  { type: "sms", label: "SMS", about: "รับ SMS แจ้งเงินเข้าจากมือถือที่ติดตั้งแอป Forwarder" },
];

const SLIP: FieldDef[] = [
  { key: "autoCreatePayment", label: "สร้างรายการชำระเงินอัตโนมัติเมื่อจับคู่ไม่ได้ (slip → payment ใหม่)", kind: "check" },
  { key: "ambiguousLatestOrder", label: "ยอดชนหลายออเดอร์ของร้านเดียวกัน → จับคู่ออเดอร์ล่าสุดที่สร้างก่อนเวลาโอนในสลิป", kind: "check" },
];

export const FIELDS: Record<ChannelType, FieldDef[]> = {
  telegram: [
    { key: "botToken", label: "Bot Token (จาก @BotFather)", kind: "secret", placeholder: "1234567890:ABC-DEF...", full: true },
    { key: "allowedChatIds", label: "Chat ID ที่อนุญาต (คั่นด้วย , — เว้นว่าง = รับทุก chat)", kind: "text", placeholder: "-1001234567890, 987654321", full: true },
    { key: "webhookSecret", label: "Webhook Secret (ถ้าใช้ webhook)", kind: "secret", random: true },
    { key: "parseRegex", label: "Regex แยกจำนวนเงินจากข้อความ", kind: "text", placeholder: "จำนวนเงิน\\s*([0-9,.]+)", full: true },
    { key: "slipOnly", label: "อ่านเฉพาะสลิป — ไม่มีรูปเงียบทิ้ง และไม่อ่านยอดจากข้อความ/caption", kind: "check" },
    { key: "captionKeyword", label: "คำที่ต้องมีใน caption ของรูป (เว้นว่าง = รับทุกรูป)", kind: "text", placeholder: "เช่น ร้านA" },
    { key: "requireOrderId", label: "รับเฉพาะรูปที่มี OrderID ใต้รูป — รูปที่หาออเดอร์ไม่เจอจะเก็บไว้ ไม่ตรวจสลิป", kind: "check" },
    ...SLIP,
  ],
  line: [
    { key: "accessToken", label: "Channel Access Token", kind: "secret", full: true },
    { key: "channelSecret", label: "Channel Secret", kind: "secret" },
    { key: "webhookUrl", label: "Webhook URL (ตั้งใน LINE Developers)", kind: "readonly", full: true },
    ...SLIP,
  ],
  facebook: [
    { key: "pageToken", label: "Page Access Token", kind: "secret", full: true },
    { key: "appSecret", label: "App Secret", kind: "secret" },
    { key: "verifyToken", label: "Verify Token", kind: "text" },
    { key: "webhookUrl", label: "Webhook URL (ตั้งใน Meta for Developers)", kind: "readonly", full: true },
    { key: "parseRegex", label: "Regex แยกจำนวนเงินจากข้อความ", kind: "text", full: true },
    ...SLIP,
  ],
  email: [
    { key: "imapHost", label: "IMAP Host", kind: "text", placeholder: "imap.gmail.com" },
    { key: "imapPort", label: "Port", kind: "number", placeholder: "993" },
    { key: "imapUser", label: "ผู้ใช้", kind: "text" },
    { key: "imapPassword", label: "รหัสผ่าน / App Password", kind: "secret" },
    { key: "folder", label: "โฟลเดอร์", kind: "text", placeholder: "INBOX" },
    { key: "senderFilter", label: "รับเฉพาะอีเมลจาก (คั่นด้วย ,)", kind: "text" },
    ...SLIP,
  ],
  sms: [
    { key: "webhookUrl", label: "Webhook URL (แอป Forwarder ส่งมาที่นี่)", kind: "readonly", full: true },
    { key: "webhookSecret", label: "Secret", kind: "secret", random: true },
    { key: "allowedSenders", label: "ผู้ส่ง SMS ที่อนุญาต (คั่นด้วย ,)", kind: "text" },
    { key: "requireRegisteredDevice", label: "รับเฉพาะเครื่องที่ลงทะเบียนแล้ว", kind: "check" },
  ],
};

export const SLIP_PROVIDERS = [
  { value: "default", label: "ใช้ค่าเริ่มต้นจากตั้งค่าระบบ" },
  { value: "none", label: "ไม่ verify (เก็บรูปอย่างเดียว)" },
  { value: "thunder", label: "Thunder Solution" },
  { value: "slipok", label: "SlipOK" },
  { value: "easyslip", label: "EasySlip" },
  { value: "slip2go", label: "Slip2Go" },
];

/** Credential fields shown only for the chosen provider. */
export const PROVIDER_FIELDS: Record<string, FieldDef[]> = {
  thunder: [{ key: "thunderAccessToken", label: "Thunder Access Token", kind: "secret", placeholder: "จาก developer.thunder.in.th" }],
  slipok: [
    { key: "slipOkApiKey", label: "SlipOK API Key", kind: "secret", placeholder: "x-authorization" },
    { key: "slipOkBranchId", label: "SlipOK Branch ID", kind: "text" },
  ],
  easyslip: [{ key: "easySlipApiKey", label: "EasySlip API Key", kind: "secret", placeholder: "Bearer token จาก developer.easyslip.com" }],
  slip2go: [
    { key: "slip2goApiUrl", label: "Slip2Go API URL", kind: "text", placeholder: "https://….slip2go.com" },
    { key: "slip2goSecretKey", label: "Slip2Go Secret Key", kind: "secret" },
  ],
};
