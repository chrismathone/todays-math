import { describe, expect, it } from "vitest";
import {
  bentCurveReason,
  flipFigurePathData,
  flipFigurePointList,
  mirrorAcross,
  sampleFigurePath,
} from "@/components/unified/figure-editor/figureFlip";

/**
 * 원장님 2026-09-19 «치수선 고치기가 제대로 안 되네.» — «선분 BC의 치수선을 선분 BC 아래로» 를 AI 가 경로의 점을
 * 하나씩 옮겨(`point`) 흉내 내다 호가 둘로 꺾였다. 곡선을 **두 끝을 잇는 현에 대해 거울 대칭**하는 순수 함수:
 * 끝점은 그대로, 사이 점(조절점·호의 방향·꺾은선 꼭짓점)만 반대편으로.
 */
describe("거울 대칭 — 현에 대해", () => {
  it("mirrors a point across the line through two points", () => {
    expect(mirrorAcross([140, 172], [40, 200], [240, 200])).toEqual([140, 228]);
    const [x, y] = mirrorAcross([0, 10], [0, 0], [10, 10]);
    expect(x).toBeCloseTo(10);
    expect(y).toBeCloseTo(0);
  });
});

describe("경로 뒤집기", () => {
  it("flips a dimension curve to the other side and keeps its ends", () => {
    const flipped = flipFigurePathData("M 40 200 Q 140 172 240 200");
    expect(flipped).toEqual({
      d: "M 40 200 Q 140 228 240 200",
      chord: [
        [40, 200],
        [240, 200],
      ],
    });
  });

  // 도형 엔진 v2 치수선은 값 자리에 틈을 낸 두 조각이다(figure_scene.py `_dimension_gapped_path`) —
  // `M 틈왼쪽 Q … B  M 틈오른쪽 Q … C`. 현은 경로의 처음·끝이 아니라 두 조각의 **먼 끝**(B·C)이다.
  it("uses the far ends of a gapped dimension path as the chord", () => {
    const flipped = flipFigurePathData(
      "M 124 186.358 Q 82 188.24 40 200 M 156 186.358 Q 198 188.24 240 200",
    );
    expect(flipped).toEqual({
      d: "M 124 213.642 Q 82 211.76 40 200 M 156 213.642 Q 198 211.76 240 200",
      chord: [
        [40, 200],
        [240, 200],
      ],
    });
  });

  it("flips an arc by reversing its sweep and mirroring its tilt", () => {
    expect(
      flipFigurePathData("M 40 200 A 120 120 0 0 1 240 200"),
    ).toMatchObject({ d: "M 40 200 A 120 120 0 0 0 240 200" });
    expect(flipFigurePathData("M 0 0 A 50 20 30 0 1 100 0")).toMatchObject({
      d: "M 0 0 A 50 20 -30 0 0 100 0",
    });
  });

  it("reads relative and horizontal/vertical commands", () => {
    expect(flipFigurePathData("m 40 200 q 100 -28 200 0")).toMatchObject({
      d: "M 40 200 Q 140 228 240 200",
    });
    expect(flipFigurePathData("M 0 100 V 80 H 100 V 100")).toMatchObject({
      d: "M 0 100 L 0 120 L 100 120 L 100 100",
    });
  });

  it("keeps the exact text of the end points", () => {
    const flipped = flipFigurePathData(
      "M 37.2081 206.2364 Q 157 190 277.2 206.2364",
    );
    expect("d" in flipped && flipped.d.startsWith("M 37.2081 206.2364 Q")).toBe(
      true,
    );
    expect("d" in flipped && flipped.d.endsWith(" 277.2 206.2364")).toBe(true);
  });

  it("returns to the start when flipped twice", () => {
    const d = "M 10 20 C 30 -10 70 -10 90 20";
    const once = flipFigurePathData(d);
    if (!("d" in once)) throw new Error(once.reason);
    expect(flipFigurePathData(once.d)).toMatchObject({ d });
  });

  it.each([
    ["M 0 0 Q 50 -30 100 0 Z", "닫힌 곡선은 뒤집지 않습니다"],
    ["M 0 0 Q 50 -30 0 0", "닫힌 곡선은 뒤집지 않습니다"],
    ["M 0 0 L 50 0 L 100 0", "곧은 선이라 뒤집을 것이 없습니다"],
    ["M 0 0 Q 50", "경로를 읽지 못했습니다"],
    ["", "경로를 읽지 못했습니다"],
  ])("explains why %s cannot be flipped", (d, reason) => {
    expect(flipFigurePathData(d)).toEqual({ reason });
  });
});

