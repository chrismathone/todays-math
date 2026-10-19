import {
  examPublicationCreatedResponseSchema,
  examPublicationListResponseSchema,
  type ExamPublicationInput,
  type ExamPublicationList,
} from "@/contracts/examPublication.contract";

/**
 * 월말평가 M1 — «내 시험지»의 «반에 내기» · 낸 기록 · 지우기(`/api/exam-publications`). 실패는 서버의 문장을 그대로 올린다
 * (은행에 없는 문항 번호 · 그사이 바뀐 시험지 · 채점이 시작된 시험 등 — 서버가 까닭을 문장으로 낸다).
 */
export class ExamPublicationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ExamPublicationError";
  }
}

async function failure(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  throw new ExamPublicationError(
    body?.error?.message ?? "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
    response.status,
  );
}

export async function loadExamPublications(
  fetcher: typeof fetch = fetch,
): Promise<ExamPublicationList> {
  const response = await fetcher("/api/exam-publications", {
    cache: "no-store",
  });
  if (!response.ok) return failure(response);
  return examPublicationListResponseSchema.parse(await response.json()).data;
}

export async function publishExam(
  input: ExamPublicationInput,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher("/api/exam-publications", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) return failure(response);
  return examPublicationCreatedResponseSchema.parse(await response.json()).data;
}
