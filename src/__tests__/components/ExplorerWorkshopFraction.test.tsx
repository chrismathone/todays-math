/**
 * 작업실(통분 조각 활동)의 세로 분수가 **제품 수식 렌더러(`MathText`)** 의 `\frac` 로 그려지는가 — 트랙 K 이어서.
 *
 * 원장님 확정(2026-09-27, 보고서 §11 ②): «작업실 세로 분수 — KaTeX 로 맞춤». 카드 글의 분수(`1/2 = 3/6` 해설)는
 * 이미 KaTeX 인데 조각 활동의 분수만 CSS 로 그린 모양이라 두 화면의 분수가 달랐다(«모든 화면 일치»).
 *
 *  ① 분수가 나오는 세 자리(처음 분수 · 나눈 분수 · 칠한 칸 수) 전부가 KaTeX 분수다 — 수식 밖에 보이는 숫자 0.
 *  ② 값 대조 — KaTeX 의 분자·분모(MathML `mfrac`)가 화면의 분수(읽기용 이름표 «d분의 n»)와 같다.
 *     나누는 수를 바꾸거나 칸을 칠하면 새 값으로 다시 그린다.
 *  ③ 읽기용 글·조작은 그대로 — 이름표 «2분의 1» · 누르기·보내기는 `ExplorerWorkshop.test.tsx` 가 본다.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ExplorerState,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";
import ExplorerWorkshop from "@/components/math-explorers/ExplorerWorkshop";
import { visibleMath } from "../helpers/visibleMathText";

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "unit",
  title: "약분과 통분",
  unitId: "g5-fractions",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 4,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 3,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const base: NonNullable<WorkshopView["session"]> = {
  id: "workshop",
  route: "explore",
  stage: "split",
  attachedTo: {
    sessionId: "session",
    questionId: "question",
    cardId: "g5-common-denominator",
  },
  questionId: "split-question",
  checkIndex: 0,
  checkTotal: 2,
  done: false,
  prompt: "색칠은 그대로 두고, 원래 한 조각을 똑같이 3개로 나눠 보세요.",
  fractions: [{ numerator: 1, denominator: 2 }],
  targetDenominator: null,
  factors: [1, 1],
  choices: [],
  predictionLabel: null,
  stars: 0,
};
function lab(changes: Partial<typeof base> = {}) {
  return render(
    <ExplorerWorkshop
      workshop={{ ...base, ...changes }}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={vi.fn()}
      onHome={vi.fn()}
    />,
  );
}

/** 분수 칸 — 읽기용 이름표 «d분의 n» 이 붙은 자리. */
const fractionCells = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[aria-label*="분의 "]'),
];
/** 이름표 «d분의 n» 이 말하는 값. */
function spoken(cell: HTMLElement) {
  const [, denominator, numerator] = /^(\d+)분의 (\d+)$/.exec(
    cell.getAttribute("aria-label") ?? "",
  )!;
  return { numerator, denominator };
}
/** KaTeX 가 조판한 분수의 값 — MathML `mfrac` 의 첫째가 분자, 둘째가 분모. */
function typeset(cell: HTMLElement) {
  const fractions = cell.querySelectorAll(".katex-mathml mfrac");
  if (fractions.length !== 1) return null;
  const [numerator, denominator] = [...fractions[0]!.children].map(
    (child) => child.textContent,
  );
  return { numerator, denominator };
}
async function allTypeset(container: HTMLElement, count: number) {
  await waitFor(() => {
    const cells = fractionCells(container);
    expect(cells).toHaveLength(count);
    for (const cell of cells) expect(typeset(cell)).toEqual(spoken(cell));
  });
  for (const cell of fractionCells(container)) {
    const seen = visibleMath(cell.innerHTML);
    // 수식 하나 · 수식 밖에 보이는 숫자·빗금 0 · 붉은 글자 0
    expect(seen.math).toBe(1);
    expect(seen.text.replace(/⟦수식⟧/g, "")).not.toMatch(/[0-9/]/);
    expect(seen.red).toBe(0);
    expect(seen.leaks).toEqual([]);
  }
}

describe("작업실 세로 분수 — KaTeX", () => {
  it("나누기 — 처음 분수와 나눈 분수를 KaTeX 로, 나누는 수를 바꾸면 새 값으로", async () => {
    const { container } = lab();
    await allTypeset(container, 2);
    expect(fractionCells(container).map(spoken)).toEqual([
      { numerator: "1", denominator: "2" },
      { numerator: "1", denominator: "2" },
    ]);
    const more = screen.getByRole("button", {
      name: "1번째 분수 나누는 수 늘리기",
    });
    fireEvent.click(more);
    fireEvent.click(more);
    fireEvent.click(more);
    await allTypeset(container, 2);
    // 읽기용 이름표는 그대로 «d분의 n»
    expect(
      fractionCells(container).map((cell) => cell.getAttribute("aria-label")),
    ).toEqual(["2분의 1", "8분의 4"]);
  });

  it("맞추기 — 두 분수 각각, 끝까지 나눈 가장 긴 분수(6/18)까지", async () => {
    const { container } = lab({
      stage: "match",
      fractions: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 3 },
      ],
    });
    for (let step = 0; step < 5; step++) {
      fireEvent.click(
        screen.getByRole("button", { name: "1번째 분수 나누는 수 늘리기" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "2번째 분수 나누는 수 늘리기" }),
      );
    }
    await allTypeset(container, 4);
    expect(fractionCells(container).map(spoken)).toEqual([
      { numerator: "1", denominator: "2" },
      { numerator: "6", denominator: "12" },
      { numerator: "1", denominator: "3" },
      { numerator: "6", denominator: "18" },
    ]);
  });

  it("칠하기 — 칠한 칸 수(0/21 → 21/21)도 KaTeX 로", async () => {
    const { container } = lab({
      stage: "check",
      targetDenominator: 21,
      fractions: [{ numerator: 3, denominator: 7 }],
    });
    await allTypeset(container, 2);
    expect(fractionCells(container).map(spoken)).toEqual([
      { numerator: "3", denominator: "7" },
      { numerator: "0", denominator: "21" },
    ]);
    for (let part = 1; part <= 21; part++)
      fireEvent.click(
        screen.getByRole("button", {
          name: `1번째 분수 ${part}번째 조각`,
        }),
      );
    await allTypeset(container, 2);
    expect(spoken(fractionCells(container)[1]!)).toEqual({
      numerator: "21",
      denominator: "21",
    });
  });

  it("칠하기 두 분수 — 칸 수가 분수마다 따로", async () => {
    const { container } = lab({
      stage: "check",
      targetDenominator: 12,
      fractions: [
        { numerator: 1, denominator: 4 },
        { numerator: 1, denominator: 6 },
      ],
    });
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 1번째 조각" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "1번째 분수 2번째 조각" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "2번째 분수 5번째 조각" }),
    );
    await allTypeset(container, 4);
    expect(fractionCells(container).map(spoken)).toEqual([
      { numerator: "1", denominator: "4" },
      { numerator: "1", denominator: "6" },
      { numerator: "2", denominator: "12" },
      { numerator: "1", denominator: "12" },
    ]);
  });
});
