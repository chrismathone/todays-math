// «오늘의 기억» — 은행의 문장 · 함정 표가 바뀐 뒤에 옛 화면의 요청이 다른 칩으로 채점되지 않게 하는 가드.
// 칩의 번호(cN)는 «그 단계의 답 + 함정»을 씨앗으로 섞은 자리라, 내용이 바뀌면 같은 cN 이 다른 칩이 된다.
// 화면이 받는 풀이 번호를 «저장 번호 + 그때의 내용»에서 지은 토큰으로 내려보내 서버가 알아본다 — 요청 · 응답의 꼴은 그대로다.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_TARGETS_MAX,
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
} from "@/contracts/fading.contract";
import {
  fadingStateSchema,
  type FadingAction,
} from "@/contracts/fadingApi.contract";
import {
  FADING_CONTENT_CHANGED,
  applyFadingAction,
} from "@/lib/fading/actions";
import { chipFits, chipTray, type FadingTrap } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingConceptDigest,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { fadingContentKey, fadingSessionToken } from "@/lib/fading/contentKey";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { placeChip, startFadingSession } from "@/lib/fading/session";
import {
  FadingConflict,
  completeFadingReading,
  completeFadingStep,
  emptyFading,
  fadingContentChanged,
  fadingRatingsFor,
  openFadingSession,
  rateFadingSession,
  reportFadingMiss,
} from "@/lib/fading/state";
import { fadingStateView } from "@/lib/fading/view";

function concept(definitions: readonly string[]): FadingConcept {
  const entries: ConceptEntry[] = definitions.map((definition, i) => ({
    id: `g${i + 1}`,
    section: "중2::4. 삼각형의 성질::삼각형의 외심",
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  return buildFadingConcepts(entries, proposeFadingGroups(entries))[0]!;
}

const BASE = [
  "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
  "직각삼각형의 외심은 {빗변}의 {중점}이다.",
  "외접원의 중심은 {외심}이다.",
];
/** 고치기 전의 개념. */
const OLD = concept(BASE);
/** 표적의 글만 고친 것 — 표적 수 · 등급 · 지우는 차례는 그대로. */
const NEW_TEXT = concept([
  BASE[0]!,
  "직각삼각형의 외심은 {빗변}의 {가운데 점}이다.",
  BASE[2]!,
]);
/** 표적의 수가 바뀐 것. */
const NEW_SHAPE = concept([
  BASE[0]!,
  "직각삼각형의 외심은 {빗변의 중점}이다.",
  BASE[2]!,
]);
/** 표적 밖의 글만 고친 것. */
const NEW_PROSE = concept([
  BASE[0]!,
  "직각삼각형에서 외심은 {빗변}의 {중점}이다.",
  BASE[2]!,
]);
const TRAPS: FadingTrap[] = [{ text: "내심" }, { text: "무게중심" }];

const DAY1 = "2026-10-06";
const DAY2 = "2026-10-07";
const S1 = "00000101-0000-4000-8000-000000000000";
const S2 = "00000102-0000-4000-8000-000000000000";
const REQ = "00000009-0000-4000-8000-000000000000";
const FRESH = { sessionId: S2, seed: 1 };

const valid = (state: StoredFading) => storedFadingSchema.parse(state);
const tokenOf = (c: FadingConcept, traps: readonly FadingTrap[] = []) =>
  fadingSessionToken(S1, fadingContentKey(c, traps));

/** 그 단계를 안 틀리고 채우는 «넣기»의 차례. */
function solve(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
  traps: readonly FadingTrap[] = [],
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed, traps });
  const used = new Set<string>();
  return erasedTargets(c, step).map((target) => {
    const chip = tray.find(
      (ch) => !used.has(ch.id) && chipFits(c, target.id, ch),
    )!;
    used.add(chip.id);
    return { targetId: target.id, chipId: chip.id };
  });
}

/** 저장 번호 S1 의 풀이를 열어 `upTo` 단계까지 마친다(상태 함수로 — 가드 밖). */
function solvedThrough(
  c: FadingConcept,
  upTo: 1 | 2 | 3 | 4,
  seed: number,
  traps: readonly FadingTrap[] = [],
): StoredFading {
  let state = openFadingSession(emptyFading(), c, DAY1, {
    sessionId: S1,
    seed,
  });
  state = completeFadingReading(state, c.id, S1);
  for (let step = 2; step <= upTo; step++)
    state = completeFadingStep(
      state,
      c,
      S1,
      step as FadingStep,
      solve(c, step as FadingStep, seed, traps),
      { traps },
    );
  return valid(state);
}

const act = (
  state: StoredFading,
  action: FadingAction,
  c: FadingConcept,
  traps: readonly FadingTrap[] = [],
  today = DAY1,
) => applyFadingAction(state, action, c, today, FRESH, traps);

const conflictMessage = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(FadingConflict);
    return (error as Error).message;
  }
  throw new Error("409 가 나지 않았다");
};

