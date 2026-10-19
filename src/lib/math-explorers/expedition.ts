import type {
  ExpeditionPlan,
  MathExpedition,
  StoredExpedition,
  StoredExpeditionMission,
} from "@/contracts/mathExpedition.contract";
import type { StoredExplorer } from "@/contracts/mathExplorers.contract";
import { kstDateOf } from "@/lib/kstDate";
import {
  coursePrerequisiteDecision,
  prerequisiteRecommendation,
} from "@/lib/math-prerequisite/courseIntegration";
import { mathPrerequisiteEnabled } from "@/lib/math-prerequisite/enabled";
import { pilotTargetForCourse } from "@/lib/math-prerequisite/mapping";
import { contextForDecision } from "@/lib/math-prerequisite/display";
import {
  courseSummary,
  emptyCourseState,
  findStoredCourseSession,
} from "@/lib/math-srs/courseAutomation";
import { dailyJourneyLedger } from "@/lib/math-srs/dailyJourney";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import {
  currentSrsMission,
  SrsConflict,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  definitionCards,
  definitionDue,
  definitionEffectiveDue,
  definitionUnits,
  type DefinitionRecord,
} from "./definition-cards";
import {
  bankKindForExplorerUnit,
  bankSectionsForExplorerUnit,
  explorerUnitForSection,
} from "./curriculumBridge";
import { createExplorerState } from "./engine";
import { tileStarBonus } from "./starEconomy";
import { legacyExpeditionJourney } from "./expeditionJourney";
import {
  BANK_REVIEW,
  conceptTarget,
  MIDDLE_BANK_DAYS,
  type ForecastUnit,
} from "./journeyForecast";

const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
/** The course without the two fields a plan edit writes (`setCoursePlan`): the plan and the selected start section. */
const withoutPlan = (course: StoredSrsState["course"]) => {
  const c = course ?? emptyCourseState();
  return {
    ...c,
    plan: undefined,
    learner: { ...c.learner, selectedSectionId: undefined },
  };
};
const gradeLabel = (grade: number) =>
  grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;
const open = (state: StoredSrsState) =>
  state.expedition?.mission && state.expedition.mission.status !== "complete"
    ? state.expedition.mission
    : null;
/** 오늘의 탐험 미션(개념 · 은행)이 열려 있나 — 보충 카드(D-147)는 이때 시작 · 이어서 · 답을 받지 않는다. */
export function expeditionMissionOpen(state: StoredSrsState): boolean {
  return !!open(state);
}

/** Old verified achievements are imported once, before a new assignment starts. */
export function initialExpedition(
  state: StoredSrsState,
  now: Date,
): StoredExpedition {
  return (
    state.expedition ?? {
      version: 1,
      initializedAt: now.toISOString(),
      mission: null,
      legacyDays: legacyExpeditionJourney(state, now).days,
      awards: [],
      receipts: [],
    }
  );
}

/** New accounts inherit the already configured course. Existing choices are preserved. */
export function initialOwnedExplorer(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): StoredExplorer {
  if (state.explorers) return state.explorers;
  const sectionId = state.course
    ? courseSummary(state.course, now).currentSectionId
    : null;
  const section = sectionId ? getCourseSection(sectionId) : null;
  const unitId = sectionId ? explorerUnitForSection(sectionId) : null;
  const middleActive = state.missions.some((m) => !m.completedAt);
  const explorer = createExplorerState(
    studentId,
    section?.grade ?? (middleActive ? 7 : 3),
  );
  if (unitId || middleActive)
    explorer.profile.definitions = {
      courseGrade: section?.grade ?? 7,
      ...(middleActive && !unitId ? { goalUnitId: "g7-equation" } : {}),
      runs: 0,
      cards: {},
      history: [],
    };
  return explorer;
}

