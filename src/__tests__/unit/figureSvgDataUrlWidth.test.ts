/**
 * 🟢 **작업실이 다시 그린 SVG 도형이 지면에서 «스캔 자»를 타고 있었다** (2026-09-20).
 *
 * 원장님이 겪은 것: 같은 이등변삼각형 ABC(치수 5·3·4)가 **검수 화면에서는 글자보다
 * 큼직**한데 **HWPX 로 내보내면 치수 숫자가 뭉갠다.**
 *
 * 실측(`e2e/hwpx-figure-scale`)으로 잰 갈림:
 *   · 검수 화면 — SVG 를 제 고유 크기 **236.6px**(글자 14px) 로 그린다.
 *   · 지면·HWPX — 같은 도형을 **105.8px**(= 28mm, 글자 13.5px) 로 그린다.
 * 그림/글자 비례가 16.9 → 7.8 로 **2.2배** 작아진다. 라벨은 16.8 단위라
 * 236.6px 에서 16.8px 인 것이 105.8px 에서는 **7.5px** — 본문(13.5px)보다 작다.
 *
 * 뿌리는 **자가 두 벌**인 것이다:
 *   ① 엔진 SVG 자 — `figure/figureSvgFrame.ts` 의 `FIGURE_SVG_PRINT_MM`(37·64·70·97mm).
 *      인라인 `figureSvg` 만 이 자를 탄다.
 *   ② 스캔 자 — `figurePrintSize.ts` 의 `fallbackSourceMm`(253dpi · 바닥 28mm).
 * 작업실은 다시 그린 SVG 를 `svgDataUrl()` 로 **`figureUrls` 에 실어** 보내므로
 * (`studioHelpers.studioProblem`) ②를 탄다. 그런데 ②의 253dpi 는 **스캔 잉크**의
 * 해상도이지 SVG 의 단위가 아니다 — SVG 사용자 단위는 CSS px(96dpi)다.
 *
 * 그래서 **SVG 는 SVG 자를 타게** 한다. 자(`printOverflow`)와 지면(`NativeProblem`)이
 * 둘 다 `parseFigureDimensions` 를 거치므로 한 곳만 고치면 둘이 같이 움직인다.
 */
import { describe, expect, it } from "vitest";

import {
  FIGURE_SVG_PRINT_MM,
  figureSvgViewBox,
} from "@/lib/figure/figureSvgFrame";
import {
  FALLBACK_MIN_MM,
  figurePrintWidthPx,
  figureSvgFromUrl,
  mmToCssPx,
  parseFigureDimensions,
} from "@/lib/figurePrintSize";
import { svgDataUrl } from "@/lib/svgDataUrl";

