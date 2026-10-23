export type WorkspaceStudent = { id: string; classId: string; branchId: string | null; label: string; classLabel: string };
export type WorkspaceAction = { kind: "plan" | "relation" | "publication"; operation?: "approve" | "retire" | "revoke"; id: string; sealHash?: string; revision?: number; validationHash?: string; label: string; changes: { label: string; before: string; after: string }[]; effects: string[] };
export type WorkspaceAnswer = {
  id: string; summary: string; requiresStudent?: boolean;
  steps: { id: string; title: string; note: string; state: "observed" | "reviewed" | "candidate" | "unknown" }[];
  details: { title: string; text: string; reviewId?: string }[];
  coverage: { label: string; value: string }[];
  action?: WorkspaceAction;
  reprepare?: { previousReviewId: string; expectedPreviousRevision: number; query?: string };
};
export type WorkspaceExecution = { id: string; state: "applied" | "no-op" | "preparing" | "published"; message: string; details: string[] };
export interface OntologyWorkspaceSource {
  students(signal: AbortSignal): Promise<WorkspaceStudent[]>;
  run(input: { query: string; student: WorkspaceStudent | null; previousReviewId?: string; expectedPreviousRevision?: number }, signal: AbortSignal): Promise<WorkspaceAnswer>;
  confirm(action: WorkspaceAction, signal: AbortSignal): Promise<WorkspaceExecution>;
  feedback(result: WorkspaceExecution, signal: AbortSignal): Promise<{ summary: string; details: string[] }>;
  history?(signal: AbortSignal): Promise<WorkspaceAnswer>;
  publication?(signal: AbortSignal): Promise<WorkspaceAnswer>;
  revocation?(signal: AbortSignal): Promise<WorkspaceAnswer>;
  review?(reviewId: string, signal: AbortSignal): Promise<WorkspaceAnswer>;
}
export class OntologyWorkspaceError extends Error {
  constructor(public code: "FORBIDDEN" | "STALE" | "UNAVAILABLE" | "NETWORK" | "BLOCKED", message: string) { super(message); this.name = "OntologyWorkspaceError"; }
}
