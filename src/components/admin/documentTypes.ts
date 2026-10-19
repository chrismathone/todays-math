import type { DocumentKind } from "@/contracts/privateWorkspace.contract";

/** 관리자 화면의 자료 종류 이름. */
export const ADMIN_KIND_LABEL: Readonly<Record<DocumentKind, string>> = {
  draft: "시험지",
  extraction: "추출 자료",
  conceptBlank: "개념 백지",
  arithmeticSheet: "연산 연습지",
};

export type UserDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type DocumentDetail = UserDocument & { payload: unknown };
export type AuditEntry = {
  id: string;
  action: string;
  outcome: string;
  actorName: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
};
export type PageResult<T> = {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
};

export function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
