/**
 * FigureSpec v2 «마크 문법» — segments.ticks/parallel · angles.arcs/right (물결 2B).
 *
 * 엔진을 모킹하지 않는다(없는 축은 변이시킬 수 없다) — render_spec.py 를
 * 제품 실경로(renderFigureSpec)로 띄워 잰다. figureRegions.test.ts 패턴.
 *
 * 지키는 불변식:
 *  1) 하위 호환 — 기존 실증 스펙 28종의 SVG 가 **바이트 그대로**다
 *     (기준선: scripts/qa/fixtures/figure-marks-compat-baseline.json,
 *      마크 문법을 넣기 전 엔진 b0a1cce0 으로 구움)
 *  2) ticks n(1~3) — 마크 층에 수직 획 n개, 중점 대칭. 범위 밖·불리언·문자열은 던진다
 *  3) parallel m(1~2) — » 셰브런(획 2개/개), 꼭짓점이 p1→p2 방향을 가리킨다
 *  4) arcs:2 — 반지름 15·12(−3px) 두 호. right:true — 사각형 경로, 호 없음
 *  5) right 는 검산 겸용 — 90°±0.5° 밖이면 던진다. arcs 와 함께 못 쓴다
 *  6) 마크가 선분보다 길면(짧은 선분) 던진다 — 조용히 삐져나가지 않는다
 */
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const BASELINE = path.join(
  process.cwd(),
  "scripts",
  "qa",
  "fixtures",
  "figure-marks-compat-baseline.json",
);

/** SVG 의 <g> 그룹별 본문. [0]=main, [1]=marks, [2]=labels (regions 없을 때). */
function groups(svg: string): string[] {
  const out: string[] = [];
  const re = /<g>([\s\S]*?)<\/g>/g;
  for (let m = re.exec(svg); m; m = re.exec(svg)) out.push(m[1]);
  return out;
}

/** 마크 층의 round-cap 획(tick·셰브런)들을 {x1,y1,x2,y2} 로 뽑는다. */
function markLines(
  svg: string,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const marks = groups(svg)[1] ?? "";
  const re =
    /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^/]*stroke-linecap="round"/g;
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let m = re.exec(marks); m; m = re.exec(marks)) {
    out.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] });
  }
  return out;
}

/** 수평 선분 하나짜리 최소 스펙 — 마크 기하를 좌표로 잴 수 있다. */
function flatSegment(seg: Record<string, unknown>) {
  return {
    version: 2,
    points: { A: [0, 100], B: [200, 100] },
    segments: { AB: seg },
  } as Record<string, unknown>;
}

describe.skipIf(!hasEngine)(
  "[도형 v2] 하위 호환 — 기존 실증 스펙 바이트 불변",
  () => {
    it("기준선 28종의 SVG 가 한 바이트도 안 변했다", async () => {
      const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<
        string,
        { spec: unknown; svg: string; md5: string }
      >;
      const ids = Object.keys(baseline);
      expect(ids.length).toBe(28);
      for (const id of ids) {
        const r = await renderFigureSpec(baseline[id].spec);
        expect(r.ok, `${id} 렌더 실패`).toBe(true);
        if (!r.ok) continue;
        expect(r.svg === baseline[id].svg, `${id} SVG 바이트가 변했다`).toBe(
          true,
        );
      }
    }, 240_000);
  },
);

describe.skipIf(!hasEngine)("[도형 v2] segments.ticks — 같음 표시", () => {
  it("ticks:2 는 마크 층에 수직 획 2개를 중점 대칭으로 그린다", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], ticks: 2 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lines = markLines(r.svg);
    expect(lines.length).toBe(2);
    for (const line of lines) {
      // 수평 선분의 tick 은 세로 획 — 전장 8px
      expect(line.x1).toBe(line.x2);
      expect(Math.abs(line.y2 - line.y1)).toBeCloseTo(8, 5);
    }
    // 간격 3px, 중점 대칭
    expect(Math.abs(lines[1].x1 - lines[0].x1)).toBeCloseTo(3, 5);
  });

  it("ticks:3 은 획 3개", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], ticks: 3 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(markLines(r.svg).length).toBe(3);
  });

  it("ticks:4·불리언·문자열은 던진다", async () => {
    for (const ticks of [4, true, "2"]) {
      const r = await renderFigureSpec(
        flatSegment({ points: ["A", "B"], ticks }),
      );
      expect(r.ok, `ticks=${JSON.stringify(ticks)} 가 통과하면 안 된다`).toBe(
        false,
      );
    }
  });

  it("마크가 선분보다 길면 던진다 — 짧은 선분 ticks:3", async () => {
    // 길이 8: 바깥 tick 이 중점 ±3 이라 여유 2px 요건(3+2 > 4)에 걸린다
    const spec = {
      version: 2,
      points: { A: [0, 100], B: [8, 100] },
      segments: { AB: { points: ["A", "B"], ticks: 3 } },
    };
    const r = await renderFigureSpec(spec);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toContain("too short");
  });

  it("모르는 키(tick 오타)는 던진다", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], tick: 2 }),
    );
    expect(r.ok).toBe(false);
  });
});

