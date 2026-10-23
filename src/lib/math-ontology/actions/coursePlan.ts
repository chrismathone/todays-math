import "server-only";
import type { OntologyPlanArgs } from "@/contracts/mathOntologyAction.contract";
import {
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";
import { changeSrsState, type SrsStateTable } from "@/lib/math-srs/serverStore";
import type { StoredSrsState } from "@/lib/math-srs/serverState";
import { kstDateOf } from "@/lib/kstDate";
import { canonicalBytes } from "./canonical";

export const COURSE_PLAN_ACTION = "course.plan.set/v1" as const;
const fields = ["startSectionId", "dailyQuestionCount", "enabled"] as const;

/** Same no-op and pure transition as the established direct teacher endpoint. */
export function coursePlanTransition(
  state: StoredSrsState,
  args: OntologyPlanArgs,
  now: Date,
) {
  const previous = state.course ?? emptyCourseState();
  const course = setCoursePlan(previous, { ...args, expectedRevision: 0 }, now);
  return fields.some((field) => previous.plan?.[field] !== args[field])
    ? { ...state, course }
    : state;
}

/** Runs the actual SRS transition pipeline against a private in-memory table.
 * No student record is written by preview. Time-of-execution is not a client arg.
 */
export async function previewCoursePlan(
  studentId: string,
  state: StoredSrsState,
  revision: number,
  args: OntologyPlanArgs,
  now: Date,
) {
  let payload = state;
  const table: SrsStateTable = {
    findUnique: async () =>
      revision ? { studentId, revision, payload: state } : null,
    findMany: async () => [],
    create: async (input) => {
      payload = input.data.payload as StoredSrsState;
    },
    updateMany: async (input) => {
      payload = input.data.payload as StoredSrsState;
      return { count: 1 };
    },
  };
  await changeSrsState(
    studentId,
    (value) => coursePlanTransition(value, args, now),
    table,
    revision,
    { teacher: true },
    now,
  );
  const before = state.course?.plan;
  return {
    actionId: COURSE_PLAN_ACTION,
    rulesVersion: 1,
    before: before
      ? {
          startSectionId: before.startSectionId,
          dailyQuestionCount: before.dailyQuestionCount,
          enabled: before.enabled,
        }
      : null,
    after: args,
    changedFields: fields.filter((field) => before?.[field] !== args[field]),
    changedDomains: [
      ...new Set([...Object.keys(state), ...Object.keys(payload)]),
    ]
      .sort()
      .filter(
        (key) =>
          canonicalBytes((state as Record<string, unknown>)[key] ?? null) !==
          canonicalBytes((payload as Record<string, unknown>)[key] ?? null),
      ),
    effectiveDay: kstDateOf(now),
    configuredAtPolicy: "record-at-execution" as const,
  };
}