/** 작업실이 저장하는 꼴 — `fitFigureViewport` 가 `width`/`height` 와 **0 이 아닌 viewBox 원점**을 박는다. */
const studioSvg = (width: number, height = 249.324, originX = -10.4) =>
  `<svg viewBox="${originX} -10.4 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
  `<line x1="1" y1="1" x2="2" y2="2" stroke="#111"/>` +
  `<text x="5" y="5" font-size="16.8">5</text></svg>`;

/** 원장님 문항과 같은 도형 — 실제 엔진이 낸 viewBox 폭. */
const TRIANGLE = studioSvg(236.654);

describe("[그림 폭] 작업실이 다시 그린 SVG 는 **엔진 SVG 자**를 탄다", () => {
  it("이등변삼각형(viewBox 236.7)은 `mid` 등급 폭으로 그려진다 — 28mm 바닥이 아니다", () => {
    const [figure] = parseFigureDimensions(
      1,
      [232, 244], // 작업실이 싣는 것은 **스캔 크롭**의 픽셀 치수다
      [],
      [svgDataUrl(TRIANGLE)],
    );
    expect(figure).not.toBeNull();
    expect(figure!.sourceMm).toBe(FIGURE_SVG_PRINT_MM.mid);
    // 고쳐진 뒤의 값을 못 박는다 — 지금 상태(28mm)가 아니다.
    expect(figure!.sourceMm).not.toBe(FALLBACK_MIN_MM);
    expect(figurePrintWidthPx(figure!)).toBeCloseTo(mmToCssPx(64), 6);
  });

  it("비율은 SVG 자신의 viewBox 에서 온다 — 스캔 크롭 픽셀이 아니다", () => {
    const [figure] = parseFigureDimensions(
      1,
      [232, 244],
      [],
      [svgDataUrl(studioSvg(300, 150))],
    );
    expect(figure).toMatchObject({ width: 300, height: 150 });
  });

  it("**치수를 몰라도** SVG 는 제 치수를 들고 있다 — `figureDims` 가 비어도 잰다", () => {
    const [figure] = parseFigureDimensions(1, [], [], [svgDataUrl(TRIANGLE)]);
    expect(figure?.sourceMm).toBe(FIGURE_SVG_PRINT_MM.mid);
  });

  it("등급마다 SVG 자의 mm 를 그대로 쓴다", () => {
    const at = (width: number) =>
      parseFigureDimensions(1, [], [], [svgDataUrl(studioSvg(width, 100))])[0]
        ?.sourceMm;
    expect(at(140)).toBe(FIGURE_SVG_PRINT_MM.compact);
    expect(at(240)).toBe(FIGURE_SVG_PRINT_MM.mid);
    expect(at(400)).toBe(FIGURE_SVG_PRINT_MM.wide);
  });

  it("🔴 **음성 대조군** — 래스터는 예전 그대로다(스캔 자·회귀 0)", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const [figure] = parseFigureDimensions(1, [232, 244], [], [png]);
    // 232px / 253dpi = 23.3mm → 바닥 28mm. 고치기 전과 한 글자도 다르지 않다.
    expect(figure?.sourceMm).toBe(FALLBACK_MIN_MM);
    const [scan] = parseFigureDimensions(
      1,
      [394, 300],
      [],
      ["/figures/1/a.png"],
    );
    expect(scan?.sourceMm).toBeCloseTo(39.55, 1);
  });

  it("🔴 **음성 대조군** — 아는 mm 가 있는 파일 SVG 는 안 건드린다", () => {
    const [figure] = parseFigureDimensions(
      1,
      [400, 300],
      [22.5],
      ["/figures-svg/rpm/x/0.svg"],
    );
    expect(figure).toEqual({ width: 400, height: 300, sourceMm: 22.5 });
  });

  it("SVG 가 아닌 data URL·망가진 SVG 는 «모른다»로 미끄러진다", () => {
    expect(figureSvgFromUrl("data:image/png;base64,AAAA")).toBeNull();
    expect(figureSvgFromUrl(undefined)).toBeNull();
    expect(figureSvgFromUrl("/figures-svg/rpm/x/0.svg")).toBeNull();
    // viewBox 가 없으면 등급을 못 정한다 — 예전 길로 간다.
    const noBox = svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`,
    );
    const [figure] = parseFigureDimensions(1, [232, 244], [], [noBox]);
    expect(figure?.sourceMm).toBe(FALLBACK_MIN_MM);
  });
});

describe("[그림 폭] viewBox 원점이 0 이 아니어도 읽는다", () => {
  /**
   * 🔴 `fitFigureViewport`(작업실 저장 직전)는 라벨까지 감싸느라 **음수 원점**을 쓴다.
   *    옛 정규식은 `viewBox="0 0 …"` 만 읽어 그 그림들의 등급이 **통째로 `wide`** 였다 —
   *    「못 읽었다」가 「제일 큰 등급」으로 조용히 미끄러졌다.
   */
  it("음수 원점 viewBox 의 폭·높이를 읽는다", () => {
    expect(figureSvgViewBox(studioSvg(236.654, 249.324))).toEqual({
      width: 236.654,
      height: 249.324,
    });
  });

  it("쉼표로 끊은 viewBox 도 읽는다", () => {
    expect(
      figureSvgViewBox(`<svg viewBox="0,0,160,120"><rect/></svg>`),
    ).toEqual({ width: 160, height: 120 });
  });
});
