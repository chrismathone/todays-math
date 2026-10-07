/**
 * 작업실 검수 창의 인라인 SVG — **실행되는 것은 그리지 않는다.**
 *
 * `SourceEditorRenderer` 는 본문에서 `<svg>…</svg>` 를 떼어 `SourceFigureSvg` 로 넘기고, 그 컴포넌트와
 * `paintSourceFigure` 가 그 글자를 **그대로** `innerHTML` 에 넣었다(2026-10-07 검수). 본문은 OCR · AI 출력과
 * 사용자가 친 글이다 — `<image onerror=…>` 한 줄이면 그 화면에서 스크립트가 돈다. 편집기 길에는 허용 목록
 * 살균기(`prepareFigureSvg`)가 있었는데 이 길만 지나지 않았다.
 *
 * 🔴 «가짜가 통과하는가»보다 «진짜가 그대로인가»를 같이 본다 — 엔진이 그린 그림은 한 글자도 바뀌면 안 된다.
 */
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/unified/figure-editor/figureTypeset", () => ({
  typesetFigureSvg: vi.fn(async (source: string) => source),
}));

import { SourceFigureSvg } from "@/components/math/editor/SourceFigureSvg";
import {
  firstPaintFigureMarkup,
  paintSourceFigure,
  sanitizeSourceFigure,
} from "@/components/math/editor/sourceFigurePresentation";

/** 엔진 · 편집기가 내는 꼴 — 도형, 라벨, 그라데이션 참조, 안쪽 조각 참조, data: 그림. */
const CLEAN = [
  '<svg viewBox="0 0 240 180" width="240" height="180" shape-rendering="geometricPrecision"><path d="M10 10L230 170" stroke="#000" fill="none"/><circle cx="20" cy="20" r="3.5"/><text x="30" y="30" font-family="Times New Roman, serif" font-style="normal" data-mj="A">A</text></svg>',
  '<svg viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient><clipPath id="c"><rect width="10" height="10"/></clipPath></defs><rect width="100" height="100" fill="url(#g)" clip-path="url(#c)"/><use href="#c"/></svg>',
  '<svg viewBox="0 0 10 10"><image href="data:image/png;base64,iVBORw0KGgo=" width="10" height="10"/><text x="1" y="1" style="font-style: normal">3 cm</text></svg>',
];

const ATTACKS: [string, string][] = [
  ["그림의 onerror", '<svg><image href="x" onerror="alert(1)"/></svg>'],
  ["뿌리의 onload", '<svg onload=alert(1)><circle r="1"/></svg>'],
  [
    "foreignObject 안의 img",
    "<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>",
  ],
  [
    "javascript: 주소",
    '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>',
  ],
  [
    "엔티티로 가린 javascript: 주소",
    '<svg><a href="jav&#x09;ascript:alert(1)"><text>x</text></a></svg>',
  ],
  ["script 요소", '<svg><script>alert(1)</script><circle r="1"/></svg>'],
  [
    "따옴표 속 > 뒤에 숨긴 이벤트",
    '<svg><text data-x=">" onclick="alert(1)">t</text></svg>',
  ],
  ["빗금으로 가른 이벤트", "<svg><image/onerror=alert(1) href=x></svg>"],
  [
    "따옴표에 붙여 쓴 이벤트",
    '<svg><image href="x"onerror="alert(1)"></image></svg>',
  ],
  [
    "움직임으로 주소 바꾸기",
    '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a></svg>',
  ],
  [
    "iframe",
    '<svg><foreignObject><iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe></foreignObject></svg>',
  ],
  ["대문자 이벤트", '<svg><image HREF="x" ONERROR="alert(1)"/></svg>'],
];

/** 그린 뒤의 DOM 에 실행되는 것이 남았는가. */
function executable(root: ParentNode): string[] {
  const found: string[] = [];
  for (const node of root.querySelectorAll("*")) {
    const name = node.localName.toLowerCase();
    if (
      ["script", "iframe", "embed", "object", "animate", "set"].includes(name)
    )
      found.push(`<${name}>`);
    for (const attr of node.attributes) {
      if (attr.name.toLowerCase().startsWith("on"))
        found.push(`${name}@${attr.name}`);
      if (
        /^(?:xlink:)?href$|^src$|^srcdoc$/i.test(attr.name) &&
        /^(?:java|vb)script:/i.test(
          attr.value.replace(/[\s\u0000-\u001f]/g, ""),
        )
      )
        found.push(`${name}@${attr.name}=${attr.value}`);
      if (attr.name.toLowerCase() === "srcdoc") found.push(`${name}@srcdoc`);
    }
  }
  return found;
}

describe("인라인 SVG 살균", () => {
  it.each(CLEAN)("엔진이 그린 그림은 한 글자도 안 바뀐다: %#", (source) => {
    expect(firstPaintFigureMarkup(source)).toBe(source);
    expect(sanitizeSourceFigure(source)).toBe(source);
  });

  it.each(ATTACKS)(
    "🔴 %s — 첫 그림(서버 포함)에는 아예 싣지 않는다",
    (_name, source) => {
      expect(firstPaintFigureMarkup(source)).toBe("");
    },
  );

  it.each(ATTACKS)("🔴 %s — 살균본에는 실행되는 것이 없다", (_name, source) => {
    const host = document.createElement("div");
    host.innerHTML = sanitizeSourceFigure(source);
    expect(executable(host)).toEqual([]);
  });

  it("실행되는 것만 걷는다 — 같은 그림의 도형은 남는다", () => {
    const host = document.createElement("div");
    host.innerHTML = sanitizeSourceFigure(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><circle r="1" onclick="alert(1)"/><path d="M0 0L1 1"/></svg>',
    );
    expect(host.querySelector("circle")?.getAttribute("r")).toBe("1");
    expect(host.querySelector("path")?.getAttribute("d")).toBe("M0 0L1 1");
    expect(host.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 10 10",
    );
  });
});

describe("그리는 두 자리 — 컴포넌트와 paintSourceFigure", () => {
  it.each(ATTACKS)("🔴 %s — <SourceFigureSvg> 가 그린 DOM", (_name, source) => {
    const { container } = render(<SourceFigureSvg source={source} />);
    expect(executable(container)).toEqual([]);
  });

  it.each(ATTACKS)(
    "🔴 %s — paintSourceFigure 가 그린 DOM",
    async (_name, source) => {
      const element = document.createElement("span");
      paintSourceFigure(element, source);
      expect(executable(element)).toEqual([]);
      // 조판(typeset)이 돌려준 글자도 같은 문을 지난다
      await Promise.resolve();
      await Promise.resolve();
      expect(executable(element)).toEqual([]);
    },
  );

  it("깨끗한 그림은 전처럼 그려진다", () => {
    const { container } = render(<SourceFigureSvg source={CLEAN[0]} />);
    expect(container.querySelector("svg path")?.getAttribute("d")).toBe(
      "M10 10L230 170",
    );
    expect(container.querySelector("svg text")?.textContent).toBe("A");
  });
});
