import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import { TeacherFadingSourceError, type TeacherFadingSource } from "./source";

/** Opt-in adapter for the workspace parent. The dev gallery never imports or calls it. */
export function createTeacherFadingApiSource({
  branchId,
  fetcher = fetch,
}: {
  branchId?: string;
  fetcher?: typeof fetch;
} = {}): TeacherFadingSource {
  const query = (classId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    if (classId) params.set("classId", classId);
    return params.size ? `?${params}` : "";
  };
  const read = async (url: string): Promise<unknown> => {
    const response = await fetcher(url, { method: "GET", cache: "no-store" });
    if (!response.ok) throw new TeacherFadingSourceError(response.status);
    return response.json();
  };
  return {
    getDashboard: async () =>
      fadingTeacherDashboardResponseSchema.parse(
        await read(`/api/math-srs/fading${query()}`),
      ),
    getStudent: async (studentId, classId) =>
      fadingTeacherStudentResponseSchema.parse(
        await read(
          `/api/students/${encodeURIComponent(studentId)}/math-srs/fading${query(classId)}`,
        ),
      ),
  };
}
