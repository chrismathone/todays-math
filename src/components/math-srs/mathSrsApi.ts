import type {
  MathSrsAttemptInput,
  MathSrsClassDashboard,
  MathSrsHintInput,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import {
  LEARN_OFFLINE_MESSAGE,
  type Submitted,
} from "@/components/learn/learnApi";

const contract = () => import("@/contracts/mathSrs.contract");

/** Keep the same validated response envelope and failure messages as the student APIs. */
async function request<T>(
  url: string,
  parse: (body: unknown) => Promise<T>,
  body?: unknown,
): Promise<Submitted<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      ...(body !== undefined
        ? {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
  } catch {
    return { ok: false, status: 0, message: LEARN_OFFLINE_MESSAGE };
  }
  try {
    const json = await response.json();
    if (!response.ok) {
      const message =
        response.status === 400 ? json.error?.details?.[0]?.message : undefined;
      return {
        ok: false,
        status: response.status,
        message:
          typeof message === "string"
            ? message
            : typeof json.error?.message === "string"
              ? json.error.message
              : "불러오지 못했습니다. 다시 시도하세요.",
      };
    }
    return { ok: true, data: await parse(json) };
  } catch {
    return {
      ok: false,
      status: response.status,
      message: "응답을 확인하지 못했습니다. 다시 불러오세요.",
    };
  }
}

const stateOf = async (json: unknown) =>
  (await contract()).mathSrsStateResponseSchema.parse(json).data;
export const fetchMathSrs = () =>
  request<MathSrsState>("/api/learn/math-srs", stateOf);
export const startMathSrs = () =>
  request<MathSrsState>("/api/learn/math-srs", stateOf, {});
export const revealMathSrsHint = (body: MathSrsHintInput) =>
  request<MathSrsState>("/api/learn/math-srs/hint", stateOf, body);
export const submitMathSrsAttempt = (body: MathSrsAttemptInput) =>
  request<MathSrsState>("/api/learn/math-srs/attempts", stateOf, body);
export const fetchClassMathSrs = (classId: string) =>
  request<MathSrsClassDashboard>(
    `/api/classes/${encodeURIComponent(classId)}/math-srs`,
    async (json) =>
      (await contract()).mathSrsClassResponseSchema.parse(json).data,
  );
