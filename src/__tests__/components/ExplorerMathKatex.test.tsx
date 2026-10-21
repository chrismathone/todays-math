/**
 * 통합 탐험 개념 카드 글이 **제품 수식 렌더러(`MathText`)** 로 그려지는가 — 트랙 K (2026-09-27).
 *
 * 원장님(학생 폰에서 탐험을 처음부터 해 보신 뒤): «카텍스 적용시키고». 변환 규칙(글 단계)은
 * `src/__tests__/unit/mathExplorersPlainMath.test.ts` 가 보고, 이 파일은 **그린 결과**를 본다.
 *
 *  ① 렌더 전수 — 230개념의 수식 든 글 전부를 복습 화면과 같은 `MathText` 로 그려
 *     붉은 글자(`.katex-error`·`#cc0000`)·회색 폴백·새는 TeX 0 · 수식 수 그대로 · 한글·숫자가 그대로 ·
 *     수식 밖 보이는 글자에 수식 기호 0. (문자열 경로 `renderMathHtml` 은 화면과 다른 조합이라 쓰지 않는다 —
 *     `markdownPreprocess.ts` 머리말, 후보정 조사 J.)
 *  ② 래퍼(`ExplorerMath`) — 글만 있는 조각은 KaTeX 를 안 부르고 그대로, 조각 끝 공백을 지킨다.
 *  ③ 화면 배선 — 카드 글이 보이는 자리(활동 4종·도감 카드·진도판·작업실) **전부**가 래퍼를 지난다
 *     (원장님 원칙 «모든 화면 일치»). 자리마다 `x²` 를 심어 두고, 그린 뒤 수식 밖에 `²` 가 남으면 빠진 자리다.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ExplorerActivity,
  ExplorerState,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";
import { MathText } from "@/components/math/MathText";
import ExplorerCardDialog from "@/components/math-explorers/ExplorerCardDialog";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import { ExplorerMath } from "@/components/math-explorers/ExplorerMath";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import ExplorerWorkshop from "@/components/math-explorers/ExplorerWorkshop";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import { plainMathToTex } from "@/lib/math-explorers/plainMath";
import { hangulCount, visibleMath } from "../helpers/visibleMathText";

// ── ① 렌더 전수 ──────────────────────────────────────────────────────────────
const TEXTS = [
  ...new Set(
    definitionCards.flatMap((card) => [
      card.name,
      card.definition,
      ...card.pieces,
      ...card.words,
      card.exampleTitle,
      ...card.examples.map((example) => example.text),
      card.trap,
      card.explanation,
      card.note,
    ]),
  ),
].filter((text) => plainMathToTex(text).includes("$"));

const SUPER: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};
/** 숫자의 모음(차례 없이) — KaTeX 는 분수의 분모를 분자보다 **먼저** DOM 에 둔다. */
const digitsOf = (text: string) =>
  [...text.replace(/[⁰-⁹¹²³]/g, (ch) => SUPER[ch] ?? ch)]
    .filter((ch) => /[0-9]/.test(ch))
    .sort()
    .join("");
/** 사람 눈에 보이는 글자 전부(수식 포함, 스크린리더용 MathML 제외). */
function shownText(html: string): string {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll(".katex-mathml").forEach((node) => node.remove());
  // 식 뒤 조사 앞의 WORD JOINER(U+2060 · D-164 ⑴)는 폭이 없어 안 보인다 — 보이는 글에서 뺀다.
  return (root.textContent ?? "").replace(/\u2060/g, "");
}
const MATH_OUTSIDE = /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ+\-−×÷=≠<>≤≥±:/√π°%…→↔□△()]/g;

