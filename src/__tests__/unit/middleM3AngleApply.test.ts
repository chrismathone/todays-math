/**
 * 중3 「원주각의 활용」 14유형 (3-2 원주각의 활용 01~14) — 독립 검산.
 *
 * 가장 센 검사는 **그림이다**. 생성기는 원 정리(원주각·접현각·내접사각형)로 각을
 * 정하고 그 각으로 호를 계산해 점을 놓는다. 시험은 그 정리를 옮겨 적지 않고
 * **스펙 좌표에서 각을 직접 재어** 라벨과 대조한다 — 유클리드 좌표와 원 정리는
 * 서로 다른 관계식이라 동어반복이 아니다(물결 4 공통 계약 2).
 *
 * 그리고 「$x$」로 적힌 각은 **정확히 하나**여야 하고 그 값이 정답과 같아야 한다.
 * 하나도 없으면 그림이 답을 안 말하고, 둘이면 어느 것을 묻는지 지면에서 갈리지 않는다.
 *
 * ⚠️ 엔진이 스펙을 받아 주는지는 여기서 못 잰다 — 그 축은 CLI 로 실렌더한다
 * (`npx tsx scripts/qa/render-m3-angle-apply.ts`, 근거 `qa/4d-angle-apply-figures.html`).
 *
 * ⚠️ 이 시험은 **자기 배열(`M3_ANGLE_APPLY`)만 훑는다.**
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M3_ANGLE_APPLY } from "../../lib/middle/m3AngleApply";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31415];
const DEG = Math.PI / 180;

type F = Record<string, number>;
type P2 = [number, number];

/** 유형별 산술 정합 — 그림 검사와 **함께** 봐야 한다(둘이 보는 축이 다르다). */
const VERIFY: Record<string, (f: F) => boolean> = {
  // 삼각형 ABP 의 내각의 합 — a + c + p = 180
  "3-2|원주각의 활용|01": (f) =>
    f.a! + f.c! + f.p! === 180 && f.x === [f.c!, f.a!, f.p!][f.mode!],
  "3-2|원주각의 활용|02": (f) =>
    f.mode === 2
      ? f.b! - f.c! === f.x! && f.b! > f.c!
      : f.x! + (f.mode === 0 ? f.a! : f.b!) === 180,
  "3-2|원주각의 활용|03": (f) =>
    f.mode === 2 ? f.a! + f.m! + f.x! === 180 : f.x === f.a!,
  "3-2|원주각의 활용|04": (f) => {
    if (f.mode === 0) return f.x! === 2 * f.a! + 2 * f.d! - 360;
    if (f.mode === 1) return 2 * f.x! === 360 - (2 * f.e! - f.c!);
    return f.a! + f.c! + f.x! === 360;
  },
  // ∠P = ∠B − ∠A · ∠Q = 180 − ∠A − ∠B
  "3-2|원주각의 활용|05": (f) =>
    f.p! === f.angB! - f.angA! &&
    f.q! === 180 - f.angA! - f.angB! &&
    f.x === [f.q!, f.angA!, f.angB!][f.mode!],
  "3-2|원주각의 활용|06": (f) =>
    f.a! + f.t! === 180 && f.x === [f.t!, f.t!, f.a!][f.mode!],
  "3-2|원주각의 활용|07": (f) =>
    f.a! + f.b! + f.m! === 180 && f.x === [f.m!, f.b!, f.a!][f.mode!],
  "3-2|원주각의 활용|08": (f) => {
    if (f.mode === 0) return f.a! + f.x! === 90;
    if (f.mode === 1) return f.b! - f.p! === f.x!;
    return f.a! === f.k! * f.x!;
  },
  "3-2|원주각의 활용|09": (f) =>
    f.d! === f.t! + f.m! && f.x === [f.m!, f.t!, f.d!][f.mode!],
  "3-2|원주각의 활용|10": (f) =>
    f.p! === 90 - 2 * f.a! && f.x === [90 - f.a!, 90 - 2 * f.a!, f.a!][f.mode!],
  // △DEF 의 내각의 합 — (90 − b/2) + e + f = 180
  "3-2|원주각의 활용|11": (f) =>
    90 - f.b! / 2 + f.e! + f.f! === 180 && f.x === [f.f!, f.e!, f.b!][f.mode!],
  "3-2|원주각의 활용|12": (f) =>
    f.a! + f.c! + f.t! === 180 && f.x === [f.t!, f.c!, f.a!][f.mode!],
  "3-2|원주각의 활용|13": (f) =>
    f.a! + f.b! + f.t! === 180 && f.x === [f.t!, f.a!, f.b!][f.mode!],
  // 접선과 현: 답의 제곱이 «가까운 변 × 지름»(mode 0·1) 또는 «두 토막의 곱»(mode 2)
  "3-2|원주각의 활용|14": (f) => {
    if (f.n! !== f.k! * f.k! * f.m!) return false;
    if (f.k! < 2) return false;
    for (let i = 2; i * i <= f.m!; i += 1) {
      if (f.m! % (i * i) === 0) return false;
    }
    return f.mode === 2 ? f.p! * (f.d! - f.p!) === f.n! : f.p! * f.d! === f.n!;
  },
};

