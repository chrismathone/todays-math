import "server-only";
import {
  examReportConfirmInputSchema,
  examReportListResponseSchema,
  examReportNoteInputSchema,
  examReportPrintInputSchema,
  examReportRouteParamsSchema,
  examReportSettingsInputSchema,
  examReportStudentParamsSchema,
  examReportStudentResponseSchema,
} from "@/contracts/examReportWorkspace.contract";
import { getAccountAccess } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { noteErrorLog } from "@/lib/errorLog/scope";
import { ExamReportError } from "./read";
import {
  confirmExamReport,
  printExamReports,
  readConfirmedExamReportPdf,
  readExamReportList,
  readExamReportStudent,
  saveExamReportNote,
  saveExamReportSettings,
} from "./server";

type Action =
  "list" | "student" | "note" | "settings" | "confirm" | "pdf" | "print";
/** 각 라우트는 withErrorLog로 이 처리기를 감싼다. 페이지와 같은 원장·출력 메뉴 관문. */
export async function examReportHttp(
  request: Request,
  params: { testId: string; studentId?: string },
  action: Action,
): Promise<Response> {
  const session = await getAccountAccess();
  if (!session) return unauthorizedError();
  if (
    session.approvalStatus !== "approved" ||
    session.role !== "director" ||
    !session.menus.includes("export")
  )
    return jsonError("FORBIDDEN", "성적표를 열 권한이 없습니다.", 403);
  const studentAction = ["student", "note", "confirm", "pdf"].includes(action);
  const ids = (
    studentAction ? examReportStudentParamsSchema : examReportRouteParamsSchema
  ).safeParse(studentAction ? params : { testId: params.testId });
  if (!ids.success) return validationError(ids.error);
  const { testId, studentId } = params;
  const finish = (response: Response) => {
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  try {
    if (action === "list")
      return finish(
        jsonOk(examReportListResponseSchema, {
          data: await readExamReportList(session, testId),
        }),
      );
    if (action === "student")
      return finish(
        jsonOk(examReportStudentResponseSchema, {
          data: await readExamReportStudent(session, testId, studentId!),
        }),
      );
    if (action === "pdf")
      return pdfResponse(
        await readConfirmedExamReportPdf(session, testId, studentId!),
      );
    const body = await request.json().catch(() => undefined);
    if (action === "settings") {
      const parsed = examReportSettingsInputSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      return finish(
        jsonOk(examReportListResponseSchema, {
          data: await saveExamReportSettings(session, testId, parsed.data),
        }),
      );
    }
    if (action === "print") {
      const parsed = examReportPrintInputSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      return pdfResponse(
        await printExamReports(
          session,
          testId,
          parsed.data,
          new URL(request.url).origin,
        ),
      );
    }
    const parsed = (
      action === "note"
        ? examReportNoteInputSchema
        : examReportConfirmInputSchema
    ).safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const data =
      action === "confirm"
        ? await confirmExamReport(
            session,
            testId,
            studentId!,
            parsed.data,
            new URL(request.url).origin,
          )
        : await saveExamReportNote(
            session,
            testId,
            studentId!,
            examReportNoteInputSchema.parse(parsed.data),
          );
    return finish(jsonOk(examReportStudentResponseSchema, { data }));
  } catch (error) {
    if (error instanceof ExamReportError)
      return finish(
        jsonError(
          error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : error.status === 409
                ? "CONFLICT"
                : "VALIDATION_ERROR",
          error.message,
          error.status,
        ),
      );
    if (error instanceof Error && error.name === "ClassAccessDenied")
      return finish(jsonError("FORBIDDEN", error.message, 403));
    noteErrorLog({
      detail: error instanceof Error ? error.message : String(error),
    });
    return finish(
      jsonError(
        "INTERNAL_ERROR",
        "성적표를 처리하지 못했습니다. 입력은 보관한 채 다시 시도해 주세요.",
        500,
      ),
    );
  }
}
export function pdfResponse(bytes: Uint8Array) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": 'inline; filename="exam-reports.pdf"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
