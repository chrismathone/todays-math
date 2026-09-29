import { describe, expect, it, vi } from "vitest";
import {
  SENTENCE_FIT_STEPS,
  SENTENCE_MIN_PX,
  pickSentenceStep,
  sentenceEnd,
  sentenceSteps,
} from "@/components/math-explorers/sentenceFit";

/**
 * 문장 조립 — 넘칠 때만 글씨 줄이기(원장님 2026-09-29, D-143 · 05 §8.19). 단계 고르기는 순수 함수다:
 * «그 단계로 그렸을 때 문장 끝이 어디인가»(재기)와 «칸의 보이는 아래 끝»(한계) → 단계.
 */
describe("pickSentenceStep", () => {
  const limit = 400;

  it("keeps the sentence as drawn when it fits and measures only once", () => {
    const bottomAt = vi.fn(() => 380);
    expect(pickSentenceStep(bottomAt, limit)).toBe(1);
    expect(bottomAt.mock.calls).toEqual([[1]]);
  });

  it("shrinks one step when only the smaller size fits", () => {
    const bottomAt = vi.fn((step: number) => (step === 1 ? 460 : 395));
    expect(pickSentenceStep(bottomAt, limit)).toBe(0.9);
    expect(bottomAt.mock.calls).toEqual([[1], [0.9]]);
  });

  it("stops at the floor when even the floor overflows (the pane scrolls as before)", () => {
    const bottomAt = vi.fn(() => 520);
    expect(pickSentenceStep(bottomAt, limit, 1, sentenceSteps(19))).toBe(0.8);
    expect(bottomAt.mock.calls).toEqual([[1], [0.9], [0.8]]);
    expect(pickSentenceStep(() => 520, limit, 1, sentenceSteps(22))).toBe(0.7);
  });

  it("does not try steps above `from` — within one activity the sentence only shrinks", () => {
    const bottomAt = vi.fn(() => 380);
    expect(pickSentenceStep(bottomAt, limit, 0.9)).toBe(0.9);
    expect(bottomAt.mock.calls).toEqual([[0.9]]);
  });

  it("comes up to this width's floor when the drawn step is below it (just turned narrow)", () => {
    // 넓은 폭 0.7(15.4px)로 그린 채 좁은 폭(19px)이 되면 0.7 은 13.3px — 이 폭의 바닥 0.8 로 올린다.
    expect(pickSentenceStep(() => 999, 400, 0.7, sentenceSteps(19))).toBe(0.8);
  });

  it("allows half a pixel of rounding at the pane edge", () => {
    expect(pickSentenceStep(() => 400.5, limit)).toBe(1);
    expect(pickSentenceStep((step) => (step === 1 ? 400.6 : 0), limit)).toBe(
      0.9,
    );
  });

  it("steps 1 → 0.9 → 0.8 → 0.7 but never below 15px of text (3-way, second round)", () => {
    expect([...SENTENCE_FIT_STEPS]).toEqual([1, 0.9, 0.8, 0.7]);
    expect(SENTENCE_MIN_PX).toBe(15);
    // 넓은 폭 22px — 15.4px 까지(0.7). 좁은 폭 19px — 15.2px 에서 멈춤(0.7 은 13.3px 라 보기 글 14px 밑).
    expect(sentenceSteps(22)).toEqual([1, 0.9, 0.8, 0.7]);
    expect(sentenceSteps(19)).toEqual([1, 0.9, 0.8]);
    expect(sentenceSteps(19).map((s) => +(19 * s).toFixed(1))).toEqual([
      19, 17.1, 15.2,
    ]);
  });

  it("stops at 0.8 when the base size is unknown (the first-round floor)", () => {
    expect(sentenceSteps(Number.NaN)).toEqual([1, 0.9, 0.8]);
  });

  it("never drops the full size even for a small base", () => {
    expect(sentenceSteps(14)).toEqual([1]);
  });
});

describe("sentenceEnd", () => {
  it("is the lowest drawn box — text lines and blank buttons alike", () => {
    expect(
      sentenceEnd([
        { width: 40, height: 20, bottom: 120 },
        { width: 58, height: 42, bottom: 131 }, // 빈칸 단추 — 글보다 아래로 내려온다
        { width: 30, height: 20, bottom: 125 },
      ]),
    ).toBe(131);
  });

  it("ignores empty boxes (collapsed spaces between pieces)", () => {
    expect(
      sentenceEnd([
        { width: 40, height: 20, bottom: 120 },
        { width: 0, height: 20, bottom: 900 },
        { width: 40, height: 0, bottom: 900 },
      ]),
    ).toBe(120);
  });

  it("has no end when nothing is drawn yet", () => {
    expect(sentenceEnd([])).toBe(Number.NEGATIVE_INFINITY);
  });
});
