import type {
  ExamReportList,
  ExamReportOptions,
  ExamReportStudent,
} from "@/contracts/examReportWorkspace.contract";

export class ExamReportClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function request(
  testId: string,
  suffix = "",
  body?: object,
  method = "POST",
) {
  const response = await fetch(`/api/exam-reports/${testId}${suffix}`, {
    cache: "no-store",
    ...(body
      ? {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => null);
    throw new ExamReportClientError(
      response.status,
      value?.error?.message ??
        "성적표를 처리하지 못했습니다. 다시 시도해 주세요.",
    );
  }
  return response;
}
export interface ExamReportClient {
  list(testId: string): Promise<ExamReportList>;
  student(testId: string, studentId: string): Promise<ExamReportStudent>;
  note(
    testId: string,
    studentId: string,
    expectedRevision: number,
    teacherNote: string,
  ): Promise<ExamReportStudent>;
  confirm(
    testId: string,
    studentId: string,
    expectedRevision: number,
    teacherNote: string,
  ): Promise<ExamReportStudent>;
  settings(
    testId: string,
    expectedOptionsDigest: string,
    options: ExamReportOptions,
  ): Promise<ExamReportList>;
  print(
    testId: string,
    scope: "confirmed" | "all",
    kind: "students" | "class",
  ): Promise<Blob>;
  pdf(testId: string, studentId: string): Promise<Blob>;
}
const contract = () => import("@/contracts/examReportWorkspace.contract");
async function studentResponse(response: Response) {
  const { examReportStudentResponseSchema } = await contract();
  return examReportStudentResponseSchema.parse(await response.json()).data;
}
export const examReportClient: ExamReportClient = {
  async list(id) {
    const response = await request(id);
    const { examReportListResponseSchema } = await contract();
    return examReportListResponseSchema.parse(await response.json()).data;
  },
  async student(id, sid) {
    return studentResponse(await request(id, `/students/${sid}`));
  },
  async note(id, sid, expectedRevision, teacherNote) {
    return studentResponse(
      await request(
        id,
        `/students/${sid}`,
        { expectedRevision, teacherNote },
        "PUT",
      ),
    );
  },
  async confirm(id, sid, expectedRevision, teacherNote) {
    return studentResponse(
      await request(id, `/students/${sid}/confirm`, {
        expectedRevision,
        teacherNote,
      }),
    );
  },
  async settings(id, expectedOptionsDigest, options) {
    const response = await request(
      id,
      "/settings",
      { expectedOptionsDigest, options },
      "PATCH",
    );
    const { examReportListResponseSchema } = await contract();
    return examReportListResponseSchema.parse(await response.json()).data;
  },
  async print(id, scope, kind) {
    return (await request(id, "/print", { scope, kind })).blob();
  },
  async pdf(id, sid) {
    return (await request(id, `/students/${sid}/pdf`)).blob();
  },
};
export function downloadExamReport(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "exam-reports.pdf";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