function unitPlan(
  unitId: string,
  route: ExpeditionPlan["route"] = "unit",
): ExpeditionPlan {
  const unit = definitionUnits.find((u) => u.id === unitId)!;
  return {
    kind: "explorers",
    route,
    unitId,
    title:
      route === "memory"
        ? "기억 복습"
        : route === "repair"
          ? `${unit.title} 연결 복습`
          : unit.title,
    subtitle: gradeLabel(unit.grade),
    goal: 15,
  };
}
function elementaryPlan(sectionId: string): ExpeditionPlan {
  const section = getCourseSection(sectionId)!;
  return {
    kind: "elementary",
    route: "bank",
    unitId: explorerUnitForSection(sectionId) ?? sectionId,
    title: section.chapterTitle,
    subtitle: `${gradeLabel(section.grade)} · ${section.title}`,
    goal: 10,
  };
}
const middlePlan = (): ExpeditionPlan => ({
  kind: "middle",
  route: "bank",
  unitId: "g7-equation",
  title: "일차방정식",
  subtitle: "중학교 1학년",
  goal: 12,
});

/** A saved unfinished source always precedes assigning another workload. */
function unfinished(
  state: StoredSrsState,
  now: Date,
): {
  plan: ExpeditionPlan;
  id: string;
  at: string;
  sectionId: string | null;
} | null {
  const candidates: {
    plan: ExpeditionPlan;
    id: string;
    at: string;
    sectionId: string | null;
  }[] = [];
  const course = state.course;
  const session = course?.learner.session;
  if (course && session) {
    const summary = courseSummary(course, now);
    if (
      !session.completedAt ||
      (session.retry && !session.retry.completedAt) ||
      (summary.todayAnswered > 0 && summary.todayAnswered < summary.todayGoal)
    )
      candidates.push({
        plan: elementaryPlan(session.sectionId),
        id: session.id,
        at: session.startedAt,
        sectionId: session.sectionId,
      });
  }
  for (const m of state.missions)
    if (
      !m.completedAt ||
      m.attempts.some(
        (a) => !a.correct && !m.resolvedRetryProblemIds?.includes(a.problemId),
      )
    )
      candidates.push({
        plan: middlePlan(),
        id: m.id,
        at: m.startedAt,
        sectionId: null,
      });
  const s = state.explorers?.profile.definitions?.session;
  if (s && !s.reviewOnly && (!s.done || s.unresolved.length))
    candidates.push({
      plan: unitPlan(s.unit, s.route ?? "unit"),
      id: s.id,
      at: `${s.date}T00:00:00.000Z`,
      sectionId: null,
    });
  return candidates.sort((a, b) => a.at.localeCompare(b.at))[0] ?? null;
}

/** Read-only access to the same interrupted-activity decision used by expedition planning. */
export function unfinishedExpeditionSource(state: StoredSrsState, now: Date) {
  const pending = unfinished(state, now);
  return pending
    ? { kind: pending.plan.kind, sourceSessionId: pending.id }
    : null;
}

/** Concept units in grade order with the student's collected cards — the unit list the D-142 hand-over walks. */
export function conceptUnits(
  record: DefinitionRecord | undefined,
  middleBankDays = 0,
): ForecastUnit[] {
  return definitionUnits.map((unit) => {
    const cards = definitionCards.filter((card) => card.unit === unit.id);
    return {
      id: unit.id,
      grade: unit.grade,
      title: unit.title,
      cards: cards.length,
      collected: cards.filter((card) => record?.cards[card.id]?.level).length,
      ...(bankKindForExplorerUnit(unit.id) === "middle"
        ? { bankDays: middleBankDays }
        : {}),
    };
  });
}

/**
 * 끝낸 중등 문제은행 날(D-142 ⑹) — 영구 칸 기록(이관한 옛 날 + 끝낸 오늘의 탐험)에서 중등 은행이 든 날을 센다.
 * 칸은 오늘의 탐험과 재도전을 모두 끝낸 날에만 생기고 하루에 하나라서(`updateExpedition` · 저장 계약의 날짜 중복 금지)
 * 달력 날이 아니라 «끝낸 은행 날»이다. 기억 복습 · 개념 날(explorers) · 초등 날은 세지 않고, 지난 칸 재풀이는 칸을 안 만든다.
 * 90개로 잘리는 미션 목록(`state.missions`)은 쓰지 않는다.
 */
