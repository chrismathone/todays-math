import "server-only";
import {
  MATH_INSIGHT_VERSION_HEADER,
  MATH_INSIGHT_V2,
} from "@/contracts/mathInsightV2.contract";
import { handleInsightV2Request } from "./v2Routes";
import { z } from "zod";
import { idParamSchema } from "@/contracts/common.contract";
import {
  mathInsightInquiryInputSchema,
  mathInsightSnapshotResponseSchema,
  mathInsightInquiryResponseSchema,
} from "@/contracts/mathInsight.contract";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import {
  teacherScopeSchema,
  requireTeacherBranch,
} from "@/lib/math-srs/teacherScope";
import {
  requireOwnedStudent,
  requireOwnedStudentInClass,
} from "@/lib/ownership";
import { loadCourseStudent } from "@/lib/math-srs/courseServer";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { emptyCourseState } from "@/lib/math-srs/courseAutomation";
import { ClassAccessDenied } from "@/lib/classAccess";
import { noStore } from "@/lib/learn/accountRoutes";
import { jsonError, jsonOk, notFoundError } from "@/lib/apiResponse";
import { runModelApi } from "@/lib/studio-ai/api";
import { expeditionCourseCheckCandidates } from "@/lib/math-explorers/expedition";
import { buildInsightSnapshot } from "./snapshot";
import {
  buildInsightPrompt,
  composeInsightResult,
  maskInsightQuery,
  parseInsightSelection,
} from "./inference";
import { insightModelConfig } from "./config";
import { admitInsight } from "./admission";

const badRequest = () =>
  noStore(jsonError("VALIDATION_ERROR", "요청 값이 올바르지 않습니다.", 400));
const fail = (status: number, message: string) =>
  noStore(jsonError("INTERNAL_ERROR", message, status));
const scopeSchema = z.strictObject(teacherScopeSchema.shape);

async function boundedBody(request: Request): Promise<unknown> {
  const max = 4096;
  if (Number(request.headers.get("content-length")) > max)
    throw new Error("body-too-large");
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > max) throw new Error("body-too-large");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function handleInsightRequest(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const version = request.headers.get(MATH_INSIGHT_VERSION_HEADER);
  if (version !== null)
    return version === MATH_INSIGHT_V2
      ? handleInsightV2Request(request, context)
      : badRequest();
  const access = await teacherGate(request);
  if (access.response) return noStore(access.response);
  const parsed = idParamSchema.safeParse(await context.params);
  if (!parsed.success) return badRequest();
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some((key, i, keys) => keys.indexOf(key) !== i))
    return badRequest();
  const scope = scopeSchema.safeParse(Object.fromEntries(query));
  if (!scope.success) return badRequest();
  if (!["GET", "POST"].includes(request.method))
    return fail(405, "지원하지 않는 요청입니다.");
  let inquiry: z.infer<typeof mathInsightInquiryInputSchema> | null = null;
  if (request.method === "POST") {
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return badRequest();
    try {
      const input = mathInsightInquiryInputSchema.safeParse(
        await boundedBody(request),
      );
      if (!input.success) return badRequest();
      inquiry = input.data;
    } catch (error) {
      return error instanceof Error && error.message === "body-too-large"
        ? fail(413, "요청 본문이 너무 큽니다.")
        : badRequest();
    }
  }
  try {
    const owned = scope.data.classId
      ? await requireOwnedStudentInClass(
          parsed.data.id,
          scope.data.classId,
          access.account,
          "student:read",
        )
      : await requireOwnedStudent(
          parsed.data.id,
          access.account,
          "student:read",
        );
    if (!owned.ok) return noStore(owned.response);
    const branchDenied = await requireTeacherBranch(
      owned.data.classId,
      scope.data.branchId,
      undefined,
      parsed.data.id,
    );
    if (branchDenied) return noStore(branchDenied);
    const student = await loadCourseStudent(parsed.data.id, owned.data.classId);
    if (!student) return noStore(notFoundError("학생"));
    let maskedQuery = "";
    if (inquiry) {
      try {
        maskedQuery = maskInsightQuery(inquiry.query, [
          student.id,
          student.name,
          student.classId,
          student.class.name,
          student.branchId ?? "",
          access.account.id,
          access.account.name,
          access.account.email,
          access.account.branchId ?? "",
        ]);
      } catch {
        return badRequest();
      }
    }
    const config = inquiry ? insightModelConfig() : null;
    if (inquiry && !config)
      return fail(
        503,
        "AI 연결이 준비되지 않았습니다. 근거 조회는 계속 사용할 수 있습니다.",
      );
    // Every authorization check completes before reading the learning record or invoking a model.
    const saved = await readSrsState(student.id);
    const now = new Date();
    const snapshot = buildInsightSnapshot(
      saved.state.course ?? emptyCourseState(),
      saved.revision,
      now,
      {
        studentId: student.id,
        classId: student.classId,
        branchId: student.branchId,
      },
      expeditionCourseCheckCandidates(saved.state, now),
    );
    if (!inquiry)
      return noStore(
        jsonOk(mathInsightSnapshotResponseSchema, { data: snapshot }),
      );
    const release = admitInsight(access.account.id);
    if (!release)
      return fail(429, "AI 조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.");
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(20_000),
    ]);
    try {
      signal.throwIfAborted();
      const raw = await runModelApi({
        ...config!,
        prompt: buildInsightPrompt(snapshot, maskedQuery),
        signal,
        maxOutputTokens: 700,
        singleAttempt: true,
        suppressUpstreamDetails: true,
      });
      signal.throwIfAborted();
      const selection = parseInsightSelection(raw, snapshot);
      return noStore(
        jsonOk(mathInsightInquiryResponseSchema, {
          data: composeInsightResult(snapshot, selection, {
            provider: config!.vendor,
            model: config!.model,
            role: "selection-only",
          }),
        }),
      );
    } catch {
      return signal.aborted
        ? fail(
            request.signal.aborted ? 499 : 504,
            "AI 조회가 중단되었습니다. 근거 조회를 이용해 주세요.",
          )
        : fail(
            502,
            "AI 선택을 확인하지 못했습니다. 근거 조회를 이용해 주세요.",
          );
    } finally {
      release();
    }
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", "조회 권한이 없습니다.", 403));
    // No raw records, query text, provider response or exception messages enter logs/responses.
    return fail(
      503,
      "학습 기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
}
