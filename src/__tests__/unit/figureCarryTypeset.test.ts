import { describe, expect, it } from "vitest";
import { carryTypeset } from "@/components/unified/figure-editor/figureTypeset";

/**
 * 조판(350ms 뒤)이 따라오기 전에도 라벨은 조판본으로 보여야 한다. 전에는 원문이 바뀌면 그림 전체를
 * 날것으로 보여, 끄는 동안·놓은 직후마다 모든 라벨이 `y(\mathrm{m/sec})` 같은 원문으로 바뀌었다
 * (원장님 2026-09-18 «도형편집기 … 프레임이 엄청 끊기네»).
 */
const NS = "http://www.w3.org/2000/svg";
const text = (attrs: string, body = "y") =>
  `<text data-object-id="obj-0" x="10" y="20" font-size="18" data-mj="$y$"${attrs}>${body}</text>`;
const line = (x2 = 80) =>
  `<line data-object-id="obj-1" x1="0" y1="0" x2="${x2}" y2="0" stroke="#111111"/>`;
const svg = (...parts: string[]) =>
  `<svg xmlns="${NS}" viewBox="0 0 480 360">${parts.join("")}</svg>`;
const previous = svg(text(""), line());
const rendered = svg(
  `<g data-object-id="obj-0"><path data-glyph="y" d="M0 0L1 1"/></g>`,
  line(),
);
const read = (source: string) =>
  new DOMParser().parseFromString(source, "image/svg+xml");

describe("carryTypeset — 조판이 따라오기 전의 화면", () => {
  it("자리만 바뀐 라벨은 앞 조판본을 새 자리로 옮겨 쓴다", () => {
    const doc = read(
      carryTypeset(
        previous,
        rendered,
        svg(text(' transform="translate(5 0)"'), line()),
      ),
    );
    expect(doc.querySelector("text")).toBeNull();
    const label = doc.querySelector('[data-object-id="obj-0"]')!;
    expect(label.localName).toBe("g");
    expect(label.getAttribute("transform")).toBe("translate(5 0)");
    expect(label.querySelector("[data-glyph]")).not.toBeNull();
  });
  it("자리를 되돌리면 조판본의 transform 도 지운다", () => {
    const moved = svg(text(' transform="translate(5 0)"'), line());
    const renderedMoved = carryTypeset(previous, rendered, moved);
    const doc = read(carryTypeset(moved, renderedMoved, previous));
    expect(
      doc.querySelector('[data-object-id="obj-0"]')!.hasAttribute("transform"),
    ).toBe(false);
  });
  it("라벨 밖의 요소는 새 원문 그대로다", () => {
    const doc = read(
      carryTypeset(previous, rendered, svg(text(""), line(142))),
    );
    expect(doc.querySelector("line")!.getAttribute("x2")).toBe("142");
    expect(doc.querySelector('[data-object-id="obj-0"]')!.localName).toBe("g");
  });
  it("내용·크기가 바뀐 라벨과 새 라벨은 날것으로 둔다 — 조판이 따라온다", () => {
    const changed = svg(
      text("", "z").replace('data-mj="$y$"', 'data-mj="$z$"'),
      text("")
        .replace('font-size="18"', 'font-size="24"')
        .replace("obj-0", "obj-2"),
      line(),
    );
    const doc = read(carryTypeset(previous, rendered, changed));
    expect(doc.querySelector('[data-object-id="obj-0"]')!.localName).toBe(
      "text",
    );
    expect(doc.querySelector('[data-object-id="obj-2"]')!.localName).toBe(
      "text",
    );
  });
  it("지운 라벨은 남기지 않는다", () => {
    const doc = read(carryTypeset(previous, rendered, svg(line())));
    expect(doc.querySelector('[data-object-id="obj-0"]')).toBeNull();
  });
});