export function completedMiddleBankDays(
  state: StoredSrsState,
  now: Date,
): number {
  const ledger = initialExpedition(state, now);
  return [
    ...ledger.legacyDays,
    ...ledger.awards.map((award) => award.day),
  ].filter((day) => day.reviews.some((review) => review.kind === "middle"))
    .length;
}

/**
 * What the student is learning, before any memory day: the unit (and, for the elementary
 * bank, the course section) that today's plan and the board's forecast both start from.
 */
export function expeditionLearning(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): { unitId: string; sectionId: string | null; plan: ExpeditionPlan } {
  const explorer = initialOwnedExplorer(state, studentId, now);
  const profile = explorer.profile;
  const record = profile.definitions;
  const course = state.course;
  const summary = course ? courseSummary(course, now) : null;
  const mappedUnit = summary?.currentSectionId
    ? explorerUnitForSection(summary.currentSectionId)
    : null;
  // A saved explicit goal wins; otherwise follow the existing course cursor.
  // Never scan the entire catalogue for the first uncollected concept.
  const start =
    record?.goalUnitId ??
    mappedUnit ??
    definitionUnits.find(
      (u) => u.grade === (record?.courseGrade ?? profile.grade),
    )!.id;
  // D-142: a middle unit whose five cards are collected hands over to the next unit to collect.
  // D-142 ⑹: 중1 일차방정식은 끝낸 은행 날이 3일이 되면 넘긴다.
  const unitId = conceptTarget(
    conceptUnits(record, completedMiddleBankDays(state, now)),
    start,
  );
  const bankKind = bankKindForExplorerUnit(unitId);
  const sectionId =
    bankKind === "elementary"
      ? mappedUnit === unitId && summary?.currentSectionId
        ? summary.currentSectionId
        : bankSectionsForExplorerUnit(unitId)[0]
      : null;
  if (
    definitionCards.some(
      (card) => card.unit === unitId && !record?.cards[card.id]?.level,
    )
  )
    return { unitId, sectionId, plan: unitPlan(unitId) };
  if (bankKind === "elementary")
    return { unitId, sectionId, plan: elementaryPlan(sectionId!) };
  if (bankKind === "middle") return { unitId, sectionId, plan: middlePlan() };
  return { unitId, sectionId, plan: unitPlan(unitId) };
}

/** D-142 ⑼ 은행 복습 날 — 문제은행 12문제 그대로, 이름만 복습(route «memory» 라 «복습 다음엔 학습 목표 한 번»에 같이 걸린다). */
const bankReviewPlan = (): ExpeditionPlan => ({
  ...middlePlan(),
  route: "memory",
  title: "일차방정식 복습",
});
const DAY_MS = 86_400_000;
const dayGap = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );

/**
 * 넘어간 뒤(학습 목표가 중1 일차방정식 뒤 · 끝낸 은행 날 3일) 중1 은행 만기가 차면 은행 복습 날 후보.
 * 만기는 `nextReviewAt ≤ 지금`만 센다 — 한 번도 안 푼 개념(null)은 만기가 아니다(`dueConcepts` 는 6개를 다 정렬해 돌려준다).
 * 마지막 은행 날(영구 칸 기록)에서 `minGapDays` 가 안 지났으면 아직.
 */
