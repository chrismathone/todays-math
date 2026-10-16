import { describe, expect, it, vi } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { FadingPlacement } from "@/contracts/fading.contract";
import type { FadingAction, FadingState } from "@/contracts/fadingApi.contract";
import {
  FADING_RELEARN_CONFIRM_MS,
  FADING_RELEARN_RETRY_MS,
  type FadingRelearnQueue,
} from "@/contracts/fadingRelearn.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { createLocalFadingSource } from "@/lib/fading/local";
import {
  FADING_RELEARN_NOT_DUE,
  FADING_RELEARN_NO_EVIDENCE,
} from "@/lib/fading/relearn";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import {
  fadingRelearnObservationOf,
  withFadingRelearn,
  type FadingRelearnSource,
} from "@/lib/fading/relearnSource";
import { FadingSourceError, type FadingSource } from "@/lib/fading/source";

/**
 * 화면이 쓰는 길 — 서버 없이 도는 대기열(`createLocalFadingRelearnSource`)과, 풀이의 행동에서 증거를 알리는 싸개(`withFadingRelearn`).
 * 시계는 넣어 준 것이다 — 기기의 시계를 읽지 않는다. 풀이의 원천(`createLocalFadingSource`)은 읽기만 한다.
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
const B = concept("b");
const DAY1 = "2026-10-06";
const T0 = Date.UTC(2026, 9, 6, 3, 0, 0);
const MIN = FADING_RELEARN_RETRY_MS;
const FIVE = FADING_RELEARN_CONFIRM_MS;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;

function world() {
  let serial = 0;
  const clock = { now: T0 };
  const main = createLocalFadingSource({
    concepts: [A, B],
    today: DAY1,
    cards: true,
    fresh: () => ({ sessionId: uuid(++serial), seed: serial }),
  });
  const relearn = createLocalFadingRelearnSource({
    main,
    concepts: [A, B],
    now: () => clock.now,
  });
  return { clock, main, relearn };
}

function chips(
  c: FadingConcept,
  step: FadingStep,
  seed: number,
  miss: readonly string[] = [],
): FadingPlacement[] {
  const tray = chipTray(c, step, { seed });
  const used = new Set<string>();
  const moves: FadingPlacement[] = [];
  for (const target of erasedTargets(c, step)) {
    if (miss.includes(target.id))
      moves.push({
        targetId: target.id,
        chipId: tray.find(
          (chip) => !used.has(chip.id) && !chipFits(c, target.id, chip),
        )!.id,
      });
    const chip = tray.find(
      (x) => !used.has(x.id) && chipFits(c, target.id, x),
    )!;
    used.add(chip.id);
    moves.push({ targetId: target.id, chipId: chip.id });
  }
  return moves;
}

/** 4단계를 자판으로 — `wrong` 의 빈칸은 틀리게 썼다가 다시 맞게 쓴다. */
function typed(c: FadingConcept, wrong: readonly string[] = []) {
  const all = fadingTargets(c);
  return erasedTargets(c, 4).flatMap((target): FadingPlacement[] => [
    ...(wrong.includes(target.id)
      ? [
          {
            targetId: target.id,
            text: all.find((other) => other.text !== target.text)!.text,
          },
        ]
      : []),
    { targetId: target.id, text: target.text },
  ]);
}

/** 화면이 하듯 풀이 한 벌을 돈다 — 열기 → 정독 → 2 · 3단계(칩) → 4단계(자판) → 평가. 보낸 행동을 차례로 돌려준다. */
async function solve(
  source: FadingSource,
  c: FadingConcept,
  o: {
    miss2?: boolean;
    wrong4?: readonly string[];
    requestId: string;
    stopAfter?: 2 | 3;
  },
) {
  const sent: FadingAction[] = [];
  const act = async (action: FadingAction) => {
    sent.push(action);
    return source.act(action);
  };
  let view: FadingState = await act({ action: "open", conceptId: c.id });
  const ref = { conceptId: c.id, sessionId: view.session!.id };
  const seed = view.session!.seed;
  view = await act({ action: "read", ...ref });
  for (const step of [2, 3] as const) {
    view = await act({
      action: "step",
      ...ref,
      step,
      placements: chips(
        c,
        step,
        seed,
        step === 2 && o.miss2 ? [erasedTargets(c, 2)[0]!.id] : [],
      ),
    });
    if (o.stopAfter === step) return { sent, view };
  }
  view = await act({
    action: "step",
    ...ref,
    step: 4,
    placements: typed(c, o.wrong4),
  });
  view = await act({
    action: "rate",
    ...ref,
    rating: o.wrong4?.length ? "again" : "good",
    requestId: o.requestId,
  });
  return { sent, view };
}