describe("꺾은선 뒤집기", () => {
  it("mirrors the middle vertices across the line joining the two ends", () => {
    expect(flipFigurePointList("40,200 140,180 240,200")).toEqual({
      points: "40 200 140 220 240 200",
      chord: [
        [40, 200],
        [240, 200],
      ],
    });
  });

  it("refuses a straight or a two-point list", () => {
    expect(flipFigurePointList("0,0 50,0 100,0")).toEqual({
      reason: "곧은 선이라 뒤집을 것이 없습니다",
    });
    expect(flipFigurePointList("0,0 100,0")).toEqual({
      reason: "곧은 선이라 뒤집을 것이 없습니다",
    });
  });
});

describe("곡선 표본", () => {
  it("samples each subpath on the curve, arcs included", () => {
    const [piece] = sampleFigurePath("M 0 0 A 50 50 0 0 1 100 0", 8)!;
    expect(piece[0]).toEqual([0, 0]);
    expect(piece.at(-1)![0]).toBeCloseTo(100);
    expect(piece.at(-1)![1]).toBeCloseTo(0);
    // sweep 1 은 화면에서 시계 방향 — 왼쪽에서 오른쪽으로 돌면 위(y 음수)로 부푼다
    expect(Math.min(...piece.map((p) => p[1]))).toBeCloseTo(-50);
    expect(sampleFigurePath("M 0 0 Q 50", 8)).toBeNull();
  });
});

/**
 * 적용 쪽 방어 — 모델이 그래도 경로 한 요소의 점을 하나씩 옮겨 «반대편으로 넘기기»를 흉내 내면, 그 결과가
 * 현을 가로질러 꺾이는지(한쪽으로만 부풀던 곡선이 양쪽으로) · 스스로 엇갈리는지 잡는다.
 */
describe("점 옮기기가 곡선을 꺾는가", () => {
  const gapped =
    "M 124 186.358 Q 82 188.24 40 200 M 156 186.358 Q 198 188.24 240 200";

  it("catches the kink from moving only the gap ends across the chord", () => {
    // 원장님 결과 그대로 — 틈 두 끝만 아래로, 조절점은 위에 남았다
    expect(
      bentCurveReason(
        gapped,
        "M 124 213.64 Q 82 188.24 40 200 M 156 213.64 Q 198 188.24 240 200",
      ),
    ).toBe("곡선이 현을 가로질러 꺾입니다");
  });

  it("lets a one-sided reshape through", () => {
    expect(
      bentCurveReason(
        gapped,
        "M 124 180 Q 82 188.24 40 200 M 156 180 Q 198 188.24 240 200",
      ),
    ).toBeNull();
  });

  it("lets an end-point move through — the chord itself moved", () => {
    expect(
      bentCurveReason(
        "M 40 200 Q 140 172 240 200",
        "M 40 200 Q 140 172 240 150",
      ),
    ).toBeNull();
  });

  it("catches a curve that crosses itself", () => {
    expect(
      bentCurveReason(
        "M 0 0 C 30 -40 70 -40 100 0",
        "M 0 0 C 130 -40 -30 -40 100 0",
      ),
    ).toBe("곡선이 스스로 엇갈립니다");
  });
});