/** RPM 색인의 실제 제목 (scripts/rpm/rpm-type-catalog.json 3-2 그대로). */
const TITLES: Record<string, string> = {
  "01": "네 점이 한 원 위에 있을 조건",
  "02": "원에 내접하는 사각형의 성질⑴",
  "03": "원에 내접하는 사각형의 성질⑵",
  "04": "원에 내접하는 다각형",
  "05": "원에 내접하는 사각형의 성질의 응용",
  "06": "두 원에서 내접하는 사각형의 성질의 응용",
  "07": "사각형이 원에 내접하기 위한 조건",
  "08": "접선과 현이 이루는 각 ⑴",
  "09": "접선과 현이 이루는 각 ⑵",
  "10": "접선과 현이 이루는 각의 응용 할선이 원의 중심을 지날 때",
  "11": "접선과 현이 이루는 각의 응용 한 점에서 원에 그은 두 접선",
  "12": "두 원에서 접선과 현이 이루는 각 ⑴",
  "13": "두 원에서 접선과 현이 이루는 각 ⑵",
  "14": "접선과 현이 이루는 각의 응용 삼각형의 닮음을 이용하는 경우",
};

// ── 스펙 좌표 되살리기 (엔진과 같은 규약) ─────────────────

function segEnds(v: unknown): [string, string] {
  if (Array.isArray(v)) return [v[0] as string, v[1] as string];
  const pts = (v as { points: [string, string] }).points;
  return [pts[0], pts[1]];
}

function crossPoint(a: P2, b: P2, c: P2, d: P2): P2 {
  const d1: P2 = [b[0] - a[0], b[1] - a[1]];
  const d2: P2 = [d[0] - c[0], d[1] - c[1]];
  const det = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((c[0] - a[0]) * d2[1] - (c[1] - a[1]) * d2[0]) / det;
  return [a[0] + t * d1[0], a[1] + t * d1[1]];
}

/**
 * FigureSpec v2 의 점을 좌표로 되살린다.
 *
 * `on_circle` 은 **엔진과 같은 규약**이다 — 수학각(도)에 y-down 보정:
 * $(c_x + r\cos\theta,\; c_y - r\sin\theta)$ (실측으로 확인, m3Figures.ts 주석).
 */