const answersFor = (c: FadingConcept, propositionId: string) =>
  fadingTargets({
    ...c,
    propositions: c.propositions.filter((p) => p.id === propositionId),
  }).map((target) => ({ targetId: target.id, text: target.text }));

const failure = async (run: Promise<unknown>) => {
  try {
    await run;
  } catch (error) {
    expect(error).toBeInstanceOf(FadingSourceError);
    return error as FadingSourceError;
  }
  throw new Error("거절되지 않았다");
};

describe("풀이의 행동 → 증거", () => {
  const ref = { conceptId: A.id, sessionId: uuid(1) };
  const placements: FadingPlacement[] = [{ targetId: "a1#1", chipId: "c1" }];

  it("단계의 넣기 차례(2 ~ 4단계 · 마친 것이든 지금까지의 것이든) · 4단계의 틀림 하나 · 평가가 증거가 된다", () => {
    for (const step of [2, 3, 4] as const)
      expect(
        fadingRelearnObservationOf({
          action: "step",
          ...ref,
          step,
          placements,
        }),
      ).toEqual({ kind: "step", ...ref, step, placements });
    // 진단(`sure`)은 싣지 않는다. «아직 모르겠어요»는 싣는다.
    expect(
      fadingRelearnObservationOf({
        action: "step",
        ...ref,
        step: 3,
        placements,
        gaveUp: true,
        sure: "123",
      }),
    ).toEqual({ kind: "step", ...ref, step: 3, placements, gaveUp: true });
    // 자판 단계에서 넘긴 카드 — 화면이 따로 준다.
    const typed: FadingPlacement[] = [{ targetId: "a1#1", text: "수직" }];
    expect(
      fadingRelearnObservationOf(
        { action: "step", ...ref, step: 4, placements: typed },
        { gaveUpCards: ["a2"] },
      ),
    ).toEqual({
      kind: "step",
      ...ref,
      step: 4,
      placements: typed,
      gaveUpCards: ["a2"],
    });
    // 4단계에서 틀린 것 하나 — 그 넣기 하나의 차례다(1분은 그때부터다).
    expect(
      fadingRelearnObservationOf({
        action: "miss",
        ...ref,
        placement: typed[0]!,
      }),
    ).toEqual({ kind: "step", ...ref, step: 4, placements: [typed[0]] });
    // 4단계 카드 하나의 «아직 모르겠어요»(D2) — 그 단계의 지금까지의 차례와 넘긴 카드 하나(서버가 본 행동과 함께 등록한다).
    expect(
      fadingRelearnObservationOf({
        action: "give-up-card",
        ...ref,
        propositionId: "a2",
        placements: typed,
      }),
    ).toEqual({
      kind: "step",
      ...ref,
      step: 4,
      placements: typed,
      gaveUpCards: ["a2"],
    });
    expect(
      fadingRelearnObservationOf({
        action: "rate",
        ...ref,
        rating: "again",
        requestId: uuid(2),
        judged: { "a3#1": "different" },
      }),
    ).toEqual({ kind: "rated", conceptId: A.id, requestId: uuid(2) });
  });

  it("정독 · 열기 · 고르기 · 빼기 · «오늘 전부»는 증거가 아니다", () => {
    const none: FadingAction[] = [
      { action: "read", ...ref },
      { action: "open", conceptId: A.id },
      { action: "pick", conceptId: A.id },
      { action: "drop", conceptId: A.id },
      { action: "all-today", on: true },
    ];
    for (const action of none)
      expect(fadingRelearnObservationOf(action), action.action).toBeNull();
  });
});

