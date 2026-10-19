import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  storedFadingSchema,
  type StoredFading,
} from "@/contracts/fading.contract";
import {
  FADING_RELEARN_DAILY_CHECKS,
  FADING_RELEARN_RETRY_MS,
  FADING_RELEARN_STOP_FAILS,
  fadingRelearnQueueSchema,
  type FadingRelearnAttempt,
} from "@/contracts/fadingRelearn.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import {
  FADING_RELEARN_CAPPED,
  FADING_RELEARN_CHANGED,
  FADING_RELEARN_STOPPED,
  fadingRelearnLimits,
  fadingRelearnQueueView,
  fadingRelearnToken,
  gradeFadingRelearn,
  judgeFadingRelearn,
  observeFadingRelearn,
} from "@/lib/fading/relearn";
import {
  FadingConflict,
  completeFadingReading,
  completeFadingStep,
  emptyFading,
  openFadingSession,
  rateFadingSession,
} from "@/lib/fading/state";

/**
 * 추가 확인의 하루 끝 — 원장님 결정(2026-10-17 · `fading-quota-consensus-20261017.md` §7 ④).
 * 하루 30회(대조를 기다리는 답도 한 자리를 잡는다) · 같은 문장 «틀림» 3회면 그 문장은 그날 멈춘다. 넘긴 줄은 지우지 않고 다음 날로 간다.
 * 🔴 새 저장 칸 없이 센다 — 그날의 집계(`day.checks`)와 영수증(`graded`)만 읽는다.
 */

