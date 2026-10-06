import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  storedFadingSchema,
  type FadingPlacement,
  type StoredFading,
} from "@/contracts/fading.contract";
import { fadingActionSchema } from "@/contracts/fadingApi.contract";
import { applyFadingAction } from "@/lib/fading/actions";
import {
  decodeFadingMarks,
  encodeFadingMarks,
  fadingCardBlanks,
  fadingComparison,
  fadingSafeLabel,
} from "@/lib/fading/cards";
import { chipFits, chipTray, type FadingTrap } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingConceptDigest,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { fadingCardsEnabled } from "@/lib/fading/enabled";
import { erasedTargets, type FadingStep } from "@/lib/fading/erasure";
import { FSRS_RATINGS } from "@/lib/fading/fsrs";
import { createLocalFadingSource } from "@/lib/fading/local";
import { applyFadingRating, fadingDayOfDate } from "@/lib/fading/schedule";
import {
  allowedRatings,
  closeWithRating,
  fadingAsksSure,
  fadingStepInput,
  finishReading,
  giveUpCard,
  placeChip,
  placeText,
  resumeFadingSession,
  startFadingSession,
  type FadingSession,
} from "@/lib/fading/session";
import {
  FadingConflict,
  emptyFading,
  fadingProgressOf,
} from "@/lib/fading/state";
import { FADING_CONTENT_CHANGED } from "@/lib/fading/actions";
import { fadingContentKey, fadingSessionToken } from "@/lib/fading/contentKey";
import { fadingStateView } from "@/lib/fading/view";

/**
 * 카드 풀이 — 1단계 카드(사전 확인) · 2 · 3단계 칩 · 4단계 자판(A′) · 대조 · 평가 한 번 (합의 2026-10-07).
 * 하위 문(`MATH_FADING_CARDS`)이 꺼져 있으면 새 칸을 하나도 쓰지 않고, 열린 풀이는 연 때의 방식으로 끝난다.
 */

