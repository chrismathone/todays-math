import type {
  StoredFading,
  StoredFadingConcept,
} from "@/contracts/fading.contract";
import {
  FADING_VIEW_DAYS,
  type FadingCatalog,
  type FadingConceptStatus,
  type FadingState,
} from "@/contracts/fadingApi.contract";
import type { FadingTrap } from "./chips";
import { fadingTargets, type FadingConcept } from "./concepts";
import { fadingContentKey, fadingSessionToken } from "./contentKey";
import type { FadingFigure } from "./figures";
import { FADING_DAILY_CAP, daysUntilReview, forgettingRisk } from "./numbers";
import { fadingDayOfDate, previewFadingIntervals } from "./schedule";
import {
  fadingContentChanged,
  fadingProgressOf,
  fadingRatingsFor,
  fadingSolvedContentChanged,
  fadingStoredPartialMiss,
  fadingSummary,
} from "./state";

/**
 * 화면에 내려가는 꼴을 짓는다 — 저장 칸과 개념에서 (`docs/planning/srs-overhaul-20261006.md` §14).
 * 화면도 DB 도 모른다. 숫자는 전부 `numbers.ts` · `state.ts` 가 낸 것을 싣기만 한다.
 */

/** 단원별 집계 — 고른 개념이 있는 소단원만, 은행의 차례로. 은행에 없는 열쇠의 기록은 세지 않는다. */
function sectionCounts(
  fading: StoredFading,
  concepts: ReadonlyMap<string, FadingConcept>,
): FadingState["summary"]["sections"] {
  const sections = new Map<
    string,
    FadingState["summary"]["sections"][number]
  >();
  for (const [id, concept] of concepts) {
    const stored = fading.concepts[id];
    if (!stored) continue;
    const row =
      sections.get(concept.section) ??
      sections
        .set(concept.section, {
          key: concept.section,
          picked: 0,
          learned: 0,
          stepCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
        })
        .get(concept.section)!;
    row.picked += 1;
    if (stored.reviews > 0) row.learned += 1;
    row.stepCounts[stored.step] += 1;
  }
  return [...sections.values()];
}

/** 개념 하나의 상태 — 목록 · 대기열 · 풀이 머리가 같은 값을 본다. */
export function fadingConceptStatus(
  concept: FadingConcept,
  stored: StoredFadingConcept,
  today: string,
): FadingConceptStatus {
  const progress = fadingProgressOf(stored);
  const day = fadingDayOfDate(today);
  return {
    id: concept.id,
    section: concept.section,
    level: concept.level,
    ordinal: concept.ordinal,
    siblings: concept.siblings,
    terms: concept.propositions.map((p) => p.term),
    targets: fadingTargets(concept).length,
    step: stored.step,
    rated: stored.reviews > 0,
    reviews: stored.reviews,
    lapses: stored.lapses,
    addedOn: stored.addedOn,
    reviewedOn: stored.reviewedOn,
    dueOn: stored.dueOn,
    daysUntil: daysUntilReview(progress, day),
    risk: forgettingRisk(progress, day),
    changed: fadingContentChanged(stored, concept),
  };
}

/**
 * 홈 · 통계 · 풀이가 읽는 상태. `concepts` 는 은행의 개념(열쇠로) — 거기 없는 열쇠의 기록은 숫자에도 상태에도 넣지 않고,
 * 그런 개념의 풀이는 내려보내지 않는다(이어 갈 내용이 없다).
 */
