export type UserDocument = {
  id: string;
  kind: "draft" | "extraction";
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
