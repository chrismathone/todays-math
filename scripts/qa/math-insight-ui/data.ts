import {
  mathInsightSnapshotSchema,
  type MathInsightInquiryResult,
} from "../../../src/contracts/mathInsight.contract";
import type {
  CourseRosterStudent,
  CourseStudentDetail,
} from "../../../src/contracts/mathSrsCourse.contract";
import { courseStudentDetailSchema } from "../../../src/contracts/mathSrsCourse.contract";

export const scopeA = {
  studentId: "11111111-1111-4111-8111-111111111111",
  classId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  branchId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};
export const scopeB = {
  studentId: "22222222-2222-4222-8222-222222222222",
  classId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  branchId: scopeA.branchId,
};
const asOf = "2026-10-22T08:00:00.000Z";
const hash = "a".repeat(64);
export function insightFixture(context = scopeA) {
  return mathInsightSnapshotSchema.parse({
    scope: {
      pilotId: "elementary-fractions-v1",
      dataVersion: 1,
      graphHash: hash,
      versions: {
        graphSchemaVersion: "1.1.0",
        graphContentHash: hash,
        mappingVersion: 1,
        policyVersion: 1,
      },
      mappingSource: { path: "synthetic-mapping", hash },
      editorialEdge: {
        from: "E56-N03",
        to: "E56-N04",
        relation: "prerequisite",
        status: "editorial",
      },
      limitations: ["분수의 곱셈과 관련 확인 범위 일부만 연결했습니다."],
    },
    context,
    asOf,
    revision: 3,
    stateDigest: "synthetic-state-only",
    freshness: "current",
    eligibility: "eligible",
    goal: {
      sectionId: "5-2-2-1",
      title: "분수의 곱셈",
      unitId: "E56-N04",
      mappingStatus: "verified",
    },
    sections: [
      {
        unitId: "E56-N04",
        sectionId: "5-2-2-1",
        title: "분수의 곱셈",
        status: "not_passed_recent",
        outcome: "failed",
        independentCorrect: 1,
        independentIncorrect: 4,
        lastObservedAt: asOf,
        sourceRetained: true,
        partial: true,
        evidenceIds: ["record-a"],
        mappingStatus: "verified",
        relation: "covers-part",
      },
    ],
    evidence: [
      {
        id: "record-a",
        sessionId: "synthetic-completed-session",
        sectionId: "5-2-2-1",
        startedAt: "2026-10-22T07:00:00.000Z",
        completedAt: asOf,
        included: true,
        exclusions: [],
        independentCorrect: 1,
        independentIncorrect: 4,
      },
      {
        id: "record-excluded",
        sessionId: "synthetic-unfinished-session",
        sectionId: "5-1-5-4",
        startedAt: asOf,
        completedAt: null,
        included: false,
        exclusions: ["unfinished", "hint-self-check-give-up-or-repeated"],
        independentCorrect: 0,
        independentIncorrect: 0,
      },
    ],
    nextChecks: [
      {
        id: "candidate-a",
        sectionId: "5-1-5-4",
        title: "분수의 뺄셈",
        unitId: "E56-N03",
        relation: "related",
        reviewStatus: "candidate",
        eligible: true,
        evidenceIds: ["record-a"],
        reason:
          "분수의 곱셈 기록을 살펴보고, $\\frac{3}{4}-\\frac{1}{2}$ 같은 분수의 뺄셈 범위를 확인할 수 있습니다.",
        caveats: [
          "이 관계는 추가 확인을 위한 제안이며, 학생의 어려움 원인을 확정하지 않습니다.",
        ],
      },
    ],
    limitations: [
      "최근 보존된 완료 세션을 기준으로 하며 학생의 모든 풀이를 뜻하지 않습니다.",
    ],
  });
}
export function inquiryFixture(context = scopeA): MathInsightInquiryResult {
  return {
    snapshot: insightFixture(context),
    status: "supported",
    intent: "next-checks",
    facts: [
      {
        text: "관찰 기록에서 독립 오답 4건을 확인했습니다. 분수의 뺄셈은 다음 확인 후보입니다.",
        evidenceIds: ["record-a"],
        candidateIds: ["candidate-a"],
      },
    ],
    provenance: {
      provider: "gemini",
      model: "synthetic-no-model-call",
      role: "selection-only",
    },
  };
}
export function rosterStudent(context = scopeA): CourseRosterStudent {
  return {
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
    plan: {
      startSectionId: "5-2-2-1",
      dailyQuestionCount: 10,
      enabled: true,
      configuredAt: "2026-10-01T08:00:00.000Z",
    },
    summary: {
      status: "learning",
      currentSectionId: "5-2-2-1",
      dueCount: 1,
      todayAnswered: 5,
      todayCorrect: 1,
      todayGoal: 10,
      completedSections: 1,
      lastPracticedAt: asOf,
      nextReviewAt: asOf,
      recommendation: null,
    },
  };
}
export function courseDetailFixture(context = scopeA): CourseStudentDetail {
  return courseStudentDetailSchema.parse({
    student: rosterStudent(context),
    sections: [],
    activity: [],
    recentAttempts: [],
    recentSessions: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        sectionId: "5-2-2-1",
        mode: "review",
        startedAt: "2026-10-22T07:00:00.000Z",
        completedAt: asOf,
        answered: 5,
        correct: 1,
        hinted: 0,
      },
    ],
  });
}
