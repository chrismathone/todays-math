import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
} from "@/contracts/fading.contract";
import { fadingStateSchema } from "@/contracts/fadingApi.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingConceptDigest,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import {
  completeFadingReading,
  completeFadingStep,
  emptyFading,
  fadingRatingsFor,
  giveUpFadingCard,
  openFadingSession,
  rateFadingSession,
  reportFadingMiss,
} from "@/lib/fading/state";
import { fadingStateView } from "@/lib/fading/view";
import { updateExpedition } from "@/lib/math-explorers/expedition";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

/**
 * 결정 1 의 선택 칸 `session.gaveUpAtFour` — **읽기 판(1a)**.
 * 학생 기록의 꼴은 모르는 키를 거절한다. 그래서 이 칸을 읽고 보존하는 판이 쓰는 판(1b)보다 먼저 나간다.
 * 🔴 이 판은 이 칸을 **쓰지 않고** 평가 판정에도 **쓰지 않는다** — 읽고, 어느 쓰기 길을 지나도 글자 그대로 남길 뿐이다.
 */

function concept(id: string): FadingConcept {
  const entries: ConceptEntry[] = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ].map((definition, i) => ({
    id: `${id}${i + 1}`,
    section: "중2::4. 삼각형의 성질::삼각형의 외심",
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  return buildFadingConcepts(entries, proposeFadingGroups(entries))[0]!;
}
const A = concept("a");
const DAY1 = "2026-10-06";
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const json = (value: unknown) => JSON.stringify(value);

function chips(c: FadingConcept, step: FadingStep, seed: number) {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target): FadingPlacement => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

/** 카드 풀이를 4단계 직전까지(1 → 3단계). */
function toFour(gaveUpAtFour?: boolean): StoredFading {
  let s = openFadingSession(
    emptyFading(),
    A,
    DAY1,
    { sessionId: uuid(1), seed: 7 },
    { cards: true },
  );
  s = completeFadingReading(s, A.id, uuid(1));
  for (const step of [2, 3] as const)
    s = completeFadingStep(s, A, uuid(1), step, chips(A, step, 7));
  return gaveUpAtFour === undefined
    ? s
    : storedFadingSchema.parse({
        ...s,
        session: { ...s.session!, gaveUpAtFour },
      });
}

/** 4단계 — `skip` 의 명제는 카드째 «아직 모르겠어요», 나머지는 맞게 쓴다. */
function stepFour(state: StoredFading, skip?: string) {
  let s = state;
  const typed = erasedTargets(A, 4).flatMap((t): FadingPlacement[] =>
    skip && t.id.startsWith(`${skip}#`)
      ? []
      : [{ targetId: t.id, text: t.text }],
  );
  if (skip) s = giveUpFadingCard(s, A, uuid(1), skip, typed);
  return completeFadingStep(s, A, uuid(1), 4, typed, {
    gaveUp: skip ? true : undefined,
  });
}

describe("결정 1a — `gaveUpAtFour` 를 읽는다", () => {
  it("칸이 든 기록(푸는 중 · 평가 차례, 참 · 거짓)이 읽히고, 되쓰면 같은 글이다 — 학생 기록 전체로도", () => {
    const rating = stepFour(toFour());
    for (const base of [toFour(), rating])
      for (const gaveUpAtFour of [true, false]) {
        const record = {
          ...base,
          session: { ...base.session!, gaveUpAtFour },
        };
        const parsed = storedFadingSchema.parse(record);
        expect(json(parsed)).toBe(json(record));
        const row = parseSrsState({ ...emptySrsState(), fading: record });
        expect(json(row.fading)).toBe(json(record));
      }
  });

  it("꼴이 어긋나면 거절한다 — 참 · 거짓만", () => {
    const base = toFour();
    for (const gaveUpAtFour of ["false", 0, null])
      expect(
        storedFadingSchema.safeParse({
          ...base,
          session: { ...base.session!, gaveUpAtFour },
        }).success,
      ).toBe(false);
  });

  it("이 판의 쓰기 길은 칸을 만들지 않는다 — 카드 포기 · 4단계 틀림 · 평가까지 다 지나도", () => {
    let s = toFour();
    const seen: StoredFading[] = [s];
    const first = fadingTargets(A)[0]!;
    s = reportFadingMiss(s, A, uuid(1), {
      targetId: first.id,
      text: "빗변",
    });
    seen.push(s);
    s = stepFour(s, A.propositions[1]!.id);
    seen.push(s);
    s = rateFadingSession(s, A, uuid(1), "again", DAY1, uuid(2));
    seen.push(s);
    for (const each of seen) {
      expect(storedFadingSchema.safeParse(each).success).toBe(true);
      expect(each.session && "gaveUpAtFour" in each.session).toBeFalsy();
    }
  });
});

describe("결정 1a — `gaveUpAtFour` 를 보존한다", () => {
  it("풀이를 옮기는 함수를 지나도 칸이 글자 그대로다 — 같은 개념 다시 열기 · 4단계 틀림 · 카드 포기 · 4단계 마침", () => {
    for (const gaveUpAtFour of [true, false]) {
      const steps = toFour(gaveUpAtFour);
      expect(
        openFadingSession(steps, A, DAY1, { sessionId: uuid(9), seed: 1 }),
      ).toBe(steps);
      const missed = reportFadingMiss(steps, A, uuid(1), {
        targetId: fadingTargets(A)[0]!.id,
        text: "빗변",
      });
      expect(missed.session!.gaveUpAtFour).toBe(gaveUpAtFour);
      const skipped = giveUpFadingCard(
        missed,
        A,
        uuid(1),
        A.propositions[2]!.id,
        [],
      );
      expect(skipped.session!.gaveUpAtFour).toBe(gaveUpAtFour);
      // 4단계를 마칠 때 풀이를 새로 짓는다 — 이 칸을 빠뜨리면 안 된다.
      const done = stepFour(missed);
      expect(done.session).toMatchObject({
        phase: "rating",
        gaveUpAtFour,
        digest: fadingConceptDigest(A),
      });
      expect(storedFadingSchema.safeParse(done).success).toBe(true);
    }
  });

  it("옛 쓰기 길(하루 여정 · 통합 탐험의 갱신)을 지나도 칸이 남는다", () => {
    const record = stepFour(toFour(false));
    const previous = parseSrsState({ ...emptySrsState(), fading: record });
    const written = parseSrsState(
      updateExpedition(
        previous,
        updateDailyJourney(previous, {
          ...previous,
          missions: [...previous.missions],
        }),
        new Date("2026-10-06T03:00:00Z"),
      ),
    );
    expect(json(written.fading)).toBe(json(record));
  });

  it("평가 판정에 쓰지 않는다 — 칸이 참이든 거짓이든 없든 고를 수 있는 평가 · 닫힌 기록이 같다", () => {
    const missed = reportFadingMiss(toFour(), A, uuid(1), {
      targetId: fadingTargets(A)[0]!.id,
      text: "빗변",
    });
    const clean = stepFour(toFour());
    const partial = stepFour(missed);
    for (const base of [clean, partial]) {
      const ratings = fadingRatingsFor(base.session!, undefined, A);
      for (const gaveUpAtFour of [true, false]) {
        const marked = storedFadingSchema.parse({
          ...base,
          session: { ...base.session!, gaveUpAtFour },
        });
        expect(fadingRatingsFor(marked.session!, undefined, A)).toEqual(
          ratings,
        );
        const rating = ratings.includes("hard") ? "hard" : "again";
        expect(
          json(rateFadingSession(marked, A, uuid(1), rating, DAY1, uuid(3))),
        ).toBe(
          json(rateFadingSession(base, A, uuid(1), rating, DAY1, uuid(3))),
        );
      }
    }
    expect(fadingRatingsFor(partial.session!, undefined, A)).toEqual(["again"]);
  });
});

describe("결정 1a — 화면이 받는 응답의 꼴", () => {
  it("응답의 풀이는 이 칸을 읽을 수 있고(참 · 거짓), 이 판은 싣지 않는다", () => {
    const record = storedFadingSchema.parse({
      ...stepFour(toFour()),
      session: { ...stepFour(toFour()).session!, gaveUpAtFour: false },
    });
    const view = fadingStateView({
      fading: record,
      revision: 1,
      today: DAY1,
      concepts: new Map([[A.id, A]]),
      cards: true,
    });
    expect(view.session).not.toHaveProperty("gaveUpAtFour");
    expect(fadingStateSchema.parse(view)).toEqual(view);
    for (const gaveUpAtFour of [true, false]) {
      const arriving = {
        ...view,
        session: { ...view.session!, gaveUpAtFour },
      };
      expect(fadingStateSchema.parse(arriving)).toEqual(arriving);
    }
    expect(
      fadingStateSchema.safeParse({
        ...view,
        session: { ...view.session!, gaveUpAtFour: "true" },
      }).success,
    ).toBe(false);
  });
});
