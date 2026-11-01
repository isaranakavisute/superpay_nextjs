"use client";

import { useEffect, useState } from "react";

/**
 * Shown when a page could not get its data (e.g. the backend did not answer within 10 s, 1 Nov 2026): a clear message
 * instead of a hanging or blank page. Tries once more by itself after 5 s; then the "ลองใหม่" button. Uses retry() —
 * in this Next.js version it fetches the page's data again (reset() only re-renders, without fetching: same error).
 */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [left, setLeft] = useState(5);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (tried) return;
    const id = setInterval(() => setLeft((s) => { if (s <= 1) { clearInterval(id); setTried(true); retry(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [tried, retry]);
  return (
    <div className="mx-auto mt-16 max-w-[520px] rounded-2xl border border-line bg-surface p-8 text-center">
      <div className="mb-2 text-[36px]">⚠️</div>
      <h1 className="mb-2 text-lg font-bold">โหลดข้อมูลหน้านี้ไม่สำเร็จ</h1>
      <p className="text-[14px] text-muted">{/ไม่ตอบภายใน/.test(error.message) ? error.message : "ระบบตอบช้าหรือขัดข้องชั่วคราว"}</p>
      <p className="mt-3 text-[13px] text-muted">{tried ? "ลองโหลดใหม่ให้อัตโนมัติแล้ว 1 ครั้ง" : `ระบบจะลองโหลดใหม่ให้อัตโนมัติใน ${left} วินาที…`}</p>
      <button className="mt-4 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-primary-fg" onClick={() => retry()}>ลองใหม่</button>
    </div>
  );
}
