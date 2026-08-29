/**
 * **지면의 굵기 비가 정본(RPM) 비율 안에 있는가** — 원장님 확정 2026-08-29 (D-112).
 *
 * 원장님이 「**rpm과 같은 비율이면 전부 통과**」라고 하셨다. 그러면 승인이
 * **잴 수 있는 조건**이 된다 — 그 조건을 코드가 지킨다.
 *
 * ## 정본 실측 (근거: docs/planning/tracks/reports/rpm-engine-gaps.md ①·⑤·⑥)
 *
 *     각 호 ÷ 도형 선        0.375        (0.30pt / 0.80pt)
 *     치수 파선 ÷ 도형 선    0.375~0.625  (0.3~0.5pt / 0.8pt)
 *
 * ## 🔴 상수만 읽으면 「배선이 한쪽만」을 못 본다
 *
 * 이 저장소가 여러 번 겪은 자리다 — 값은 맞는데 그리는 쪽이 그 값을 안 쓰면
 * 지면은 안 바뀐다. 그래서 **실제로 한 장 그려서** 나온 `stroke-width` 도 잰다.
 * 엔진이 없는 컴퓨터에서는 그 부분만 건너뛴다(상수 검사는 어디서나 돈다).
 *
 * ## ⚠️ vendor 는 사본이다
 *
 * `vendor/figure-engine` 은 `F:\시험지변환기` 의 사본이라 **상류를 갱신하면
 * 되돌아온다.** 실제로 `DIM_SW` 가 그렇게 되돌아온 적이 있다(⑥ 머리말). 그때
 * 이 시험이 빨개진다 — 그게 이 시험의 존재 이유다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

/** 정본 실측 — 교재는 보기만 하므로 **이 수치가 우리 쪽 기록이다**(D-112). */
const RPM_ARC_OVER_SOLID = 0.375;
const RPM_DIM_BAND = [0.375, 0.625] as const;

function pyConst(file: string, name: string): number {
  const src = readFileSync(file, "utf8");
  // `SOLID_SW = 1.4` 와 `    segment_width: float = 1.9` 둘 다 읽는다 —
  // 뒤엣것은 dataclass 필드라 **들여쓰기**가 있고 타입 표기가 낀다.
  // ⚠️ **정규식을 템플릿 리터럴로 짓지 않는다.** 템플릿 리터럴에서 `\s` 는
  //    유효한 이스케이프가 아니라 그냥 `s` 가 된다 — 패턴이 `^s*SOLID_SWs*…` 가 되어
  //    **아무것도 안 걸리고**, 그 실패가 「상수가 없다」로 보인다. 이 시험을 쓰다
  //    실제로 그렇게 났다(CLAUDE.md 의 그 함정).
  const pattern =
    "^\\s*" + name + "\\s*(?::[^=\\n]*)?=\\s*([0-9]+(?:\\.[0-9]+)?)";
  const m = new RegExp(pattern, "m").exec(src);
  if (!m) throw new Error(`${name} 을 ${path.basename(file)} 에서 못 찾았다`);
  return Number(m[1]);
}

const SVG = path.join(
  process.cwd(),
  "vendor",
  "figure-engine",
  "core",
  "figure_svg.py",
);
const SCENE = path.join(
  process.cwd(),
  "vendor",
  "figure-engine",
  "core",
  "figure_scene.py",
);
const ELEM = path.join(process.cwd(), "scripts", "figure", "elem_advanced.py");

