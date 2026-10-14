/**
 * 🔴 **기출 자가 재는 지면 == 기출 제품이 찍는 지면.**
 *
 * ## 왜 이 파일이 있는가
 *
 * 기출 2단 지면의 자(`EXAM_MEASURED_PX`)는 `measure-exam-paper-units.tsx` 가
 * Chromium 에서 잰 값이고, 그것이 그리는 DOM 은 `examPaperProbe.renderExamItem` 이다.
 * 제품 지면은 `PastPaperTemplate` 이다. **마크업이 두 벌**이다 —
 * `PastPaperTemplate` 이 CSS 모듈을 물고 있어 node 에서 그대로 못 부르기 때문이다.
 *
 * 두 벌은 반드시 갈라진다. 갈라지면 자는 **딴 지면을 재고**, 그 값으로 쪽을 나눈
 * 시험지는 종이에서 겹쳐 찍힌다. 아무 지표도 안 운다 — 자와 지면이 서로 앞뒤가
 * 맞기 때문이다(2026-08-29 「지면이 안 그리니 자가 안 세는 것이 «맞는» 상태였다」).
 *
 * 자습 판에서 실제로 그렇게 갈렸다(2026-08-20): 제품은 `figureDims`·`figureSourceMm`
 * 을 넘겨 그림 폭을 mm 로 못 박는데 탐침은 그 둘을 안 넘겨, 519건(41.6%)의 높이가
 * −313 ~ +661px 달랐다. 그 사고 뒤 자습에는 `paperProbeParity.test.tsx` 가 섰는데
 * **기출에는 안 섰다** — `examPaperProbe` 머리말은 이 파일이 있다고 적어 두고 있었다.
 *
 * ## 무엇을 견주나 — 그리고 무엇을 일부러 안 견주나
 *
 * 견주는 것은 **레이아웃을 정하는 것 전부**다: 태그·클래스 이름·인라인 style·
 * `data-*`. CSS 모듈 이름은 제품에서 `_item_44bae0` 으로 해시되므로 껍질을 벗겨 견준다.
 *
 * 안 견주는 것은 둘뿐이고 **둘 다 이유가 있다**:
 *  · `data-pid`·`data-number` — 탐침이 «어느 문항을 쟀나»를 표시하려고 붙인다.
 *    지면 CSS 에 속성 선택자가 없어 높이에 영향이 없다(실제로 확인했다).
 *  · `src`·`href` — 탐침은 `file://` 로 읽어야 해서 경로가 다르다. 폭은 style 로 견준다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  renderExamItem,
  renderExamPage,
  type ExamSlot,
} from "../../../scripts/qa/examPaperProbe";
import { PastPaperTemplate } from "../../components/print/templates/PastPaperTemplate";
import type { TestPrintProblem } from "../../components/print/types";

/** 탐침이 재려고 붙이는 표시 — 지면 CSS 에 속성 선택자가 없어 높이와 무관하다. */
const MEASURE_ONLY = new Set(["data-pid", "data-number"]);
/** 탐침은 `file://` 로 그림을 읽어야 해서 경로가 다르다. 폭은 style 로 견준다. */
const PATHY = new Set(["src", "href"]);

/** `_item_44bae0` → `item`. 제품은 해시하고 탐침은 원문 이름을 쓴다. */
function unhash(cls: string): string {
  const m = /^_(.+)_[0-9a-f]{4,}$/.exec(cls);
  return m ? m[1]! : cls;
}

/**
 * 🔴 **그려지지 않는 노드**는 견주지 않는다.
 *
 * React 19 는 `renderToStaticMarkup`(탐침)에서는 그림 `<link rel="preload">` 를
 * 본문에 그대로 두고, 클라이언트 렌더(제품 검사)에서는 `<head>` 로 끌어올린다.
 * 렌더 방식이 만드는 차이지 지면의 차이가 아니다 — `link` 는 UA 기본이
 * `display:none` 이라 **높이를 한 픽셀도 안 먹는다.**
 */
const UNRENDERED = new Set(["link", "meta", "script", "template"]);

/**
 * style 직렬화 차이를 지운다. 제품 쪽은 CSSOM 을 거쳐 `height: 0.8833em;` 로,
 * 탐침 쪽은 SSR 문자열 그대로 `height:0.8833em` 로 나온다. **뜻은 같다.**
 * 값은 남긴다 — 거기에 그림 폭(mm)이 살아 있고, 그게 이 검사의 급소다.
 */
