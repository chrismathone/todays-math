import type {
  ExpeditionPlan, MathExpedition, StoredExpedition, StoredExpeditionMission,
} from "@/contracts/mathExpedition.contract";
import type { StoredExplorer } from "@/contracts/mathExplorers.contract";
import { kstDateOf } from "@/lib/kstDate";
import { courseSummary, findStoredCourseSession } from "@/lib/math-srs/courseAutomation";
import { dailyJourneyLedger } from "@/lib/math-srs/dailyJourney";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { currentSrsMission, SrsConflict, type StoredSrsState } from "@/lib/math-srs/serverState";
import { definitionCards, definitionDue, definitionUnits } from "./definition-cards";
import { bankKindForExplorerUnit, bankSectionsForExplorerUnit, explorerUnitForSection } from "./curriculumBridge";
import { createExplorerState } from "./engine";
import { legacyExpeditionJourney } from "./expeditionJourney";

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const gradeLabel = (grade: number) => grade < 7 ? `초등 ${grade}학년` : `중학교 ${grade - 6}학년`;
const open = (state: StoredSrsState) => state.expedition?.mission && state.expedition.mission.status !== "complete" ? state.expedition.mission : null;

/** Old verified achievements are imported once, before a new assignment starts. */
export function initialExpedition(state: StoredSrsState, now: Date): StoredExpedition {
  return state.expedition ?? { version: 1, initializedAt: now.toISOString(), mission: null,
    legacyDays: legacyExpeditionJourney(state, now).days, awards: [], receipts: [] };
}

/** New accounts inherit the already configured course. Existing choices are preserved. */
export function initialOwnedExplorer(state: StoredSrsState, studentId: string, now: Date): StoredExplorer {
  if (state.explorers) return state.explorers;
  const sectionId = state.course ? courseSummary(state.course, now).currentSectionId : null;
  const section = sectionId ? getCourseSection(sectionId) : null;
  const unitId = sectionId ? explorerUnitForSection(sectionId) : null;
  const middleActive = state.missions.some((m) => !m.completedAt);
  const explorer = createExplorerState(studentId, section?.grade ?? (middleActive ? 7 : 3));
  if (unitId || middleActive) explorer.profile.definitions = {
    courseGrade: section?.grade ?? 7, ...(middleActive && !unitId ? {goalUnitId: "g7-equation"} : {}), runs: 0, cards: {}, history: [],
  };
  return explorer;
}

function unitPlan(unitId: string, route: ExpeditionPlan["route"] = "unit"): ExpeditionPlan {
  const unit = definitionUnits.find((u) => u.id === unitId)!;
  return { kind: "explorers", route, unitId, title: route === "memory" ? "기억 복습" : route === "repair" ? `${unit.title} 연결 복습` : unit.title,
    subtitle: gradeLabel(unit.grade), goal: 15 };
}
function elementaryPlan(sectionId: string): ExpeditionPlan {
  const section = getCourseSection(sectionId)!;
  return { kind: "elementary", route: "bank", unitId: explorerUnitForSection(sectionId) ?? sectionId,
    title: section.chapterTitle, subtitle: `${gradeLabel(section.grade)} · ${section.title}`, goal: 10 };
}
const middlePlan = (): ExpeditionPlan => ({ kind: "middle", route: "bank", unitId: "g7-equation", title: "일차방정식", subtitle: "중학교 1학년", goal: 12 });