const SECTION = "중2::4. 삼각형의 성질::삼각형의 외심";
function conceptOf(id: string, middle = "중점"): FadingConcept {
  const entries: ConceptEntry[] = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
    `직각삼각형의 외심은 {빗변}의 {${middle}}이다.`,
    "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
  ].map((definition, i) => ({
    id: `${id}${i + 1}`,
    section: SECTION,
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  return buildFadingConcepts(entries, proposeFadingGroups(entries))[0]!;
}
const A = conceptOf("a");
/** 같은 열쇠 · 같은 빈칸 번호인데 한 답의 글이 바뀐 은행. */
const A_EDITED = conceptOf("a", "가운데 점");
const DAY1 = "2026-10-06";
const DAY4 = "2026-10-09";
const SEED = 77;
const uuid = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const T = {
  perp: "a1#1",
  r: "a1#2",
  hyp: "a2#1",
  mid: "a2#2",
  half: "a3#1",
};
const CORRECT: Record<string, string> = {
  [T.perp]: "수직 이등분선",
  [T.r]: "R",
  [T.hyp]: "빗변",
  [T.mid]: "중점",
  [T.half]: "c/2",
};

const valid = (state: StoredFading) => storedFadingSchema.parse(state);

/** 칩으로 그 단계를 안 틀리고 채우는 차례. */
function chips(
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
/** 4단계에 쓴 차례 — 바꿀 빈칸만 덮어쓴다. */
function typed(overrides: Record<string, string> = {}): FadingPlacement[] {
  return fadingTargets(A).map((t) => ({
    targetId: t.id,
    text: overrides[t.id] ?? CORRECT[t.id]!,
  }));
}

type Act = Parameters<typeof applyFadingAction>[1];
function act(
  state: StoredFading,
  action: Act,
  options: {
    cards?: boolean;
    concept?: FadingConcept;
    traps?: FadingTrap[];
    today?: string;
    fresh?: number;
  } = {},
): StoredFading {
  const parsed = fadingActionSchema.parse(action);
  return valid(
    applyFadingAction(
      state,
      parsed,
      options.concept ?? A,
      options.today ?? DAY1,
      { sessionId: uuid(options.fresh ?? 100), seed: SEED },
      options.traps ?? [],
      { cards: options.cards },
    ),
  );
}
/** 화면이 받은 풀이 번호 — 저장 번호가 아니라 «저장 번호 + 그 내용»의 토큰이다(`contentKey.ts`). */
const ref = (
  state: StoredFading,
  concept: FadingConcept = A,
  traps: FadingTrap[] = [],
) => ({
  conceptId: A.id,
  sessionId: fadingSessionToken(
    state.session!.id,
    fadingContentKey(concept, traps),
  ),
});

/** 새 개념을 카드 풀이로 열어 4단계 앞까지(정독 · 칩 두 단계). */
function toFour(cards = true, seen?: string): StoredFading {
  let state = act(
    emptyFading(),
    { action: "open", conceptId: A.id },
    { cards },
  );
  state = act(
    state,
    { action: "read", ...ref(state), ...(seen ? { seen } : {}) },
    { cards },
  );
  for (const step of [2, 3] as const)
    state = act(
      state,
      { action: "step", ...ref(state), step, placements: chips(A, step, SEED) },
      { cards },
    );
  return state;
}
/** 카드 풀이를 안 틀리고 «알맞음»으로 닫은 칸 — 다음 복습은 사흘 뒤. */
function ratedA(): StoredFading {
  let state = toFour();
  state = act(
    state,
    { action: "step", ...ref(state), step: 4, placements: typed() },
    { cards: true },
  );
  return act(
    state,
    { action: "rate", ...ref(state), rating: "good", requestId: uuid(1) },
    { cards: true },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("카드 풀이의 문 — `MATH_FADING_CARDS`", () => {
  it("값이 없으면 꺼짐 · `on` 일 때만 켜짐 · 학생 라우트가 닫혀 있으면 꺼짐", () => {
    vi.stubEnv("MATH_FADING", "on");
    vi.stubEnv("MATH_FADING_CARDS", "");
    expect(fadingCardsEnabled()).toBe(false);
    for (const value of ["off", "ON", "1", "true", "read"]) {
      vi.stubEnv("MATH_FADING_CARDS", value);
      expect(fadingCardsEnabled(), value).toBe(false);
    }
    vi.stubEnv("MATH_FADING_CARDS", "on");
    expect(fadingCardsEnabled()).toBe(true);
    vi.stubEnv("MATH_FADING", "off");
    expect(fadingCardsEnabled()).toBe(false);
    vi.stubEnv("MATH_FADING", "read");
    expect(fadingCardsEnabled()).toBe(false);
  });
});

describe("풀이 엔진 — 카드 풀이의 입력", () => {
  const cardsAt4 = (): FadingSession => {
    let s = finishReading(startFadingSession(A, 1, SEED, "cards"));
    for (const step of [2, 3] as const)
      for (const p of chips(A, step, SEED))
        s = placeChip(
          s,
          A,
          p.targetId,
          (p as { chipId: string }).chipId,
        ).session;
    return s;
  };

  it("1단계는 카드 · 2 · 3단계는 칩 · 4단계만 자판이다 — 칩 풀이는 4단계도 칩이다", () => {
    const cards = startFadingSession(A, 1, SEED, "cards");
    expect(cards.mode).toBe("cards");
    expect(fadingStepInput(cards)).toBe("reading");
    expect(fadingStepInput({ ...cards, phase: "filling", step: 2 })).toBe(
      "chips",
    );
    expect(fadingStepInput({ ...cards, phase: "filling", step: 3 })).toBe(
      "chips",
    );
    expect(fadingStepInput({ ...cards, phase: "filling", step: 4 })).toBe(
      "typed",
    );
    const old = startFadingSession(A, 4, SEED);
    expect(old).not.toHaveProperty("mode");
    expect(fadingStepInput(old)).toBe("chips");
    expect(cardsAt4().step).toBe(4);
  });

  it("확신은 복습으로 연 카드 풀이에서만 묻는다", () => {
    expect(fadingAsksSure(startFadingSession(A, 4, SEED, "cards"))).toBe(true);
    expect(fadingAsksSure(startFadingSession(A, 1, SEED, "cards"))).toBe(false);
    expect(fadingAsksSure(startFadingSession(A, 3, SEED, "cards"))).toBe(false);
    expect(fadingAsksSure(startFadingSession(A, 4, SEED))).toBe(false);
  });

  it("자판 단계에는 칩을, 칩 단계에는 글을 넣을 수 없다", () => {
    const at4 = cardsAt4();
    const chip = chipTray(A, 4, { seed: SEED })[0]!;
    expect(() => placeChip(at4, A, T.hyp, chip.id)).toThrow();
    const at2 = finishReading(startFadingSession(A, 1, SEED, "cards"));
    const first = erasedTargets(A, 2)[0]!;
    expect(() => placeText(at2, A, first.id, first.text)).toThrow();
    const old = startFadingSession(A, 4, SEED);
    expect(() => placeText(old, A, T.hyp, "빗변")).toThrow();
  });

  it("맞음은 채워지고, 틀림은 적히고 다시 쓸 수 있고, 모름은 받아 두고 채워진 것으로 친다 — 모름은 고칠 수 없다", () => {
    let s = cardsAt4();
    const wrong = placeText(s, A, T.hyp, "중점");
    expect(wrong.outcome).toBe("wrong");
    expect(wrong.session.missed).toEqual([T.hyp]);
    expect(wrong.session.filled).toEqual({});
    const fixed = placeText(wrong.session, A, T.hyp, "빗변");
    expect(fixed.outcome).toBe("correct");
    expect(fixed.session.missed).toEqual([T.hyp]);
    const unknown = placeText(fixed.session, A, T.mid, "가운데");
    expect(unknown.outcome).toBe("unknown");
    expect(unknown.session.pending).toEqual([T.mid]);
    expect(unknown.session.filled[T.mid]).toBe("가운데");
    expect(() => placeText(unknown.session, A, T.mid, "중점")).toThrow();
    s = unknown.session;
    expect(() => placeText(s, A, T.perp, "  ")).toThrow();
  });

  it("다 쓰면 평가 차례 — 결과에 «다시»를 건 빈칸 · 대조를 기다리는 글(틀린 빈칸은 뺀다) · 쓴 글이 남는다", () => {
    let s = cardsAt4();
    s = placeText(s, A, T.hyp, "중점").session; // 틀림
    s = placeText(s, A, T.hyp, "가장 긴 변").session; // 틀린 뒤의 모름 — 대조에 넣지 않는다
    s = placeText(s, A, T.mid, "가운데").session; // 모름
    for (const id of [T.perp, T.r, T.half])
      s = placeText(s, A, id, CORRECT[id]!).session;
    expect(s.phase).toBe("rating");
    expect(s.results.at(-1)).toEqual({
      step: 4,
      blanks: 5,
      missed: [T.hyp],
      unjudged: [{ targetId: T.mid, text: "가운데" }],
      answers: {
        [T.perp]: CORRECT[T.perp],
        [T.r]: "R",
        [T.hyp]: "가장 긴 변",
        [T.mid]: "가운데",
        [T.half]: "c/2",
      },
    });
    expect(s).not.toHaveProperty("pending");
    expect(allowedRatings(s)).toEqual(["again"]);
  });

  it("카드 하나의 «아직 모르겠어요»는 그 카드의 남은 빈칸만 틀림으로 두고 답을 보이지 않는다 — 나머지를 다 써야 단계가 끝난다", () => {
    let s = cardsAt4();
    s = placeText(s, A, T.perp, CORRECT[T.perp]!).session;
    s = giveUpCard(s, A, "a1"); // 남은 것은 a1#2 하나
    expect(s.phase).toBe("filling");
    expect(s.skipped).toEqual([T.r]);
    expect(s.missed).toEqual([T.r]);
    expect(giveUpCard(s, A, "a1")).toBe(s);
    expect(() => placeText(s, A, T.r, "R")).toThrow();
    s = placeText(s, A, T.mid, "가운데").session;
    s = placeText(s, A, T.hyp, "빗변").session;
    expect(s.phase).toBe("filling");
    s = placeText(s, A, T.half, "c/2").session;
    expect(s.phase).toBe("rating");
    expect(s.results.at(-1)).toMatchObject({
      missed: [T.r],
      unjudged: [{ targetId: T.mid, text: "가운데" }],
    });
    expect(allowedRatings(s)).toEqual(["again"]);
    // 마지막 카드를 넘겨도 끝난다.
    let t = cardsAt4();
    for (const id of [T.perp, T.r, T.hyp, T.mid])
      t = placeText(t, A, id, CORRECT[id]!).session;
    t = giveUpCard(t, A, "a3");
    expect(t.phase).toBe("rating");
    expect(t.results.at(-1)!.missed).toEqual([T.half]);
    expect(() =>
      giveUpCard(
        finishReading(startFadingSession(A, 1, SEED, "cards")),
        A,
        "a1",
      ),
    ).toThrow();
    expect(() => giveUpCard(cardsAt4(), A, "nope")).toThrow();
  });

  it("대조 — 다 골라야 닫히고, «다름»이 하나라도 있으면 «다시»뿐이다 · 틀림이 있으면 고르지 않아도 «다시»로 닫힌다", () => {
    let s = cardsAt4();
    s = placeText(s, A, T.mid, "가운데").session;
    for (const id of [T.perp, T.r, T.hyp, T.half])
      s = placeText(s, A, id, CORRECT[id]!).session;
    expect(allowedRatings(s)).toHaveLength(4);
    expect(() => closeWithRating(s, "good")).toThrow();
    expect(() => closeWithRating(s, "again")).toThrow();
    expect(allowedRatings(s, { [T.mid]: "different" })).toEqual(["again"]);
    expect(() =>
      closeWithRating(s, "good", { [T.mid]: "different" }),
    ).toThrow();
    expect(closeWithRating(s, "again", { [T.mid]: "different" }).rating).toBe(
      "again",
    );
    expect(closeWithRating(s, "easy", { [T.mid]: "same" }).rating).toBe("easy");
    expect(() =>
      closeWithRating(s, "good", { [T.mid]: "same", [T.hyp]: "same" }),
    ).toThrow();
    let m = cardsAt4();
    m = placeText(m, A, T.hyp, "중점").session;
    m = placeText(m, A, T.mid, "가운데").session;
    for (const id of [T.perp, T.r, T.hyp, T.half])
      m = placeText(m, A, id, CORRECT[id]!).session;
    expect(closeWithRating(m, "again").rating).toBe("again");
  });

  it("다시 들어오면 서버의 풀이에서 같은 풀이가 선다 — 칩 풀이는 지금 화면과 같은 꼴", () => {
    const resumed = resumeFadingSession(A, {
      startStep: 4,
      step: 4,
      seed: SEED,
      phase: "rating",
      missedAtFour: [],
      mode: "cards",
      unjudged: [{ targetId: T.mid, text: "가운데" }],
    });
    expect(resumed).toMatchObject({ mode: "cards", phase: "rating", step: 4 });
    expect(resumed.results).toEqual([
      {
        step: 4,
        blanks: 5,
        missed: [],
        unjudged: [{ targetId: T.mid, text: "가운데" }],
        answers: { [T.mid]: "가운데" },
      },
    ]);
    expect(allowedRatings(resumed, { [T.mid]: "same" })).toHaveLength(4);
    const old = resumeFadingSession(A, {
      startStep: 1,
      step: 4,
      seed: SEED,
      phase: "steps",
      missedAtFour: [T.hyp],
    });
    expect(old).toEqual({
      ...startFadingSession(A, 4, SEED),
      startStep: 1,
      missed: [T.hyp],
    });
    const oldRating = resumeFadingSession(A, {
      startStep: 4,
      step: 4,
      seed: SEED,
      phase: "rating",
      missedAtFour: [T.hyp],
    });
    expect(oldRating.results).toEqual([
      { step: 4, blanks: 5, missed: [T.hyp] },
    ]);
  });
});

describe("카드 풀이에서 화면이 쓰는 값", () => {
  it("진단 글은 명제 차례로 한 글자 — 0 은 묻지 않음 · 1 ~ 3 은 단추", () => {
    expect(encodeFadingMarks([1, 2, 3, 0])).toBe("1230");
    expect(decodeFadingMarks("0312")).toEqual([0, 3, 1, 2]);
    expect(() => encodeFadingMarks([])).toThrow();
    expect(() => encodeFadingMarks([4 as 0])).toThrow();
    expect(() => decodeFadingMarks("12a")).toThrow();
  });

  it("대조의 재료 — 화면의 풀이로도, 다시 들어온 서버의 풀이로도 같은 꼴이 선다", () => {
    const local = fadingComparison(A, {
      missed: [T.hyp],
      unjudged: [{ targetId: T.mid, text: "가운데" }],
      answers: { [T.hyp]: "중점", [T.mid]: "가운데", [T.perp]: "수직이등분선" },
    });
    expect(local.map((card) => card.proposition.id)).toEqual([
      "a1",
      "a2",
      "a3",
    ]);
    expect(
      local[1]!.blanks.map((b) => [b.target.id, b.verdict, b.text]),
    ).toEqual([
      [T.hyp, "missed", "중점"],
      [T.mid, "pending", "가운데"],
    ]);
    expect(local[0]!.blanks[0]).toMatchObject({
      verdict: "correct",
      text: "수직이등분선",
    });
    const reloaded = fadingComparison(A, {
      missed: [T.hyp],
      unjudged: [{ targetId: T.mid, text: "가운데" }],
    });
    expect(reloaded[1]!.blanks.map((b) => b.text)).toEqual([null, "가운데"]);
    expect(reloaded[0]!.blanks[0]!.text).toBeNull();
  });

  it("카드 하나의 그 단계 빈칸", () => {
    expect(fadingCardBlanks(A, 4, "a2").map((t) => t.id)).toEqual([
      T.hyp,
      T.mid,
    ]);
    const at2 = new Set(erasedTargets(A, 2).map((t) => t.id));
    expect(fadingCardBlanks(A, 2, "a1").every((t) => at2.has(t.id))).toBe(true);
  });

  it("늘 보이는 이름은 지운 답을 통째로도 · 낱말 하나로도 드러내지 않는다", () => {
    expect(fadingSafeLabel("선분, 반직선, 직선", [{ text: "직선" }])).toBe(
      false,
    );
    expect(
      fadingSafeLabel("동류항의 계산", [{ text: "동류항끼리 모아" }]),
    ).toBe(false);
    expect(fadingSafeLabel("삼각형의 외심", [{ text: "외심" }])).toBe(false);
    expect(fadingSafeLabel("삼각형의 외심", [{ text: "수직이등분선" }])).toBe(
      true,
    );
    expect(
      fadingSafeLabel("항", [{ text: "하나의 항으로 합칠 수 없다" }]),
    ).toBe(false);
    expect(fadingSafeLabel("삼각형의 외심", [])).toBe(true);
    expect(fadingSafeLabel("  ", [{ text: "직선" }])).toBe(false);
  });

  it("은행 전체 — 2 ~ 4단계에 보여도 된다고 한 용어 · 소단원 제목은 그 단계에서 지운 답(두 글자 이상)을 품지 않고, 옛 규칙이 숨기던 것은 다 숨긴다", async () => {
    const { CONCEPT_BLANK_BANK } = await import("@/lib/concept-blank/bank");
    const { FADING_GROUPS } = await import("@/lib/fading/groups");
    const concepts = buildFadingConcepts(
      CONCEPT_BLANK_BANK.concepts,
      FADING_GROUPS,
    );
    const squeeze = (text: string) =>
      text
        .normalize("NFKC")
        .toLowerCase()
        .replace(/\\[a-z]+/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "");
    const oldShows = (label: string, erased: { text: string }[]) => {
      const topic = squeeze(label);
      return (
        !!topic &&
        !erased.some((t) => {
          const a = squeeze(t.text);
          return !a || topic.includes(a) || a.includes(topic);
        })
      );
    };
    const leaks: string[] = [];
    const looser: string[] = [];
    let shown = 0;
    for (const concept of concepts)
      for (const step of [2, 3, 4] as const) {
        const erased = erasedTargets(concept, step);
        const unit = concept.section.split("::")[2]!.replace(/^[\d-]+\s*/, "");
        const labels = [unit, ...concept.propositions.map((p) => p.term)];
        for (const label of labels) {
          const safe = fadingSafeLabel(label, erased);
          if (safe && !oldShows(label, erased))
            looser.push(`${concept.id}:${step}:${label}`);
          if (!safe) continue;
          shown++;
          for (const t of erased) {
            const a = squeeze(t.text);
            if (a.length >= 2 && squeeze(label).includes(a))
              leaks.push(`${concept.id}:${step}:${label} ⊃ ${t.text}`);
          }
        }
      }
    expect(shown).toBeGreaterThan(1000);
    expect(leaks).toEqual([]);
    expect(looser).toEqual([]);
  }, 120_000);
});

describe("저장 칸 — 새 개념을 카드 풀이로", () => {
  it("열면 방식이 박히고(지문은 4단계를 마칠 때), 정독은 사전 확인을 같이 적는다 — 명제 수와 다르면 적지 않고 넘어간다", () => {
    const opened = act(
      emptyFading(),
      { action: "open", conceptId: A.id },
      { cards: true },
    );
    expect(opened.session).toMatchObject({ mode: "cards" });
    expect(opened.session).not.toHaveProperty("digest");
    const read = act(
      opened,
      { action: "read", ...ref(opened), seen: "321" },
      { cards: true },
    );
    expect(read.session!.seen).toBe("321");
    expect(read.concepts[A.id]!.step).toBe(2);
    const short = act(
      opened,
      { action: "read", ...ref(opened), seen: "32" },
      { cards: true },
    );
    expect(short.session).not.toHaveProperty("seen");
    expect(short.concepts[A.id]!.step).toBe(2);
    // 이미 지난 정독의 되풀이는 아무것도 바꾸지 않는다.
    expect(
      applyFadingAction(
        read,
        { action: "read", ...ref(read), seen: "111" },
        A,
        DAY1,
        { sessionId: uuid(9), seed: 1 },
        [],
        { cards: true },
      ),
    ).toBe(read);
  });

  it("4단계 — 틀린 글은 그 자리에서 적고, 다 쓰면 대조를 기다리는 글이 남는다 · 새로고침 뒤의 되풀이는 아무것도 바꾸지 않는다", () => {
    let state = toFour();
    state = act(
      state,
      {
        action: "miss",
        ...ref(state),
        placement: { targetId: T.hyp, text: "중점" },
      },
      { cards: true },
    );
    expect(state.session!.missedAtFour).toEqual([T.hyp]);
    // 맞은 글 · 모르는 글 · 칩은 틀림으로 받지 않는다.
    for (const placement of [
      { targetId: T.hyp, text: "빗변" },
      { targetId: T.hyp, text: "가장 긴 변" },
      { targetId: T.hyp, chipId: "c1" },
    ])
      expect(
        () =>
          act(
            state,
            { action: "miss", ...ref(state), placement },
            { cards: true },
          ),
        JSON.stringify(placement),
      ).toThrow(FadingConflict);
    const done = act(
      state,
      {
        action: "step",
        ...ref(state),
        step: 4,
        placements: typed({ [T.mid]: "가운데" }),
      },
      { cards: true },
    );
    expect(done.session).toMatchObject({
      phase: "rating",
      missedAtFour: [T.hyp],
      unjudged: [{ targetId: T.mid, text: "가운데" }],
    });
    const again = applyFadingAction(
      done,
      { action: "step", ...ref(done), step: 4, placements: typed() },
      A,
      DAY1,
      { sessionId: uuid(9), seed: 1 },
      [],
      { cards: true },
    );
    expect(again).toBe(done);
    const view = fadingStateView({
      fading: done,
      revision: 1,
      today: DAY1,
      concepts: new Map([[A.id, A]]),
      cards: true,
    });
    expect(view.mode).toBe("cards");
    expect(view.session).toMatchObject({
      mode: "cards",
      unjudged: [{ targetId: T.mid, text: "가운데" }],
    });
    expect(view.session!.ratings.map((r) => r.rating)).toEqual(["again"]);
  });

  it("단계 요청 안의 틀린 글도 «틀림»으로 적힌다 — 그 자리의 `miss` 를 빠뜨려도", () => {
    let state = toFour();
    state = act(
      state,
      {
        action: "step",
        ...ref(state),
        step: 4,
        placements: [{ targetId: T.hyp, text: "중점" }, ...typed()],
      },
      { cards: true },
    );
    expect(state.session!.missedAtFour).toEqual([T.hyp]);
  });

  it("평가 — 대조를 다 골라야 닫히고, «다름»은 «다시», «같은 뜻»뿐이면 네 평가를 다 고를 수 있다 · 진단은 개념에 한 벌 남는다", () => {
    let state = toFour(true, "123");
    state = act(
      state,
      {
        action: "step",
        ...ref(state),
        step: 4,
        placements: typed({ [T.mid]: "가운데" }),
      },
      { cards: true },
    );
    const rate = (
      rating: (typeof FSRS_RATINGS)[number],
      judged?: Record<string, "same" | "different">,
    ) =>
      act(
        state,
        {
          action: "rate",
          ...ref(state),
          rating,
          requestId: uuid(2),
          ...(judged ? { judged } : {}),
        },
        { cards: true },
      );
    expect(() => rate("good")).toThrow(FadingConflict);
    expect(() => rate("good", { [T.mid]: "different" })).toThrow(
      FadingConflict,
    );
    expect(() => rate("good", { [T.mid]: "same", [T.hyp]: "same" })).toThrow(
      FadingConflict,
    );
    const lapsed = rate("again", { [T.mid]: "different" });
    expect(lapsed.concepts[A.id]).toMatchObject({
      step: 2,
      reviews: 1,
      lapses: 1,
    });
    expect(lapsed.concepts[A.id]!.marks).toEqual({
      digest: fadingConceptDigest(A),
      seen: "123",
      missed: [T.mid],
    });
    for (const rating of FSRS_RATINGS) {
      const passed = rate(rating, { [T.mid]: "same" });
      expect(passed.concepts[A.id]!.step).toBe(rating === "again" ? 2 : 4);
      expect(passed.concepts[A.id]!.marks).toEqual({
        digest: fadingConceptDigest(A),
        seen: "123",
      });
    }
  });

  it("진짜 틀림은 «같은 뜻»으로 넘길 수 없다 — 틀린 빈칸은 대조에 없고, 고르려 하면 거절한다", () => {
    let state = toFour();
    state = act(
      state,
      {
        action: "miss",
        ...ref(state),
        placement: { targetId: T.hyp, text: "중점" },
      },
      { cards: true },
    );
    state = act(
      state,
      {
        action: "step",
        ...ref(state),
        step: 4,
        placements: typed({ [T.hyp]: "가장 긴 변" }),
      },
      { cards: true },
    );
    expect(state.session).not.toHaveProperty("unjudged");
    const rate = (rating: "good" | "again", judged?: Record<string, "same">) =>
      act(
        state,
        {
          action: "rate",
          ...ref(state),
          rating,
          requestId: uuid(3),
          ...(judged ? { judged } : {}),
        },
        { cards: true },
      );
    expect(() => rate("good", { [T.hyp]: "same" })).toThrow(FadingConflict);
    expect(() => rate("again", { [T.hyp]: "same" })).toThrow(FadingConflict);
    expect(() => rate("good")).toThrow(FadingConflict);
    const closed = rate("again");
    expect(closed.concepts[A.id]!.marks!.missed).toEqual([T.hyp]);
  });

  it("카드를 넘기면(«아직 모르겠어요») 넘긴 빈칸만 틀림이 되고 평가는 «다시»뿐이다 — 쓴 것은 다 돌린 뒤에 센다", () => {
    let state = toFour();
    const placements = typed({ [T.mid]: "가운데" }).filter(
      (p) => p.targetId !== T.r,
    );
    state = act(
      state,
      { action: "step", ...ref(state), step: 4, placements, gaveUp: true },
      { cards: true },
    );
    expect(state.session).toMatchObject({
      missedAtFour: [T.r],
      unjudged: [{ targetId: T.mid, text: "가운데" }],
    });
    expect(() =>
      act(
        state,
        {
          action: "rate",
          ...ref(state),
          rating: "good",
          requestId: uuid(4),
          judged: { [T.mid]: "same" },
        },
        { cards: true },
      ),
    ).toThrow(FadingConflict);
    const closed = act(
      state,
      { action: "rate", ...ref(state), rating: "again", requestId: uuid(4) },
      { cards: true },
    );
    expect(closed.concepts[A.id]!.marks!.missed).toEqual([T.r]);
  });
});

describe("저장 칸 — 복습은 4단계에서 바로 · 확신은 진단일 뿐", () => {
  it("평가한 개념의 복습은 4단계에서 시작하고 확신을 적는다 — 배우는 풀이의 확신 · 명제 수가 다른 확신은 적지 않는다", () => {
    const rated = ratedA();
    const opened = act(
      rated,
      { action: "open", conceptId: A.id },
      { cards: true, today: DAY4, fresh: 200 },
    );
    expect(opened.session).toMatchObject({ startStep: 4, mode: "cards" });
    const reviewed = act(
      opened,
      {
        action: "step",
        ...ref(opened),
        step: 4,
        placements: typed(),
        sure: "321",
      },
      { cards: true, today: DAY4 },
    );
    expect(reviewed.session!.sure).toBe("321");
    const odd = act(
      opened,
      {
        action: "step",
        ...ref(opened),
        step: 4,
        placements: typed(),
        sure: "32",
      },
      { cards: true, today: DAY4 },
    );
    expect(odd.session).not.toHaveProperty("sure");
    let learning = toFour();
    learning = act(
      learning,
      {
        action: "step",
        ...ref(learning),
        step: 4,
        placements: typed(),
        sure: "321",
      },
      { cards: true },
    );
    expect(learning.session).not.toHaveProperty("sure");
  });

  it("확신이 무엇이든 평가 · 일정은 같다 — 평가 한 번에 일정 계산기는 한 번 돈다", () => {
    const rated = ratedA();
    const close = (sure: string) => {
      let s = act(
        rated,
        { action: "open", conceptId: A.id },
        { cards: true, today: DAY4, fresh: 200 },
      );
      s = act(
        s,
        { action: "step", ...ref(s), step: 4, placements: typed(), sure },
        { cards: true, today: DAY4 },
      );
      expect(
        s.session &&
          fadingStateView({
            fading: s,
            revision: 1,
            today: DAY4,
            concepts: new Map([[A.id, A]]),
          }).session!.ratings.length,
      ).toBe(4);
      return act(
        s,
        { action: "rate", ...ref(s), rating: "good", requestId: uuid(5) },
        { cards: true, today: DAY4 },
      );
    };
    const low = close("111");
    const high = close("333");
    const { marks: lowMarks, ...lowRest } = low.concepts[A.id]!;
    const { marks: highMarks, ...highRest } = high.concepts[A.id]!;
    expect(lowRest).toEqual(highRest);
    expect(lowMarks!.sure).toBe("111");
    expect(highMarks!.sure).toBe("333");
    const expected = applyFadingRating(
      fadingProgressOf(rated.concepts[A.id]!),
      4,
      "good",
      fadingDayOfDate(DAY4),
    );
    expect(lowRest).toMatchObject({
      stability: expected.memory!.stability,
      difficulty: expected.memory!.difficulty,
      reviews: rated.concepts[A.id]!.reviews + 1,
    });
    // 같은 평가 요청이 다시 와도 한 번만 — 영수증이 있다.
    const replay = applyFadingAction(
      low,
      {
        action: "rate",
        conceptId: A.id,
        sessionId: uuid(200),
        rating: "easy",
        requestId: uuid(5),
      },
      A,
      DAY4,
      { sessionId: uuid(9), seed: 1 },
      [],
      { cards: true },
    );
    expect(replay).toBe(low);
  });
});

describe("저장 칸 — 열린 옛 풀이와 옛 화면", () => {
  /** 문이 꺼진 때 연 칩 풀이를 4단계에서 한 번 틀린 채로. */
  function oldAtFour(): StoredFading {
    let state = act(emptyFading(), { action: "open", conceptId: A.id });
    state = act(state, { action: "read", ...ref(state) });
    for (const step of [2, 3] as const)
      state = act(state, {
        action: "step",
        ...ref(state),
        step,
        placements: chips(A, step, SEED),
      });
    const tray = chipTray(A, 4, { seed: SEED });
    return act(state, {
      action: "miss",
      ...ref(state),
      placement: {
        targetId: T.hyp,
        chipId: tray.find((c) => !chipFits(A, T.hyp, c))!.id,
      },
    });
  }

  it("문이 켜져도 열린 옛 풀이는 칩으로 끝나고 적어 둔 틀림이 남는다 — 다시 열어도 그대로다", () => {
    const old = oldAtFour();
    expect(old.session).not.toHaveProperty("mode");
    const reopened = act(
      old,
      { action: "open", conceptId: A.id },
      { cards: true },
    );
    expect(reopened).toStrictEqual(old);
    expect(reopened.session).not.toHaveProperty("mode");
    expect(() =>
      act(
        reopened,
        { action: "step", ...ref(reopened), step: 4, placements: typed() },
        { cards: true },
      ),
    ).toThrow(FadingConflict);
    const done = act(
      reopened,
      {
        action: "step",
        ...ref(reopened),
        step: 4,
        placements: chips(A, 4, SEED),
      },
      { cards: true },
    );
    expect(done.session).toMatchObject({
      phase: "rating",
      missedAtFour: [T.hyp],
    });
    expect(() =>
      act(
        done,
        { action: "rate", ...ref(done), rating: "good", requestId: uuid(6) },
        { cards: true },
      ),
    ).toThrow(FadingConflict);
    const closed = act(
      done,
      { action: "rate", ...ref(done), rating: "again", requestId: uuid(6) },
      { cards: true },
    );
    expect(closed.concepts[A.id]).not.toHaveProperty("marks");
    expect(closed.concepts[A.id]!.step).toBe(2);
  });

  it("옛 화면이 카드 풀이의 4단계에 칩을 보내면 409 다 — 칩으로 알아본 것을 떠올려 쓴 것으로 받지 않는다", () => {
    const state = toFour();
    const tray = chipTray(A, 4, { seed: SEED });
    expect(() =>
      act(
        state,
        {
          action: "step",
          ...ref(state),
          step: 4,
          placements: chips(A, 4, SEED),
        },
        { cards: true },
      ),
    ).toThrow(FadingConflict);
    expect(() =>
      act(
        state,
        {
          action: "miss",
          ...ref(state),
          placement: {
            targetId: T.hyp,
            chipId: tray.find((c) => !chipFits(A, T.hyp, c))!.id,
          },
        },
        { cards: true },
      ),
    ).toThrow(FadingConflict);
    // 문이 꺼진 뒤에도 카드 풀이는 카드 풀이다(연 때의 방식).
    expect(() =>
      act(state, {
        action: "step",
        ...ref(state),
        step: 4,
        placements: chips(A, 4, SEED),
      }),
    ).toThrow(FadingConflict);
    expect(
      act(state, {
        action: "step",
        ...ref(state),
        step: 4,
        placements: typed(),
      }).session!.phase,
    ).toBe("rating");
  });

  it("문이 꺼져 있으면 카드 풀이의 칸을 하나도 쓰지 않는다 — 처음부터 평가까지 옛 꼴(과 D1 의 «푼 내용의 지문») 그대로", () => {
    const legacySession = [
      "id",
      "conceptId",
      "startStep",
      "seed",
      "phase",
      "missedAtFour",
    ].sort();
    const legacyConcept = [
      "step",
      "stability",
      "difficulty",
      "reviewedOn",
      "dueOn",
      "digest",
      "reviews",
      "lapses",
      "addedOn",
    ].sort();
    const seen: StoredFading[] = [];
    let state = act(emptyFading(), { action: "open", conceptId: A.id });
    seen.push(state);
    state = act(state, { action: "read", ...ref(state), seen: "123" });
    seen.push(state);
    for (const step of [2, 3, 4] as const) {
      state = act(state, {
        action: "step",
        ...ref(state),
        step,
        placements: chips(A, step, SEED),
        sure: "333",
      });
      seen.push(state);
    }
    state = act(state, {
      action: "rate",
      ...ref(state),
      rating: "good",
      requestId: uuid(7),
    });
    seen.push(state);
    for (const each of seen) {
      for (const stored of Object.values(each.concepts))
        expect(Object.keys(stored).sort()).toEqual(legacyConcept);
      // 4단계를 마친 풀이의 «푼 내용의 지문»은 카드 풀이 이전부터 쓰던 칸이다(D1 — main `e355f7864`).
      if (each.session)
        expect(Object.keys(each.session).sort()).toEqual(
          [
            ...legacySession,
            ...(each.session.phase === "rating" ? ["digest"] : []),
          ].sort(),
        );
    }
    const view = fadingStateView({
      fading: seen[2]!,
      revision: 1,
      today: DAY1,
      concepts: new Map([[A.id, A]]),
    });
    expect(view).not.toHaveProperty("mode");
    expect(Object.keys(view.session!).sort()).toEqual([
      "conceptId",
      "id",
      "missedAtFour",
      "phase",
      "ratings",
      "seed",
      "startStep",
      "step",
    ]);
  });

  it("옛 요청의 꼴은 글자 그대로 읽힌다", () => {
    const sessionId = uuid(8);
    const old = [
      { action: "pick", conceptId: A.id },
      { action: "drop", conceptId: A.id },
      { action: "open", conceptId: A.id },
      { action: "read", conceptId: A.id, sessionId },
      {
        action: "miss",
        conceptId: A.id,
        sessionId,
        placement: { targetId: T.hyp, chipId: "c2" },
      },
      {
        action: "step",
        conceptId: A.id,
        sessionId,
        step: 2,
        placements: [{ targetId: T.hyp, chipId: "c1" }],
      },
      {
        action: "step",
        conceptId: A.id,
        sessionId,
        step: 4,
        placements: [],
        gaveUp: true,
      },
      {
        action: "rate",
        conceptId: A.id,
        sessionId,
        rating: "hard",
        requestId: uuid(9),
      },
      { action: "all-today", on: true },
    ];
    for (const request of old)
      expect(fadingActionSchema.parse(request)).toStrictEqual(request);
    expect(
      fadingActionSchema.safeParse({
        action: "read",
        conceptId: A.id,
        sessionId,
        seen: "4",
      }).success,
    ).toBe(false);
    expect(
      fadingActionSchema.safeParse({
        action: "rate",
        conceptId: A.id,
        sessionId,
        rating: "good",
        requestId: uuid(9),
        judged: { [T.mid]: "maybe" },
      }).success,
    ).toBe(false);
  });
});

describe("저장 칸 — 풀이 중에 은행의 문장이 고쳐지면(풀이 토큰 · 푼 내용의 지문)", () => {
  it("옛 화면의 요청(옛 토큰)은 409 이고 아무것도 쓰지 않는다 — 다시 읽은 화면은 같은 풀이 · 씨앗 · 방식으로 이어 가고 적어 둔 틀림은 남는다", () => {
    let four = toFour();
    four = act(
      four,
      {
        action: "miss",
        ...ref(four),
        placement: { targetId: T.hyp, text: "중점" },
      },
      { cards: true },
    );
    for (const action of [
      { action: "step", ...ref(four), step: 4, placements: typed() },
      {
        action: "miss",
        ...ref(four),
        placement: { targetId: T.r, text: "중점" },
      },
    ] as const)
      expect(() =>
        act(four, action, { cards: true, concept: A_EDITED }),
      ).toThrow(FADING_CONTENT_CHANGED);
    // 함정 표만 바뀌어도 칩 번호가 바뀐다 — 같이 막는다.
    expect(() =>
      act(
        four,
        { action: "step", ...ref(four), step: 4, placements: typed() },
        { cards: true, traps: [{ text: "내심" }] },
      ),
    ).toThrow(FADING_CONTENT_CHANGED);
    const done = act(
      four,
      {
        action: "step",
        ...ref(four, A_EDITED),
        step: 4,
        placements: typed({ [T.mid]: "가운데 점" }),
      },
      { cards: true, concept: A_EDITED },
    );
    expect(done.session).toMatchObject({
      id: four.session!.id,
      seed: SEED,
      mode: "cards",
      phase: "rating",
      missedAtFour: [T.hyp],
      digest: fadingConceptDigest(A_EDITED),
    });
    expect(done.concepts).toEqual(four.concepts);
  });

  it("평가만 남은 풀이 — 푼 뒤에 문장이 고쳐졌으면 대조를 받지 않고 «다시»뿐이다(고르지 않아도 닫힌다) · 학생이 푼 내용의 지문이 남는다", () => {
    let waiting = toFour();
    waiting = act(
      waiting,
      {
        action: "step",
        ...ref(waiting),
        step: 4,
        placements: typed({ [T.perp]: "수직인 선" }),
      },
      { cards: true },
    );
    expect(waiting.session).toMatchObject({
      digest: fadingConceptDigest(A),
      unjudged: [{ targetId: T.perp, text: "수직인 선" }],
    });
    const edited = { cards: true, concept: A_EDITED };
    const view = fadingStateView({
      fading: waiting,
      revision: 1,
      today: DAY1,
      concepts: new Map([[A.id, A_EDITED]]),
      cards: true,
    });
    expect(view.session).toMatchObject({
      stale: true,
      id: ref(waiting, A_EDITED).sessionId,
    });
    expect(view.session!.ratings.map((r) => r.rating)).toEqual(["again"]);
    expect(() =>
      act(
        waiting,
        {
          action: "rate",
          ...ref(waiting, A_EDITED),
          rating: "good",
          requestId: uuid(11),
          judged: { [T.perp]: "same" },
        },
        edited,
      ),
    ).toThrow(FadingConflict);
    const closed = act(
      waiting,
      {
        action: "rate",
        ...ref(waiting, A_EDITED),
        rating: "again",
        requestId: uuid(11),
      },
      edited,
    );
    expect(closed.concepts[A.id]).toMatchObject({
      step: 2,
      digest: fadingConceptDigest(A),
    });
    // 대조할 것이 없으면 그대로 평가받고, «바뀜»이 선다.
    let plain = toFour();
    plain = act(
      plain,
      { action: "step", ...ref(plain), step: 4, placements: typed() },
      { cards: true },
    );
    const rated = act(
      plain,
      {
        action: "rate",
        ...ref(plain, A_EDITED),
        rating: "good",
        requestId: uuid(12),
      },
      edited,
    );
    expect(rated.concepts[A.id]!.digest).toBe(fadingConceptDigest(A));
    expect(rated.concepts[A.id]!.digest).not.toBe(
      fadingConceptDigest(A_EDITED),
    );
  });

  it("칩 풀이의 응답에는 «바뀜» 칸이 실리지 않는다 — 문이 꺼진 동안 응답이 지금 꼴 그대로", () => {
    let old = act(emptyFading(), { action: "open", conceptId: A.id });
    old = act(old, { action: "read", ...ref(old) });
    for (const step of [2, 3, 4] as const)
      old = act(old, {
        action: "step",
        ...ref(old),
        step,
        placements: chips(A, step, SEED),
      });
    const view = fadingStateView({
      fading: old,
      revision: 1,
      today: DAY1,
      concepts: new Map([[A.id, A_EDITED]]),
    });
    expect(view.session).not.toHaveProperty("stale");
    expect(view.session!.ratings).toHaveLength(4);
  });
});

describe("서버 없이 도는 미리 보기 — 같은 방식", () => {
  it("카드 풀이로 열면 상태 · 개념 하나에 방식이 실리고, 안 주면 지금 꼴 그대로다", async () => {
    const source = createLocalFadingSource({
      concepts: [A],
      today: DAY1,
      cards: true,
      fresh: () => ({ sessionId: uuid(400), seed: SEED }),
    });
    expect((await source.state()).mode).toBe("cards");
    const opened = await source.act({ action: "open", conceptId: A.id });
    expect(opened.session).toMatchObject({
      mode: "cards",
      id: fadingSessionToken(uuid(400), fadingContentKey(A)),
    });
    expect((await source.concept(A.id)).mode).toBe("cards");
    const plain = createLocalFadingSource({ concepts: [A], today: DAY1 });
    expect(await plain.state()).not.toHaveProperty("mode");
    expect(await plain.concept(A.id)).not.toHaveProperty("mode");
    const old = await plain.act({ action: "open", conceptId: A.id });
    expect(old.session).not.toHaveProperty("mode");
  });
});
