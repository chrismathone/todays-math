import type { Submitted } from "@/components/learn/learnApi";
import { LEARN_OFFLINE_MESSAGE } from "@/components/learn/learnApi";
import type {
  CourseAttemptInput,
  CourseFollowUpInput,
  CourseHintInput,
  CoursePlanInput,
} from "@/contracts/mathSrsCourse.contract";

const contract = () => import("@/contracts/mathSrsCourse.contract");
async function request<T>(
  url: string,
  parse: (value: unknown) => Promise<T>,
  body?: unknown,
  headers?: Record<string, string>,
  signal?: AbortSignal,
  timeoutMs = 15_000,
): Promise<Submitted<T> & { code?: string }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      ...(headers ? { headers } : {}),
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify(body),
          }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok)
      return {
        ok: false,
        status: response.status,
        ...(typeof json?.error?.code === "string"
          ? { code: json.error.code }
          : {}),
        message:
          json?.error?.details?.[0]?.message ??
          json?.error?.message ??
          "학습 기록을 불러오지 못했습니다.",
      };
    try {
      return { ok: true, data: await parse(json) };
    } catch {
      return {
        ok: false,
        status: response.status,
        message: "학습 기록의 형식을 확인하지 못했습니다. 다시 불러와 주세요.",
      };
    }
  } catch {
    return {
      ok: false,
      status: 0,
      message: controller.signal.aborted
        ? "응답이 늦어지고 있습니다. 연결을 확인한 뒤 다시 시도해 주세요."
        : LEARN_OFFLINE_MESSAGE,
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
/** The same timeout and messages for the other student records (guide). */
export { request as learnJsonRequest };
const state = async (value: unknown) =>
  (await contract()).courseStudentResponseSchema.parse(value).data;
const base = "/api/learn/math-srs/course";
const studentRequest = async (url: string, body?: unknown) => {
  const { COURSE_FOLLOW_UP_HEADER, COURSE_RELEARN_HEADER } = await contract();
  return request(url, state, body, {
    [COURSE_FOLLOW_UP_HEADER]: "1",
    [COURSE_RELEARN_HEADER]: "1",
  });
};
export const getCourseState = () => studentRequest(base);
export const startCourse = () => studentRequest(base, {});
export const answerCourse = (input: CourseAttemptInput) =>
  studentRequest(`${base}/attempts`, input);
export const hintCourse = (input: CourseHintInput) =>
  studentRequest(`${base}/hint`, input);
export const followUpCourse = (input: CourseFollowUpInput) =>
  studentRequest(`${base}/follow-up`, input);
export const getCourseDashboard = (branchId?: string) =>
  request(
    `/api/math-srs/course${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`,
    async (value) =>
      (await contract()).courseDashboardResponseSchema.parse(value).data,
  );
const teacherQuery = (classId?: string, branchId?: string) => {
  const params = new URLSearchParams();
  if (classId) params.set("classId", classId);
  if (branchId) params.set("branchId", branchId);
  return params.size ? `?${params}` : "";
};
const insightContract = () => import("@/contracts/mathInsight.contract");
export const getLearningInsight = (
  studentId: string,
  classId: string,
  branchId?: string,
  signal?: AbortSignal,
) =>
  request(
    `/api/students/${encodeURIComponent(studentId)}/math-srs/insight${teacherQuery(classId, branchId)}`,
    async (value) =>
      (await insightContract()).mathInsightSnapshotResponseSchema.parse(value)
        .data,
    undefined,
    undefined,
    signal,
  );
export const inquireLearningInsight = async (
  studentId: string,
  classId: string,
  input: import("@/contracts/mathInsight.contract").MathInsightInquiryInput,
  branchId?: string,
  signal?: AbortSignal,
) => {
  const parsed = (
    await insightContract()
  ).mathInsightInquiryInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      status: 400,
      message: "질문을 1~500자로 입력해 주세요.",
    };
  return request(
    `/api/students/${encodeURIComponent(studentId)}/math-srs/insight${teacherQuery(classId, branchId)}`,
    async (value) =>
      (await insightContract()).mathInsightInquiryResponseSchema.parse(value)
        .data,
    parsed.data,
    undefined,
    signal,
    25_000,
  );
};
export const getCourseStudentDetail = (
  studentId: string,
  classId?: string,
  branchId?: string,
) =>
  request(
    `/api/students/${encodeURIComponent(studentId)}/math-srs/course${teacherQuery(classId, branchId)}`,
    async (value) =>
      (await contract()).courseStudentDetailResponseSchema.parse(value).data,
  );
export const getExplorerTeacherDetail = (
  studentId: string,
  classId?: string,
  branchId?: string,
) =>
  request(
    `/api/students/${encodeURIComponent(studentId)}/math-srs/explorers${teacherQuery(classId, branchId)}`,
    async (value) =>
      (
        await import("@/contracts/mathExplorersTeacher.contract")
      ).explorerTeacherStudentResponseSchema.parse(value).data,
  );
export const saveCourseStudentPlan = (
  studentId: string,
  input: CoursePlanInput,
  classId?: string,
  branchId?: string,
) =>
  request(
    `/api/students/${encodeURIComponent(studentId)}/math-srs/course${teacherQuery(classId, branchId)}`,
    async (value) =>
      (await contract()).courseRosterStudentResponseSchema.parse(value).data,
    input,
  );

export const getExplorerTeacherSettings = (
  studentId: string,
  classId: string,
  branchId?: string,
) =>
  request(
    `/api/admin/students/${encodeURIComponent(studentId)}/explorer-settings${teacherQuery(classId, branchId)}`,
    async (value) =>
      (
        await import("@/contracts/mathExplorerSettings.contract")
      ).explorerSettingsResponseSchema.parse(value).data,
  );
export const saveExplorerTeacherSettings = (
  studentId: string,
  classId: string,
  input: import("@/contracts/mathExplorerSettings.contract").ExplorerSettingsInput,
  branchId?: string,
) =>
  request(
    `/api/admin/students/${encodeURIComponent(studentId)}/explorer-settings${teacherQuery(classId, branchId)}`,
    async (value) =>
      (
        await import("@/contracts/mathExplorerSettings.contract")
      ).explorerSettingsResponseSchema.parse(value).data,
    input,
  );
