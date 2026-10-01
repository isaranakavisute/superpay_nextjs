/**
 * Faint, repeating "Isara Nakavisute" watermark over every page. It sits on
 * top so cards don't hide it, but is click-through, unselectable and hidden
 * from screen readers.
 */
const TEXT = "Isara Nakavisute";
const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" transform="rotate(-24 180 110)" font-family="Segoe UI, Inter, system-ui, sans-serif" font-size="26" font-weight="600" fill="#ffffff" fill-opacity="0.055">${TEXT}</text></svg>`;
const url = `url("data:image/svg+xml,${encodeURIComponent(tile)}")`;

export function Watermark() {
  return (
    <div
      aria-hidden="true"
      data-watermark={TEXT}
      className="pointer-events-none fixed inset-0 z-[9999] select-none print:fixed"
      style={{ backgroundImage: url, backgroundRepeat: "repeat" }}
    />
  );
}