function normalizeStyle(raw: string): string {
  return raw
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(":");
      const decl =
        i < 0 ? d : `${d.slice(0, i).trim()}:${d.slice(i + 1).trim()}`;
      // 꼬리 0 도 직렬화 차이다 — 제품은 CSSOM 을 거쳐 `42mm`, 탐침은 `42.00mm`.
      // **값 자체는 그대로 둔다**: 여기가 달라지면 그림 폭이 진짜로 갈린 것이다.
      // ⚠️ **소수점이 있는 수만** 손댄다. 정수까지 훑으면 `#A57F00` 이 `#A57F0` 이 되어
      //    다른 색 둘이 같아 보인다 — 정규화가 가드를 무디게 만드는 자리다.
      return decl.replace(/\d+\.\d+/g, (n) => String(Number(n)));
    })
    .sort()
    .join(";");
}

/**
 * 요소 하나의 «레이아웃 지문». 태그 + 클래스(정렬) + style + 나머지 속성 이름(정렬).
 * 속성 **값**까지 보는 것은 style 뿐이다 — 거기에 그림 폭(mm)이 산다.
 */
function signature(el: Element): string {
  const cls = [...el.classList].map(unhash).sort().join(".");
  const style = normalizeStyle(el.getAttribute("style") ?? "");
  const attrs = [...el.attributes]
    .map((a) => a.name)
    .filter((n) => n !== "class" && n !== "style")
    .filter((n) => !MEASURE_ONLY.has(n) && !PATHY.has(n))
    .sort()
    .join(",");
  return (
    el.tagName.toLowerCase() +
    (cls ? `.${cls}` : "") +
    (attrs ? `[${attrs}]` : "") +
    (style ? ` {${style}}` : "")
  );
}

function shapeOf(root: Element): string[] {
  const out: string[] = [];
  const walk = (el: Element, depth: number) => {
    if (UNRENDERED.has(el.tagName.toLowerCase())) return;
    out.push("  ".repeat(depth) + signature(el));
    for (const child of Array.from(el.children)) walk(child, depth + 1);
  };
  walk(root, 0);
  return out;
}

function parse(html: string): Element {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild!;
}

/**
 * 🔴 그림·수식·보기·배점·유형 라벨을 **다 물린** 표본이어야 한다. 하나라도 빠지면
 *    그 갈래는 이 검사에서 구조적으로 0이다 — 갈라져도 초록이다.
 */
const SVG = '<svg viewBox="0 0 224 140"><circle cx="10" cy="10" r="4" /></svg>';
const FIXTURE = {
  id: "p-parity",
  content:
    "다음 그림에서 $\\overline{AB}=8$ 일 때 $\\sin A$ 의 값은?\n\n" +
    "① $\\dfrac{1}{2}$\n② $\\dfrac{\\sqrt3}{2}$\n③ $1$\n④ $2$\n⑤ $3$",
  questionType: "객관식",
  score: 5,
  figureUrls: ["/figures/probe/x.png"],
  figureDims: [400, 300],
  figureSourceMm: [42],
  figureSvg: SVG,
};

const SLOT: ExamSlot = { ...FIXTURE, number: 7 };

function productItemShape(
  overrides: Partial<TestPrintProblem> = {},
  number = 7,
  score: number | null = 5,
): string[] {
  const problem = { ...FIXTURE, ...overrides } as unknown as TestPrintProblem;
  const { container } = render(
    <PastPaperTemplate
      columns={[[problem]]}
      meta={{ academyName: "오늘 수학", title: "제목", subtitle: "부제" }}
      numberOf={() => number}
      page={2}
      scoreOf={() => score}
    />,
  );
  const article = container.querySelector("article");
  expect(article, "제품 지면에 문항 `article` 이 없다").not.toBeNull();
  return shapeOf(article!);
}

