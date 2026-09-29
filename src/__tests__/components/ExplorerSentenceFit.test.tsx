/**
 * 문장 조립 — 넘칠 때만 글씨 줄이기(원장님 2026-09-29, D-143 · 05 §8.19).
 *
 * 좁은 폰(320×568 등)에서 조립 문장 끝(빈칸 ① ② 포함)이 문제 칸 아래 끝 밖으로 내려가 학생이 칸을 내려야 끝이 보였다.
 * 문장이 칸 안에 다 안 들어갈 때만 **그 문장** 글씨를 한두 단계 줄인다. 들어가는 문장은 그대로 · 바닥에서도 넘치면 칸 스크롤.
 *
 * jsdom 에는 레이아웃이 없다 — 여기서는 «그 단계로 그렸을 때 문장 끝이 어디인가»를 흉내 낸 가짜 배치(`layout`)로
 * 넘치면 줄고 · 안 넘치면 그대로 · 바닥에서 멈추는지만 본다. 실제 글줄은 폰 실측(`scripts/qa/mobile-explorers-qa.mjs` 의 `fit`)이 잰다.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import type {
  ExplorerActivity,
  ExplorerState,
} from "@/contracts/mathExplorers.contract";

const session: NonNullable<ExplorerState["session"]> = {
  id: "session",
  route: "unit",
  title: "시각과 시간",
  unitId: "unit",
  cardIds: ["a"],
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
const activity: ExplorerActivity = {
  questionId: "question",
  cardId: "a",
  cardName: "시간 단위",
  unitId: "unit",
  unitTitle: "시각과 시간",
  kind: "assemble",
  prompt: "빈칸을 채워 주세요.",
  pieces: ["1분은 ", "이고 1시간은 ", "이다."],
  choices: [
    { id: 0, label: "60초" },
    { id: 1, label: "60분" },
    { id: 2, label: "100초" },
    { id: 3, label: "100분" },
  ],
};

/**
 * 가짜 배치 — 칸의 보이는 높이와 «배율 · 채운 빈칸 수 → 문장 끝». 칸 위 끝은 0.
 * 책장 넘김으로 칸이 기울어 있으면(칸에 `transform: none` 이 안 눌려 있으면) 문장이 실제보다 위에 그려진 것처럼
 * 절반 높이로 읽힌다 — 첫 520ms 동안 `getBoundingClientRect` 가 비틀린 값을 주는 것을 흉내 낸다.
 */
const layout = {
  paneHeight: 250,
  end: (scale: number, filled: number) => 260 * scale + 30 * filled,
  /** CSS 기준 글자 크기 — 좁은 폭 19px(바닥 0.8 = 15.2px) · 넓은 폭 22px(바닥 0.7 = 15.4px). */
  basePx: 19,
};
const pane = () =>
  document.querySelector<HTMLElement>("[data-page-turn=true]")!;
const sentence = () =>
  document.querySelector<HTMLElement>("[data-assembly-sentence]")!;
const drawnScale = (node: HTMLElement) =>
  Number(node.style.getPropertyValue("--sentence-fit") || 1);
const tilted = () => pane().style.getPropertyValue("transform") !== "none";

type Notify = (entries: Array<{ target: Element }>) => void;
let observers: Array<{ callback: Notify; targets: Set<Element> }> = [];
class FakeResizeObserver {
  private readonly watched = {
    callback: this.callback,
    targets: new Set<Element>(),
  };
  constructor(private readonly callback: Notify) {
    observers.push(this.watched);
  }
  observe(target: Element) {
    this.watched.targets.add(target);
  }
  unobserve(target: Element) {
    this.watched.targets.delete(target);
  }
  disconnect() {
    this.watched.targets.clear();
  }
}
/** 그 요소의 크기가 바뀌었다고 알린다 — 지켜보는 관찰자에게만. */
const resize = (target: Element) =>
  act(() =>
    observers
      .filter(({ targets }) => targets.has(target))
      .forEach(({ callback }) => callback([{ target }])),
  );

