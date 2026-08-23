/**
 * FigureSpec v2 «regions·arcs» 축 — 닫힌 경계 채색과 호 스트로크.
 *
 * 엔진을 모킹하지 않는다(없는 축은 변이시킬 수 없다) — render_spec.py 를
 * 제품 실경로(renderFigureSpec)로 띄워 잰다. elementaryFigure.test.ts 패턴.
 *
 * 지키는 불변식:
 *  1) 경계 조각이 이름으로 이어지지 않으면 던진다 (조용히 채우기 금지)
 *  2) fill 은 연한 불투명 색만 (상대 휘도 >= 0.78) — 본문 잉크를 가리면 안 된다
 *  3) 호 끝점은 원 위에 있어야 한다 (on_circle 정밀도) — 어긋나면 던진다
 *  4) dir(ccw/cw)이 실제 SVG sweep 플래그를 가른다
 *  5) draw:false 원은 잉크·경계 어디에도 안 남는다
 *  6) 채색 레이어는 모든 잉크보다 아래(첫 <g>)이고, 영역이 없으면 그룹도 없다
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

/** 부채꼴 고리(RPM 0607 모양) — regions·arcs·숨은 원이 모두 든 기준 스펙. */
function annulusSpec() {
  return {
    version: 2,
    points: {
      O: [0, 200],
      Ain: { type: "on_circle", circle: "cin", angle: 45 },
      Aout: { type: "on_circle", circle: "cout", angle: 45 },
      Bin: { type: "on_circle", circle: "cin", angle: 0 },
      Bout: { type: "on_circle", circle: "cout", angle: 0 },
    },
    circles: {
      cin: { center: "O", radius: 80, draw: false },
      cout: { center: "O", radius: 160, draw: false },
    },
    segments: { sA: ["O", "Aout"], sB: ["O", "Bout"] },
    arcs: {
      arcIn: { circle: "cin", from: "Bin", to: "Ain", dir: "ccw" },
      arcOut: { circle: "cout", from: "Bout", to: "Aout", dir: "ccw" },
    },
    regions: {
      ring: {
        boundary: [
          { seg: ["Ain", "Aout"] },
          { arc: { circle: "cout", from: "Aout", to: "Bout", dir: "cw" } },
          { seg: ["Bout", "Bin"] },
          { arc: { circle: "cin", from: "Bin", to: "Ain", dir: "ccw" } },
        ],
        fill: "#f5d9b8",
      },
    },
  } as Record<string, unknown>;
}

