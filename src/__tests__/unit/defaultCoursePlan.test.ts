// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  defaultCourseStartSection,
  withDefaultCoursePlan,
} from "@/lib/math-srs/defaultCoursePlan";
import {
  emptyCourseState,
  setCoursePlan,
  storedCourseSchema,
} from "@/lib/math-srs/courseAutomation";
import { bankSectionsForExplorerUnit } from "@/lib/math-explorers/curriculumBridge";
import { applyExplorerAction } from "@/lib/math-explorers/engine";
import { definitionUnits } from "@/lib/math-explorers/definition-cards";
import {
  expeditionLearning,
  initialOwnedExplorer,
} from "@/lib/math-explorers/expedition";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const studentId = randomUUID();
// 19:00 KST
const at = (date: string) => new Date(`${date}T10:00:00.000Z`);

describe("default course start from the class grade and the Korean semester", () => {
  it.each([
    ["초5", "2026-10-19", "5-2-1-1"],
    ["초5", "2026-03-02", "5-1-1-1"],
    ["초5", "2026-08-31", "5-1-1-1"],
    ["초5", "2026-09-01", "5-2-1-1"],
    // January and February still belong to the class grade's second semester.
    ["초5", "2027-01-10", "5-2-1-1"],
    ["초3", "2026-10-19", "3-2-1-1"],
    ["초6", "2026-04-01", "6-1-1-1"],
  ])("%s on %s starts at %s", (grade, date, section) => {
    expect(defaultCourseStartSection(grade, at(date))).toBe(section);
  });

  it.each(["중2", "고1", "초2", "", "초5-6", " 초5"])(
    "has no elementary default for %j",
    (grade) => {
      expect(defaultCourseStartSection(grade, at("2026-10-19"))).toBeNull();
    },
  );
});

describe("withDefaultCoursePlan", () => {
  it("adds an enabled 10-question plan that the stored contract accepts", () => {
    const now = at("2026-10-19");
    const state = withDefaultCoursePlan(emptySrsState(), "초5", now);
    expect(state.course?.plan).toMatchObject({
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 10,
      enabled: true,
    });
    expect(storedCourseSchema.parse(state.course)).toEqual(state.course);
    expect(parseSrsState(state)).toEqual(state);
  });

  it("returns the same state when a plan exists or the grade is not elementary", () => {
    const now = at("2026-10-19");
    const planned = {
      ...emptySrsState(),
      course: setCoursePlan(
        emptyCourseState(),
        {
          startSectionId: "5-1-4-1",
          dailyQuestionCount: 5,
          enabled: false,
          expectedRevision: 0,
        },
        now,
      ),
    };
    expect(withDefaultCoursePlan(planned, "초5", now)).toBe(planned);
    const empty = emptySrsState();
    expect(withDefaultCoursePlan(empty, "중2", now)).toBe(empty);
    expect(withDefaultCoursePlan(empty, null, now)).toBe(empty);
  });

  it("follows an explorer goal that is already stored, so the two progressions do not split", () => {
    const now = at("2026-10-19");
    let state = emptySrsState();
    const explorer = applyExplorerAction(
      initialOwnedExplorer(state, studentId, now),
      { type: "goal", unitId: "g5-fractions" },
      "2026-10-19",
      randomUUID(),
    ).state;
    state = { ...state, explorers: explorer };
    const seeded = withDefaultCoursePlan(state, "초5", now);
    expect(seeded.course?.plan?.startSectionId).toBe(
      bankSectionsForExplorerUnit("g5-fractions")[0],
    );
  });

  it("ignores a stored middle goal, whose bank sections are not course sections", () => {
    const now = at("2026-10-19");
    let state = emptySrsState();
    const explorer = applyExplorerAction(
      initialOwnedExplorer(state, studentId, now),
      { type: "goal", unitId: "g7-equation" },
      "2026-10-19",
      randomUUID(),
    ).state;
    state = { ...state, explorers: explorer };
    expect(
      withDefaultCoursePlan(state, "초5", now).course?.plan?.startSectionId,
    ).toBe("5-2-1-1");
  });

  it("makes a new 초5 student learn a 초5 unit instead of the 초3 default", () => {
    const now = at("2026-10-19");
    const gradeOf = (unitId: string) =>
      definitionUnits.find((unit) => unit.id === unitId)?.grade;
    const before = expeditionLearning(emptySrsState(), studentId, now);
    expect(gradeOf(before.unitId)).toBe(3);
    const after = expeditionLearning(
      withDefaultCoursePlan(emptySrsState(), "초5", now),
      studentId,
      now,
    );
    expect(after.unitId).toBe("g5-estimate");
    expect(after.plan.subtitle).toContain("5");
  });
});
