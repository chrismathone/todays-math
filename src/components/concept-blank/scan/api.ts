import { z } from "zod";
import {
  scanIssueViewSchema,
  scanSubmissionViewSchema,
  type ScanStartInput,
  type ScanPhotoInput,
  type ScanCorrectionInput,
  type ScanJobInput,
  type ScanOverrideInput,
} from "@/contracts/conceptBlankScanApi.contract";

const ROOT = "/api/concept-blank/scan";
export class ScanRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok)
    throw new ScanRequestError(
      typeof value?.error?.message === "string"
        ? value.error.message
        : "요청을 마치지 못했습니다. 저장된 답안을 다시 확인해 주세요.",
      response.status,
    );
  const parsed = schema.safeParse(value?.data);
  if (!parsed.success)
    throw new ScanRequestError(
      "답안 응답을 확인해야 합니다. 새로고침해 주세요.",
      502,
    );
  return parsed.data;
}
const id = z.object({ id: z.uuid() });
const revision = z.object({ revision: z.number().int() });
export const scanSource = {
  issue: (issueId: string, query = "", signal?: AbortSignal) =>
    request(
      `/issued/${issueId}?q=${encodeURIComponent(query)}`,
      scanIssueViewSchema,
      "GET",
      undefined,
      signal,
    ),
  start: (input: ScanStartInput) => request("/submissions", id, "POST", input),
  get: (submissionId: string, signal?: AbortSignal) =>
    request(
      `/submissions/${submissionId}`,
      scanSubmissionViewSchema,
      "GET",
      undefined,
      signal,
    ),
  photo: (submissionId: string, input: ScanPhotoInput) =>
    request(
      `/submissions/${submissionId}/photos`,
      z.object({ photoId: z.uuid(), page: z.number().int().positive() }),
      "POST",
      input,
    ),
  answer: (submissionId: string, input: ScanCorrectionInput) =>
    request(`/submissions/${submissionId}/answers`, revision, "POST", input),
  job: (submissionId: string, input: ScanJobInput) =>
    request(
      `/submissions/${submissionId}/jobs`,
      z.object({ id: z.uuid(), kind: z.enum(["read", "grade"]) }),
      "POST",
      input,
    ),
  override: (submissionId: string, input: ScanOverrideInput) =>
    request(`/submissions/${submissionId}/override`, revision, "POST", input),
  photoUrl: async (submissionId: string, photoId: string) =>
    (
      await request(
        `/submissions/${submissionId}/photos/${photoId}`,
        z.object({ url: z.string().url() }),
      )
    ).url,
  remove: (submissionId: string, photoId: string, currentRevision: number) =>
    request(
      `/submissions/${submissionId}/photos/${photoId}`,
      z.object({ deleted: z.boolean() }),
      "DELETE",
      { revision: currentRevision },
    ),
};
export type ScanSource = typeof scanSource;
