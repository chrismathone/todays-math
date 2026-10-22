import "server-only";
import { z } from "zod";
import { idParamSchema } from "@/contracts/common.contract";
import {
  mathInsightV2InquiryInputSchema,
  mathInsightV2SnapshotResponseSchema,
  mathInsightV2InquiryResponseSchema,
} from "@/contracts/mathInsightV2.contract";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import { teacherScopeSchema } from "@/lib/math-srs/teacherScope";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { emptyCourseState } from "@/lib/math-srs/courseAutomation";
import { ClassAccessDenied } from "@/lib/classAccess";
import { noStore } from "@/lib/learn/accountRoutes";
import { jsonError, jsonOk } from "@/lib/apiResponse";
import { runModelApi } from "@/lib/studio-ai/api";
import { expeditionCourseCheckCandidates } from "@/lib/math-explorers/expedition";
import { buildInsightV2Snapshot } from "./v2Snapshot";
import {
  buildInsightV2Prompt,
  composeInsightV2Result,
  parseInsightV2Selection,
} from "./v2Inference";
import { insightModelConfig } from "./config";
import { admitInsight } from "./admission";
import { maskInsightQuery } from "./inference";
import { freshInsightV2Access, freshInsightV2Student } from "./v2Access";
import { insightDigest } from "./snapshot";

const forbidden = () =>
  noStore(jsonError("FORBIDDEN", "조회 권한이 없습니다.", 403));
const stale = () =>
  noStore(
    jsonError(
      "CONFLICT",
      "학습 기록이나 조회 맥락이 바뀌었습니다. 새로 조회해 주세요.",
      409,
    ),
  );

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

export async function handleInsightV2Request(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
  let inquiry: z.infer<typeof mathInsightV2InquiryInputSchema> | null = null;
  if (request.method === "POST") {
    if (
      !/^application\/json(?:\s*;|\s*$)/i.test(
        request.headers.get("content-type") ?? "",
      )
    )
      return badRequest();
    try {
      const input = mathInsightV2InquiryInputSchema.safeParse(
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
    const initialAccess = await freshInsightV2Access(request, access.account);
    if (!initialAccess) return forbidden();
    const initialStudent = await freshInsightV2Student(
      parsed.data.id,
      scope.data,
      initialAccess,
    );
    if (initialStudent.response) return noStore(initialStudent.response);
    const student = initialStudent.student!;
    const initialContext = initialStudent.context;
    let maskedQuery = "";
    if (inquiry) {
      try {
        maskedQuery = maskInsightQuery(inquiry.query, [
          student.id,
          student.name,
          student.classId,
          student.class.name,
          student.branchId ?? "",
          initialAccess.account.name,
          initialAccess.account.email,
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
    const snapshot = buildInsightV2Snapshot(
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
        jsonOk(mathInsightV2SnapshotResponseSchema, { data: snapshot }),
      );
    const release = admitInsight(initialAccess.account.id);
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
        prompt: buildInsightV2Prompt(snapshot, maskedQuery),
        signal,
        maxOutputTokens: 700,
        singleAttempt: true,
        suppressUpstreamDetails: true,
      });
      signal.throwIfAborted();
      const selection = parseInsightV2Selection(raw, snapshot);
      // Final authoritative local read: do not call cached teacherGate again, and
      // do not rebuild/hash asOf-dependent snapshots for the stale comparison.
      const finalAccess = await freshInsightV2Access(request, access.account);
      if (
        !finalAccess ||
        finalAccess.sessionVersion !== initialAccess.sessionVersion
      )
        return forbidden();
      const finalStudent = await freshInsightV2Student(
        parsed.data.id,
        scope.data,
        finalAccess,
      );
      if (finalStudent.response) return noStore(finalStudent.response);
      const finalContext = finalStudent.context;
      const latest = await readSrsState(student.id);
      signal.throwIfAborted();
      if (
        initialAccess.stamp !== finalAccess.stamp ||
        insightDigest(initialContext) !== insightDigest(finalContext) ||
        latest.revision !== saved.revision ||
        insightDigest(latest.state.course ?? emptyCourseState()) !==
          insightDigest(saved.state.course ?? emptyCourseState())
      )
        return stale();
      return noStore(
        jsonOk(mathInsightV2InquiryResponseSchema, {
          data: composeInsightV2Result(snapshot, selection, {
            provider: config!.vendor,
            model: config!.model,
            role: "selection-only",
          }),
        }),
      );
    } catch (error) {
      if (error instanceof ClassAccessDenied) return forbidden();
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
