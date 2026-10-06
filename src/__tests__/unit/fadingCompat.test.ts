import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_MARKS_MAX,
  FADING_TARGETS_MAX,
  FADING_TYPED_MAX,
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
} from "@/contracts/fading.contract";
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
  FadingConflict,
  completeFadingReading,
  completeFadingStep,
  dropFadingConcept,
  emptyFading,
  fadingRatingsFor,
  openFadingSession,
  rateFadingSession,
  reportFadingMiss,
} from "@/lib/fading/state";
import {
  fadingConceptResponseSchema,
  fadingStateResponseSchema,
} from "@/contracts/fadingApi.contract";
import { fadingConceptStatus, fadingStateView } from "@/lib/fading/view";
import { updateExpedition } from "@/lib/math-explorers/expedition";
import { updateDailyJourney } from "@/lib/math-srs/dailyJourney";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

/**
 * 저장 칸의 **읽기 호환** — 선택 칸(풀이의 방식 · 지문 · 카드 진단 · 대조를 기다리는 글 · 개념의 진단)을 읽고 보존하는 판.
 * 🔴 이 판은 새 칸을 **쓰지 않는다**. 옛 꼴은 글자 하나 다르지 않게 읽고 되쓰고, 새 칸이 든 기록은 어느 쓰기 길을 지나도 남는다.
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
const SEED = 77;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

/** 옛 판이 쓴 기록 그대로 — 평가한 개념 · 평가 전 개념 · 열린 풀이 · 집계 · 연속 · 영수증. */
const LEGACY: StoredFading = {
  version: 1,
  concepts: {
    [A.id]: {
      step: 4,
      stability: 3.2602,
      difficulty: 4.8846,
      reviewedOn: "2026-10-06",
      dueOn: "2026-10-09",
      digest: "0a1b2c3d",
      reviews: 1,
      lapses: 0,
      addedOn: "2026-10-06",
    },
    "b-1": {
      step: 1,
      stability: null,
      difficulty: null,
      reviewedOn: null,
      dueOn: null,
      digest: null,
      reviews: 0,
      lapses: 0,
      addedOn: "2026-10-07",
    },
  },
  session: {
    id: uuid(9),
    conceptId: A.id,
    startStep: 4,
    seed: 12,
    phase: "steps",
    missedAtFour: [`${A.id}#2`],
  },
  days: [{ date: "2026-10-06", reviews: 1, passed: 1, fresh: 1 }],
  streak: { current: 1, best: 1, lastOn: "2026-10-06" },
  allOn: null,
  receipts: [
    {
      requestId: uuid(1),
      conceptId: A.id,
      rating: "good",
      dueOn: "2026-10-09",
    },
  ],
};

/** 쓰는 판이 남길 수 있는 선택 칸을 전부 채운 기록 — 4단계를 마치고 대조를 기다리는 풀이 · 진단이 붙은 개념. */
const ARRIVING = {
  ...LEGACY,
  concepts: {
    ...LEGACY.concepts,
    [A.id]: {
      ...LEGACY.concepts[A.id]!,
      marks: {
        digest: "0a1b2c3d",
        seen: "3210",
        sure: "0123",
        missed: [`${A.id}#1`],
      },
    },
  },
  session: {
    ...LEGACY.session!,
    phase: "rating",
    mode: "cards",
    seen: "123",
    sure: "300",
    unjudged: [{ targetId: `${A.id}#3`, text: "가장 긴 변" }],
    digest: "0a1b2c3d",
  },
} as const;

const json = (value: unknown) => JSON.stringify(value);

/** 옛 판이 아는 키 — 새 칸이 없어야 할 때 이 밖의 키가 하나라도 있으면 운다. */
const LEGACY_KEYS = {
  root: [
    "version",
    "concepts",
    "session",
    "days",
    "streak",
    "allOn",
    "receipts",
  ],
  concept: [
    "step",
    "stability",
    "difficulty",
    "reviewedOn",
    "dueOn",
    "digest",
    "reviews",
    "lapses",
    "addedOn",
  ],
  session: ["id", "conceptId", "startStep", "seed", "phase", "missedAtFour"],
};
function expectLegacyShape(state: StoredFading) {
  expect(Object.keys(state).sort()).toEqual([...LEGACY_KEYS.root].sort());
  for (const stored of Object.values(state.concepts))
    expect(Object.keys(stored).sort()).toEqual([...LEGACY_KEYS.concept].sort());
  if (state.session)
    expect(Object.keys(state.session).sort()).toEqual(
      [
        ...LEGACY_KEYS.session,
        ...(state.session.digest ? ["digest"] : []),
      ].sort(),
    );
}

