/**
 * 초3 1-1 「덧셈과 뺄셈」 4단 확대 (D-72) — 파일럿 `1-1-2` 를 뺀 세 소단원.
 *
 * **참은 발문에서 온다.** 생성기의 계산을 다시 부르지 않고, 지면에 실제로 찍히는 수를
 * 뽑아 여기서 다시 셈한다. 받아올림·받아내림도 여기 다시 적는다 — 제품 함수를 부르면
 * 동어반복이 된다(CLAUDE.md 2026-08-18 「지표의 «참»이 제품 상수에서 나오면」).
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

/** 이 파일이 맡는 소단원 — 파일럿(1-1-2)은 딴 파일이 지킨다. */
const CODES = ["1-1-1", "1-1-3", "1-1-4"] as const;
type Code = (typeof CODES)[number];

/** 소단원 이름이 약속한 받아올림·받아내림 범위. */
const RANGE: Record<Code, [number, number]> = {
  "1-1-1": [0, 1], // 「받아올림이 없는, 한 번 있는」
  "1-1-3": [0, 1], // 「받아내림이 없는, 한 번 있는」
  "1-1-4": [2, 2], // 「받아내림이 두 번 있는」
};

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);

function unitOf(code: Code) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** KaTeX 안에 찍힌 수를 **나온 순서대로**. 한 덩어리에 여럿일 수 있다. */
function nums(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

function answerOf(answer: string): number {
  expect(answer, `정답이 KaTeX 로 안 감싸졌다: ${answer}`).toMatch(/^\$\d+\$$/);
  return Number(answer.slice(1, -1));
}

function carries(a: number, b: number): number {
  let count = 0;
  let carry = 0;
  for (let place = 1; place <= 100; place *= 10) {
    const s =
      (Math.floor(a / place) % 10) + (Math.floor(b / place) % 10) + carry;
    carry = s >= 10 ? 1 : 0;
    count += carry;
  }
  return count;
}

function borrows(a: number, b: number): number {
  let count = 0;
  let owe = 0;
  for (let place = 1; place <= 100; place *= 10) {
    const top = (Math.floor(a / place) % 10) - owe;
    const bot = Math.floor(b / place) % 10;
    if (top < bot) {
      count += 1;
      owe = 1;
    } else {
      owe = 0;
    }
  }
  return count;
}

/**
 * 해설에 적힌 셈을 그대로 꺼낸다 — `$A+B=C$` · `$A-B=C$`.
 * 해설은 «학생이 실제로 밟는 단계»라, 여기 적힌 셈이 곧 그 갈래가 시키는 일이다.
 */
function steps(
  solution: string,
): { a: number; op: "+" | "-"; b: number; c: number }[] {
  return [...solution.matchAll(/\$(\d+)([+-])(\d+)=(\d+)\$/g)].map((m) => ({
    a: Number(m[1]),
    op: m[2] as "+" | "-",
    b: Number(m[3]),
    c: Number(m[4]),
  }));
}

describe("[초3 4단] 1-1 덧셈과 뺄셈 — 파일럿 밖 세 소단원", () => {
  it("세 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(unitOf(code), 31337, tier);
        const b = generateElementaryProblem(unitOf(code), 31337, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("해설의 셈이 하나도 빠짐없이 **실제로 맞는다**", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          const st = steps(p.solution);
          expect(
            st.length,
            `${code} ${tier} seed ${seed}: 해설에 식이 없다`,
          ).toBeGreaterThan(0);
          for (const s of st) {
            const want = s.op === "+" ? s.a + s.b : s.a - s.b;
            if (want !== s.c) {
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b}=${s.c} (참 ${want})`,
              );
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("정답은 해설 **마지막 단계**의 값과 같다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          const st = steps(p.solution);
          const last = st[st.length - 1]!;
          expect(
            answerOf(p.answer),
            `${code} ${tier} seed ${seed}: ${p.content}`,
          ).toBe(last.c);
        }
      }
    }
  });

  it("모든 셈이 (세 자리)±(세 자리)이고 소단원이 약속한 받아올림·받아내림이다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const [lo, hi] = RANGE[code];
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const s of steps(p.solution)) {
            // 되짚는 셈은 방향이 반대다 — 소단원이 약속한 것은 «바른» 방향의 셈이다.
            // 덧셈 소단원이면 덧셈만, 뺄셈 소단원이면 뺄셈만 잣대에 건다.
            const want = code === "1-1-1" ? "+" : "-";
            if (s.op !== want) continue;
            if (s.a < 100 || s.a > 999 || s.b < 100 || s.b > 999) {
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b} — 세 자리가 아니다`,
              );
              continue;
            }
            const got = s.op === "+" ? carries(s.a, s.b) : borrows(s.a, s.b);
            if (got < lo || got > hi) {
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b} — ${got}번 (${lo}~${hi} 이어야)`,
              );
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("D-72 축 — 1단은 한 단계, 3단은 두 단계, 4단은 되짚는다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unitOf(code), seed, "연산");
        expect(steps(calc.solution).length, `${code} 연산 seed ${seed}`).toBe(
          1,
        );

        const apply = generateElementaryProblem(unitOf(code), seed, "응용");
        const applySteps = steps(apply.solution);
        expect(applySteps.length, `${code} 응용 seed ${seed}`).toBe(2);
        // 두 단계여야 한다 — 첫 셈의 답이 둘째 셈에 **들어가야** 「중간값」이다.
        const s1 = applySteps[0]!;
        const s2 = applySteps[1]!;
        expect(
          s1.c === s2.a || s1.c === s2.b,
          `${code} 응용 seed ${seed}: 중간값이 안 이어진다`,
        ).toBe(true);

        // 4단은 되짚는다 — 소단원의 «바른» 방향과 **반대** 셈이 반드시 하나 있다.
        const deep = generateElementaryProblem(unitOf(code), seed, "심화");
        const reverseOp = code === "1-1-1" ? "-" : "+";
        expect(
          steps(deep.solution).some((s) => s.op === reverseOp),
          `${code} 심화 seed ${seed}: 되짚는 셈이 없다`,
        ).toBe(true);
      }
    }
  });

  it("2단은 문장으로 묻는다 — 발문에 계산식이 없다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "기본");
        expect(p.content, `${code} seed ${seed}`).not.toMatch(
          /[+\-]\d|\\square/,
        );
        expect(p.content.length, `${code} seed ${seed}`).toBeGreaterThan(30);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const stems = new Set<string>();
        for (let seed = 0; seed < 240; seed += 1) {
          stems.add(
            generateElementaryProblem(unitOf(code), seed, tier).content.replace(
              /\$[^$]*\$/g,
              "#",
            ),
          );
        }
        expect(stems.size, `${code} ${tier} 변형 공간`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("네 갈래 발문이 서로 갈리고, 파일럿(1-1-2)과도 겹치지 않는다", () => {
    for (const seed of SEEDS) {
      const seen = new Set<string>();
      for (const code of [...CODES, "1-1-2"] as const) {
        for (const tier of ELEM_TIERS) {
          const u = elementaryUnits().find(
            (x) => x.grade === "초3" && x.section.startsWith(code),
          )!;
          seen.add(generateElementaryProblem(u, seed, tier).content);
        }
      }
      expect(seen.size, `seed ${seed}: 같은 발문이 겹친다`).toBe(16);
    }
  });

  it("씨앗을 바꾸면 갈래마다 문항이 바뀐다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const seen = new Set(
          SEEDS.map(
            (s) => generateElementaryProblem(unitOf(code), s, tier).content,
          ),
        );
        expect(seen.size, `${code} ${tier} 가 씨앗에 반응하지 않는다`).toBe(
          SEEDS.length,
        );
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            expect(
              outside,
              `${code} ${tier} seed ${seed} ${label}: ${text}`,
            ).toBeNull();
          }
        }
      }
    }
  });

  it("수 바로 뒤에 조사를 붙이지 않는다", () => {
    // 수는 **읽는 소리**로 조사가 갈린다($4$→사→「가」, $3$→삼→「이」).
    // 글자만 봐서는 못 정하므로 그런 자리는 문장을 바꿔야 한다.
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const text of [p.content, p.answer, p.solution]) {
            // 단위가 붙은 수(`$4\,\mathrm{cm}$ 는`)는 단위 이름이 소리를 정하므로 뺀다.
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(`${code} ${tier} seed ${seed}: ${text.match(risk)![0]}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

/**
 * 초3 1-2 평면도형 4단 확대 (D-72) — 다섯 소단원 전부.
 *
 * 계산이 없는 대단원이라 **참을 그림에서 되살린다.** 점격자 스펙의 `lines` 를 이어
 * 붙여 도형을 복원하고, 직각은 **정수 내적**으로, 정사각형은 **칸 수**로 판정한다 —
 * 생성기가 붙인 이름표를 믿지 않는다.
 */
type XY = [number, number];

/** 이어진 선분끼리 묶어 도형 하나로 되살린다. */
function shapesOf(spec: Record<string, unknown>) {
  const lines = (spec.lines ?? []) as [XY, XY][];
  const dots = (spec.dots ?? []) as { c: number; r: number; label: string }[];
  const key = (p: XY) => `${p[0]},${p[1]}`;
  const groups: { pts: Set<string>; edges: [XY, XY][] }[] = [];
  for (const e of lines) {
    const hit = groups.filter(
      (g) => g.pts.has(key(e[0])) || g.pts.has(key(e[1])),
    );
    if (hit.length === 0) {
      groups.push({ pts: new Set([key(e[0]), key(e[1])]), edges: [e] });
      continue;
    }
    const first = hit[0]!;
    first.edges.push(e);
    first.pts.add(key(e[0]));
    first.pts.add(key(e[1]));
    for (const other of hit.slice(1)) {
      other.pts.forEach((p) => first.pts.add(p));
      first.edges.push(...other.edges);
      groups.splice(groups.indexOf(other), 1);
    }
  }
  return groups.map((g) => {
    const pts = [...g.pts].map((k) => k.split(",").map(Number) as XY);
    const label =
      dots.find((d) => d.label !== "" && g.pts.has(`${d.c},${d.r}`))?.label ??
      "";
    return { pts, edges: g.edges, label };
  });
}

const dotAt = (v: XY, p: XY, q: XY) =>
  (p[0] - v[0]) * (q[0] - v[0]) + (p[1] - v[1]) * (q[1] - v[1]);

/** 각(변 2개)이 직각인가 — 두 변이 나눠 갖는 꼭짓점에서 잰다. */
function angleIsRight(g: { edges: [XY, XY][] }): boolean {
  const e1 = g.edges[0]!;
  const e2 = g.edges[1]!;
  const k = (p: XY) => `${p[0]},${p[1]}`;
  const shared = [e1[0], e1[1]].find(
    (p) => k(p) === k(e2[0]) || k(p) === k(e2[1]),
  )!;
  const other = (e: [XY, XY]) => (k(e[0]) === k(shared) ? e[1] : e[0]);
  return dotAt(shared, other(e1), other(e2)) === 0;
}

function triHasRight(g: { pts: XY[] }): boolean {
  const a = g.pts[0]!;
  const b = g.pts[1]!;
  const c = g.pts[2]!;
  return dotAt(a, b, c) === 0 || dotAt(b, a, c) === 0 || dotAt(c, a, b) === 0;
}

/** 네 꼭짓점이 모두 직각인가 — 볼록 배치로 정렬한 뒤 정수 내적으로 잰다. */
function isRect(pts: XY[]): boolean {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const o = [...pts].sort(
    (a, b) =>
      Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  );
  for (let i = 0; i < 4; i += 1) {
    if (dotAt(o[i]!, o[(i + 3) % 4]!, o[(i + 1) % 4]!) !== 0) return false;
  }
  return true;
}

function isSquare(g: { pts: XY[] }): boolean {
  const cs = g.pts.map((p) => p[0]);
  const rs = g.pts.map((p) => p[1]);
  return (
    Math.max(...cs) - Math.min(...cs) === Math.max(...rs) - Math.min(...rs)
  );
}

const PLANE = ["1-2-1", "1-2-2", "1-2-3", "1-2-4", "1-2-5"] as const;
const DIVISION = ["1-3-1", "1-3-2", "1-3-3", "1-3-4"] as const;
const MULT = ["1-4-1", "1-4-2", "1-4-3", "1-4-4", "1-4-5"] as const;

function planeUnit(code: string) {
  return elementaryUnits().find(
    (u) => u.grade === "초3" && u.section.startsWith(code),
  )!;
}

describe("[초3 4단] 1-2 평면도형 — 다섯 소단원", () => {
  it("다섯 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of PLANE) {
      expect(supportedTiers(planeUnit(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of PLANE) {
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("직각·정사각형 문항의 답이 **그림에서 되살린 기하**와 맞는다", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      for (const tier of ["연산", "기본"] as const) {
        const a2 = generateElementaryProblem(planeUnit("1-2-2"), seed, tier);
        const g2 = shapesOf(a2.figureSpec as Record<string, unknown>).filter(
          (g) => g.edges.length === 2,
        );
        const right2 = g2.filter(angleIsRight);
        if (right2.length !== 1)
          bad.push(`1-2-2 ${tier} seed ${seed}: 직각 ${right2.length}개`);
        else if (right2[0]!.label !== a2.answer)
          bad.push(
            `1-2-2 ${tier} seed ${seed}: 그림 ${right2[0]!.label} ≠ 정답 ${a2.answer}`,
          );

        const a3 = generateElementaryProblem(planeUnit("1-2-3"), seed, tier);
        const g3 = shapesOf(a3.figureSpec as Record<string, unknown>).filter(
          (g) => g.pts.length === 3 && g.edges.length === 3,
        );
        const right3 = g3.filter(triHasRight);
        if (right3.length !== 1)
          bad.push(`1-2-3 ${tier} seed ${seed}: 직각삼각형 ${right3.length}개`);
        else if (right3[0]!.label !== a3.answer)
          bad.push(
            `1-2-3 ${tier} seed ${seed}: 그림 ${right3[0]!.label} ≠ 정답 ${a3.answer}`,
          );

        // 1-2-4 는 **직사각형** 알아보기다(2026-08-23 이름 수리 — 그 전엔 1-2-3 과
        // 글자까지 같은 「직각삼각형」이었다). 네 꼭짓점의 정수 내적으로 가른다.
        const a4 = generateElementaryProblem(planeUnit("1-2-4"), seed, tier);
        const g4 = shapesOf(a4.figureSpec as Record<string, unknown>).filter(
          (g) => g.pts.length === 4,
        );
        const rects = g4.filter((g) => isRect(g.pts));
        if (rects.length !== 1)
          bad.push(`1-2-4 ${tier} seed ${seed}: 직사각형 ${rects.length}개`);
        else if (rects[0]!.label !== a4.answer)
          bad.push(
            `1-2-4 ${tier} seed ${seed}: 그림 ${rects[0]!.label} ≠ 정답 ${a4.answer}`,
          );
        // 가로=세로면 정사각형이라 「직사각형」의 답으로 헷갈린다 — 생성기(rectRow)가
        // 다르게 잡기로 한 약속을 여기서 잠근다(변이 시험이 이 빈자리를 찾았다).
        else if (isSquare(rects[0]!))
          bad.push(`1-2-4 ${tier} seed ${seed}: 정답 도형이 정사각형이다`);

        const a5 = generateElementaryProblem(planeUnit("1-2-5"), seed, tier);
        const g5 = shapesOf(a5.figureSpec as Record<string, unknown>).filter(
          (g) => g.pts.length === 4,
        );
        const sq = g5.filter((g) => isRect(g.pts) && isSquare(g));
        if (sq.length !== 1)
          bad.push(`1-2-5 ${tier} seed ${seed}: 정사각형 ${sq.length}개`);
        else if (sq[0]!.label !== a5.answer)
          bad.push(
            `1-2-5 ${tier} seed ${seed}: 그림 ${sq[0]!.label} ≠ 정답 ${a5.answer}`,
          );
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-2-2·1-2-3 응용·심화의 답도 그림에서 되살린 수와 맞는다", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      // 1-2-2 응용 — 직각인 각과 아닌 각의 개수 차
      const ap = generateElementaryProblem(planeUnit("1-2-2"), seed, "응용");
      const angles = shapesOf(ap.figureSpec as Record<string, unknown>).filter(
        (g) => g.edges.length === 2,
      );
      const r = angles.filter(angleIsRight).length;
      const o = angles.length - r;
      if (answerOf(ap.answer) !== Math.abs(r - o))
        bad.push(
          `1-2-2 응용 seed ${seed}: 그림 |${r}-${o}| ≠ 정답 ${ap.answer}`,
        );

      // 1-2-2 심화 — 각의 직각 + 직사각형의 직각 넷
      const dp = generateElementaryProblem(planeUnit("1-2-2"), seed, "심화");
      const parts = shapesOf(dp.figureSpec as Record<string, unknown>);
      const rAng = parts.filter(
        (g) => g.edges.length === 2 && angleIsRight(g),
      ).length;
      const rects = parts.filter((g) => g.pts.length === 4).length;
      if (answerOf(dp.answer) !== rAng + rects * 4)
        bad.push(
          `1-2-2 심화 seed ${seed}: 그림 ${rAng}+${rects * 4} ≠ 정답 ${dp.answer}`,
        );

      // 1-2-3 응용 — 직각삼각형이 **아닌** 것의 수
      const ap3 = generateElementaryProblem(planeUnit("1-2-3"), seed, "응용");
      const t3 = shapesOf(ap3.figureSpec as Record<string, unknown>).filter(
        (g) => g.pts.length === 3 && g.edges.length === 3,
      );
      const notRight = t3.length - t3.filter(triHasRight).length;
      if (answerOf(ap3.answer) !== notRight)
        bad.push(
          `1-2-3 응용 seed ${seed}: 그림 ${notRight} ≠ 정답 ${ap3.answer}`,
        );

      // 1-2-3 심화 — 변이 셋이면서 직각이 있는 것
      const dp3 = generateElementaryProblem(planeUnit("1-2-3"), seed, "심화");
      const all3 = shapesOf(dp3.figureSpec as Record<string, unknown>);
      const want = all3.filter(
        (g) => g.pts.length === 3 && g.edges.length === 3 && triHasRight(g),
      ).length;
      if (answerOf(dp3.answer) !== want)
        bad.push(`1-2-3 심화 seed ${seed}: 그림 ${want} ≠ 정답 ${dp3.answer}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-2-1 응용·심화의 답이 **그림의 점 수**로 다시 구해진다", () => {
    for (const seed of SEEDS) {
      const apply = generateElementaryProblem(planeUnit("1-2-1"), seed, "응용");
      const dots = ((apply.figureSpec as { dots: unknown[] }).dots ?? [])
        .length;
      expect(answerOf(apply.answer), `응용 seed ${seed}`).toBe(
        (dots * (dots - 1)) / 2,
      );

      const deep = generateElementaryProblem(planeUnit("1-2-1"), seed, "심화");
      const d2 = ((deep.figureSpec as { dots: unknown[] }).dots ?? []).length;
      // 반직선은 짝마다 둘, 선분은 하나 — 그 차는 곧 선분의 수와 같다.
      expect(answerOf(deep.answer), `심화 seed ${seed}`).toBe(
        (d2 * (d2 - 1)) / 2,
      );
    }
  });

  it("1-2-5 응용·심화 — 해설의 셈이 맞고 나누어떨어진다", () => {
    for (const seed of SEEDS) {
      for (const tier of ["응용", "심화"] as const) {
        const p = generateElementaryProblem(planeUnit("1-2-5"), seed, tier);
        const st = steps(p.solution);
        const div = [...p.solution.matchAll(/\$(\d+)\\div4=(\d+)\$/g)].map(
          (m) => ({
            a: Number(m[1]),
            c: Number(m[2]),
          }),
        );
        for (const s of st) {
          const want = s.op === "+" ? s.a + s.b : s.a - s.b;
          expect(want, `1-2-5 ${tier} seed ${seed}: ${s.a}${s.op}${s.b}`).toBe(
            s.c,
          );
        }
        for (const d of div) {
          expect(
            d.a % 4,
            `1-2-5 ${tier} seed ${seed}: ${d.a} 나누기 4 가 안 떨어진다`,
          ).toBe(0);
          expect(d.a / 4, `1-2-5 ${tier} seed ${seed}`).toBe(d.c);
        }
        // 초3 1-2 는 곱셈(1-4)보다 **앞**이라 「한 변을 네 번 더한다」가 맞는 풀이다.
        // 두 항짜리 `steps()` 로는 안 잡히므로 여러 항 덧셈을 따로 읽는다.
        const repeats = [
          ...p.solution.matchAll(/\$((?:\d+\+){2,}\d+)=(\d+)\$/g),
        ].map((m) => ({
          parts: m[1]!.split("+").map(Number),
          c: Number(m[2]),
        }));
        for (const r of repeats) {
          expect(
            r.parts.reduce((x, y) => x + y, 0),
            `1-2-5 ${tier} seed ${seed}: ${r.parts.join("+")}`,
          ).toBe(r.c);
        }
        expect(
          st.length + div.length + repeats.length,
          `1-2-5 ${tier} seed ${seed}: 식이 없다`,
        ).toBeGreaterThan(0);

        // ⚠️ 여기가 알맹이다 — **해설의 마지막 값이 곧 정답**이어야 한다.
        // 셈이 저희끼리만 맞는지 보고 정답과 잇지 않으면, 「되짚지 않고 그대로 답한다」는
        // 훼손이 초록으로 지나간다(실측: 변이 시험에서 실제로 지나갔다).
        const lastValue = [...p.solution.matchAll(/=(\d+)\$/g)].map((m) =>
          Number(m[1]),
        );
        expect(
          lastValue.length,
          `1-2-5 ${tier} seed ${seed}: 결과 값이 없다`,
        ).toBeGreaterThan(0);
        expect(
          answerOf(p.answer),
          `1-2-5 ${tier} seed ${seed}: 해설 끝값과 정답이 어긋난다 — ${p.solution}`,
        ).toBe(lastValue[lastValue.length - 1]);
      }
    }
  });

  it("1-2-2 응용의 답이 씨앗에 따라 갈린다 — 상수답 금지", () => {
    // 예전엔 «3도형 중 직각 1~2» 구조라 답이 씨앗 무관 늘 $1$ 이었다(|1-2|).
    // g6 pyrFaceDeep 상수답(7604dee6)과 같은 부류 — 도형 수·직각 수를 벌린 약속을 잠근다.
    const answers = new Set<number>();
    for (let seed = 0; seed < 40; seed += 1) {
      answers.add(
        answerOf(
          generateElementaryProblem(planeUnit("1-2-2"), seed, "응용").answer,
        ),
      );
    }
    expect(answers.size, [...answers].join(",")).toBeGreaterThanOrEqual(3);
  });

  it("1-2-4 «표준»도 직사각형을 낸다 — 개명(직각삼각형→직사각형)이 표준 경로까지 닿는다", () => {
    // 갈래 키(`초3|1-2-4`)는 소단원 **번호**라 units.ts 이름이 되돌아가도 갈래는 멀쩡하다.
    // 이름이 가르는 것은 **표준 라우팅**(plane) 하나뿐이므로, 여기를 안 잠그면
    // 개명이 되돌아가도 이 파일 전체가 초록이다(변이 설계 중 실측).
    const bad: string[] = [];
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(planeUnit("1-2-4"), seed);
      const quads = shapesOf(p.figureSpec as Record<string, unknown>).filter(
        (g) => g.pts.length === 4,
      );
      const rects = quads.filter((g) => isRect(g.pts));
      if (quads.length < 2)
        bad.push(`seed ${seed}: 사각형이 ${quads.length}개`);
      if (rects.length !== 1)
        bad.push(`seed ${seed}: 직사각형 ${rects.length}개`);
      else if (rects[0]!.label !== p.answer)
        bad.push(`seed ${seed}: 그림 ${rects[0]!.label} ≠ 정답 ${p.answer}`);
      else if (isSquare(rects[0]!))
        bad.push(`seed ${seed}: 정답 도형이 정사각형이다`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-2-4 응용·심화 — 답이 발문의 가로·세로에서 다시 구해진다", () => {
    // 길이 문항이라 그림이 없다 — 참을 **발문에 찍힌 수**에서 가져온다.
    // (변이 설계 중 실측: 이 갈래 둘은 어느 시험도 정답을 안 보고 있었다.)
    for (const seed of SEEDS) {
      const ap = generateElementaryProblem(planeUnit("1-2-4"), seed, "응용");
      const [w, h] = nums(ap.content);
      expect(answerOf(ap.answer), `응용 seed ${seed}: ${ap.content}`).toBe(
        (w! + h!) * 2,
      );

      const dp = generateElementaryProblem(planeUnit("1-2-4"), seed, "심화");
      const [total, w2] = nums(dp.content);
      expect(total! % 2, `심화 seed ${seed}: 네 변의 합이 홀수다`).toBe(0);
      expect(answerOf(dp.answer), `심화 seed ${seed}: ${dp.content}`).toBe(
        total! / 2 - w2!,
      );
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of PLANE) {
      for (const tier of ELEM_TIERS) {
        const stems = new Set<string>();
        for (let seed = 0; seed < 240; seed += 1) {
          stems.add(
            generateElementaryProblem(
              planeUnit(code),
              seed,
              tier,
            ).content.replace(/\$[^$]*\$/g, "#"),
          );
        }
        expect(stems.size, `${code} ${tier} 변형 공간`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("네 갈래 발문 틀이 서로 갈린다", () => {
    for (const code of PLANE) {
      for (const seed of SEEDS) {
        const stems = ELEM_TIERS.map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(4);
      }
    }
  });

  it("갈래 발문이 **갈래 없는 기본 문항**과 겹치지 않는다", () => {
    // 판정기는 소단원마다 씨앗 **하나**만 본다. 실제로 1-2-5 «연산» 이 기본 문항과
    // 같은 발문을 내는 것을 판정기가 잡았는데, 나머지 셋도 같은 자리가 있었고
    // 씨앗이 안 맞아 안 걸렸을 뿐이다 — 여기서 씨앗을 넓혀 잠근다.
    const bad: string[] = [];
    // 1-1(계산)·1-3(나눗셈)·1-4(곱셈)까지 함께 본다 — 같은 함정이 어느 대단원에서나 난다.
    for (const code of [...CODES, ...PLANE, ...DIVISION, ...MULT]) {
      for (const seed of SEEDS) {
        const plain = generateElementaryProblem(planeUnit(code), seed).content;
        const seen = new Map<string, string>();
        for (const tier of ELEM_TIERS) {
          const tiered = generateElementaryProblem(
            planeUnit(code),
            seed,
            tier,
          ).content;
          if (tiered === plain)
            bad.push(`${code} ${tier} seed ${seed}: 기본 문항과 같다`);
          if (seen.has(tiered))
            bad.push(
              `${code} ${tier} seed ${seed}: ${seen.get(tiered)} 갈래와 같다`,
            );
          seen.set(tiered, tier);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of PLANE) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (outside)
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: ${text.match(risk)![0]}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

/**
 * 초3 2-2-4 (세 자리 수)÷(한 자리 수) — **표준** 생성기의 범위 수리(2026-08-23) 잠금.
 * 몫을 12..48 고정으로 뽑아 $45\div3$ 같은 두 자리 나뉘는 수가 나왔다(씨앗 12/40).
 * 참은 발문에 찍힌 수에서 온다 — 생성기의 범위 상수를 다시 부르지 않는다.
 */
describe("[초3 표준] 2-2-4 (세 자리 수)÷(한 자리 수)", () => {
  it("나뉘는 수가 항상 세 자리이고, 나누어떨어지고, 몫이 정답과 같다", () => {
    const unit = elementaryUnits().find(
      (u) => u.grade === "초3" && u.section.startsWith("2-2-4"),
    )!;
    // 위반율이 12/40 이던 결함이라 씨앗 40개면 되살아날 때 못 지나간다(놓칠 확률 ≈ 1e-6).
    const wide = [
      ...SEEDS,
      ...Array.from({ length: 24 }, (_, i) => i * 613 + 101),
    ];
    for (const seed of wide) {
      const p = generateElementaryProblem(unit, seed);
      const m = p.content.match(/\$(\d+)\\div(\d+)=\\square\$/);
      expect(m, `seed ${seed}: ${p.content}`).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      expect(a, `seed ${seed}: 나뉘는 수 ${a}`).toBeGreaterThanOrEqual(100);
      expect(a, `seed ${seed}: 나뉘는 수 ${a}`).toBeLessThanOrEqual(999);
      expect(b, `seed ${seed}: 나누는 수 ${b}`).toBeGreaterThanOrEqual(2);
      expect(b, `seed ${seed}: 나누는 수 ${b}`).toBeLessThanOrEqual(9);
      expect(a % b, `seed ${seed}: 나누어떨어지지 않는다`).toBe(0);
      expect(answerOf(p.answer), `seed ${seed}`).toBe(a / b);
    }
  });
});

/**
 * 초3 1-3 나눗셈 4단 확대 (D-72) — 네 소단원 전부.
 *
 * 나눗셈 도입 대단원의 약속: 모든 나눗셈이 **곱셈구구 안**(나누는 수·몫 2..9, 나뉘는 수
 * ≤ 81, 나머지 없음)이고, 지면의 어느 나눗셈도 **몫과 나누는 수가 같지 않다**
 * (같으면 발문에 답이 보인다 — 표준 `division` 의 회피 이유 그대로).
 * 참은 해설에 실제로 찍힌 식에서 온다 — 생성기의 범위 상수를 다시 부르지 않는다.
 */

/** 해설의 사칙 스텝을 나온 순서대로 — `$A÷B=C$`·`$A×B=C$`·`$A±B=C$`. */
function divSteps(
  solution: string,
): { a: number; op: "+" | "-" | "×" | "÷"; b: number; c: number }[] {
  return [
    ...solution.matchAll(/\$(\d+)(\\times|\\div|\+|-)(\d+)=(\d+)\$/g),
  ].map((m) => ({
    a: Number(m[1]),
    op:
      m[2] === "\\times"
        ? ("×" as const)
        : m[2] === "\\div"
          ? ("÷" as const)
          : (m[2] as "+" | "-"),
    b: Number(m[3]),
    c: Number(m[4]),
  }));
}

describe("[초3 4단] 1-3 나눗셈 — 네 소단원", () => {
  it("네 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of DIVISION) {
      expect(supportedTiers(planeUnit(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of DIVISION) {
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("해설의 모든 셈이 맞고, 나눗셈은 곱셈구구 안이며 몫≠나누는 수다", () => {
    const bad: string[] = [];
    for (const code of DIVISION) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const st = divSteps(p.solution);
          expect(
            st.length,
            `${code} ${tier} seed ${seed}: 해설에 식이 없다`,
          ).toBeGreaterThan(0);
          for (const s of st) {
            const want =
              s.op === "+"
                ? s.a + s.b
                : s.op === "-"
                  ? s.a - s.b
                  : s.op === "×"
                    ? s.a * s.b
                    : s.a / s.b;
            if (want !== s.c)
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b}=${s.c} (참 ${want})`,
              );
            if (s.op === "÷") {
              if (s.b < 2 || s.b > 9 || s.c < 2 || s.c > 9 || s.a > 81)
                bad.push(
                  `${code} ${tier} seed ${seed}: ${s.a}÷${s.b}=${s.c} — 곱셈구구 밖`,
                );
              if (s.c === s.b)
                bad.push(
                  `${code} ${tier} seed ${seed}: ${s.a}÷${s.b} — 몫과 나누는 수가 같다`,
                );
            }
            if (s.op === "×" && (s.a < 2 || s.a > 9 || s.b < 2 || s.b > 9))
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}×${s.b} — 곱셈구구 밖`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("정답은 해설의 마지막 «곱셈 아닌» 스텝의 값과 같다", () => {
    // 곱셈 스텝은 되짚기·검산이라 답이 아니다 — 나눗셈·덧뺄셈의 마지막 값이 곧 답이어야
    // 「되짚지 않고 그대로 답한다」는 훼손이 침묵으로 지나가지 않는다(1-2-5 와 같은 자리).
    for (const code of DIVISION) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const nonMul = divSteps(p.solution).filter((s) => s.op !== "×");
          expect(
            nonMul.length,
            `${code} ${tier} seed ${seed}: 곱셈뿐인 해설`,
          ).toBeGreaterThan(0);
          expect(
            answerOf(p.answer),
            `${code} ${tier} seed ${seed}: ${p.solution}`,
          ).toBe(nonMul[nonMul.length - 1]!.c);
        }
      }
    }
  });

  it("1-3-2 «표준» 발문에 수식 뒤 조사가 없다 — «$…$ 를» 소수리(2026-08-23) 잠금", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(planeUnit("1-3-2"), seed);
      expect(p.content, `seed ${seed}: ${p.content}`).not.toMatch(risk);
    }
  });

  it("모든 갈래의 답이 $1$ 이상이다 — 「남은 것 $0$개」류 함정을 내지 않는다", () => {
    for (const code of DIVISION) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          expect(
            answerOf(p.answer),
            `${code} ${tier} seed ${seed}: ${p.content}`,
          ).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("1-3-3·1-3-4 심화 — 다시 나누는 수가 처음 몫과 다르다(답이 발문에 보이면 안 된다)", () => {
    // $a=b\times q_1$ 에서 새 나누는 수 c 가 옛 몫 $q_1$ 이면 새 몫이 옛 나누는 수 b 다 —
    // 「$4$개씩 $7$묶음 → $7$개씩 몇 묶음?」의 답 $4$ 가 발문에 그대로 보인다(표본 실측).
    for (const code of ["1-3-3", "1-3-4"] as const) {
      for (const seed of SEEDS) {
        const st = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "심화").solution,
        );
        const mul = st.find((s) => s.op === "×")!;
        const div = st.find((s) => s.op === "÷")!;
        expect(mul, `${code} seed ${seed}: 되짚는 곱셈이 없다`).toBeTruthy();
        expect(
          div,
          `${code} seed ${seed}: 다시 나누는 스텝이 없다`,
        ).toBeTruthy();
        expect(div.b, `${code} seed ${seed}: c 가 옛 몫과 같다`).not.toBe(
          mul.b,
        );
        expect(div.c, `${code} seed ${seed}: 새 몫이 옛 나누는 수다`).not.toBe(
          mul.a,
        );
      }
    }
  });

  it("D-72 축 — 1단 나눗셈 한 번 · 2단 문장 · 3단 이어지는 두 단계 · 4단 되짚기·조합", () => {
    for (const code of DIVISION) {
      for (const seed of SEEDS) {
        // 1단: 나눗셈 스텝이 정확히 하나, 덧뺄셈은 없다(곱셈은 «관계» 소단원의 본질이라 허용).
        const calc = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "연산").solution,
        );
        expect(
          calc.filter((s) => s.op === "÷").length,
          `${code} 연산 seed ${seed}`,
        ).toBe(1);
        expect(
          calc.filter((s) => s.op === "+" || s.op === "-").length,
          `${code} 연산 seed ${seed}`,
        ).toBe(0);

        // 2단: 발문이 문장이다 — 식 기호가 없다.
        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        expect(word.content, `${code} 기본 seed ${seed}`).not.toMatch(
          /\\div|\\times|\\square/,
        );

        // 3단: 두 단계 이상이고, 앞 스텝의 결과가 뒤 스텝에 들어간다.
        const apply = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "응용").solution,
        );
        expect(
          apply.length,
          `${code} 응용 seed ${seed}`,
        ).toBeGreaterThanOrEqual(2);
        expect(
          apply.some((s, i) =>
            apply.slice(i + 1).some((t) => t.a === s.c || t.b === s.c),
          ),
          `${code} 응용 seed ${seed}: 중간값이 안 이어진다`,
        ).toBe(true);

        // 4단: 되짚는 곱셈·덧셈이 있거나, 나눗셈이 두 번(조건 조합)이다.
        const deep = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "심화").solution,
        );
        expect(
          deep.some((s) => s.op === "×" || s.op === "+") ||
            deep.filter((s) => s.op === "÷").length >= 2,
          `${code} 심화 seed ${seed}: 되짚는 스텝이 없다`,
        ).toBe(true);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of DIVISION) {
      for (const tier of ELEM_TIERS) {
        const stems = new Set<string>();
        for (let seed = 0; seed < 240; seed += 1) {
          stems.add(
            generateElementaryProblem(
              planeUnit(code),
              seed,
              tier,
            ).content.replace(/\$[^$]*\$/g, "#"),
          );
        }
        expect(stems.size, `${code} ${tier} 변형 공간`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("네 갈래 발문 틀이 서로 갈린다", () => {
    for (const code of DIVISION) {
      for (const seed of SEEDS) {
        const stems = ELEM_TIERS.map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(4);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of DIVISION) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (outside)
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: ${text.match(risk)![0]}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

/**
 * 초3 1-4 곱셈 4단 확대 (D-72) — 다섯 소단원 전부, «표준»까지 같은 잣대로.
 *
 * 소단원 이름의 약속: 1-4-1 은 (몇십)×(몇), 1-4-2~5 는 올림 종류가 서로 **배타**다
 * («둘 다» 소단원이 따로 있으므로 「십의 자리에서」는 «십의 자리에서만»이다).
 * 수리 전 실측(씨앗 200): 1-4-2 「올림이 없는」의 75건이 올림($32\times5=160$),
 * 1-4-3 의 52건·1-4-4 의 82건이 «둘 다»였다 — 판정기에 1-4 조건이 없어 침묵했다.
 * 올림 판정은 여기 다시 적는다 — 생성기 풀을 다시 부르면 동어반복이다.
 */
function mulClassOf(a: number, b: number): "none" | "ones" | "tens" | "both" {
  const oc = (a % 10) * b >= 10;
  const tc = Math.floor(a / 10) * b + Math.floor(((a % 10) * b) / 10) >= 10;
  return oc ? (tc ? "both" : "ones") : tc ? "tens" : "none";
}

const MUL_CLASS: Record<string, "none" | "ones" | "tens" | "both"> = {
  "1-4-2": "none",
  "1-4-3": "tens",
  "1-4-4": "ones",
  "1-4-5": "both",
};

describe("[초3 4단] 1-4 곱셈 — 다섯 소단원 (표준 포함)", () => {
  it("다섯 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of MULT) {
      expect(supportedTiers(planeUnit(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of MULT) {
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("모든 곱셈이 소단원 약속대로다 — 몇십·배타적 올림 종류, «표준»까지", () => {
    const bad: string[] = [];
    for (const code of MULT) {
      for (const tier of [undefined, ...ELEM_TIERS]) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const muls = divSteps(p.solution).filter((s) => s.op === "×");
          if (muls.length === 0) {
            bad.push(
              `${code} ${tier ?? "표준"} seed ${seed}: 곱셈 스텝이 없다`,
            );
            continue;
          }
          for (const s of muls) {
            if (s.a * s.b !== s.c)
              bad.push(
                `${code} ${tier ?? "표준"} seed ${seed}: ${s.a}×${s.b}=${s.c} (참 ${s.a * s.b})`,
              );
            if (s.b < 2 || s.b > 9)
              bad.push(
                `${code} ${tier ?? "표준"} seed ${seed}: 곱하는 수 ${s.b}`,
              );
            if (code === "1-4-1") {
              if (s.a % 10 !== 0 || s.a < 20 || s.a > 90)
                bad.push(
                  `${code} ${tier ?? "표준"} seed ${seed}: ${s.a} — 몇십이 아니다`,
                );
            } else {
              if (s.a < 11 || s.a > 99 || s.a % 10 === 0)
                bad.push(
                  `${code} ${tier ?? "표준"} seed ${seed}: ${s.a} — 몇십몇이 아니다`,
                );
              else if (mulClassOf(s.a, s.b) !== MUL_CLASS[code])
                bad.push(
                  `${code} ${tier ?? "표준"} seed ${seed}: ${s.a}×${s.b} — 올림 ${mulClassOf(s.a, s.b)} (약속 ${MUL_CLASS[code]})`,
                );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("해설의 모든 셈이 맞고, 정답은 마지막 스텝의 값과 같다", () => {
    for (const code of MULT) {
      for (const tier of [undefined, ...ELEM_TIERS]) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const st = divSteps(p.solution);
          expect(
            st.length,
            `${code} ${tier ?? "표준"} seed ${seed}: 식이 없다`,
          ).toBeGreaterThan(0);
          for (const s of st) {
            const want =
              s.op === "+"
                ? s.a + s.b
                : s.op === "-"
                  ? s.a - s.b
                  : s.op === "×"
                    ? s.a * s.b
                    : s.a / s.b;
            expect(
              want,
              `${code} ${tier ?? "표준"} seed ${seed}: ${s.a}${s.op}${s.b}`,
            ).toBe(s.c);
          }
          expect(
            answerOf(p.answer),
            `${code} ${tier ?? "표준"} seed ${seed}: ${p.solution}`,
          ).toBe(st[st.length - 1]!.c);
        }
      }
    }
  });

  it("D-72 축 — 1단 곱셈 한 번 · 2단 문장 · 3단 곱하고 더하거나 덜기 · 4단 되짚고 곱하기", () => {
    for (const code of MULT) {
      for (const seed of SEEDS) {
        const calc = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "연산").solution,
        );
        expect(calc.length, `${code} 연산 seed ${seed}`).toBe(1);
        expect(calc[0]!.op, `${code} 연산 seed ${seed}`).toBe("×");

        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        expect(word.content, `${code} 기본 seed ${seed}`).not.toMatch(
          /\times|\div|\square/,
        );
        expect(
          word.content.length,
          `${code} 기본 seed ${seed}`,
        ).toBeGreaterThan(20);

        const apply = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "응용").solution,
        );
        expect(
          apply.length,
          `${code} 응용 seed ${seed}`,
        ).toBeGreaterThanOrEqual(2);
        expect(apply[0]!.op, `${code} 응용 seed ${seed}`).toBe("×");
        expect(
          apply
            .slice(1)
            .some((t) => t.a === apply[0]!.c || t.b === apply[0]!.c),
          `${code} 응용 seed ${seed}: 곱이 다음 셈으로 안 이어진다`,
        ).toBe(true);

        // 4단: 먼저 ±로 어떤 수를 되짚고, **마지막**에 곱한다.
        const deep = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "심화").solution,
        );
        expect(
          deep.some((s) => s.op === "+" || s.op === "-"),
          `${code} 심화 seed ${seed}: 되짚는 셈이 없다`,
        ).toBe(true);
        expect(deep[deep.length - 1]!.op, `${code} 심화 seed ${seed}`).toBe(
          "×",
        );
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of MULT) {
      for (const tier of ELEM_TIERS) {
        const stems = new Set<string>();
        for (let seed = 0; seed < 240; seed += 1) {
          stems.add(
            generateElementaryProblem(
              planeUnit(code),
              seed,
              tier,
            ).content.replace(/\$[^$]*\$/g, "#"),
          );
        }
        expect(stems.size, `${code} ${tier} 변형 공간`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("네 갈래 발문 틀이 서로 갈린다", () => {
    for (const code of MULT) {
      for (const seed of SEEDS) {
        const stems = ELEM_TIERS.map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(4);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of MULT) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (outside)
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
            if (risk.test(text) && !/\mathrm/.test(text)) {
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: ${text.match(risk)![0]}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
