"use client";

import { useEffect, useRef } from "react";
import { playSound } from "./sounds";

const EVERY = 10_000;
const KEY = "sp_sound_pos";

/**
 * While payouts are waiting, play the configured sequence — one sound every
 * 10 s, looping. After a quiet spell it resumes after the last sound played.
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
      if (stop || pending.current <= 0) return;
      const pos = Number(localStorage.getItem(KEY) ?? "0") % sequence.length;
      playSound(sequence[pos]);
      localStorage.setItem(KEY, String((pos + 1) % sequence.length));
    };
    const id = setInterval(tick, EVERY);
    return () => { stop = true; clearInterval(id); };
  }, [sequence]);
  return null;
}
