/**
 * 오늘의 영어 — 고쳐 쓰기 되먹임의 **근거 자리 짚기** (D-151 · 25 §12).
 * 검증기 사유 «근거를 지문에서 찾지 못했습니다» 한 줄만 되먹이면 gpt-6-luna 가 어디가 틀렸는지 모른 채 근거를 더 길게 다시 써
 * 또 거절됐다(벤치 2026-09-30: 고쳐 쓰기 3건 중 1건 실패, 근거 602자). 자리를 짚어 주니 4건 모두 한 번에 통과했다.
 * 표본 지문은 우리가 지은 짧은 글이다.
 */
import { describe, expect, it } from "vitest";

import type { EnglishQuestion } from "@/contracts/english.contract";
import { englishDraftFeedback } from "@/lib/english/feedback";

const passage =
  "Many students think that talent decides success. However, research shows that steady practice matters more. A pianist who practices every day improves faster than one who waits for inspiration. Small efforts, repeated over time, build real skill. Therefore, habits are more important than gifts.";

const expect1 = {
  mode: "original" as const,
  passage,
  count: 1,
  types: ["서술형" as const],
  words: 60,
};

function draftWith(evidence: string) {
  const question: EnglishQuestion = {
    type: "서술형",
    prompt: "글의 요지를 영어 한 문장으로 쓰시오.",
    options: [],
    answer: "Steady practice matters more than talent.",
    explanation: "핵심어 2점 · 어법 1점",
    evidence,
  };
  return { title: "연습", source: "deepseek", passage, questions: [question] };
}

const diagnosis = (lines: string[]) =>
  lines.filter((line) => line.startsWith("q1 근거 진단:"));

describe("englishDraftFeedback — 근거 자리 짚기", () => {
  it("사이 문장을 건너뛰고 이어 붙인 근거 → 어디까지 같고 어디서 어긋나는지 · 지문은 무엇으로 이어지는지", () => {
    const lines = englishDraftFeedback(
      draftWith(
        "However, research shows that steady practice matters more. Small efforts, repeated over time, build real skill.",
      ),
      expect1,
    );
    const [line] = diagnosis(lines);
    expect(line).toBeDefined();
    expect(line).toContain("steady practice matters more.");
    expect(line).toContain("«Small efforts, repeated over time");
    expect(line).toContain("지문은 «A pianist who practices");
    expect(line).toContain("근거는 2문장");
    expect(line).toContain("문장 하나를 첫 글자부터 끝 문장부호까지");
  });

  it("낱말을 바꾼 근거 → 첫머리부터 없다 · 가장 가까운 지문 문장을 권한다", () => {
    const lines = englishDraftFeedback(
      draftWith("Small steps, repeated over time, build real skill."),
      expect1,
    );
    const [line] = diagnosis(lines);
    expect(line).toContain("근거 첫머리 «Small steps");
    expect(line).toContain(
      "가장 가까운 지문 문장: «Small efforts, repeated over time, build real skill.»",
    );
  });

  it("지문과 닮은 문장이 없으면 엉뚱한 문장을 권하지 않는다", () => {
    const [line] = diagnosis(
      englishDraftFeedback(
        draftWith("Rockets need fuel to reach orbit around the moon."),
        expect1,
      ),
    );
    expect(line).toBeDefined();
    expect(line).not.toContain("가장 가까운 지문 문장");
  });

  it("진단 줄은 그 문항의 검증기 사유 바로 뒤에 온다", () => {
    const lines = englishDraftFeedback(
      draftWith("Small steps, repeated over time, build real skill."),
      expect1,
    );
    const reason = lines.findIndex((line) =>
      line.startsWith("q1: 지문 속 근거를 지문에서 찾지 못했습니다"),
    );
    expect(reason).toBeGreaterThanOrEqual(0);
    expect(lines[reason + 1]).toMatch(/^q1 근거 진단:/);
  });

  it("근거가 지문에 그대로 있으면 진단 줄이 없다", () => {
    expect(
      diagnosis(
        englishDraftFeedback(
          draftWith("Small efforts, repeated over time, build real skill."),
          expect1,
        ),
      ),
    ).toEqual([]);
  });
});