export function fadingStateView(input: {
  fading: StoredFading;
  revision: number;
  today: string;
  concepts: ReadonlyMap<string, FadingConcept>;
  cap?: number;
  /** 이번 요청이 평가였으면 그 요청 번호 — 영수증을 싣는다. */
  requestId?: string;
  /** 열린 풀이의 개념의 함정 칩 — 안 주면 함정 없이 내려간다. 글만 싣는다(왜 함정인지는 채점 전에 싣지 않는다). */
  trapsOf?: (concept: FadingConcept) => readonly FadingTrap[];
  /** 열린 풀이의 개념의 그림 — 안 주거나 없으면 `null` 로 내려간다. */
  figureOf?: (concept: FadingConcept) => FadingFigure | null;
  /** 새로 여는 풀이가 카드 풀이인가(서버의 하위 문) — 켜져 있을 때만 `mode` 가 실린다. */
  cards?: boolean;
}): FadingState {
  const { fading, today, concepts } = input;
  const cap = input.cap ?? FADING_DAILY_CAP;
  const counted = fadingSummary(fading, today, {
    cap,
    known: new Set(concepts.keys()),
  });
  // 날짜는 바깥에 한 번만 싣는다.
  const summary = {
    mode: counted.mode,
    streak: counted.streak,
    learned: counted.learned,
    stepCounts: counted.stepCounts,
    queue: counted.queue,
    plan: counted.plan,
    todayCount: counted.todayCount,
    lastOn: counted.lastOn,
    idleDays: counted.idleDays,
    longBreak: counted.longBreak,
    overdue: counted.overdue,
    nextReview: counted.nextReview,
    sections: sectionCounts(fading, concepts),
  };
  const stored = fading.session
    ? fading.concepts[fading.session.conceptId]
    : undefined;
  const opened = fading.session
    ? concepts.get(fading.session.conceptId)
    : undefined;
  const session = fading.session && stored && opened ? fading.session : null;
  const shown = new Set([
    ...summary.queue.due,
    ...summary.queue.unrated,
    ...(session ? [session.conceptId] : []),
  ]);
  // 부분 틀림(결정 1)이면 «어려움»의 날 수는 2일 이하다 — 대조 전 값(«다 같은 뜻»일 때)이다. 화면은 고른 대조로 다시 자른다.
  const intervals = session
    ? previewFadingIntervals(
        fadingProgressOf(stored!),
        fadingDayOfDate(today),
        {
          partial: fadingStoredPartialMiss(session, undefined, opened!),
        },
      )
    : null;
  const traps = session ? (input.trapsOf?.(opened!) ?? []) : [];
  // 카드 풀이에서 4단계를 푼 뒤에 문장이 고쳐졌다 — 대조를 기다리는 글은 판정하지 않고(«다시»뿐) 평가는 푼 내용의 지문으로 적힌다.
  // 칩 풀이에는 싣지 않는다(문이 꺼진 동안 응답이 지금 꼴 그대로이게).
  const stale =
    session?.mode === "cards" && fadingSolvedContentChanged(session, opened!);
  return {
    today,
    revision: input.revision,
    cap,
    summary,
    concepts: Object.fromEntries(
      [...shown].map((id) => [
        id,
        fadingConceptStatus(concepts.get(id)!, fading.concepts[id]!, today),
      ]),
    ),
    session: session
      ? {
          // 저장 번호가 아니라 «저장 번호 + 지금 내용»의 토큰 — 내용이 바뀐 뒤의 옛 화면 요청을 알아본다(`contentKey.ts`).
          id: fadingSessionToken(session.id, fadingContentKey(opened!, traps)),
          conceptId: session.conceptId,
          startStep: session.startStep,
          step: stored!.step,
          seed: session.seed,
          phase: session.phase,
          missedAtFour: session.missedAtFour,
          ratings: fadingRatingsFor(session, undefined, opened!).map(
            (rating) => ({
              rating,
              intervalDays: intervals![rating],
            }),
          ),
          // 카드 풀이의 칸 — 값이 없으면 키도 싣지 않는다(지금 화면이 받는 꼴 그대로).
          ...(session.mode === "cards" ? { mode: "cards" as const } : {}),
          ...(session.unjudged?.length
            ? { unjudged: session.unjudged.map((u) => ({ ...u })) }
            : {}),
          ...(stale ? { stale: true as const } : {}),
          // 4단계의 포기 여부(결정 1) — 카드 풀이에 적혀 있을 때만 싣는다(칩 풀이 · 옛 풀이는 키가 없다).
          ...(session.mode === "cards" && session.gaveUpAtFour !== undefined
            ? { gaveUpAtFour: session.gaveUpAtFour }
            : {}),
        }
      : null,
    opened: session
      ? {
          concept: opened!,
          traps: traps.map((trap) => ({ text: trap.text })),
          figure: input.figureOf?.(opened!) ?? null,
        }
      : null,
    days: fading.days.slice(-FADING_VIEW_DAYS),
    receipt:
      fading.receipts.find((r) => r.requestId === input.requestId) ?? null,
    ...(input.cards ? { mode: "cards" as const } : {}),
  };
}

const gradeOf = (concept: FadingConcept) => concept.section.split("::")[0]!;

/** 은행에 있는 학년 — 처음 나온 차례. */
export function fadingGrades(concepts: readonly FadingConcept[]): string[] {
  return [...new Set(concepts.map(gradeOf))];
}

const EXPLORER_GRADES = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"];

/** 개념 목록을 처음 열 때의 학년 — 저장된 탐험 학년(3 ~ 9), 없으면 반 학년, 그것도 은행에 없으면 은행의 첫 학년. */
export function fadingDefaultGrade(
  grades: readonly string[],
  hints: { explorerGrade?: number | null; classGrade?: string | null },
): string {
  const candidates = [
    hints.explorerGrade ? EXPLORER_GRADES[hints.explorerGrade - 3] : undefined,
    hints.classGrade ?? undefined,
  ];
  return candidates.find((g) => g && grades.includes(g)) ?? grades[0]!;
}

/** 개념 목록 — 학년 하나의 소단원과 그 개념들(은행 차례), 개념마다 내 상태. */
export function fadingCatalogView(input: {
  grade: string;
  concepts: readonly FadingConcept[];
  fading: StoredFading;
  today: string;
}): FadingCatalog {
  const day = fadingDayOfDate(input.today);
  const sections = new Map<string, FadingCatalog["sections"][number]>();
  for (const concept of input.concepts) {
    if (gradeOf(concept) !== input.grade) continue;
    const [, chapter, unit] = concept.section.split("::");
    const section =
      sections.get(concept.section) ??
      sections
        .set(concept.section, {
          key: concept.section,
          chapter: chapter!,
          unit: unit!,
          concepts: [],
        })
        .get(concept.section)!;
    const stored = input.fading.concepts[concept.id];
    section.concepts.push({
      id: concept.id,
      level: concept.level,
      ordinal: concept.ordinal,
      siblings: concept.siblings,
      terms: concept.propositions.map((p) => p.term),
      propositions: concept.propositions.length,
      targets: fadingTargets(concept).length,
      status: stored
        ? {
            step: stored.step,
            rated: stored.reviews > 0,
            dueOn: stored.dueOn,
            daysUntil: daysUntilReview(fadingProgressOf(stored), day),
            risk: forgettingRisk(fadingProgressOf(stored), day),
          }
        : null,
    });
  }
  return {
    grade: input.grade,
    grades: fadingGrades(input.concepts),
    sections: [...sections.values()],
  };
}