/** A saved unfinished source always precedes assigning another workload. */
function unfinished(state: StoredSrsState, now: Date): { plan: ExpeditionPlan; id: string; at: string } | null {
  const candidates: { plan: ExpeditionPlan; id: string; at: string }[] = [];
  const course = state.course;
  const session = course?.learner.session;
  if (course && session) {
    const summary = courseSummary(course, now);
    if (!session.completedAt || (session.retry && !session.retry.completedAt) || (summary.todayAnswered > 0 && summary.todayAnswered < summary.todayGoal))
      candidates.push({ plan: elementaryPlan(session.sectionId), id: session.id, at: session.startedAt });
  }
  for (const m of state.missions) if (!m.completedAt || m.attempts.some((a) => !a.correct && !m.resolvedRetryProblemIds?.includes(a.problemId)))
    candidates.push({ plan: middlePlan(), id: m.id, at: m.startedAt });
  const s = state.explorers?.profile.definitions?.session;
  if (s && !s.reviewOnly && (!s.done || s.unresolved.length)) candidates.push({ plan: unitPlan(s.unit, s.route ?? "unit"), id: s.id, at: `${s.date}T00:00:00.000Z` });
  return candidates.sort((a, b) => a.at.localeCompare(b.at))[0] ?? null;
}

export function planExpedition(state: StoredSrsState, studentId: string, now: Date): ExpeditionPlan {
  const active = open(state);
  if (active) return active;
  const pending = unfinished(state, now);
  if (pending) return pending.plan;
  const explorer = initialOwnedExplorer(state, studentId, now);
  const profile = explorer.profile;
  const record = profile.definitions;
  const date = kstDateOf(now);
  const due = definitionDue(profile, date);
  const overdue = due.some((card) => Date.parse(`${date}T00:00:00Z`) - Date.parse(`${record!.cards[card.id].due}T00:00:00Z`) >= 3 * 86_400_000);
  if (state.expedition?.mission?.route !== "memory" && (due.length >= 5 || overdue)) return unitPlan(due[0].unit, "memory");
  const course = state.course;
  const summary = course ? courseSummary(course, now) : null;
  const mappedUnit = summary?.currentSectionId ? explorerUnitForSection(summary.currentSectionId) : null;
  // A saved explicit goal wins; otherwise follow the existing course cursor.
  // Never scan the entire catalogue for the first uncollected concept.
  const unitId = record?.goalUnitId ?? mappedUnit ?? definitionUnits.find((u) => u.grade === (record?.courseGrade ?? profile.grade))!.id;
  if (definitionCards.some((card) => card.unit === unitId && !record?.cards[card.id]?.level)) return unitPlan(unitId);
  const bankKind = bankKindForExplorerUnit(unitId);
  if (bankKind === "elementary")
    return elementaryPlan(mappedUnit === unitId && summary?.currentSectionId ? summary.currentSectionId : bankSectionsForExplorerUnit(unitId)[0]);
  if (bankKind === "middle") return middlePlan();
  return unitPlan(unitId);
}

function completionDates(expedition: StoredExpedition) {
  return [...expedition.legacyDays.map((day) => day.date), ...expedition.awards.map((award) => award.day.date)];
}
export function expeditionDto(state: StoredSrsState, studentId: string, now: Date): MathExpedition {
  const ledger = initialExpedition(state, now);
  const complete = completionDates(ledger).includes(kstDateOf(now));
  const mission = ledger.mission;
  const canStart = !!open(state) || !!unfinished(state, now) || !complete;
  return { mission: mission ? (({ awardEligible: _a, references: _r, ...publicMission }) => publicMission)(mission) : null,
    next: canStart && !open(state) ? planExpedition(state, studentId, now) : null,
    completedToday: complete, canStart };
}

function reference(state: StoredSrsState, kind: ExpeditionPlan["kind"], id: string): StoredExpeditionMission["references"][number] {
  if (kind === "elementary") {
    const session = state.course && findStoredCourseSession(state.course, id);
    if (!session) throw new SrsConflict("이어 풀 학습 기록을 다시 불러와 주세요.");
    return { id, problemIds: session.problems.map((p) => p.id), unitIds: session.problems.map(() => session.sectionId) };
  }
  if (kind === "middle") {
    const session = state.missions.find((m) => m.id === id);
    if (!session) throw new SrsConflict("이어 풀 학습 기록을 다시 불러와 주세요.");
    return { id, problemIds: session.problems.map((p) => p.id), unitIds: session.problems.map((p) => p.conceptId) };
  }
  return { id, problemIds: [], unitIds: [state.explorers!.profile.definitions!.session!.unit] };
}

