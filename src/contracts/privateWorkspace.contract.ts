import { z } from "zod";
import type { DocumentWorkflow } from "./workspaceWorkflow.contract";

export const documentIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
/**
 * 내 시험지 자료 종류 — 시험지 · 추출한 자료 · 개념 백지(원장님 2026-10-01 «개념 백지를 담아서 내 시험지에 저장», 26 §9 ⑾).
 * «자료»는 이 넷뿐이다 — 내 시험지 · 우리학원 시험지 목록 · 수 · 공유 · 사본 · 관리자 자료 보기가 전부 이 목록만 다룬다.
 */
export const LIBRARY_DOCUMENT_KINDS = [
  "draft",
  "extraction",
  "conceptBlank",
  "arithmeticSheet",
] as const;
export const libraryDocumentKindSchema = z.enum(LIBRARY_DOCUMENT_KINDS);
export type DocumentKind = z.infer<typeof libraryDocumentKindSchema>;
/**
 * 시험지 만들기의 «이름 붙인 출제 조건»(W5 · 원장님 2026-10-16) — 같은 표(`workspace_document`)에 담지만 **자료가 아니다.**
 * 늘 비공개 · 주인만 · 자료 목록 · 수 · 공유 · 사본에 나오지 않는다. 읽고 쓰는 곳은 `/api/studio/exam-conditions` 뿐이다.
 */
export const EXAM_CONDITION_KIND = "examCondition" as const;
/**
 * 시험지 만들기 3단계의 «내 양식»(W6 · 원장님 2026-10-16) — 출제 조건과 같이 같은 표에 담지만 **자료가 아니다.**
 * 늘 비공개 · 주인만 · 자료 목록 · 수 · 공유 · 사본에 나오지 않는다. 읽고 쓰는 곳은 `/api/studio/print-presets` 뿐이다.
 */
export const PRINT_PRESET_KIND = "printPreset" as const;
/**
 * 표에 저장되는 종류 전부 — 자료 넷 + 출제 조건 + 내 양식.
 * 🔴 종류를 더하면 DB CHECK `workspace_document_kind_check` 도 넓힌다 — `workspaceDocumentKindConstraint.test.ts` 가 막는다.
 */
export const documentKindSchema = z.enum([
  ...LIBRARY_DOCUMENT_KINDS,
  EXAM_CONDITION_KIND,
  PRINT_PRESET_KIND,
]);
export type WorkspaceDocumentKind = z.infer<typeof documentKindSchema>;
export const isLibraryDocumentKind = (kind: string): kind is DocumentKind =>
  (LIBRARY_DOCUMENT_KINDS as readonly string[]).includes(kind);
/**
 * 종류의 이름과 화면 차례 — 목록의 종류 칸 · 종류 고르기 · 정보 창 · 저장 창이 전부 여기서 읽는다(2026-10-16 외부 검토 §3).
 * 저장값은 위 자료 넷 그대로다(출제 조건은 자료가 아니라 여기 없다). 자료 종류를 더하면 여기에도 한 줄을 더한다 —
 * `workspaceDocumentKindConstraint.test.ts` 가 막는다.
 */
export const DOCUMENT_KINDS = [
  { id: "draft", label: "시험지" },
  { id: "arithmeticSheet", label: "연산 연습지" },
  { id: "extraction", label: "추출한 자료" },
  { id: "conceptBlank", label: "개념 백지" },
] as const satisfies readonly { id: DocumentKind; label: string }[];
export function documentKindLabel(kind: DocumentKind): string {
  return DOCUMENT_KINDS.find((entry) => entry.id === kind)?.label ?? kind;
}
export const documentVisibilitySchema = z.enum(["private", "branch"]);
export type DocumentVisibility = z.infer<typeof documentVisibilitySchema>;
export type DocumentSharing = {
  visibility: DocumentVisibility;
  sharedBranchId: string | null;
};
export const saveDocumentSchema = z.strictObject({
  kind: libraryDocumentKindSchema,
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