function resolveSpec(spec: Record<string, unknown>): Record<string, P2> {
  const pts = spec.points as Record<string, unknown>;
  const circles = (spec.circles ?? {}) as Record<
    string,
    { center: string; radius: number }
  >;
  const segs = (spec.segments ?? {}) as Record<string, unknown>;
  const out: Record<string, P2> = {};
  for (const [n, v] of Object.entries(pts)) {
    if (Array.isArray(v)) out[n] = [v[0] as number, v[1] as number];
  }
  for (const [n, v] of Object.entries(pts)) {
    const o = v as { type?: string; circle?: string; angle?: number };
    if (o?.type !== "on_circle") continue;
    const c = circles[o.circle!]!;
    const ctr = out[c.center]!;
    out[n] = [
      ctr[0] + c.radius * Math.cos(o.angle! * DEG),
      ctr[1] - c.radius * Math.sin(o.angle! * DEG),
    ];
  }
  for (const [n, v] of Object.entries(pts)) {
    const o = v as { type?: string; segments?: [string, string] };
    if (o?.type !== "intersection") continue;
    const [s1, s2] = o.segments!;
    const e1 = segEnds(segs[s1]);
    const e2 = segEnds(segs[s2]);
    out[n] = crossPoint(out[e1[0]]!, out[e1[1]]!, out[e2[0]]!, out[e2[1]]!);
  }
  return out;
}

function angleAt(v: P2, p1: P2, p2: P2): number {
  const a: P2 = [p1[0] - v[0], p1[1] - v[1]];
  const b: P2 = [p2[0] - v[0], p2[1] - v[1]];
  const dot = a[0] * b[0] + a[1] * b[1];
  const cos = dot / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]));
  return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG;
}