describe("[D-112] 지면 굵기 비 — 정본(RPM) 비율", () => {
  it("**상수를 못 읽으면 멈춘다** — 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다", () => {
    for (const [f, n] of [
      [ELEM, "SOLID_SW"],
      [SVG, "DIM_SW"],
      [SVG, "ANGLE_SW"],
      [SCENE, "segment_width"],
      [SCENE, "mark_width"],
      [SCENE, "dimension_width"],
    ] as const) {
      expect(pyConst(f, n), `${n}`).toBeGreaterThan(0);
    }
  });

  it("🔴 **각 호 ÷ 도형 선 = 정본 0.375** (옛 경로 · figure_svg)", () => {
    const solid = pyConst(ELEM, "SOLID_SW");
    const arc = pyConst(SVG, "ANGLE_SW");
    expect(arc / solid, `각 호 ${arc} ÷ 도형 선 ${solid}`).toBeCloseTo(
      RPM_ARC_OVER_SOLID,
      2,
    );
  });

  it("🔴 **각 호 ÷ 도형 선 = 정본 0.375** (v2 장면 엔진 · figure_scene)", () => {
    // 지면의 대부분을 이 엔진이 그린다 — 여기가 어긋나면 옛 경로를 고쳐도 소용없다.
    const solid = pyConst(SCENE, "segment_width");
    const mark = pyConst(SCENE, "mark_width");
    expect(mark / solid, `mark ${mark} ÷ segment ${solid}`).toBeCloseTo(
      RPM_ARC_OVER_SOLID,
      2,
    );
  });

  it("치수 파선 ÷ 도형 선이 정본 띠(0.375~0.625) 안에 있다 — 두 엔진 모두", () => {
    const oldPath = pyConst(SVG, "DIM_SW") / pyConst(ELEM, "SOLID_SW");
    const v2 =
      pyConst(SCENE, "dimension_width") / pyConst(SCENE, "segment_width");
    for (const [name, r] of [
      ["figure_svg", oldPath],
      ["figure_scene", v2],
    ] as const) {
      expect(r, name).toBeGreaterThanOrEqual(RPM_DIM_BAND[0]);
      expect(r, name).toBeLessThanOrEqual(RPM_DIM_BAND[1]);
    }
  });

  /**
   * 🔴 **회전체는 등급 경계에 «딱 붙어» 있다** — 원장님 2026-08-29
   * 「회전체도 등급 안 넘게 최대로 키워봐」.
   *
   * `figureSvgFrame` 은 viewBox 폭 **≤160** 이면 compact(140px), 넘으면 mid(240px)다.
   * 넘는 순간 종이에서 그림이 1.7배가 되고 **라벨이 본문 12.5px 를 넘는다** —
   * 키우려다 고치려던 결함을 부른다. 그래서 160 이 상한이고, 지금은 **정확히 160.0**
   * 이라 한 칸도 남지 않았다.
   *
   * ⚠️ 이 시험이 없으면 `ROUND_UNITS` 를 조금만 올려도 **조용히 등급이 뛴다** —
   *    에러가 안 나고 지면만 달라진다.
   */
  it("🔴 **회전체 viewBox 폭이 등급 경계(160)를 안 넘는다**", async () => {
    if (!hasEngine) return;
    // 2r >= h 이면 가로가 `ROUND_UNITS` 를 그대로 쓴다 — **가장 넓은 경우**다.
    const r = await renderFigureSpec({
      version: "elem-1",
      kind: "cylinder",
      r: 5,
      h: 6,
    });
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
    if (!r.ok) return;
    const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(r.svg);
    expect(m, "viewBox 를 못 읽었다 — 지문이 낡았다").not.toBeNull();
    const w = Number(m![1]);
    expect(w, `원기둥 viewBox 폭 ${w}`).toBeLessThanOrEqual(160);
    // 그리고 **경계에 붙어 있어야** 한다 — 멀어지면 여백이 다시 놀고 있다는 뜻이다.
    expect(
      w,
      `원기둥이 경계에서 멀다(${w}) — 여백이 놀고 있는지 보라`,
    ).toBeGreaterThan(150);
  });

  /**
   * 🔴 **구가 원기둥과 같은 크기로 나가는가** — 원장님 2026-08-29
   * 「회전체도 등급 안 넘게 최대로 키워봐」.
   *
   * 지면 폭은 등급이 정한다(compact 140px). 그러니 종이에서의 크기는
   * **«도형 ÷ 틀»** 이 전부다. 옛 `_sphere` 는 `pr` 이 날 리터럴 36 · 틀 140 이라
   * 51.4% 였고 원기둥(70.4%)보다 **27% 작게** 나갔다 — `ROUND_UNITS` 를 안 쓰니
   * 크기를 올려도 **혼자 안 따라왔다.** 상수를 안 쓰는 리터럴은 이렇게 조용히
   * 뒤처진다(§4-20-d 의 `0.32` 와 같은 자리, 이번엔 크기 축이다).
   *
   * ⚠️ 참을 상수에서 가져오지 않는다. **두 그림을 실제로 그려** 각자의
   *    «도형 ÷ 틀» 을 재서 견준다 — 한쪽만 고치면 빨개진다.
   */
  it("🔴 **구와 원기둥이 종이에서 같은 크기다** — 도형 ÷ 틀 이 같다", async () => {
    if (!hasEngine) return;
    const vbw = (svg: string) => {
      const m = /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(svg);
      expect(m, "viewBox 를 못 읽었다 — 지문이 낡았다").not.toBeNull();
      return Number(m![1]);
    };
    const cyl = await renderFigureSpec({
      version: "elem-1",
      kind: "cylinder",
      r: 4,
      h: 4,
    });
    const sph = await renderFigureSpec({
      version: "elem-1",
      kind: "sphere",
      r: 4,
    });
    expect(cyl.ok, cyl.ok ? "" : cyl.error).toBe(true);
    expect(sph.ok, sph.ok ? "" : sph.error).toBe(true);
    if (!cyl.ok || !sph.ok) return;

    // 원기둥의 도형 폭은 **그려진 좌표**에서 잰다 — 여백 상수를 다시 읽지 않는다.
    const xs = [...cyl.svg.matchAll(/points="([^"]*)"/g)].flatMap((m) =>
      [...m[1]!.matchAll(/(-?[0-9.]+),(-?[0-9.]+)/g)].map((q) => Number(q[1])),
    );
    expect(
      xs.length,
      "원기둥 좌표를 하나도 못 읽었다 — 지문이 낡았다",
    ).toBeGreaterThan(10);
    const cylRatio = (Math.max(...xs) - Math.min(...xs)) / vbw(cyl.svg);

    const pr = /<circle cx="[0-9.]+" cy="[0-9.]+" r="([0-9.]+)"/.exec(sph.svg);
    expect(pr, "구의 원을 못 읽었다 — 지문이 낡았다").not.toBeNull();
    const sphRatio = (2 * Number(pr![1])) / vbw(sph.svg);

    expect(
      sphRatio,
      `구 ${sphRatio.toFixed(3)} vs 원기둥 ${cylRatio.toFixed(3)} — 종이에서 크기가 갈린다`,
    ).toBeCloseTo(cylRatio, 2);
    // 구도 등급 안이어야 한다 — 넘으면 종이에서 1.7배가 되고 라벨 없는 원만 커진다.
    expect(vbw(sph.svg), "구 viewBox 폭").toBeLessThanOrEqual(160);
  });

  it("🔴 **상수가 아니라 지면을 잰다** — 실제로 그린 SVG 의 굵기 비", async () => {
    if (!hasEngine) return;
    // 직각 표시(마크)와 도형 선이 같이 나오는 최소 그림.
    const spec = {
      version: 2,
      points: { A: [0, 0], B: [120, 0], C: [0, 90] },
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
      angles: { a_A: { vertex: "A", points: ["B", "C"], right: true } },
      labels: { A: "A", B: "B", C: "C" },
    };
    const r = await renderFigureSpec(spec);
    expect(r.ok, r.ok ? "" : r.error).toBe(true);
    if (!r.ok) return;
    const widths = [...r.svg.matchAll(/stroke-width="([0-9.]+)"/g)].map((m) =>
      Number(m[1]),
    );
    expect(
      widths.length,
      "굵기를 하나도 못 읽었다 — 지문이 낡았다",
    ).toBeGreaterThan(1);
    const solid = Math.max(...widths);
    const mark = Math.min(...widths);
    expect(mark / solid, `지면 ${mark} ÷ ${solid}`).toBeCloseTo(
      RPM_ARC_OVER_SOLID,
      2,
    );
  });
});
