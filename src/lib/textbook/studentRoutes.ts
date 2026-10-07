import "server-only";
import { z } from "zod";
import { dataResponseSchema } from "@/contracts/common.contract";
import { textbookAttemptSubmitSchema } from "@/contracts/textbookConcept.contract";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import {
  textbookStudentQrSchema,
  textbookStudentConceptSchema,
  textbookStudentAttemptSchema,
  textbookReviewStartSchema,
} from "@/contracts/textbookStudent.contract";
import { textbookAssetSchema } from "@/contracts/textbookExchange.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonOk,
  jsonError,
  validationError,
  unauthorizedError,
} from "@/lib/apiResponse";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { loadCourseStudent } from "@/lib/math-srs/courseServer";
import {
  ExplorerActionConflict,
  ExplorerActionInvalid,
} from "@/lib/math-explorers/errors";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";
import { SrsConflict, SrsUnavailable } from "@/lib/math-srs/serverState";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";
import { TextbookError, notFound } from "./server/errors";
import { textbookDb } from "./server/prismaSql";
import {
  readStudentQr,
  requireStudentConcept,
  studentConceptDto,
  readFrozenConcept,
  requireStudentQr,
  readQrSnapshot,
} from "./studentRead";
import {
  listStudentConceptAttempts,
  submitStudentConceptAttempt,
} from "./studentAttempts";
import { startTextbookReview } from "./studentReview";
import { qrTargetReferencesAsset } from "./studentAccess";
import { readStrictJson, StrictJsonError } from "./strictJson";
import { assertAssetMime, assertSafeSvg } from "./assets";
import { sha256 } from "./hash.server";

export const studentConceptParams = z.strictObject({
  editionId: z.uuid(),
  conceptKey: textbookKeySchema,
});
const slugSchema = z.string().regex(/^[A-Za-z0-9_-]{16,100}$/);
const reviewRequest = z.strictObject({ requestId: z.uuid() });

/** Only the authenticated student identity is accepted; class and account state are freshly loaded. */
export async function studentTextbookRoute(
  request: Request,
  run: (studentId: string) => Promise<Response>,
) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !sameOriginMutation(request)
  )
    return noStore(crossSiteError());
  const gate = await requireStudent({ active: true, menu: "textbook" });
  if (gate.response) return noStore(gate.response);
  const expectedStudent = request.headers.get("x-student-id");
  if (expectedStudent !== null && expectedStudent !== gate.student.studentId)
    return noStore(jsonError("CONFLICT", STUDENT_CHANGED_MESSAGE, 409));
  const student = await loadCourseStudent(gate.student.studentId);
  if (
    !student?.studentAccount ||
    student.studentAccount.disabledAt ||
    student.studentAccount.id !== gate.student.accountId
  )
    return noStore(unauthorizedError());
  try {
    await textbookDb.refreshStudentScope?.(student.id);
  } catch {
    return noStore(
      jsonError("FORBIDDEN", "현재 수강 정보를 확인할 수 없습니다.", 403),
    );
  }
  try {
    return noStore(await run(student.id));
  } catch (error) {
    if (error instanceof TextbookError)
      return noStore(
        jsonError(error.code, error.message, error.status, error.details),
      );
    if (error instanceof z.ZodError) return noStore(validationError(error));
    if (error instanceof StrictJsonError)
      return noStore(
        jsonError("VALIDATION_ERROR", "요청 내용을 확인해 주세요.", 400),
      );
    if (error instanceof ExplorerActionConflict)
      return noStore(jsonError("CONFLICT", error.message, 409));
    if (error instanceof ExplorerActionInvalid)
      return noStore(jsonError("VALIDATION_ERROR", error.message, 400));
    if (error instanceof SrsConflict || error instanceof SrsUnavailable)
      return noStore(srsFailureResponse(error));
    throw error;
  }
}

export function handleStudentQr(request: Request, slug: string) {
  return studentTextbookRoute(request, async (studentId) =>
    jsonOk(dataResponseSchema(textbookStudentQrSchema), {
      data: await readStudentQr(
        textbookDb,
        studentId,
        slugSchema.parse(slug),
        new Date(),
      ),
    }),
  );
}

