import { CodeBlock } from "../CodeBlock";
import { Note, Table } from "../DocLayout";

/**
 * Why the shop's own signature equals Option Pay's (Option B: sk_live_-derived), in detail and in Thai — shown only to
 * shops whose callbacks are signed that way. The worked example uses a TEST key; its values were computed with openssl.
 */
const TEST = {
  sk: "sk_live_TESTONLY_not_a_real_key_1234567890",
  t: "1792236293",
  body: '{"event":"payment.approved","ref":"TXN100001","orderId":"PD-1","amount":"1000.00","status":"approved","createdAt":"2026-10-17T09:21:20.000Z","resentAt":"2026-10-17T09:24:53.515Z"}',
  key: "4440459dbf874ab28d5b244f35ba815b91b891b5f700f5d7d1da0c220d3fe02b",
  v1: "b3ca76718dca475af334b0f9dc19fc6df2c6a498ca23c406abc2c0525d846d04",
  v1AmountChanged: "1ec0f23c7f87581f1010bbb4605203fc5504d0cc322dbb60016f3ec1e118aeee",
  v1KeyChanged: "7bfbcb7d9b5195905bbd6401db27805b701f451a5a52b931da5bb6903ce09e54",
};

const H = ({ children }: { children: React.ReactNode }) => <div className="mt-5 mb-2 text-[15px] font-semibold">{children}</div>;

/** The worked example's results for the demo path (shops whose webhook path differs from the one below). */
const TEST_DEMO_PATH = {
  path: "/optionpay/callback",
  key: "1b73526bbe51c46d83195993cf246f011c3aee6328e2a180685a213899c2f5c9",
  v1: "f472d7269a411dec164a6b01b57d60caf3d50361f985ddeca0b3b70a3b70b164",
  v1AmountChanged: "ef15008c0bcf3819136087b2c65fec983f260727dc3cd9014fa4c9d65577b448",
  v1KeyChanged: "ee8a0889edd57bb3d2361372bbc66aa8939774af08db6209d6cd9d3bab5093f6",
};

