import type {
  MathInsightV2Snapshot,
  MathInsightV2Evidence,
} from "@/contracts/mathInsightV2.contract";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import { courseSummary } from "@/lib/math-srs/courseAutomation";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import {
  EVIDENCE_WINDOW_MS,
  retainedSessions,
  sessionOutcome,
  newestObservedAt,
} from "@/lib/math-prerequisite/evidence";
import { targetForCourse } from "@/lib/math-prerequisite/mapping";
import type { prerequisiteCheckCandidates } from "@/lib/math-prerequisite/policy";
import { buildInsightSnapshot, insightDigest } from "./snapshot";
import { validateInsightV2Snapshot } from "./v2Validation";

export const INSIGHT_V2_LIMITATIONS = [
  "초3~초6의 실제 코스 카탈로그에 있는 보존 세션을 읽습니다. 정오답 수는 관찰 기록이며 성취·숙달·원인 진단이 아닙니다.",
  "최근 14일과 저장된 계획 이후 여부를 구분합니다. 보존된 기록이 없다는 것은 학습한 적이 없거나 성취가 0이라는 뜻이 아닙니다.",
  "세션 이력은 최대 30개, 최근 답안은 최대 100개를 보존합니다. 원천이 잘렸을 수 있고, 상한 미만이어도 전체 과거를 확인할 수 없습니다.",
  "힌트·자기채점·포기·반복 본문·재시도는 독립 첫 정오답에 더하지 않습니다. 반복 여부도 보존된 세션과 최근 답안 범위에서만 확인합니다.",
  "저장된 계획과 코스의 계산된 다음 진도를 구분합니다. 학생용 기본계획을 새로 계산하지 않으며, 통합 탐험 하루 미션의 내용·분량은 이 조회에서 표시·평가하지 않습니다. 다음 확인 후보 자격은 기존 정책으로 검사합니다.",
  "일반 관찰에는 통과·실패 임계값을 적용하지 않습니다. 선수 대응·판정·다음 확인 후보는 기존 초5 분수 네 소단원만 별도로 봅니다.",
  "날짜와 소단원 질문은 이 조회의 기간과 원천 범위에서만 답합니다. 자동 배정·학습 기록 변경·전체 이력 조회는 하지 않습니다.",
];
export const INSIGHT_V2_REASON_TEXT: Record<
  MathInsightV2Evidence["exclusions"][number],
  string
> = {
  unfinished: "첫 풀이를 끝내지 않아 현재 관찰 합계에서 제외했습니다.",
  future:
    "조회 시각보다 앞날에 찍힌 원천이 있어 현재 관찰 합계에서 제외했습니다.",
  "before-plan":
    "현재 저장된 계획 전에 시작한 세션이라 현재 계획 관찰에서 제외했습니다.",
  "outside-window": "최근 14일 관찰기간 밖의 기록입니다.",
  "no-plan": "저장된 코스 계획이 없어 현재 계획의 관찰로 포함하지 않습니다.",
  "future-plan": "저장된 계획의 설정 시각이 조회 시각보다 앞날입니다.",
  "source-missing":
    "요약의 관찰 시각에 대응하는 끝낸 세션 원천이 보존되어 있지 않아 독립 첫 정오답을 복원하지 않습니다.",
  "unsupported-section": "현재 지원하는 초3~초6 코스 카탈로그 밖의 원천입니다.",
  "hint-self-check-give-up-or-repeated":
    "힌트·자기채점·포기·반복 본문 등 독립 첫 정오답에 포함하지 않는 첫 풀이가 있습니다.",
  "retry-not-first-attempt":
    "재시도·후속 풀이를 독립 첫 정오답에 더하지 않았습니다.",
};