describe("기출 탐침 지면이 제품 지면과 같은 것을 그린다", () => {
  it("문항 한 칸의 DOM 이 글자 하나까지 같다 — 클래스·style·속성", () => {
    const probe = shapeOf(parse(renderExamItem(SLOT)));
    expect(probe.join("\n")).toBe(productItemShape().join("\n"));
  });

  it("서술형이면 유형 라벨이 **양쪽 다** 붙는다", () => {
    const slot: ExamSlot = { ...SLOT, questionType: "서술형" };
    const probe = shapeOf(parse(renderExamItem(slot)));
    expect(probe.join("\n")).toBe(
      productItemShape({ questionType: "서술형" }).join("\n"),
    );
    // 🔴 라벨이 실제로 생겨야 이 회차가 무엇을 지켰다고 말할 수 있다.
    expect(probe.join("\n")).toContain(".kind");
  });

  it("배점이 없으면 **양쪽 다** 안 그린다", () => {
    const slot: ExamSlot = { ...SLOT, score: null };
    const probe = shapeOf(parse(renderExamItem(slot)));
    expect(probe.join("\n")).toBe(productItemShape({}, 7, null).join("\n"));
    expect(probe.join("\n")).not.toContain(".score");
  });

  it("그림 폭을 **같은 mm** 로 못 박는다 — 2026-08-20 자습 사고와 같은 자리", () => {
    const probe = shapeOf(parse(renderExamItem(SLOT))).join("\n");
    expect(probe).toContain("width:42mm");
    expect(productItemShape().join("\n")).toContain("width:42mm");

    // 🔴 이 42mm 가 **`figureSourceMm` 때문에** 나온 값인지 확인한다. 그 배선이
    //    빠지면 픽셀 환산으로 떨어지는데, 그때도 `width:…mm` 는 그대로 나오므로
    //    「mm 가 있다」만 보면 갈리는 줄 모른다 — 실제로 자습이 그렇게 샜다.
    const noMm = shapeOf(
      parse(renderExamItem({ ...SLOT, figureSourceMm: undefined })),
    ).join("\n");
    expect(noMm).not.toContain("width:42mm");
  });

  it("엔진 그림(figureSvg)이 **양쪽 다** 나간다 — 안 넘기면 종이에만 없다", () => {
    const probe = shapeOf(parse(renderExamItem(SLOT))).join("\n");
    expect(probe).toContain("data-figure-svg");
    expect(productItemShape().join("\n")).toContain("data-figure-svg");
  });

  it("장 머리(첫 장 · 이어지는 장)와 단 구조가 같다", () => {
    for (const [kind, page] of [
      ["first", 1],
      ["continuation", 2],
    ] as const) {
      const probeHtml = renderExamPage(kind, [[], []], page);
      // 문항은 위 검사가 이미 잠갔다 — 여기서는 **장 껍데기**만 견준다.
      const probe = shapeOf(parse(probeHtml));
      const { container } = render(
        <PastPaperTemplate
          columns={[[], []]}
          meta={{ academyName: "오늘 수학", title: "제목", subtitle: "부제" }}
          numberOf={() => 1}
          page={page}
          scoreOf={() => null}
        />,
      );
      const section = container.querySelector("section");
      expect(section, "제품 지면에 `section` 이 없다").not.toBeNull();
      // 🔴 A4Page 는 `aria-label`·`data-print-page` 를 더 붙인다 — 지면 CSS 에
      //    속성 선택자가 없어 레이아웃과 무관하므로 이름만 빼고 견준다.
      const strip = (rows: string[]) =>
        rows.map((r) => r.replace(/\[[^\]]*\]/, ""));
      expect(strip(probe).join("\n"), `${kind} 장 껍데기가 갈렸다`).toBe(
        strip(shapeOf(section!)).join("\n"),
      );
    }
  });

  it("🔴 이 견줌이 **아니오를 낼 수 있다** — 음성 대조", () => {
    // 도장은 초록을 못 낸다. 반대로, 늘 초록인 견줌은 아무것도 안 지킨다.
    // 일부러 다른 DOM 을 넣어 실제로 갈라지는지 본다.
    const a = shapeOf(
      parse('<article class="item"><div class="bandRow"></div></article>'),
    );
    const b = shapeOf(
      parse('<article class="item"><div class="body"></div></article>'),
    );
    expect(a.join("\n")).not.toBe(b.join("\n"));

    // 그리고 지문이 **비어 있지 않아야** 한다 — 0 은 「같다」가 아니라 「못 셈」이다.
    const probe = shapeOf(parse(renderExamItem(SLOT)));
    expect(probe.length, "탐침 DOM 에서 요소를 거의 못 읽었다").toBeGreaterThan(
      10,
    );
  });
});
