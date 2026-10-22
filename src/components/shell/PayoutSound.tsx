"use client";

import { useEffect, useRef } from "react";
import { playSound } from "./sounds";

const POLL = 10_000;
const REPEAT = 30 * 60_000;
const KEY = "sp_sound_pos";
const LAST = "sp_sound_last";

/**
 * While payouts are waiting, play the configured sequence: the first sound within 10 s of a payout
 * becoming outstanding, then one sound every 30 minutes until none are left (22 Oct 2026: was every 10 s).
 * The last play time is shared by all tabs and survives a reload, so open tabs don't each play it.
 * After a quiet spell it resumes after the last sound played.
 * Browsers only allow audio after the user has clicked the page once.
 */
export function PayoutSound({ sequence, initialPending }: { sequence: string[]; initialPending: number }) {
  const pending = useRef(initialPending);
  useEffect(() => {
    if (!sequence.length) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/poll", { cache: "no-store" });
        const j = (await r.json()) as { outflows: number | null };
        if (j.outflows != null) pending.current = j.outflows;
      } catch {
        /* keep the last known count */
      }
      if (stop) return;
      // Nothing waiting: the next outstanding payout sounds straight away.
      if (pending.current <= 0) return localStorage.removeItem(LAST);
      const now = Date.now();
      if (now - Number(localStorage.getItem(LAST) ?? "0") < REPEAT) return;
      localStorage.setItem(LAST, String(now));
      const pos = Number(localStorage.getItem(KEY) ?? "0") % sequence.length;
      playSound(sequence[pos]);
      localStorage.setItem(KEY, String((pos + 1) % sequence.length));
    };
    const id = setInterval(tick, POLL);
    return () => { stop = true; clearInterval(id); };
  }, [sequence]);
  return null;
}
