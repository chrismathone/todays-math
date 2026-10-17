import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherQuotaResponseSchema,
  fadingTeacherStudentResponseSchema,
  type FadingTeacherQuota,
} from "@/contracts/fadingTeacher.contract";
import { FADING_SERVICE_QUOTA } from "@/lib/fading/quota";
import type { TeacherWireFixture } from "./fixture";
import { TeacherFadingSourceError, type TeacherFadingSource } from "./source";
import { teacherWireKey } from "./wireKey";

export type TeacherFixtureState =
  "ready" | "loading" | "empty" | "failure" | "closed" | "forbidden";
export function createTeacherFixtureSource(
  fixture: TeacherWireFixture,
  state: TeacherFixtureState = "ready",
): TeacherFadingSource {
  // 하루 분량은 이 원천 안에서만 바뀐다(저장하지 않는다) — 다시 읽으면 바꾼 값이 보인다.
  const quotas = new Map<string, FadingTeacherQuota>();
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
      const key = teacherWireKey(studentId, classId);
      const detail = fixture.details[key];
      if (!detail) throw new TeacherFadingSourceError(404);
      const quota = quotas.get(key) ?? detail.quota;
      return fadingTeacherStudentResponseSchema.parse({
        data: quota ? { ...detail, quota } : detail,
      });
    },
    setQuota: async (studentId, classId, input) => {
      const key = teacherWireKey(studentId, classId);
      const current = quotas.get(key) ?? fixture.details[key]?.quota;
      if (!current) throw new TeacherFadingSourceError(404);
      if (!current.canEdit) throw new TeacherFadingSourceError(403);
      if (input.expectedRevision !== current.revision)
        throw new TeacherFadingSourceError(409);
      const on = new Date(
        Date.parse(`${fixture.dashboard.today}T00:00:00Z`) + 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      const next: FadingTeacherQuota = {
        ...current,
        next:
          input.quota === current.today.quota
            ? null
            : {
                quota: input.quota,
                slots: input.quota ?? FADING_SERVICE_QUOTA,
                on,
              },
        revision: current.revision + 1,
      };
      quotas.set(key, next);
      return fadingTeacherQuotaResponseSchema.parse({ data: next });
    },
  };
}