function dist(a: P2, b: P2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** 유형별 모드 가짓수 — 변형 폭의 하한을 잠근다. */
const MODE_COUNT = 3;

describe("중3 원주각의 활용 14유형 (3-2)", () => {
  const entries = M3_ANGLE_APPLY;

  it("원주각의 활용 01~14 14유형이 등록돼 있다", () => {
    expect(entries.length).toBe(14);
    expect(entries.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(new Set(entries.map((e) => e.rpmMinor))).toEqual(
      new Set(["원주각의 활용"]),
    );
    expect(new Set(entries.map((e) => e.rpmBook))).toEqual(new Set(["3-2"]));
  });

  it("RPM 색인의 실제 제목을 쓴다 (14유형 전량 리터럴 대조)", () => {
    for (const e of entries) {
      expect(e.rpmTitle, e.key).toBe(TITLES[e.rpmType]);
    }
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다", () => {
    expect(new Set(entries.map((e) => e.unitSection))).toEqual(
      new Set(["원주각의 활용"]),
    );
  });

  for (const e of M3_ANGLE_APPLY) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("씨앗별 산술 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          for (let v = 0; v < 10; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              verify!(p.facts),
              `seed ${seed} v${v} 검산 실패: ${JSON.stringify(p.facts)}`,
            ).toBe(true);
          }
        }
      });

      /**
       * **그림이 곧 검산이다.** 스펙 좌표에서 각을 직접 재어 라벨과 맞대 본다.
       * $30°$라고 적힌 각이 $70°$로 그려지면 여기서 빨개진다(09 §4-20).
       */
      it("그림의 각이 라벨과 같다 (스펙 좌표에서 직접 잰다)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 8; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            const spec = p.figureSpec as Record<string, unknown>;
            expect(spec, `${e.key} 그림 누락`).toBeTruthy();
            const pts = resolveSpec(spec);
            const angles = spec.angles as Record<
              string,
              {
                vertex: string;
                points: [string, string];
                label?: string;
                right?: boolean;
              }
            >;
            for (const [name, a] of Object.entries(angles)) {
              const measured = angleAt(
                pts[a.vertex]!,
                pts[a.points[0]]!,
                pts[a.points[1]]!,
              );
              const want = a.right
                ? 90
                : a.label === "x"
                  ? p.facts.x!
                  : Number(/^(\d+)°$/.exec(a.label ?? "")?.[1]);
              expect(
                Number.isFinite(want),
                `${e.key} ${name} 라벨을 못 읽었다: ${a.label}`,
              ).toBe(true);
              expect(
                Math.abs(measured - want) < 0.08,
                `${e.key} seed ${seed} v${v} ${name}: 그린 각 ${measured.toFixed(3)}° vs 적힌 값 ${want}°`,
              ).toBe(true);
            }
          }
        }
      });

      /**
       * 「$x$」는 **정확히 하나**다. 없으면 그림이 답을 안 말하고, 둘이면 지면에서
       * 어느 것을 묻는지 갈리지 않는다. 14 는 답이 길이라 각 라벨이 없다 —
       * 대신 직각 표시 둘이 있어야 한다(그게 닮음의 근거다).
       */
      it("묻는 각은 그림에 «x» 로 정확히 하나 (14 는 직각 표시 둘)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 8; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            const spec = p.figureSpec as Record<string, unknown>;
            const angles = Object.values(
              spec.angles as Record<
                string,
                { label?: string; right?: boolean }
              >,
            );
            const xs = angles.filter((a) => a.label === "x").length;
            const rights = angles.filter((a) => a.right === true).length;
            if (e.rpmType === "14") {
              expect(xs, `${e.key} x 라벨`).toBe(0);
              expect(rights, `${e.key} 직각 표시`).toBe(2);
            } else {
              expect(xs, `${e.key} seed ${seed} v${v} x 라벨 개수`).toBe(1);
            }
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(bareNumbers(p.content), `${e.key} content`).toEqual([]);
            expect(bareNumbers(p.answer), `${e.key} answer`).toEqual([]);
            expect(bareNumbers(p.solution), `${e.key} solution`).toEqual([]);
          }
        }
      });

      it("KaTeX 밖에 백슬래시가 없다", () => {
        const outside = (t: string): string => t.replace(/\$[^$]*\$/g, " ");
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["content", p.content],
              ["answer", p.answer],
              ["solution", p.solution],
            ] as const) {
              expect(
                outside(text).match(/\\[\s\S]/g) ?? [],
                `${e.key} seed ${seed} v${v} ${name}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("해설이 한 줄로 뭉치지 않는다 (단계 사이 줄바꿈)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              p.solution.split("\n").filter((s) => s.trim() !== "").length,
              `${e.key} seed ${seed} v${v} 해설 줄 수`,
            ).toBeGreaterThanOrEqual(2);
          }
        }
      });

      it("변형 폭 — 40변형에서 모드 세 갈래가 다 나오고 발문이 12종 이상", () => {
        const modes = new Set<number>();
        const contents = new Set<string>();
        for (let v = 0; v < 40; v += 1) {
          const p = generateMiddleProblem(e.key, 20260824, v);
          modes.add(p.facts.mode!);
          contents.add(p.content);
        }
        expect(modes.size, `${e.key} 모드 갈래`).toBe(MODE_COUNT);
        expect(contents.size, `${e.key} 발문 다양성`).toBeGreaterThanOrEqual(
          12,
        );
      });
    });
  }

  /**
   * 14 는 답이 **길이**라 각 라벨로는 못 잰다. 그림에서 실제 길이를 재어
   * 「$\overline{AC}:\overline{AB}=\sqrt{n}:d$」가 맞는지 본다 — 그림이 곧 검산.
   */
  it("14: 그림에서 잰 길이비가 답과 맞는다", () => {
    const e = M3_ANGLE_APPLY.find((t) => t.rpmType === "14")!;
    for (const seed of SEEDS) {
      for (let v = 0; v < 8; v += 1) {
        const p = generateMiddleProblem(e.key, seed, v);
        const spec = p.figureSpec as Record<string, unknown>;
        const pts = resolveSpec(spec);
        const f = p.facts;
        const ab = dist(pts.A!, pts.B!);
        const near = f.mode === 1 ? pts.B! : pts.A!;
        const want = Math.sqrt(f.n!) / f.d!;
        const got =
          f.mode === 2 ? dist(pts.P!, pts.C!) / ab : dist(near, pts.C!) / ab;
        expect(
          Math.abs(got - want) < 1e-4,
          `${e.key} seed ${seed} v${v} mode ${f.mode}: 그림 ${got.toFixed(6)} vs 답 ${want.toFixed(6)}`,
        ).toBe(true);
        // 발문이 준 다른 길이(수선의 발까지)도 그림과 맞아야 한다.
        const givenLen =
          f.mode === 2 ? dist(pts.A!, pts.P!) : dist(near, pts.P!);
        expect(
          Math.abs(givenLen / ab - f.p! / f.d!) < 1e-4,
          `${e.key} seed ${seed} v${v}: 수선 길이가 발문과 다르다`,
        ).toBe(true);
      }
    }
  });

  /**
   * **그림 폭이 못 박혀 있다.** 지면 등급은 viewBox 폭 하나로 갈리므로(≤160 → 140px,
   * ≤320 → 240px) 폭이 각도에 따라 떠다니면 같은 유형인데 지면 글자 크기가 달라진다
   * (09 §4-24 · CLAUDE.md 2026-08-23). 실측 2026-08-24: 안 박았을 때 158~357 이었다.
   *
   * 엔진이 여기에 여백·라벨 상자를 더하므로 최종 viewBox 는 이보다 조금 크다 —
   * 그 값은 CLI 실렌더가 잰다(`render-m3-angle-apply.ts`).
   */
  it("그림의 내용 폭이 유형·씨앗에 상관없이 같다", () => {
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (let v = 0; v < 8; v += 1) {
          const p = generateMiddleProblem(e.key, seed, v);
          const spec = p.figureSpec as Record<string, unknown>;
          const pts = resolveSpec(spec);
          const circles = (spec.circles ?? {}) as Record<
            string,
            { center: string; radius: number; draw?: boolean }
          >;
          let lo = Infinity;
          let hi = -Infinity;
          for (const q of Object.values(pts)) {
            lo = Math.min(lo, q[0]);
            hi = Math.max(hi, q[0]);
          }
          for (const c of Object.values(circles)) {
            if (c.draw === false) continue;
            const ctr = pts[c.center]!;
            lo = Math.min(lo, ctr[0] - c.radius);
            hi = Math.max(hi, ctr[0] + c.radius);
          }
          expect(
            Math.abs(hi - lo - 188) < 0.01,
            `${e.key} seed ${seed} v${v} 내용 폭 ${(hi - lo).toFixed(2)}`,
          ).toBe(true);
        }
      }
    }
  });

  /**
   * 「원에 내접하는지」를 묻는 유형(01·07)은 **원을 그리면 안 된다** — 그리는 순간
   * 묻는 것을 그림이 답한다. 01 은 작도원(`draw:false`), 07 은 원 자체가 없다.
   */
  it("01·07 은 원을 그리지 않는다", () => {
    for (const t of ["01", "07"]) {
      const e = M3_ANGLE_APPLY.find((x) => x.rpmType === t)!;
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const spec = p.figureSpec as Record<string, unknown>;
        const circles = (spec.circles ?? {}) as Record<
          string,
          { draw?: boolean }
        >;
        for (const [name, c] of Object.entries(circles)) {
          expect(c.draw, `${e.key} 원 ${name} 이 그려진다`).toBe(false);
        }
      }
    }
  });

  it("대분수를 직접 쓰지 않는다 (D-73)", () => {
    const bad: string[] = [];
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (let v = 0; v < 6; v += 1) {
          const p = generateMiddleProblem(e.key, seed, v);
          for (const text of [p.content, p.answer, p.solution]) {
            if (/\d\s*\\d?frac\{/.test(text)) bad.push(`${e.key}: ${text}`);
          }
        }
      }
    }
    expect(bad.slice(0, 4), `대분수 꼴 ${bad.length}건`).toEqual([]);
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });
});
