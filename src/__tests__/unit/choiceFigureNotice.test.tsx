/**
 * **«짝을 모른다»는 말은 정말로 짝이 문제인 문항에만, 문항에 한 번** (2026-10-03 3자 합의 A2 — 5회차 3:0).
 *
 * 병합 직후의 규칙은 거꾸로였다. 교재 스냅샷은 은행 행의 짝이 비었으면 그 문항의 스캔 그림을 전부 `null` 로 보내는데
 * (`snapshotFromProblem.ts` — 전부 아니면 전무), 렌더러는
 *   · **글 보기 문항**(그림이 발문 그림 한 장뿐인 평범한 문항)에 그림마다 «그림 대응 확인 필요»를 찍고,
 *   · **그림뿐인 보기 문항**(어느 그림이 몇 번인지 몰라 학생이 못 푸는 문항)에는 아무 말도 안 했다.
 *
 * 합의: 문구는 «그림뿐인 보기가 있는데 짝이 온전하지 않은 문항»에 **한 번** 적는다. 글 보기 문항의 모르는 그림은
 * 문구 없이 발문 자리에 둔다 — 🔴 그것을 «발문 그림으로 확정»하는 것은 아니다(자료는 여전히 «모름»이다. 조판만 그렇다).
 * 그림을 칸에 일부만 넣는 일은 여전히 없다(온전하면 grid, 아니면 예전 조판).
 */
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import {
  choiceFigureMode,
  UNLINKED_FIGURE_CHOICES_NOTICE,
} from "@/lib/problem/choiceFigureIndex";
import { estimateProblemPx, JASEUP_RULER } from "@/lib/printOverflow";

import { BANK_CHOICE_FIGURES } from "../fixtures/bankChoiceFigures";

const figureOnly = BANK_CHOICE_FIGURES[0]!; // 대구일 3 — 보기 다섯이 전부 `[그림]`, 그림 여섯 장
const TEXT_CHOICES = "알맞은 것을 고르시오.\n\n① 첫째\n② 둘째";
const NOTICE = "보기 그림의 번호를 확인할 수 없는 문항입니다.";

describe("문구 — 그림뿐인 보기 + 온전하지 않은 짝에만, 한 번", () => {
  it("문구는 한 곳에서 온다", () => {
    expect(UNLINKED_FIGURE_CHOICES_NOTICE).toBe(NOTICE);
  });

  it.each([
    ["짝이 없다(은행의 기본값 — 빈 배열)", []],
    ["짝이 없다(칸 자체가 없다)", undefined],
    ["전부 모름(교재 스냅샷)", [null, null, null, null, null, null]],
    ["길이 불일치", [1, 2]],
    ["번호 중복", [1, 2, 2, 4, 5, 0]],
    ["짝 없는 보기", [1, 2, 3, 4, 0, 0]],
  ] as const)("%s — 문항에 한 번 적는다", (_name, links) => {
    const { container } = render(
      <ProblemContent
        {...figureOnly}
        choiceFigureIndex={links ? [...links] : undefined}
      />,
    );
    const notices = container.querySelectorAll("[data-figure-choice-notice]");
    expect(notices).toHaveLength(1);
    expect(notices[0]!.textContent).toBe(NOTICE);
    // 그림은 칸에 넣지 않는다 — 여섯 장이 전부 보기 격자 **밖**에 있고, 보기에는 `[그림]` 이 남는다.
    const grid = container.querySelector("[data-hwpx-grid]")!;
    expect(grid.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelectorAll("img")).toHaveLength(6);
    expect(grid.textContent).toContain("[그림]");
    // 그림마다의 문구는 없다.
    expect(container.textContent).not.toContain("그림 대응 확인 필요");
  });

  it("짝이 온전하면 문구가 없다", () => {
    const { container } = render(<ProblemContent {...figureOnly} />);
    expect(container.querySelector("[data-figure-choice-notice]")).toBeNull();
    expect(
      container.querySelector("[data-hwpx-grid]")!.querySelectorAll("img"),
    ).toHaveLength(5);
  });

  it("그림 없는 문항 · 엔진 문항에는 아무 일도 없다", () => {
    const plain = renderToStaticMarkup(
      <ProblemContent content={TEXT_CHOICES} />,
    );
    expect(plain).not.toContain("data-figure-choice-notice");
    expect(plain).not.toContain(NOTICE);
  });
});

describe("글 보기 문항 — 모르는 그림에 문구를 찍지 않는다", () => {
  const props = {
    content: TEXT_CHOICES,
    figureUrls: ["/a.png"],
    figureDims: [400, 300],
    figureSourceMm: [40],
  };

  it("🔴 발문 그림 한 장 + 전부 모름(교재 스냅샷의 평범한 문항) — 문구가 없다", () => {
    const { container } = render(
      <ProblemContent {...props} choiceFigureIndex={[null]} />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.textContent).not.toContain("그림 대응 확인 필요");
    expect(container.querySelector("[data-figure-choice-notice]")).toBeNull();
    // 자료는 여전히 «모름»이다 — 발문 그림으로 확정한 것이 아니다.
    expect(
      container.querySelector('[data-figure-choice="unknown"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-figure-choice="0"]')).toBeNull();
  });

  it("아는 짝은 그 보기의 글 아래에 그대로 둔다(교재의 구현을 지킨다)", () => {
    const { container } = render(
      <ProblemContent
        content={TEXT_CHOICES}
        figureUrls={["/a.png", "/b.png", "/c.png"]}
        choiceFigureIndex={[0, 2, null]}
      />,
    );
    expect(
      container
        .querySelector('[data-figure-choice="2"]')
        ?.closest("[data-hwpx-grid]")?.textContent,
    ).toContain("②");
    expect(container.textContent).not.toContain("그림 대응 확인 필요");
  });
});

describe("갈래와 자", () => {
  it("`choiceFigureMode` 가 «문구를 적을 문항»을 말해 준다 — 조판과 자가 같은 답을 읽는다", () => {
    const choices = ["[그림]", "[그림]", "[그림]", "[그림]", "[그림]"];
    expect(choiceFigureMode(6, [], choices)).toEqual({
      mode: "none",
      unlinkedFigureChoices: true,
    });
    expect(
      choiceFigureMode(6, [null, null, null, null, null, null], choices),
    ).toEqual({ mode: "none", unlinkedFigureChoices: true });
    expect(choiceFigureMode(1, [], ["첫째", "둘째"])).toEqual({
      mode: "none",
      unlinkedFigureChoices: false,
    });
    expect(choiceFigureMode(1, [null], ["첫째", "둘째"])).toEqual({
      mode: "loose",
    });
    expect(choiceFigureMode(6, [1, 2, 3, 4, 5, 0], choices).mode).toBe("grid");
  });

  it("자는 문구 한 줄을 센다 — 지면이 그리는데 자가 안 세면 그만큼 넘친다", () => {
    const content = figureOnly.content;
    const withMarker = estimateProblemPx(content, [], null, JASEUP_RULER, []);
    // 같은 본문에서 `[그림]` 을 글로 바꾸면 문구가 없다 — 차이가 정확히 문구 한 줄이어야 한다.
    const textual = content.replaceAll("[그림]", "가");
    const withoutNotice = estimateProblemPx(
      textual,
      [],
      null,
      JASEUP_RULER,
      [],
    );
    expect(withMarker - withoutNotice).toBeGreaterThanOrEqual(
      JASEUP_RULER.line,
    );
  });
});
