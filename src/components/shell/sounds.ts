"use client";

/** Built-in alert sounds, synthesised with Web Audio (no files to ship). */
export const BUILTIN_SOUNDS = [
  { id: "builtin:beep", name: "บี๊ป 3 ครั้ง", seconds: 1.2 },
  { id: "builtin:chime", name: "กริ๊ง 2 โน้ต", seconds: 1.4 },
  { id: "builtin:siren", name: "ไซเรน", seconds: 3 },
  { id: "builtin:bell", name: "ระฆัง", seconds: 2.5 },
] as const;

let ctx: AudioContext | null = null;
function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(a: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.25) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
  return o;
}

let current: HTMLAudioElement | null = null;

/** Play one sound by id. Custom sounds stop after 9.5 s so the next one starts cleanly. */
export function playSound(id: string) {
  const a = audio();
  if (id === "builtin:beep") [0, 0.4, 0.8].forEach((t) => tone(a, 880, t, 0.25, "square", 0.12));
  else if (id === "builtin:chime") { tone(a, 1046.5, 0, 0.6); tone(a, 1318.5, 0.35, 0.9); }
  else if (id === "builtin:siren") {
    const o = tone(a, 600, 0, 3, "sawtooth", 0.08);
    for (let t = 0; t < 3; t += 0.75) { o.frequency.linearRampToValueAtTime(1100, a.currentTime + t + 0.375); o.frequency.linearRampToValueAtTime(600, a.currentTime + t + 0.75); }
  } else if (id === "builtin:bell") { tone(a, 523.25, 0, 2.4, "triangle", 0.3); tone(a, 1046.5, 0, 1.6, "sine", 0.12); tone(a, 1568, 0, 0.9, "sine", 0.06); }
  else if (id.startsWith("custom:")) {
    current?.pause();
    const el = new Audio(`/branding/sound/${id.slice(7)}`);
    current = el;
    void el.play().catch(() => {});
    setTimeout(() => { if (current === el) el.pause(); }, 9500);
  }
}
