import type { z } from "zod";
import {
  quickCreateCatalogSchema,
  quickCreateInputSchema,
  quickCreateResultSchema,
  quickCreateScopeSchema,
  type QuickCreateCatalog,
  type QuickCreateInput,
  type QuickCreateResult,
  type QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";

export type {
  QuickCreateCatalog,
  QuickCreateInput,
  QuickCreateResult,
  QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";
export interface QuickCreateApi {
  listUnits(scope: QuickCreateScope): Promise<QuickCreateCatalog>;
  create(input: QuickCreateInput): Promise<QuickCreateResult>;
}
export class QuickCreateApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "QuickCreateApiError";
  }
}
async function readResponse<T extends z.ZodType>(
  response: Response,
  schema: T,
): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new QuickCreateApiError(
      "교재 응답을 읽지 못했습니다.",
      response.status,
    );
  }
  if (!response.ok) {
    const error = (
      body as { error?: { message?: string; code?: string } } | null
    )?.error;
    throw new QuickCreateApiError(
      error?.message ?? "교재를 만들지 못했습니다.",
      response.status,
      error?.code,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new QuickCreateApiError(
      "교재 응답 형식이 올바르지 않습니다.",
      response.status,
    );
  return parsed.data;
}
export const httpQuickCreateApi: QuickCreateApi = {
  async listUnits(scope) {
    const parsed = quickCreateScopeSchema.parse(scope);
    const query = new URLSearchParams({
      schoolLevel: parsed.schoolLevel,
      grade: String(parsed.grade),
      semester: String(parsed.semester),
    });
    return readResponse(
      await fetch(`/api/textbook/quick-create?${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
      quickCreateCatalogSchema,
    );
  },
  async create(input) {
    const body = quickCreateInputSchema.parse(input);
    return readResponse(
      await fetch("/api/textbook/quick-create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      quickCreateResultSchema,
    );
  },
};