function middleBankReview(
  state: StoredSrsState,
  targetUnitId: string,
  now: Date,
): { overdue: boolean; lastDate: string } | null {
  const equation = definitionUnits.findIndex((u) => u.id === "g7-equation");
  if (definitionUnits.findIndex((u) => u.id === targetUnitId) <= equation)
    return null;
  const ledger = initialExpedition(state, now);
  const bankDays = [
    ...ledger.legacyDays,
    ...ledger.awards.map((award) => award.day),
  ]
    .filter((day) => day.reviews.some((review) => review.kind === "middle"))
    .map((day) => day.date)
    .sort();
  if (bankDays.length < MIDDLE_BANK_DAYS) return null;
  const due = state.memories.filter(
    (memory) =>
      memory.nextReviewAt !== null &&
      Date.parse(memory.nextReviewAt) <= now.getTime(),
  );
  const overdue = due.some(
    (memory) =>
      now.getTime() - Date.parse(memory.nextReviewAt!) >
      BANK_REVIEW.overdueDays * DAY_MS,
  );
  if (due.length < BANK_REVIEW.dueConcepts && !overdue) return null;
  const lastDate = bankDays.at(-1)!;
  if (dayGap(lastDate, kstDateOf(now)) < BANK_REVIEW.minGapDays) return null;
  return { overdue, lastDate };
}

/** Today's frozen or next plan, with the course section an elementary bank day practises. */
export function expeditionToday(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): { plan: ExpeditionPlan; sectionId: string | null } {
  const active = open(state);
  if (active)
    return {
      plan: active,
      sectionId:
        active.kind === "elementary"
          ? (active.references[0]?.unitIds[0] ?? null)
          : null,
    };
  const pending = unfinished(state, now);
  if (pending) return { plan: pending.plan, sectionId: pending.sectionId };
  const explorer = initialOwnedExplorer(state, studentId, now);
  const profile = explorer.profile;
  const record = profile.definitions;
  const date = kstDateOf(now);
  const due = definitionDue(profile, date);
  const overdue = due.some(
    (card) =>
      Date.parse(`${date}T00:00:00Z`) -
        // 뜻을 고친 카드의 앞당긴 만기도 같은 읽기 규칙으로(D-143 ⑦) — 밀리면 기억 복습 날이 열린다.
        Date.parse(
          `${definitionEffectiveDue(card.id, record!.cards[card.id])}T00:00:00Z`,
        ) >=
      3 * 86_400_000,
  );
  const learning = expeditionLearning(state, studentId, now);
  // 진도 보호: 복습(개념 기억 복습 · 은행 복습 — 둘 다 route «memory») 다음 날은 학습 목표 한 번.
  const rested = state.expedition?.mission?.route !== "memory";
  const concept = rested && (due.length >= 5 || overdue);
  const bank = rested ? middleBankReview(state, learning.unitId, now) : null;
  if (concept || bank) {
    // 겹치면: 3일 넘게 밀린 쪽 → 더 오래 쉰 종류 → 개념(D-142 ⑼ 합의안).
    const lastConcept =
      explorer.completedDays
        .filter((day) => day.route === "memory")
        .map((day) => day.date)
        .sort()
        .at(-1) ?? "";
    const bankFirst =
      !!bank &&
      (!concept ||
        (bank.overdue !== overdue
          ? bank.overdue
          : bank.lastDate < lastConcept));
    if (bankFirst) return { plan: bankReviewPlan(), sectionId: null };
    return { plan: unitPlan(due[0].unit, "memory"), sectionId: null };
  }
  return {
    plan: learning.plan,
    sectionId: learning.plan.kind === "elementary" ? learning.sectionId : null,
  };
}

export function planExpedition(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): ExpeditionPlan {
  return expeditionToday(state, studentId, now).plan;
}