describe("싸개 — 등록은 본 행동과 한 저장으로(D3), 싸개는 대기열을 다시 읽어 줄 뿐이다", () => {
  it("2단계에서 틀리면 그 명제가, 평가로 닫으면 나머지가 든다 — 증거를 따로 보내지 않고, 풀이의 답은 싸개 없이 받은 것과 같다", async () => {
    const plain = world();
    const wrapped = world();
    const queues: FadingRelearnQueue[] = [];
    const record = vi.spyOn(wrapped.relearn, "record");
    const source = withFadingRelearn(wrapped.main, wrapped.relearn, {
      onQueue: (queue) => queues.push(queue),
    });
    const a = await solve(plain.main, A, {
      miss2: true,
      wrong4: ["a2#1"],
      requestId: uuid(50),
    });
    const b = await solve(source, A, {
      miss2: true,
      wrong4: ["a2#1"],
      requestId: uuid(50),
    });
    const missed2 = erasedTargets(A, 2)[0]!.id.split("#")[0]!;
    // 풀이의 답 · 저장 칸(등록된 대기열까지)은 싸개가 있든 없든 같다 — 등록은 본 행동 안에서 됐다.
    expect(b.view).toEqual(a.view);
    expect(wrapped.main.snapshot()).toEqual(plain.main.snapshot());
    expect(plain.main.snapshot().relearn?.items).toHaveLength(3);
    expect(record).not.toHaveBeenCalled();

    // 대기열은 증거가 되는 행동 뒤마다 다시 읽힌다 — 2단계 · 3단계 · 4단계 · 평가. 3단계는 안 틀렸으니 그대로이고,
    // 4단계의 틀림(a2)은 평가를 기다리지 않고 그 차례에서 든다(2단계에서 틀린 명제와 같으면 줄 수는 그대로다).
    expect(queues.map((q) => q.items.length)).toEqual([
      1,
      1,
      missed2 === "a2" ? 1 : 2,
      3,
    ]);
    expect(queues[0]!.items[0]).toMatchObject({
      propositionId: missed2,
      origin: "missed",
      state: "waiting",
      waitMs: MIN,
    });
    const last = await wrapped.relearn.queue();
    expect(
      Object.fromEntries(last.items.map((i) => [i.propositionId, i.origin])),
    ).toEqual({
      a1: "exposed",
      a3: "exposed",
      [missed2]: "missed",
      a2: "missed",
    });
    expect(last.today).toEqual({ on: DAY1, checks: 0, cleared: 0, entered: 3 });
  });

  it("4단계 카드의 «아직 모르겠어요»(give-up-card)도 본 행동 안에서 등록된다 — 그 카드의 명제가 1분 뒤 확인으로", async () => {
    const { clock, main, relearn } = world();
    const queues: FadingRelearnQueue[] = [];
    const source = withFadingRelearn(main, relearn, {
      onQueue: (queue) => queues.push(queue),
    });
    const first = await solve(source, A, { stopAfter: 3, requestId: uuid(1) });
    const ref = { conceptId: A.id, sessionId: first.view.session!.id };
    await source.act({
      action: "step",
      ...ref,
      step: 3,
      placements: chips(A, 3, first.view.session!.seed),
    });
    clock.now = T0 + 7_000;
    const view = await source.act({
      action: "give-up-card",
      ...ref,
      propositionId: "a2",
      placements: [],
    });
    expect(view.session).toMatchObject({
      phase: "steps",
      missedAtFour: ["a2#1", "a2#2"],
    });
    expect(queues.at(-1)!.items).toEqual([
      expect.objectContaining({
        propositionId: "a2",
        origin: "missed",
        dueAt: T0 + 7_000 + MIN,
        fails: 1,
      }),
    ]);
    // 같은 요청의 되풀이 — 본 전이가 그대로라 등록도 다시 세지 않는다.
    await source.act({
      action: "give-up-card",
      ...ref,
      propositionId: "a2",
      placements: [],
    });
    expect((await relearn.queue()).items[0]).toMatchObject({
      dueAt: T0 + 7_000 + MIN,
      fails: 1,
    });
  });

  it("풀이의 행동이 실패하면 대기열을 읽지 않는다", async () => {
    const { main } = world();
    const queue = vi.fn();
    const source = withFadingRelearn(main, { queue });
    const error = await failure(
      source.act({
        action: "rate",
        conceptId: A.id,
        sessionId: uuid(1),
        rating: "good",
        requestId: uuid(2),
      }),
    );
    expect(error.code).toBe("CONFLICT");
    expect(queue).not.toHaveBeenCalled();
  });

  it("대기열 읽기의 거절은 풀이를 실패시키지 않는다 — `onError` 로만 알리고, 등록은 이미 저장 칸에 있다", async () => {
    const { main } = world();
    const queue = vi
      .fn<FadingRelearnSource["queue"]>()
      .mockRejectedValue(new FadingSourceError("CONFLICT", "거절", 409));
    const errors: unknown[] = [];
    const source = withFadingRelearn(
      main,
      { queue },
      { onError: (error) => errors.push(error) },
    );
    const done = await solve(source, A, { requestId: uuid(50) });
    expect(done.view.receipt).toMatchObject({ requestId: uuid(50) });
    // 2단계 · 3단계 · 4단계 · 평가 — 네 번 읽으려 했고 네 번 알렸다.
    expect(queue).toHaveBeenCalledTimes(4);
    expect(errors).toHaveLength(4);
    expect(main.snapshot().relearn?.items).toHaveLength(3);
  });

  it("🔴 본 행동 성공 + 대기열 읽기 실패(연결 끊김) → 본 행동을 다시 보내지 않고, 돌아와 읽으면 대기열이 회복돼 있다", async () => {
    const { main, relearn } = world();
    const act = vi.spyOn(main, "act");
    let offline = true;
    const queue: FadingRelearnSource["queue"] = async () => {
      if (offline) throw new FadingSourceError("OFFLINE", "끊김", 0);
      return relearn.queue();
    };
    const errors: unknown[] = [];
    const source = withFadingRelearn(
      main,
      { queue },
      { onError: (error) => errors.push(error) },
    );
    const first = await solve(source, A, {
      miss2: true,
      stopAfter: 2,
      requestId: uuid(50),
    });
    expect(first.view.session!.step).toBe(3);
    expect(errors).toHaveLength(1);
    expect(act.mock.calls.map(([a]) => a.action)).toEqual([
      "open",
      "read",
      "step",
    ]);
    // 새로고침을 흉내 낸다 — 저장 칸으로 새 원천을 짓는다. 등록은 그 칸에 이미 있다.
    offline = false;
    const reopened = createLocalFadingRelearnSource({
      main: createLocalFadingSource({
        concepts: [A, B],
        today: DAY1,
        cards: true,
        fading: main.snapshot(),
        now: () => T0,
      }),
      concepts: [A, B],
    });
    expect((await reopened.queue()).items).toEqual([
      expect.objectContaining({ origin: "missed", dueAt: T0 + MIN }),
    ]);
    expect((await queue()).items).toHaveLength(1);
  });

  it("🔴 대기열 읽기가 «학생이 바뀜»이면 그 종료가 먼저다 — 본 행동의 결과를 돌려주지 않고 그 실패를 던진다", async () => {
    const { main } = world();
    const changed = new FadingSourceError(
      "STUDENT_CHANGED",
      "로그인한 학생이 바뀌었어요. 다시 불러와 주세요.",
      409,
    );
    const queue = vi
      .fn<FadingRelearnSource["queue"]>()
      .mockRejectedValue(changed);
    const errors: unknown[] = [];
    const source = withFadingRelearn(
      main,
      { queue },
      { onError: (error) => errors.push(error) },
    );
    // 2단계까지는 싸개 없이 — 3단계를 마친 뒤의 대기열 읽기가 «학생이 바뀜»으로 실패한다.
    const first = await solve(main, A, { stopAfter: 2, requestId: uuid(1) });
    const ref = { conceptId: A.id, sessionId: first.view.session!.id };
    const error = await failure(
      source.act({
        action: "step",
        ...ref,
        step: 3,
        placements: chips(A, 3, first.view.session!.seed),
      }),
    );
    expect(error).toBe(changed);
    expect(errors).toEqual([]);
    // 본 행동은 섰다(서버라면 저장됐다) — 화면이 그 결과를 쓰지 않을 뿐이다.
    expect(main.snapshot().concepts[A.id]!.step).toBe(4);
  });

  it("쓰는 길이 닫혀 있으면(404) 그 뒤로는 읽지 않는다", async () => {
    const { main } = world();
    const queue = vi
      .fn<FadingRelearnSource["queue"]>()
      .mockRejectedValue(
        new FadingSourceError("NOT_FOUND", "주소을(를) 찾을 수 없습니다.", 404),
      );
    const source = withFadingRelearn(main, { queue });
    await solve(source, A, { requestId: uuid(50) });
    expect(queue).toHaveBeenCalledTimes(1);
  });

  it("원천의 다른 길(그 원천에만 있는 길 포함)은 그대로 둔다", async () => {
    const { main, relearn } = world();
    // `FadingSource` 의 꼴에 없는 이름을 쓴다 — 선택 길(`dailyPlan` …)의 꼴이 바뀌어도 이 시험이 그 꼴과 부딪히지 않게.
    const extended = { ...main, onlyHere: async () => "kept" as const };
    const source = withFadingRelearn(extended, relearn);
    expect(await source.onlyHere()).toBe("kept");
    expect(source.today()).toBe(DAY1);
    expect((await source.catalog()).grade).toBe("중2");
    expect((await source.state()).session).toBeNull();
  });
});

