/**
 * 출처·형식 라벨이 **화면에 실제로 붙는가** — 문제은행 카드와 검수 카드.
 *
 * 판정 자체는 `unit/problemProvenance.test.ts` 가 본다. 여기서 보는 것은 배선이다:
 * 두 화면이 **같은 판정**을 그리는가 · 자리가 맞는가 · D-30 을 안 어기는가 · 지면을
 * 안 바꾸는가. 「함수는 맞는데 화면에 안 걸렸다」는 이 저장소가 여러 번 겪은 자리라
 * 배선을 따로 잰다.
 *
 * ⚠️ 새 파일로 둔 이유: 같은 시각에 다른 세션이 `ProblemCard.tsx` 의 «정답·해설» 블록을
 *    고치고 있어서, 기존 `ProblemCard.test.tsx` 를 같이 건드리면 충돌한다.
 */
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProblemCard } from "@/components/problem/ProblemCard";
import { ReviewProblemCard } from "@/components/test/ReviewProblemCard";
import type { ProblemEntity } from "@/contracts/problem.contract";
import { MOCK_PROBLEM_WITH_FRACTION } from "@/mocks/data";

/** 보기 다섯이 달린 본문 — 실측 33,857건의 모양이다. */
const MCQ = [
  "$\\frac{7}{25}$ 를 유한소수로 나타내면?",
  "① $0.28$",
  "② $0.3$",
  "③ $0.25$",
  "④ $0.2$",
  "⑤ $0.35$",
].join("\n");

/** 실측에서 나온 모양만 쓴다 — 지어낸 픽스처는 가드가 무엇을 지키는지 알려 주지 않는다. */
function problem(patch: Partial<ProblemEntity>): ProblemEntity {
  return {
    ...MOCK_PROBLEM_WITH_FRACTION,
    source: "manual",
    familyKey: null,
    originProblemId: null,
    figureUrls: [],
    figureSvg: null,
    ...patch,
  };
}

const 초등엔진 = problem({
  familyKey: "elem:초6|2-5-1 원주와 원주율 알아보기|연산",
});
const 초등엔진_도형_객관식 = problem({
  familyKey: "elem:초5|2-2-4 분수의 곱셈|응용",
  figureSvg: "<svg viewBox='0 0 224 120'></svg>",
  content: MCQ,
  answer: "①",
});
const 기출_스캔_객관식 = problem({
  source: "past_exam",
  figureUrls: ["/figures/2023-donmun-2-1/q07.jpg"],
  content: MCQ,
  answer: "③",
});
const 문제집_SVG = problem({
  source: "transformed",
  figureUrls: ["/figures-svg/rpm/3-2-14.svg"],
});
const AI변형 = problem({
  source: "transformed",
  originProblemId: "00000000-0000-4000-8000-0000000000a1",
});
/** 실측 764건 — `manual` 인데 엔진 표지가 없는 옛 행. */
const 옛수동 = problem({ familyKey: null });
/** 실측 311건 — 보기와 정답이 어긋나 형식을 모르는 행. */
const 형식모름 = problem({ content: MCQ, answer: "풀이참조" });

/** 카드 안의 라벨들 — `data-provenance` 로만 집는다(글자로 집으면 본문과 섞인다). */
const badgesIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("[data-provenance]"));

