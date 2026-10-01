import { z } from "zod";

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
]);
export type DocumentKind = z.infer<typeof documentKindSchema>;
export const saveDocumentSchema = z.strictObject({
  kind: documentKindSchema,
  title: z.string().trim().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
  expectedRevision: z.number().int().min(0).nullable(),
});
export type PrivateDocumentSummary = {
  id: string;
  kind: DocumentKind;
  title: string;
  problemCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type PrivateDocument = PrivateDocumentSummary & {
  payload: Record<string, unknown>;
};
