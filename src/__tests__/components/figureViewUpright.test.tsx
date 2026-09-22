/**
 * 🔴 RED → 🟢 — 보기 화면에서만 그림 글자 «50°»·«3 cm» 가 기울던 것 (원장님 2026-09-22 «자꾸 기울어진 폰트가 왜 자꾸 나오는거지?»).
 *
 * 같은 문제를 «내용 수정»으로 열면 곧게 나왔다 — 편집 화면은 저장된 그림을 그대로 그리고, 보기 화면만
 * 옛 «인라인 SVG 정리»(`normalizeInlineSvgs` Pass A)를 한 번 더 지났다. Pass A 는 `font-style` **속성**만 보고
 * 없으면 글자로 짐작해 붙인다 — 저장된 그림은 `style="font-style: normal"` 로 이미 정해 두었는데 그걸 못 보고
 * «숫자만»이 아닌 `50°`·`3 cm` 에 `font-style="italic"` 을 달았다. 조판은 그 속성을 읽어 글자 전체를 기울였다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SourceEditorRenderer from "@/components/math/editor/SourceEditorRenderer";
import { prepareFigureSvg } from "@/components/unified/figure-editor/figureSvgEditing";

const SVG_NS = "http://www.w3.org/2000/svg";
const view = (svg: string) =>
  renderToStaticMarkup(
    <SourceEditorRenderer content="[그림1]" diagramSvgs={[{ svg }]} />,
  );
const opener = (html: string, text: string) =>
  [...html.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].find(
    (m) => m[1].replace(/<[^>]+>/g, "") === text,
  )?.[0];

describe("보기 화면의 그림 글자 — 저장된 모양을 그대로", () => {
  const stored = prepareFigureSvg(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 200 100">` +
      `<text x="20" y="20" font-size="18">A</text>` +
      `<text x="60" y="20" font-size="18">50°</text>` +
      `<text x="100" y="20" font-size="18">3 cm</text>` +
      `<text x="140" y="20" font-size="18" style="font-style: italic">x</text>` +
      `</svg>`,
  );

  it("각도·길이 글자에 기울임을 새로 달지 않는다", () => {
    const html = view(stored);
    for (const text of ["50°", "3 cm", "A"])
      expect(opener(html, text)).not.toMatch(/font-style="italic"/);
  });

  it("저장된 그림이 정해 둔 기울임(변수 x)은 그대로 둔다", () => {
    expect(opener(view(stored), "x")).toMatch(/font-style:\s*italic/);
  });

  it("모델이 본문에 바로 쓴, 모양을 안 정한 그림은 전처럼 짐작한다 — 점·숫자는 곧게, 변수는 기울여", () => {
    const html = view(
      `<svg xmlns="${SVG_NS}" viewBox="0 0 100 40"><text x="10" y="20">B</text><text x="40" y="20">12</text><text x="70" y="20">y</text></svg>`,
    );
    expect(opener(html, "B")).toMatch(/font-style="normal"/);
    expect(opener(html, "12")).toMatch(/font-style="normal"/);
    expect(opener(html, "y")).toMatch(/font-style="italic"/);
  });
});