describe.skipIf(!hasEngine)("[도형 v2] regions — 닫힌 경계 채색", () => {
  it("부채꼴 고리를 채색해 그린다 — fill 경로 + 호 스트로크", async () => {
    const r = await renderFigureSpec(annulusSpec());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toContain('fill="#f5d9b8"');
    // 영역 경로는 선분(L)과 원호(A)가 한 경로에 이어진 닫힌(Z) 모양이다
    expect(r.svg).toMatch(
      /<path d="M [^"]*A [^"]*Z" fill="#f5d9b8" stroke="none"/,
    );
    // 호 스트로크 둘(안쪽·바깥쪽)
    const strokes = r.svg.match(/<path d="M [^"]*A [^"]*" fill="none"/g) ?? [];
    expect(strokes.length).toBeGreaterThanOrEqual(2);
  });

  it("채색 레이어는 모든 잉크보다 아래에 깔린다 (첫 <g>)", async () => {
    const r = await renderFigureSpec(annulusSpec());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const fillAt = r.svg.indexOf('fill="#f5d9b8"');
    const inkAt = r.svg.indexOf("<line");
    expect(fillAt).toBeGreaterThan(-1);
    expect(inkAt).toBeGreaterThan(-1);
    expect(fillAt).toBeLessThan(inkAt);
  });

  it("영역이 없으면 채색 그룹도 없다 — 기존 지면 SVG 는 그대로 (그룹 3개)", async () => {
    const r = await renderFigureSpec({
      version: 2,
      points: { A: [0, 0], B: [100, 0] },
      segments: { AB: ["A", "B"] },
      labels: { A: "A", B: "B" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg.match(/<g>/g)?.length).toBe(3);
  });

  it("조각이 이어지지 않으면 던진다 — 조용히 채우지 않는다", async () => {
    const spec = annulusSpec();
    // 마지막 호 조각을 빼서 사슬을 끊는다: Bin 에서 끝나고 Ain 으로 안 돌아간다
    (
      spec.regions as Record<string, { boundary: unknown[] }>
    ).ring.boundary.pop();
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("connect");
  });

  it("어두운 채색은 거부한다 — 휘도 0.78 미만", async () => {
    const spec = annulusSpec();
    (spec.regions as Record<string, { fill: string }>).ring.fill = "#808080";
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("light color");
  });

  it("이름 색(navy)·참조(url)는 채색으로 못 쓴다", async () => {
    for (const fill of ["navy", "url(#x)"]) {
      const spec = annulusSpec();
      (spec.regions as Record<string, { fill: string }>).ring.fill = fill;
      const r = await renderFigureSpec(spec);
      expect(r.ok, `fill=${fill} 이 통과하면 안 된다`).toBe(false);
    }
  });

  it("경계 조각이 두 개 미만이면 던진다", async () => {
    const spec = annulusSpec();
    (spec.regions as Record<string, { boundary: unknown[] }>).ring.boundary = [
      { seg: ["Ain", "Aout"] },
    ];
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(false);
  });

  it("경계 조각의 모르는 키는 던진다 (seg·arc 하나만)", async () => {
    const spec = annulusSpec();
    (spec.regions as Record<string, { boundary: unknown[] }>).ring.boundary[0] =
      {
        polyline: ["Ain", "Aout"],
      };
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(false);
  });
});

describe.skipIf(!hasEngine)("[도형 v2] arcs — 호 스트로크", () => {
  it("호 끝점이 원 위에 없으면 던진다 — 손 좌표 반올림 금지", async () => {
    const spec = annulusSpec();
    // 원(반지름 80) 위가 아닌 점 (57, 57) ≈ 45° 반올림 좌표
    (spec.points as Record<string, unknown>).Bad = [57, 143];
    (spec.arcs as Record<string, unknown>).arcBad = {
      circle: "cin",
      from: "Bin",
      to: "Bad",
      dir: "ccw",
    };
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("on circle");
  });

  it("dir 이 sweep 플래그를 가른다 — ccw=0, cw=1", async () => {
    const base = {
      version: 2,
      points: {
        O: [0, 0],
        P: { type: "on_circle", circle: "c", angle: 0 },
        Q: { type: "on_circle", circle: "c", angle: 90 },
      },
      circles: { c: { center: "O", radius: 60, draw: false } },
      segments: { OP: ["O", "P"], OQ: ["O", "Q"] },
    };
    const ccw = await renderFigureSpec({
      ...base,
      arcs: { a: { circle: "c", from: "P", to: "Q", dir: "ccw" } },
    });
    const cw = await renderFigureSpec({
      ...base,
      arcs: { a: { circle: "c", from: "P", to: "Q", dir: "cw" } },
    });
    expect(ccw.ok && cw.ok).toBe(true);
    if (!ccw.ok || !cw.ok) return;
    // A rx ry rot large sweep x y — sweep 플래그(5번째 인자)만 갈라야 한다
    const flag = (svg: string) =>
      svg.match(/A 60 60 0 (\d) (\d) /)?.slice(1, 3) ?? [];
    expect(flag(ccw.svg)).toEqual(["0", "0"]); // 90° 짧은 호 · ccw
    expect(flag(cw.svg)).toEqual(["1", "1"]); // 나머지 270° · cw
    expect(ccw.svg).not.toBe(cw.svg);
  });

  it("모르는 dir·모르는 키는 던진다", async () => {
    const spec = annulusSpec();
    (spec.arcs as Record<string, Record<string, unknown>>).arcIn.dir =
      "clockwise";
    expect((await renderFigureSpec(spec)).ok).toBe(false);
    const spec2 = annulusSpec();
    (spec2.arcs as Record<string, Record<string, unknown>>).arcIn.sweep = 1;
    expect((await renderFigureSpec(spec2)).ok).toBe(false);
  });

  it("접함 — 끈의 선분 끝과 호 끝이 같은 좌표에서 만난다 (§4-12)", async () => {
    // 0626 축소판: 원 두 개 + 위쪽 공통접선 + 각 원의 호
    const r = await renderFigureSpec({
      version: 2,
      points: {
        O1: [0, 0],
        O2: [120, 0],
        T1: { type: "on_circle", circle: "c1", angle: 90 },
        T2: { type: "on_circle", circle: "c2", angle: 90 },
        E1: { type: "on_circle", circle: "c1", angle: 180 },
        E2: { type: "on_circle", circle: "c2", angle: 0 },
      },
      circles: {
        c1: { center: "O1", radius: 60 },
        c2: { center: "O2", radius: 60 },
      },
      segments: { belt: ["T1", "T2"] },
      arcs: {
        a1: { circle: "c1", from: "E1", to: "T1", dir: "cw" },
        a2: { circle: "c2", from: "T2", to: "E2", dir: "cw" },
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.svg.match(
      /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/,
    );
    expect(line).toBeTruthy();
    // 호 경로의 A 명령 끝점(T1)·M 시작점(T2)이 선분의 두 끝과 **바이트까지** 같다
    expect(r.svg).toContain(`A 60 60 0 0 1 ${line![1]} ${line![2]}`);
    expect(r.svg).toContain(`<path d="M ${line![3]} ${line![4]} A 60 60 0 0 1`);
  });

  it("치수 개수 — 스펙이 준 치수만큼 점선 곡선과 라벨이 나온다", async () => {
    const spec = annulusSpec();
    (spec as Record<string, unknown>).dimensions = {
      dimIn: { points: ["O", "Ain"], label: "4 cm" },
      dimOut: { points: ["Ain", "Aout"], label: "4 cm" },
    };
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 치수 점선(6 4)은 정확히 두 벌 — 더 그리지도, 조용히 빠뜨리지도 않는다
    expect(r.svg.match(/stroke-dasharray="6 4"/g)?.length).toBe(2);
    expect(r.svg.match(/>4 cm<\/text>/g)?.length).toBe(2);
  });

  it("dash 를 주면 stroke-dasharray 로 긋는다", async () => {
    const spec = annulusSpec();
    (spec.arcs as Record<string, Record<string, unknown>>).arcIn.dash = "5 4";
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toMatch(
      /<path d="M [^"]*A 80[^"]*" fill="none"[^>]*stroke-dasharray="5 4"/,
    );
  });
});

describe.skipIf(!hasEngine)("[도형 v2] circles.draw=false — 작도용 원", () => {
  it("숨은 원은 잉크로 안 나가고 캔버스도 안 부풀린다", async () => {
    const r = await renderFigureSpec(annulusSpec());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).not.toContain("<circle");
    // 원 전체(반지름 160 → 지름 320+)가 아니라 부채꼴 사분면만 담는다
    const vb = r.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(vb).toBeTruthy();
    expect(Number(vb![1])).toBeLessThan(260);
    expect(Number(vb![2])).toBeLessThan(260);
  });

  it("draw 는 불리언만 받는다", async () => {
    const spec = annulusSpec();
    (spec.circles as Record<string, Record<string, unknown>>).cin.draw = "no";
    expect((await renderFigureSpec(spec)).ok).toBe(false);
  });

  it("draw 를 켠 원은 종전대로 온원으로 그린다 (끈 유형의 원기둥)", async () => {
    const r = await renderFigureSpec({
      version: 2,
      points: {
        O1: [0, 0],
        O2: [120, 0],
        T1: { type: "on_circle", circle: "c1", angle: 90 },
        T2: { type: "on_circle", circle: "c2", angle: 90 },
      },
      circles: {
        c1: { center: "O1", radius: 60 },
        c2: { center: "O2", radius: 60 },
      },
      segments: { belt: ["T1", "T2"] },
      arcs: { a1: { circle: "c1", from: "T1", to: "T1b", dir: "ccw" } },
      // T1b 미정의 → 이 스펙은 실패해야 정상. 아래에서 바로잡아 다시 확인.
    }).then(async (broken) => {
      expect(broken.ok).toBe(false);
      return renderFigureSpec({
        version: 2,
        points: {
          O1: [0, 0],
          O2: [120, 0],
          T1: { type: "on_circle", circle: "c1", angle: 90 },
          T2: { type: "on_circle", circle: "c2", angle: 90 },
        },
        circles: {
          c1: { center: "O1", radius: 60 },
          c2: { center: "O2", radius: 60 },
        },
        segments: { belt: ["T1", "T2"] },
      });
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg.match(/<circle/g)?.length).toBe(2);
  });
});
