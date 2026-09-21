/**
 * 🔴 RED → 🟢 — 같은 도형의 라벨은 **어느 화면에서나 같은 글씨체**다 (원장님 2026-09-21 «왜 서로 글씨체가 다르지?»).
 *
 * 화면 둘: 검수 카드의 도형은 «2 cm» 가 숫자까지 기울었고, 도형 편집기의 같은 도형은 정자였다.
 *
 * 엔진은 각도·호 라벨의 바깥 `<text>` 에 `font-style="italic"` 을 걸고, 조각(`<tspan>`)마다 기울임을 따로 적는다
 * (숫자·°·단위는 `font-style="normal"`). 조판기(`typesetFigureSvg`)는 **바깥 표시만** 보고 라벨 전체를 `\mathit{…}` 로
 * 싸면서 단위의 정자(`\mathrm`)까지 벗겼다. 2026-09-19 «각도가 자꾸 기울어지는데» 때 이것을 고쳤는데, 고친 자리가
 * **편집기를 여는 길**(`prepareFigureSvg`)이었다 — 카드·지면이 쓰는 조판 길에는 규칙이 없었다. 그래서 편집기를
 * 한 번 거친 도형만 정자가 됐다. 규칙은 조판기 안에 있어야 한다(한쪽 배선에만 걸린 규칙 — 20번 2026-08-18).
 *
 * 글자 외곽선으로 가른다: 같은 글을 정자·기울임 두 길로 조판해, 한쪽에만 있는 외곽선이 결과에 들었는지 본다.
 */
import { describe, expect, it } from "vitest";

import { prepareFigureSvg } from "@/components/unified/figure-editor/figureSvgEditing";
import { typesetFigureSvg } from "@/components/unified/figure-editor/figureTypeset";
import { typesetLabel } from "@/components/unified/figure-editor/mathjaxLabel";

const outlines = (svg: string) =>
  new Set(
    [...svg.matchAll(/\sd="([^"]{20,})"/g)].map((m) => m[1]!.slice(0, 60)),
  );

/** 그 글이 정자로 섰나 기울임으로 섰나 — 한쪽에만 있는 외곽선의 수. */
function styleOf(svg: string, label: string) {
  const upright = outlines(typesetLabel(label, false, false)!.inner);
  const slanted = outlines(typesetLabel(label, false, true)!.inner);
  const found = outlines(svg);
  return {
    upright: [...upright].filter((d) => !slanted.has(d) && found.has(d)).length,
    slanted: [...slanted].filter((d) => !upright.has(d) && found.has(d)).length,
  };
}

const svg = (text: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" width="260" height="260">` +
  `<path d="M40 40L220 40L220 220L40 220Z" fill="none" stroke="#111"/>${text}</svg>`;

/** 엔진이 갓 낸 각도·호 라벨 — 바깥은 기울임, 숫자·단위 조각은 정자(`figure_scene.py` · `label_markup.py`). */
const engineLabel = (label: string) =>
  svg(
    `<text x="120" y="100" font-family="Cambria Math, serif" font-size="16.8" font-style="italic" ` +
      `text-anchor="middle" fill="#111111" paint-order="stroke" stroke="#ffffff" stroke-width="4" ` +
      `data-mj="${label}"><tspan font-style="normal">${label}</tspan></text>`,
  );
/** 사용자가 편집기의 «기울임» 단추로 켠 라벨 — 조각에 정자 표시가 없다. */
const userItalic = (label: string) =>
  svg(
    `<text x="120" y="100" font-size="16.8" font-style="italic" text-anchor="middle" fill="#111111" ` +
      `data-mj="${label}">${label}</text>`,
  );

describe("도형 라벨 — 어느 길로 조판해도 같은 글씨체", () => {
  it("전제 — 같은 글의 정자·기울임 조판은 외곽선이 다르다(같으면 아래 단정이 헛돈다)", () => {
    const upright = outlines(typesetLabel("2 cm", false, false)!.inner);
    const slanted = outlines(typesetLabel("2 cm", false, true)!.inner);
    expect([...upright].filter((d) => !slanted.has(d)).length).toBeGreaterThan(
      0,
    );
  });

  it("🔴 카드 길(정리 없이 바로 조판) — 엔진 라벨 «2 cm» 는 정자다", async () => {
    const typeset = await typesetFigureSvg(engineLabel("2 cm"), true);
    expect(styleOf(typeset, "2 cm")).toEqual({ upright: 3, slanted: 0 });
  });

  it("편집기 길(정리 → 조판)도 정자다 — 두 길이 같다", async () => {
    const typeset = await typesetFigureSvg(
      prepareFigureSvg(engineLabel("2 cm")),
      true,
    );
    expect(styleOf(typeset, "2 cm")).toEqual({ upright: 3, slanted: 0 });
  });

  it("🔴 각도 «30°» 도 카드 길에서 숫자가 기울지 않는다", async () => {
    const typeset = await typesetFigureSvg(engineLabel("30°"), true);
    const style = styleOf(typeset, "30°");
    expect(style.slanted).toBe(0);
    expect(style.upright).toBeGreaterThan(0);
  });

  it("사용자가 «기울임»으로 켠 라벨은 두 길 모두 기울임 그대로다", async () => {
    for (const source of [
      userItalic("2 cm"),
      prepareFigureSvg(userItalic("2 cm")),
    ]) {
      const typeset = await typesetFigureSvg(source, true);
      expect(styleOf(typeset, "2 cm")).toEqual({ upright: 0, slanted: 3 });
    }
  });
});
