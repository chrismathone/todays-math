import { z } from "zod";
import {
  studentLoginHref,
  studentPasswordHref,
} from "@/lib/learn/studentReturnTo";
import {
  STUDENT_CHANGED_MESSAGE,
  STUDENT_MUST_CHANGE_MESSAGE,
} from "@/lib/studentRouteAccess";

export class TextbookStudentRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function studentTextbookRequest<T>(
  url: string,
  schema: z.ZodType<T>,
  options: { body?: unknown; signal?: AbortSignal; studentId?: string } = {},
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: options.signal,
    headers: {
      ...(options.studentId ? { "x-student-id": options.studentId } : {}),
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
    },
    ...(options.body === undefined
      ? {}
      : {
          method: "POST",
          body: JSON.stringify(options.body),
        }),
  });
  const json: unknown = await response.json();
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(json);
    throw new TextbookStudentRequestError(
      response.status,
      error.success
        ? error.data.error.message
        : "불러오지 못했습니다. 다시 시도해 주세요.",
    );
  }
  return z.object({ data: schema }).parse(json).data;
}

export const studentTextbookError = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "연결을 확인하고 다시 시도해 주세요.";
export function redirectStudentSession(error: unknown) {
  if (
    error instanceof TextbookStudentRequestError &&
    error.status === 409 &&
    error.message === STUDENT_CHANGED_MESSAGE
  )
    window.location.reload();
  if (error instanceof TextbookStudentRequestError && error.status === 401)
    window.location.assign(studentLoginHref(window.location.pathname));
  if (
    error instanceof TextbookStudentRequestError &&
    error.status === 403 &&
    error.message === STUDENT_MUST_CHANGE_MESSAGE
  )
    window.location.assign(studentPasswordHref(window.location.pathname));
}