function completionDates(expedition: StoredExpedition) {
  return [
    ...expedition.legacyDays.map((day) => day.date),
    ...expedition.awards.map((award) => award.day.date),
  ];
}
export function expeditionDto(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): MathExpedition {
  const ledger = initialExpedition(state, now);
  const today = kstDateOf(now);
  const complete = completionDates(ledger).includes(today);
  const mission = ledger.mission;
  const wouldStart = !!open(state) || !!unfinished(state, now) || !complete;
  const nextPlan =
    wouldStart && !open(state) ? planExpedition(state, studentId, now) : null;
  const prerequisite = open(state)
    ? expeditionCoursePrerequisiteDecision(state, now)
    : nextPlan
      ? expeditionInitialPrerequisiteDecision(state, nextPlan, now)
      : null;
  const matching =
    prerequisite &&
    (!nextPlan ||
      explorerUnitForSection(prerequisite.sectionId) === nextPlan.unitId)
      ? prerequisite
      : null;
  const prerequisiteContext = contextForDecision(matching);
  const canStart = wouldStart && matching?.kind !== "unavailable";
  const todayStars = ledger.awards.find(
    (award) => award.day.date === today,
  )?.stars;
  return {
    ...(prerequisiteContext ? { prerequisiteContext } : {}),
    mission: mission
      ? (({
          awardEligible: _a,
          references: _r,
          startStars: _s,
          ...publicMission
        }) => publicMission)(mission)
      : null,
    next: nextPlan,
    completedToday: complete,
    canStart,
    ...(todayStars ? { todayStars } : {}),
  };
}

function reference(
  state: StoredSrsState,
  kind: ExpeditionPlan["kind"],
  id: string,
): StoredExpeditionMission["references"][number] {
  if (kind === "elementary") {
    const session = state.course && findStoredCourseSession(state.course, id);
    if (!session)
      throw new SrsConflict("이어 풀 학습 기록을 다시 불러와 주세요.");
    return {
      id,
      problemIds: session.problems.map((p) => p.id),
      unitIds: session.problems.map(() => session.sectionId),
    };
  }
  if (kind === "middle") {
    const session = state.missions.find((m) => m.id === id);
    if (!session)
      throw new SrsConflict("이어 풀 학습 기록을 다시 불러와 주세요.");
    return {
      id,
      problemIds: session.problems.map((p) => p.id),
      unitIds: session.problems.map((p) => p.conceptId),
    };
  }
  return {
    id,
    problemIds: [],
    unitIds: [state.explorers!.profile.definitions!.session!.unit],
  };
}

/** Bind the generated/resumed source and its workload in the same CAS write. */
export function bindExpedition(
  previous: StoredSrsState,
  source: StoredSrsState,
  plan: ExpeditionPlan,
  now: Date,
  id: string,
  requestId: string,
): StoredSrsState {
  const ledger = initialExpedition(previous, now);
  const existing = open(previous);
  if (existing)
    return {
      ...source,
      expedition: {
        ...ledger,
        receipts: [
          ...ledger.receipts,
          { requestId, actionKey: "expedition-start", missionId: existing.id },
        ].slice(-128),
      },
    };
  const sourceId =
    plan.kind === "elementary"
      ? source.course!.learner.session!.id
      : plan.kind === "middle"
        ? currentSrsMission(source, now)!.id
        : source.explorers!.profile.definitions!.session!.id;
  let ids = [sourceId];
  if (plan.kind === "elementary") {
    const active = source.course!.learner.session!;
    const sourceDate = kstDateOf(new Date(active.startedAt));
    const day = dailyJourneyLedger(previous).elementary.find(
      (d) => d.date === sourceDate && !d.completedAt,
    );
    ids = [...new Set([...(day?.references.map((r) => r.id) ?? []), sourceId])];
  }
  const mission: StoredExpeditionMission = {
    ...plan,
    id,
    date: kstDateOf(now),
    answered: 0,
    retryRemaining: 0,
    status: "active",
    sourceSessionId: sourceId,
    sourceSessionIds: ids,
    startedAt: now.toISOString(),
    completedAt: null,
    awardEligible: !(
      plan.kind === "explorers" &&
      source.explorers!.profile.definitions!.session!.reviewOnly
    ),
    references: ids.map((sourceId) => reference(source, plan.kind, sourceId)),
    ...(plan.kind === "explorers"
      ? { startStars: source.explorers!.profile.definitions!.session!.stars }
      : {}),
  };
  return {
    ...source,
    expedition: {
      ...ledger,
      mission,
      receipts: [
        ...ledger.receipts,
        { requestId, actionKey: "expedition-start", missionId: id },
      ].slice(-128),
    },
  };
}

