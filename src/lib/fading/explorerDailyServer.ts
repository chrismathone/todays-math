import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";
import { kstDateOf } from "@/lib/kstDate";
import {
  expeditionDto,
  expeditionLearning,
} from "@/lib/math-explorers/expedition";
import type { StoredSrsState } from "@/lib/math-srs/serverState";
import type { FadingConcept } from "./concepts";
import {
  buildFadingDailyPlan,
  type FadingDailyWorkload,
  type FadingPrerequisiteBasis,
} from "./explorerDaily";
import {
  fadingPrerequisiteBasis,
  sectionKeyOfBridgeSection,
  sectionKeysOfExplorerUnit,
} from "./prerequisites";
import { emptyFading } from "./state";

/**
 * 학생 기록 한 줄에서 «오늘 할 일»의 재료를 읽는다 — 탐험의 오늘 분량 · 오늘 배우는 것 · 선수 개념의 근거.
 *
 * 🔴 읽기만 한다. 탐험의 분량 · 추천 · 칸은 탐험의 함수(`expeditionDto` · `expeditionLearning`)가 낸 그대로이고 여기서 다시 세지 않는다.
 * 탐험을 시작하거나 칸을 주는 것도 탐험의 길이 한다 — 이 파일은 어느 칸도 쓰지 않는다.
 */

/** 탐험의 오늘 한 덩이 — 풀던 미션 → 오늘 끝낸 미션 → 오늘 시작할 계획. 낼 것이 없으면 `null`. */
export function fadingDailyWorkload(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): FadingDailyWorkload | null {
  const today = kstDateOf(now);
  const dto = expeditionDto(state, studentId, now);
  const mission = dto.mission;
  if (mission && mission.status !== "complete")
    return {
      kind: mission.kind,
      route: mission.route,
      unitId: mission.unitId,
      title: mission.title,
      subtitle: mission.subtitle,
      goal: mission.goal,
      answered: mission.answered,
      retryRemaining: mission.retryRemaining,
      status: mission.status,
      canStart: true,
    };
  if (dto.completedToday) {
    // 오늘의 칸 — 방금 끝낸 미션이면 그 미션의 값, 아니면 칸의 기록(옮겨 온 옛 날 포함)이 말하는 만큼.
    if (
      mission?.completedAt &&
      kstDateOf(new Date(mission.completedAt)) === today
    )
      return {
        kind: mission.kind,
        route: mission.route,
        unitId: mission.unitId,
        title: mission.title,
        subtitle: mission.subtitle,
        goal: mission.goal,
        answered: mission.goal,
        retryRemaining: 0,
        status: "complete",
        canStart: false,
      };
    const day = [
      ...(state.expedition?.awards.map((award) => award.day) ?? []),
      ...(state.expedition?.legacyDays ?? []),
    ].find((entry) => entry.date === today);
    if (!day) return null;
    const goal = day.reviews.reduce((n, review) => n + review.reviewCount, 0);
    return {
      kind: day.kind,
      // 칸의 기록에는 길(route)이 없다 — 복습하는 날이었는지 알 수 없어 새 진도로 둔다.
      route: "bank",
      unitId: day.dayId,
      title: day.title,
      subtitle: day.subtitle,
      goal,
      answered: goal,
      retryRemaining: 0,
      status: "complete",
      canStart: false,
    };
  }
  const next = dto.next;
  if (!next) return null;
  return {
    kind: next.kind,
    route: next.route,
    unitId: next.unitId,
    title: next.title,
    subtitle: next.subtitle,
    goal: next.goal,
    answered: 0,
    retryRemaining: 0,
    status: "next",
    canStart: dto.canStart,
    ...(dto.canStart
      ? {}
      : dto.prerequisiteContext?.kind === "unavailable"
        ? { blockedReason: dto.prerequisiteContext.reason }
        : {}),
  };
}

/**
 * 오늘 배우는 것 — 탐험이 정한 학습 목표(`expeditionLearning` · 복습하는 날에도 «지금 배우는 단원»이다).
 * 초등 문제은행 날이면 그 코스 소단원, 그 밖은 탐험 단원이다. 새 진도의 소단원은 같은 교육과정 열쇠로 이어진 것만 낸다.
 */
export function fadingDailyLearning(
  state: StoredSrsState,
  studentId: string,
  now: Date,
  concepts: ReadonlyMap<string, FadingConcept>,
): {
  prerequisite: FadingPrerequisiteBasis | null;
  progressSections: string[];
} {
  const learning = expeditionLearning(state, studentId, now);
  const section =
    learning.plan.kind === "elementary" ? learning.sectionId : null;
  const sectionKey = section ? sectionKeyOfBridgeSection(section) : null;
  return {
    prerequisite: fadingPrerequisiteBasis(
      section
        ? { courseSectionId: section }
        : { explorerUnitId: learning.unitId },
      {
        concepts: concepts.values(),
        today: kstDateOf(now),
        now,
        record: state.explorers?.profile.definitions,
        course: state.course ?? null,
      },
    ),
    progressSections: sectionKey
      ? [sectionKey]
      : section
        ? []
        : sectionKeysOfExplorerUnit(learning.unitId),
  };
}

/** 학생 기록 → «오늘 할 일». `expedition: false` 면 탐험을 읽지 않고 «오늘의 기억»만으로 짓는다. */
export function serverFadingDailyPlan(input: {
  state: StoredSrsState;
  studentId: string;
  now: Date;
  concepts: ReadonlyMap<string, FadingConcept>;
  quota?: number;
  expedition?: boolean;
}): FadingDailyPlan {
  const { state, studentId, now, concepts } = input;
  const integrated = input.expedition !== false;
  const learning = integrated
    ? fadingDailyLearning(state, studentId, now, concepts)
    : null;
  return buildFadingDailyPlan({
    today: kstDateOf(now),
    fading: state.fading ?? emptyFading(),
    concepts,
    quota: input.quota,
    workload: integrated ? fadingDailyWorkload(state, studentId, now) : null,
    prerequisite: learning?.prerequisite ?? null,
    progressSections: learning?.progressSections ?? [],
  });
}
