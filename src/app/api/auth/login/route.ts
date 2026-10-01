import { forward } from "@/lib/merchant-proxy";

/** Merchant login → API key (the console's own login is the /login page). */
export const POST = (req: Request) => forward(req, "/api/v1/auth/login");