/** Bind the generated/resumed source and its workload in the same CAS write. */
export function bindExpedition(previous: StoredSrsState, source: StoredSrsState, plan: ExpeditionPlan, now: Date, id: string, requestId: string): StoredSrsState {
  const ledger = initialExpedition(previous, now);
  const existing = open(previous);
  if (existing) return { ...source, expedition: { ...ledger, receipts: [...ledger.receipts, { requestId, actionKey: "expedition-start", missionId: existing.id }].slice(-128) } };
  const sourceId = plan.kind === "elementary" ? source.course!.learner.session!.id : plan.kind === "middle" ? currentSrsMission(source, now)!.id : source.explorers!.profile.definitions!.session!.id;
  let ids = [sourceId];
  if (plan.kind === "elementary") {
    const active = source.course!.learner.session!;
    const sourceDate = kstDateOf(new Date(active.startedAt));
    const day = dailyJourneyLedger(previous).elementary.find((d) => d.date === sourceDate && !d.completedAt);
    ids = [...new Set([...(day?.references.map((r) => r.id) ?? []), sourceId])];
  }
  const mission: StoredExpeditionMission = { ...plan, id, date: kstDateOf(now), answered: 0, retryRemaining: 0, status: "active", sourceSessionId: sourceId,
    sourceSessionIds: ids, startedAt: now.toISOString(), completedAt: null,
    awardEligible: !(plan.kind === "explorers" && source.explorers!.profile.definitions!.session!.reviewOnly),
    references: ids.map((sourceId) => reference(source, plan.kind, sourceId)) };
  return { ...source, expedition: { ...ledger, mission, receipts: [...ledger.receipts, {requestId, actionKey: "expedition-start", missionId: id}].slice(-128) } };
}

export function expeditionStartDuplicate(state: StoredSrsState, requestId: string): boolean {
  if (state.explorers?.receipts.some((receipt) => receipt.requestId === requestId)) throw new SrsConflict("같은 요청 번호로 다른 학습을 시작할 수 없어요.");
  return !!state.expedition?.receipts.some((receipt) => receipt.requestId === requestId);
}

export function expeditionCourseRecommendation(state: StoredSrsState, now: Date) {
  const course = state.course;
  if (!course) return null;
  const standard = courseSummary(course, now).recommendation;
  const mission = open(state);
  if (mission?.kind !== "elementary") return standard;
  if (standard?.mode === "resume") return standard;
  if (mission.answered >= mission.goal) return null;
  if (standard && explorerUnitForSection(standard.sectionId) === mission.unitId) return standard;
  const sectionId = course.learner.session?.sectionId;
  return sectionId ? { sectionId, mode: "review" as const, reason: "오늘 시작한 학습의 남은 문제를 이어 풀어요." } : null;
}

