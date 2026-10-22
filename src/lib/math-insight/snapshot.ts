import { createHash } from "node:crypto";
import {
  mathInsightSnapshotSchema,
  type MathInsightSnapshot,
} from "@/contracts/mathInsight.contract";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import {
  currentPlanSessions,
  EVIDENCE_WINDOW_MS,
  pilotEvidence,
  retainedSessions,
  sessionOutcome,
} from "@/lib/math-prerequisite/evidence";
import { GRAPH_CONTENT_HASH } from "@/lib/math-prerequisite/graph";
import {
  PILOT_CHECK_SECTION_IDS,
  PILOT_SECTION_IDS,
  isPilotTarget,
  sectionUnitId,
  targetForCourse,
} from "@/lib/math-prerequisite/mapping";
import type { prerequisiteCheckCandidates } from "@/lib/math-prerequisite/policy";
import { heldCheckSections } from "@/lib/math-prerequisite/policy";
import { prerequisiteVersions } from "@/lib/math-prerequisite/versions";

export const INSIGHT_LIMITATIONS = [
  "초5 분수의 네 소단원만 보는 읽기 전용 시범입니다. 자동 배정이나 학습 기록 변경은 하지 않습니다.",
  "단원 관계는 편집 자료이며 공식 교육과정 전체를 검증한 결과가 아닙니다.",
  "단원 선수 관계와 소단원의 부분 대응은 구분합니다. 대응 확인은 숙달·진단·인과관계의 확인이 아닙니다.",
  "보존된 첫 풀이의 최근 14일 근거만 사용합니다. 힌트·자기채점·포기·반복 본문·재도전은 독립 정오답에서 제외합니다.",
  "탐험·소거 학습 기록은 이 코스 근거에 합치지 않습니다. 후보는 실제 출제 가능 여부를 검사한 결과가 아닙니다.",
];
export const insightDigest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/** Read-only projection. Existing evidence functions own thresholds and inclusion rules. */
export function buildInsightSnapshot(
  course: StoredCourse,
  revision: number,
  now: Date,
  context: MathInsightSnapshot["context"] = null,
  candidates: ReturnType<typeof prerequisiteCheckCandidates> = null,
): MathInsightSnapshot {
  const planValid =
    !!course.plan && Date.parse(course.plan.configuredAt) <= now.getTime();
  const target = course.plan ? targetForCourse(course) : null;
  const sessions = retainedSessions(course).filter((s) =>
    (PILOT_SECTION_IDS as readonly string[]).includes(s.sectionId),
  );
  const rawSections = pilotEvidence(course, now).map((section) => {
    const latest = currentPlanSessions(course, section.sectionId, now).at(-1);
    const uncertain = sessions.some(
      (s) =>
        s.sectionId === section.sectionId &&
        (Date.parse(s.startedAt) > now.getTime() ||
          (s.completedAt && Date.parse(s.completedAt) > now.getTime()) ||
          (!s.completedAt && (!latest || s.startedAt >= latest.startedAt))),
    );
    return uncertain
      ? {
          ...section,
          status: "inconclusive" as const,
          outcome: "unknown" as const,
          sourceRetained: false,
          independentCorrect: 0,
          independentIncorrect: 0,
        }
      : section;
  });
  const evidence = sessions.map((session) => {
    const result = sessionOutcome(course, session);
    const section = rawSections.find((s) => s.sectionId === session.sectionId)!;
    const latest = currentPlanSessions(course, session.sectionId, now).at(-1);
    const included =
      planValid &&
      section.sourceRetained &&
      (latest?.id === session.id ||
        !!candidates?.evidenceSessionIds.includes(session.id));
    const purposes: MathInsightSnapshot["evidence"][number]["purposes"] = [];
    if (included && latest?.id === session.id) purposes.push("section-current");
    if (included && candidates?.evidenceSessionIds.includes(session.id))
      purposes.push("candidate-trigger");
    const exclusions: MathInsightSnapshot["evidence"][number]["exclusions"] =
      [];
    if (!planValid) exclusions.push("no-plan");
    if (!session.completedAt) exclusions.push("unfinished");
    if (
      Date.parse(session.startedAt) > now.getTime() ||
      (session.completedAt && Date.parse(session.completedAt) > now.getTime())
    )
      exclusions.push("future");
    if (course.plan && session.startedAt < course.plan.configuredAt)
      exclusions.push("before-plan");
    if (
      session.completedAt &&
      Date.parse(session.completedAt) < now.getTime() - EVIDENCE_WINDOW_MS
    )
      exclusions.push("outside-window");
    if (!included && !exclusions.length) exclusions.push("superseded");
    if (
      session.attempts.length >
      result.independentCorrect + result.independentIncorrect
    )
      exclusions.push("hint-self-check-give-up-or-repeated");
    if (session.retry?.attempts.length || session.followUps?.length)
      exclusions.push("retry-not-first-attempt");
    return {
      id: `session:${session.id}`,
      sessionId: session.id,
      sectionId: session.sectionId,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      included,
      purposes,
      exclusions,
      independentCorrect: included ? result.independentCorrect : 0,
      independentIncorrect: included ? result.independentIncorrect : 0,
    };
  });
  const sections = rawSections.map((s) => ({
    ...s,
    ...(!planValid
      ? {
          status: "unassessed" as const,
          outcome: "unknown" as const,
          independentCorrect: 0,
          independentIncorrect: 0,
          sourceRetained: false,
        }
      : {}),
    evidenceIds: evidence
      .filter(
        (e) =>
          e.included &&
          e.sectionId === s.sectionId &&
          currentPlanSessions(course, s.sectionId, now).at(-1)?.id ===
            e.sessionId,
      )
      .map((e) => e.id),
    mappingStatus: "verified" as const,
    relation: "covers-part" as const,
  }));
  const freshness = sections.some(
    (s) =>
      s.sourceRetained && (s.outcome === "passed" || s.outcome === "failed"),
  )
    ? "current"
    : "insufficient";
  const eligibility =
    !planValid || !course.plan?.enabled || !target
      ? "insufficient"
      : !isPilotTarget(target)
        ? "out-of-scope"
        : freshness === "current" && !!candidates?.sectionIds.length
          ? "eligible"
          : "insufficient";
  const held = heldCheckSections(course, now, true);
  const citations = evidence
    .filter(
      (e) => e.included && candidates?.evidenceSessionIds.includes(e.sessionId),
    )
    .map((e) => e.id);
  return mathInsightSnapshotSchema.parse({
    scope: {
      pilotId: "elementary-fractions-v1",
      dataVersion: 1,
      graphHash: GRAPH_CONTENT_HASH,
      mappingSource: {
        path: "src/lib/math-prerequisite/mapping.ts",
        hash: "91a6c5e22bbc6ca095a3cd696a87804ad89f25c6ac80ee230e9fe6071393a743",
      },
      editorialEdge: {
        from: "E56-N03",
        to: "E56-N04",
        relation: "prerequisite",
        status: "editorial",
      },
      versions: prerequisiteVersions(GRAPH_CONTENT_HASH),
      limitations: INSIGHT_LIMITATIONS,
    },
    context,
    asOf: now.toISOString(),
    revision,
    stateDigest: insightDigest({ revision, course, context }),
    freshness,
    eligibility,
    goal: target
      ? {
          sectionId: target,
          title: getCourseSection(target)?.title ?? target,
          unitId: sectionUnitId(target),
          mappingStatus: sectionUnitId(target) ? "verified" : "unmapped",
        }
      : null,
    sections,
    evidence,
    nextChecks: PILOT_CHECK_SECTION_IDS.map((sectionId) => ({
      id: `check:${sectionId}`,
      sectionId,
      title: getCourseSection(sectionId)!.title,
      unitId: sectionUnitId(sectionId)!,
      relation: "covers-part",
      reviewStatus: "candidate",
      eligible:
        eligibility === "eligible" &&
        !!candidates?.sectionIds.includes(sectionId) &&
        citations.length > 0 &&
        !held.sectionIds.includes(sectionId),
      evidenceIds: citations,
      reason:
        "분수의 곱셈과 연결된 분수의 뺄셈을 부분적으로 확인하는 후보입니다.",
      caveats: [
        "확인한 소단원의 일부만 연결합니다. 단원 전체를 같은 내용으로 보지 않습니다.",
        "이 학생에게 적절한 다음 확인인지는 교사가 기록을 보고 검토해야 합니다.",
        ...(held.sectionIds.includes(sectionId) && held.reason
          ? [held.reason]
          : []),
        "확인 후보를 고르는 기존 학습 조건을 따르며, 실제 새 문제를 낼 수 있는지는 아직 검사하지 않았습니다.",
        ...(eligibility !== "eligible"
          ? [
              "현재 목표 또는 최근 근거가 시범 조건에 맞지 않아 학생별 다음 확인으로 제안하지 않습니다.",
            ]
          : []),
      ],
    })),
    limitations: INSIGHT_LIMITATIONS,
  });
}
