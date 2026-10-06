import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import type { TeacherWireFixture } from "./fixture";
import { TeacherFadingSourceError, type TeacherFadingSource } from "./source";
import { teacherWireKey } from "./wireKey";

export type TeacherFixtureState =
  "ready" | "loading" | "empty" | "failure" | "closed" | "forbidden";
export function createTeacherFixtureSource(
  fixture: TeacherWireFixture,
  state: TeacherFixtureState = "ready",
): TeacherFadingSource {
  return {
    getDashboard: async () => {
      if (state === "loading") return new Promise(() => {});
      if (state === "closed") throw new TeacherFadingSourceError(404);
      if (state === "forbidden") throw new TeacherFadingSourceError(403);
      if (state === "failure") throw new TeacherFadingSourceError(500);
      return fadingTeacherDashboardResponseSchema.parse({
        data:
          state === "empty"
            ? { ...fixture.dashboard, students: [] }
            : fixture.dashboard,
      });
    },
    getStudent: async (studentId, classId) => {
      const detail = fixture.details[teacherWireKey(studentId, classId)];
      if (!detail) throw new TeacherFadingSourceError(404);
      return fadingTeacherStudentResponseSchema.parse({ data: detail });
    },
  };
}
