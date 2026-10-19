import {
  EXAM_CONDITION_ERROR,
  examConditionListResponseSchema,
  examConditionSchema,
  type ExamCondition,
  type ExamConditionInput,
} from "@/contracts/examCondition.contract";

/** 시험지 만들기 «이름 붙인 출제 조건»(W5)의 브라우저 쪽 — `/api/studio/exam-conditions` 만 부른다. */
export interface ExamConditionsClient {
  list: (signal?: AbortSignal) => Promise<ExamCondition[]>;
  save: (
    condition: ExamConditionInput,
    replace?: { id: string; expectedRevision: number },
  ) => Promise<ExamCondition>;
  rename: (
    id: string,
    name: string,
    expectedRevision: number,
  ) => Promise<ExamCondition>;
  /** 적용 — 마지막 사용을 지금으로. */
  touch: (id: string) => Promise<ExamCondition>;
  remove: (id: string, revision: number) => Promise<void>;
}

export class ExamConditionError extends Error {
  readonly code: string | undefined;
  /** 같은 이름 — 이미 있는 조건(바꿔 저장할 때 쓴다). */
  readonly existing: { id: string; revision: number } | undefined;
  constructor(
    message: string,
    code?: string,
    existing?: { id: string; revision: number },
  ) {
    super(message);
    this.name = "ExamConditionError";
    this.code = code;
    this.existing = existing;
  }
  get nameTaken() {
    return this.code === EXAM_CONDITION_ERROR.NAME_TAKEN;
  }
}

const BASE = "/api/studio/exam-conditions";

export function createExamConditionsClient(
  fetcher: typeof fetch = (...args) => fetch(...args),
): ExamConditionsClient {
  async function call(
    path: string,
    init: RequestInit & { signal?: AbortSignal } = {},
  ): Promise<unknown> {
    const response = await fetcher(`${BASE}${path}`, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: init.body ? { "content-type": "application/json" } : undefined,
    });
    const body = (await response.json().catch(() => null)) as {
      data?: unknown;
      error?: {
        message?: string;
        code?: string;
        existing?: { id: string; revision: number };
      };
    } | null;
    if (!response.ok)
      throw new ExamConditionError(
        body?.error?.message ?? "저장한 조건을 처리하지 못했습니다.",
        body?.error?.code,
        body?.error?.existing,
      );
    return body;
  }
  const one = (body: unknown) =>
    examConditionSchema.parse((body as { data: unknown }).data);
  return {
    async list(signal) {
      return examConditionListResponseSchema.parse(await call("", { signal }))
        .data;
    },
    async save(condition, replace) {
      return one(
        await call("", {
          method: "POST",
          body: JSON.stringify({ condition, ...(replace ? { replace } : {}) }),
        }),
      );
    },
    async rename(id, name, expectedRevision) {
      return one(
        await call(`/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "rename", name, expectedRevision }),
        }),
      );
    },
    async touch(id) {
      return one(
        await call(`/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "touch" }),
        }),
      );
    },
    async remove(id, revision) {
      await call(`/${encodeURIComponent(id)}?revision=${revision}`, {
        method: "DELETE",
      });
    },
  };
}