describe("서버 없이 도는 대기열 — 넣어 준 시계 · 같은 규칙", () => {
  async function seeded() {
    const w = world();
    const source = withFadingRelearn(w.main, w.relearn);
    await solve(source, A, { wrong4: ["a2#1"], requestId: uuid(50) });
    return { ...w, source };
  }
  const check = (
    queue: FadingRelearnQueue,
    propositionId: string,
    n: number,
  ) => {
    const item = queue.items.find((i) => i.propositionId === propositionId)!;
    return {
      conceptId: item.conceptId,
      propositionId,
      token: item.token,
      attemptId: uuid(n),
      // 화면이 하듯 — 대기열이 준 그 개념의 내용에서 표적을 읽는다.
      answers: answersFor(
        queue.contents[item.conceptId]!.concept as FadingConcept,
        propositionId,
      ),
    };
  };

  it("🔴 59,999 밀리초에는 못 하고 60,000 밀리초에는 한다 — 5분도 299,999 · 300,000", async () => {
    const { clock, relearn } = await seeded();
    clock.now = T0 + 59_999;
    let queue = await relearn.queue();
    expect(queue.now).toBe(T0 + 59_999);
    expect(queue.counts).toEqual({ judging: 0, ready: 0, waiting: 3 });
    const early = await failure(relearn.grade(check(queue, "a2", 60)));
    expect([early.code, early.status, early.message]).toEqual([
      "CONFLICT",
      409,
      FADING_RELEARN_NOT_DUE,
    ]);
    clock.now = T0 + 60_000;
    const first = await relearn.grade(check(await relearn.queue(), "a2", 60));
    expect(first.result).toMatchObject({
      verdict: "passed",
      next: { stage: "confirm", dueAt: T0 + MIN + FIVE },
    });
    clock.now = T0 + MIN + 299_999;
    queue = await relearn.queue();
    expect(queue.items.find((i) => i.propositionId === "a2")).toMatchObject({
      state: "waiting",
      waitMs: 1,
    });
    expect((await failure(relearn.grade(check(queue, "a2", 61)))).message).toBe(
      FADING_RELEARN_NOT_DUE,
    );
    clock.now = T0 + MIN + 300_000;
    const second = await relearn.grade(check(await relearn.queue(), "a2", 61));
    expect(second.result).toMatchObject({ verdict: "passed", next: null });
    expect(second.queue.items.map((i) => i.propositionId).sort()).toEqual([
      "a1",
      "a3",
    ]);
    expect(second.queue.today).toEqual({
      on: DAY1,
      checks: 2,
      cleared: 1,
      entered: 3,
    });
  });

  it("🔴 다른 풀이를 하는 사이에 때가 된다 — 열린 풀이를 건드리지 않고 확인하고, 풀이는 그대로 이어진다", async () => {
    const { clock, main, relearn, source } = await seeded();
    // B 를 풀기 시작한다 — 2단계까지.
    clock.now = T0 + 20_000;
    const working = await solve(source, B, {
      stopAfter: 2,
      requestId: uuid(70),
    });
    expect((await relearn.queue()).counts.ready).toBe(0);
    // B 의 3단계를 푸는 동안 A 의 확인이 때가 됐다.
    clock.now = T0 + 60_000;
    const queue = await relearn.queue();
    expect(queue.counts).toEqual({ judging: 0, ready: 3, waiting: 0 });
    // 대기열 밖의 저장 칸 — 확인은 같은 칸의 `relearn` 만 바꾼다.
    const outside = () => {
      const rest = main.snapshot();
      delete rest.relearn;
      return JSON.stringify(rest);
    };
    const before = outside();
    const done = await relearn.grade(check(queue, "a2", 60));
    expect(done.result.verdict).toBe("passed");
    // 풀이의 저장 칸(열린 B 의 풀이 · A 의 장기 기록)은 글자 그대로다.
    expect(outside()).toBe(before);
    expect(main.snapshot().session).toMatchObject({ conceptId: B.id });
    expect(main.snapshot().concepts[A.id]).toMatchObject({
      reviews: 1,
      lapses: 1,
    });
    // B 의 풀이는 그 자리에서 이어진다.
    const ref = { conceptId: B.id, sessionId: working.view.session!.id };
    const next = await source.act({
      action: "step",
      ...ref,
      step: 3,
      placements: chips(B, 3, working.view.session!.seed),
    });
    expect(next.session).toMatchObject({ conceptId: B.id, step: 4 });
  });

  it("🔴 새로 고쳐도 대기열이 남는다 — 저장 칸(대기열까지 든 학생 칸)으로 다시 열면 같은 대기열이고, 떠나 있던 사이에 때가 된다", async () => {
    const { clock, main, relearn } = await seeded();
    clock.now = T0 + 10_000;
    const before = await relearn.queue();
    // 대기열은 본 원천의 칸 안에 있다 — 따로 든 값이 아니다.
    expect(main.snapshot().relearn).toEqual(relearn.snapshot());
    const stored = JSON.parse(JSON.stringify(main.snapshot()));
    const reopenedMain = createLocalFadingSource({
      concepts: [A, B],
      today: DAY1,
      cards: true,
      fading: stored,
    });
    const reopened = createLocalFadingRelearnSource({
      main: reopenedMain,
      concepts: [A, B],
      now: () => clock.now,
    });
    expect(await reopened.queue()).toEqual(before);
    clock.now = T0 + 45 * MIN;
    const back = await reopened.queue();
    expect(back.counts).toEqual({ judging: 0, ready: 3, waiting: 0 });
    const done = await reopened.grade(check(back, "a1", 60));
    expect(done.result.next).toEqual({
      stage: "confirm",
      dueAt: T0 + 45 * MIN + FIVE,
    });
    // 처음 것은 그대로다 — 저장 칸은 사본이다.
    expect(
      (await relearn.queue()).items.find((i) => i.propositionId === "a1"),
    ).toMatchObject({ stage: "retry", checks: 0 });
    expect(reopenedMain.snapshot().relearn?.graded).toHaveLength(1);
  });

  it("못 알아본 글은 대조로 간다 — 판정 전에는 일정이 그대로이고, «같은 뜻»이면 맞힘이다", async () => {
    const { clock, relearn } = await seeded();
    clock.now = T0 + MIN;
    const queue = await relearn.queue();
    const waiting = await relearn.grade({
      ...check(queue, "a3", 60),
      answers: [{ targetId: "a3#1", text: "빗변의 절반" }],
    });
    expect(waiting.result).toMatchObject({
      verdict: "judging",
      targets: [{ targetId: "a3#1", outcome: "unknown" }],
    });
    expect(waiting.queue.items[0]).toMatchObject({
      propositionId: "a3",
      state: "judging",
      fails: 0,
      pending: {
        attemptId: uuid(60),
        answers: [
          { targetId: "a3#1", text: "빗변의 절반", outcome: "unknown" },
        ],
      },
    });
    clock.now = T0 + MIN + 15_000;
    const done = await relearn.judge({
      conceptId: A.id,
      propositionId: "a3",
      attemptId: uuid(60),
      judged: { "a3#1": "same" },
    });
    expect(done.result).toMatchObject({
      verdict: "passed",
      next: { stage: "confirm", dueAt: T0 + MIN + 15_000 + FIVE },
    });
  });

  it("꼴이 어긋난 요청 · 없는 개념 · 지어낸 증거를 학생 API 와 같은 갈래로 거절한다", async () => {
    const { relearn } = await seeded();
    const bad = await failure(
      relearn.record({ kind: "rated", conceptId: A.id } as never),
    );
    expect([bad.code, bad.status]).toEqual(["VALIDATION_ERROR", 400]);
    const gone = await failure(
      relearn.record({
        kind: "rated",
        conceptId: "no-such-concept",
        requestId: uuid(50),
      }),
    );
    expect([gone.code, gone.status]).toEqual(["NOT_FOUND", 404]);
    const forged = await failure(
      relearn.record({ kind: "rated", conceptId: A.id, requestId: uuid(999) }),
    );
    expect([forged.code, forged.message]).toEqual([
      "CONFLICT",
      FADING_RELEARN_NO_EVIDENCE,
    ]);
    // 같은 증거를 다시 알리면 한 번만 센다.
    const again = await relearn.record({
      kind: "rated",
      conceptId: A.id,
      requestId: uuid(50),
    });
    expect(again.applied).toEqual({
      entered: 0,
      updated: 0,
      skipped: 0,
      duplicate: true,
    });
  });
});