export function expeditionStartDuplicate(
  state: StoredSrsState,
  requestId: string,
): boolean {
  if (
    state.explorers?.receipts.some((receipt) => receipt.requestId === requestId)
  )
    throw new SrsConflict("같은 요청 번호로 다른 학습을 시작할 수 없어요.");
  return !!state.expedition?.receipts.some(
    (receipt) => receipt.requestId === requestId,
  );
}

export function expeditionCourseRecommendation(
  state: StoredSrsState,
  now: Date,
) {
  const course = state.course;
  if (!course) return null;
  const standard = courseSummary(course, now).recommendation;
  const mission = open(state);
  if (mission?.kind !== "elementary") return standard;
  if (standard?.mode === "resume") return standard;
  if (mission.answered >= mission.goal) return null;
  if (
    mathPrerequisiteEnabled() &&
    pilotTargetForCourse(course) &&
    (!course.plan?.enabled || mission.goal - mission.answered < 5)
  )
    return null;
  const prerequisite = expeditionCoursePrerequisiteDecision(state, now);
  if (prerequisite) return prerequisiteRecommendation(prerequisite);
  if (standard && explorerUnitForSection(standard.sectionId) === mission.unitId)
    return standard;
  const sectionId = course.learner.session?.sectionId;
  return sectionId
    ? {
        sectionId,
        mode: "review" as const,
        reason: "오늘 시작한 학습의 남은 문제를 이어 풀어요.",
      }
    : null;
}

/** The same decision supplies the displayed recommendation and its write guard. */
export function expeditionCoursePrerequisiteDecision(
  state: StoredSrsState,
  now: Date,
) {
  const course = state.course;
  if (!course) return null;
  const mission = open(state);
  if (mission && mission.kind !== "elementary") return null;
  const decision = mission
    ? coursePrerequisiteDecision(course, now, {
        goal: mission.goal,
        answered: mission.answered,
      })
    : coursePrerequisiteDecision(course, now);
  if (
    mission &&
    decision &&
    (explorerUnitForSection(decision.sectionId) !== mission.unitId ||
      explorerUnitForSection(decision.targetSectionId) !== mission.unitId)
  )
    return null;
  return decision;
}

export function expeditionInitialPrerequisiteDecision(
  state: StoredSrsState,
  plan: ExpeditionPlan,
  now: Date,
) {
  if (plan.kind !== "elementary" || !state.course) return null;
  const decision = coursePrerequisiteDecision(state.course, now, {
    goal: plan.goal,
    answered: 0,
  });
  return decision &&
    explorerUnitForSection(decision.sectionId) === plan.unitId &&
    explorerUnitForSection(decision.targetSectionId) === plan.unitId
    ? decision
    : null;
}

/** A teacher may edit the course plan; the frozen mission keeps its own unit and goal. */
export type ExpeditionWriter = { teacher?: boolean };

