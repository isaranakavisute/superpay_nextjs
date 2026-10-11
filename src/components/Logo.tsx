/**
 * Option Pay brand: a gold coin mark plus the wordmark. To use a supplied
 * brand file instead, put it in /public and swap the <svg> for an <img>.
 */
export function LogoMark({ size = 36, letter = "O" }: { size?: number; letter?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="sp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3d778" />
          <stop offset="55%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a67c1a" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#sp-gold)" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#16120a" strokeOpacity="0.28" strokeWidth="1.5" />
      <text
        x="20"
        y="26.5"
        textAnchor="middle"
        fontFamily="Segoe UI, Inter, system-ui, sans-serif"
        fontSize="19"
        fontWeight="800"
        fill="#16120a"
      >
        {letter}
      </text>
    </svg>
  );
}

export type LogoBrand = { siteName: string; tagline?: string; logoUrl: string | null; scale: number };

/** Uploaded logo (from settings) when set; otherwise the coin mark + site name. */
export function Logo({ size = 36, subtitle, brand }: { size?: number; subtitle?: string; brand?: LogoBrand }) {
  const name = brand?.siteName ?? "Option Pay";
  const sub = brand ? brand.tagline : subtitle;
  if (brand?.logoUrl) {
    return (
      <div className="min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, any aspect ratio */}
        <img src={brand.logoUrl} alt={name} style={{ height: Math.round(size * (brand.scale / 100)), maxWidth: "100%" }} className="block w-auto object-contain" />
        {sub && <div className="mt-1 text-[11px] text-soft">{sub}</div>}
      </div>
    );
  }
  // "Option Pay" → "Option" in white + "Pay" in gold; any other name is one gradient word.
  const split = /^(.+?)(\s*Pay)$/.exec(name);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <LogoMark size={size} letter={name.trim().charAt(0).toUpperCase() || "O"} />
      <div className="min-w-0">
        <div className="truncate leading-tight font-bold tracking-[0.3px] text-white" style={{ fontSize: size * 0.47 }}>
          {split ? (
            <>
              {split[1]}
              <span className="bg-linear-to-br from-primary-alt to-primary bg-clip-text text-transparent">{split[2]}</span>
            </>
          ) : (
            <span className="bg-linear-to-br from-white to-primary-alt bg-clip-text text-transparent">{name}</span>
          )}
        </div>
        {sub && <div className="text-[11px] text-soft">{sub}</div>}
      </div>
    </div>
  );
}
