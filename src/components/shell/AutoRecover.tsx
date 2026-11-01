"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Every admin page shows the same text when its data did not arrive in time (lib/api.ts TIMEOUT_TEXT).
const TIMED_OUT = "ไม่ตอบภายในเวลาที่กำหนด";
const WAITS = [5, 10, 20];   // seconds before each automatic retry

/**
 * Automatic recovery for every admin page (1 Nov 2026): when a page shows "could not load in time", its data is fetched
 * again by itself after 5, 10 and 20 s (router.refresh — the page stays, nothing is re-submitted). No "press F5".
 */
export function AutoRecover() {
  const router = useRouter();
  const [state, setState] = useState<{ tries: number; left: number } | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const stuck = document.querySelector("main")?.textContent?.includes(TIMED_OUT) ?? false;
      setState((s) => {
        if (!stuck) return null;                              // recovered (or never stuck)
        if (!s) return { tries: 0, left: WAITS[0] };
        if (s.tries >= WAITS.length) return s;                // gave up: the page's own "ลองใหม่" stays
        if (s.left > 1) return { ...s, left: s.left - 1 };
        router.refresh();
        return { tries: s.tries + 1, left: WAITS[Math.min(s.tries + 1, WAITS.length - 1)] };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [router]);
  if (!state) return null;
  return (
    <div role="status" className="fixed right-4 bottom-4 z-[90] rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink shadow-lift">
      {state.tries < WAITS.length ? `ระบบจะลองโหลดข้อมูลใหม่ให้อัตโนมัติใน ${state.left} วินาที (ครั้งที่ ${state.tries + 1}/${WAITS.length}) — ไม่ต้องกดอะไร` : "ลองโหลดใหม่อัตโนมัติครบแล้ว — ระบบยังไม่ตอบ กรุณาแจ้งผู้ดูแลระบบ"}
    </div>
  );
}
