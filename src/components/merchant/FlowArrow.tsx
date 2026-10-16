/**
 * The arrow between two cards on แดชบอร์ดร้านค้า (admin): what is taken off on the way, and a button
 * that opens every transaction behind it. Horizontal on wide screens, pointing down when the cards stack.
 */
export function FlowArrow({ lines, children }: { lines: { label: string; value: string; tone?: string }[]; children?: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-2 py-2 xl:px-1">
      {/* the arrow itself */}
      <div aria-hidden className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 xl:block">
        <div className="mx-1 h-[2px] bg-linear-to-r from-line via-primary/70 to-primary" />
        <div className="absolute top-1/2 right-0 size-0 -translate-y-1/2 border-y-[7px] border-l-[11px] border-y-transparent border-l-primary" />
      </div>
      <div aria-hidden className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-linear-to-b from-line via-primary/70 to-primary xl:hidden" />
      <div className="relative z-[1] flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-center shadow-card">
        {lines.map((l) => (
          <div key={l.label} className="leading-tight">
            <div className="text-[10.5px] text-muted">{l.label}</div>
            <div className={`text-[13px] font-semibold tabular-nums ${l.tone ?? "text-ink"}`}>{l.value}</div>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}

/** Vertical arrow from a card to the card below it (e.g. the period's net → the running total it is part of). */
export function CarryArrow({ label, note }: { label: string; note?: string }) {
  return (
    <div className="relative flex min-h-[72px] flex-col items-center justify-center">
      <div aria-hidden className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-linear-to-b from-sky-400/30 to-sky-400" />
      <div aria-hidden className="absolute bottom-0 left-1/2 size-0 -translate-x-1/2 border-x-[7px] border-t-[11px] border-x-transparent border-t-sky-400" />
      <div className="relative z-[1] rounded-full border border-sky-500/40 bg-surface px-3 py-1 text-center text-[11.5px] shadow-card">
        <span className="font-medium text-sky-300">{label}</span>
        {note && <div className="text-[10.5px] text-muted">{note}</div>}
      </div>
    </div>
  );
}