describe("① 230개념 수식 든 글 전부를 MathText 로 그린다", () => {
  it("전수 대상이 비어 있지 않다", () => {
    // 2026-09-27 실측: 겹침 뺀 글 2,887 중 수식이 든 글 1,174 · 수식 1,654곳.
    expect(TEXTS.length).toBeGreaterThan(1100);
  });

  it("붉은 글자·폴백·새는 TeX 0 · 수식 수·한글·숫자 그대로 · 수식 밖 기호 0", () => {
    const failures: string[] = [];
    let formulas = 0;
    for (const text of TEXTS) {
      const tex = plainMathToTex(text);
      const html = renderToStaticMarkup(<MathText text={tex} />);
      const seen = visibleMath(html);
      const spans = tex.match(/\$[^$]*\$/g)?.length ?? 0;
      formulas += seen.math;
      const mixed =
        text.match(/(?<![0-9./])[0-9]+[과와] [0-9]+\/[0-9]+/g)?.length ?? 0;
      const prose = seen.text.replace(/⟦수식⟧/g, " ");
      const problems = [
        seen.red && `붉은 ${seen.red}`,
        seen.raw && `폴백 ${seen.raw}`,
        seen.leaks.length && `샘 ${seen.leaks.join(" ")}`,
        seen.math !== spans && `수식 ${seen.math}/${spans}`,
        seen.hangul !== hangulCount(text) - mixed &&
          `한글 ${seen.hangul}/${hangulCount(text) - mixed}`,
        digitsOf(shownText(html)) !== digitsOf(text) &&
          `숫자 ${digitsOf(shownText(html))}/${digitsOf(text)}`,
        (prose.match(MATH_OUTSIDE) ?? []).length &&
          `밖 ${prose.match(MATH_OUTSIDE)!.join("")}`,
      ].filter(Boolean);
      if (problems.length) failures.push(`${text} → ${problems.join(" · ")}`);
    }
    expect(failures).toEqual([]);
    expect(formulas).toBeGreaterThan(1600);
  }, 120_000);
});

