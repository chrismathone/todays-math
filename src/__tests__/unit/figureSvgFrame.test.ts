import { describe, expect, it } from "vitest";

import {
  FIGURE_SVG_COMPACT_VIEWBOX,
  FIGURE_SVG_MID_VIEWBOX,
  FIGURE_SVG_PRINT_MM,
  figureSvgFrameClass,
  figureSvgSize,
  figureSvgViewBox,
} from "@/lib/figure/figureSvgFrame";

const svg = (w: number, h = 80) =>
  `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect/></svg>`;

describe("[figureSvgFrame] 초등 그림은 발문에 맞춰 줄인다", () => {
  it("수 카드·연산 상자는 140", () => {
    expect(figureSvgSize(svg(136))).toBe("compact");
    expect(figureSvgSize(svg(140))).toBe("compact");
    expect(figureSvgSize(svg(144))).toBe("compact");
    // 🔴 폭은 **화면·인쇄가 같은 mm** 다 — 예전에는 화면만 px(140)로 따로 적었다.
    expect(figureSvgFrameClass(svg(140))).toContain(
      `max-w-[${FIGURE_SVG_PRINT_MM.compact}mm]`,
    );
  });

  it("상자 연쇄·각·연산 흐름은 240 — 360 으로 늘리지 않는다", () => {
    expect(figureSvgSize(svg(229))).toBe("mid");
    expect(figureSvgSize(svg(242))).toBe("mid");
    expect(figureSvgSize(svg(304))).toBe("mid");
    expect(figureSvgFrameClass(svg(242))).toContain(
      `max-w-[${FIGURE_SVG_PRINT_MM.mid}mm]`,
    );
    expect(figureSvgFrameClass(svg(242))).not.toContain(
      `max-w-[${FIGURE_SVG_PRINT_MM.wide}mm]`,
    );
  });

  it("문턱을 넘기면 다음 칸으로 간다", () => {
    expect(figureSvgSize(svg(FIGURE_SVG_COMPACT_VIEWBOX))).toBe("compact");
    expect(figureSvgSize(svg(FIGURE_SVG_COMPACT_VIEWBOX + 1))).toBe("mid");
    expect(figureSvgSize(svg(FIGURE_SVG_MID_VIEWBOX))).toBe("mid");
    expect(figureSvgSize(svg(FIGURE_SVG_MID_VIEWBOX + 1))).toBe("wide");
  });
});

/* ── 그래프 짝은 **폭이 아니라 kind 로** 가른다 (2026-08-23, elem-figures) ─────
 *
 * 🔴 **왜 폭으로는 안 되나 — 실측이 겹친다.**
 *    짝(chartPair) viewBox 273.21~359.61 · 단독 `cuboid` 128.17~324.97.
 *    「좁은 짝」과 「넓은 단독」이 같은 구간에 있어 **어느 문턱을 놓아도 한쪽이 틀린다.**
 *    문턱을 여러 번 고치게 되면 문턱이 아니라 **축이 틀린 것이다**(09 §4-18).
 *
 * 종전에는 `pair` 를 「viewBox > 380」으로 잡았는데 짝이 380 을 **한 번도 안 넘어서**
 * 그 등급이 구조적으로 안 걸렸다. 파이썬은 `PAIR_FRAME_PX`(364)로 「눈금 글자가 본문
 * 이상인가」를 판정해 통과시키는데 지면에서는 `mid`(240px)로 그려져 **11.45px** 이
 * 됐다(본문 12.5px 미만, 짝 53장 중 17장 32%).
 *
 * → 그리는 쪽(파이썬)이 `<desc>chartPair</desc>` 를 심고 **판정하는 쪽이 그것을 먼저
 *   본다.** 판정과 그리기가 같은 값을 본다 — 폭 어림으로 되짚지 않는다.
 */
const pairSvg = (w: number) =>
  `<svg viewBox="0 0 ${w} 200" xmlns="http://www.w3.org/2000/svg">` +
  `<desc>chartPair</desc><rect/></svg>`;