describe.skipIf(!hasEngine)("[도형 v2] segments.parallel — 평행 » 표시", () => {
  it("parallel:1 은 획 2개짜리 셰브런 — 꼭짓점이 p1→p2 방향을 가리킨다", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], parallel: 1 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lines = markLines(r.svg);
    expect(lines.length).toBe(2);
    // 두 획이 꼭짓점(같은 점)을 공유하고, 그 점이 날개보다 B 쪽(오른쪽)에 있다
    const tip1 = { x: lines[0].x2, y: lines[0].y2 };
    const tip2 = { x: lines[1].x1, y: lines[1].y1 };
    expect(tip1.x).toBeCloseTo(tip2.x, 5);
    expect(tip1.y).toBeCloseTo(tip2.y, 5);
    expect(tip1.x).toBeGreaterThan(lines[0].x1);
    expect(tip1.x).toBeGreaterThan(lines[1].x2);
  });

  it("parallel:2 는 셰브런 둘 (획 4개)", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], parallel: 2 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(markLines(r.svg).length).toBe(4);
  });

  it("parallel:3 은 던진다", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], parallel: 3 }),
    );
    expect(r.ok).toBe(false);
  });

  it("ticks 와 parallel 동시 — 둘 다 그려지고 서로 비켜난다", async () => {
    const r = await renderFigureSpec(
      flatSegment({ points: ["A", "B"], ticks: 1, parallel: 1 }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const lines = markLines(r.svg);
    expect(lines.length).toBe(3); // tick 1 + 셰브런 2
    const tick = lines.find((l) => l.x1 === l.x2);
    expect(tick).toBeDefined();
    const chevrons = lines.filter((l) => l !== tick);
    // tick 은 중점 왼쪽, 셰브런은 오른쪽 — 겹치지 않는다
    for (const c of chevrons) {
      expect(Math.min(c.x1, c.x2)).toBeGreaterThan(tick!.x1);
    }
  });
});

describe.skipIf(!hasEngine)("[도형 v2] angles.arcs — 이중 호", () => {
  const angleSpec = (angle: Record<string, unknown>) =>
    ({
      version: 2,
      points: { O: [50, 150], P: [200, 150], Q: [150, 30] },
      segments: { OP: ["O", "P"], OQ: ["O", "Q"] },
      angles: { a: { vertex: "O", points: ["P", "Q"], ...angle } },
    }) as Record<string, unknown>;

  it("arcs:2 는 반지름 15·12 두 호를 그린다 (간격 3px)", async () => {
    const r = await renderFigureSpec(angleSpec({ arcs: 2 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const marks = groups(r.svg)[1] ?? "";
    expect(marks).toContain("A 22.0 22.0");
    expect(marks).toContain("A 19.0 19.0");
  });

  it("arcs 기본(1)은 호 하나", async () => {
    const r = await renderFigureSpec(angleSpec({}));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const marks = groups(r.svg)[1] ?? "";
    expect(marks.match(/A 22\.0 22\.0/g)?.length).toBe(1);
    expect(marks).not.toContain("A 19.0 19.0");
  });

  it("arcs:3·arcs:0 은 던진다", async () => {
    for (const arcs of [3, 0]) {
      const r = await renderFigureSpec(angleSpec({ arcs }));
      expect(r.ok, `arcs=${arcs} 가 통과하면 안 된다`).toBe(false);
    }
  });
});

describe.skipIf(!hasEngine)(
  "[도형 v2] angles.right — 직각기호이자 검산",
  () => {
    const rightSpec = (qx: number, extra: Record<string, unknown> = {}) =>
      ({
        version: 2,
        points: { O: [50, 150], P: [200, 150], Q: [qx, 30] },
        segments: { OP: ["O", "P"], OQ: ["O", "Q"] },
        angles: {
          a: { vertex: "O", points: ["P", "Q"], right: true, ...extra },
        },
      }) as Record<string, unknown>;

    it("직각이면 호 대신 사각형 두 변(꺾인 경로)을 그린다", async () => {
      const r = await renderFigureSpec(rightSpec(50)); // OQ 수직 → 90°
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const marks = groups(r.svg)[1] ?? "";
      // 꺾인 경로(M..L..L..) — 한 변 = 15 × 0.55 = 8.25
      expect(marks).toMatch(/<path d="M [^"]* L [^"]* L [^"]*" fill="none"/);
      expect(marks).not.toContain("A 15.0");
      // 사각형 두 변의 길이 = 호 반지름 15 × 0.55 = 8.25
      const m = marks.match(
        /<path d="M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)" fill="none"/,
      );
      expect(m).toBeTruthy();
      if (!m) return;
      const [x1, y1, x2, y2, x3, y3] = m.slice(1).map(Number);
      expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(12.1, 3);
      expect(Math.hypot(x3 - x2, y3 - y2)).toBeCloseTo(12.1, 3);
    });

    it("90°가 아니면 던진다 — 마크가 아니라 기하를 고치라는 사유", async () => {
      const r = await renderFigureSpec(rightSpec(70)); // ≈80.5°
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toContain("right");
    });

    it("right 와 arcs 는 함께 못 쓴다", async () => {
      const r = await renderFigureSpec(rightSpec(50, { arcs: 2 }));
      expect(r.ok).toBe(false);
    });
  },
);