// ── ② 래퍼 ───────────────────────────────────────────────────────────────────
describe("② ExplorerMath", () => {
  it("글만 있는 조각은 KaTeX 를 부르지 않고 그대로 그린다", () => {
    const { container } = render(
      <p>
        <ExplorerMath text="맞다" />
      </p>,
    );
    expect(container.textContent).toBe("맞다");
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("조각 끝 공백을 지킨다 — 빈칸 단추 사이 띄어쓰기", async () => {
    const { container } = render(
      <p>
        [<ExplorerMath text=" 중에서 약수가 " />] [
        <ExplorerMath text=" 곱한 결과는 12이고 " />]
      </p>,
    );
    await waitFor(() =>
      expect(container.querySelector(".katex")).not.toBeNull(),
    );
    const text = shownText(container.innerHTML);
    expect(text).toContain("[ 중에서 약수가 ]");
    expect(text).toMatch(/\[ 곱한 결과는 12이고 \]/);
  });
});

// ── ③ 화면 배선 ──────────────────────────────────────────────────────────────
/** 수식 밖에 보이는 글자. `²` 가 남으면 그 자리는 래퍼를 안 지났다. */
const proseOf = (container: HTMLElement) =>
  visibleMath(container.innerHTML).text.replace(/⟦수식⟧/g, " ");
async function settled(container: HTMLElement, atLeast: number) {
  await waitFor(() =>
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(
      atLeast,
    ),
  );
  expect(proseOf(container)).not.toMatch(/[²√]/);
  expect(visibleMath(container.innerHTML).red).toBe(0);
}

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "repair",
  title: "x² 회복 퀘스트",
  unitId: "unit",
  cardIds: ["a", "b", "c", "d", "e"],
  index: 0,
  total: 15,
  round: 0,
  continuation: 0,
  done: false,
  first: 0,
  stars: 0,
  unresolved: [],
  reviewOnly: false,
};
const base: ExplorerActivity = {
  questionId: "question",
  cardId: "a",
  cardName: "x² 카드",
  unitId: "unit",
  unitTitle: "단원",
  kind: "assemble",
  prompt: "x²의 뜻을 완성하세요.",
  pieces: ["x² 는 ", " 과 x² 를 ", " 번 곱한 √x² 이다."],
  choices: [
    { id: 0, label: "x²" },
    { id: 1, label: "2x²" },
    { id: 2, label: "√9" },
    { id: 3, label: "x² + 1" },
  ],
};
function practice(activity: ExplorerActivity) {
  return render(
    <ExplorerPractice
      activity={activity}
      session={session}
      busy={false}
      correct={null}
      eventKey=""
      onAction={vi.fn()}
      onHome={vi.fn()}
    />,
  );
}

describe("③ 카드 글이 보이는 자리 전부가 KaTeX 를 지난다", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });

  it("정의 조립 — 이름·세션 제목·조각·보기·채운 빈칸", async () => {
    const { container } = practice(base);
    fireEvent.click(screen.getByRole("button", { name: "1 x²" }));
    // 보기 넷 + 채운 빈칸 + 조각 셋 + 이름 + 세션 제목. 조작 안내 제목(발문)은 정의 조립에서 뺐다
    // (원장님 2026-09-28 Hi-fi 4안 — 이름 바로 아래 문장, 안내는 아래 칸 한 줄, 05 §8.19 · D-143).
    await settled(container, 10);
    // 읽기용 이름표는 글자 그대로 둔다(판단은 보고서) — 채점은 번호로 한다.
    expect(
      screen.getByRole("button", { name: "빈칸 1, x²" }),
    ).toBeInTheDocument();
  });

  it("뜻 만나기 — 뜻과 메모", async () => {
    const { container } = practice({
      ...base,
      kind: "read",
      choices: [],
      pieces: undefined,
      reading: { definition: "x² 는 x × x 이다.", note: "√x² 도 있다." },
    });
    await settled(container, 5);
  });

  it("예 모으기·경계 살피기 — 발문과 보기", async () => {
    const examples = practice({ ...base, kind: "examples", pieces: undefined });
    await settled(examples.container, 7);
    examples.unmount();
    const truth = practice({
      ...base,
      kind: "truth",
      pieces: undefined,
      prompt: "x² 는 항상 0 이상이다.",
      choices: [
        { id: 0, label: "맞다" },
        { id: 1, label: "아니다" },
      ],
    });
    await settled(truth.container, 3);
  });

  function explorerState(grade: number): ExplorerState {
    return {
      ...explorerView(
        createExplorerState("student-katex", grade),
        "2026-09-27",
      ),
      student: { id: "student-katex", name: "학생", className: "반" },
      revision: 0,
      feedback: null,
    };
  }

  it("도감 카드 — 이름·앞개념·뜻·해설·예·경계·조각 활동 해설", async () => {
    const state = explorerState(8);
    const card = state.units
      .flatMap((unit) => unit.cards)
      .find((item) => item.id === "g8-y-intercept")!;
    const view = render(
      <ExplorerCardDialog
        card={{ ...card, progress: null }}
        state={state}
        solution={{
          cardId: card.id,
          name: card.name,
          definition: "x² 의 뜻",
          explanation: "√x² 의 해설",
          note: "x² 메모",
          examples: [
            { label: "x² + 1", correct: true },
            { label: "2x²", correct: false },
          ],
          statement: "x² 는 0 이상이다.",
          truth: true,
        }}
        busy={false}
        onInspect={vi.fn()}
        onSolution={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // 이름(y절편) + 뜻 + 메모 + 해설 + 예 둘 + 경계
    await settled(view.container, 7);
    expect(
      view.container.querySelector("#explorer-card-title .katex"),
    ).not.toBeNull();
    view.unmount();

    // 조각 활동(통분) 해설 — `1/2 = 3/6` 을 분수로
    const fractions = explorerState(5);
    const common = fractions.units
      .flatMap((unit) => unit.cards)
      .find((item) => item.id === "g5-common-denominator")!;
    fractions.workshop = {
      memoryDate: null,
      memoryDue: false,
      blueprintAt: null,
      discoveredAt: "2026-09-26",
      rememberedAt: null,
      session: {
        ...workshop,
        stage: "complete",
        done: true,
      },
    };
    const lab = render(
      <ExplorerCardDialog
        card={common}
        state={fractions}
        solution={null}
        workshopSolution={{
          title: "통분",
          explanation: "분자와 분모에 같은 수를 곱해요.",
          examples: [
            {
              fractions: [
                { numerator: 1, denominator: 2 },
                { numerator: 1, denominator: 3 },
              ],
              denominator: 6,
              numerators: [3, 2],
            },
            {
              fractions: [{ numerator: 3, denominator: 4 }],
              denominator: 8,
              numerators: [6],
            },
          ],
        }}
        busy={false}
        onInspect={vi.fn()}
        onSolution={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(
        lab.container.querySelectorAll(".katex").length,
      ).toBeGreaterThanOrEqual(2),
    );
    expect(proseOf(lab.container)).not.toMatch(/\d\/\d/);
  });

  it("진도판 — 도감 이름·다시 살펴볼 개념·복습 제목", async () => {
    const state = explorerState(8);
    const card = state.units
      .flatMap((unit) => unit.cards)
      .find((item) => item.id === "g8-y-intercept")!;
    state.session = {
      ...session,
      title: "y절편 회복 퀘스트",
      done: true,
      unresolved: [{ cardId: card.id, name: card.name, kind: 2 }],
    };
    const actions = {
      onAction: vi.fn(),
      onStart: vi.fn(),
      onResume: vi.fn(),
      onRetry: vi.fn(),
      onInspect: vi.fn(),
      onReviewDay: vi.fn(),
    };
    const home = render(
      <ExplorerHome state={state} busy={false} {...actions} />,
    );
    // ⚠️ KaTeX 가 이름표 없는 단추 안에 서면 jsdom 이 접근성 이름을 못 센다(MathML 요소에 `style` 이 없어
    //    `getComputedStyle` 이 던진다 — 실제 브라우저와 무관). 그래서 여기서는 글자로 찾는다.
    fireEvent.click(screen.getByText("도감", { selector: "button" }));
    // 다시 살펴볼 개념의 이름 + 도감 속 이름
    await waitFor(() =>
      expect(
        home.container.ownerDocument.querySelectorAll(".katex").length,
      ).toBeGreaterThanOrEqual(2),
    );
    expect(proseOf(home.container.ownerDocument.body)).not.toMatch(/y절편/);
    home.unmount();

    // 지난 학습 다시 풀기 중에는 세션 제목이 진도판 제목이 된다
    state.session = { ...state.session, done: false, reviewOnly: true };
    const review = render(
      <ExplorerHome state={state} busy={false} {...actions} />,
    );
    await waitFor(() =>
      expect(
        review.container.querySelector("#today-mission-title .katex"),
      ).not.toBeNull(),
    );
  });

  it("작업실 — 발문·예상·보기", async () => {
    const view = render(
      <ExplorerWorkshop
        workshop={{
          ...workshop,
          stage: "predict",
          prompt: "x² 조각을 나누면?",
          predictionLabel: "x² 그대로",
          choices: [
            { id: 0, label: "x² 보다 커져요" },
            { id: 1, label: "√x² 그대로예요" },
            { id: 2, label: "2x² 작아져요" },
          ],
        }}
        session={session}
        busy={false}
        correct={null}
        eventKey=""
        onAction={vi.fn()}
        onHome={vi.fn()}
      />,
    );
    await settled(view.container, 5);
    view.unmount();
    const split = render(
      <ExplorerWorkshop
        workshop={{
          ...workshop,
          prompt: "x² 를 나눠요",
          predictionLabel: "x² 예상",
        }}
        session={session}
        busy={false}
        correct={null}
        eventKey=""
        onAction={vi.fn()}
        onHome={vi.fn()}
      />,
    );
    await settled(split.container, 3);
  });
});

const workshop: NonNullable<WorkshopView["session"]> = {
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
  prompt: "한 조각을 세 개로 나눠 보세요.",
  fractions: [{ numerator: 1, denominator: 2 }],
  targetDenominator: null,
  factors: [1, 1],
  choices: [],
  predictionLabel: "그대로예요",
  stars: 0,
};
