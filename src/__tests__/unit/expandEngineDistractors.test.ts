/**
 * 객관식 — **생성기가 직접 낸 오답**(`StemProblem.distractors`) 갈래.
 *
 * 고등 엔진(2026-09-13)이 처음 쓴다.
 *
 * 🔴 **왜 필요한지를 처음에 틀리게 적었다.** 「정답이 식이면 공용 경로가 못 받아 객관식이
 * 조용히 빠진다」고 썼는데, 실측하니 **빠지지 않는다** — 공용 경로는 정답 속 **첫 수**를
 * 흔들어 오답을 만들고, 다항식 정답에서는 그 첫 수가 **지수**일 때가 있다:
 *
 *     $-x^{2}+2x+2$  →  오답 $-x^{1}+2x+2$ · $-x^{0}+2x+2$ · $-x^{20}+2x+2$
 *
 * 지수 $0$·$1$ 은 이 저장소가 「지면 냄새」로 막아 온 바로 그 모양이다(`pageSmells`).
 * 곧 진짜 문제는 «객관식이 없다»가 아니라 **«보기가 흉하다»**이다. 아래가 그 실측을 잠근다.
 *   ⑴ 오답을 주면 **그것만** 쓰고, 정답 번호가 정답 줄을 가리킨다.
 *   ⑵ 안 주면 다항식 정답에서 **냄새 나는 보기**가 실제로 나온다.
 * 초등·중등이 한 바이트도 안 바뀌었는지는 이 시험이 아니라 전후 해시 대조가 봤다
 * (`high-engine-plan.md` §1-1 · 착지 커밋 메시지).
 */
import { describe, expect, it } from "vitest";

import { createRng } from "../../lib/elementary/rng";
import {
  asMultipleChoice,
  type StemProblem,
} from "../../lib/engine/deriveFormats";
import { expandFamily } from "../../lib/engine/expandEngine";
import { pageSmells } from "../helpers/midPage";

const base: StemProblem = {
  content: "다항식 $f(x)$를 $x^{2}-4x+3$으로 나누었을 때의 나머지를 구하시오.",
  answer: "$5x-6$",
  solution: "풀이",
  familyKey: "high:시험|1",
  problemType: "계산",
};
const DS = ["$6x-5$", "$5x+6$", "$-5x-6$", "$5x-1$"];

function choiceLines(content: string): string[] {
  return content.split("\n").slice(-5);
}

describe("객관식 — 생성기가 낸 오답", () => {
  it("오답 넷을 그대로 쓰고 정답 번호가 정답 줄을 가리킨다", () => {
    for (const seed of [1, 7, 42, 2026]) {
      const got = asMultipleChoice(
        { ...base, distractors: DS },
        createRng(seed),
      );
      const lines = choiceLines(got.content);
      const values = lines.map((l) => l.slice(2));
      expect([...values].sort()).toEqual([base.answer, ...DS].sort());
      const idx = "①②③④⑤".indexOf(got.answer);
      expect(idx, "정답이 보기 번호여야 한다").toBeGreaterThanOrEqual(0);
      expect(values[idx]).toBe(base.answer);
      expect(got.questionType).toBe("객관식");
    }
  });

  it("오답이 넷이 아니거나 정답·서로와 겹치면 던진다", () => {
    expect(() =>
      asMultipleChoice({ ...base, distractors: DS.slice(0, 3) }, createRng(1)),
    ).toThrow();
    expect(() =>
      asMultipleChoice(
        { ...base, distractors: [...DS.slice(0, 3), base.answer] },
        createRng(1),
      ),
    ).toThrow();
    expect(() =>
      asMultipleChoice(
        { ...base, distractors: [DS[0]!, DS[0]!, DS[1]!, DS[2]!] },
        createRng(1),
      ),
    ).toThrow();
  });

  it("오답을 안 주면 다항식 정답에서 지수가 흔들려 냄새 나는 보기가 나온다", () => {
    const poly = { ...base, answer: "$-x^{2}+2x+2$" };
    const got = asMultipleChoice(poly, createRng(1));
    const options = choiceLines(got.content).map((l) => l.slice(2));
    const smelly = options.filter((o) => pageSmells(o).length > 0);
    expect(smelly.length, options.join(" · ")).toBeGreaterThan(0);
  });

  it("오답을 주면 그 냄새가 없다", () => {
    const got = asMultipleChoice(
      {
        ...base,
        answer: "$-x^{2}+2x+2$",
        distractors: [
          "$-x^{2}+2x-2$",
          "$x^{2}+2x+2$",
          "$-x^{2}-2x+2$",
          "$-x^{2}+2x+4$",
        ],
      },
      createRng(1),
    );
    for (const o of choiceLines(got.content).map((l) => l.slice(2))) {
      expect(pageSmells(o), o).toEqual([]);
    }
  });

  it("오답을 준 줄기는 변형마다 단답형과 객관식이 짝으로 나온다", () => {
    const got = expandFamily(
      (v) => ({
        ...base,
        content: `${base.content} [${v}]`,
        distractors: DS,
      }),
      3,
    );
    expect(got.skippedMcq).toBe(0);
    expect(got.items.filter((i) => i.questionType === "객관식")).toHaveLength(
      3,
    );
    expect(got.items.filter((i) => i.questionType === "단답형")).toHaveLength(
      3,
    );
  });
});