export function handleStudentConcept(
  request: Request,
  params: unknown,
  action: "read" | "attempts" | "submit" | "review",
) {
  return studentTextbookRoute(request, async (studentId) => {
    const { editionId, conceptKey } = studentConceptParams.parse(params);
    if (action === "attempts")
      return jsonOk(
        dataResponseSchema(z.array(textbookStudentAttemptSchema).max(100)),
        {
          data: await listStudentConceptAttempts(
            textbookDb,
            studentId,
            editionId,
            conceptKey,
          ),
        },
      );
    if (action === "submit") {
      const body = textbookAttemptSubmitSchema.parse(
        await readStrictJson(request, {
          maxBytes: 96 * 1024,
          maxDepth: 4,
          maxTokens: 50,
          maxStringLength: 20_000,
        }),
      );
      return jsonOk(
        dataResponseSchema(
          z.strictObject({
            attempt: textbookStudentAttemptSchema,
            replayed: z.boolean(),
          }),
        ),
        {
          data: await submitStudentConceptAttempt(
            textbookDb,
            studentId,
            editionId,
            conceptKey,
            body,
          ),
        },
      );
    }
    const target = await requireStudentConcept(
      textbookDb,
      studentId,
      editionId,
      conceptKey,
    );
    if (action === "read")
      return jsonOk(dataResponseSchema(textbookStudentConceptSchema), {
        data: await studentConceptDto(
          textbookDb,
          studentId,
          target,
          new Date(),
        ),
      });
    const body = reviewRequest.parse(
      await readStrictJson(request, {
        maxBytes: 1024,
        maxDepth: 2,
        maxTokens: 10,
        maxStringLength: 100,
      }),
    );
    return jsonOk(dataResponseSchema(textbookReviewStartSchema), {
      data: await startTextbookReview({
        studentId,
        concept: await readFrozenConcept(textbookDb, target),
        requestId: body.requestId,
        now: new Date(),
      }),
    });
  });
}

/** Asset bytes have no independent public URL. Permission is re-evaluated even on HEAD and reload. */
export function handleStudentAsset(
  request: Request,
  slug: string,
  assetId: string,
) {
  return studentTextbookRoute(request, async (studentId) => {
    slugSchema.parse(slug);
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(assetId);
    const target = await requireStudentQr(textbookDb, studentId, slug);
    if (target.kind === "item") await readQrSnapshot(textbookDb, target);
    else await readFrozenConcept(textbookDb, target);
    if (!(await qrTargetReferencesAsset(textbookDb, target, assetId)))
      throw notFound("교재 그림");
    const [asset] = await textbookDb.query<{
      mimeType: string;
      bytes: Uint8Array;
      size: number;
    }>(
      `SELECT a."mime_type" AS "mimeType", b."bytes", b."size" FROM "textbook_asset" a JOIN "textbook_blob" b ON b."sha256" = a."id"
        WHERE a."user_id" = $1::uuid AND a."id" = $2::text AND b."size" <= 8388608`,
      [target.ownerId, assetId],
    );
    if (!asset) throw notFound("교재 그림");
    const mimeType = textbookAssetSchema.shape.mimeType.parse(asset.mimeType);
    if (
      !mimeType.startsWith("image/") ||
      asset.bytes.byteLength !== asset.size ||
      sha256(asset.bytes) !== assetId
    )
      throw new Error("교재 그림이 검증한 내용과 다릅니다.");
    assertAssetMime(asset.bytes, mimeType);
    if (mimeType === "image/svg+xml")
      assertSafeSvg(
        new TextDecoder("utf-8", { fatal: true }).decode(asset.bytes),
      );
    return new Response(
      request.method === "HEAD" ? null : new Uint8Array(asset.bytes),
      {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(asset.size),
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          "Cross-Origin-Resource-Policy": "same-origin",
        },
      },
    );
  });
}
