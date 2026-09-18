import { describe, expect, it } from "vitest";
import {
  addFigureObject,
  cleanFigureForSave,
  editFigureObject,
  figureObjects,
  prepareFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { typesetFigureSvg } from "@/components/unified/figure-editor/figureTypeset";
import { typesetLabel } from "@/components/unified/figure-editor/mathjaxLabel";

// 원장님 2026-09-19 «각도가 자꾸 기울어지는데, 기울어지지 않게 해.» — 엔진(figure_scene.py:2867)은 각도 라벨의
// 바깥 <text> 에 font-style="italic" 을 걸고 조각(<tspan>)마다 기울임을 따로 적는다(숫자·° 는 normal).
// 편집기 조판(figureTypeset → mathjaxLabel)은 바깥 표시만 보고 \mathit 으로 숫자까지 기울였다.
// 아래 <text> 는 엔진 출력 그대로다(render_spec.py, 2026-09-19).
const HALO =
  'font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" font-style="italic" text-anchor="middle" fill="#111111" paint-order="stroke" stroke="#ffffff" stroke-width="3.15" stroke-linejoin="round"';
const DEGREE =
  '<tspan font-style="normal" font-size="10.584" dy="-5.342">°</tspan><tspan dy="5.342" />';
const ANGLE_60 = `<text x="156.096" y="72.926" ${HALO} data-mj="60°"><tspan font-style="normal">60</tspan>${DEGREE}</text>`;
const ANGLE_X = `<text x="56.757" y="227.979" ${HALO} data-mj="x°"><tspan font-style="italic" font-family="Cambria, Times New Roman, serif">x</tspan>${DEGREE}</text>`;
const ANGLE_THETA = `<text x="272.722" y="228.753" ${HALO} data-mj="θ"><tspan font-style="italic" font-family="Cambria, Times New Roman, serif">θ</tspan></text>`;
// 점 이름표 italic:true — 흰 테두리(paint-order)가 없다
const POINT_ITALIC =
  '<text x="94.95" y="99.602" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" font-style="italic" text-anchor="middle" fill="#111111" data-px="94.95" data-py="104.95" data-mj="P1"><tspan font-style="normal">P1</tspan></text>';
// 이 수정 전에 저장된 초안 — prepare 가 이미 style 에 italic 을 옮겨 적어 두었다
const SAVED_BEFORE = `<text x="156.096" y="72.926" ${HALO} data-mj="60°" style="font-style: italic; font-family: &quot;Times New Roman&quot;, serif; stroke: #ffffff; stroke-width: 3.15;"><tspan font-style="normal">60</tspan>${DEGREE}</text>`;
const svg = (...texts: string[]) =>
  `<svg viewBox="0 0 316 247" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="100" y2="100" stroke="#111111"/>${texts.join("")}</svg>`;
const texts = (source: string) =>
  figureObjects(source).filter((o) => o.type === "text");
// 조판 조각은 placeLabel 이 색을 다시 칠해 넣으므로 문자열이 아니라 **글리프 모양(d)** 으로 견준다
const shapes = (inner: string) =>
  [...inner.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
const upright = (label: string) =>
  shapes(typesetLabel(label, false, false)!.inner);
const slanted = (label: string) =>
  shapes(typesetLabel(label, false, true)!.inner).filter(
    (shape) => !upright(label).includes(shape),
  );
const printed = async (source: string) =>
  shapes(await typesetFigureSvg(cleanFigureForSave(source)));

describe("engine angle labels are typeset upright in the figure editor", () => {
  it("prints the engine's 60° with upright digits", async () => {
    const prepared = prepareFigureSvg(svg(ANGLE_60));
    const [label] = texts(prepared);
    expect(label.attrs["font-style"]).toBe("normal");
    expect(label.attrs.style).toContain("font-style: normal");
    expect(slanted("60°").length).toBeGreaterThan(0);
    const paper = await printed(prepared);
    expect(paper).toEqual(expect.arrayContaining(upright("60°")));
    expect(paper.filter((d) => slanted("60°").includes(d))).toEqual([]);
  });

  it("keeps only the letter italic in x° — digits and ° stay upright", async () => {
    const paper = await printed(prepareFigureSvg(svg(ANGLE_X)));
    expect(slanted("x°").length).toBeGreaterThan(0);
    expect(paper).toEqual(expect.arrayContaining(upright("x°")));
    expect(paper.filter((d) => slanted("x°").includes(d))).toEqual([]);
  });

  it("keeps the engine's dimension label (5 cm) upright — it never had the outer italic", async () => {
    const dimension =
      '<text x="164.95" y="254.326" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6" stroke-linejoin="round" data-mj="5 cm"><tspan font-style="normal">5 cm</tspan></text>';
    const paper = await printed(prepareFigureSvg(svg(dimension)));
    expect(slanted("5 cm").length).toBeGreaterThan(0);
    expect(paper).toEqual(expect.arrayContaining(upright("5 cm")));
    expect(paper.filter((d) => slanted("5 cm").includes(d))).toEqual([]);
  });

  it("leaves an all-letter angle label (θ) italic", () => {
    const [label] = texts(prepareFigureSvg(svg(ANGLE_THETA)));
    expect(label.attrs["font-style"]).toBe("italic");
  });

  it("keeps the italic the user turns on with the editor button, through save and reopen", async () => {
    const prepared = prepareFigureSvg(svg(ANGLE_60));
    const [label] = texts(prepared);
    const toggled = editFigureObject(prepared, label.id, {
      "font-style": "italic",
    });
    const reopened = prepareFigureSvg(cleanFigureForSave(toggled));
    expect(texts(reopened)[0].attrs["font-style"]).toBe("italic");
    expect(await printed(reopened)).toEqual(
      expect.arrayContaining(slanted("60°")),
    );
  });

  it("fixes a draft saved before this change when it is reopened", async () => {
    const reopened = prepareFigureSvg(svg(SAVED_BEFORE));
    const [label] = texts(reopened);
    expect(label.attrs["font-style"]).toBe("normal");
    expect(label.attrs.style).toContain("font-style: normal");
    expect(await printed(reopened)).toEqual(
      expect.arrayContaining(upright("60°")),
    );
  });

  it("does not touch point labels or text the user wrote", () => {
    const [point] = texts(prepareFigureSvg(svg(POINT_ITALIC)));
    expect(point.attrs["font-style"]).toBe("italic");
    const { svg: withText, id } = addFigureObject(
      prepareFigureSvg(svg()),
      "text",
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      "60°",
    );
    const mine = editFigureObject(withText, id, { "font-style": "italic" });
    const [text] = texts(prepareFigureSvg(cleanFigureForSave(mine)));
    expect(text.attrs["font-style"]).toBe("italic");
  });
});
