import QR from "qrcode";

/** Server-rendered QR code as inline SVG (no client JS, no external service). */
export async function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const svg = await QR.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#16120a", light: "#ffffff" } });
  return (
    <div
      className="overflow-hidden rounded-xl bg-white p-2 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ width: size, height: size }}
      role="img"
      aria-label="QR code"
      // Generated locally from `value`; contains only SVG paths.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