describe("[출처 배선] 문제은행 카드", () => {
  it.each([
    ["초등 엔진 · 보기 없음", 초등엔진, ["[초]", "[서]"]],
    [
      "초등 + 도형 엔진 + 객관식",
      초등엔진_도형_객관식,
      ["[초]", "[도]", "[객]"],
    ],
    ["기출 + 스캔 + 객관식", 기출_스캔_객관식, ["[기]", "[스캔]", "[객]"]],
    ["문제집 + SVG 엔진", 문제집_SVG, ["[문]", "[SVG]", "[서]"]],
    ["AI 변형", AI변형, ["[AI]", "[서]"]],
    ["옛 수동(출처 미분류)", 옛수동, ["[?]", "[서]"]],
    ["형식 미분류", 형식모름, ["[?]", "[?형식]"]],
  ] as const)("%s → %s", (_name, entity, expected) => {
    const { container } = render(<ProblemCard problem={entity} />);
    expect(badgesIn(container).map((el) => el.textContent)).toEqual([
      ...expected,
    ]);
  });

  // 자리 — D-53 「화면은 코드 옆에 현재 단원·**출처**를 항상 같이 보여야 한다」.
  // 검수 상태는 오른쪽 무리라 색이 섞여 읽히지 않는다.
  it("라벨은 문항 코드 뒤, 검수 상태 앞에 온다", () => {
    const { container } = render(
      <ProblemCard problem={초등엔진_도형_객관식} />,
    );
    const head = container.querySelector("article > div")!;
    const code = within(head as HTMLElement).getByText(
      초등엔진_도형_객관식.problemCode,
    );
    const status = head.querySelector("[data-review-status]")!;
    const badges = badgesIn(container);

    // Node.DOCUMENT_POSITION_FOLLOWING = 4 — 「뒤에 온다」
    expect(code.compareDocumentPosition(badges[0]!) & 4).toBeTruthy();
    expect(badges.at(-1)!.compareDocumentPosition(status) & 4).toBeTruthy();
  });

  // D-30 (강제) — 라벨은 누르는 것이 아니다.
  it("라벨은 컨트롤이 아니다 — 손가락 커서·클릭 핸들러가 없다", () => {
    const { container } = render(
      <ProblemCard problem={초등엔진_도형_객관식} />,
    );
    for (const el of badgesIn(container)) {
      expect(el.tagName).toBe("ABBR");
      expect(el.className).not.toContain("cursor-pointer");
      expect(el.className).not.toContain("hover:bg-");
      expect(el.getAttribute("role")).toBeNull();
      expect(el.closest("button, a[href]")).toBeNull();
    }
  });

  // 절대 규칙 6 — 지면을 바꾸면 실물 인쇄 검수까지가 완료 조건이다. 안 바꾼다.
  it("인쇄에서는 안 나온다 — 지면을 건드리지 않는다", () => {
    const { container } = render(
      <ProblemCard problem={초등엔진_도형_객관식} />,
    );
    for (const el of badgesIn(container)) {
      expect(el.className).toContain("print:hidden");
    }
  });

  // 05 §5 — 색만으로 뜻을 전달하지 않는다. 줄임말은 풀어 쓴 말을 달고 다닌다.
  it("라벨마다 풀어 쓴 이름이 붙어 있다", () => {
    const { container } = render(<ProblemCard problem={기출_스캔_객관식} />);
    expect(badgesIn(container).map((el) => el.getAttribute("title"))).toEqual([
      "기출 추출",
      "원본 시험지 오려냄",
      "객관식",
    ]);
  });

  it("축마다 다른 색 클래스가 실제로 DOM 에 실린다", () => {
    const { container } = render(
      <ProblemCard problem={초등엔진_도형_객관식} />,
    );
    const classes = badgesIn(container).map(
      (el) => el.className.match(/text-src-[a-z-]+/)![0],
    );
    expect(classes).toEqual([
      "text-src-elem",
      "text-src-figure",
      "text-src-mcq",
    ]);
    expect(new Set(classes).size).toBe(3);
  });

  /**
   * 🔴 세 축이 «모른다»에 같은 이름을 쓰므로 React 키는 **축**이어야 한다.
   * 키가 겹치면 React 가 경고만 내고 화면은 그럴듯하게 나온다 — 그래서 DOM 으로 본다.
   */
  it("라벨마다 축이 적혀 있고 한 카드에서 겹치지 않는다", () => {
    const { container } = render(<ProblemCard problem={형식모름} />);
    const axes = badgesIn(container).map((el) =>
      el.getAttribute("data-provenance-axis"),
    );
    expect(axes).toEqual(["origin", "format"]);
    expect(new Set(axes).size).toBe(axes.length);
  });
});

describe("[출처 배선] 검수 카드 — 문제은행과 같은 판정을 그린다", () => {
  it.each([
    ["초등 + 도형 + 객관식", 초등엔진_도형_객관식],
    ["기출 + 스캔 + 객관식", 기출_스캔_객관식],
    ["옛 수동(미분류)", 옛수동],
    ["형식 미분류", 형식모름],
  ] as const)("%s 에서 두 화면의 라벨이 같다", (_name, entity) => {
    const bank = render(<ProblemCard problem={entity} />);
    const review = render(
      <ReviewProblemCard orderIndex={1} problem={entity} />,
    );
    expect(badgesIn(review.container).map((el) => el.textContent)).toEqual(
      badgesIn(bank.container).map((el) => el.textContent),
    );
  });

  it("검수 카드에서도 라벨은 컨트롤이 아니다", () => {
    const { container } = render(
      <ReviewProblemCard orderIndex={1} problem={초등엔진_도형_객관식} />,
    );
    expect(badgesIn(container)).toHaveLength(3);
    for (const el of badgesIn(container)) {
      expect(el.tagName).toBe("ABBR");
      expect(el.className).not.toContain("cursor-pointer");
      expect(el.closest("button, a[href]")).toBeNull();
    }
  });

  // 검수 카드는 마이크로 라벨에 `text-text-2` 를 쓴다. 그 색이 같이 실리면 어느 쪽이
  // 이기는지는 **CSS 파일 순서**가 정하므로, 출처 라벨에는 아예 안 실려야 한다.
  it("검수 카드의 회색 마이크로 라벨 색이 라벨에 섞이지 않는다", () => {
    const { container } = render(
      <ReviewProblemCard orderIndex={1} problem={초등엔진_도형_객관식} />,
    );
    for (const el of badgesIn(container)) {
      expect(el.className).not.toContain("text-text-2");
    }
  });
});

describe("[출처 배선] 반대쪽 — 없는 것을 그리지 않는다", () => {
  it("그림이 없으면 그림 라벨을 그리지 않는다", () => {
    for (const entity of [초등엔진, AI변형, 옛수동, 형식모름]) {
      const { container } = render(<ProblemCard problem={entity} />);
      const axes = badgesIn(container).map((el) =>
        el.getAttribute("data-provenance-axis"),
      );
      expect(axes).not.toContain("figure");
    }
  });

  it("어떤 문항이든 출처와 형식 라벨은 **반드시** 있다 — 조용히 빠지지 않는다", () => {
    for (const entity of [
      초등엔진,
      초등엔진_도형_객관식,
      기출_스캔_객관식,
      문제집_SVG,
      AI변형,
      옛수동,
      형식모름,
    ]) {
      const { container } = render(<ProblemCard problem={entity} />);
      const axes = badgesIn(container).map((el) =>
        el.getAttribute("data-provenance-axis"),
      );
      expect(axes).toContain("origin");
      expect(axes).toContain("format");
    }
  });
});