/** Central write guard and progress evaluator: source completion alone never awards. */
export function updateExpedition(
  previous: StoredSrsState,
  next: StoredSrsState,
  now: Date,
  writer: ExpeditionWriter = {},
): StoredSrsState {
  const expedition = next.expedition ?? initialExpedition(previous, now);
  next = { ...next, expedition };
  let mission = expedition.mission;
  if (!mission || mission.status === "complete") return next;
  const prior = open(previous);
  if (prior) {
    const settingsChanged =
      (!writer.teacher && !equal(previous.course?.plan, next.course?.plan)) ||
      previous.explorers?.profile.grade !== next.explorers?.profile.grade ||
      previous.explorers?.profile.definitions?.courseGrade !==
        next.explorers?.profile.definitions?.courseGrade ||
      previous.explorers?.profile.definitions?.goalUnitId !==
        next.explorers?.profile.definitions?.goalUnitId;
    if (settingsChanged)
      throw new SrsConflict(
        "시작한 오늘의 학습과 오답 복습을 마친 뒤 목표를 바꿔 주세요.",
      );
    // A teacher's plan edit may pass a concept or bank mission too — only the plan and start section may differ.
    const teacherPlanEdit =
      writer.teacher &&
      equal(withoutPlan(previous.course), withoutPlan(next.course));
    if (
      prior.kind !== "elementary" &&
      !teacherPlanEdit &&
      !equal(previous.course, next.course)
    )
      throw new SrsConflict("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
    if (
      prior.kind !== "middle" &&
      (!equal(previous.missions, next.missions) ||
        !equal(previous.memories, next.memories))
    )
      throw new SrsConflict("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
    // 보충 카드(D-147)는 오늘의 탐험 밖 — 미션이 열린 동안(은행 날 포함)에는 보충 칸을 바꾸지 않는다.
    if (
      !equal(
        previous.explorers?.profile.supplements,
        next.explorers?.profile.supplements,
      )
    )
      throw new SrsConflict("오늘의 탐험을 마친 뒤 해 볼 수 있어요.");
    const before = previous.explorers?.profile.definitions;
    const after = next.explorers?.profile.definitions;
    if (
      prior.kind !== "explorers" &&
      (!equal(before?.session, after?.session) ||
        !equal(before?.cards, after?.cards))
    )
      throw new SrsConflict("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
    if (
      prior.kind === "explorers" &&
      after?.session?.id !== prior.sourceSessionId
    )
      throw new SrsConflict("시작한 개념 활동을 끝까지 이어 풀어 주세요.");
    if (
      prior.kind === "middle" &&
      (!equal(
        previous.missions.filter((m) => m.id !== prior.sourceSessionId),
        next.missions.filter((m) => m.id !== prior.sourceSessionId),
      ) ||
        !next.missions.some((m) => m.id === prior.sourceSessionId))
    )
      throw new SrsConflict("시작한 복습의 오답까지 마쳐 주세요.");
    if (
      prior.kind === "elementary" &&
      next.course?.learner.session?.id !== previous.course?.learner.session?.id
    ) {
      const recommendation = expeditionCourseRecommendation(previous, now);
      const added = next.course?.learner.session;
      const old = previous.course?.learner.session;
      if (
        !old?.completedAt ||
        (old.retry && !old.retry.completedAt) ||
        !added ||
        prior.answered >= prior.goal ||
        !recommendation ||
        recommendation.mode === "resume" ||
        added.sectionId !== recommendation.sectionId ||
        added.mode !== recommendation.mode
      )
        throw new SrsConflict(
          "오늘의 학습에서 안내한 다음 문제를 이어 풀어 주세요.",
        );
      mission = {
        ...mission,
        sourceSessionId: added.id,
        sourceSessionIds: [...mission.sourceSessionIds, added.id],
        references: [
          ...mission.references,
          reference(next, "elementary", added.id),
        ],
      };
    }
  }
  let answered = 0,
    remaining = 0,
    finished = true;
  if (mission.kind === "explorers") {
    const session = next.explorers?.profile.definitions?.session;
    if (!session || session.id !== mission.sourceSessionId)
      throw new SrsConflict("개념 학습 기록을 다시 불러와 주세요.");
    // An explicit retry-unresolved continuation reopens only the leftover tasks:
    // the original 15 stay answered, and the reopened queue is still owed.
    const reopened = session.round > 0 || !!session.continuation;
    answered = reopened || session.done ? mission.goal : session.index;
    remaining = session.done
      ? session.unresolved.length
      : reopened
        ? session.queue.length - session.index + session.next.length
        : session.next.length;
    finished =
      !session.reviewOnly && session.done && !session.unresolved.length;
  } else
    for (const ref of mission.references) {
      if (mission.kind === "middle") {
        const session = next.missions.find((m) => m.id === ref.id);
        if (!session) {
          finished = false;
          continue;
        }
        answered += session.attempts.length;
        remaining += session.attempts.filter(
          (a) =>
            !a.correct &&
            !session.resolvedRetryProblemIds?.includes(a.problemId),
        ).length;
        finished &&= !!session.completedAt;
      } else {
        const session =
          next.course && findStoredCourseSession(next.course, ref.id);
        if (!session) {
          finished = false;
          continue;
        }
        answered += session.attempts.length;
        // A problem resolved right after its wrong answer is not asked again today.
        remaining +=
          session.retry?.pendingProblemIds.length ??
          session.attempts.filter(
            (a) =>
              !a.correct &&
              !session.followUps?.some((f) => f.problemId === a.problemId),
          ).length;
        finished &&=
          !!session.completedAt &&
          (!session.retry || !!session.retry.completedAt);
      }
    }
  const complete = finished && answered >= mission.goal && remaining === 0;
  mission = {
    ...mission,
    answered,
    retryRemaining: remaining,
    status: complete
      ? "complete"
      : answered >= mission.goal && remaining
        ? "retry"
        : "active",
    completedAt: complete ? now.toISOString() : null,
  };
  const ledger = { ...expedition, mission };
  const date = kstDateOf(now);
  if (
    complete &&
    mission.awardEligible &&
    !completionDates(ledger).includes(date)
  ) {
    // The concept engine keys its replay days by date, one per date. If an
    // unassigned session already filled today's slot, replay that day instead
    // of refusing a genuinely finished mission forever.
    const engineDays = next.explorers?.completedDays ?? [];
    const dayId =
      mission.kind === "explorers"
        ? (
            engineDays.find((d) => d.sessionId === mission.sourceSessionId) ??
            engineDays.find((d) => d.date === date)
          )?.date
        : `expedition:${mission.id}`;
    if (!dayId) throw new SrsConflict("완료한 학습 기록을 확인할 수 없어요.");
    const review = {
      kind: mission.kind,
      dayId,
      title: mission.title,
      subtitle: mission.subtitle,
      reviewCount: mission.goal,
    };
    // D-144 한 칸 보장 — 이 미션이 이미 준 카드 레벨 별(개념 세션, 은행은 0)이 3보다 적으면 3까지 채운다.
    // 칸과 같은 쓰기에서 한 번만: 칸은 한국 날짜당 하나 · 재풀이는 awardEligible 이 아니다.
    // 탐험 기록은 시작(`startExpedition`)이 늘 만든다 — 없으면 줄 곳이 없어 0 으로 남긴다.
    // 개념 미션이 묶인 뒤에 모은 카드만(`startStars` — 옛 화면에서 끝낸 세션을 이어받은 경우).
    const cards =
      mission.kind === "explorers"
        ? Math.max(
            0,
            (next.explorers?.profile.definitions?.session?.stars ?? 0) -
              (mission.startStars ?? 0),
          )
        : 0;
    const explorers = next.explorers;
    const bonus = explorers ? tileStarBonus(cards) : 0;
    if (explorers && bonus)
      next = {
        ...next,
        explorers: {
          ...explorers,
          profile: {
            ...explorers.profile,
            stars: explorers.profile.stars + bonus,
            earned: explorers.profile.earned + bonus,
          },
        },
      };
    ledger.awards = [
      ...ledger.awards,
      {
        missionId: mission.id,
        references: mission.references,
        day: {
          ...review,
          id: `expedition:${date}`,
          date,
          completedAt: now.toISOString(),
          reviews: [review],
        },
        stars: { cards, bonus },
      },
    ];
  }
  return { ...next, expedition: ledger };
}