/** Central write guard and progress evaluator: source completion alone never awards. */
export function updateExpedition(previous: StoredSrsState, next: StoredSrsState, now: Date): StoredSrsState {
  const expedition = next.expedition ?? initialExpedition(previous, now);
  next = { ...next, expedition };
  let mission = expedition.mission;
  if (!mission || mission.status === "complete") return next;
  const prior = open(previous);
  if (prior) {
    const settingsChanged = !equal(previous.course?.plan, next.course?.plan) || previous.explorers?.profile.grade !== next.explorers?.profile.grade ||
      previous.explorers?.profile.definitions?.courseGrade !== next.explorers?.profile.definitions?.courseGrade || previous.explorers?.profile.definitions?.goalUnitId !== next.explorers?.profile.definitions?.goalUnitId;
    if (settingsChanged) throw new SrsConflict("시작한 오늘의 학습과 오답 복습을 마친 뒤 목표를 바꿔 주세요.");
    if (prior.kind !== "elementary" && !equal(previous.course, next.course)) throw new SrsConflict("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
    if (prior.kind !== "middle" && (!equal(previous.missions, next.missions) || !equal(previous.memories, next.memories))) throw new SrsConflict("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
    const before = previous.explorers?.profile.definitions;
    const after = next.explorers?.profile.definitions;
    if (prior.kind !== "explorers" && (!equal(before?.session, after?.session) || !equal(before?.cards, after?.cards))) throw new SrsConflict("진행 중인 오늘의 학습을 먼저 마쳐 주세요.");
    if (prior.kind === "explorers" && after?.session?.id !== prior.sourceSessionId) throw new SrsConflict("시작한 개념 활동을 끝까지 이어 풀어 주세요.");
    if (prior.kind === "middle" && (!equal(previous.missions.filter((m) => m.id !== prior.sourceSessionId), next.missions.filter((m) => m.id !== prior.sourceSessionId)) || !next.missions.some((m) => m.id === prior.sourceSessionId))) throw new SrsConflict("시작한 복습의 오답까지 마쳐 주세요.");
    if (prior.kind === "elementary" && next.course?.learner.session?.id !== previous.course?.learner.session?.id) {
      const recommendation = expeditionCourseRecommendation(previous, now);
      const added = next.course?.learner.session;
      const old = previous.course?.learner.session;
      if (!old?.completedAt || (old.retry && !old.retry.completedAt) || !added || prior.answered >= prior.goal || !recommendation || recommendation.mode === "resume" || added.sectionId !== recommendation.sectionId || added.mode !== recommendation.mode)
        throw new SrsConflict("오늘의 학습에서 안내한 다음 문제를 이어 풀어 주세요.");
      mission = { ...mission, sourceSessionId: added.id, sourceSessionIds: [...mission.sourceSessionIds, added.id], references: [...mission.references, reference(next, "elementary", added.id)] };
    }
  }
  let answered = 0, remaining = 0, finished = true;
  if (mission.kind === "explorers") {
    const session = next.explorers?.profile.definitions?.session;
    if (!session || session.id !== mission.sourceSessionId) throw new SrsConflict("개념 학습 기록을 다시 불러와 주세요.");
    answered = session.round > 0 || session.done ? mission.goal : session.index;
    remaining = session.done ? session.unresolved.length : session.round > 0 ? session.queue.length - session.index + session.next.length : session.next.length;
    finished = !session.reviewOnly && session.done && !session.unresolved.length;
  } else for (const ref of mission.references) {
    if (mission.kind === "middle") {
      const session = next.missions.find((m) => m.id === ref.id);
      if (!session) { finished = false; continue; }
      answered += session.attempts.length;
      remaining += session.attempts.filter((a) => !a.correct && !session.resolvedRetryProblemIds?.includes(a.problemId)).length;
      finished &&= !!session.completedAt;
    } else {
      const session = next.course && findStoredCourseSession(next.course, ref.id);
      if (!session) { finished = false; continue; }
      answered += session.attempts.length;
      remaining += session.retry?.pendingProblemIds.length ?? session.attempts.filter((a) => !a.correct).length;
      finished &&= !!session.completedAt && (!session.retry || !!session.retry.completedAt);
    }
  }
  const complete = finished && answered >= mission.goal && remaining === 0;
  mission = { ...mission, answered, retryRemaining: remaining, status: complete ? "complete" : answered >= mission.goal && remaining ? "retry" : "active", completedAt: complete ? now.toISOString() : null };
  const ledger = { ...expedition, mission };
  const date = kstDateOf(now);
  if (complete && mission.awardEligible && !completionDates(ledger).includes(date)) {
    const dayId = mission.kind === "explorers" ? next.explorers!.completedDays.find((d) => d.sessionId === mission.sourceSessionId)?.date : `expedition:${mission.id}`;
    if (!dayId) throw new SrsConflict("완료한 학습 기록을 확인할 수 없어요.");
    const review = { kind: mission.kind, dayId, title: mission.title, subtitle: mission.subtitle, reviewCount: mission.goal };
    ledger.awards = [...ledger.awards, { missionId: mission.id, references: mission.references, day: { ...review, id: `expedition:${date}`, date, completedAt: now.toISOString(), reviews: [review] } }];
  }
  return { ...next, expedition: ledger };
}
