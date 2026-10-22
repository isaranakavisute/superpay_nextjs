export type BackupFile = { name: string; takenAt: string; sizeBytes: string; tables: number | null; seenAt: string };
export type BackupJob = {
  id: number; kind: "backup" | "restore"; file: string | null; status: "requested" | "running" | "done" | "failed"; step: string | null;
  requestedBy: string; reason: string | null; requestedAt: string; startedAt: string | null; finishedAt: string | null; message: string | null; keptAs: string | null;
};
export type BackupOverview = {
  schedule: { time: string; timezone: string; keepDays: number | null; changesKeepDays: number };
  files: BackupFile[]; jobs: BackupJob[]; keptDatabases: string[]; canManage: boolean;
};
export type RestoreImpact = {
  file: string; takenAt: string;
  impact: { paymentsCreated: number; paymentsDecided: number; approvedAmount: string; payoutsCreated: number; payoutAmount: string; withdrawalsCreated: number; callbacksSent: number; auditEntries: number };
};

export type ChangeDay = { day: string; changes: number; transactions: number; firstAt: string; lastAt: string };
export type ChangeRow = { id: string; tbl: string; op: "I" | "U" | "D"; pk: Record<string, unknown>; label: string | null; changed: string[] | null; status: string | null; statusBefore: string | null };
export type ChangeTx = { txid: string; at: string; changeCount: number; source: string | null; changes: ChangeRow[]; audits: { actor: string; action: string; ref: string; detail: string }[] | null };
export type ChangeFilter = { day: string; from: string; to: string; table?: string; q?: string };
export type ApplyBody = { mode: "undo" | "replay"; txids?: string[]; range?: { day: string; from: string; to: string; table?: string } };
export type ApplyResult = { dry: boolean; summary: { total: number; ok: number; conflicts: number; errors: number }; skipped: { id: string; result: string; tbl?: string; op?: string; label?: string }[] };