beforeEach(() => {
  observers = [];
  layout.paneHeight = 250;
  layout.end = (scale, filled) => 260 * scale + 30 * filled;
  layout.basePx = 19;
  // jsdom 은 CSS 모듈을 싣지 않는다 — 문장의 계산된 글자 크기만 «기준 × 배율»로 돌려준다(다른 속성은 jsdom 그대로).
  const computed = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((node, pseudo) => {
    const style = computed(node, pseudo);
    if (!(node as Element).matches?.("[data-assembly-sentence]")) return style;
    return new Proxy(style, {
      get(target, key) {
        if (key === "fontSize")
          return `${layout.basePx * drawnScale(node as HTMLElement)}px`;
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(Element.prototype, "clientHeight", "get").mockImplementation(
    function (this: Element) {
      return this.getAttribute("data-page-turn") === "true"
        ? layout.paneHeight
        : 0;
    },
  );
  // jsdom 의 Range 에는 getClientRects 가 없다 — 문장 글줄 상자를 가짜 배치로 돌려준다.
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value(this: Range) {
      const node = this.startContainer as HTMLElement;
      if (!node.matches?.("[data-assembly-sentence]")) return [];
      const filled = node.querySelectorAll("[data-filled]").length;
      const end =
        layout.end(drawnScale(node), filled) * (tilted() ? 0.5 : 1) -
        pane().scrollTop;
      return [{ width: 120, height: 24, top: end - 24, bottom: end }];
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (Range.prototype as unknown as { getClientRects?: unknown })
    .getClientRects;
});

function fixture() {
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

describe("assembly sentence fit", () => {
  it("keeps the size as drawn when the whole sentence fits", () => {
    layout.end = () => 200;
    fixture();
    expect(sentence()).not.toHaveAttribute("data-fit");
    expect(sentence().style.getPropertyValue("--sentence-fit")).toBe("");
  });

  it("shrinks one step when the end falls below the pane", () => {
    fixture(); // 1배 260 > 250 · 0.9배 234
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
    expect(sentence().style.getPropertyValue("--sentence-fit")).toBe("0.9");
  });

  it("stops at the floor and leaves the rest to the pane scroll", () => {
    layout.end = () => 400;
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.8"); // 좁은 폭 19px — 15.2px 에서 멈춤
  });

  it("goes one step further on a wide phone, where 0.7 is still 15px of text", () => {
    // 넓은 폭 22px: 0.8배(17.6px)에서도 빈칸 단추 아래 테두리가 몇 px 칸 밖 — 0.7배(15.4px)면 들어간다.
    layout.basePx = 22;
    layout.end = (scale) => (scale > 0.75 ? 255 : 240);
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.7");
  });

  it("does not go below 15px of text on a narrow phone even if 0.7 would fit", () => {
    layout.end = (scale) => (scale > 0.75 ? 255 : 240);
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.8");
  });

  it("counts the blank buttons, which hang below the text line", () => {
    // 글줄 끝 245 는 칸(250) 안이지만, 가운데 맞춘 빈칸 단추(최소 높이 42px)는 글보다 10px 아래로 내려온다.
    layout.end = (scale) => 245 * scale;
    const zero = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        if (!this.matches("[data-assembly-sentence] button"))
          return zero as DOMRect;
        const end = layout.end(drawnScale(sentence()), 0) + 10;
        return {
          ...zero,
          width: 58,
          height: 42,
          top: end - 42,
          bottom: end,
        } as DOMRect;
      },
    );
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
  });

  it("measures without the page-turn tilt and puts the tilt back", () => {
    // 기울어진 채로 재면 130(절반)이라 들어가 보인다 — 실제는 260 이라 넘친다.
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
    expect(pane().style.getPropertyValue("transform")).toBe("");
    expect(pane().getAttribute("style") ?? "").not.toContain("transform");
  });

  it("re-fits before paint when a filled word lengthens the sentence", () => {
    layout.end = (scale, filled) => 230 * scale + 30 * filled; // 비었을 때 230 — 그대로
    fixture();
    expect(sentence()).not.toHaveAttribute("data-fit");
    fireEvent.click(screen.getByRole("button", { name: "1 60초" }));
    // 260 > 250 → 0.9배 237 — 다시 그리는 효과 없이(ResizeObserver 를 기다리지 않고) 바로 줄어 있다.
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
  });

  it("does not grow back within the activity when a blank is emptied", () => {
    layout.end = (scale, filled) => 230 * scale + 30 * filled;
    fixture();
    fireEvent.click(screen.getByRole("button", { name: "1 60초" }));
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
    fireEvent.click(screen.getByRole("button", { name: "빈칸 1, 60초" }));
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
  });

  it("re-fits from the full size when the pane grows (turned phone, wider window)", () => {
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
    layout.paneHeight = 400;
    resize(pane());
    expect(sentence()).not.toHaveAttribute("data-fit");
    layout.paneHeight = 150;
    resize(pane());
    expect(sentence()).toHaveAttribute("data-fit", "0.8");
  });

  it("shrinks when something in the pane grows late (a formula name, a formula piece)", () => {
    layout.end = () => 200;
    fixture();
    expect(sentence()).not.toHaveAttribute("data-fit");
    // 수식 청크가 늦게 붙어 이름 줄이 커졌다 — 문장이 밀려 내려간다. 칸 크기는 그대로.
    layout.end = (scale) => 260 * scale;
    const nameRow = pane().firstElementChild!;
    expect(nameRow).not.toBe(sentence());
    resize(nameRow);
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
    // 칸 안 것이 줄어도(내용 변화) 한 활동 안에서는 다시 키우지 않는다.
    layout.end = () => 200;
    resize(sentence());
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
  });

  it("judges from the top of the pane even when the student has scrolled it", () => {
    layout.paneHeight = 150;
    fixture();
    expect(sentence()).toHaveAttribute("data-fit", "0.8");
    // 바닥에서도 넘쳐 학생이 칸을 60px 내렸다 — 글줄 상자는 그만큼 위에 그려진다(260 − 60 = 200).
    vi.spyOn(Element.prototype, "scrollTop", "get").mockImplementation(
      function (this: Element) {
        return this.getAttribute("data-page-turn") === "true" ? 60 : 0;
      },
    );
    layout.paneHeight = 250; // 화면을 돌려 칸이 커졌다 — 1배부터 다시: 1배 260 은 여전히 넘친다.
    resize(pane());
    expect(sentence()).toHaveAttribute("data-fit", "0.9");
  });

  it("does not decide while the pane has no height yet", () => {
    layout.paneHeight = 0;
    layout.end = () => 400;
    fixture();
    expect(sentence()).not.toHaveAttribute("data-fit");
    layout.paneHeight = 250;
    resize(pane());
    expect(sentence()).toHaveAttribute("data-fit", "0.8");
  });

  it("re-fits when a web font finishes loading", () => {
    const fonts = new EventTarget();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: fonts,
    });
    try {
      layout.end = () => 200;
      fixture();
      expect(sentence()).not.toHaveAttribute("data-fit");
      layout.end = (scale) => 260 * scale; // 글꼴이 와서 글이 넓어졌다
      act(() => {
        fonts.dispatchEvent(new Event("loadingdone"));
      });
      expect(sentence()).toHaveAttribute("data-fit", "0.9");
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });

  it("touches only the sentence — the name row and the pane keep their size", () => {
    layout.end = () => 400;
    fixture();
    const styled = [...document.querySelectorAll<HTMLElement>("[style]")]
      .filter((node) => node.style.getPropertyValue("--sentence-fit"))
      .map((node) => node.dataset.assemblySentence !== undefined);
    expect(styled).toEqual([true]);
  });
});

/**
 * CSS 쪽 약속 — 배율은 기준 크기(넓은 폭 22px · 좁은 폭 19px)에 곱하고, 빈칸 단추 글은 문장보다 커지지 않되
 * 누르는 크기(최소 높이 42px · 최소 폭 58px)는 그대로다.
 */
describe("assembly sentence fit — CSS", () => {
  const css = readFileSync(
    resolve(
      __dirname,
      "../../components/math-explorers/math-explorers.module.css",
    ),
    "utf8",
  );
  const rules = (selector: string) =>
    [...css.matchAll(new RegExp(`\\n\\s*${selector} \\{([^}]*)\\}`, "g"))].map(
      (match) => match[1],
    );

  it("scales the sentence from its base size at every width", () => {
    const sizes = rules("\\.assemblySentence").map(
      (body) => /font-size:\s*([^;]+);/.exec(body)?.[1],
    );
    expect(sizes).toEqual([
      "calc(22px * var(--sentence-fit, 1))",
      "calc(19px * var(--sentence-fit, 1))",
    ]);
  });

  it("keeps the blank button's tap size and never lets its word outgrow the sentence", () => {
    const [slot] = rules("button\\.wordSlot");
    expect(slot).toMatch(/font-size:\s*min\(17px, 1em\);/);
    expect(slot).toMatch(/min-height:\s*42px;/);
    expect(slot).toMatch(/min-width:\s*58px;/);
  });
});