describe("내용 지문과 풀이 토큰", () => {
  it("지문은 «개념 지문-함정 지문»이고, 같은 내용 · 같은 함정이면 같다", () => {
    const key = fadingContentKey(OLD, TRAPS);
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{8}$/);
    expect(key.slice(0, 8)).toBe(fadingConceptDigest(OLD));
    expect(
      fadingContentKey(concept(BASE), [{ text: "내심" }, { text: "무게중심" }]),
    ).toBe(key);
  });

  it("문장 하나 · 함정 하나만 달라져도 지문이 바뀐다 — 칩이 같은 띄어쓰기 차이는 같다", () => {
    const key = fadingContentKey(OLD, TRAPS);
    for (const c of [NEW_TEXT, NEW_SHAPE, NEW_PROSE])
      expect(fadingContentKey(c, TRAPS)).not.toBe(key);
    for (const traps of [
      [],
      [TRAPS[0]!],
      [...TRAPS].reverse(),
      [{ text: "내심" }, { text: "무게 중심" }],
    ])
      expect(fadingContentKey(OLD, traps)).not.toBe(key);
    // 칩 묶음은 함정 글의 앞뒤 공백 · 겹친 공백을 지운다 — 칩이 같으면 지문도 같다.
    expect(
      fadingContentKey(OLD, [{ text: " 내심 " }, { text: "무게중심" }]),
    ).toBe(key);
  });

  it("토큰은 UUID(v8)이고 저장 번호와 다르며, 저장 번호나 지문이 하나만 달라도 달라진다", () => {
    const key = fadingContentKey(OLD, TRAPS);
    const token = fadingSessionToken(S1, key);
    expect(z.uuid().safeParse(token).success).toBe(true);
    expect(token[14]).toBe("8");
    expect(token).not.toBe(S1);
    expect(fadingSessionToken(S1, key)).toBe(token);
    expect(fadingSessionToken(S2, key)).not.toBe(token);
    expect(fadingSessionToken(S1, fadingContentKey(OLD))).not.toBe(token);
    expect(fadingSessionToken(S1, fadingContentKey(NEW_TEXT, TRAPS))).not.toBe(
      token,
    );
  });

  it("화면에 내려가는 풀이 번호는 그 내용의 토큰이다 — 응답의 키는 그대로이고 지문을 싣지 않는다", () => {
    const state = solvedThrough(OLD, 4, 7, TRAPS);
    const view = fadingStateView({
      fading: {
        ...state,
        session: { ...state.session!, digest: fadingConceptDigest(OLD) },
      },
      revision: 3,
      today: DAY1,
      concepts: new Map([[OLD.id, OLD]]),
      trapsOf: () => TRAPS,
    });
    expect(fadingStateSchema.parse(view)).toEqual(view);
    expect(view.session!.id).toBe(tokenOf(OLD, TRAPS));
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
});

describe("조용한 재채점 — 가드가 없으면", () => {
  // 함정이 빠지면(문장이 고쳐져 함정의 지문이 낡았다) 칩 묶음이 짧아져 전부 다시 섞인다.
  // 옛 화면에서 c_k 를 맞게 넣고 «아직 모르겠어요»를 누른 요청을 찾는다 — 새 묶음의 c_k 는 그 빈칸의 답이 아니다.
  const target = erasedTargets(OLD, 4)[0]!;
  const seed = Array.from({ length: 500 }, (_, i) => i + 1).find((s) => {
    const old = chipTray(OLD, 4, { seed: s, traps: TRAPS }).find((ch) =>
      chipFits(OLD, target.id, ch),
    )!;
    const now = chipTray(OLD, 4, { seed: s }).find((ch) => ch.id === old.id);
    return now !== undefined && !chipFits(OLD, target.id, now);
  })!;
  const chipId = chipTray(OLD, 4, { seed, traps: TRAPS }).find((ch) =>
    chipFits(OLD, target.id, ch),
  )!.id;
  const placement = { targetId: target.id, chipId };

  it("상태 함수는 그 요청을 409 없이 다른 틀림으로 적용한다 — 화면은 맞았다고 보았다", () => {
    expect(seed).toBeDefined();
    // 옛 화면: 함정이 있는 묶음에서 그 칩은 맞다.
    const screen = placeChip(
      startFadingSession(OLD, 4, seed),
      OLD,
      target.id,
      chipId,
      TRAPS,
    );
    expect(screen.correct).toBe(true);
    // 서버(지금 함정 없음)가 같은 넣기를 다시 돌리면 틀림이 되고, «아직 모르겠어요» 때문에 409 없이 단계를 마친다.
    const at4 = solvedThrough(OLD, 3, seed, TRAPS);
    const after = completeFadingStep(at4, OLD, S1, 4, [placement], {
      gaveUp: true,
      traps: [],
    });
    expect(after.session!.phase).toBe("rating");
    expect(after.session!.missedAtFour).toContain(target.id);
  });

  it("가드는 옛 화면의 토큰을 409 로 받고 아무것도 적용하지 않는다", () => {
    const at4 = solvedThrough(OLD, 3, seed, TRAPS);
    const message = conflictMessage(() =>
      act(
        at4,
        {
          action: "step",
          conceptId: OLD.id,
          sessionId: tokenOf(OLD, TRAPS),
          step: 4,
          placements: [placement],
          gaveUp: true,
        },
        OLD,
        [],
      ),
    );
    expect(message).toBe(FADING_CONTENT_CHANGED);
  });
});

describe("가드 — 화면이 보낸 풀이 번호", () => {
  const SEED = 11;

  it("문장이 고쳐진 뒤 옛 토큰의 정독 · 틀림 · 단계 · 평가가 전부 409 다(표적 글 · 표적 수 · 표적 밖 글 · 함정)", () => {
    const at2 = solvedThrough(OLD, 1, SEED);
    const at4 = solvedThrough(OLD, 3, SEED);
    const rating = solvedThrough(OLD, 4, SEED);
    const old = tokenOf(OLD);
    const changes: [FadingConcept, FadingTrap[]][] = [
      [NEW_TEXT, []],
      [NEW_SHAPE, []],
      [NEW_PROSE, []],
      [OLD, TRAPS],
    ];
    for (const [c, traps] of changes) {
      const opened = openFadingSession(emptyFading(), OLD, DAY1, {
        sessionId: S1,
        seed: SEED,
      });
      expect(
        conflictMessage(() =>
          act(
            opened,
            { action: "read", conceptId: OLD.id, sessionId: old },
            c,
            traps,
          ),
        ),
      ).toBe(FADING_CONTENT_CHANGED);
      expect(
        conflictMessage(() =>
          act(
            at2,
            {
              action: "step",
              conceptId: OLD.id,
              sessionId: old,
              step: 2,
              placements: solve(OLD, 2, SEED),
            },
            c,
            traps,
          ),
        ),
      ).toBe(FADING_CONTENT_CHANGED);
      const wrong = chipTray(OLD, 4, { seed: SEED }).find(
        (ch) => !chipFits(OLD, erasedTargets(OLD, 4)[0]!.id, ch),
      )!;
      expect(
        conflictMessage(() =>
          act(
            at4,
            {
              action: "miss",
              conceptId: OLD.id,
              sessionId: old,
              placement: {
                targetId: erasedTargets(OLD, 4)[0]!.id,
                chipId: wrong.id,
              },
            },
            c,
            traps,
          ),
        ),
      ).toBe(FADING_CONTENT_CHANGED);
      expect(
        conflictMessage(() =>
          act(
            rating,
            {
              action: "rate",
              conceptId: OLD.id,
              sessionId: old,
              rating: "good",
              requestId: REQ,
            },
            c,
            traps,
          ),
        ),
      ).toBe(FADING_CONTENT_CHANGED);
    }
  });

  it("지금 내용의 토큰이면 상태 함수에 저장 번호를 준 것과 글자 그대로 같다(틀림 · 평가까지)", () => {
    const token = tokenOf(OLD, TRAPS);
    const wrong = chipTray(OLD, 4, { seed: SEED, traps: TRAPS }).find(
      (ch) => !chipFits(OLD, erasedTargets(OLD, 4)[0]!.id, ch),
    )!;
    const miss = { targetId: erasedTargets(OLD, 4)[0]!.id, chipId: wrong.id };

    let direct = openFadingSession(emptyFading(), OLD, DAY1, {
      sessionId: S1,
      seed: SEED,
    });
    direct = completeFadingReading(direct, OLD.id, S1);
    for (const step of [2, 3] as const)
      direct = completeFadingStep(
        direct,
        OLD,
        S1,
        step,
        solve(OLD, step, SEED, TRAPS),
        { traps: TRAPS },
      );
    direct = reportFadingMiss(direct, OLD, S1, miss, TRAPS);
    direct = completeFadingStep(
      direct,
      OLD,
      S1,
      4,
      [miss, ...solve(OLD, 4, SEED, TRAPS)],
      { traps: TRAPS },
    );
    direct = rateFadingSession(direct, OLD, S1, "again", DAY1, REQ);

    let guarded = act(
      emptyFading(),
      { action: "open", conceptId: OLD.id },
      OLD,
      TRAPS,
    );
    guarded = {
      ...guarded,
      session: { ...guarded.session!, id: S1, seed: SEED },
    };
    const ref = { conceptId: OLD.id, sessionId: token };
    guarded = act(guarded, { action: "read", ...ref }, OLD, TRAPS);
    for (const step of [2, 3] as const)
      guarded = act(
        guarded,
        {
          action: "step",
          ...ref,
          step,
          placements: solve(OLD, step, SEED, TRAPS),
        },
        OLD,
        TRAPS,
      );
    guarded = act(
      guarded,
      { action: "miss", ...ref, placement: miss },
      OLD,
      TRAPS,
    );
    guarded = act(
      guarded,
      {
        action: "step",
        ...ref,
        step: 4,
        placements: [miss, ...solve(OLD, 4, SEED, TRAPS)],
      },
      OLD,
      TRAPS,
    );
    expect(fadingRatingsFor(guarded.session!)).toEqual(["again"]);
    guarded = act(
      guarded,
      { action: "rate", ...ref, rating: "again", requestId: REQ },
      OLD,
      TRAPS,
    );

    expect(valid(guarded)).toEqual(valid(direct));
  });

  it("토큰 이전 화면이 보내는 저장 번호(날 번호)는 409 — 다시 읽은 상태의 토큰으로 이어 간다", () => {
    const at2 = solvedThrough(OLD, 1, SEED);
    expect(
      conflictMessage(() =>
        act(
          at2,
          {
            action: "step",
            conceptId: OLD.id,
            sessionId: S1,
            step: 2,
            placements: solve(OLD, 2, SEED),
          },
          OLD,
        ),
      ),
    ).toBe(FADING_CONTENT_CHANGED);
    const view = fadingStateView({
      fading: at2,
      revision: 1,
      today: DAY1,
      concepts: new Map([[OLD.id, OLD]]),
    });
    const next = act(
      at2,
      {
        action: "step",
        conceptId: OLD.id,
        sessionId: view.session!.id,
        step: 2,
        placements: solve(OLD, 2, SEED),
      },
      OLD,
    );
    expect(next.concepts[OLD.id]!.step).toBe(3);
  });

  it("다른 개념의 번호 · 열린 풀이가 없을 때의 번호는 지금처럼 «열려 있지 않습니다»", () => {
    const at2 = solvedThrough(OLD, 1, SEED);
    const other = concept(
      [
        "삼각형의 내심은 세 내각의 {이등분선}이 만나는 점이다.",
        "내접원의 중심은 {내심}이다.",
      ].map((d) => d),
    );
    const otherId = { ...other, id: "h1" };
    expect(
      conflictMessage(() =>
        act(
          at2,
          {
            action: "read",
            conceptId: otherId.id,
            sessionId: tokenOf(otherId),
          },
          otherId,
        ),
      ),
    ).toBe("이 풀이는 열려 있지 않습니다.");
    expect(
      conflictMessage(() =>
        act(
          emptyFading(),
          { action: "read", conceptId: OLD.id, sessionId: tokenOf(OLD) },
          OLD,
        ),
      ),
    ).toBe("이 풀이는 열려 있지 않습니다.");
  });

  it("이미 적용한 평가를 다시 보내면 풀이가 닫혀 있어도 409 없이 그대로다(영수증)", () => {
    const rating = solvedThrough(OLD, 4, SEED);
    const rated = act(
      rating,
      {
        action: "rate",
        conceptId: OLD.id,
        sessionId: tokenOf(OLD),
        rating: "good",
        requestId: REQ,
      },
      OLD,
    );
    expect(rated.session).toBeNull();
    // 응답을 못 받은 화면의 되풀이 — 문장이 그사이 바뀌었어도 이미 적용한 평가다.
    expect(
      act(
        rated,
        {
          action: "rate",
          conceptId: OLD.id,
          sessionId: tokenOf(OLD),
          rating: "good",
          requestId: REQ,
        },
        NEW_TEXT,
      ),
    ).toBe(rated);
    // 복습일에 같은 개념의 새 풀이가 열린 뒤에 아주 늦게 온 되풀이도 — 새 풀이의 토큰이 아니어도 409 가 아니라 영수증이다.
    const dueOn = rated.concepts[OLD.id]!.dueOn!;
    const reopened = act(
      rated,
      { action: "open", conceptId: OLD.id },
      OLD,
      [],
      dueOn,
    );
    expect(reopened.session!.id).toBe(S2);
    expect(
      act(
        reopened,
        {
          action: "rate",
          conceptId: OLD.id,
          sessionId: tokenOf(OLD),
          rating: "good",
          requestId: REQ,
        },
        OLD,
        [],
        dueOn,
      ),
    ).toBe(reopened);
  });

  it("지난 단계를 다시 보낸 요청은 토큰이 맞으면 그대로다", () => {
    const at3 = solvedThrough(OLD, 2, SEED);
    expect(
      act(
        at3,
        {
          action: "step",
          conceptId: OLD.id,
          sessionId: tokenOf(OLD),
          step: 2,
          placements: solve(OLD, 2, SEED),
        },
        OLD,
      ),
    ).toBe(at3);
  });
});

describe("평가의 지문 — 4단계를 푼 내용으로 적는다", () => {
  const SEED = 5;

  it("풀이에 적힌 지문이 있으면 그 지문으로 적는다 — 고친 문장의 평가로 적지 않는다", () => {
    const rating = solvedThrough(OLD, 4, SEED);
    const solvedOnOld = valid({
      ...rating,
      session: { ...rating.session!, digest: fadingConceptDigest(OLD) },
    });
    // 배포 뒤: 화면이 다시 읽어 새 내용의 토큰으로 평가한다.
    const rated = act(
      solvedOnOld,
      {
        action: "rate",
        conceptId: OLD.id,
        sessionId: tokenOf(NEW_TEXT),
        rating: "good",
        requestId: REQ,
      },
      NEW_TEXT,
    );
    expect(rated.concepts[OLD.id]!.digest).toBe(fadingConceptDigest(OLD));
    expect(fadingContentChanged(rated.concepts[OLD.id]!, NEW_TEXT)).toBe(true);
  });

  it("풀이에 지문이 없으면(가드 이전에 평가 차례가 된 풀이) 지금 지문으로 적는다", () => {
    const rating = solvedThrough(OLD, 4, SEED);
    const rated = act(
      { ...rating, session: { ...rating.session!, digest: undefined } },
      {
        action: "rate",
        conceptId: OLD.id,
        sessionId: tokenOf(OLD),
        rating: "good",
        requestId: REQ,
      },
      OLD,
    );
    expect(rated.concepts[OLD.id]!.digest).toBe(fadingConceptDigest(OLD));
  });

  it("저장 칸은 지문이 있는 풀이와 없는 풀이를 다 읽고, 지문은 평가 차례에서만 받는다", () => {
    const rating = solvedThrough(OLD, 4, SEED);
    const at2 = solvedThrough(OLD, 1, SEED);
    expect(storedFadingSchema.safeParse(rating).success).toBe(true);
    expect(
      storedFadingSchema.safeParse({
        ...rating,
        session: { ...rating.session!, digest: fadingConceptDigest(OLD) },
      }).success,
    ).toBe(true);
    expect(
      storedFadingSchema.safeParse({
        ...at2,
        session: { ...at2.session!, digest: fadingConceptDigest(OLD) },
      }).success,
    ).toBe(false);
    expect(
      storedFadingSchema.safeParse({
        ...rating,
        session: { ...rating.session!, digest: "XYZ" },
      }).success,
    ).toBe(false);
    // 모르는 키는 여전히 거절한다.
    expect(
      storedFadingSchema.safeParse({
        ...rating,
        session: { ...rating.session!, token: "x" },
      }).success,
    ).toBe(false);
  });

  it("지문이 있는 풀이도 다음 행동에서 지문이 그대로 남는다(읽고 보존)", () => {
    const rating = solvedThrough(OLD, 4, SEED);
    const withDigest = valid({
      ...rating,
      session: { ...rating.session!, digest: fadingConceptDigest(OLD) },
    });
    const again = act(
      withDigest,
      {
        action: "step",
        conceptId: OLD.id,
        sessionId: tokenOf(OLD),
        step: 4,
        placements: solve(OLD, 4, SEED),
      },
      OLD,
    );
    expect(again).toBe(withDigest);
    expect(valid(again).session!.digest).toBe(fadingConceptDigest(OLD));
  });
});

describe("4단계의 틀림은 문장이 고쳐져도 남는다 — «4단계에서 틀리면 다시뿐»", () => {
  const SEED = 3;

  it("지금 표적에 없는 옛 틀림은 고친 문장의 4단계를 다 맞혀도 남고, 평가는 «다시»뿐이다", () => {
    const at4 = solvedThrough(NEW_SHAPE, 3, SEED);
    // 고치기 전 문장에서 적힌 틀림 — «g2#2»(중점)는 고친 문장에 없다.
    const stale = valid({
      ...at4,
      session: { ...at4.session!, missedAtFour: ["g2#2"] },
    });
    const done = completeFadingStep(
      stale,
      NEW_SHAPE,
      S1,
      4,
      solve(NEW_SHAPE, 4, SEED),
      {},
    );
    expect(done.session!.missedAtFour).toEqual(["g2#2"]);
    expect(fadingRatingsFor(done.session!)).toEqual(["again"]);
  });

  it("지금 표적의 틀림은 표적 차례로 앞에, 옛 틀림은 적힌 차례로 뒤에 — 상한을 넘기지 않는다", () => {
    const at4 = solvedThrough(NEW_SHAPE, 3, SEED);
    const stale = Array.from(
      { length: FADING_TARGETS_MAX },
      (_, i) => `old${i}#1`,
    );
    const state = valid({
      ...at4,
      session: { ...at4.session!, missedAtFour: stale },
    });
    // «아직 모르겠어요» — 지금 표적이 전부 틀림이 된다.
    const done = completeFadingStep(state, NEW_SHAPE, S1, 4, [], {
      gaveUp: true,
    });
    const current = fadingTargets(NEW_SHAPE).map((t) => t.id);
    expect(valid(done).session!.missedAtFour).toEqual(
      [...current, ...stale].slice(0, FADING_TARGETS_MAX),
    );
  });

  it("다음 날로 넘어가도 옛 틀림이 남은 풀이는 «다시»로만 닫힌다", () => {
    const at4 = solvedThrough(NEW_SHAPE, 3, SEED);
    const stale = valid({
      ...at4,
      session: { ...at4.session!, missedAtFour: ["g2#2"] },
    });
    const done = completeFadingStep(
      stale,
      NEW_SHAPE,
      S1,
      4,
      solve(NEW_SHAPE, 4, SEED),
      {},
    );
    expect(() =>
      rateFadingSession(done, NEW_SHAPE, S1, "good", DAY2, REQ),
    ).toThrow(FadingConflict);
    expect(
      rateFadingSession(done, NEW_SHAPE, S1, "again", DAY2, REQ).concepts[
        NEW_SHAPE.id
      ]!.lapses,
    ).toBe(1);
  });

  it("옛 틀림으로 칸이 다 찼으면 새 틀림은 더 적지 않는다 — 저장 칸의 상한을 넘기지 않고, 평가는 이미 «다시»뿐", () => {
    const at4 = solvedThrough(NEW_SHAPE, 3, SEED);
    const stale = Array.from(
      { length: FADING_TARGETS_MAX },
      (_, i) => `old${i}#1`,
    );
    const state = valid({
      ...at4,
      session: { ...at4.session!, missedAtFour: stale },
    });
    const target = erasedTargets(NEW_SHAPE, 4)[0]!;
    const wrong = chipTray(NEW_SHAPE, 4, { seed: SEED }).find(
      (ch) => !chipFits(NEW_SHAPE, target.id, ch),
    )!;
    const after = reportFadingMiss(state, NEW_SHAPE, S1, {
      targetId: target.id,
      chipId: wrong.id,
    });
    expect(after).toBe(state);
    expect(fadingRatingsFor({ ...after.session!, phase: "rating" })).toEqual([
      "again",
    ]);
  });
});
