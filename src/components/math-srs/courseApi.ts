import type { Submitted } from "@/components/learn/learnApi";
import { LEARN_OFFLINE_MESSAGE } from "@/components/learn/learnApi";
import type {
  CourseAttemptInput,
  CourseHintInput,
  CoursePlanInput,
} from "@/contracts/mathSrsCourse.contract";

const contract = () => import("@/contracts/mathSrsCourse.contract");
async function request<T>(
  url: string,
  parse: (value: unknown) => Promise<T>,
  body?: unknown,
): Promise<Submitted<T> & { code?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "content-type": "application/json" },
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
  }
}
const state = async (value: unknown) =>
  (await contract()).courseStudentResponseSchema.parse(value).data;
const base = "/api/learn/math-srs/course";
export const getCourseState = () => request(base, state);
export const startCourse = () => request(base, state, {});
export const saveOwnCoursePlan = (input: CoursePlanInput) =>
  request(`${base}/plan`, state, input);
export const answerCourse = (input: CourseAttemptInput) =>
  request(`${base}/attempts`, state, input);
export const hintCourse = (input: CourseHintInput) =>
  request(`${base}/hint`, state, input);
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
