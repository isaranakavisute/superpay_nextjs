import { connection } from "next/server";

/** Opts the route into per-request rendering and returns the request's timestamp. */
export async function requestTime() {
  await connection();
  return Date.now();
}
