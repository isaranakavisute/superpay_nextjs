// Runs once when the console server starts (Next.js instrumentation): the background page-timing check (lib/page-probe.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./lib/page-probe")).startPageProbe();
}