export function SignatureMatchExplained() {
  // Demo values only (no shop data): the worked example uses the demo callback path.
  const ex = { ...TEST, ...TEST_DEMO_PATH };
  const path = ex.path;
  return (
    <div className="my-4 rounded-xl border border-line p-4">
      <div className="text-[16px] font-semibold">อธิบายละเอียด: ทำไมลายเซ็นที่ร้านคำนวณเอง จึงตรงกับลายเซ็นที่ Option Pay ส่งมา</div>

      <H>1. HMAC-SHA256 คืออะไร</H>
      <p>HMAC-SHA256 คือสูตรคำนวณที่รับของ 2 อย่าง คือ <strong>กุญแจลับ (key)</strong> กับ <strong>ข้อความ (message)</strong> แล้วให้ผลลัพธ์เป็นตัวอักษร 64 ตัว (เลขฐานสิบหก) มีคุณสมบัติสำคัญ 3 ข้อ:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li><strong>ใส่ input เหมือนเดิม ได้ผลลัพธ์เหมือนเดิมทุกครั้ง</strong> — ไม่ว่าจะคำนวณที่ไหน ด้วยภาษาโปรแกรมอะไร (Node.js, PHP, openssl…) ผลก็เท่ากันทุกตัวอักษร</li>
        <li><strong>input ต่างแม้แต่ 1 ตัวอักษร ผลลัพธ์จะต่างไปทั้งหมด</strong> — ไม่ได้ต่างแค่นิดเดียว จึงเห็นได้ทันทีว่ามีอะไรถูกแก้</li>
        <li><strong>ย้อนกลับไม่ได้</strong> — เห็นผลลัพธ์แล้วก็หากุญแจลับไม่ได้ และถ้าไม่มีกุญแจลับ ก็สร้างลายเซ็นที่ถูกต้องไม่ได้</li>
      </ul>

      <H>2. ทั้งสองฝั่งใช้ input ชุดเดียวกันครบทั้ง 4 ตัว</H>
      <p>ลายเซ็นของ callback คำนวณจาก input 4 ตัว ทั้ง Option Pay (ผู้ส่ง) และร้าน (ผู้รับ) มี input ชุดเดียวกันครบทุกตัว:</p>
      <Table head={["Input", "ฝั่ง Option Pay (ตอนส่ง)", "ฝั่งร้าน (ตอนรับ)"]} rows={[
        [<strong key="a">1. secret key</strong>, <><code>sk_live_…</code> ของร้านคุณ (เก็บไว้แบบเข้ารหัส)</>, <><code>sk_live_…</code> ตัวเดียวกัน — ร้านได้จาก Merchant Portal → ตั้งค่า</>],
        [<strong key="b">2. body</strong>, "ข้อความ JSON ที่ส่งไป", "ข้อความ JSON ที่ได้รับ — ต้องใช้แบบดิบ ทุกตัวอักษรเหมือนที่ได้รับ"],
        [<strong key="c">3. t (เวลา)</strong>, "เวลาตอนส่ง (unix วินาที) — ใส่ไว้ใน header x-signature", <>อ่านจาก header <code>x-signature: t=…</code> ที่ได้รับ</>],
        [<strong key="d">4. path + สูตร</strong>, <><code>{path}</code> + สูตร 2 ขั้น</>, <><code>{path}</code> + สูตร 2 ขั้นเดียวกัน (ในคู่มือนี้)</>],
      ]} />
      <p className="mt-2">secret key <strong>ไม่เคยถูกส่งไปกับ callback</strong> — ทั้งสองฝั่งมีอยู่แล้วล่วงหน้า สิ่งที่ส่งไปมีแค่ body กับ <code>t</code> และ <code>v1</code> ใน header ดังนั้นคนกลางที่ดักเห็น callback ก็ปลอมลายเซ็นไม่ได้</p>

      <H>3. ขั้นตอนของแต่ละฝั่ง</H>
      <Table head={["", "Option Pay (ผู้ส่ง)", "ร้าน (ผู้รับ)"]} rows={[
        ["ขั้นที่ 1", <>สร้าง body และเลือก <code>t</code> = เวลาปัจจุบัน</>, <>รับ body ดิบ และอ่าน <code>t</code>, <code>v1</code> จาก header</>],
        ["ขั้นที่ 2", <><code>{`key = HMAC-SHA256(sk_live, t + ".POST.${path}." + body)`}</code></>, "คำนวณ key ด้วยสูตรเดียวกัน"],
        ["ขั้นที่ 3", <><code>{"v1 = HMAC-SHA256(key, t + \".\" + body)"}</code></>, <>คำนวณ v1 ด้วยสูตรเดียวกัน → ได้ <strong>v1 ของร้าน</strong></>],
        ["ขั้นที่ 4", <>ส่ง <code>{"x-signature: t=<t>,v1=<v1>"}</code> พร้อม body</>, <>เทียบ <strong>v1 ของร้าน</strong> กับ <strong>v1 ใน header</strong> — ตรงกัน = เป็นของจริงจาก Option Pay และ body ไม่ถูกแก้</>],
      ]} />

      <H>4. ตัวอย่างตัวเลขจริง (ใช้ key ทดสอบ — ไม่ใช่ key จริงของร้าน)</H>
      <p>ค่าต่อไปนี้คำนวณจริงด้วย openssl — ร้านลองคำนวณซ้ำด้วยโค้ดของร้านได้ ต้องได้ค่าเดียวกันทุกตัวอักษร:</p>
      <Table head={["รายการ", "ค่า"]} rows={[
        ["secret key (ทดสอบ)", <code key="k">{ex.sk}</code>],
        ["t", <code key="t">{ex.t}</code>],
        ["path", <code key="p">{ex.path}</code>],
        ["body", <code key="b" className="break-all">{ex.body}</code>],
        ["ผลขั้นที่ 2: key", <code key="kk" className="break-all">{ex.key}</code>],
        ["ผลขั้นที่ 3: v1", <code key="v" className="break-all">{ex.v1}</code>],
      ]} />
      <CodeBlock code={`SECRET='${ex.sk}'
T='${ex.t}'
BODY='${ex.body}'
KEY=$(printf '%s' "$T.POST.${ex.path}.$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
V1=$(printf '%s' "$T.$BODY" | openssl dgst -sha256 -hmac "$KEY" | awk '{print $NF}')
echo $KEY   # ${ex.key}
echo $V1    # ${ex.v1}`} />
      <p className="mt-2">ถ้าเปลี่ยน input แม้แต่นิดเดียว v1 จะต่างไปทั้งหมด:</p>
      <Table head={["เปลี่ยนอะไร", "v1 ที่ได้"]} rows={[
        ["ไม่เปลี่ยน (ถูกต้อง)", <code key="a" className="break-all">{ex.v1}</code>],
        [<>แก้ยอดใน body จาก <code>1000.00</code> เป็น <code>1000.01</code></>, <code key="b" className="break-all">{ex.v1AmountChanged}</code>],
        ["เปลี่ยน secret key ตัวสุดท้าย 0 → 1", <code key="c" className="break-all">{ex.v1KeyChanged}</code>],
      ]} />

      <H>5. ถ้าลายเซ็นไม่ตรง — ตรวจทีละข้อ</H>
      <Table head={["สาเหตุ", "วิธีแก้"]} rows={[
        ["ใช้ body ที่แปลงแล้ว (เช่น JSON.parse แล้ว JSON.stringify กลับ, จัดรูปแบบ, เว้นวรรค)", <>ใช้ body ดิบที่ได้รับ เช่น <code>await req.text()</code> ก่อนแปลงเป็น JSON</>],
        ["ใช้ key ผิดตัว", <>ต้องเป็น <code>sk_live_…</code> ของร้านคุณ (ไม่ใช่ API key <code>ak_live_…</code> และไม่ใช่ <code>whsec_…</code>) · ถ้าเพิ่งสร้าง secret key ใหม่ ต้องใช้ตัวใหม่</>],
        ["path ไม่ตรง", <>ใช้ <code>{path}</code> ตรงทุกตัวอักษร ไม่ใส่โดเมน ไม่ใส่ query ไม่มี / ท้าย</>],
        ["ลืมจุด (.) หรือคำว่า POST", <><code>{`t + ".POST." + path + "." + body`}</code> และ <code>{"t + \".\" + body"}</code></>],
        [<>ใช้ <code>t</code> ผิด</>, <>ใช้ <code>t</code> จาก header ของ callback นั้น ไม่ใช่เวลาปัจจุบันของเครื่องร้าน</>],
        ["ตัวอักษรภาษาไทยใน body", "คำนวณจากข้อความแบบ UTF-8 (ค่าเริ่มต้นของ Node.js / openssl)"],
      ]} />
      <Note>สรุป: ลายเซ็นของร้านตรงกับของ Option Pay เพราะ <strong>ใช้ secret key เดียวกัน + body เดียวกันทุกตัวอักษร + t เดียวกัน + path และสูตรเดียวกัน</strong> — HMAC ให้ผลเดิมเสมอเมื่อ input เดิม จึงได้ v1 เท่ากัน · ถ้าไม่ตรง ให้ตอบ 401 และไม่ทำรายการ</Note>
    </div>
  );
}
