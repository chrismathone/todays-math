import { describe, expect, it } from "vitest";
import { typesetFigureSvg } from "@/components/unified/figure-editor/figureTypeset";
import {
  cleanFigureForSave,
  figureObjects,
  prepareFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 글자 배경색 — 원장님 2026-09-19 «글자 배경색도 추가할 수 있도록».
 * 원문 `<text>` 에는 `data-text-bg` 만 남기고, 조판(화면·저장 이미지·인쇄)할 때 글자 뒤에 채운 사각형을 둔다.
 * 사각형은 라벨 묶음(`<g>`) 안에 들어가 글자와 같이 움직이고, 요소 번호를 따로 받지 않는다.
 */
const NS = "http://www.w3.org/2000/svg";
const svg = (...parts: string[]) =>
  `<svg xmlns="${NS}" viewBox="0 0 480 360">${parts.join("")}</svg>`;
const text = (attrs: string, body = "AB", mj = body) =>
  `<text data-object-id="obj-0" x="100" y="200" font-size="20" text-anchor="start" data-mj="${mj}"${attrs}>${body}</text>`;
const read = (source: string) =>
  new DOMParser().parseFromString(source, "image/svg+xml");
const num = (node: Element, name: string) => Number(node.getAttribute(name));

describe("글자 배경색 — 조판", () => {
  it("배경색이 있으면 라벨 묶음 맨 앞에 그 색의 사각형 — 라벨 상자를 여백까지 감싼다", async () => {
    const doc = read(
      await typesetFigureSvg(svg(text(' data-text-bg="#ffee00"')), true),
    );
    const wrapper = doc.querySelector('[data-object-id="obj-0"]')!;
    expect(wrapper.localName).toBe("g");
    const rect = wrapper.firstElementChild!;
    expect(rect.localName).toBe("rect");
    expect(rect.getAttribute("fill")).toBe("#ffee00");
    expect(rect.hasAttribute("data-object-id")).toBe(false);
    const label = wrapper.querySelector("[data-label]")!;
    const left = num(label, "data-x"),
      width = num(label, "data-w"),
      top = num(label, "data-base") - num(label, "data-a"),
      bottom = num(label, "data-base") + num(label, "data-d");
    expect(num(rect, "x")).toBeLessThan(left);
    expect(num(rect, "y")).toBeLessThan(top);
    expect(num(rect, "x") + num(rect, "width")).toBeGreaterThan(left + width);
    expect(num(rect, "y") + num(rect, "height")).toBeGreaterThan(bottom);
    // 여백은 «약간» — 글자 크기의 한 켜 안쪽
    expect(left - num(rect, "x")).toBeLessThan(20 * 0.3);
  });

  it("배경색이 없으면 사각형도 없다(지금 모습 그대로)", async () => {
    const doc = read(await typesetFigureSvg(svg(text("")), true));
    expect(doc.querySelector("rect")).toBeNull();
  });

  it("글자를 옮기면(transform) 사각형이 같은 묶음 안에서 같이 간다", async () => {
    const doc = read(
      await typesetFigureSvg(
        svg(text(' data-text-bg="#ffee00" transform="translate(30 5)"')),
        true,
      ),
    );
    const wrapper = doc.querySelector('[data-object-id="obj-0"]')!;
    expect(wrapper.getAttribute("transform")).toBe("translate(30 5)");
    expect(wrapper.querySelector("rect")).not.toBeNull();
  });

  it("글자 크기·내용이 바뀌면 사각형도 다시 잰다", async () => {
    const width = async (attrs: string, body = "AB") => {
      const doc = read(
        await typesetFigureSvg(
          svg(text(` data-text-bg="#ffee00"${attrs}`, body)),
          true,
        ),
      );
      return num(doc.querySelector("rect")!, "width");
    };
    const base = await width("");
    expect(await width("", "ABCD")).toBeGreaterThan(base * 1.5);
    const bigger = read(
      await typesetFigureSvg(
        svg(
          text(' data-text-bg="#ffee00"').replace(
            'font-size="20"',
            'font-size="40"',
          ),
        ),
        true,
      ),
    );
    expect(num(bigger.querySelector("rect")!, "width")).toBeCloseTo(
      base * 2,
      0,
    );
  });

  it("조판하지 못하는 글자(한글 일반 글자)도 배경이 선다 — 글자와 한 묶음", async () => {
    const doc = read(
      await typesetFigureSvg(
        svg(text(' data-text-bg="#ffee00"', "가나", "가나")),
        true,
      ),
    );
    const wrapper = doc.querySelector('[data-object-id="obj-0"]')!;
    expect(wrapper.localName).toBe("g");
    expect(wrapper.firstElementChild?.localName).toBe("rect");
    const label = wrapper.querySelector("text")!;
    expect(label.textContent).toBe("가나");
    expect(label.hasAttribute("data-object-id")).toBe(false);
    const rect = wrapper.querySelector("rect")!;
    // 한글 두 자(글자 크기 20) — 1em 씩 40 에 여백
    expect(num(rect, "width")).toBeGreaterThan(40);
    expect(num(rect, "x")).toBeLessThan(100);
  });

  it("저장 이미지(조판 결과)에 사각형이 남고, 원문 저장본에는 속성만 남는다", async () => {
    const source = svg(text(' data-text-bg="#ffee00"'));
    const rendered = await typesetFigureSvg(source);
    expect(read(rendered).querySelector('rect[fill="#ffee00"]')).not.toBeNull();
    expect(rendered).not.toContain("data-object-id");
    const saved = cleanFigureForSave(source);
    expect(saved).toContain('data-text-bg="#ffee00"');
    expect(read(saved).querySelector("rect")).toBeNull();
  });

  it("다시 열어도(정리기) 속성이 남고, 요소는 글자 하나다", () => {
    const opened = prepareFigureSvg(
      cleanFigureForSave(svg(text(' data-text-bg="#ffee00"'))),
    );
    expect(opened).toContain('data-text-bg="#ffee00"');
    expect(figureObjects(opened).map((o) => o.type)).toEqual(["text"]);
  });

  it("색이 아닌 값은 그리지 않는다", async () => {
    const doc = read(
      await typesetFigureSvg(svg(text(' data-text-bg="red;x"')), true),
    );
    expect(doc.querySelector("rect")).toBeNull();
  });
});
