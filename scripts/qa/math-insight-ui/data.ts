import {
  mathInsightSnapshotSchema,
  mathInsightInquiryResultSchema,
} from "../../../src/contracts/mathInsight.contract";
import {
  courseStudentDetailSchema,
  courseRosterStudentSchema,
  type CourseRosterStudent,
} from "../../../src/contracts/mathSrsCourse.contract";
import generated from "./generated.json";

// Frozen from actual pure backend transitions/projections, including exact prose.
// generate.ts verifies source blobs against backend commit 6f78cfaa7.
export const scopeA = generated.scenarios[0].snapshot.context;
export const scopeB = generated.scenarios[1].snapshot.context;
const scenario = (context = scopeA) =>
  generated.scenarios[context.studentId === scopeB.studentId ? 1 : 0];
export function insightFixture(context = scopeA) {
  return mathInsightSnapshotSchema.parse(
    structuredClone(scenario(context).snapshot),
  );
}
export function outsideFixture(context = scopeA) {
  return mathInsightSnapshotSchema.parse(
    structuredClone(scenario(context).outside),
  );
}
export function inquiryFixture(context = scopeA) {
  return mathInsightInquiryResultSchema.parse(
    structuredClone(scenario(context).inquiry),
  );
}
export const CURRENT_EVIDENCE_ID = insightFixture().evidence.find((item) =>
  item.purposes.includes("section-current"),
)!.id;
export const TRIGGER_EVIDENCE_ID = insightFixture().evidence.find(
  (item) =>
    item.purposes.includes("candidate-trigger") &&
    !item.purposes.includes("section-current"),
)!.id;
export const EXCLUDED_EVIDENCE_ID = insightFixture().evidence.find(
  (item) => !item.included,
)!.id;
export const CURRENT_RECORD_LABEL = `기록 ${insightFixture().evidence.findIndex((item) => item.id === CURRENT_EVIDENCE_ID) + 1}`;
export const NEXT_CHECK_TITLE = insightFixture().nextChecks[0].title;

export function rosterStudent(context = scopeA): CourseRosterStudent {
  return courseRosterStudentSchema.parse({
    id: context.studentId,
    classId: context.classId,
    name: context.studentId === scopeA.studentId ? "예시 가람" : "예시 나래",
    className:
      context.classId === scopeA.classId
        ? "초5 합성 분수반"
        : "초5 합성 탐구반",
    classGrade: "초5",
    hasAccount: true,
    revision: 3,
    plan: generated.courseProjection.plan,
    summary: generated.courseProjection.summary,
  });
}
export function courseDetailFixture(context = scopeA) {
  return courseStudentDetailSchema.parse({
    student: rosterStudent(context),
    sections: [],
    activity: [],
    recentAttempts: [],
    recentSessions: generated.courseProjection.recentSessions,
  });
}