function placements(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

describe("읽기 호환 — 옛 기록은 글자 하나 다르지 않게", () => {
  it("옛 꼴의 기록은 그대로 읽히고, 읽은 값을 되쓰면 같은 글이다", () => {
    const parsed = storedFadingSchema.parse(LEGACY);
    expect(parsed).toStrictEqual(LEGACY);
    expect(json(parsed)).toBe(json(LEGACY));
    const row = parseSrsState({ ...emptySrsState(), fading: LEGACY });
    expect(json(row.fading)).toBe(json(LEGACY));
  });

  it("옛 풀이 전부를 지나도 새 카드 칸은 생기지 않는다 — 기존 D1의 완료 지문은 보존한다", () => {
    const B = concept("b");
    let state = openFadingSession(emptyFading(), A, DAY1, {
      sessionId: uuid(11),
      seed: SEED,
    });
    const seen: StoredFading[] = [state];
    state = completeFadingReading(state, A.id, uuid(11));
    seen.push(state);
    for (const step of [2, 3] as const) {
      state = completeFadingStep(
        state,
        A,
        uuid(11),
        step,
        placements(A, step, SEED),
      );
      seen.push(state);
    }
    const tray = chipTray(A, 4, { seed: SEED });
    const first = fadingTargets(A)[0]!;
    state = reportFadingMiss(state, A, uuid(11), {
      targetId: first.id,
      chipId: tray.find((chip) => !chipFits(A, first.id, chip))!.id,
    });
    seen.push(state);
    state = completeFadingStep(state, A, uuid(11), 4, placements(A, 4, SEED));
    seen.push(state);
    state = rateFadingSession(state, A, uuid(11), "again", DAY1, uuid(12));
    seen.push(state);
    state = openFadingSession(state, B, DAY1, { sessionId: uuid(13), seed: 3 });
    seen.push(state, dropFadingConcept(state, B.id));
    for (const each of seen) {
      expect(storedFadingSchema.safeParse(each).success).toBe(true);
      expectLegacyShape(each);
    }
  });
});

describe("읽기 호환 — 새 칸이 든 기록", () => {
  it("선택 칸이 전부 든 기록이 읽히고, 되쓰면 같은 글이다", () => {
    const parsed = storedFadingSchema.parse(ARRIVING);
    expect(parsed).toStrictEqual(ARRIVING);
    expect(json(parsed)).toBe(json(ARRIVING));
    const row = parseSrsState({ ...emptySrsState(), fading: ARRIVING });
    expect(json(row.fading)).toBe(json(ARRIVING));
  });

  it("옛 쓰기 길(하루 여정 · 통합 탐험의 갱신)을 지나도 새 칸은 글자 그대로 남는다", () => {
    const previous = parseSrsState({ ...emptySrsState(), fading: ARRIVING });
    const next = { ...previous, missions: [...previous.missions] };
    const written = parseSrsState(
      updateExpedition(
        previous,
        updateDailyJourney(previous, next),
        new Date("2026-10-06T03:00:00Z"),
      ),
    );
    expect(json(written.fading)).toBe(json(ARRIVING));
  });

  it("풀이를 옮기는 함수는 풀이의 선택 칸을 그대로 둔다 — 정독 · 4단계 틀림 · 4단계 마침 · 같은 개념 다시 열기", () => {
    const open: Record<string, unknown> = {
      ...ARRIVING.session,
      phase: "steps",
      missedAtFour: [],
    };
    delete open.unjudged;
    delete open.digest;
    const steps = storedFadingSchema.parse({ ...ARRIVING, session: open });
    const extras = {
      mode: "cards",
      seen: "123",
      sure: "300",
    };
    expect(steps.session).toMatchObject(extras);
    expect(
      openFadingSession(steps, A, "2026-10-09", {
        sessionId: uuid(20),
        seed: 1,
      }),
    ).toBe(steps);
    const tray = chipTray(A, 4, { seed: steps.session!.seed });
    const first = fadingTargets(A)[0]!;
    const missed = reportFadingMiss(steps, A, steps.session!.id, {
      targetId: first.id,
      chipId: tray.find((chip) => !chipFits(A, first.id, chip))!.id,
    });
    expect(missed.session).toStrictEqual({
      ...steps.session,
      missedAtFour: [first.id],
    });
    const done = completeFadingStep(
      missed,
      A,
      steps.session!.id,
      4,
      placements(A, 4, steps.session!.seed),
    );
    expect(storedFadingSchema.parse(done).session).toStrictEqual({
      ...missed.session,
      phase: "rating",
      digest: fadingConceptDigest(A),
    });
    // 평가 전 개념의 정독은 그 개념의 풀이에서만 — 풀이의 칸은 건드리지 않는다.
    const learning = storedFadingSchema.parse({
      ...steps,
      concepts: { ...steps.concepts, [A.id]: LEGACY.concepts["b-1"] },
      session: { ...steps.session!, startStep: 1 },
    });
    expect(
      completeFadingReading(learning, A.id, steps.session!.id).session,
    ).toBe(learning.session);
  });

  it("대조를 기다리는 글이 남은 풀이는 이 판에서 «다시»로만 닫힌다 — 판정 없이 «같은 뜻»으로 읽지 않는다", () => {
    const waiting = storedFadingSchema.parse({
      ...ARRIVING,
      session: { ...ARRIVING.session, missedAtFour: [] },
    });
    expect(fadingRatingsFor(waiting.session!)).toEqual(["again"]);
    expect(() =>
      rateFadingSession(
        waiting,
        A,
        waiting.session!.id,
        "good",
        "2026-10-09",
        uuid(30),
      ),
    ).toThrow(FadingConflict);
    const rated = storedFadingSchema.parse(
      rateFadingSession(
        waiting,
        A,
        waiting.session!.id,
        "again",
        "2026-10-09",
        uuid(30),
      ),
    );
    expect(rated.session).toBeNull();
    // 새 평가가 앞의 진단을 덮는다 — 이 판은 진단을 적지 않으므로 앞의 것이 남지 않게 걷는다.
    expect(rated.concepts[A.id]).not.toHaveProperty("marks");
    expect(rated.concepts[A.id]!.step).toBe(3);
    const view = fadingStateView({
      fading: waiting,
      revision: 3,
      today: "2026-10-09",
      concepts: new Map([[A.id, A]]),
    });
    expect(view.session!.ratings.map((r) => r.rating)).toEqual(["again"]);
    expect(Object.keys(view.session!).sort()).toEqual(
      [
        "conceptId",
        "id",
        "missedAtFour",
        "phase",
        "ratings",
        "seed",
        "startStep",
        "step",
      ].sort(),
    );
  });

  it("선택 칸의 꼴이 어긋나면 거절한다 — 상한 · 글자 · 겹침 · 평가 전 진단 · 4단계 밖의 대조 · 모르는 키", () => {
    const reject = (patch: { session?: object; concept?: object }) =>
      expect(
        storedFadingSchema.safeParse({
          ...ARRIVING,
          session: { ...ARRIVING.session, ...patch.session },
          concepts: {
            ...ARRIVING.concepts,
            [A.id]: { ...ARRIVING.concepts[A.id], ...patch.concept },
          },
        }).success,
      ).toBe(false);
    reject({ session: { mode: "typed" } });
    reject({ session: { digest: "0a1b2c3d." } });
    reject({ session: { digest: "0A1B2C3D" } });
    reject({ session: { seen: "1234" } });
    reject({ session: { seen: "" } });
    reject({ session: { sure: "1".repeat(FADING_MARKS_MAX + 1) } });
    reject({ session: { unjudged: [{ targetId: `${A.id}#3`, text: "" }] } });
    reject({
      session: {
        unjudged: [
          { targetId: `${A.id}#3`, text: "x".repeat(FADING_TYPED_MAX + 1) },
        ],
      },
    });
    reject({
      session: {
        unjudged: Array.from({ length: FADING_TARGETS_MAX + 1 }, (_, i) => ({
          targetId: `${A.id}#${i + 1}`,
          text: "x",
        })),
      },
    });
    reject({
      session: {
        unjudged: [
          { targetId: `${A.id}#3`, text: "가" },
          { targetId: `${A.id}#3`, text: "나" },
        ],
      },
    });
    reject({
      session: {
        unjudged: [{ targetId: `${A.id}#3`, text: "가", extra: 1 }],
      },
    });
    reject({ session: { attempts: [] } });
    reject({ concept: { marks: { digest: "0a1b2c3d", extra: 1 } } });
    reject({ concept: { marks: { digest: "0a1b2c3d", seen: "9" } } });
    reject({
      concept: {
        marks: { digest: "0a1b2c3d", missed: [`${A.id}#1`, `${A.id}#1`] },
      },
    });
    // 평가 전 개념에 진단 · 4단계에 서지 않은 개념의 대조.
    expect(
      storedFadingSchema.safeParse({
        ...LEGACY,
        session: null,
        concepts: {
          "b-1": { ...LEGACY.concepts["b-1"]!, marks: { digest: "0a1b2c3d" } },
        },
      }).success,
    ).toBe(false);
    expect(
      storedFadingSchema.safeParse({
        ...ARRIVING,
        session: { ...ARRIVING.session, phase: "steps", missedAtFour: [] },
        concepts: {
          ...ARRIVING.concepts,
          [A.id]: { ...ARRIVING.concepts[A.id], step: 3 },
        },
      }).success,
    ).toBe(false);
  });
});

describe("읽기 호환 — 화면이 받는 응답의 꼴", () => {
  const view = () =>
    fadingStateView({
      fading: storedFadingSchema.parse(LEGACY),
      revision: 2,
      today: "2026-10-09",
      concepts: new Map([[A.id, A]]),
    });

  it("지금의 응답은 글자 하나 다르지 않게 읽히고, 선택 칸이 하나도 붙지 않는다", () => {
    const data = view();
    const parsed = fadingStateResponseSchema.parse({ data });
    expect(parsed.data).toStrictEqual(data);
    expect(json(parsed.data)).toBe(json(data));
    expect(parsed.data).not.toHaveProperty("mode");
    expect(Object.keys(parsed.data.session!)).not.toContain("mode");
  });

  it("카드 풀이의 칸(새 풀이의 방식 · 풀이의 방식 · 대조를 기다리는 글 · 바뀐 내용)이 든 응답도 읽힌다 — 값이 어긋나면 거절한다", () => {
    const data = view();
    const arriving = {
      ...data,
      mode: "cards",
      session: {
        ...data.session!,
        mode: "cards",
        unjudged: [{ targetId: `${A.id}#3`, text: "가장 긴 변" }],
        stale: true,
      },
    };
    const parsed = fadingStateResponseSchema.parse({ data: arriving });
    expect(json(parsed.data)).toBe(json(arriving));
    const reject = (patch: object, session: object = {}) =>
      expect(
        fadingStateResponseSchema.safeParse({
          data: {
            ...arriving,
            ...patch,
            session: { ...arriving.session, ...session },
          },
        }).success,
      ).toBe(false);
    reject({ mode: "chips" });
    reject({}, { mode: "typed" });
    reject({}, { stale: false });
    reject({}, { unjudged: [{ targetId: `${A.id}#3`, text: "" }] });
    reject({}, { unjudged: [{ targetId: `${A.id}#3`, text: "x".repeat(81) }] });
    reject({}, { judged: {} });
    reject({ cards: true });
  });

  it("개념 하나의 응답도 방식을 실을 수 있다 — 없으면 지금의 꼴 그대로", () => {
    const fading = storedFadingSchema.parse(LEGACY);
    const data = {
      content: { concept: A, traps: [], figure: null },
      status: fadingConceptStatus(A, fading.concepts[A.id]!, "2026-10-09"),
    };
    expect(json(fadingConceptResponseSchema.parse({ data }).data)).toBe(
      json(data),
    );
    expect(
      fadingConceptResponseSchema.parse({ data: { ...data, mode: "cards" } })
        .data.mode,
    ).toBe("cards");
    expect(
      fadingConceptResponseSchema.safeParse({
        data: { ...data, mode: "chips" },
      }).success,
    ).toBe(false);
  });
});
