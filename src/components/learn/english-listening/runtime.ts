import { z } from "zod";
import type { ListeningStudentDetail } from "@/contracts/englishListeningStudentHttp.contract";
import type {
  ListeningStudentAttemptSnapshot,
  ListeningStudentMedia,
} from "./ListeningStudentView";

export class ListeningRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function requestListeningData<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(body);
    throw new ListeningRequestError(
      error.success
        ? error.data.error.message
        : "요청을 확인하지 못했습니다. 다시 시도해 주세요.",
      response.status,
    );
  }
  const parsed = z.object({ data: schema }).safeParse(body);
  if (!parsed.success)
    throw new ListeningRequestError(
      "학습 자료를 확인하지 못했습니다. 다시 불러와 주세요.",
      502,
    );
  return parsed.data.data;
}

export function studentAttemptSnapshot(
  detail: ListeningStudentDetail,
): ListeningStudentAttemptSnapshot {
  const attempt = detail.attempt;
  if (!attempt) throw new Error("학습 준비가 필요합니다.");
  return {
    id: attempt.id,
    revision: attempt.revision,
    status: attempt.status,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt,
    serverNow: detail.serverNow,
    answers: (detail.mode === "exam" && attempt.status !== "submitted"
      ? (attempt.draftAnswers ?? attempt.firstAnswers)
      : attempt.firstAnswers
    ).map(({ questionId, choiceId }) => ({
      questionId,
      choiceId,
    })),
    reviewAnswers: attempt.reviewAnswers.map(({ questionId, choiceId }) => ({
      questionId,
      choiceId,
    })),
  };
}

export function studentMedia(
  detail: ListeningStudentDetail,
): ListeningStudentMedia | undefined {
  if (detail.view.audioSource === "teacher_device" || !detail.media)
    return undefined;
  return {
    urlsByAssetId: detail.media.urlsByAssetId,
    soundCheckUrl: detail.media.soundCheckUrl,
    playbackPolicy: detail.media.playbackPolicy,
  };
}

/** An older poll must not overwrite a command receipt, including a freshly authorized retry. */
export function newerListeningDetail(
  current: ListeningStudentDetail | null,
  next: ListeningStudentDetail,
) {
  if (!current) return next;
  if (Date.parse(next.serverNow) < Date.parse(current.serverNow))
    return current;
  if (
    current.attempt &&
    next.attempt?.id === current.attempt.id &&
    next.attempt.revision < current.attempt.revision
  )
    return current;
  return next;
}
