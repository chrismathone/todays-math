import { randomUUID } from "node:crypto";
import { courseAnswerIsList } from "@/lib/math-srs/elementary/answers";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
} from "@/lib/math-srs/courseAutomation";
const now = new Date("2026-10-20T01:00:00.000Z");
for (let seed = 1; seed < 8; seed++) {
  const planned = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-1-2-2",
      dailyQuestionCount: 10,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
  const s = startAutomaticCourse(planned, now, seed, randomUUID).learner
    .session!;
  console.log(
    s.sectionId,
    s.problems
      .map(
        (p) =>
          `${p.tier}:${p.input.mode}${courseAnswerIsList(p) ? "*" : ""}${p.answerChoices ? "c" : ""}`,
      )
      .join(" "),
  );
}
