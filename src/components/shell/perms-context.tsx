"use client";

import { createContext, useContext } from "react";

/**
 * The signed-in operator's permissions (สิทธิ์การเข้าถึง), for hiding action buttons their role may not use. The backend
 * refuses those actions anyway (middleware/consolePerms.js); this only keeps the screen honest. null = unknown → show.
 */
const PermsContext = createContext<string[] | null>(null);

export function PermsProvider({ perms, children }: { perms: string[] | null; children: React.ReactNode }) {
  return <PermsContext.Provider value={perms}>{children}</PermsContext.Provider>;
}

/** can("payment.approve") — Super Admin ("*") can do everything. */
export function useCan() {
  const perms = useContext(PermsContext);
  return (perm: string) => !perms || perms.includes("*") || perms.includes(perm);
}

/** Renders its children only when the operator has `perm` (any one of a list). */
export function Can({ perm, children, fallback = null }: { perm: string | string[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const can = useCan();
  return <>{(Array.isArray(perm) ? perm.some(can) : can(perm)) ? children : fallback}</>;
}
