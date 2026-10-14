import { z } from "zod";
import type { DocumentWorkflow } from "./workspaceWorkflow.contract";

export const documentIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
/**
 * 내 시험지 자료 종류 — 시험지 · 추출한 자료 · 개념 백지(원장님 2026-10-01 «개념 백지를 담아서 내 시험지에 저장», 26 §9 ⑾).
 * 🔴 종류를 더하면 DB CHECK `workspace_document_kind_check` 도 넓힌다 — `workspaceDocumentKindConstraint.test.ts` 가 막는다.
 */
export const documentKindSchema = z.enum([
  "draft",
  "extraction",
  "conceptBlank",
  "arithmeticSheet",
]);
export type DocumentKind = z.infer<typeof documentKindSchema>;
export const documentVisibilitySchema = z.enum(["private", "branch"]);
export type DocumentVisibility = z.infer<typeof documentVisibilitySchema>;
export type DocumentSharing = {
  visibility: DocumentVisibility;
  sharedBranchId: string | null;
};
export const saveDocumentSchema = z.strictObject({
  kind: documentKindSchema,
  title: z.string().trim().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
  expectedRevision: z.number().int().min(0).nullable(),
  // Omission preserves an existing scope; new documents default to private.
  visibility: documentVisibilitySchema.optional(),
  sharedBranchId: z.uuid().nullable().optional(),
});
export type PrivateDocumentSummary = {
  workflow?: DocumentWorkflow;
  ownerId?: string;
  ownerName?: string;
  isOwner?: boolean;
  visibility?: DocumentVisibility;
  sharedBranchId?: string | null;
  id: string;
  kind: DocumentKind;
  title: string;
  problemCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export const documentKey = (document: PrivateDocumentSummary) =>
  `${document.ownerId ?? ""}:${document.id}`;
export type PrivateDocument = PrivateDocumentSummary & {
  payload: Record<string, unknown>;
};