/** Frozen-time read-only projection. Reuse counts, deliberately ignore sessionOutcome.outcome. */
export function buildInsightV2Snapshot(
  course: StoredCourse,
  revision: number,
  now: Date,
  context: MathInsightV2Snapshot["context"] = null,
  candidates: ReturnType<typeof prerequisiteCheckCandidates> = null,
): MathInsightV2Snapshot {
  const asOf = now.toISOString();
  const windowStart = new Date(
    now.getTime() - EVIDENCE_WINDOW_MS,
  ).toISOString();
  const status = !course.plan
    ? "absent"
    : Date.parse(course.plan.configuredAt) > now.getTime()
      ? "future"
      : course.plan.enabled
        ? "active"
        : "paused";
  const target = course.plan ? targetForCourse(course) : null;
  const sessions = retainedSessions(course);
  const observations: MathInsightV2Evidence[] = sessions.map((s) => {
    const section = getCourseSection(s.sectionId);
    const counts = section ? sessionOutcome(course, s) : null;
    const exclusions: MathInsightV2Evidence["exclusions"] = [];
    if (!section) exclusions.push("unsupported-section");
    if (!s.completedAt) exclusions.push("unfinished");
    if (
      Date.parse(s.startedAt) > now.getTime() ||
      (s.completedAt && Date.parse(s.completedAt) > now.getTime())
    )
      exclusions.push("future");
    if (!course.plan) exclusions.push("no-plan");
    else {
      if (status === "future") exclusions.push("future-plan");
      if (s.startedAt < course.plan.configuredAt)
        exclusions.push("before-plan");
    }
    if (s.completedAt && s.completedAt < windowStart)
      exclusions.push("outside-window");
    const included = exclusions.length === 0;
    const independentCorrect = counts?.independentCorrect ?? 0;
    const independentIncorrect = counts?.independentIncorrect ?? 0;
    const excludedFirstAttempts =
      s.attempts.length - independentCorrect - independentIncorrect;
    if (s.completedAt && excludedFirstAttempts > 0)
      exclusions.push("hint-self-check-give-up-or-repeated");
    const retryAttempts =
      (s.retry?.attempts.length ?? 0) +
      (s.followUps?.filter((f) => f.kind === "retry").length ?? 0);
    if (retryAttempts || s.followUps?.length)
      exclusions.push("retry-not-first-attempt");
    return {
      id: `observation:session:${s.id}`,
      sessionId: s.id,
      sectionId: s.sectionId,
      title: section?.title ?? "지원 범위 밖 소단원",
      grade: section?.grade ?? null,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      source: "retained-session",
      included,
      exclusions,
      independentCorrect,
      independentIncorrect,
      excludedFirstAttempts,
      retryAttempts,
    };
  });
  const summaryIds = new Set([
    ...Object.keys(course.memories),
    ...Object.keys(course.learner.progress),
  ]);
  for (const sectionId of summaryIds) {
    const observed = newestObservedAt(course, sectionId);
    if (
      !Number.isFinite(observed) ||
      sessions.some(
        (s) =>
          s.sectionId === sectionId &&
          s.completedAt !== null &&
          Date.parse(s.completedAt) === observed,
      )
    )
      continue;
    const section = getCourseSection(sectionId);
    const exclusions: MathInsightV2Evidence["exclusions"] = ["source-missing"];
    if (!section) exclusions.push("unsupported-section");
    if (observed > now.getTime()) exclusions.push("future");
    if (observed < Date.parse(windowStart)) exclusions.push("outside-window");
    if (!course.plan) exclusions.push("no-plan");
    else {
      if (observed < Date.parse(course.plan.configuredAt))
        exclusions.push("before-plan");
      if (status === "future") exclusions.push("future-plan");
    }
    observations.push({
      id: `observation:missing:${sectionId}`,
      sessionId: null,
      sectionId,
      title: section?.title ?? "지원 범위 밖 소단원",
      grade: section?.grade ?? null,
      startedAt: null,
      completedAt: null,
      source: "summary-without-session",
      included: false,
      exclusions,
      independentCorrect: 0,
      independentIncorrect: 0,
      excludedFirstAttempts: 0,
      retryAttempts: 0,
    });
  }
  const pilot = buildInsightSnapshot(
    course,
    revision,
    now,
    context,
    candidates,
  );
  const retention: MathInsightV2Snapshot["retention"] = {
    sourcePresence: sessions.length
      ? "present"
      : observations.length
        ? "summary-only"
        : "none-retained",
    retentionCoverage:
      course.history.length >= 30 ||
      course.recentAttempts.length >= 100 ||
      observations.some((e) => e.source === "summary-without-session")
        ? "possibly-truncated"
        : "unknown",
    retainedSessionCount: sessions.length,
    recentAttemptCount: course.recentAttempts.length,
  };
  const facts: MathInsightV2Snapshot["facts"] = [];
  const add = (
    kind: MathInsightV2Snapshot["facts"][number]["kind"],
    text: string,
    evidenceIds: string[] = [],
  ) =>
    facts.push({
      id: `fact:${facts.length}`,
      kind,
      text,
      evidenceIds,
      candidateIds: [],
    });
  add(
    "plan-context",
    !course.plan
      ? "저장된 코스 계획이 없습니다. 학생용 기본계획과 통합 탐험 미션은 이 조회에서 평가하지 않았습니다."
      : `저장된 코스 계획: ${getCourseSection(course.plan.startSectionId)?.title ?? course.plan.startSectionId}부터, 설정 분량 ${course.plan.dailyQuestionCount}문항. ${status === "future" ? "설정 시각이 조회 시각보다 앞날입니다." : status === "paused" ? "계획이 일시 중지되어 있습니다." : "계획이 켜져 있습니다."}`,
  );
  const dailyGoal = course.plan ? courseSummary(course, now).todayGoal : null;
  add(
    "course-goal",
    `저장된 코스에서 계산한 다음 진도: ${target ? (getCourseSection(target)?.title ?? target) : "없음"}. ${dailyGoal !== null ? `코스 계산 분량은 ${dailyGoal}문항입니다. ` : ""}이 값은 통합 탐험의 하루 미션이 아니며, 미션의 내용·분량은 이 조회에서 표시·평가하지 않습니다.`,
  );
  add(
    "availability",
    sessions.length
      ? `보존 세션 ${sessions.length}개와 최근 답안 ${course.recentAttempts.length}개 범위의 관찰입니다. 전체 과거를 나타내지 않습니다.`
      : "보존된 세션 원천이 없습니다. 학습한 적 없음이나 성취 0을 뜻하지 않습니다.",
  );
  for (const e of observations) {
    add(
      e.included ? "observation" : "availability",
      e.included
        ? `${e.title}: 현재 기간·저장 계획 범위의 보존 첫 풀이에서 독립 정답 ${e.independentCorrect}개, 독립 오답 ${e.independentIncorrect}개를 관찰했습니다. 숙달·원인 판단이 아닙니다.${e.exclusions.map((x) => ` ${INSIGHT_V2_REASON_TEXT[x]}`).join("")}`
        : `${e.title}: ${e.exclusions.map((x) => INSIGHT_V2_REASON_TEXT[x]).join(" ")} 보존 원천의 수를 현재 성취로 해석하지 않습니다.`,
      [e.id],
    );
  }
  for (const e of pilot.evidence.filter((e) => e.included)) {
    add(
      "observation",
      `분수 부분 대응 시범 · ${getCourseSection(e.sectionId)?.title ?? e.sectionId}: 시범 정책이 선택한 보존 첫 풀이의 독립 정답 ${e.independentCorrect}개, 독립 오답 ${e.independentIncorrect}개입니다. 일반 관찰 합계와 별개이며 숙달·인과 진단이 아닙니다.`,
      [e.id],
    );
  }
  for (const c of pilot.nextChecks) {
    facts.push({
      id: `fact:candidate:${c.id}`,
      kind: "availability",
      text: `${c.title}: ${c.reason} ${c.eligible ? "기존 분수 시범 조건의 다음 확인 후보입니다." : "현재 조건에서 다음 확인 후보로 제안하지 않습니다."} 자동 배정하지 않으며 실제 출제 가능 여부는 별도입니다. ${c.caveats.join(" ")}`,
      evidenceIds: c.evidenceIds,
      candidateIds: c.eligible ? [c.id] : [],
    });
  }
  add(
    "limitation",
    "이 요청의 날짜·소단원 또는 판단은 제공된 조회 범위에서 뒷받침할 수 없습니다. 화면의 관찰기간·보존 원천·저장 계획을 확인해 주세요.",
  );
  for (const text of INSIGHT_V2_LIMITATIONS) add("limitation", text);
  return validateInsightV2Snapshot({
    scope: {
      dataVersion: 2,
      supportedGrades: [3, 4, 5, 6],
      windowStart,
      windowEnd: asOf,
      limitations: INSIGHT_V2_LIMITATIONS,
    },
    context,
    asOf,
    revision,
    stateDigest: insightDigest({ revision, course, context }),
    planContext: {
      status,
      storedPlan: course.plan,
      courseGoal: target
        ? {
            sectionId: target,
            title: getCourseSection(target)?.title ?? target,
          }
        : null,
      courseDailyGoal: dailyGoal,
      defaultPlan: "not-evaluated",
      dailyMission: "not-evaluated",
    },
    retention,
    observations,
    facts,
    pilot,
  });
}