describe("[figureSvgFrame] 그래프 짝은 폭이 아니라 kind 로 가른다", () => {
  it("**일부러 좁은 짝**도 pair 다 — 폭 문턱 아래여도", () => {
    // 실측 최소(273.21)보다 더 좁게 잡는다. 폭으로 정하면 mid 가 되는 자리다.
    expect(figureSvgSize(pairSvg(260))).toBe("pair");
    expect(figureSvgSize(pairSvg(273))).toBe("pair");
    expect(figureSvgSize(pairSvg(320))).toBe("pair");
    expect(figureSvgSize(pairSvg(360))).toBe("pair");
    expect(figureSvgFrameClass(pairSvg(273))).toContain(
      `max-w-[${FIGURE_SVG_PRINT_MM.pair}mm]`,
    );
  });

  it("**음성 대조군** — 같은 폭이어도 짝이 아니면 pair 가 아니다", () => {
    // 이것이 없으면 「전부 pair」로 만들어도 위 시험이 초록이다.
    expect(figureSvgSize(svg(273))).toBe("mid");
    expect(figureSvgSize(svg(320))).toBe("mid");
    expect(figureSvgSize(svg(360))).toBe("wide");
    // 다른 kind 를 적은 desc 도 pair 가 아니다.
    const barDesc = `<svg viewBox="0 0 300 200"><desc>barChart</desc><rect/></svg>`;
    expect(figureSvgSize(barDesc)).toBe("mid");
  });

  it("넓은 단독 도형은 짝과 **같은 폭**이어도 갈린다 — 실측 겹침 구간", () => {
    // cuboid 최대 324.97 · 짝 최소 273.21 → 이 구간이 겹친다.
    // 단독이 어느 등급이 되든(325 는 mid 문턱 320 을 넘어 wide) **pair 는 아니어야** 한다.
    expect(figureSvgSize(svg(325))).not.toBe("pair");
    expect(figureSvgSize(svg(300))).not.toBe("pair");
    expect(figureSvgSize(pairSvg(325))).toBe("pair");
    expect(figureSvgSize(pairSvg(300))).toBe("pair");
  });
});

/* ── 화면·인쇄·HWPX 가 **한 수**를 본다 (2026-09-20, hwpx-figure-scale) ──────
 *
 * 🔴 예전에는 화면을 px, 인쇄를 mm 로 적었다. compact·mid·pair 는 두 수가 1% 안이라
 *    아무도 몰랐는데 `wide` 만 화면 360px · 종이 70mm(264.57px)로 **36% 갈렸다.**
 *    HWPX 내보내기는 미리보기 DOM 을 **화면 매체 그대로** 복제해 재므로
 *    (`hwpxLayout.collectHwpxLayout`) HWPX 가 화면 편에, PDF·실제 인쇄가 반대편에
 *    섰다. 단위를 하나로 적으면 갈라질 자리가 없다.
 */
describe("[figureSvgFrame] 화면·자·지면이 **같은 mm** 를 본다", () => {
  /**
   * 🔴 넘침 판정(`printOverflow.estimateFigureSvgPx`)이 `FIGURE_SVG_PRINT_MM` 을
   * 읽고, 실제로 그려지는 폭은 `FRAME` 의 Tailwind 클래스가 정한다. Tailwind 는
   * 클래스 문자열을 글자 그대로 훑으므로 그쪽을 표에서 만들 수 없다 — 그래서
   * **여기서 대조**한다. 어긋나면 자가 재는 지면과 실제 지면이 갈라지는데,
   * 그건 아무도 모르게 어긋난다(2026-08-23 `PAIR_FRAME_PX` 가 같은 자리였다).
   */
  it("등급마다 `max-w-[Xmm]` 이 표와 같은 수다 — **화면도 같은 수다**", () => {
    const sample: Record<keyof typeof FIGURE_SVG_PRINT_MM, string> = {
      compact: svg(140),
      mid: svg(240),
      wide: svg(400),
      pair: `<svg viewBox="0 0 300 80"><desc>chartPair</desc><rect/></svg>`,
    };
    for (const [size, mm] of Object.entries(FIGURE_SVG_PRINT_MM)) {
      const cls = figureSvgFrameClass(
        sample[size as keyof typeof FIGURE_SVG_PRINT_MM],
      );
      // 표본이 정말 그 등급인지부터 본다 — 아니면 이 대조가 통째로 헛돈다.
      expect(
        figureSvgSize(sample[size as keyof typeof FIGURE_SVG_PRINT_MM]),
        `표본이 ${size} 가 아니다`,
      ).toBe(size);
      expect(cls, `${size} 의 폭`).toContain(`max-w-[${mm}mm]`);
      // 🔴 화면 전용 px 폭이 남아 있으면 매체마다 갈린다 — HWPX 는 화면 쪽에 선다.
      expect(cls, `${size} 에 화면 전용 px 폭이 남았다`).not.toMatch(
        /max-w-\[\d+(\.\d+)?px\]/,
      );
    }
  });

  it("**viewBox 를 세로까지 읽는다** — 높이 자가 이걸 쓴다", () => {
    expect(figureSvgViewBox(svg(160, 120))).toEqual({
      width: 160,
      height: 120,
    });
    // 못 읽는 것은 «못 읽는다»고 말해야 한다 — 0 을 돌려주면 자가 조용해진다.
    expect(figureSvgViewBox("<svg><rect/></svg>")).toBeNull();
    expect(
      figureSvgViewBox(`<svg viewBox="0 0 160 0"><rect/></svg>`),
    ).toBeNull();
  });
});