function concept(id: string) {
  const definitions = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ];
  const entries: ConceptEntry[] = definitions.map((definition, i) => ({
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
const CONCEPTS = new Map([[A.id, A]]);
const DAY1 = "2026-10-06";
/** 한국 10월 6일 낮 12시 · 그날 밤 12시(10월 7일 0시). */
const T0 = Date.UTC(2026, 9, 6, 3, 0, 0);
const MIDNIGHT = Date.UTC(2026, 9, 6, 15, 0, 0);
const MIN = FADING_RELEARN_RETRY_MS;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

function chips(c: FadingConcept, step: FadingStep, seed: number) {
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

/** A 를 처음 배우고 «다시»로 평가 — 4단계에서 둘째 명제의 첫 빈칸을 틀렸다. 대기열에 세 명제가 든다. */
function seeded(): StoredFading {
  let s = openFadingSession(
    emptyFading(),
    A,
    DAY1,
    { sessionId: uuid(1), seed: 1 },
    { cards: true },
  );
  s = completeFadingReading(s, A.id, s.session!.id);
  for (const step of [2, 3] as const)
    s = completeFadingStep(
      s,
      A,
      s.session!.id,
      step,
      chips(A, step, s.session!.seed),
    );
  const all = fadingTargets(A);
  const moves = erasedTargets(A, 4).flatMap((target) =>
    target.id === "a2#1"
      ? [
          {
            targetId: target.id,
            text: all.find((o) => o.text !== target.text)!.text,
          },
          { targetId: target.id, text: target.text },
        ]
      : [{ targetId: target.id, text: target.text }],
  );
  s = completeFadingStep(s, A, s.session!.id, 4, moves);
  s = rateFadingSession(s, A, s.session!.id, "again", DAY1, uuid(2));
  return observeFadingRelearn(
    s,
    A,
    { kind: "rated", conceptId: A.id, requestId: uuid(2) },
    T0,
  ).fading;
}

const itemOf = (state: StoredFading, propositionId: string) =>
  state.relearn!.items.find((i) => i.propositionId === propositionId)!;

/** 그 명제의 확인 — `wrong` 이면 빈칸마다 다른 빈칸의 답을 쓴다(틀림). */
function attempt(
  state: StoredFading,
  propositionId: string,
  n: number,
  { wrong = false, assisted = false } = {},
): FadingRelearnAttempt {
  const proposition = A.propositions.find((p) => p.id === propositionId)!;
  const targets = fadingTargets({ ...A, propositions: [proposition] });
  const all = fadingTargets(A);
  return {
    conceptId: A.id,
    propositionId,
    token: fadingRelearnToken(itemOf(state, propositionId), A),
    attemptId: uuid(n),
    answers: targets.map((target) => ({
      targetId: target.id,
      text: wrong ? all.find((o) => o.text !== target.text)!.text : target.text,
    })),
    ...(assisted ? { assisted } : {}),
  };
}

const view = (state: StoredFading, now: number) =>
  fadingRelearnQueueSchema.parse(
    fadingRelearnQueueView({ fading: state, concepts: CONCEPTS, now }),
  );

const conflictOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(FadingConflict);
    return (error as Error).message;
  }
  throw new Error("거절되지 않았다");
};

/** 둘째 명제(`a2` 가 든 명제)를 `times` 번 틀린다 — 1분씩 기다리며. */
function failTimes(state: StoredFading, times: number, start = 10) {
  const id = itemOf(state, propositionOfA2()).propositionId;
  let s = state;
  let now = T0;
  for (let i = 0; i < times; i++) {
    now = Math.max(now, itemOf(s, id).dueAt);
    s = gradeFadingRelearn(
      s,
      A,
      attempt(s, id, start + i, { wrong: true }),
      now,
    ).fading;
  }
  return { state: s, now, id };
}
function propositionOfA2() {
  return A.propositions.find((p) =>
    p.pieces.some(
      (piece) => piece.kind === "target" && piece.target.id === "a2#1",
    ),
  )!.id;
}

/** 그날의 집계를 그 수로 맞춘 기록 — 30회를 하나씩 풀지 않고 경계를 본다. */
function withChecks(state: StoredFading, checks: number): StoredFading {
  return {
    ...state,
    relearn: {
      ...state.relearn!,
      day: { on: DAY1, checks, cleared: 0, entered: 3 },
    },
  };
}

describe("값 — 원장님이 고른 공통 규칙", () => {
  it("하루 30회 · 같은 문장 «틀림» 3회", () => {
    expect(FADING_RELEARN_DAILY_CHECKS).toBe(30);
    expect(FADING_RELEARN_STOP_FAILS).toBe(3);
  });
  it("30회의 하루 영수증이 보관 수(32) 안에 든다 — 멈춤을 영수증으로 세는 근거", async () => {
    const { FADING_RELEARN_RECEIPTS_MAX } =
      await import("@/lib/fading/relearn");
    expect(FADING_RELEARN_DAILY_CHECKS).toBeLessThan(
      FADING_RELEARN_RECEIPTS_MAX,
    );
  });
});

describe("같은 문장 «틀림» 3회 — 그 문장은 그날 멈춘다", () => {
  it("두 번 틀린 문장은 아직 1분 뒤에 다시 확인한다", () => {
    const { state, now, id } = failTimes(seeded(), 2);
    const queue = view(state, now + MIN);
    expect(queue.items.find((i) => i.propositionId === id)!.state).toBe(
      "ready",
    );
    // 끝나지 않은 날에는 싣지 않는다 — 이 칸을 모르는 옛 화면이 그대로 읽는다.
    expect(queue.limit).toBeUndefined();
  });

  it("세 번째 틀림 뒤에는 다음 날 0시까지 기다리고, 그 사이의 확인은 받지 않는다", () => {
    const { state, now, id } = failTimes(seeded(), 3);
    const queue = view(state, now + MIN);
    const row = queue.items.find((i) => i.propositionId === id)!;
    expect(row.state).toBe("waiting");
    expect(row.dueAt).toBe(MIDNIGHT);
    expect(queue.limit).toMatchObject({ stopped: 1, resumeAt: MIDNIGHT });
    expect(
      conflictOf(() =>
        gradeFadingRelearn(state, A, attempt(state, id, 50), now + MIN),
      ),
    ).toBe(FADING_RELEARN_STOPPED);
    // 다른 문장은 제 일정 그대로다 — 다음 날로 밀리지 않는다.
    for (const other of queue.items.filter((i) => i.propositionId !== id))
      expect(other.dueAt).toBeLessThan(MIDNIGHT);
  });

  it("줄은 지워지지 않고 틀림의 수도 그대로 — 다음 날에는 다시 확인한다", () => {
    const { state, id } = failTimes(seeded(), 3);
    expect(itemOf(state, id).fails).toBe(1 + 3);
    const next = view(state, MIDNIGHT + 1);
    expect(next.items.find((i) => i.propositionId === id)!.state).toBe("ready");
    expect(next.limit).toBeUndefined();
    const graded = gradeFadingRelearn(
      state,
      A,
      attempt(state, id, 60),
      MIDNIGHT + 1,
    );
    expect(graded.result.verdict).toBe("passed");
  });

  it("도움을 받은 확인은 «틀림»으로 세지 않는다", () => {
    let s = seeded();
    const id = propositionOfA2();
    let now = T0;
    for (let i = 0; i < 3; i++) {
      now = Math.max(now, itemOf(s, id).dueAt);
      s = gradeFadingRelearn(
        s,
        A,
        attempt(s, id, 20 + i, { assisted: true }),
        now,
      ).fading;
    }
    expect(fadingRelearnLimits(s.relearn!, now).stopped).toEqual([]);
  });
});

describe("하루 30회 — 그날의 추가 확인은 거기까지다", () => {
  it("30회를 마치면 새 확인을 받지 않고, 모든 줄이 다음 날 0시까지 기다린다", () => {
    const state = withChecks(seeded(), FADING_RELEARN_DAILY_CHECKS);
    const now = T0 + 10 * MIN;
    const queue = view(state, now);
    expect(queue.limit).toMatchObject({ capped: true, resumeAt: MIDNIGHT });
    expect(queue.items.every((i) => i.state === "waiting")).toBe(true);
    expect(queue.counts.ready).toBe(0);
    expect(queue.nextDueAt).toBe(MIDNIGHT);
    const id = propositionOfA2();
    expect(
      conflictOf(() =>
        gradeFadingRelearn(state, A, attempt(state, id, 70), now),
      ),
    ).toBe(FADING_RELEARN_CAPPED);
  });

  it("29회에서는 한 번 더 확인할 수 있다", () => {
    const state = withChecks(seeded(), FADING_RELEARN_DAILY_CHECKS - 1);
    const id = propositionOfA2();
    const graded = gradeFadingRelearn(
      state,
      A,
      attempt(state, id, 71),
      T0 + 10 * MIN,
    );
    expect(graded.fading.relearn!.day!.checks).toBe(30);
    expect(view(graded.fading, T0 + 10 * MIN).limit!.capped).toBe(true);
  });

  it("대조를 기다리는 답은 한 자리를 잡는다 — 29회 + 대조 하나면 새 확인은 막히고, 그 대조는 끝낼 수 있다", () => {
    const base = withChecks(seeded(), FADING_RELEARN_DAILY_CHECKS - 1);
    const id = propositionOfA2();
    const proposition = A.propositions.find((p) => p.id === id)!;
    const targets = fadingTargets({ ...A, propositions: [proposition] });
    const now = T0 + 10 * MIN;
    // 어느 답의 글도 아닌 글 — 판정하지 않고 대조를 기다린다.
    const waiting = gradeFadingRelearn(
      base,
      A,
      {
        ...attempt(base, id, 80),
        answers: targets.map((t) => ({ targetId: t.id, text: "모르는 글" })),
      },
      now,
    );
    expect(waiting.result.verdict).toBe("judging");
    expect(fadingRelearnLimits(waiting.fading.relearn!, now)).toMatchObject({
      checks: 29,
      reserved: 1,
      capped: true,
    });
    const other = waiting.fading.relearn!.items.find(
      (i) => i.propositionId !== id,
    )!;
    expect(
      conflictOf(() =>
        gradeFadingRelearn(
          waiting.fading,
          A,
          {
            ...attempt(waiting.fading, other.propositionId, 81),
          },
          now + 10 * MIN,
        ),
      ),
    ).toBe(FADING_RELEARN_CAPPED);
    const judged = judgeFadingRelearn(
      waiting.fading,
      A,
      {
        conceptId: A.id,
        propositionId: id,
        attemptId: uuid(80),
        judged: Object.fromEntries(targets.map((t) => [t.id, "same"])),
      },
      now + MIN,
    );
    expect(judged.fading.relearn!.day!.checks).toBe(30);
    expect(storedFadingSchema.safeParse(judged.fading).success).toBe(true);
  });

  it("같은 번호의 되풀이는 상한 뒤에도 처음 결과를 돌려준다", () => {
    const state = withChecks(seeded(), FADING_RELEARN_DAILY_CHECKS - 1);
    const id = propositionOfA2();
    const first = gradeFadingRelearn(
      state,
      A,
      attempt(state, id, 90),
      T0 + 10 * MIN,
    );
    const again = gradeFadingRelearn(
      first.fading,
      A,
      attempt(state, id, 90),
      T0 + 11 * MIN,
    );
    expect(again.result.replayed).toBe(true);
    expect(again.fading).toBe(first.fading);
  });

  it("다음 날에는 그날의 수가 0 부터다", () => {
    const state = withChecks(seeded(), FADING_RELEARN_DAILY_CHECKS);
    const queue = view(state, MIDNIGHT + 1);
    expect(queue.limit).toBeUndefined();
    expect(fadingRelearnLimits(state.relearn!, MIDNIGHT + 1)).toMatchObject({
      capped: false,
      checks: 0,
    });
    expect(queue.counts.ready).toBeGreaterThan(0);
  });
});

describe("codex 4차 — 30을 넘기는 길을 막는다", () => {
  it("자정을 넘긴 다른 요청이 오늘의 수를 적은 뒤, 어제 시각의 등록은 오늘의 수를 지우지 않고 어제 시각의 판정은 받지 않는다", () => {
    const today = withChecks(seeded(), 12);
    today.relearn!.day = {
      on: "2026-10-07",
      checks: 12,
      cleared: 0,
      entered: 0,
    };
    const late = observeFadingRelearn(
      today,
      A,
      { kind: "rated", conceptId: A.id, requestId: uuid(2) },
      MIDNIGHT - 1,
    );
    expect(late.fading.relearn!.day).toEqual(today.relearn!.day);
    const id = propositionOfA2();
    expect(
      conflictOf(() =>
        gradeFadingRelearn(today, A, attempt(today, id, 95), MIDNIGHT - 1),
      ),
    ).toBe(FADING_RELEARN_CHANGED);
  });

  it("그날의 수가 다 찼으면 지난날 쌓인 대조도 판정하지 않고, 다음 날 끝낸다", () => {
    const base = withChecks(seeded(), FADING_RELEARN_DAILY_CHECKS - 1);
    const id = propositionOfA2();
    const proposition = A.propositions.find((p) => p.id === id)!;
    const targets = fadingTargets({ ...A, propositions: [proposition] });
    const waiting = gradeFadingRelearn(
      base,
      A,
      {
        ...attempt(base, id, 96),
        answers: targets.map((t) => ({ targetId: t.id, text: "모르는 글" })),
      },
      T0 + 10 * MIN,
    ).fading;
    // 그날 다른 확인으로 30이 찼다고 맞춘다.
    const full = withChecks(waiting, FADING_RELEARN_DAILY_CHECKS);
    const judgement = {
      conceptId: A.id,
      propositionId: id,
      attemptId: uuid(96),
      judged: Object.fromEntries(targets.map((t) => [t.id, "same" as const])),
    };
    expect(
      conflictOf(() => judgeFadingRelearn(full, A, judgement, T0 + 11 * MIN)),
    ).toBe(FADING_RELEARN_CAPPED);
    const row = view(full, T0 + 11 * MIN).items.find(
      (i) => i.propositionId === id,
    )!;
    expect(row).toMatchObject({ state: "waiting", dueAt: MIDNIGHT });
    expect(row.pending).toBeUndefined();
    // 다음 날에는 대조로 다시 보이고 끝낼 수 있다.
    expect(
      view(full, MIDNIGHT + 1).items.find((i) => i.propositionId === id)!.state,
    ).toBe("judging");
    expect(
      judgeFadingRelearn(full, A, judgement, MIDNIGHT + 1).result.verdict,
    ).toBe("passed");
  });

  it("지난날의 대조는 오늘의 자리를 잡지 않는다 — 낡은 대기가 날마다 확인을 막지 않는다", () => {
    const base = withChecks(seeded(), 0);
    const id = propositionOfA2();
    const stale: StoredFading = {
      ...base,
      relearn: {
        ...base.relearn!,
        items: base.relearn!.items.map((item) =>
          item.propositionId === id
            ? {
                ...item,
                pending: {
                  attemptId: uuid(97),
                  at: T0 - 86_400_000,
                  digest: "00000000",
                  answers: [],
                },
              }
            : item,
        ),
      },
    };
    expect(fadingRelearnLimits(stale.relearn!, T0)).toMatchObject({
      reserved: 0,
      capped: false,
    });
  });
});
