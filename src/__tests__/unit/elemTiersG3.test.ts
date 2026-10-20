/**
 * 초3 1-1 「덧셈과 뺄셈」 4단 확대 (D-72) — 파일럿 `1-1-2` 를 뺀 세 소단원.
 *
 * **참은 발문에서 온다.** 생성기의 계산을 다시 부르지 않고, 지면에 실제로 찍히는 수를
 * 뽑아 여기서 다시 셈한다. 받아올림·받아내림도 여기 다시 적는다 — 제품 함수를 부르면
 * 동어반복이 된다(CLAUDE.md 2026-08-18 「지표의 «참»이 제품 상수에서 나오면」).
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import { fracFigParts } from "@/lib/elementary/fracFig";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
        const deep = generateElementaryProblem(unitOf(code), seed, "심화하");
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
      for (const tier of tiersOf(unitOf(code))) {
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
    // ⚠️ 기대값을 **손으로 적지 않는다.** 예전에는 `.toBe(16)`(4소단원 × 4갈래)이었는데,
    //    확대 갈래를 채우면 그 수가 늘어 「겹친다」가 아니라 **「채웠다」로 빨개진다.**
    //    묻는 것은 「몇 개인가」가 아니라 **「둘이 같아지지 않는가」**다 (D-113 ⑺).
    for (const seed of SEEDS) {
      const seen = new Set<string>();
      let made = 0;
      for (const code of [...CODES, "1-1-2"] as const) {
        const u = elementaryUnits().find(
          (x) => x.grade === "초3" && x.section.startsWith(code),
        )!;
        for (const tier of tiersOf(u)) {
          seen.add(generateElementaryProblem(u, seed, tier).content);
          made += 1;
        }
      }
      expect(seen.size, `seed ${seed}: 같은 발문이 겹친다`).toBe(made);
    }
  });

  it("씨앗을 바꾸면 갈래마다 문항이 바뀐다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
const LENTIME = ["1-5-1", "1-5-2", "1-5-3", "1-5-4", "1-5-5", "1-5-6"] as const;
const FRACDEC = [
  "1-6-1",
  "1-6-2",
  "1-6-3",
  "1-6-4",
  "1-6-5",
  "1-6-6",
  "1-6-7",
] as const;

function planeUnit(code: string) {
  return elementaryUnits().find(
    (u) => u.grade === "초3" && u.section.startsWith(code),
  )!;
}

describe("[초3 4단] 1-2 평면도형 — 다섯 소단원", () => {
  it("다섯 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of PLANE) {
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of PLANE) {
      for (const tier of tiersOf(planeUnit(code))) {
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

      // 1-2-2 심화 — 그림의 직각(각 + 직사각형)에 **더 그릴 직사각형**의 직각을 얹는다.
      // 예전에는 그림의 직각을 세면 끝이라, 두 걸음인 응용보다 오히려 쉬웠다.
      const dp = generateElementaryProblem(planeUnit("1-2-2"), seed, "심화하");
      const parts = shapesOf(dp.figureSpec as Record<string, unknown>);
      const rAng = parts.filter(
        (g) => g.edges.length === 2 && angleIsRight(g),
      ).length;
      const rects = parts.filter((g) => g.pts.length === 4).length;
      const addM = dp.content.match(/직사각형[^.]*?\$(\d+)\$개를? 더/);
      if (!addM) {
        bad.push(`1-2-2 심화 seed ${seed}: 더 그릴 직사각형 수를 못 읽음`);
      } else if (answerOf(dp.answer) !== rAng + (rects + Number(addM[1])) * 4) {
        bad.push(
          `1-2-2 심화 seed ${seed}: 그림 ${rAng}+(${rects}+${addM[1]})×4 ≠ 정답 ${dp.answer}`,
        );
      }

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
      const dp3 = generateElementaryProblem(planeUnit("1-2-3"), seed, "심화하");
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

      const deep = generateElementaryProblem(
        planeUnit("1-2-1"),
        seed,
        "심화하",
      );
      const d2 = ((deep.figureSpec as { dots: unknown[] }).dots ?? []).length;
      // 심화 — **점을 하나 더 찍은 뒤**의 선분 수. 새 점은 기존 점마다 선분 하나를 만든다.
      // (예전에는 「반직선 $-$ 선분」이었는데 그 차는 곧 선분의 수라, 실은 한 가지만 세면
      //  되는 문항이었다.)
      expect(answerOf(deep.answer), `심화 seed ${seed}`).toBe(
        ((d2 + 1) * d2) / 2,
      );
    }
  });

  it("1-2-5 응용·심화 — 해설의 셈이 맞고 나누어떨어진다", () => {
    for (const seed of SEEDS) {
      for (const tier of ["응용", "심화하"] as const) {
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

      const dp = generateElementaryProblem(planeUnit("1-2-4"), seed, "심화하");
      const [total, w2] = nums(dp.content);
      expect(total! % 2, `심화 seed ${seed}: 네 변의 합이 홀수다`).toBe(0);
      expect(answerOf(dp.answer), `심화 seed ${seed}: ${dp.content}`).toBe(
        total! / 2 - w2!,
      );
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of PLANE) {
      for (const tier of tiersOf(planeUnit(code))) {
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
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 갈래 수를 **손으로 적지 않는다** — D-113 으로 확대 갈래가 차면
        // 「4」는 조용히 틀린 수가 된다. 물을 것은 「둘이 같아지지 않는가」다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(stems.length);
      }
    }
  });

  it("갈래 발문이 **갈래 없는 기본 문항**과 겹치지 않는다", () => {
    // 판정기는 소단원마다 씨앗 **하나**만 본다. 실제로 1-2-5 «연산» 이 기본 문항과
    // 같은 발문을 내는 것을 판정기가 잡았는데, 나머지 셋도 같은 자리가 있었고
    // 씨앗이 안 맞아 안 걸렸을 뿐이다 — 여기서 씨앗을 넓혀 잠근다.
    const bad: string[] = [];
    // 1-1·1-3·1-4·1-5·1-6 까지 함께 본다 — 같은 함정이 어느 대단원에서나 난다.
    for (const code of [
      ...CODES,
      ...PLANE,
      ...DIVISION,
      ...MULT,
      ...LENTIME,
      ...FRACDEC,
    ]) {
      for (const seed of SEEDS) {
        const plain = generateElementaryProblem(planeUnit(code), seed).content;
        const seen = new Map<string, string>();
        for (const tier of tiersOf(planeUnit(code))) {
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
      for (const tier of tiersOf(planeUnit(code))) {
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
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of DIVISION) {
      for (const tier of tiersOf(planeUnit(code))) {
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
      for (const tier of tiersOf(planeUnit(code))) {
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
      for (const tier of tiersOf(planeUnit(code))) {
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
      for (const tier of tiersOf(planeUnit(code))) {
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
          generateElementaryProblem(planeUnit(code), seed, "심화하").solution,
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
          generateElementaryProblem(planeUnit(code), seed, "심화하").solution,
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
      for (const tier of tiersOf(planeUnit(code))) {
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
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 갈래 수를 **손으로 적지 않는다** — D-113 으로 확대 갈래가 차면
        // 「4」는 조용히 틀린 수가 된다. 물을 것은 「둘이 같아지지 않는가」다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(stems.length);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of DIVISION) {
      for (const tier of tiersOf(planeUnit(code))) {
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
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of MULT) {
      for (const tier of tiersOf(planeUnit(code))) {
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
      for (const tier of [undefined, ...tiersOf(planeUnit(code))]) {
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
              // ⚠️ **한 자리 × 한 자리는 이 약속의 대상이 아니다.** 소단원이 약속한 것은
              //    (몇십몇)×(몇) 의 올림 종류이고, 되짚기 해설은 그 종류를 «끝까지 곱하지
              //    않고» 가르려고 **자릿수끼리의 곱**($4\times7$)을 적는다(D-115 ⑾).
              //    그것까지 「몇십몇이 아니다」로 세면 심화중이 구조적으로 못 선다.
              //    좁히는 것이 아니다 — 두 자리 피승수는 그대로 전부 잰다.
              if (s.a < 10) continue;
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
      for (const tier of [undefined, ...tiersOf(planeUnit(code))]) {
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
          // 🔴 **되짚기 갈래는 답이 마지막 «값»이 아니라 마지막 «피연산자»다.**
          //    순방향 갈래(연산·기본·응용·심화하)에서는 마지막 셈의 결과가 곧 답이지만,
          //    심화중은 「곱하는 수」를 되짚으므로 답이 마지막 곱셈의 **인수**로 선다
          //    ($44\times2=88$ 의 $2$). 잠금을 지우지 않고 **갈래마다 옳은 잣대**를 댄다 —
          //    지우면 「답이 해설 어디에도 없다」는 결함이 통째로 안 보인다.
          const last = st[st.length - 1]!;
          const at = `${code} ${tier ?? "표준"} seed ${seed}: ${p.solution}`;
          if (tier === "심화중" || tier === "심화상") {
            expect([last.a, last.b], at).toContain(answerOf(p.answer));
          } else {
            expect(answerOf(p.answer), at).toBe(last.c);
          }
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
          generateElementaryProblem(planeUnit(code), seed, "심화하").solution,
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
      for (const tier of tiersOf(planeUnit(code))) {
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
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 갈래 수를 **손으로 적지 않는다** — D-113 으로 확대 갈래가 차면
        // 「4」는 조용히 틀린 수가 된다. 물을 것은 「둘이 같아지지 않는가」다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(stems.length);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of MULT) {
      for (const tier of tiersOf(planeUnit(code))) {
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

/**
 * 초3 1-5 길이와 시간 4단 확대 (D-72) — 여섯 소단원 전부.
 *
 * 단위 경계(10 mm·1000 m·60초·60분)가 알맹이다 — 환산·올림·내림을 **여기서 독립
 * 재계산**한다(발문의 수를 총량으로 바꿔 답의 총량과 맞댄다 — 생성기 함수를 부르지
 * 않는다). 답의 분·초 자리는 반드시 정규화(< 60)이고 $0$ 이 아니어야 한다.
 */

/** 발문·답의 시간 표기를 앞에서부터 토큰으로 — 총량은 초 단위. */
function timeTokens(
  text: string,
): { kind: "hm" | "clock" | "ms" | "m" | "s"; sec: number }[] {
  const re =
    /\$(\d+)\$시간 \$(\d+)\$분|\$(\d+)\$시 \$(\d+)\$분|\$(\d+)\$분 \$(\d+)\$초|\$(\d+)\$분|\$(\d+)\$초/g;
  const out: { kind: "hm" | "clock" | "ms" | "m" | "s"; sec: number }[] = [];
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined)
      out.push({ kind: "hm", sec: (Number(m[1]) * 60 + Number(m[2])) * 60 });
    else if (m[3] !== undefined)
      out.push({ kind: "clock", sec: (Number(m[3]) * 60 + Number(m[4])) * 60 });
    else if (m[5] !== undefined)
      out.push({ kind: "ms", sec: Number(m[5]) * 60 + Number(m[6]) });
    else if (m[7] !== undefined)
      out.push({ kind: "m", sec: Number(m[7]) * 60 });
    else out.push({ kind: "s", sec: Number(m[8]) });
  }
  return out;
}

/** 답의 «$h$시간 $m$분» — 분 자리가 정규화(1..59)됐는지도 함께 잠근다. */
function hmAnswer(a: string): { h: number; m: number } {
  const m = a.match(/^\$(\d+)\$시간 \$(\d+)\$분$/);
  expect(m, `시간 답 형식이 아니다: ${a}`).toBeTruthy();
  const parsed = { h: Number(m![1]), m: Number(m![2]) };
  expect(parsed.m, `분 자리가 0 이다: ${a}`).toBeGreaterThanOrEqual(1);
  expect(parsed.m, `분 자리가 60 을 넘는다: ${a}`).toBeLessThanOrEqual(59);
  return parsed;
}

function clockAnswer(a: string): { h: number; m: number } {
  const m = a.match(/^\$(\d+)\$시 \$(\d+)\$분$/);
  expect(m, `시각 답 형식이 아니다: ${a}`).toBeTruthy();
  const parsed = { h: Number(m![1]), m: Number(m![2]) };
  expect(parsed.h, `시각의 시가 12 를 넘는다: ${a}`).toBeLessThanOrEqual(11);
  expect(parsed.m, `분 자리: ${a}`).toBeGreaterThanOrEqual(1);
  expect(parsed.m, `분 자리: ${a}`).toBeLessThanOrEqual(59);
  return parsed;
}

function msAnswer(a: string): { m: number; s: number } {
  const m = a.match(/^\$(\d+)\$분 \$(\d+)\$초$/);
  expect(m, `분·초 답 형식이 아니다: ${a}`).toBeTruthy();
  const parsed = { m: Number(m![1]), s: Number(m![2]) };
  expect(parsed.s, `초 자리: ${a}`).toBeGreaterThanOrEqual(1);
  expect(parsed.s, `초 자리: ${a}`).toBeLessThanOrEqual(59);
  return parsed;
}

/** 길이 토큰 — 총량은 작은 단위(mm 또는 m). 큰 단위 배율은 단위 이름에서 정한다. */
function lenTokens(text: string): { mixed: boolean; small: number }[] {
  const re =
    /\$(\d+)\\,\\mathrm\{(cm|km)\}\\ (\d+)\\,\\mathrm\{(?:mm|m)\}\$|\$(\d+)\\,\\mathrm\{(?:mm|m)\}\$/g;
  const out: { mixed: boolean; small: number }[] = [];
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) {
      const mul = m[2] === "cm" ? 10 : 1000;
      out.push({ mixed: true, small: Number(m[1]) * mul + Number(m[3]) });
    } else {
      out.push({ mixed: false, small: Number(m[4]) });
    }
  }
  return out;
}

describe("[초3 4단] 1-5 길이와 시간 — 여섯 소단원", () => {
  it("여섯 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of LENTIME) {
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of LENTIME) {
      for (const tier of tiersOf(planeUnit(code))) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("1-5-1·1-5-2 — 발문의 길이 총량과 답이 단위 환산으로 정확히 맞는다", () => {
    const bad: string[] = [];
    for (const code of ["1-5-1", "1-5-2"] as const) {
      const mul = code === "1-5-1" ? 10 : 1000;
      for (const tier of tiersOf(planeUnit(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          if (tier === "연산") {
            // 지시문에도 $\square$ 홑블록이 있으니, «=» 가 든 블록이 등식이다.
            const eq = p.content.match(/\$([^$]*=[^$]*)\$/);
            if (!eq || !eq[1]!.includes("\\square")) {
              bad.push(`${code} 연산 seed ${seed}: 등식이 없다 — ${p.content}`);
              continue;
            }
            const [left, right] = eq[1]!.split("=") as [string, string];
            const readSide = (side: string, boxValue: number) => {
              const big = side.match(/(\d+)\\,\\mathrm\{(?:cm|km)\}/);
              const small = side.match(/(\d+)\\,\\mathrm\{(?:mm|m)\}/);
              let total =
                (big ? Number(big[1]) * mul : 0) +
                (small ? Number(small[1]) : 0);
              if (/\\square\\,\\mathrm\{(?:mm|m)\}/.test(side))
                total += boxValue;
              if (/\\square\\,\\mathrm\{(?:cm|km)\}/.test(side))
                total += boxValue * mul;
              return total;
            };
            const ans = answerOf(p.answer);
            if (readSide(left, ans) !== readSide(right, ans))
              bad.push(
                `${code} 연산 seed ${seed}: 등식 양변이 다르다 — ${p.content} / ${p.answer}`,
              );
            continue;
          }
          const toks = lenTokens(p.content);
          if (tier === "기본") {
            const total = toks[0]!.small;
            const ansToks = lenTokens(p.answer);
            const ansSmall =
              ansToks.length > 0 ? ansToks[0]!.small : answerOf(p.answer);
            if (total !== ansSmall)
              bad.push(
                `${code} 기본 seed ${seed}: ${total} ≠ ${ansSmall} — ${p.content} / ${p.answer}`,
              );
          } else if (tier === "응용") {
            if (toks.length !== 2) {
              bad.push(`${code} 응용 seed ${seed}: 길이가 ${toks.length}개`);
              continue;
            }
            if (answerOf(p.answer) !== toks[0]!.small + toks[1]!.small)
              bad.push(
                `${code} 응용 seed ${seed}: ${toks[0]!.small}+${toks[1]!.small} ≠ ${p.answer}`,
              );
          } else {
            // 심화 — **두 도막을 이은 뒤** 한 몫을 덜어 낸다(길이가 셋). 예전에는 전체에서
            // 한 도막을 빼는 두 걸음이었는데, 응용(환산 둘 + 덧셈)보다 오히려 쉬웠다.
            if (toks.length !== 3) {
              bad.push(`${code} 심화 seed ${seed}: 길이가 ${toks.length}개`);
              continue;
            }
            const mixed = toks.filter((t) => t.mixed);
            const plain = toks.filter((t) => !t.mixed);
            if (mixed.length !== 2 || plain.length !== 1) {
              bad.push(
                `${code} 심화 seed ${seed}: 이을 두 도막과 덜어 낼 한 몫이어야 한다 — ${p.content}`,
              );
              continue;
            }
            const want = mixed[0]!.small + mixed[1]!.small - plain[0]!.small;
            if (want <= 0) {
              bad.push(`${code} 심화 seed ${seed}: 남는 길이가 $0$ 이하다`);
            } else if (answerOf(p.answer) !== want) {
              bad.push(
                `${code} 심화 seed ${seed}: ${mixed[0]!.small}+${mixed[1]!.small}-${plain[0]!.small} ≠ ${p.answer}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-5-3 — 어림·실측의 차가 발문에서 다시 구해지고, 이긴 사람이 정말 더 가깝다", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      const calc = generateElementaryProblem(planeUnit("1-5-3"), seed, "연산");
      const g = calc.content.match(/(\d+)\\,\\mathrm\{cm\}/);
      if (!g || answerOf(calc.answer) !== Number(g[1]) * 10)
        bad.push(`연산 seed ${seed}: ${calc.content} / ${calc.answer}`);

      const word = generateElementaryProblem(planeUnit("1-5-3"), seed, "기본");
      const mm = [...word.content.matchAll(/(\d+)\\,\\mathrm\{mm\}/g)].map(
        (m) => Number(m[1]),
      );
      if (mm.length !== 3) bad.push(`기본 seed ${seed}: mm ${mm.length}개`);
      else {
        const [real, gA, gB] = mm as [number, number, number];
        const dA = Math.abs(gA - real);
        const dB = Math.abs(gB - real);
        if (dA === dB) bad.push(`기본 seed ${seed}: 두 어림의 차가 같다`);
        if (!word.content.includes(word.answer))
          bad.push(`기본 seed ${seed}: 답 이름이 발문에 없다`);
        // 답 이름이 «더 가까운 쪽 어림값» 바로 앞 자리에 서는지 — 첫 이름이 gA 의 임자다.
        const firstNameIdx = word.content.indexOf(word.answer);
        const otherName = [
          ...word.content.matchAll(/([가-힣]{2})[은는이가]? 약/g),
        ]
          .map((m) => m[1]!)
          .find((nm) => nm !== word.answer);
        if (otherName) {
          const winnerIsFirst = firstNameIdx < word.content.indexOf(otherName);
          const nearIsFirst = dA < dB;
          if (winnerIsFirst !== nearIsFirst)
            bad.push(
              `기본 seed ${seed}: 답 ${word.answer} 가 더 먼 쪽이다 — ${word.content}`,
            );
        }
      }

      const apply = generateElementaryProblem(planeUnit("1-5-3"), seed, "응용");
      const am = [...apply.content.matchAll(/(\d+)\\,\\mathrm\{mm\}/g)].map(
        (m) => Number(m[1]),
      );
      if (am.length === 3) {
        const [real, g1, g2] = am as [number, number, number];
        const want = Math.abs(Math.abs(g1 - real) - Math.abs(g2 - real));
        if (answerOf(apply.answer) !== want)
          bad.push(`응용 seed ${seed}: ${want} ≠ ${apply.answer}`);
        if (want < 1) bad.push(`응용 seed ${seed}: 차이가 0`);
      } else bad.push(`응용 seed ${seed}: mm ${am.length}개`);

      // 심화 — 한 사람의 어림에서 실제를 **되짚은 뒤 다른 사람의 어림과 다시 견준다**.
      // 예전에는 되짚기 한 번으로 끝나 응용(차 둘을 내고 견주는 세 걸음)보다 쉬웠다.
      const deep = generateElementaryProblem(
        planeUnit("1-5-3"),
        seed,
        "심화하",
      );
      const cms = [...deep.content.matchAll(/(\d+)\\,\\mathrm\{cm\}/g)].map(
        (m) => Number(m[1]),
      );
      const dmm = deep.content.match(/(\d+)\\,\\mathrm\{mm\}/);
      const longer = /깁니다|길었습니다/.test(deep.content);
      if (cms.length !== 2 || !dmm) {
        bad.push(`심화 seed ${seed}: 어림 둘과 차를 못 읽음 — ${deep.content}`);
      } else {
        const real = cms[0]! * 10 + (longer ? 1 : -1) * Number(dmm[1]);
        const want = cms[1]! * 10 - real;
        if (want <= 0)
          bad.push(`심화 seed ${seed}: 둘째 어림이 실제보다 짧다 — ${want}`);
        else if (answerOf(deep.answer) !== want)
          bad.push(`심화 seed ${seed}: ${want} ≠ ${deep.answer}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-5-4 — 분·초 환산이 발문 총량과 초 단위로 정확히 맞는다", () => {
    const bad: string[] = [];
    for (const tier of tiersOf(planeUnit("1-5-4"))) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(planeUnit("1-5-4"), seed, tier);
        const toks = timeTokens(p.content);
        const totalIn = toks.reduce((x, t) => x + t.sec, 0);
        let ansSec: number;
        if (/몇 분 몇 초/.test(p.content)) {
          const a = msAnswer(p.answer);
          ansSec = a.m * 60 + a.s;
        } else if (/몇 초|초로 나타내시오/.test(p.content)) {
          ansSec = answerOf(p.answer);
        } else {
          ansSec = answerOf(p.answer) * 60;
        }
        const want = tier === "심화하" ? toks[0]!.sec - toks[1]!.sec : totalIn;
        if (ansSec !== want)
          bad.push(
            `${tier} seed ${seed}: ${want} ≠ ${ansSec} — ${p.content} / ${p.answer}`,
          );
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-5-5 — 60분 올림이 독립 재계산과 맞는다 (합·끝나는 시각·세 시간)", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      for (const tier of ["연산", "기본"] as const) {
        const p = generateElementaryProblem(planeUnit("1-5-5"), seed, tier);
        const durs = timeTokens(p.content).filter((t) => t.kind === "hm");
        const a = hmAnswer(p.answer);
        if (durs.length !== 2)
          bad.push(`${tier} seed ${seed}: 시간이 ${durs.length}개`);
        else if ((a.h * 60 + a.m) * 60 !== durs[0]!.sec + durs[1]!.sec)
          bad.push(`${tier} seed ${seed}: 합이 어긋난다 — ${p.content}`);
      }

      const ap = generateElementaryProblem(planeUnit("1-5-5"), seed, "응용");
      const clock = timeTokens(ap.content).find((t) => t.kind === "clock");
      const dur = timeTokens(ap.content).find((t) => t.kind === "hm");
      const end = clockAnswer(ap.answer);
      if (!clock || !dur) bad.push(`응용 seed ${seed}: 시각·시간을 못 읽음`);
      else if ((end.h * 60 + end.m) * 60 !== clock.sec + dur.sec)
        bad.push(`응용 seed ${seed}: 끝 시각이 어긋난다 — ${ap.content}`);

      // 심화 — **전체를 주고 셋째를 되짚는다.** 예전에는 세 시간을 그냥 더해서, 응용에
      // 항을 하나 더한 것과 같았다(계산량만 늘었다). 이제 마지막 시간이 «전체»다.
      const dp = generateElementaryProblem(planeUnit("1-5-5"), seed, "심화하");
      const parts = timeTokens(dp.content).filter(
        (t) => t.kind === "hm" || t.kind === "m",
      );
      const da = hmAnswer(dp.answer);
      if (parts.length !== 3) {
        bad.push(`심화 seed ${seed}: 시간이 ${parts.length}개 — ${dp.content}`);
      } else {
        const whole = parts[2]!.sec;
        const known = parts[0]!.sec + parts[1]!.sec;
        if (whole <= known)
          bad.push(
            `심화 seed ${seed}: 전체가 아는 둘보다 작다 — ${dp.content}`,
          );
        else if ((da.h * 60 + da.m) * 60 !== whole - known)
          bad.push(`심화 seed ${seed}: 되짚은 시간이 어긋난다 — ${dp.content}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-5-6 — 60분 내림이 독립 재계산과 맞는다 (차·걸린 시간·되짚기)", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      for (const tier of ["연산", "기본"] as const) {
        const p = generateElementaryProblem(planeUnit("1-5-6"), seed, tier);
        const durs = timeTokens(p.content).filter((t) => t.kind === "hm");
        const a = hmAnswer(p.answer);
        if (durs.length !== 2)
          bad.push(`${tier} seed ${seed}: 시간이 ${durs.length}개`);
        else {
          const big = Math.max(durs[0]!.sec, durs[1]!.sec);
          const small = Math.min(durs[0]!.sec, durs[1]!.sec);
          if (big === small) bad.push(`${tier} seed ${seed}: 두 시간이 같다`);
          else if ((a.h * 60 + a.m) * 60 !== big - small)
            bad.push(`${tier} seed ${seed}: 차가 어긋난다 — ${p.content}`);
        }
      }

      const ap = generateElementaryProblem(planeUnit("1-5-6"), seed, "응용");
      const clocks = timeTokens(ap.content).filter((t) => t.kind === "clock");
      const a = hmAnswer(ap.answer);
      if (clocks.length !== 2)
        bad.push(`응용 seed ${seed}: 시각이 ${clocks.length}개`);
      else if (
        (a.h * 60 + a.m) * 60 !==
        Math.max(clocks[0]!.sec, clocks[1]!.sec) -
          Math.min(clocks[0]!.sec, clocks[1]!.sec)
      )
        bad.push(`응용 seed ${seed}: 걸린 시간이 어긋난다 — ${ap.content}`);

      const dp = generateElementaryProblem(planeUnit("1-5-6"), seed, "심화하");
      const rdurs = timeTokens(dp.content).filter((t) => t.kind === "hm");
      const da = hmAnswer(dp.answer);
      if (rdurs.length !== 2)
        bad.push(`심화 seed ${seed}: 시간이 ${rdurs.length}개`);
      else if ((da.h * 60 + da.m) * 60 !== rdurs[0]!.sec + rdurs[1]!.sec)
        bad.push(`심화 seed ${seed}: 되짚은 합이 어긋난다 — ${dp.content}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("모든 갈래의 답이 씨앗에 따라 갈린다 — 상수답 금지", () => {
    for (const code of LENTIME) {
      for (const tier of tiersOf(planeUnit(code))) {
        const answers = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1) {
          answers.add(
            generateElementaryProblem(planeUnit(code), seed, tier).answer,
          );
        }
        expect(
          answers.size,
          `${code} ${tier}: ${[...answers].slice(0, 4).join(" ")}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of LENTIME) {
      for (const tier of tiersOf(planeUnit(code))) {
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
    for (const code of LENTIME) {
      for (const seed of SEEDS) {
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 갈래 수를 **손으로 적지 않는다** — D-113 으로 확대 갈래가 차면
        // 「4」는 조용히 틀린 수가 된다. 물을 것은 「둘이 같아지지 않는가」다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(stems.length);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of LENTIME) {
      for (const tier of tiersOf(planeUnit(code))) {
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
 * 초3 1-6 분수와 소수 4단 확대 (D-72) — 일곱 소단원 전부.
 *
 * 그림이 있는 갈래는 **그림에서 참을 되살린다**(fracFigParts·filled — 이름표를 믿지
 * 않는다, D-61). 분수는 전부 진분수(분자<분모≤12), 소수는 한 자리·꼬리 0 없음.
 * 크기 비교는 어느 갈래에서도 동률이 나오면 안 된다 — 전 갈래에서 잠근다.
 */

/** 이름 갈래의 등장인물 어휘 — 정규식으로 «크기가» 같은 낱말을 이름으로 오독하지 않게 표로 찾는다. */
const KID_NAMES = [
  "가은",
  "나윤",
  "다인",
  "라온",
  "시우",
  "하람",
  "도현",
  "서진",
] as const;

/** 본문에 등장하는 두 이름을 **등장 순서대로**. */
function kidsIn(text: string): string[] {
  return KID_NAMES.filter((k) => text.includes(k)).sort(
    (a, b) => text.indexOf(a) - text.indexOf(b),
  );
}

/** 본문의 수를 소수·정수로 갈라 읽는다 — `0.1` 을 정수 0 과 1 로 쪼개 읽지 않기 위해서다. */
function fracDecNums(text: string): { decs: number[]; ints: number[] } {
  const inner = [...text.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]!).join(" ");
  const decs = [...inner.matchAll(/\d+\.\d+/g)].map((m) => m[0]);
  const stripped = inner
    .replace(/\d+\.\d+/g, " ")
    .replace(/\\frac\{\d+\}\{\d+\}/g, " ");
  const ints = [...stripped.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return { decs: decs.map(Number), ints };
}

/** 본문·답의 숫자 분수 — `\frac{□}{d}` 같은 미지수 분수는 걸리지 않는다. */
function fracsOf(text: string): { num: number; den: number }[] {
  return [...text.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => ({
    num: Number(m[1]),
    den: Number(m[2]),
  }));
}

describe("[초3 4단] 1-6 분수와 소수 — 일곱 소단원", () => {
  it("일곱 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of FRACDEC) {
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of FRACDEC) {
      for (const tier of tiersOf(planeUnit(code))) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("분수는 전부 진분수(분자<분모≤12), 소수는 한 자리·꼬리 0 없음", () => {
    const bad: string[] = [];
    for (const code of FRACDEC) {
      for (const tier of tiersOf(planeUnit(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const all = `${p.content} ${p.answer} ${p.solution}`;
          for (const f of fracsOf(all)) {
            if (f.num < 1 || f.num >= f.den || f.den > 12)
              bad.push(`${code} ${tier} seed ${seed}: ${f.num}/${f.den}`);
          }
          for (const m of all.matchAll(/\d+\.(\d+)/g)) {
            if (m[1]!.length !== 1 || m[1] === "0")
              bad.push(`${code} ${tier} seed ${seed}: 소수 ${m[0]}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("그림 갈래의 참은 그림에서 온다 — 등분 수·색칠 수가 답과 맞는다", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      const c1 = generateElementaryProblem(planeUnit("1-6-1"), seed, "연산");
      const s1 = c1.figureSpec as { kind?: string; filled?: number };
      if (answerOf(c1.answer) !== fracFigParts(s1))
        bad.push(
          `1-6-1 연산 seed ${seed}: 답 ${c1.answer} ≠ 그림 ${fracFigParts(s1)}등분`,
        );

      const a1 = generateElementaryProblem(planeUnit("1-6-1"), seed, "응용");
      const sa = a1.figureSpec as { kind?: string; filled?: number };
      const parts = fracFigParts(sa);
      if (parts % 2 !== 0)
        bad.push(`1-6-1 응용 seed ${seed}: 홀수 등분 ${parts}`);
      else if (answerOf(a1.answer) !== parts / 2)
        bad.push(`1-6-1 응용 seed ${seed}: 답 ${a1.answer} ≠ ${parts}/2`);

      const c2 = generateElementaryProblem(planeUnit("1-6-2"), seed, "연산");
      const s2 = c2.figureSpec as { kind?: string; filled?: number };
      const f2 = fracsOf(c2.answer)[0];
      if (!f2) bad.push(`1-6-2 연산 seed ${seed}: 답이 분수가 아니다`);
      else if (f2.den !== fracFigParts(s2) || f2.num !== s2.filled)
        bad.push(
          `1-6-2 연산 seed ${seed}: 답 ${c2.answer} ≠ 그림 ${s2.filled}/${fracFigParts(s2)}`,
        );

      const c3 = generateElementaryProblem(planeUnit("1-6-3"), seed, "연산");
      const s3 = c3.figureSpec as { kind?: string; filled?: number };
      const f3 = fracsOf(c3.answer)[0];
      if (!f3) bad.push(`1-6-3 연산 seed ${seed}: 답이 분수가 아니다`);
      else if (
        f3.den !== fracFigParts(s3) ||
        f3.num !== fracFigParts(s3) - (s3.filled ?? 0)
      )
        bad.push(
          `1-6-3 연산 seed ${seed}: 답 ${c3.answer} ≠ 그림 ${fracFigParts(s3) - (s3.filled ?? 0)}/${fracFigParts(s3)}`,
        );
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-6-1 — 기본은 곱, 심화는 되짚은 합이 발문의 수에서 다시 나온다", () => {
    for (const seed of SEEDS) {
      const w = generateElementaryProblem(planeUnit("1-6-1"), seed, "기본");
      const wi = fracDecNums(w.content).ints;
      expect(wi.length, `기본 seed ${seed}`).toBe(2);
      expect(answerOf(w.answer), `기본 seed ${seed}: ${w.content}`).toBe(
        wi[0]! * wi[1]!,
      );

      const d = generateElementaryProblem(planeUnit("1-6-1"), seed, "심화하");
      const di = fracDecNums(d.content).ints;
      expect(di.length, `심화 seed ${seed}`).toBe(2);
      expect(answerOf(d.answer), `심화 seed ${seed}: ${d.content}`).toBe(
        di[0]! + di[1]!,
      );
    }
  });

  it("1-6-2·1-6-3 — 문장 갈래의 분수·조각 수가 발문의 수에서 다시 나온다", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      const w2 = generateElementaryProblem(planeUnit("1-6-2"), seed, "기본");
      const w2i = fracDecNums(w2.content).ints;
      const w2f = fracsOf(w2.answer)[0]!;
      if (w2f.den !== w2i[0] || w2f.num !== w2i[1])
        bad.push(`1-6-2 기본 seed ${seed}: ${w2.content} / ${w2.answer}`);

      const a2 = generateElementaryProblem(planeUnit("1-6-2"), seed, "응용");
      const a2i = fracDecNums(a2.content).ints;
      const a2f = fracsOf(a2.answer)[0]!;
      if (a2f.den !== a2i[0] || a2f.num !== a2i[1]! + a2i[2]!)
        bad.push(`1-6-2 응용 seed ${seed}: ${a2.content} / ${a2.answer}`);

      // 심화 — 안 칠한 조각을 되짚은 **뒤 몇 조각을 더 칠해** 분수로 되돌린다(두 걸음).
      // 예전에는 «분모 $-$ 분자» 한 걸음이라 응용(두 조각을 더해 분수로)과 무게가 같았다.
      const d2 = generateElementaryProblem(planeUnit("1-6-2"), seed, "심화하");
      const d2f = fracsOf(d2.content)[0]!;
      const d2more = d2.content.match(/\$(\d+)\$조각을 더/);
      const d2ans = fracsOf(d2.answer)[0];
      if (!d2more || !d2ans) {
        bad.push(
          `1-6-2 심화 seed ${seed}: 더 칠할 조각 수를 못 읽음 — ${d2.content}`,
        );
      } else if (
        d2ans.den !== d2f.den ||
        d2ans.num !== d2f.num + Number(d2more[1]) ||
        d2ans.num >= d2f.den
      ) {
        bad.push(`1-6-2 심화 seed ${seed}: ${d2.content} / ${d2.answer}`);
      }

      const w3 = generateElementaryProblem(planeUnit("1-6-3"), seed, "기본");
      const w3i = fracDecNums(w3.content).ints;
      const w3f = fracsOf(w3.answer)[0]!;
      if (w3f.den !== w3i[0] || w3f.num !== w3i[0]! - w3i[1]!)
        bad.push(`1-6-3 기본 seed ${seed}: ${w3.content} / ${w3.answer}`);

      const a3 = generateElementaryProblem(planeUnit("1-6-3"), seed, "응용");
      const a3i = fracDecNums(a3.content).ints;
      const a3f = fracsOf(a3.answer)[0]!;
      if (a3f.den !== a3i[0] || a3f.num !== a3i[0]! - a3i[1]! - a3i[2]!)
        bad.push(`1-6-3 응용 seed ${seed}: ${a3.content} / ${a3.answer}`);
      if (a3f.num < 1) bad.push(`1-6-3 응용 seed ${seed}: 남은 조각 0`);

      // 심화 — 없어진 조각을 되짚은 **뒤 몇 조각을 더 먹고** 남은 부분을 분수로 되돌린다.
      const d3 = generateElementaryProblem(planeUnit("1-6-3"), seed, "심화하");
      const d3f = fracsOf(d3.content)[0]!;
      const d3more = d3.content.match(/\$(\d+)\$조각[이을] 더/);
      const d3ans = fracsOf(d3.answer)[0];
      if (!d3more || !d3ans) {
        bad.push(
          `1-6-3 심화 seed ${seed}: 더 먹을 조각 수를 못 읽음 — ${d3.content}`,
        );
      } else if (
        d3ans.den !== d3f.den ||
        d3ans.num !== d3f.num - Number(d3more[1]) ||
        d3ans.num < 1
      ) {
        bad.push(`1-6-3 심화 seed ${seed}: ${d3.content} / ${d3.answer}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-6-4 — 분모 같은 비교: 동률 불가·정답 정확·심화 세기", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      for (const tier of ["연산", "응용"] as const) {
        const p = generateElementaryProblem(planeUnit("1-6-4"), seed, tier);
        const fs = fracsOf(p.content);
        const want = tier === "연산" ? 2 : 3;
        if (fs.length < want) {
          bad.push(`${tier} seed ${seed}: 분수 ${fs.length}개`);
          continue;
        }
        const dens = new Set(fs.map((f) => f.den));
        const nums = fs.map((f) => f.num);
        if (dens.size !== 1) bad.push(`${tier} seed ${seed}: 분모가 다르다`);
        if (new Set(nums).size !== nums.length)
          bad.push(`${tier} seed ${seed}: 동률 분수`);
        const askBig = /더 큰|큰 쪽|큰 것|가장 큰/.test(p.content);
        const expected = askBig ? Math.max(...nums) : Math.min(...nums);
        const af = fracsOf(p.answer)[0]!;
        if (af.num !== expected)
          bad.push(`${tier} seed ${seed}: 답 ${p.answer} ≠ ${expected}`);
      }

      const w = generateElementaryProblem(planeUnit("1-6-4"), seed, "기본");
      const wf = fracsOf(w.content);
      const wNames = kidsIn(w.content);
      if (wf.length === 2 && wf[0]!.num !== wf[1]!.num && wNames.length === 2) {
        // 첫 이름이 첫 분수의 임자다 — 분자가 큰 쪽의 이름이 답이어야 한다.
        const winner = wf[0]!.num > wf[1]!.num ? wNames[0] : wNames[1];
        if (w.answer !== winner)
          bad.push(
            `기본 seed ${seed}: 답 ${w.answer} ≠ ${winner} — ${w.content}`,
          );
      } else bad.push(`기본 seed ${seed}: 분수·이름 짝을 못 읽음`);

      const d = generateElementaryProblem(planeUnit("1-6-4"), seed, "심화하");
      const df = fracsOf(d.content);
      if (df.length < 2) bad.push(`심화 seed ${seed}: 분수 ${df.length}개`);
      else {
        const lo = Math.min(df[0]!.num, df[1]!.num);
        const hi = Math.max(df[0]!.num, df[1]!.num);
        const count = hi - lo - 1;
        if (count < 1) bad.push(`심화 seed ${seed}: 사이가 비었다`);
        else if (answerOf(d.answer) !== count)
          bad.push(`심화 seed ${seed}: ${count} ≠ ${d.answer}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-6-5 — 단위분수 비교: 동률 불가·분모 작은 쪽이 크다·심화 세기", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      for (const tier of ["연산", "응용"] as const) {
        const p = generateElementaryProblem(planeUnit("1-6-5"), seed, tier);
        const dens = fracsOf(p.content).map((f) => f.den);
        if (new Set(dens).size !== dens.length)
          bad.push(`${tier} seed ${seed}: 같은 단위분수`);
        const askBig = /더 큰|큰 쪽|큰 것|가장 큰/.test(p.content);
        const expected = askBig ? Math.min(...dens) : Math.max(...dens);
        const af = fracsOf(p.answer)[0]!;
        if (af.den !== expected)
          bad.push(`${tier} seed ${seed}: 답 ${p.answer} ≠ 1/${expected}`);
      }

      const w = generateElementaryProblem(planeUnit("1-6-5"), seed, "기본");
      const wi = fracDecNums(w.content).ints;
      const wNames = kidsIn(w.content);
      if (wi.length >= 2 && wi[0] !== wi[1] && wNames.length === 2) {
        // 조각 수가 «적은» 쪽의 한 조각이 크다 — 첫 수가 첫 이름의 조각 수다.
        const winner = wi[0]! < wi[1]! ? wNames[0] : wNames[1];
        if (w.answer !== winner)
          bad.push(
            `기본 seed ${seed}: 답 ${w.answer} ≠ ${winner} — ${w.content}`,
          );
      } else bad.push(`기본 seed ${seed}: 수·이름을 못 읽음 — ${w.content}`);

      const d = generateElementaryProblem(planeUnit("1-6-5"), seed, "심화하");
      const dd = fracsOf(d.content).map((f) => f.den);
      const want =
        dd.length === 1
          ? dd[0]! - 2
          : Math.max(dd[0]!, dd[1]!) - Math.min(dd[0]!, dd[1]!) - 1;
      if (want < 1) bad.push(`심화 seed ${seed}: 셀 것이 없다`);
      else if (answerOf(d.answer) !== want)
        bad.push(`심화 seed ${seed}: ${want} ≠ ${d.answer} — ${d.content}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-6-6 — 분수·소수·자리 만들기의 총량이 발문에서 다시 나온다", () => {
    const bad: string[] = [];
    const tenthsOf = (a: string): number | null => {
      const dec = a.match(/^\$(\d+)\.(\d)\$$/);
      if (dec) return Number(dec[1]) * 10 + Number(dec[2]);
      return null;
    };
    for (const seed of SEEDS) {
      for (const tier of tiersOf(planeUnit("1-6-6"))) {
        const p = generateElementaryProblem(planeUnit("1-6-6"), seed, tier);
        const { decs, ints } = fracDecNums(p.content);
        const cf = fracsOf(p.content)[0];
        const af = fracsOf(p.answer)[0];
        const at = tenthsOf(p.answer);
        if (cf && at !== null) {
          // 분수 → 소수
          if (cf.den !== 10 || at !== cf.num)
            bad.push(`${tier} seed ${seed}: ${p.content} / ${p.answer}`);
        } else if (af && decs.length > 0) {
          // 소수 → 분수
          const t = Math.round(decs[0]! * 10);
          if (af.den !== 10 || af.num !== t)
            bad.push(`${tier} seed ${seed}: ${p.content} / ${p.answer}`);
        } else if (/잘라|썼|떼어/.test(p.content)) {
          // 심화 ⓑ — 소수를 mm 로 환산하고 **덜어 낸 뒤 다시 소수로** 되돌린다(세 걸음).
          // 예전에는 「$w.t$ cm 는 몇 mm」로 환산 한 번이라 응용보다도 쉬웠다.
          const target =
            decs.map((v) => Math.round(v * 10)).find((v) => v >= 10) ?? null;
          const cutM = p.content.match(/\$(\d+)\$ mm/);
          const af2 = fracDecNums(p.answer).decs[0] ?? null;
          if (target === null || !cutM || af2 === null) {
            bad.push(`${tier} seed ${seed}: 수를 못 읽음 — ${p.content}`);
          } else {
            const left = target - Number(cutM[1]);
            if (left < 1 || left % 10 === 0)
              bad.push(
                `${tier} seed ${seed}: 남은 길이가 소수로 안 선다 — ${left}`,
              );
            else if (Math.round(af2 * 10) !== left)
              bad.push(`${tier} seed ${seed}: ${p.content} / ${p.answer}`);
          }
        } else if (at !== null) {
          // 자리 만들기·변환 — 값 필터(1·10 제거)는 정당한 1 을 지운다. 형은 키워드·위치로 가른다.
          let want: number | null = null;
          if (/짜리/.test(p.content)) {
            // «$1$ 짜리 w개, $0.1$ 짜리 t개» → [1, w, t] / «$0.1$ 짜리 m개» → [m]
            want =
              ints.length >= 3 ? ints[1]! * 10 + ints[2]! : (ints[0] ?? null);
          } else if (/mm/.test(p.content)) {
            // «$k$ mm» → [k] / «$w$ cm $t$ mm» → [w, t]
            want = ints.length === 1 ? ints[0]! : ints[0]! * 10 + ints[1]!;
          } else if (ints.length === 2 && ints[0] === 10) {
            want = ints[1]!; // «$10$조각 중 $k$조각»
          } else if (ints.length === 3 && ints[1] === 10) {
            want = ints[0]! * 10 + ints[2]!; // «$w$개 + $10$등분 $t$조각»
          }
          if (want === null || at !== want)
            bad.push(`${tier} seed ${seed}: ${p.content} / ${p.answer}`);
        } else {
          // 심화 ⓐ 되짚기 — 답이 정수(개수), 발문 «목표 소수»의 십분 총량과 같다.
          // 발문에 $0.1$ 토큰이 함께 있으므로 십분값 10 이상(w ≥ 1)인 쪽이 목표다.
          const t =
            decs.map((v) => Math.round(v * 10)).find((v) => v >= 10) ?? null;
          if (t === null || answerOf(p.answer) !== t)
            bad.push(`${tier} seed ${seed}: ${p.content} / ${p.answer}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("1-6-7 — 소수 비교: 동률 불가·정답 정확·심화 세기", () => {
    const bad: string[] = [];
    for (const seed of SEEDS) {
      for (const tier of ["연산", "응용"] as const) {
        const p = generateElementaryProblem(planeUnit("1-6-7"), seed, tier);
        const vals = fracDecNums(p.content).decs.map((v) => Math.round(v * 10));
        if (new Set(vals).size !== vals.length)
          bad.push(`${tier} seed ${seed}: 동률 소수`);
        const askBig = /더 큰|큰 쪽|큰 것|가장 큰/.test(p.content);
        const expected = askBig ? Math.max(...vals) : Math.min(...vals);
        const a = p.answer.match(/^\$(\d+)\.(\d)\$$/);
        if (!a) bad.push(`${tier} seed ${seed}: 답 형식 ${p.answer}`);
        else if (Number(a[1]) * 10 + Number(a[2]) !== expected)
          bad.push(`${tier} seed ${seed}: 답 ${p.answer} ≠ ${expected}`);
      }

      const w = generateElementaryProblem(planeUnit("1-6-7"), seed, "기본");
      const wv = fracDecNums(w.content).decs.map((v) => Math.round(v * 10));
      const wNames = kidsIn(w.content);
      if (wv.length < 2 || wNames.length !== 2)
        bad.push(`기본 seed ${seed}: 못 읽음 — ${w.content}`);
      else {
        const winner = wv[0]! > wv[1]! ? wNames[0] : wNames[1];
        if (w.answer !== winner)
          bad.push(
            `기본 seed ${seed}: 답 ${w.answer} ≠ ${winner} — ${w.content}`,
          );
      }

      const d = generateElementaryProblem(planeUnit("1-6-7"), seed, "심화하");
      const dv = fracDecNums(d.content).decs.map((v) => Math.round(v * 10));
      if (dv.length < 2) bad.push(`심화 seed ${seed}: 소수 ${dv.length}개`);
      else {
        const lo = Math.min(dv[0]!, dv[1]!);
        const hi = Math.max(dv[0]!, dv[1]!);
        if (Math.floor(lo / 10) !== Math.floor(hi / 10))
          bad.push(`심화 seed ${seed}: 자연수부가 다르다 — ${d.content}`);
        const count = hi - lo - 1;
        if (count < 1) bad.push(`심화 seed ${seed}: 사이가 비었다`);
        else if (answerOf(d.answer) !== count)
          bad.push(`심화 seed ${seed}: ${count} ≠ ${d.answer}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("모든 갈래의 답이 씨앗에 따라 갈린다 — 상수답 금지", () => {
    for (const code of FRACDEC) {
      for (const tier of tiersOf(planeUnit(code))) {
        const answers = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1) {
          answers.add(
            generateElementaryProblem(planeUnit(code), seed, tier).answer,
          );
        }
        expect(
          answers.size,
          `${code} ${tier}: ${[...answers].slice(0, 4).join(" ")}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of FRACDEC) {
      for (const tier of tiersOf(planeUnit(code))) {
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
    for (const code of FRACDEC) {
      for (const seed of SEEDS) {
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 갈래 수를 **손으로 적지 않는다** — D-113 으로 확대 갈래가 차면
        // 「4」는 조용히 틀린 수가 된다. 물을 것은 「둘이 같아지지 않는가」다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(stems.length);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of FRACDEC) {
      for (const tier of tiersOf(planeUnit(code))) {
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
 * 초3 2-1 곱셈 4단 확대 (D-72) — 네 소단원 전부.
 *
 * **이름 약속 잠금이 이 블록의 알맹이다**(g4 elemTiersG4MulDiv 선례). 소단원 이름이
 * 「(세 자리 수)×(한 자리 수)」·「(몇십)×(몇십)…」·「(몇십몇)×(몇십몇)」을 약속하므로,
 * 지면에 실제로 찍힌 곱의 **자리 조건을 여기서 다시 판정**한다 — 표준까지 같은 잣대다
 * (수리 전 실측: 표준 2-1-3 이 씨앗 200 중 4건에서 (몇)×(몇십) 을 냈다).
 * 올림 횟수도 여기 다시 센다 — 제품 함수를 부르면 동어반복이 된다.
 */

const MUL21 = ["2-1-1", "2-1-2", "2-1-3", "2-1-4"] as const;

/** «몇십» = 두 자리이고 일의 자리가 0 · «몇십몇» = 두 자리이고 일의 자리가 0 이 아니다. */
const isTens21 = (v: number) => v >= 10 && v <= 99 && v % 10 === 0;
const isTensOnes21 = (v: number) => v >= 10 && v <= 99 && v % 10 !== 0;
const isOne21 = (v: number) => v >= 1 && v <= 9;
const isThree21 = (v: number) => v >= 100 && v <= 999;

/** 소단원 이름이 허락하는 곱의 꼴인가 — 이름을 여기 다시 적는다. */
function shapeOk21(code: string, a: number, b: number): boolean {
  if (code === "2-1-1" || code === "2-1-2") return isThree21(a) && isOne21(b);
  if (code === "2-1-3")
    return (
      (isTens21(a) && isTens21(b)) ||
      (isTensOnes21(a) && isTens21(b)) ||
      (isOne21(a) && isTensOnes21(b))
    );
  return isTensOnes21(a) && isTensOnes21(b);
}

/** (세 자리)×(한 자리) 의 올림 횟수 — 생성기와 **따로** 센다. */
function carries3x1(a: number, b: number): number {
  let count = 0;
  let carry = 0;
  for (let d = 0; d < 3; d += 1) {
    const digit = Math.floor(a / 10 ** d) % 10;
    const v = digit * b + carry;
    carry = Math.floor(v / 10);
    if (carry > 0) count += 1;
  }
  return count;
}

/** 이름이 약속한 올림 횟수 — 「(1)」 0~1번, 「(2)」 2~3번. */
const CARRY_BAND21: Record<string, [number, number]> = {
  "2-1-1": [0, 1],
  "2-1-2": [2, 3],
};

describe("[초3 4단] 2-1 곱셈 — 네 소단원 (표준 포함)", () => {
  it("네 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of MUL21) {
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of MUL21) {
      for (const tier of tiersOf(planeUnit(code))) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  // ── 이름 약속 ⑴ 자리 조건 — 표준은 씨앗 200개로 넓게 본다.
  // 수리 전 실측 4/200(전부 (몇)×(몇십))이라 16개로는 놓친다.
  it("2-1 표준 생성기의 곱이 씨앗 200개에서 모두 이름대로다", () => {
    const bad: string[] = [];
    for (const code of MUL21) {
      for (let seed = 0; seed < 200; seed += 1) {
        const p = generateElementaryProblem(planeUnit(code), seed);
        const m = p.content.match(/\$(\d+)\\times(\d+)=/);
        if (!m) {
          bad.push(`${code} 표준 seed ${seed}: 곱셈식이 발문에 없다`);
          continue;
        }
        const a = Number(m[1]);
        const b = Number(m[2]);
        if (!shapeOk21(code, a, b))
          bad.push(`${code} 표준 seed ${seed}: ${a}×${b} — 이름과 다른 꼴`);
        const band = CARRY_BAND21[code];
        if (band) {
          const c = carries3x1(a, b);
          if (c < band[0] || c > band[1])
            bad.push(
              `${code} 표준 seed ${seed}: ${a}×${b} — 올림 ${c}번 (약속 ${band[0]}~${band[1]})`,
            );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ── 이름 약속 ⑵ 갈래도 같은 잣대 — 해설에 찍힌 **모든** 곱을 본다.
  it("네 갈래 해설의 모든 곱이 이름이 약속한 자리·올림이다", () => {
    const bad: string[] = [];
    for (const code of MUL21) {
      for (const tier of tiersOf(planeUnit(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const muls = divSteps(p.solution).filter((s) => s.op === "×");
          if (muls.length === 0) {
            bad.push(`${code} ${tier} seed ${seed}: 곱셈 스텝이 없다`);
            continue;
          }
          for (const s of muls) {
            if (s.a * s.b !== s.c)
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}×${s.b}=${s.c} (참 ${s.a * s.b})`,
              );
            if (!shapeOk21(code, s.a, s.b))
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}×${s.b} — 이름과 다른 꼴`,
              );
            const band = CARRY_BAND21[code];
            if (band) {
              const c = carries3x1(s.a, s.b);
              if (c < band[0] || c > band[1])
                bad.push(
                  `${code} ${tier} seed ${seed}: ${s.a}×${s.b} — 올림 ${c}번 (약속 ${band[0]}~${band[1]})`,
                );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("해설의 모든 셈이 맞고, 정답은 마지막 스텝의 값과 같다", () => {
    for (const code of MUL21) {
      for (const tier of tiersOf(planeUnit(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const st = divSteps(p.solution);
          expect(
            st.length,
            `${code} ${tier} seed ${seed}: 식이 없다`,
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
              `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b}`,
            ).toBe(s.c);
          }
          // 1~3단은 마지막 스텝이 곧 답이다. **심화 셋**은 되짚거나 후보를 견주는
          // 갈래라 마지막 셈이 답이 아니다 — 각자 아래(심화하)와
          // `elemTiersG3Mul21Extend.test.ts`(심화중·심화상)에서 **답을 발문에서
          // 다시 세워** 확인한다. 여기서 느슨하게 두는 대신 그쪽이 더 세게 문다.
          if (!tier.startsWith("심화"))
            expect(
              answerOf(p.answer),
              `${code} ${tier} seed ${seed}: ${p.solution}`,
            ).toBe(st[st.length - 1]!.c);
        }
      }
    }
  });

  it("D-72 축 — 1단 곱 한 번 · 2단 문장 · 3단 곱하고 더하거나 덜기", () => {
    for (const code of MUL21) {
      for (const seed of SEEDS) {
        const calc = divSteps(
          generateElementaryProblem(planeUnit(code), seed, "연산").solution,
        );
        expect(calc.length, `${code} 연산 seed ${seed}`).toBe(1);
        expect(calc[0]!.op, `${code} 연산 seed ${seed}`).toBe("×");

        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        expect(word.content, `${code} 기본 seed ${seed}`).not.toMatch(
          /\\times|\\div|\\square/,
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
          apply.slice(1).some((t) => t.a === apply[0]!.c),
          `${code} 응용 seed ${seed}: 곱이 다음 셈으로 안 이어진다`,
        ).toBe(true);
      }
    }
  });

  // ── 1~3단의 답을 **발문의 수**에서 다시 구한다.
  it("2-1 연산·응용의 답이 발문의 수에서 다시 나온다", () => {
    for (const code of MUL21) {
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(planeUnit(code), seed, "연산");
        const cm = calc.content.match(/\$(\d+)\\times(\d+)/);
        if (cm) {
          expect(answerOf(calc.answer), `${code} 연산 seed ${seed}`).toBe(
            Number(cm[1]) * Number(cm[2]),
          );
        } else {
          // 「두 수의 곱을 구하시오. $a$, $b$」 틀 — 수 두 개가 곱해진다.
          const ns = nums(calc.content);
          expect(ns.length, `${code} 연산 seed ${seed}`).toBe(2);
          expect(answerOf(calc.answer), `${code} 연산 seed ${seed}`).toBe(
            ns[0]! * ns[1]!,
          );
        }

        // 응용은 «남은» 이면 덜어내고 아니면 더한다 — 발문의 말이 곧 셈이다.
        const apply = generateElementaryProblem(planeUnit(code), seed, "응용");
        const an = nums(apply.content);
        expect(an.length, `${code} 응용 seed ${seed}: ${apply.content}`).toBe(
          3,
        );
        const [x, y, z] = an as [number, number, number];
        const minus = /남은/.test(apply.content);
        expect(
          answerOf(apply.answer),
          `${code} 응용 seed ${seed}: ${apply.content}`,
        ).toBe(minus ? x * y - z : x * y + z);
      }
    }
  });

  // ── 4단 — 틀마다 답을 발문에서 되짚는다. 발문에 답이 그대로 보이면 안 된다.
  it("2-1-1·2-1-2 심화 — 세 틀의 답이 발문에서 역산으로 나온다", () => {
    for (const code of ["2-1-1", "2-1-2"] as const) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(planeUnit(code), seed, "심화하");
        const ans = answerOf(p.answer);
        const masked = p.content.match(
          /\$(\d*)\\square(\d*)\\times(\d+)=(\d+)\$/,
        );
        const boxMul = p.content.match(/\$(\d+)\\times\\square=(\d+)\$/);
        if (masked) {
          // ㉡ 가린 자리 — 0..9 를 넣어 보면 답이 **하나뿐**이어야 한다.
          const [, head, tail, mulStr, prodStr] = masked as unknown as string[];
          const fits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
            (d) =>
              Number(`${head}${d}${tail}`) * Number(mulStr) === Number(prodStr),
          );
          expect(fits, `${code} 심화 seed ${seed}: ${p.content}`).toEqual([
            ans,
          ]);
        } else if (boxMul) {
          // ㉠ 곱하는 수 되짚기 — 식이 실린 틀.
          expect(Number(boxMul[1]) * ans, `${code} 심화 seed ${seed}`).toBe(
            Number(boxMul[2]),
          );
          expect(ans, `${code} 심화 seed ${seed}: 한 자리`).toBeLessThan(10);
        } else if (p.content.includes("\\square")) {
          // ㉠ 「$a$ 씩 $\square$ 묶음이면 모두 $p$」 틀 — 발문의 두 수로 되짚는다.
          const ns = nums(p.content);
          expect(ns.length, `${code} 심화 seed ${seed}: ${p.content}`).toBe(2);
          expect(ns[0]! * ans, `${code} 심화 seed ${seed}`).toBe(ns[1]!);
          expect(ans, `${code} 심화 seed ${seed}: 한 자리`).toBeLessThan(10);
        } else {
          // ㉢ 되짚어 다시 곱하기 — $b$·$p$·$b2$ 순으로 발문에 선다.
          const ns = nums(p.content);
          expect(ns.length, `${code} 심화 seed ${seed}: ${p.content}`).toBe(3);
          const [b, prod, b2] = ns as [number, number, number];
          expect(prod % b, `${code} 심화 seed ${seed}: 나누어떨어져야`).toBe(0);
          expect(ans, `${code} 심화 seed ${seed}`).toBe((prod / b) * b2);
          expect(
            b2,
            `${code} 심화 seed ${seed}: 두 번 같은 수로 곱하면 답이 보인다`,
          ).not.toBe(b);
        }
        expect(
          p.content.includes(`$${ans}$`),
          `${code} 심화 seed ${seed}: 답이 발문에 그대로 보인다`,
        ).toBe(false);
      }
    }
  });

  it("2-1-3 심화 — 두 틀의 답이 발문의 곱셈식에서 다시 나온다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(planeUnit("2-1-3"), seed, "심화하");
      const ans = answerOf(p.answer);
      const m = p.content.match(/\$\\square\\times(\d+)=(\d+)\$/);
      if (m) {
        expect(ans * Number(m[1]), `2-1-3 심화 seed ${seed}`).toBe(
          Number(m[2]),
        );
      } else {
        const ns = nums(p.content);
        expect(ns.length, `2-1-3 심화 seed ${seed}: ${p.content}`).toBe(2);
        expect(ans * ns[0]!, `2-1-3 심화 seed ${seed}`).toBe(ns[1]!);
      }
      // 되짚은 값도 이름의 꼴 안이다 — 몇십이거나 한 자리다.
      expect(
        isTens21(ans) || isOne21(ans),
        `2-1-3 심화 seed ${seed}: 답 ${ans}`,
      ).toBe(true);
    }
  });

  it("2-1-4 심화 — 카드 네 장의 가장 큰·작은 곱을 전수 비교로 다시 구한다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(planeUnit("2-1-4"), seed, "심화하");
      const cards = nums(p.content);
      expect(cards.length, `2-1-4 심화 seed ${seed}: ${p.content}`).toBe(4);
      expect(
        new Set(cards).size,
        `2-1-4 심화 seed ${seed}: 카드가 겹친다`,
      ).toBe(4);
      for (const c of cards)
        expect(isOne21(c), `2-1-4 심화 seed ${seed}: 카드 ${c}`).toBe(true);
      // ⚠️ 어느 쪽을 묻는지 **발문이 말하게** 한다 — 한쪽만 보고 나머지를 기본값으로
      // 떨어뜨리면 「가장 클 때」를 못 읽고도 조용히 작은 쪽으로 채점한다(실측 1건).
      const askBig = /가장 큰|가장 클 때|가장 크게/.test(p.content);
      const askSmall = /가장 작은|가장 작을 때|가장 작게/.test(p.content);
      expect(
        askBig !== askSmall,
        `2-1-4 심화 seed ${seed}: 큰·작은 어느 쪽인지 발문이 말하지 않는다 — ${p.content}`,
      ).toBe(true);
      let best = askBig ? -1 : Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < 4; i += 1)
        for (let j = 0; j < 4; j += 1)
          for (let k = 0; k < 4; k += 1)
            for (let l = 0; l < 4; l += 1) {
              if (new Set([i, j, k, l]).size !== 4) continue;
              const v =
                (cards[i]! * 10 + cards[j]!) * (cards[k]! * 10 + cards[l]!);
              if (askBig ? v > best : v < best) best = v;
            }
      expect(answerOf(p.answer), `2-1-4 심화 seed ${seed}: ${p.content}`).toBe(
        best,
      );
    }
  });

  it("모든 갈래의 답이 씨앗에 따라 갈린다 — 상수답 금지", () => {
    for (const code of MUL21) {
      for (const tier of tiersOf(planeUnit(code))) {
        const seen = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1)
          seen.add(
            generateElementaryProblem(planeUnit(code), seed, tier).answer,
          );
        expect(seen.size, `${code} ${tier} 상수답`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of MUL21) {
      for (const tier of tiersOf(planeUnit(code))) {
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
    for (const code of MUL21) {
      for (const seed of SEEDS) {
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 상수 `4` 를 쓰면 갈래를 채운 날 이 시험이 **거짓으로** 빨개진다
        //    (D-113 으로 2-1 은 여섯이 됐다). 이 시험이 원래 물으려던 것은
        //    「등록된 갈래가 전부 서로 다르다」이고, 그 수는 갈래와 함께 움직인다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(tiersOf(planeUnit(code)).length);
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of MUL21) {
      for (const tier of [undefined, ...tiersOf(planeUnit(code))]) {
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
                `${code} ${tier ?? "표준"} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(
                `${code} ${tier ?? "표준"} seed ${seed} ${label}: ${text.match(risk)![0]}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // 해설이 그 학년까지 배운 연산만 쓰는가(D-66⑶) — 2-1 에서 나눗셈은 아직 안 배웠다.
  it("2-1 갈래 해설에 나눗셈이 없다 — 나눗셈은 2-2 다", () => {
    for (const code of MUL21) {
      for (const tier of tiersOf(planeUnit(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          expect(p.solution, `${code} ${tier} seed ${seed}`).not.toMatch(
            /\\div/,
          );
        }
      }
    }
  });
});

/**
 * 초3 2-2 나눗셈 4단 확대 (D-72) — 네 소단원 전부.
 *
 * **이름 약속 잠금이 이 블록의 알맹이다.** 이름이 자리(몇십·몇십몇·세 자리)와
 * **내림 유무·나머지 유무**를 약속하므로, 지면에 실제로 찍힌 나눗셈에서 그 셋을
 * **여기서 다시 판정**한다 — 표준 200씨앗까지 같은 잣대다(수리 전 실측: 표준 2-2-3 이
 * 씨앗 200 중 20건에서 (몇십)÷(몇) 을 냈다).
 *
 * 갈래 판정에는 **도달 수**를 함께 센다 — 틀을 못 알아보고 조용히 다른 갈래로 떨어지면
 * 「0건 위반」이 「깨끗」이 아니라 「못 셈」이 된다(2026-08-21 «가드가 0을 내면»).
 */

const DIV22 = ["2-2-1", "2-2-2", "2-2-3", "2-2-4"] as const;

/** 십의 자리를 나누고 남는 것이 있으면 «내림» 이다 — 생성기와 **따로** 센다. */
const carryDown = (a: number, b: number) => Math.floor(a / 10) % b !== 0;

/** 발문에 실제로 찍힌 나눗셈 — `$a\div b$`. 여러 개면 나온 순서대로. */
function divPairs(text: string): [number, number][] {
  return [...text.matchAll(/\$(\d+)\\div(\d+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

/** 「몫 $q$, 나머지 $r$」 꼴 정답. 아니면 null. */
function quotRem(answer: string): { q: number; r: number } | null {
  const m = answer.match(/^몫 \$(\d+)\$, 나머지 \$(\d+)\$$/);
  return m ? { q: Number(m[1]), r: Number(m[2]) } : null;
}

/** 소단원 이름이 약속한 것을 여기 다시 적는다. */
function promiseOk22(code: string, a: number, b: number): string | null {
  const digits = String(a).length;
  const r = a % b;
  if (code === "2-2-1" || code === "2-2-2") {
    if (digits !== 2) return `${a}÷${b} — 두 자리가 아니다`;
    if (r !== 0) return `${a}÷${b} — 나머지 ${r}`;
    const want = code === "2-2-2";
    if (carryDown(a, b) !== want)
      return `${a}÷${b} — 내림 ${carryDown(a, b) ? "있음" : "없음"} (약속 ${want ? "있음" : "없음"})`;
    return null;
  }
  if (code === "2-2-3") {
    if (digits !== 2 || a % 10 === 0) return `${a}÷${b} — «몇십몇» 이 아니다`;
    if (r === 0) return `${a}÷${b} — 나머지가 없다`;
    return null;
  }
  if (digits !== 3) return `${a}÷${b} — 세 자리가 아니다`;
  if (String(b).length !== 1) return `${a}÷${b} — 나누는 수가 한 자리가 아니다`;
  return null;
}

describe("[초3 4단] 2-2 나눗셈 — 네 소단원 (표준 포함)", () => {
  it("네 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of DIV22) {
      expectCoreTiers(planeUnit(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of DIV22) {
      for (const tier of tiersOf(planeUnit(code))) {
        const a = generateElementaryProblem(planeUnit(code), 4242, tier);
        const b = generateElementaryProblem(planeUnit(code), 4242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  // ── 이름 약속 ⑴ 표준은 씨앗 200개로 넓게. 수리 전 실측 20/200 이라 16개로는 놓친다.
  it("2-2 표준 생성기의 나눗셈이 씨앗 200개에서 모두 이름대로다", () => {
    const bad: string[] = [];
    for (const code of DIV22) {
      for (let seed = 0; seed < 200; seed += 1) {
        const p = generateElementaryProblem(planeUnit(code), seed);
        const pairs = divPairs(p.content);
        if (pairs.length === 0) {
          bad.push(`${code} 표준 seed ${seed}: 나눗셈식이 발문에 없다`);
          continue;
        }
        for (const [a, b] of pairs) {
          const why = promiseOk22(code, a, b);
          if (why) bad.push(`${code} 표준 seed ${seed}: ${why}`);
          if (a % b >= b)
            bad.push(`${code} 표준 seed ${seed}: 나머지가 나누는 수 이상`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ── 이름 약속 ⑵ 갈래도 같은 잣대. 발문에 식이 없는 갈래는 해설의 나눗셈으로 본다.
  it("네 갈래에 실린 나눗셈이 모두 이름이 약속한 자리·내림·나머지다", () => {
    const bad: string[] = [];
    let seen = 0;
    for (const code of DIV22) {
      for (const tier of tiersOf(planeUnit(code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const pairs = [...divPairs(p.content), ...divPairs(p.solution)] as [
            number,
            number,
          ][];
          if (pairs.length === 0) {
            // 역산 갈래는 나뉘는 수가 **답**이라 지면에 수로 안 선다($\square\div b$ ·
            // $1\square4\div b$). 값 검산은 심화 검사가 한다 — 여기서 수를 주워 담으면
            // 「$\square41\div3$」의 $41$ 을 나뉘는 수로 읽는다(실측 7건).
            if (/\\square/.test(p.content)) {
              expect(
                tier,
                `${code} ${tier} seed ${seed}: □ 가 심화 밖에 있다`,
              ).toBe("심화하");
              continue;
            }
            // 문장 갈래는 기호 없이 수만 선다(2단은 식을 학생이 세운다) —
            // **건너뛰지 않는다.** 앞 두 수가 나뉘는 수·나누는 수다.
            const ns = nums(p.content);
            if (ns.length < 2) {
              bad.push(`${code} ${tier} seed ${seed}: 나눗셈이 어디에도 없다`);
              continue;
            }
            pairs.push([ns[0]!, ns[1]!]);
          }
          for (const [a, b] of pairs) {
            seen += 1;
            const why = promiseOk22(code, a, b);
            if (why) bad.push(`${code} ${tier} seed ${seed}: ${why}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 0 이 「깨끗」인지 「못 셈」인지 가른다 — 실제로 센 나눗셈이 있어야 한다.
    expect(seen, "나눗셈을 하나도 못 읽었다").toBeGreaterThan(200);
  });

  it("해설의 모든 셈이 맞다 — 나머지가 있으면 등식으로 적지 않는다", () => {
    const bad: string[] = [];
    for (const code of DIV22) {
      for (const tier of [undefined, ...tiersOf(planeUnit(code))]) {
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
            if (want !== s.c)
              bad.push(
                `${code} ${tier ?? "표준"} seed ${seed}: ${s.a}${s.op}${s.b}=${s.c} (참 ${want})`,
              );
            // ⚠️ 나눗셈을 **등식**으로 적었으면 나누어떨어져야 한다.
            if (s.op === "÷" && s.a % s.b !== 0)
              bad.push(
                `${code} ${tier ?? "표준"} seed ${seed}: ${s.a}÷${s.b}=${s.c} 인데 나머지 ${s.a % s.b}`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("D-72 축 — 1단 한 단계 · 2단 문장 · 3단 두 단계", () => {
    for (const code of DIV22) {
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(planeUnit(code), seed, "연산");
        expect(
          divPairs(calc.content).length,
          `${code} 연산 seed ${seed}: 식이 발문에 없다`,
        ).toBe(1);

        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        expect(word.content, `${code} 기본 seed ${seed}`).not.toMatch(
          /\\div|\\times|\\square/,
        );
        expect(
          word.content.length,
          `${code} 기본 seed ${seed}`,
        ).toBeGreaterThan(20);

        // 3단은 몫을 구한 뒤 한 걸음 더 간다 — 해설에 셈이 둘 이상이고 답이 몫이 아니다.
        const apply = generateElementaryProblem(planeUnit(code), seed, "응용");
        const st = divSteps(apply.solution);
        expect(
          st.length,
          `${code} 응용 seed ${seed}: ${apply.solution}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  // ── 1~3단의 답을 발문의 수에서 다시 구한다. 틀마다 도달 수를 센다.
  it("2-2-1·2-2-2 — 연산·기본·응용의 답이 발문의 수에서 다시 나온다", () => {
    let mul = 0;
    let sub = 0;
    for (const code of ["2-2-1", "2-2-2"] as const) {
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(planeUnit(code), seed, "연산");
        const [[a, b]] = divPairs(calc.content) as [[number, number]];
        expect(answerOf(calc.answer), `${code} 연산 seed ${seed}`).toBe(a / b);

        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        const wn = nums(word.content);
        expect(wn.length, `${code} 기본 seed ${seed}: ${word.content}`).toBe(2);
        expect(answerOf(word.answer), `${code} 기본 seed ${seed}`).toBe(
          wn[0]! / wn[1]!,
        );

        const apply = generateElementaryProblem(planeUnit(code), seed, "응용");
        const an = nums(apply.content);
        expect(an.length, `${code} 응용 seed ${seed}: ${apply.content}`).toBe(
          3,
        );
        const [x, y, z] = an as [number, number, number];
        const minus = /남은/.test(apply.content);
        if (minus) sub += 1;
        else mul += 1;
        expect(
          answerOf(apply.answer),
          `${code} 응용 seed ${seed}: ${apply.content}`,
        ).toBe(minus ? x / y - z : (x / y) * z);
      }
    }
    expect(mul, "「그중 몇 묶음」 틀에 한 번도 안 닿았다").toBeGreaterThan(0);
    expect(sub, "「덜어내기」 틀에 한 번도 안 닿았다").toBeGreaterThan(0);
  });

  it("2-2-3 — 몫·나머지가 발문의 수에서 다시 나오고, 네 갈래가 서로 다른 것을 묻는다", () => {
    const frames = new Map<string, number>();
    const bump = (k: string) => frames.set(k, (frames.get(k) ?? 0) + 1);
    for (const seed of SEEDS) {
      const calc = generateElementaryProblem(planeUnit("2-2-3"), seed, "연산");
      const [[a, b]] = divPairs(calc.content) as [[number, number]];
      const qr = quotRem(calc.answer);
      expect(qr, `2-2-3 연산 seed ${seed}: ${calc.answer}`).not.toBeNull();
      expect(qr!.q, `2-2-3 연산 seed ${seed}`).toBe(Math.floor(a / b));
      expect(qr!.r, `2-2-3 연산 seed ${seed}`).toBe(a % b);
      expect(
        qr!.r,
        `2-2-3 연산 seed ${seed}: 나머지가 나누는 수 이상`,
      ).toBeLessThan(b);

      const word = generateElementaryProblem(planeUnit("2-2-3"), seed, "기본");
      const wn = nums(word.content);
      expect(wn.length, `2-2-3 기본 seed ${seed}: ${word.content}`).toBe(2);
      const [wa, wb] = wn as [number, number];
      const asksRest = /남는/.test(word.content);
      bump(asksRest ? "기본:남는 것" : "기본:가득 채운 것");
      expect(answerOf(word.answer), `2-2-3 기본 seed ${seed}`).toBe(
        asksRest ? wa % wb : Math.floor(wa / wb),
      );

      const apply = generateElementaryProblem(planeUnit("2-2-3"), seed, "응용");
      const an = nums(apply.content);
      expect(an.length, `2-2-3 응용 seed ${seed}: ${apply.content}`).toBe(2);
      const [aa, ab] = an as [number, number];
      const needsMore = /적어도/.test(apply.content);
      bump(needsMore ? "응용:한 묶음 더" : "응용:채우려면");
      expect(answerOf(apply.answer), `2-2-3 응용 seed ${seed}`).toBe(
        needsMore ? Math.floor(aa / ab) + 1 : ab - (aa % ab),
      );

      const deep = generateElementaryProblem(
        planeUnit("2-2-3"),
        seed,
        "심화하",
      );
      const dn = nums(deep.content);
      // 문장 틀 «$a$ 에 … 나누는 수가 $b$ 인 나눗셈» 은 두 수를 글로 세운다 — 같은 나눗셈 줄을 또 찍지 않는다(2026-10-20).
      const said = /^\$(\d+)\$ 에 적어도 얼마를 더해야 나누는 수가 \$(\d+)\$ 인 나눗셈/.exec(deep.content);
      const pairs: [number, number][] = said
        ? [[Number(said[1]), Number(said[2])]]
        : divPairs(deep.content);
      expect(
        said !== null || /\\div/.test(deep.content),
        `2-2-3 심화 seed ${seed}: 나눗셈 꼴이 지면에 안 선다 — ${deep.content}`,
      ).toBe(true);
      if (pairs.length > 0) {
        // ㉡ 나누어떨어지게 하려면 — 발문에 나눗셈식이 있다.
        bump("심화하:나누어떨어지게");
        const [da, db] = pairs[0]!;
        expect(answerOf(deep.answer), `2-2-3 심화 seed ${seed}`).toBe(
          db - (da % db),
        );
      } else {
        // ㉠ 몫·나머지에서 나뉘는 수 되짚기. 나누는 수는 $\square\div b$ 에서 읽고,
        // 몫·나머지는 문장에 선다 — 순서가 틀마다 달라 짝을 찾아 맞댄다.
        bump("심화하:나뉘는 수");
        const boxed = deep.content.match(/\$\\square\\div(\d+)\$/);
        expect(
          boxed,
          `2-2-3 심화 seed ${seed}: ${deep.content}`,
        ).not.toBeNull();
        const db = Number(boxed![1]);
        const ans = answerOf(deep.answer);
        expect(
          promiseOk22("2-2-3", ans, db),
          `2-2-3 심화 seed ${seed}`,
        ).toBeNull();
        const ok = dn.some((q0) =>
          dn.some((r0) => db * q0 + r0 === ans && r0 >= 1 && r0 < db),
        );
        expect(ok, `2-2-3 심화 seed ${seed}: ${deep.content} → ${ans}`).toBe(
          true,
        );
      }
    }
    // 여섯 틀에 모두 닿았는가 — 안 닿은 틀은 위 검사가 **구조적으로 못 본다**.
    for (const key of [
      "기본:남는 것",
      "기본:가득 채운 것",
      "응용:한 묶음 더",
      "응용:채우려면",
      "심화하:나누어떨어지게",
      "심화하:나뉘는 수",
    ]) {
      expect(
        frames.get(key) ?? 0,
        `${key} 틀에 한 번도 안 닿았다`,
      ).toBeGreaterThan(0);
    }
  });

  it("2-2-4 — 연산·기본·응용의 답이 발문의 수에서 다시 나온다", () => {
    let plus = 0;
    let minus = 0;
    for (const seed of SEEDS) {
      const calc = generateElementaryProblem(planeUnit("2-2-4"), seed, "연산");
      const [[a, b]] = divPairs(calc.content) as [[number, number]];
      expect(answerOf(calc.answer), `2-2-4 연산 seed ${seed}`).toBe(a / b);

      const word = generateElementaryProblem(planeUnit("2-2-4"), seed, "기본");
      const wn = nums(word.content);
      expect(wn.length, `2-2-4 기본 seed ${seed}: ${word.content}`).toBe(2);
      expect(answerOf(word.answer), `2-2-4 기본 seed ${seed}`).toBe(
        wn[0]! / wn[1]!,
      );

      const apply = generateElementaryProblem(planeUnit("2-2-4"), seed, "응용");
      const an = nums(apply.content);
      expect(an.length, `2-2-4 응용 seed ${seed}: ${apply.content}`).toBe(3);
      const [x, y, z] = an as [number, number, number];
      const isMinus = /남은|썼습니다|팔았습니다|마셨습니다/.test(apply.content);
      if (isMinus) minus += 1;
      else plus += 1;
      expect(
        answerOf(apply.answer),
        `2-2-4 응용 seed ${seed}: ${apply.content}`,
      ).toBe(isMinus ? x / y - z : x / y + z);
    }
    expect(plus, "「더 받기」 틀에 한 번도 안 닿았다").toBeGreaterThan(0);
    expect(minus, "「덜어내기」 틀에 한 번도 안 닿았다").toBeGreaterThan(0);
  });

  // ── 4단 — 역산 틀마다 답을 발문에서 되짚는다.
  it("2-2-1·2-2-2·2-2-4 심화 — 역산의 답이 발문에서 다시 나오고 답이 발문에 안 보인다", () => {
    const frames = new Map<string, number>();
    const bump = (k: string) => frames.set(k, (frames.get(k) ?? 0) + 1);
    for (const code of ["2-2-1", "2-2-2", "2-2-4"] as const) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(planeUnit(code), seed, "심화하");
        const ans = answerOf(p.answer);
        // ⚠️ 틀을 **구조**로 가른다(문구로 가르면 문장 하나 고칠 때 조용히 갈래가
        // 바뀐다). 먼저 「나뉘는 수만 □」 를 보고, 그다음 「자리 하나만 □」 를 본다 —
        // 순서를 바꾸면 앞것이 뒤것의 자리까지 삼킨다(head·tail 이 빈 문자열이어도 맞다).
        const boxDiv = p.content.match(/\$\\square\\div(\d+)=(\d+)\$/);
        const masked = boxDiv
          ? null
          : p.content.match(/\$(\d*)\\square(\d*)\\div(\d+)=(\d+)\$/);
        const boxOnly = p.content.match(/\$\\square\\div(\d+)\$/);
        if (masked) {
          bump(`${code}:가린 자리`);
          const [, head, tail, bStr, qStr] = masked as unknown as string[];
          expect(
            `${head}${tail}`.length,
            `${code} 심화 seed ${seed}: 가린 자리가 없다`,
          ).toBe(2);
          expect(
            tail.length,
            `${code} 심화 seed ${seed}: 일의 자리를 가리면 답이 하나가 아니다`,
          ).toBeGreaterThan(0);
          // 「몫」은 나머지가 있어도 몫이다 — **버림 나눗셈**으로 세어야 답이 하나임을
          // 진짜로 보인다. 일의 자리를 가리면 여기서 여럿이 나온다.
          const fits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
            (d) =>
              Math.floor(Number(`${head}${d}${tail}`) / Number(bStr)) ===
              Number(qStr),
          );
          expect(fits, `${code} 심화 seed ${seed}: ${p.content}`).toEqual([
            ans,
          ]);
        } else if (boxDiv) {
          bump(`${code}:나뉘는 수`);
          expect(ans, `${code} 심화 seed ${seed}`).toBe(
            Number(boxDiv[1]) * Number(boxDiv[2]),
          );
          // 되짚은 나뉘는 수도 이름 약속 안이어야 한다 — 지면에 수로 안 서므로
          // 위 ⑵ 검사가 못 보는 자리다.
          expect(
            promiseOk22(code, ans, Number(boxDiv[1])),
            `${code} 심화 seed ${seed}`,
          ).toBeNull();
        } else {
          // 잘못 곱한 결과에서 바른 몫. 지면에는 나누는 수 $b$ 와 잘못된 곱 $ab$ 가
          // 서고, 바르게 할 나눗셈은 나뉘는 수를 가린 채 실린다.
          bump(`${code}:잘못 곱함`);
          expect(
            boxOnly,
            `${code} 심화 seed ${seed}: 나눗셈 꼴이 지면에 안 선다 — ${p.content}`,
          ).not.toBeNull();
          const b = Number(boxOnly![1]);
          const dn = nums(p.content);
          // 잘못된 곱은 $b\times(b\times ans)$ 다 — 발문의 어느 수가 그것인지 찾는다.
          expect(
            dn.includes(b * b * ans),
            `${code} 심화 seed ${seed}: ${p.content} → ${ans}`,
          ).toBe(true);
          expect(
            promiseOk22(code, b * ans, b),
            `${code} 심화 seed ${seed}: 되짚은 어떤 수`,
          ).toBeNull();
        }
        expect(
          p.content.includes(`$${ans}$`),
          `${code} 심화 seed ${seed}: 답이 발문에 그대로 보인다`,
        ).toBe(false);
      }
    }
    // 2-2-1·2 는 ㉠ 나뉘는 수 · ㉡ 잘못 곱함 두 틀, 2-2-4 는 ㉠ 나뉘는 수 · ㉡ 가린 자리.
    // 안 닿은 틀은 위 검사가 **구조적으로 못 본다** — 0 을 「깨끗」으로 읽지 않는다.
    expect(
      (frames.get("2-2-1:나뉘는 수") ?? 0) +
        (frames.get("2-2-2:나뉘는 수") ?? 0),
      "2-2-1·2 ㉠ 틀에 안 닿았다",
    ).toBeGreaterThan(0);
    expect(
      (frames.get("2-2-1:잘못 곱함") ?? 0) +
        (frames.get("2-2-2:잘못 곱함") ?? 0),
      "2-2-1·2 ㉡ 틀에 안 닿았다",
    ).toBeGreaterThan(0);
    expect(
      frames.get("2-2-4:나뉘는 수") ?? 0,
      "2-2-4 ㉠ 틀에 안 닿았다",
    ).toBeGreaterThan(0);
    expect(
      frames.get("2-2-4:가린 자리") ?? 0,
      "2-2-4 ㉡ 틀에 안 닿았다",
    ).toBeGreaterThan(0);
  });

  it("모든 갈래의 답이 씨앗에 따라 갈린다 — 상수답 금지", () => {
    for (const code of DIV22) {
      for (const tier of tiersOf(planeUnit(code))) {
        const seen = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1)
          seen.add(
            generateElementaryProblem(planeUnit(code), seed, tier).answer,
          );
        expect(seen.size, `${code} ${tier} 상수답`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of DIV22) {
      for (const tier of tiersOf(planeUnit(code))) {
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
    for (const code of DIV22) {
      for (const seed of SEEDS) {
        const stems = tiersOf(planeUnit(code)).map((t) =>
          generateElementaryProblem(planeUnit(code), seed, t).content.replace(
            /\$[^$]*\$/g,
            "#",
          ),
        );
        // ⚠️ 갈래 수를 **손으로 적지 않는다** — D-113 으로 확대 갈래가 차면
        // 「4」는 조용히 틀린 수가 된다. 물을 것은 「둘이 같아지지 않는가」다.
        expect(
          new Set(stems).size,
          `${code} seed ${seed}: ${stems.join(" | ")}`,
        ).toBe(stems.length);
      }
    }
  });

  it("2-2-4 의 발문 틀이 2-2-1·2-2-2 와 겹치지 않는다", () => {
    const norm = (code: string, tier: (typeof ELEM_TIERS)[number]) =>
      new Set(
        Array.from({ length: 120 }, (_, seed) =>
          generateElementaryProblem(
            planeUnit(code),
            seed,
            tier,
          ).content.replace(/\$[^$]*\$/g, "#"),
        ),
      );
    for (const tier of tiersOf(planeUnit("2-2-1"))) {
      const two = norm("2-2-1", tier);
      const three = norm("2-2-4", tier);
      const both = [...three].filter((s) => two.has(s));
      expect(both.slice(0, 3), `${tier} 겹친 틀`).toEqual([]);
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있고, 수 뒤에 조사를 붙이지 않는다", () => {
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of DIV22) {
      for (const tier of [undefined, ...tiersOf(planeUnit(code))]) {
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
                `${code} ${tier ?? "표준"} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(
                `${code} ${tier ?? "표준"} seed ${seed} ${label}: ${text.match(risk)![0]}`,
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
 * 초3 **전 소단원 × 표준+네 갈래** — 수 뒤 조사 전수 검사.
 *
 * 왜 따로 있나 — 대단원별 블록의 조사 검사는 `ELEM_TIERS` 만 순회한다. 그래서
 * **표준 문항의 조사는 구조적으로 0** 이었고, 1-3-3 표준의 「$\square\times3=18$ 를」가
 * 씨앗 300 중 156에서 틀린 채로 살아 있었다(2026-08-23 elem-g4 회송).
 *
 * 판정 규칙 셋(g4): ⑴ 분수는 **분자**를 마지막에 읽는다 ⑵ 수는 **끝소리**로 갈린다
 * ⑶ 뒤에 한글이 이어지면 그 글자는 조사가 아니다.
 *
 * ⚠️ 이 검사는 **양성 대조를 스스로 안고 있다.** 걸려야 하는 입력이 안 걸리면
 * 「0건」이 「깨끗」이 아니라 「못 셈」이다 — 처음 짤 때 실제로 죽은 채 0을 찍었다.
 */

/** 받침 있는 숫자 소리: 영·일·삼·육·칠·팔. 없는 것: 이·사·오·구. */
const DIGIT_BATCHIM: Record<string, boolean> = {
  "0": true,
  "1": true,
  "2": false,
  "3": true,
  "4": false,
  "5": false,
  "6": true,
  "7": true,
  "8": true,
  "9": false,
};

/** 자릿말 받침: 십·백·만·억 있음, 천 없음. */
const PLACE_WORD = ["", "십", "백", "천", "만", "십만", "백만", "천만", "억"];

function numBatchim(digits: string): boolean | null {
  const s = digits.replace(/[^\d]/g, "");
  if (!s) return null;
  const last = s[s.length - 1]!;
  if (last !== "0") return DIGIT_BATCHIM[last]!;
  const zeros = s.length - s.replace(/0+$/, "").length;
  const word = PLACE_WORD[zeros];
  if (!word) return null;
  return "십백만억".includes(word[word.length - 1]!);
}

/** KaTeX 덩어리에서 **마지막에 소리 나는 수**. 끝이 수가 아니면 판정하지 않는다. */
function spokenTail(inner: string): string | null {
  const s = inner.trim();
  const fr = s.match(/\\frac\{(\d+)\}\{(\d+)\}$/);
  if (fr) return fr[1]!;
  const m = s.match(/(\d+)$/);
  return m ? m[1]! : null;
}

const JOSA_PAIRS: [string, string][] = [
  ["은", "는"],
  ["이", "가"],
  ["을", "를"],
  ["과", "와"],
  ["으로", "로"],
];

const JOSA_RISK = /\$([^$]*)\$\s*(으로|로|은|는|이|가|을|를|과|와)(?![가-힣])/g;

/** 텍스트에서 「끝소리와 안 맞는 조사」를 모은다. */
function wrongJosa(text: string): { used: string; want: string }[] {
  const out: { used: string; want: string }[] = [];
  for (const m of text.matchAll(JOSA_RISK)) {
    const tail = spokenTail(m[1]!);
    if (tail === null) continue;
    const batchim = numBatchim(tail);
    if (batchim === null) continue;
    const used = m[2]!;
    const pair = JOSA_PAIRS.find((p) => p.includes(used))!;
    const want = batchim ? pair[0] : pair[1];
    if (used !== want) out.push({ used, want });
  }
  return out;
}

describe("[초3] 수 뒤 조사 — 표준까지 전수", () => {
  it("판정기가 살아 있다 — 일부러 틀린 입력이 걸린다 (양성 대조)", () => {
    // 십팔 → «을». 「기호가 있으면 판정하지 않는다」로 짜면 이 줄이 통째로 안 걸린다.
    expect(
      wrongJosa(String.raw`곱셈식 $\square\times3=18$ 를 이용하여`),
    ).toEqual([{ used: "를", want: "을" }]);
    // 이십 → «을». 자릿말(십)의 받침으로 갈린다.
    expect(wrongJosa(String.raw`$20$ 를 나누면`)).toEqual([
      { used: "를", want: "을" },
    ]);
    // 삼분의 이 → «를». 분수는 **분자**가 끝소리다.
    expect(wrongJosa(String.raw`$\frac{2}{3}$ 을 더하면`)).toEqual([
      { used: "을", want: "를" },
    ]);
    // 뒤에 한글이 이어지면 조사가 아니다 — 「이므로」는 걸리면 안 된다.
    expect(wrongJosa(String.raw`$18$ 이므로`)).toEqual([]);
    // 끝이 수가 아니면 판정하지 않는다(단위·기호는 소리를 못 정한다).
    expect(wrongJosa(String.raw`$5\,\mathrm{cm}$ 를`)).toEqual([]);
  });

  it("초3 전 소단원의 표준·갈래에 **수 뒤 조사가 아예 없다**", () => {
    // 관례는 「끝소리로 고른다」가 아니라 **「붙이지 않는다」** 다(g3.ts `josa` 주석) —
    // 그래서 목표는 「틀린 조사 0」이 아니라 **「판정할 자리 0」** 이다. 살아 있음은
    // 바로 위 양성 대조가 증명한다(그게 없으면 이 0은 「못 셈」과 구분되지 않는다).
    const bad: string[] = [];
    const attached: string[] = [];
    for (const unit of elementaryUnits().filter((u) => u.grade === "초3")) {
      const tiers: ((typeof ELEM_TIERS)[number] | undefined)[] =
        supportedTiers(unit).length > 0
          ? [undefined, ...tiersOf(unit)]
          : [undefined];
      for (const tier of tiers) {
        for (let seed = 0; seed < 60; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            for (const m of text.matchAll(JOSA_RISK)) {
              const tail = spokenTail(m[1]!);
              if (tail === null || numBatchim(tail) === null) continue;
              attached.push(
                `${unit.section.slice(0, 5)} ${tier ?? "표준"} ${label}: ${m[0]!.trim()}`,
              );
            }
            for (const w of wrongJosa(text)) {
              bad.push(
                `${unit.section.slice(0, 5)} ${tier ?? "표준"} ${label}: ${w.used} → ${w.want}`,
              );
            }
          }
        }
      }
    }
    // 틀린 조사(있으면 지면에 그대로 나간다)와 붙은 조사 전부를 함께 찍는다.
    expect(bad.slice(0, 8)).toEqual([]);
    expect(attached.slice(0, 8)).toEqual([]);
  });
});

/**
 * 초3 **전 소단원 × 표준+네 갈래** — 지면에 찍힌 모든 등식을 다시 계산한다.
 *
 * 왜 따로 있나 — 「나눗셈을 등식으로 적었으면 나누어떨어져야 한다」를 2-2 블록에서
 * 잠갔는데, 그 잠금은 **2-2 네 소단원 안에서만** 돌았다. 그래서 2-4-5 표준 해설의
 * `$17\div6=2$` 가 **씨앗 200/200 전량**에서 살아 있었다(2026-08-23 리드 회송).
 * 잠금의 «범위»가 좁으면 바로 옆 소단원이 구조적으로 안 보인다 — 오늘 아침
 * 「표준을 안 돌았다」와 같은 자리다.
 *
 * ⚠️ 양성·음성 대조를 **둘 다** 안고 있다. 걸려야 할 것이 안 걸리면 0은 「깨끗」이
 * 아니라 「못 셈」이고, 멀쩡한 것이 걸리면 거짓 경보가 가드를 끈다.
 */

/** `$a op b = c$` 를 전부 꺼내 유리수로 다시 계산한다. 나눗셈은 나누어떨어져야 한다. */
const EQ_ALL = /\$(\d+)(\\times|\\div|\+|-)(\d+)=(\d+)\$/g;

function falseEquations(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(EQ_ALL)) {
    const a = Number(m[1]);
    const op = m[2]!;
    const b = Number(m[3]);
    const c = Number(m[4]);
    const ok =
      op === "+"
        ? a + b === c
        : op === "-"
          ? a - b === c
          : op === "\\times"
            ? a * b === c
            : b !== 0 && a % b === 0 && a / b === c;
    const sign = op === "\\times" ? "×" : op === "\\div" ? "÷" : op;
    if (!ok) out.push(`${a}${sign}${b}=${c}`);
  }
  return out;
}

describe("[초3] 지면의 등식 — 표준까지 전수", () => {
  it("판정기가 살아 있다 — 거짓 등식은 잡고 참인 등식은 안 잡는다", () => {
    // 나머지가 있는데 등식으로 적은 꼴. 2-4-5 표준이 씨앗 200/200 에서 이랬다.
    expect(falseEquations(String.raw`$17\div6=2$ 이고 나머지가 $5$`)).toEqual([
      "17÷6=2",
    ]);
    expect(falseEquations(String.raw`$7\times8=54$`)).toEqual(["7×8=54"]);
    // 음성 대조 — 참인 등식이 걸리면 거짓 경보가 가드를 끈다.
    expect(
      falseEquations(String.raw`$18\div6=3$, $7\times8=56$, $9-4=5$`),
    ).toEqual([]);
  });

  it("초3 전 소단원의 표준·갈래에 거짓 등식이 없다", () => {
    const bad: string[] = [];
    let judged = 0;
    for (const unit of elementaryUnits().filter((u) => u.grade === "초3")) {
      const tiers: ((typeof ELEM_TIERS)[number] | undefined)[] =
        supportedTiers(unit).length > 0
          ? [undefined, ...tiersOf(unit)]
          : [undefined];
      for (const tier of tiers) {
        for (let seed = 0; seed < 40; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            judged += [...text.matchAll(EQ_ALL)].length;
            for (const w of falseEquations(text)) {
              bad.push(
                `${unit.section.slice(0, 5)} ${tier ?? "표준"} ${label}: ${w}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 0 이 「깨끗」인지 「못 셈」인지 가른다 — 지면에 등식이 실제로 있어야 한다.
    expect(judged, "등식을 한 자리도 못 읽었다").toBeGreaterThan(5000);
  });
});

/**
 * 초3 **2-4 분수** — 여섯 소단원 × 네 갈래.
 *
 * **참은 지면에서 온다.** 생성기를 다시 부르지 않고 찍힌 발문·정답에서 분수를 뽑아
 * 여기서 다시 셈한다.
 *
 * ⚠️ **구성이 100% 를 보장하는 성질의 문턱은 «전량»이다.** 이 대단원에는 그런 성질이
 * 많다(분모가 같다 · 발문이 가분수다 · 분자가 서로 다르다 · 발문의 분수가 기약이다).
 * 문턱을 「대부분」으로 두면 **구성이 절반 무너져도 안 운다** — 2026-08-23 g5 실측에서
 * 구성 100% ↔ 변이 59.5% 인데 「200 중 100 초과」 문턱을 그대로 통과했다.
 * 그래서 아래 검사들은 **어긋남 0** 을 요구하고, 동시에 **분모 가드**를 둔다
 * (「하나도 못 읽었다」면 100% 는 공허하다 — 0은 «깨끗»과 «못 셈»을 안 가른다).
 *
 * ⚠️ **기약 규칙이 소단원마다 다른 것은 일부러다.** 분수가 **답**인 자리(2-4-1)는 안
 * 거르고 **발문에 주어지는 값**인 자리(2-4-2·3)는 거른다 — 초3 은 약분(초5)을 안 배우므로
 * $\frac26$ 이 정답이다. 이 시험은 **그 차이를 잠근다**(양쪽을 같게 만들면 빨개진다).
 */
describe("[초3 4단] 2-4 분수", () => {
  const SEC24 = ["2-4-1", "2-4-2", "2-4-3", "2-4-4", "2-4-5", "2-4-6"] as const;
  const SEEDS24 = Array.from({ length: 50 }, (_, i) => i * 37 + 3);

  const unitOf = (code: string) =>
    elementaryUnits().find(
      (u) => u.grade === "초3" && u.section.startsWith(code),
    )!;

  /** 지면의 `\frac{a}{b}` 를 전부 뽑는다(대분수의 자연수 부분은 여기에 안 들어온다). */
  const fracsIn = (text: string): [number, number][] =>
    [...text.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);

  /** 최대공약수 — 제품 함수를 안 부른다(부르면 동어반복이다). */
  const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));

  /** 표준 + 그 소단원이 내는 갈래. 표준(`undefined`)을 빠뜨리면 그 축이 통째로 가드 밖이 된다. */
  const everyTier = (code: string) =>
    [undefined, ...tiersOf(unitOf(code))] as const;

  it("여섯 소단원이 네 갈래를 모두 갖는다", () => {
    for (const code of SEC24) expectCoreTiers(unitOf(code), code);
  });

  it("표준·갈래의 답이 발문의 수에서 다시 나온다 — 2-4-1 (분수로 나타내기)", () => {
    let judged = 0;
    for (const tier of everyTier("2-4-1"))
      for (const seed of SEEDS24) {
        const p = generateElementaryProblem(unitOf("2-4-1"), seed, tier);
        const ans = fracsIn(p.answer);
        if (ans.length === 0) {
          // 심화만 개수를 답한다 — 그때는 발문에서 전체를 되짚어 검산한다.
          const nums = [...p.content.matchAll(/\$(\d+)\$/g)].map((m) =>
            Number(m[1]),
          );
          const got = Number(/\$(\d+)\$/.exec(p.answer)![1]);
          const [groups, take, part] = nums as [number, number, number];
          expect(got, `${tier ?? "표준"} 씨앗 ${seed}`).toBe(
            (part / take) * groups,
          );
          judged += 1;
          continue;
        }
        const [num, den] = ans[0]!;
        expect(
          num,
          `${tier ?? "표준"} 씨앗 ${seed} — 분자가 분모보다 크다`,
        ).toBeLessThan(den);
        judged += 1;
      }
    expect(judged, "한 문항도 안 읽었다").toBe(
      everyTier("2-4-1").length * SEEDS24.length,
    );
  });

  it("2-4-2 는 **단위분수**, 2-4-3 은 **분자 2 이상** — 이름이 약속한 그대로 (전량)", () => {
    let judged = 0;
    for (const [code, unitOnly] of [
      ["2-4-2", true],
      ["2-4-3", false],
    ] as const)
      for (const tier of everyTier(code))
        for (const seed of SEEDS24) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          const fs = fracsIn(p.content);
          expect(
            fs.length,
            `${code} ${tier ?? "표준"} 씨앗 ${seed}`,
          ).toBeGreaterThan(0);
          const [num, den] = fs[0]!;
          if (unitOnly)
            expect(num, `${code} ${tier ?? "표준"} 씨앗 ${seed}`).toBe(1);
          else
            expect(
              num,
              `${code} ${tier ?? "표준"} 씨앗 ${seed}`,
            ).toBeGreaterThanOrEqual(2);
          // 발문에 주어지는 값이므로 **기약**이어야 한다(2-4-1 과 반대 규칙 — 일부러다).
          expect(
            gcd2(num, den),
            `${code} ${tier ?? "표준"} 씨앗 ${seed} — 발문 분수가 약분된다`,
          ).toBe(1);
          judged += 1;
        }
    expect(judged, "한 문항도 안 읽었다").toBe(
      (everyTier("2-4-2").length + everyTier("2-4-3").length) * SEEDS24.length,
    );
  });

  it("2-4-1 은 답 자리라 **안 거른다** — 약분되는 답이 실제로 나온다 (반대쪽 확인)", () => {
    // ⚠️ 이 검사가 없으면 「전부 기약으로 통일」해도 아무도 안 운다. 규칙이 갈리는 것이
    //   일부러라는 것을 **양쪽에서** 잠근다.
    let reducible = 0;
    for (const seed of Array.from({ length: 200 }, (_, i) => i)) {
      const p = generateElementaryProblem(unitOf("2-4-1"), seed);
      const [num, den] = fracsIn(p.answer)[0]!;
      if (gcd2(num, den) > 1) reducible += 1;
    }
    expect(
      reducible,
      "2-4-1 답이 전부 기약이다 — 초3 은 약분을 안 배우므로 거르면 안 된다",
    ).toBeGreaterThan(0);
  });

  it("2-4-4 는 지면에 분수가 서고, 답이 분자·분모 비교와 맞는다 (전량)", () => {
    let judged = 0;
    for (const tier of everyTier("2-4-4"))
      for (const seed of SEEDS24) {
        const p = generateElementaryProblem(unitOf("2-4-4"), seed, tier);
        // 소단원 조건 — 이름이 분수의 «종류»를 약속하므로 분수가 지면에 있어야 한다.
        expect(
          fracsIn(p.content).length,
          `${tier ?? "표준"} 씨앗 ${seed} — 발문에 분수가 없다`,
        ).toBeGreaterThan(0);
        const kind = /가분수$/.test(p.answer.trim())
          ? "가분수"
          : /진분수$/.test(p.answer.trim())
            ? "진분수"
            : null;
        if (kind) {
          const fs = fracsIn(p.answer);
          const [num, den] = (
            fs.length > 0 ? fs[0]! : fracsIn(p.content)[0]!
          ) as [number, number];
          expect(
            num >= den ? "가분수" : "진분수",
            `${tier ?? "표준"} 씨앗 ${seed}`,
          ).toBe(kind);
        }
        judged += 1;
      }
    expect(judged, "한 문항도 안 읽었다").toBe(
      everyTier("2-4-4").length * SEEDS24.length,
    );
  });

  it("2-4-5 는 발문이 **가분수**이고, 대분수 변환이 지면에서 다시 나온다 (전량)", () => {
    let judged = 0;
    for (const tier of everyTier("2-4-5"))
      for (const seed of SEEDS24) {
        const p = generateElementaryProblem(unitOf("2-4-5"), seed, tier);
        const all = `${p.content}\n${p.answer}`;
        // 대분수는 `숫자\frac{}{}` 꼴로 지면에 선다. 가분수는 `\frac{큰}{작은}`.
        const mixed = [...all.matchAll(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/g)];
        const improper = fracsIn(all).filter(([a, b]) => a >= b);
        // ⚠️ D-113 확대 갈래는 **분모나 분자를 가린다** — 분모가 □ 인 분수도
        //    이 소단원의 가분수다(분모는 한 자리 수라 분자가 항상 크다).
        //    이것을 «안 보임»으로 읽으면 채운 갈래가 오히려 빨개진다.
        const boxed = [
          ...all.matchAll(/\\frac\{(?:\d+|\\square)\}\{(?:\d+|\\square)\}/g),
        ];
        expect(
          mixed.length + improper.length + boxed.length,
          `${tier ?? "표준"} 씨앗 ${seed} — 대분수도 가분수도 안 보인다`,
        ).toBeGreaterThan(0);
        for (const m of mixed) {
          const [w, r, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
          expect(
            r,
            `${tier ?? "표준"} 씨앗 ${seed} — 대분수의 분수 부분이 진분수가 아니다`,
          ).toBeLessThan(d);
          expect(r).toBeGreaterThan(0);
          expect(w).toBeGreaterThan(0);
        }
        judged += 1;
      }
    expect(judged, "한 문항도 안 읽었다").toBe(
      everyTier("2-4-5").length * SEEDS24.length,
    );
  });

  it("2-4-5 해설은 **나눗셈을 등식으로 적지 않는다** — 표준과 같은 꼴 (전량)", () => {
    // 2026-08-23 회송: 표준이 `$17\div6=2$` 를 쓰고 있었다(거짓 등식). 네 갈래가 다시
    // 그 꼴로 새지 않게 **한 소단원 안에서 표기를 잠근다.**
    let judged = 0;
    for (const tier of everyTier("2-4-5"))
      for (const seed of SEEDS24) {
        const sol = generateElementaryProblem(
          unitOf("2-4-5"),
          seed,
          tier,
        ).solution!;
        for (const m of sol.matchAll(/\$(\d+)\\div(\d+)=(\d+)\$/g)) {
          const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
          expect(
            a % b === 0 && a / b === c,
            `${tier ?? "표준"} 씨앗 ${seed} — 나누어떨어지지 않는데 등식으로 적었다: ${m[0]}`,
          ).toBe(true);
        }
        judged += 1;
      }
    expect(judged, "해설을 한 자리도 안 읽었다").toBe(
      everyTier("2-4-5").length * SEEDS24.length,
    );
  });

  it("2-4-6 은 분모가 **모두 같고** 분자가 서로 달라 답이 하나다 (전량)", () => {
    let judged = 0;
    for (const tier of everyTier("2-4-6"))
      for (const seed of SEEDS24) {
        const p = generateElementaryProblem(unitOf("2-4-6"), seed, tier);
        const fs = fracsIn(p.content);
        expect(fs.length, `${tier ?? "표준"} 씨앗 ${seed}`).toBeGreaterThan(0);
        expect(
          new Set(fs.map(([, d]) => d)).size,
          `${tier ?? "표준"} 씨앗 ${seed} — 분모가 섞였다`,
        ).toBe(1);
        // 「가장 큰·작은」을 묻는 갈래는 분자가 겹치면 답이 하나가 아니다.
        // 심화는 경계 둘만 보이므로 겹칠 수가 없다(구성).
        expect(
          new Set(fs.map(([a]) => a)).size,
          `${tier ?? "표준"} 씨앗 ${seed} — 분자가 겹쳐 답이 하나가 아니다`,
        ).toBe(fs.length);
        judged += 1;
      }
    expect(judged, "한 문항도 안 읽었다").toBe(
      everyTier("2-4-6").length * SEEDS24.length,
    );
  });

  it("2-4-6 심화의 답은 조건 사이에서 다시 나오고, **개수가 아니라 분수**다", () => {
    // ⚠️ 2-4-4 심화가 「몇 개」를 묻는다. 여기까지 개수를 물으면 한 시험지에 실렸을 때
    //   두 문항이 같은 것을 묻는 것처럼 보인다(2026-08-23 리드 지적). 답의 **모양**을 잠근다.
    for (const seed of SEEDS24) {
      const p = generateElementaryProblem(unitOf("2-4-6"), seed, "심화하");
      expect(p.answer, `씨앗 ${seed}`).toMatch(/^\$\\frac\{\d+\}\{\d+\}\$$/);
      const fs = fracsIn(p.content);
      const [lo, hi] = [fs[0]![0], fs[1]![0]];
      const [num, den] = fracsIn(p.answer)[0]!;
      expect(den).toBe(fs[0]![1]);
      expect(num, `씨앗 ${seed} — 사이에서 가장 큰 분자가 아니다`).toBe(hi - 1);
      expect(num).toBeGreaterThan(lo);
    }
  });

  it("2-4-4 심화는 **개수**를 묻고, 그 개수가 조건에서 다시 나온다", () => {
    const counts = new Set<number>();
    for (const seed of SEEDS24) {
      const p = generateElementaryProblem(unitOf("2-4-4"), seed, "심화하");
      const got = Number(/\$(\d+)\$/.exec(p.answer)![1]);
      const fs = fracsIn(p.content);
      const den = fs[0]![1];
      const limit =
        fs.find(([a]) => a > 0 && a >= den)?.[0] ?? fs[fs.length - 1]![0];
      expect(got, `씨앗 ${seed}`).toBe(limit - den);
      counts.add(got);
    }
    // 「몇 개」 답이 한 값으로 굳으면 상수답이다 — 분모·범위를 흔든 것이 실제로 먹는가.
    expect(counts.size, "개수 답이 굳었다").toBeGreaterThanOrEqual(4);
  });
});

/**
 * 초3 2-4 — **답을 지면에서 다시 세운다.**
 *
 * 왜 따로 있나 — 앞 블록은 「이름이 약속한 성질」(단위분수인가·분모가 같은가)만 잠갔다.
 * 변이를 설계하다 보니 **답 자체를 아무도 재도출하지 않는 갈래가 아홉**이었다
 * (2-4-2·3 네 갈래씩 · 2-4-6 연산·기본·응용). 그 자리는 셈을 뒤집어도 초록이다.
 * 「가드는 망가뜨려 봐야 가드인 줄 안다」의 앞 단계 — **변이를 만들다가 구멍이 보였다.**
 */
describe("[초3 4단] 2-4 — 답을 발문에서 다시 세운다", () => {
  const SEEDS_R = Array.from({ length: 40 }, (_, i) => i * 53 + 11);
  const unitOf2 = (code: string) =>
    elementaryUnits().find(
      (u) => u.grade === "초3" && u.section.startsWith(code),
    )!;
  const fracs2 = (t: string): [number, number][] =>
    [...t.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
  /** 발문에 찍힌 정수들 — `\frac{}{}` 안의 수는 안 센다(그건 분수로 따로 읽는다). */
  const ints2 = (t: string): number[] =>
    [...t.replace(/\\frac\{\d+\}\{\d+\}/g, "").matchAll(/\$(\d+)\$/g)].map(
      (m) => Number(m[1]),
    );

  it("2-4-2·2-4-3 — 네 갈래의 답이 발문의 수와 분수에서 다시 나온다", () => {
    let judged = 0;
    for (const code of ["2-4-2", "2-4-3"] as const)
      for (const tier of tiersOf(unitOf2(code))) {
        for (const seed of SEEDS_R) {
          const p = generateElementaryProblem(unitOf2(code), seed, tier);
          const [take, den] = fracs2(p.content)[0]!;
          const first = ints2(p.content)[0]!;
          const got = Number(/\$(\d+)\$/.exec(p.answer)![1]);
          const where = `${code} ${tier} 씨앗 ${seed}`;
          if (tier === "심화하") {
            // 역산 — 「$\frac td$ 만큼이 part」에서 전체를 되짚는다.
            expect(got, where).toBe((first / take) * den);
            // 답은 발문에 안 보여야 한다(보이면 되짚을 게 없다).
            expect(
              ints2(p.content),
              `${where} — 답이 발문에 그대로 있다`,
            ).not.toContain(got);
          } else if (tier === "심화중") {
            // D-113 확대 갈래 — 전체를 **범위 + 「묶음 수로 나누어떨어짐」**으로
            // 되짚는다. 발문에 전체가 아예 없으므로 «범위»를 자리가 아니라
            // 말투로 읽는다(틀마다 수가 나오는 차례가 다르다).
            const bm = p.content.match(
              /\$(\d+)\$[^$]*보다 많고 \$(\d+)\$[^$]*보다 적/,
            );
            expect(bm, `${where} — 범위를 못 읽었다`).toBeTruthy();
            const [lo, hi] = [Number(bm![1]), Number(bm![2])];
            const totals: number[] = [];
            for (let v = lo + 1; v < hi; v += 1)
              if (v % den === 0) totals.push(v);
            expect(totals, `${where} — 전체가 하나로 안 굳는다`).toHaveLength(
              1,
            );
            expect(got, where).toBe((totals[0]! / den) * take);
            // 답이 발문에 그대로 있으면 되짚을 것이 없다.
            expect(
              ints2(p.content),
              `${where} — 답이 발문에 그대로 있다`,
            ).not.toContain(got);
          } else if (tier === "응용") {
            // 두 단계 — 분수만큼을 덜어 낸 나머지.
            expect(got, where).toBe(first - (first / den) * take);
          } else {
            expect(got, where).toBe((first / den) * take);
          }
          judged += 1;
        }
      }
    expect(judged, "한 문항도 안 읽었다").toBe(
      (tiersOf(unitOf2("2-4-2")).length + tiersOf(unitOf2("2-4-3")).length) *
        SEEDS_R.length,
    );
  });

  it("2-4-6 — 연산·기본·응용의 답이 지면의 분자에서 다시 나온다", () => {
    let judged = 0;
    for (const seed of SEEDS_R) {
      // 연산 — 「가장 작은」을 묻는다(표준은 가장 큰 것을 묻는다).
      const calc = generateElementaryProblem(unitOf2("2-4-6"), seed, "연산");
      const nums = fracs2(calc.content).map(([a]) => a);
      expect(calc.content, `연산 씨앗 ${seed}`).toMatch(/작은/);
      expect(fracs2(calc.answer)[0]![0], `연산 씨앗 ${seed}`).toBe(
        Math.min(...nums),
      );

      // 기본 — 답이 **가장 큰 분수 옆의 이름**이어야 한다.
      const word = generateElementaryProblem(unitOf2("2-4-6"), seed, "기본");
      const pairs = [
        ...word.content.matchAll(/([가-힣]+): \$\\frac\{(\d+)\}\{\d+\}\$/g),
      ].map((m) => [m[1]!, Number(m[2])] as const);
      expect(pairs.length, `기본 씨앗 ${seed}`).toBe(3);
      const best = pairs.reduce((x, y) => (y[1] > x[1] ? y : x));
      expect(word.answer.trim(), `기본 씨앗 ${seed}`).toBe(best[0]);

      // 응용 — 큰 것부터 늘어놓았는가(순서까지 본다).
      const apply = generateElementaryProblem(unitOf2("2-4-6"), seed, "응용");
      const shown = fracs2(apply.content).map(([a]) => a);
      const ordered = fracs2(apply.answer).map(([a]) => a);
      expect(ordered, `응용 씨앗 ${seed}`).toEqual(
        [...shown].sort((a, b) => b - a),
      );
      judged += 3;
    }
    expect(judged).toBe(3 * SEEDS_R.length);
  });

  it("2-4-5 응용 — **자연수 부분이 더 큰 쪽**을 골랐는가", () => {
    for (const seed of SEEDS_R) {
      const p = generateElementaryProblem(unitOf2("2-4-5"), seed, "응용");
      const shown = fracs2(p.content);
      expect(shown.length, `씨앗 ${seed}`).toBe(2);
      const [[nA, d], [nB]] = shown as [[number, number], [number, number]];
      // 자연수 부분은 몫이다. 둘이 같으면 답이 하나가 아니므로 그것도 막는다.
      expect(
        Math.floor(nA / d) === Math.floor(nB / d),
        `씨앗 ${seed} — 자연수 부분이 같아 답이 하나가 아니다`,
      ).toBe(false);
      const want = Math.floor(nA / d) > Math.floor(nB / d) ? nA : nB;
      expect(fracs2(p.answer)[0]![0], `씨앗 ${seed}`).toBe(want);
    }
  });

  // ── 아래 셋은 **변이가 초록이라 뒤늦게 채운 자물쇠**다 ──────────────────
  // 하네스가 「이 자리를 망가뜨려도 아무도 안 운다」고 알려 준 것이 이 셋이다.
  // 시험을 먼저 짜고 변이를 나중에 돌리면 이런 자리는 구조적으로 안 보인다.

  it("2-4-4 연산 — 답 목록이 발문의 가분수 **전부**와 같다 (분자=분모 포함)", () => {
    for (const seed of SEEDS_R) {
      const p = generateElementaryProblem(unitOf2("2-4-4"), seed, "연산");
      const shown = fracs2(p.content);
      const den = shown[0]![1];
      // 「분자가 분모와 같거나 크면 가분수」 — 같은 것을 빠뜨리면 여기서 걸린다.
      const want = shown.filter(([a]) => a >= den).map(([a]) => a);
      expect(
        fracs2(p.answer).map(([a]) => a),
        `씨앗 ${seed}`,
      ).toEqual(want);
      expect(
        want.length,
        `씨앗 ${seed} — 가분수가 하나도 없다`,
      ).toBeGreaterThan(0);
    }
  });

  it("2-4-4 기본 — 기준 분수와 답 분수가 **다르다** (「$0$ 만큼」이 나가면 안 된다)", () => {
    for (const seed of SEEDS_R) {
      const p = generateElementaryProblem(unitOf2("2-4-4"), seed, "기본");
      expect(p.content, `씨앗 ${seed} — 0 만큼 옮기라고 한다`).not.toMatch(
        /\$0\$ 만큼/,
      );
      const base = fracs2(p.content)[0]!;
      const got = fracs2(p.answer)[0]!;
      expect(got[0], `씨앗 ${seed} — 옮길 것이 없다`).not.toBe(base[0]);
      expect(got[1], `씨앗 ${seed} — 분모가 바뀌었다`).toBe(base[1]);
      // 발문이 말한 만큼 실제로 옮겼는가.
      const m = /분자를 \$(\d+)\$ 만큼 (크게|작게)/.exec(p.content)!;
      const step = Number(m[1]) * (m[2] === "크게" ? 1 : -1);
      expect(got[0], `씨앗 ${seed}`).toBe(base[0] + step);
    }
  });

  it("2-4-5 심화 — 가린 자리의 **참값**을 답한다", () => {
    for (const seed of SEEDS_R) {
      const p = generateElementaryProblem(unitOf2("2-4-5"), seed, "심화하");
      const [num, den] = fracs2(p.content)[0]!;
      const got = Number(/\$(\d+)\$$/.exec(p.answer.trim())![1]);
      const whole = Math.floor(num / den);
      const rest = num % den;
      // 자연수부가 가려졌으면 몫, 분자가 가려졌으면 나머지다.
      // ⚠️ `\\square` 를 `\square` 로 적으면 정규식의 **공백류 `\s`** 가 되어 늘 거짓이다.
      const hidesWhole = /\\square\\frac\{/.test(p.content);
      expect(
        got,
        `씨앗 ${seed} — ${hidesWhole ? "자연수부" : "분자"}가 가려졌다`,
      ).toBe(hidesWhole ? whole : rest);
    }
  });

  it("2-4-1 심화 — 답이 발문에 안 보이고 되짚기가 성립한다", () => {
    for (const seed of SEEDS_R) {
      const p = generateElementaryProblem(unitOf2("2-4-1"), seed, "심화하");
      const [groups, take, part] = ints2(p.content) as [number, number, number];
      const got = Number(/\$(\d+)\$/.exec(p.answer)![1]);
      expect(got, `씨앗 ${seed}`).toBe((part / take) * groups);
      expect(
        ints2(p.content),
        `씨앗 ${seed} — 답이 발문에 그대로 있다`,
      ).not.toContain(got);
    }
  });
});

// 「발문이 부른 조건은 발문에 있어야 한다」는 **학년을 넘는 축**이라 여기 있지 않다 —
// `elemStemSelfContained.test.ts` 가 전 학년을 본다(2026-08-23). 여기 사본을 두지 말 것:
// 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.

/* ══════════════ 2-5 들이와 무게 (D-72 확대, 2026-08-24) ══════════════ */

const CAPACITY = ["2-5-1", "2-5-2", "2-5-3"] as const;
const MASS = ["2-5-4", "2-5-5", "2-5-6"] as const;
/** 여섯을 「무엇을 하는 소단원인가」로 짝지어 둔다 — 공장 하나를 둘이 나눠 쓴다. */
const CAP_FAMILY = [
  { kind: "비교", codes: ["2-5-1", "2-5-4"] },
  { kind: "단위", codes: ["2-5-2", "2-5-5"] },
  { kind: "합과 차", codes: ["2-5-3", "2-5-6"] },
] as const;

const CAP_SEEDS = Array.from({ length: 24 }, (_, i) => 20260824 + i * 6131);
/** 「틀의 집합」을 견주는 잠금 전용 — 갈래를 다 훑으려면 24개로는 모자란다(아래 주석). */
const CAP_SHAPE_SEEDS = Array.from(
  { length: 40 },
  (_, i) => 20260824 + i * 6131,
);

/** 그 소단원이 쓰는 단위 짝. 코드로 정한다 — 지면에서 읽으면 동어반복이다. */
function capUnits(code: string): { big: string; small: string } {
  return (CAPACITY as readonly string[]).includes(code)
    ? { big: "L", small: "mL" }
    : { big: "kg", small: "g" };
}

type CapVal = { mixed: boolean; total: number };

/**
 * 지면에 찍힌 **양**을 전부 읽는다. `$2\,\mathrm{L}\ 300\,\mathrm{mL}$` 는 섞은 꼴,
 * `$2300\,\mathrm{mL}$` 는 작은 단위 하나, `$3\,\mathrm{L}$` 는 큰 단위 하나.
 *
 * ⚠️ 값을 **작은 단위로 환산해** 돌려준다 — 그래야 견주는 셈을 여기서 다시 할 수 있다.
 *    생성기의 환산을 부르지 않는다(부르면 「제품이 틀릴수록 좋은 점수」가 된다).
 *
 * ⚠️ **`$…$` 경계를 요구하지 않는다.** 1단의 식은 두 양이 **한 KaTeX 덩어리**에 들어
 *    있다(`$2\,\mathrm{L}\ 3\,\mathrm{mL}+…=\square$`). 경계를 걸었더니 그 갈래에서
 *    **값 0개**가 나왔고, 「값이 없다」는 「값이 틀렸다」를 구조적으로 못 본다.
 *    섞은 꼴을 **먼저** 대므로 그 안의 작은 단위가 홑값으로 다시 세어지지 않는다.
 */
function capVals(text: string, code: string): CapVal[] {
  const { big, small } = capUnits(code);
  const re = new RegExp(
    `(\\d+)\\\\,\\\\mathrm\\{${big}\\}\\\\ (\\d+)\\\\,\\\\mathrm\\{${small}\\}` +
      `|(\\d+)\\\\,\\\\mathrm\\{${small}\\}` +
      `|(\\d+)\\\\,\\\\mathrm\\{${big}\\}`,
    "g",
  );
  const out: CapVal[] = [];
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined)
      out.push({ mixed: true, total: Number(m[1]) * 1000 + Number(m[2]) });
    else if (m[3] !== undefined)
      out.push({ mixed: false, total: Number(m[3]) });
    else out.push({ mixed: false, total: Number(m[4]) * 1000 });
  }
  return out;
}

/** 답이 섞은 꼴이면 그 값을, 아니면 `null`. */
function capMixedAnswer(answer: string, code: string): number | null {
  const { big, small } = capUnits(code);
  const m = answer.match(
    new RegExp(
      `^\\$(\\d+)\\\\,\\\\mathrm\\{${big}\\}\\\\ (\\d+)\\\\,\\\\mathrm\\{${small}\\}\\$$`,
    ),
  );
  return m ? Number(m[1]) * 1000 + Number(m[2]) : null;
}

/** 답이 맨 수(`$3649$`)이면 그 값을, 아니면 `null`. */
function capPlainAnswer(answer: string): number | null {
  const m = answer.match(/^\$(\d+)\$$/);
  return m ? Number(m[1]) : null;
}

describe("[초3 4단] 2-5 들이와 무게 — 여섯 소단원", () => {
  const ALL = [...CAPACITY, ...MASS];

  it("여섯 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of ALL) expectCoreTiers(planeUnit(code), code);
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of ALL)
      for (const tier of tiersOf(planeUnit(code))) {
        const a = generateElementaryProblem(planeUnit(code), 7373, tier);
        const b = generateElementaryProblem(planeUnit(code), 7373, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
  });

  /**
   * 들이 쪽과 무게 쪽이 **한 공장에서 나온다**는 것을 잠근다.
   * 이게 이 소단원 묶음의 설계다 — 한쪽만 고치면 두 소단원이 조용히 갈라진다.
   *
   * ⚠️ **씨앗이 같아도 두 소단원의 문항은 같지 않다.** 난수가
   *    `seed + orderIndex * 17 + TIER_SALT` 로 서므로 `orderIndex` 가 다른 순간
   *    뽑히는 값도 **고르는 갈래도** 달라진다. 첫 판이 「씨앗마다 뼈대가 같아야」로
   *    적었다가 여섯 갈래에서 빨개졌는데, 그건 결함이 아니라 **내 전제가 틀린 것**이었다.
   *
   *    그래서 **갈래별 «뼈대의 집합»**을 견준다 — 한 공장이면 씨앗을 충분히 돌렸을 때
   *    두 소단원이 내놓는 틀의 가짓수와 모양이 같아야 한다. 수·한글·단위는 지운다
   *    (그 셋은 원래 다르다). 남는 것이 곧 **틀**이다.
   */
  it("들이와 무게가 한 공장에서 나온다 — 틀의 집합이 같다", () => {
    const bad: string[] = [];
    // ⚠️ 한글은 **낱말 수까지 지운다.** 「많이 담기는」은 두 마디, 「무거운」은 한 마디라
    //    낱말마다 `·` 하나로 바꾸면 그 차이가 남아 「틀이 다르다」로 읽힌다 — 실제로
    //    비교 세 갈래가 그것 때문에 빨개졌다. 줄바꿈은 지우지 않는다(그건 틀이다).
    // ⚠️ 단위는 `\mathrm{}` **밖에도** 있다 — 「몇 L 몇 mL인지」처럼 발문 문장에 그냥 선다.
    //    안쪽만 지웠더니 단위 세 갈래가 그것 때문에 빨개졌다.
    const skeleton = (t: string) =>
      t
        .replace(/\\mathrm\{(?:mL|kg|mm|cm|km|L|g|m)\}/g, "\\mathrm{U}")
        .replace(/(?<![A-Za-z])(?:mL|kg|km|cm|mm|L|g|m)(?![A-Za-z])/g, "U")
        .replace(/\d+/g, "#")
        .replace(/[가-힣]+(?: +[가-힣]+)*/g, "·");
    for (const { kind, codes } of CAP_FAMILY) {
      const [capCode, massCode] = codes;
      for (const tier of tiersOf(planeUnit(capCode))) {
        // ⚠️ 씨앗이 **모자라면 「틀이 갈린다」가 거짓으로 뜬다.** 24개에서는 2-5-5 가
        //    단위 1단의 여섯 틀 중 다섯만 내서 빨개졌다 — 설계가 아니라 **표본** 문제였다.
        //    실측으로 40개부터 양쪽이 여섯을 다 낸다(24: 6 대 5 · 40·60·80: 6 대 6).
        const shapes = (code: string) =>
          new Set(
            CAP_SHAPE_SEEDS.map((s) =>
              skeleton(
                generateElementaryProblem(planeUnit(code), s, tier).content,
              ),
            ),
          );
        const a = shapes(capCode);
        const b = shapes(massCode);
        const onlyA = [...a].filter((x) => !b.has(x));
        const onlyB = [...b].filter((x) => !a.has(x));
        if (onlyA.length || onlyB.length)
          bad.push(
            `${kind} ${tier}: 틀이 갈린다 — ${capCode}만 ${onlyA.length} · ${massCode}만 ${onlyB.length}\n  ${(onlyA[0] ?? onlyB[0] ?? "").slice(0, 160)}`,
          );
        // 분모 — 틀이 하나도 없으면 「같다」가 «못 셈»이다.
        if (a.size === 0) bad.push(`${kind} ${tier}: 틀을 하나도 못 읽었다`);
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("비교 — 부등호·기호·차례가 지면의 값과 맞는다", () => {
    const bad: string[] = [];
    for (const code of ["2-5-1", "2-5-4"] as const)
      for (const seed of CAP_SEEDS) {
        // 1단 — 부등호가 두 값의 실제 대소와 같아야 한다.
        const calc = generateElementaryProblem(planeUnit(code), seed, "연산");
        const cv = capVals(calc.content, code);
        if (cv.length !== 2)
          bad.push(`${code} 연산 ${seed}: 값이 ${cv.length}개`);
        else {
          const want = cv[0]!.total > cv[1]!.total ? "$>$" : "$<$";
          if (calc.answer !== want)
            bad.push(
              `${code} 연산 ${seed}: ${cv[0]!.total} vs ${cv[1]!.total} 인데 답이 ${calc.answer}`,
            );
          if (cv[0]!.total === cv[1]!.total)
            bad.push(`${code} 연산 ${seed}: 두 값이 같아 답이 없다`);
          // 한쪽은 반드시 섞은 꼴이어야 «단위 맞추기»가 든다.
          if (!cv[0]!.mixed)
            bad.push(`${code} 연산 ${seed}: 섞은 꼴이 없다 — 환산이 안 든다`);
        }

        // 2단 — 묻는 쪽(많은·적은)에 맞는 기호를 답해야 한다.
        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        const wv = capVals(word.content, code);
        if (wv.length !== 2)
          bad.push(`${code} 기본 ${seed}: 값이 ${wv.length}개`);
        else {
          const askLess = /적게 담기는|가벼운/.test(word.content);
          const biggerIs = wv[0]!.total > wv[1]!.total ? "가" : "나";
          const want = askLess ? (biggerIs === "가" ? "나" : "가") : biggerIs;
          if (word.answer !== want)
            bad.push(
              `${code} 기본 ${seed}: ${askLess ? "적은" : "많은"} 쪽인데 답이 ${word.answer} (${wv[0]!.total}, ${wv[1]!.total})`,
            );
        }

        // 3단 — 답의 차례가 실제 내림차순이어야 한다.
        const ap = generateElementaryProblem(planeUnit(code), seed, "응용");
        const av = capVals(ap.content, code);
        const labels = ap.answer.split(", ");
        if (av.length !== 3 || labels.length !== 3)
          bad.push(
            `${code} 응용 ${seed}: 값 ${av.length} · 답 ${labels.length}`,
          );
        else {
          const byLabel: Record<string, number> = {
            가: av[0]!.total,
            나: av[1]!.total,
            다: av[2]!.total,
          };
          const sorted = labels.map((l) => byLabel[l]!);
          if (new Set(labels).size !== 3)
            bad.push(`${code} 응용 ${seed}: 기호가 겹친다 — ${ap.answer}`);
          if (!(sorted[0]! > sorted[1]! && sorted[1]! > sorted[2]!))
            bad.push(
              `${code} 응용 ${seed}: 차례가 아니다 — ${ap.answer} / ${sorted.join(">")}`,
            );
        }

        // 4단 — 답이 두 조건 «나 < 답 < 다» 를 채우는 **가장 큰** 수여야 한다.
        const deep = generateElementaryProblem(planeUnit(code), seed, "심화하");
        const dv = capVals(deep.content, code);
        const ans = capPlainAnswer(deep.answer);
        if (dv.length !== 2 || ans === null)
          bad.push(`${code} 심화 ${seed}: 값 ${dv.length} · 답 ${deep.answer}`);
        else {
          const [lo, hi] = [dv[0]!.total, dv[1]!.total];
          if (!(lo < hi))
            bad.push(`${code} 심화 ${seed}: 조건이 뒤집혔다 ${lo}>=${hi}`);
          if (ans !== hi - 1)
            bad.push(
              `${code} 심화 ${seed}: 가장 큰 수는 ${hi - 1} 인데 답이 ${ans}`,
            );
          if (!(ans > lo))
            bad.push(`${code} 심화 ${seed}: 답이 아래 조건을 안 채운다`);
          if (!deep.content.includes("\\square"))
            bad.push(`${code} 심화 ${seed}: 역산 표지($\\square$)가 없다`);
        }
      }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("단위 — 환산이 정확하고, 답이 **작은 단위 하나**로 떨어진다", () => {
    const bad: string[] = [];
    for (const code of ["2-5-2", "2-5-5"] as const) {
      const { big, small } = capUnits(code);
      for (const seed of CAP_SEEDS) {
        // 1단 — 등식 양변이 같은 값이어야 한다(어느 쪽에 $\square$ 가 있든).
        const calc = generateElementaryProblem(planeUnit(code), seed, "연산");
        const eq = calc.content.match(/\$([^$]*=[^$]*)\$/);
        const box = capPlainAnswer(calc.answer);
        if (!eq || box === null) {
          bad.push(`${code} 연산 ${seed}: 등식이나 답이 없다 — ${calc.answer}`);
        } else {
          const side = (t: string) => {
            const bg = t.match(new RegExp(`(\\d+)\\\\,\\\\mathrm\\{${big}\\}`));
            const sm = t.match(
              new RegExp(`(\\d+)\\\\,\\\\mathrm\\{${small}\\}`),
            );
            let v = (bg ? Number(bg[1]) * 1000 : 0) + (sm ? Number(sm[1]) : 0);
            if (new RegExp(`\\\\square\\\\,\\\\mathrm\\{${big}\\}`).test(t))
              v += box * 1000;
            if (new RegExp(`\\\\square\\\\,\\\\mathrm\\{${small}\\}`).test(t))
              v += box;
            return v;
          };
          const [l, r] = eq[1]!.split("=") as [string, string];
          if (side(l) !== side(r))
            bad.push(`${code} 연산 ${seed}: 양변이 ${side(l)} ≠ ${side(r)}`);
        }

        // 2단 — 한 값을 다른 꼴로 옮긴다. 총량이 보존돼야 한다.
        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        const wv = capVals(word.content, code);
        const wa =
          capPlainAnswer(word.answer) ?? capMixedAnswer(word.answer, code);
        if (wv.length !== 1 || wa === null)
          bad.push(`${code} 기본 ${seed}: 값 ${wv.length} · 답 ${word.answer}`);
        else if (wv[0]!.total !== wa)
          bad.push(`${code} 기본 ${seed}: ${wv[0]!.total} ≠ ${wa}`);

        // 3단 — 한 그릇 몫 × 개수. 답은 작은 단위 하나.
        const ap = generateElementaryProblem(planeUnit(code), seed, "응용");
        const av = capVals(ap.content, code);
        const cnt = ap.content.match(/\$(\d+)\$개/);
        const aa = capPlainAnswer(ap.answer);
        if (av.length !== 1 || !cnt || aa === null)
          bad.push(
            `${code} 응용 ${seed}: 값 ${av.length} · 개수 ${cnt?.[1]} · 답 ${ap.answer}`,
          );
        else if (av[0]!.total * Number(cnt[1]) !== aa)
          bad.push(`${code} 응용 ${seed}: ${av[0]!.total}×${cnt[1]} ≠ ${aa}`);

        // 4단 — 되짚기(덜어 낸 것 + 남은 것). 답은 작은 단위 하나.
        const deep = generateElementaryProblem(planeUnit(code), seed, "심화하");
        const dv = capVals(deep.content, code);
        const da = capPlainAnswer(deep.answer);
        if (dv.length !== 2 || da === null)
          bad.push(`${code} 심화 ${seed}: 값 ${dv.length} · 답 ${deep.answer}`);
        else {
          if (dv[0]!.total + dv[1]!.total !== da)
            bad.push(
              `${code} 심화 ${seed}: ${dv[0]!.total}+${dv[1]!.total} ≠ ${da}`,
            );
          if (dv[0]!.total === dv[1]!.total)
            bad.push(`${code} 심화 ${seed}: 덜어 낸 양과 남은 양이 같다`);
          if (!/처음/.test(deep.content))
            bad.push(`${code} 심화 ${seed}: 되짚기 표지(「처음」)가 없다`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("합과 차 — 값이 맞고, 심화는 **받아내림이 반드시** 난다", () => {
    const bad: string[] = [];
    let calcCross = 0;
    for (const code of ["2-5-3", "2-5-6"] as const)
      for (const seed of CAP_SEEDS) {
        // 1단 — 식 그대로. 자리 넘김이 나는 씨앗을 따로 센다(아래에서 분모로 쓴다).
        const calc = generateElementaryProblem(planeUnit(code), seed, "연산");
        const cv = capVals(calc.content, code);
        const ca = capMixedAnswer(calc.answer, code);
        const isAdd = calc.content.includes("}+");
        if (cv.length !== 2 || ca === null)
          bad.push(`${code} 연산 ${seed}: 값 ${cv.length} · 답 ${calc.answer}`);
        else {
          const want = isAdd
            ? cv[0]!.total + cv[1]!.total
            : cv[0]!.total - cv[1]!.total;
          if (want !== ca)
            bad.push(
              `${code} 연산 ${seed}: ${cv[0]!.total}${isAdd ? "+" : "-"}${cv[1]!.total} = ${want} ≠ ${ca}`,
            );
          const s1 = cv[0]!.total % 1000;
          const s2 = cv[1]!.total % 1000;
          if (isAdd ? s1 + s2 >= 1000 : s1 < s2) calcCross += 1;
        }

        // 2단 — 문장. 답은 섞은 꼴.
        const word = generateElementaryProblem(planeUnit(code), seed, "기본");
        const wv = capVals(word.content, code);
        const wa = capMixedAnswer(word.answer, code);
        if (wv.length !== 2 || wa === null)
          bad.push(`${code} 기본 ${seed}: 값 ${wv.length} · 답 ${word.answer}`);
        else {
          const plus = /담았습니다/.test(word.content);
          const want = plus
            ? wv[0]!.total + wv[1]!.total
            : wv[0]!.total - wv[1]!.total;
          if (want !== wa)
            bad.push(`${code} 기본 ${seed}: ${want} ≠ ${wa} — ${word.content}`);
        }

        // 3단 — 두 단계(더하고 덜어 낸다).
        const ap = generateElementaryProblem(planeUnit(code), seed, "응용");
        const av = capVals(ap.content, code);
        const aa = capMixedAnswer(ap.answer, code);
        if (av.length !== 3 || aa === null)
          bad.push(`${code} 응용 ${seed}: 값 ${av.length} · 답 ${ap.answer}`);
        else if (av[0]!.total + av[1]!.total - av[2]!.total !== aa)
          bad.push(
            `${code} 응용 ${seed}: ${av[0]!.total}+${av[1]!.total}-${av[2]!.total} ≠ ${aa}`,
          );

        // 4단 — 되짚기. 답 + 더한 양 = 나중 양이어야 하고, **받아내림이 난다.**
        const deep = generateElementaryProblem(planeUnit(code), seed, "심화하");
        const dv = capVals(deep.content, code);
        const da = capMixedAnswer(deep.answer, code);
        if (dv.length !== 2 || da === null)
          bad.push(`${code} 심화 ${seed}: 값 ${dv.length} · 답 ${deep.answer}`);
        else {
          const [added, end] = [dv[0]!.total, dv[1]!.total];
          if (da + added !== end)
            bad.push(`${code} 심화 ${seed}: ${da}+${added} ≠ ${end}`);
          if (!(end % 1000 < added % 1000))
            bad.push(
              `${code} 심화 ${seed}: 받아내림이 안 난다 (${end % 1000} >= ${added % 1000})`,
            );
          if (!/처음/.test(deep.content))
            bad.push(`${code} 심화 ${seed}: 되짚기 표지(「처음」)가 없다`);
        }
      }
    expect(bad.slice(0, 6)).toEqual([]);
    // ⚠️ **분모를 같이 잠근다.** 「자리 넘김이 난다」를 안 세면 1단이 전부 넘김 없는
    //    값으로 굳어도 초록이다 — 그러면 이 소단원이 「단위」와 구별되지 않는다.
    const total = CAP_SEEDS.length * 2;
    expect(
      calcCross,
      `1단에서 자리 넘김이 난 씨앗 ${calcCross}/${total}`,
    ).toBeGreaterThan(total / 5);
    expect(
      calcCross,
      "1단이 전부 자리 넘김이면 넘김 없는 꼴을 못 낸다",
    ).toBeLessThan(total);
  });

  it("답의 모양이 갈래마다 갈린다 — 세 소단원이 서로를 흉내 내지 않는다", () => {
    const bad: string[] = [];
    for (const seed of CAP_SEEDS.slice(0, 8))
      for (const tier of tiersOf(planeUnit("2-5-1"))) {
        for (const code of ["2-5-3", "2-5-6"] as const) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          if (capMixedAnswer(p.answer, code) === null)
            bad.push(
              `${code} ${tier} ${seed}: 합과 차의 답은 섞은 꼴이어야 — ${p.answer}`,
            );
        }
        for (const code of ["2-5-2", "2-5-5"] as const) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          // 2단만 «작은 단위 → 섞은 꼴» 방향이 있어 예외다. 나머지는 맨 수.
          if (tier !== "기본" && capPlainAnswer(p.answer) === null)
            bad.push(
              `${code} ${tier} ${seed}: 단위의 답은 맨 수여야 — ${p.answer}`,
            );
        }
        for (const code of ["2-5-1", "2-5-4"] as const) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const ok =
            /^\$[<>]\$$/.test(p.answer) ||
            /^[가나다](, [가나다])*$/.test(p.answer) ||
            (tier === "심화하" && capPlainAnswer(p.answer) !== null);
          if (!ok)
            bad.push(
              `${code} ${tier} ${seed}: 비교의 답은 기호·부등호여야 — ${p.answer}`,
            );
        }
      }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  /**
   * ⚠️ **이건 내가 실제로 낸 결함이다**(2026-08-24). cfg 에 적어 둔 조사 넷은
   * `L`·`kg` 의 **읽는 소리**를 따르는 값인데, 그것을 한글 낱말 「무게」에 대서
   * 「두 무게**을** 비교하여」·「세 봉지의 무게**이**」가 지면에 나갔다.
   *
   * **들이 쪽은 우연히 맞아서 안 드러났다** — 리터의 조사(를·가)와 「들이」의 조사가
   * 같기 때문이다. 그래서 이 잠금은 **무게 쪽이 있어야 뜻이 있다.**
   * 지면을 눈으로 보고서야 찾았고, 고친 뒤 여기 못 박는다.
   */
  it("한글 낱말에 **단위 조사**를 대지 않는다 — 「무게을」·「무게이」가 없다", () => {
    const bad: string[] = [];
    let looked = 0;
    for (const code of [...CAPACITY, ...MASS])
      for (const tier of tiersOf(planeUnit(code)))
        for (const seed of CAP_SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const t = `${p.content}\n${p.solution}`;
          if (/들이|무게/.test(t)) looked += 1;
          for (const m of t.matchAll(/(들이|무게)([은는이가을를])/g)) {
            const word = m[1]!;
            const got = m[2]!;
            // 「들이」·「무게」는 둘 다 받침이 없다 — 는·가·를 만 옳다.
            if (["은", "이", "을"].includes(got))
              bad.push(`${code} ${tier} ${seed}: 「${word}${got}」`);
          }
        }
    expect(bad.slice(0, 6)).toEqual([]);
    // 분모 — 그 낱말이 지면에서 사라지면 이 잠금은 «못 셈»이 된다.
    expect(
      looked,
      "「들이」·「무게」가 지면에 하나도 없다 — 축이 사라졌다",
    ).toBeGreaterThan(0);
  });

  it("답의 작은 자리가 $0$ 인 섞은 꼴이 없다", () => {
    const bad: string[] = [];
    for (const code of [...CAPACITY, ...MASS]) {
      const { big, small } = capUnits(code);
      const zero = new RegExp(
        `\\d+\\\\,\\\\mathrm\\{${big}\\}\\\\ 0\\\\,\\\\mathrm\\{${small}\\}`,
      );
      const zeroBig = new RegExp(`\\$0\\\\,\\\\mathrm\\{${big}\\}`);
      for (const tier of tiersOf(planeUnit(code)))
        for (const seed of CAP_SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const t = `${p.content}\n${p.answer}\n${p.solution}`;
          if (zero.test(t))
            bad.push(`${code} ${tier} ${seed}: 작은 자리가 $0$`);
          if (zeroBig.test(t))
            bad.push(`${code} ${tier} ${seed}: 큰 자리가 $0$`);
        }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });
});

/* ══════════ 점격자가 **렌더러 한도 안에** 있는가 (2026-08-24) ══════════
 *
 * ## 왜 이 시험이 따로 있나 — **갈래 시험은 스펙을 그려 보지 않는다**
 *
 * 위의 도형 시험들은 `figureSpec` 의 **필드**를 읽는다(점이 몇 개인가·직각인가).
 * 그런데 그 스펙이 **실제로 그려지는가**는 아무도 안 물었다. 그래서 초3 1-2-2·1-2-3·
 * 1-2-4 의 **245건**이 렌더러에서 던지고 있었고 — 즉 지면에 **그림 없이** 나가고
 * 있었고 — 초3 시험은 **전부 초록**이었다(2026-08-24, 리드가 전량 렌더로 찾아 줬다).
 *
 * 같은 구멍이 그날 하루에 셋이었다(초4 표 192 · 초6 구 5 · 여기 245).
 * **없는 축은 변이시킬 수 없다** — 그래서 축을 만든다.
 *
 * ## 무엇을 재고 무엇을 **못** 재나
 *
 * ㉠ **잰다**: `cols`·`rows` 가 렌더러 한도(1~10) 안인가. 이것이 245건의 실제 사유였다.
 * ㉡ **못 잰다**: 「그려진 그림이 **옳은가**」는 여기서 못 본다. 파이썬 렌더러를
 *    vitest 에서 부를 수 없기 때문이다 — 전량 렌더는 그림 판정기 몫이다.
 *    이 시험은 **그 판정기가 못 도는 날에도 남는 최소선**이다.
 * ㉢ 한도 `10` 은 `scripts/figure/elementary.py` 에도 있다 — **두 벌**이다.
 *    저쪽이 한도를 **좁히면** 이 시험은 초록인 채로 놓친다. 그래서 g3.ts 는
 *    접고도 안 들어가면 **던지고**, `probe-elem-throw` 가 전 씨앗을 쓴다.
 */
describe("[초3 그림] 점격자가 렌더러 한도 안에 있다", () => {
  const GRID_MAX = 10;

  it("cols·rows 가 $1$~$10$ 이고, 접힌 자리가 실제로 있다", () => {
    const bad: string[] = [];
    let seen = 0;
    let folded = 0;
    for (const u of elementaryUnits().filter((x) => x.grade === "초3"))
      for (const tier of [
        undefined,
        ...(supportedTiers(u).length > 0 ? tiersOf(u) : []),
      ])
        for (const seed of SEEDS) {
          const spec = generateElementaryProblem(u, seed, tier).figureSpec as {
            kind?: string;
            cols?: number;
            rows?: number;
          } | null;
          if (!spec || spec.kind !== "pointGrid") continue;
          seen += 1;
          const { cols = 0, rows = 0 } = spec;
          if (cols < 1 || cols > GRID_MAX || rows < 1 || rows > GRID_MAX)
            bad.push(
              `${u.section} «${tier ?? "표준"}» 씨앗 ${seed}: ${cols}x${rows}`,
            );
          // 접으면 반드시 두 줄 이상이 된다 — 원래 띠는 rows 2~3 이다.
          if (rows > 4) folded += 1;
        }
    expect(bad.slice(0, 6)).toEqual([]);
    // ⚠️ **분모 둘.** 스펙을 하나도 못 보면 「한도 안」은 «못 셈»이고,
    //    접힌 자리가 하나도 없으면 이 시험은 **고치기 전에도 초록**이었을 것이다.
    expect(
      seen,
      "점격자 스펙을 하나도 못 봤다 — 축이 사라졌다",
    ).toBeGreaterThan(100);
    expect(
      folded,
      "접힌 점격자가 하나도 없다 — 접기를 지우면 245건이 되살아나는데 이 시험이 못 본다",
    ).toBeGreaterThan(0);
  });
});

/* ══════════ D-73 — 지면에 «정수로 읽히는 분수»가 있어도 되나 (2026-08-24) ══════════
 *
 * main 이 전처리의 「가분수 → 대분수·정수」 자동 변환을 없앴다(D-73). 그 전에는
 * `\frac{9}{3}` 이 지면에서 `3` 으로 접혔고, 그래서 **엔진이 접힘에 기대고** 있었다.
 *
 * ⚠️ **정수로 읽히는 분수가 전부 결함인 것은 아니다.** 초3 전량(잰 칸 31,200)에서
 *    75자리가 남아 있고 **전부 옳다** — 하나씩 보고 정했다:
 *      · 2-4-5 해설 `\frac{12}{3}`  — 「자연수를 분모 $3$ 인 분수로 고치면」의 **그 단계**다.
 *                                     `4` 로 접히면 계산 단계가 통째로 사라진다.
 *      · 2-4-4 보기 `\frac{8}{4}`   — 「가분수를 고르시오」의 **정답 보기**다. `2` 로
 *                                     접히면 가분수가 한 개도 안 보여 문항이 죽는다.
 *      · 2-4-4 `\frac{3}{3}`        — 분자 = 분모도 가분수다. `1` 로 접으면 안 된다.
 *
 * 그래서 이 시험은 「0이어야 한다」가 아니라 **「그 한 자리가 다시 생기지 않는다」**만 잠근다.
 * 걸렸던 자리는 2-4-4 **심화의 견줄 상대**다(발문 7 · 해설 7).
 */
describe("[초3 D-73] 견줄 상대가 «정수로 읽히는 분수»가 아니다", () => {
  it("2-4-4 심화의 상대는 늘 진짜 가분수다", () => {
    const bad: string[] = [];
    let looked = 0;
    const unit = planeUnit("2-4-4");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, "심화하");
      const fracs = [
        ...`${p.content}\n${p.solution}`.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g),
      ];
      // □ 가 든 분수는 수가 아니라 안 잡힌다 — 견줄 상대만 남는다.
      for (const m of fracs) {
        const a = Number(m[1]);
        const b = Number(m[2]);
        looked += 1;
        if (a % b === 0)
          bad.push(
            `씨앗 ${seed}: 상대가 $${a}/${b}$ — 지면에서 「${a / b}」로 읽힌다`,
          );
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // 분모 — 상대가 사라지면 이 잠금은 «못 셈»이 된다.
    expect(
      looked,
      "심화 발문·해설에서 수 분수를 하나도 못 읽었다 — 축이 사라졌다",
    ).toBeGreaterThan(SEEDS.length);
  });

  it("그래도 **가분수 자체는** 지면에 나온다 — 이 소단원이 다루는 것이다", () => {
    let improper = 0;
    const unit = planeUnit("2-4-4");
    for (const seed of SEEDS)
      for (const tier of tiersOf(unit)) {
        const p = generateElementaryProblem(unit, seed, tier);
        for (const m of p.content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g))
          if (Number(m[1]) >= Number(m[2])) improper += 1;
      }
    // 「정수로 읽히는 것을 막았다」가 「가분수를 다 없앴다」가 되면 문항이 죽는다.
    expect(
      improper,
      "발문에 가분수가 하나도 없다 — 「가분수를 고르시오」가 성립하지 않는다",
    ).toBeGreaterThan(0);
  });
});

/* ══════════ 초3 2-3 원 — 그림이 답도 풀이 단계도 말하지 않는다 (2026-08-24) ══════════
 *
 * 배선은 elem-figures 가 했고(`circleParts`), **잠금 내용도 그쪽이 줬다.** 여기 두는
 * 것은 `elemTiersG3.test.ts` 가 g3 창이기 때문이다 — 같은 파일을 둘이 쓰면 덮는다.
 *
 * ## 세 소단원이 **셋 다 이유가 다르다** — 겉보기로 묶지 마라
 *
 *   · **2-3-2** 는 「적으면 **답**이라서」 묻는 쪽을 안 적는다(그림은 붙는다).
 *   · **2-3-1** 은 답이 **낱말**이라 치수를 안 적는다. 선분은 그린다(`show`) —
 *     「이 선분을 무엇이라 하는지」를 묻는데 선분이 없으면 그림이 아무 말도 안 한다.
 *   · **2-3-3** 은 그림을 **아예 안 붙인다.** 갈리는 것이 컴퍼스 벌린 길이 하나인데
 *     ㉠ 치수로 적으면 숨은 단계(**「벌린 길이 = 반지름」**)를 그림이 대신하고
 *     ㉡ 원 크기로 나타내려 해도 이 kind 는 **고정 62px 도식**이라 값을 안 따른다.
 *     남는 것은 맨 원이고 **맨 원은 나르는 것이 없다.** `R9-b` 가 잡았다(2026-08-24).
 *
 * ⚠️ **뜻 없는 변화로 R9 를 통과시키지 마라.** 「원 크기를 씨앗마다 흔들면 되겠네」가
 *    첫 제안이었고 기각됐다 — R9 가 묻는 것은 「씨앗마다 다른가」가 아니라
 *    **「그림이 정보를 나르는가」**다. 그걸 속이면 가드가 남고 뜻은 사라진다.
 *
 * **값 검산으로는 셋 다 안 잡힌다** — 답은 맞기 때문이다. 그래서 여기서 못 박는다.
 * 되돌리기 가장 쉬운 것이 2-3-3 이다(「2-3-2 처럼 붙이면 되겠네」).
 *
 * ⚠️ `toMatchObject` 로 본다. elem-figures 가 2-3-1 에 선분을 그리는 축(`show`)을
 *    더하는 중이라 **키가 는다** — 엄격 비교로 바꾸면 그 작업에서 빨개진다.
 */
describe("[초3 그림] 2-3 원 — 그림이 답도 풀이 단계도 말하지 않는다", () => {
  const CIRCLE_SEEDS = Array.from({ length: 120 }, (_, i) => i);

  /**
   * **표준과 갈래를 다 돈다.** 그물을 갈래까지 넓힌 자리다(2026-08-24).
   *
   * ⚠️ 처음 판은 갈래 인자를 안 줘서 **표준만** 봤다. 그 상태로 2-3 에 4단을 얹으면
   *    갈래 넷의 그림은 **아무도 안 본다** — 하필 4단이 역산이라 답과 그림이 가장
   *    가까워지는 자리인데(09 §2.2 「심화는 ①에 가장 자주 걸린다」) 그물이 없다.
   *    지금은 갈래가 없어 `[undefined]` 하나만 돌지만, **등록되는 순간 자동으로 문다.**
   */
  const circleVariants = (code: string) => {
    const u = planeUnit(code);
    return [
      undefined,
      ...(supportedTiers(u).length > 0 ? tiersOf(u) : []),
    ] as const;
  };
  const specOf = (
    code: string,
    seed: number,
    tier?: (typeof ELEM_TIERS)[number],
  ) =>
    generateElementaryProblem(planeUnit(code), seed, tier).figureSpec as Record<
      string,
      unknown
    > | null;

  /**
   * **그림이 어느 갈래에 붙는지를 «표»로 못 박는다.**
   *
   * ⚠️ 첫 판은 「2-3-1 전 갈래에 그림이 붙는다」였고, 갈래를 등록하자마자 빨개졌다 —
   *    **결함이 아니라 내 전제가 틀린 것**이었다. 실측(09 §2.2)으로 **갈래에 그림이
   *    없는 것이 섞이는 소단원이 76%** 다. 「어떤 갈래에 그림이 없다」는 정상이다.
   *
   * 그렇다고 「있으면 보고 없으면 넘긴다」로 느슨하게 두면, **4단에 그림을 새로 붙여
   * 답을 새게 하는 회귀**가 그물을 그냥 지나간다. 그래서 **있고 없음 자체를 적는다.**
   *
   *   · 2-3-2 — 전 갈래에 붙는다(늘 «준 쪽» 치수를 적을 것이 있다)
   *   · 2-3-1 — **표준·연산만.** 그 둘은 선분을 그려 놓고 이름을 묻는다(⑤).
   *     2·3·4단은 성질을 **말로** 묻는 문항이라 그릴 것이 없다(③).
   *   · 2-3-3 — 전 갈래에 **없다**(⑴-b 가 따로 본다).
   */
  const CIRCLE_HAS_FIG: Record<string, readonly (string | undefined)[]> = {
    "2-3-1": [undefined, "연산"],
    "2-3-2": [undefined, "연산", "기본", "응용", "심화하", "심화중", "심화상"],
  };

  it("⑴ 그림이 붙는 갈래가 정해진 그대로다", () => {
    const bad: string[] = [];
    for (const code of ["2-3-1", "2-3-2"] as const)
      for (const tier of circleVariants(code))
        for (const seed of CIRCLE_SEEDS.slice(0, 40)) {
          const spec = specOf(code, seed, tier);
          const want = CIRCLE_HAS_FIG[code]!.includes(tier);
          const got = spec !== null && spec !== undefined;
          if (got !== want)
            bad.push(
              `${code} «${tier ?? "표준"}» 씨앗 ${seed}: 그림이 ${got ? "있다" : "없다"} — ${want ? "있어야" : "없어야"} 한다`,
            );
          if (got && want)
            expect(
              spec,
              `${code} «${tier ?? "표준"}» 씨앗 ${seed}`,
            ).toMatchObject({ version: "elem-1", kind: "circleParts" });
        }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  /**
   * ⚠️ **첫 판은 「2-3 전 소단원에 그림이 붙는다」였다 — 측정이 아니라 가정이었다.**
   * 정작 그림 수요 조사에는 「그림 0% 인 소단원 141개 중 **본문이 그림을 가리키는데
   * 없는 것은 0건**」이라 적혀 있다 — **그림이 없는 것이 정상인 자리가 있다.**
   * 알고도 잠금은 반대로 걸었던 것이고, `R9-b` 가 그것을 되짚어 줬다.
   */
  it("⑴-b 2-3-3 에는 그림이 **없다** — 나를 정보가 없다", () => {
    const bad: string[] = [];
    for (const tier of circleVariants("2-3-3"))
      for (const seed of CIRCLE_SEEDS) {
        const spec = specOf("2-3-3", seed, tier);
        if (spec !== null && spec !== undefined)
          bad.push(
            `«${tier ?? "표준"}» 씨앗 ${seed}: 그림이 붙었다 — ${JSON.stringify(spec)}`,
          );
      }
    expect(bad.slice(0, 5)).toEqual([]);
    // 분모 — 「그림이 없다」가 «소단원이 사라져서»면 안 된다.
    expect(
      generateElementaryProblem(planeUnit("2-3-3"), 0).content,
      "2-3-3 이 발문을 안 낸다 — 축이 사라졌다",
    ).toContain("컴퍼스");
  });

  it("⑵ 2-3-2 는 **준 값**만 적는다 — 적힌 수가 답이면 안 된다", () => {
    const bad: string[] = [];
    let looked = 0;
    for (const tier of circleVariants("2-3-2"))
      for (const seed of CIRCLE_SEEDS) {
        const p = generateElementaryProblem(planeUnit("2-3-2"), seed, tier);
        const spec = p.figureSpec as Record<string, unknown>;
        const labeled = (spec.radius ?? spec.diameter) as string | undefined;
        if (labeled === undefined) {
          bad.push(`씨앗 ${seed}: 준 쪽을 안 그렸다`);
          continue;
        }
        looked += 1;
        const num = String(labeled).replace(/[^\d.]/g, "");
        // ㉠ 적힌 수는 **발문에 있는 수**여야 한다(준 값이다).
        if (!p.content.includes(num))
          bad.push(`씨앗 ${seed}: 그림의 ${num} 이 발문에 없다`);
        // ㉡ 그리고 **답이면 안 된다.**
        if (num === p.answer.replace(/[^\d.]/g, ""))
          bad.push(`씨앗 ${seed}: 그림이 답(${num})을 말한다`);
        // ㉢ 둘을 같이 적으면 엔진이 던진다 — 여기서도 막는다.
        if (spec.radius !== undefined && spec.diameter !== undefined)
          bad.push(`씨앗 ${seed}: 반지름과 지름을 둘 다 적었다`);
      }
    expect(bad.slice(0, 5)).toEqual([]);
    expect(looked, "치수가 적힌 그림을 하나도 못 봤다 — 축이 사라졌다").toBe(
      CIRCLE_SEEDS.length * circleVariants("2-3-2").length,
    );
  });

  it("⑷ 2-3-1 은 치수를 안 적는다 — 답이 낱말이라 수는 쓸 데가 없다", () => {
    const bad: string[] = [];
    let looked = 0;
    // 그림이 **붙는 갈래에서만** 본다 — 어느 갈래에 붙는지는 ⑴ 이 따로 못 박는다.
    for (const tier of circleVariants("2-3-1"))
      for (const seed of CIRCLE_SEEDS) {
        const spec = specOf("2-3-1", seed, tier);
        if (!spec) continue;
        looked += 1;
        if (spec.radius !== undefined || spec.diameter !== undefined)
          bad.push(
            `«${tier ?? "표준"}» 씨앗 ${seed}: 답이 낱말인데 치수를 적었다`,
          );
      }
    expect(bad.slice(0, 5)).toEqual([]);
    // 분모 — 그림이 붙는 갈래 수만큼은 봐야 한다. 0 이면 «못 셈»이다.
    expect(looked, "2-3-1 그림을 하나도 못 봤다 — 축이 사라졌다").toBe(
      CIRCLE_SEEDS.length * CIRCLE_HAS_FIG["2-3-1"]!.length,
    );
  });
});

/* ══════════════ 2-6 그림그래프 (D-72 확대, 2026-08-24) ══════════════
 *
 * **참은 지면에서 온다.** 그런데 이 소단원은 지면의 절반이 **그림**이라, 발문 문자열이
 * 아니라 `figureSpec` 의 칸 수를 읽어 여기서 다시 셈한다.
 *
 * ## 이 묶음이 지키는 것 — **그림이 답을 말하지 않는다**
 *
 * elem-figures 가 2-3 에서 잡은 것과 같은 부류이고, 여기는 자리가 둘이다:
 *   · **2-6-2 는 큰·작은 그림을 안 그린다.** 그려 놓고 「몇 개 그려야 하나」를 물으면
 *     **세면 답**이다. 표만 준다.
 *   · **2-6-1 심화는 묻는 곳을 그림에서 뺀다.** 그려 두고 물으면 칸을 세면 끝이라
 *     역산이 아니다.
 *
 * 둘 다 **값 검산으로는 안 잡힌다** — 답은 맞기 때문이다. 그래서 여기서 못 박는다.
 */
type PicItem = { label: string; count: number };
type PicSpec = { kind?: string; unit?: number; items?: PicItem[] };

const GRAPH_SEEDS = Array.from({ length: 24 }, (_, i) => 20260824 + i * 4231);
const GRAPH_CODES = ["2-6-1", "2-6-2"] as const;

const picOf = (code: string, seed: number, tier: (typeof ELEM_TIERS)[number]) =>
  generateElementaryProblem(planeUnit(code), seed, tier)
    .figureSpec as PicSpec | null;

/** 답 `큰 그림 $3$개, 작은 그림 $5$개` → `[3, 5]`. */
function bigSmall(answer: string): [number, number] | null {
  const m = answer.match(/큰 그림 \$(\d+)\$개, 작은 그림 \$(\d+)\$개/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

describe("[초3 4단] 2-6 그림그래프 — 두 소단원", () => {
  it("두 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of GRAPH_CODES) expectCoreTiers(planeUnit(code), code);
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of GRAPH_CODES)
      for (const tier of tiersOf(planeUnit(code))) {
        const a = generateElementaryProblem(planeUnit(code), 5150, tier);
        const b = generateElementaryProblem(planeUnit(code), 5150, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
  });

  /**
   * ⚠️ 렌더러는 `count` 0~12 · `items` 1~6 을 받고, 넘쳐도 **안 던진다**
   * (`_svg` 가 viewBox 를 넓힌다). 그런데 넓어지면 두 단 지면에서 **줄어든다** —
   * 실측 `count` 8부터 240 → 356. 그래서 **우리가** 묶는다. 렌더러에 기대면
   * 「안 던지니 괜찮다」로 읽고 작은 아이콘이 지면에 나간다.
   */
  it("그림그래프 칸 수가 지면 폭 안에 있다 — 칸 ≤ 7 · 항목 ≤ 4", () => {
    const bad: string[] = [];
    let looked = 0;
    for (const code of GRAPH_CODES)
      for (const tier of tiersOf(planeUnit(code)))
        for (const seed of GRAPH_SEEDS) {
          const spec = picOf(code, seed, tier);
          if (!spec || spec.kind !== "pictograph") continue;
          looked += 1;
          const items = spec.items ?? [];
          if (items.length < 1 || items.length > 4)
            bad.push(`${code} ${tier} ${seed}: 항목 ${items.length}개`);
          for (const it of items)
            if (it.count < 1 || it.count > 7)
              bad.push(`${code} ${tier} ${seed}: ${it.label} 칸 ${it.count}`);
        }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(
      looked,
      "그림그래프를 하나도 못 봤다 — 축이 사라졌다",
    ).toBeGreaterThan(0);
  });

  it("2-6-1 — 답이 그림의 칸 수와 맞는다 (읽는 쪽)", () => {
    const bad: string[] = [];
    for (const seed of GRAPH_SEEDS) {
      // 1단 — 한 곳의 값 = 칸 수 × 한 칸.
      const calc = generateElementaryProblem(planeUnit("2-6-1"), seed, "연산");
      const cs = calc.figureSpec as PicSpec;
      const step = cs.unit!;
      const label = calc.content.match(/([가나다라]) /)?.[1];
      const row = (cs.items ?? []).find((x) => x.label === label);
      if (!row) bad.push(`연산 ${seed}: 「${label}」 줄이 그림에 없다`);
      else if (answerOf(calc.answer) !== row.count * step)
        bad.push(`연산 ${seed}: ${row.count}×${step} ≠ ${calc.answer}`);

      // 2단 — 가장 많은/적은 곳. 칸 수가 겹치면 답이 하나로 안 정해진다.
      const word = generateElementaryProblem(planeUnit("2-6-1"), seed, "기본");
      const ws = word.figureSpec as PicSpec;
      const items = ws.items ?? [];
      const counts = items.map((x) => x.count);
      if (new Set(counts).size !== counts.length)
        bad.push(`기본 ${seed}: 칸 수가 겹친다 — ${counts.join(",")}`);
      const askMost = word.content.includes("가장 많은");
      const want = items.find(
        (x) =>
          x.count === (askMost ? Math.max(...counts) : Math.min(...counts)),
      )!;
      if (word.answer !== want.label)
        bad.push(
          `기본 ${seed}: ${askMost ? "최다" : "최소"}는 ${want.label} 인데 답이 ${word.answer}`,
        );

      // 3단 — 두 곳의 합 또는 차.
      const ap = generateElementaryProblem(planeUnit("2-6-1"), seed, "응용");
      const as2 = ap.figureSpec as PicSpec;
      const marks = [...ap.content.matchAll(/([가나다라]) /g)].map(
        (m) => m[1]!,
      );
      const two = [...new Set(marks)].slice(0, 2);
      const rows = two.map((l) => (as2.items ?? []).find((x) => x.label === l));
      if (rows.some((r) => !r) || two.length !== 2)
        bad.push(`응용 ${seed}: 두 곳을 못 읽었다 — ${marks.join(",")}`);
      else {
        const [p, q] = rows as [PicItem, PicItem];
        const st = as2.unit!;
        const isSum = ap.content.includes("더하면");
        const want2 = isSum
          ? (p.count + q.count) * st
          : Math.abs(p.count - q.count) * st;
        if (answerOf(ap.answer) !== want2)
          bad.push(
            `응용 ${seed}: ${isSum ? "합" : "차"} ${want2} ≠ ${ap.answer}`,
          );
        if (!isSum && p.count === q.count)
          bad.push(`응용 ${seed}: 차가 $0$ 이다 — 문항이 안 된다`);
      }

      // 4단 — 묻는 곳은 **그림에 없어야** 한다. 있으면 칸을 세면 끝이라 역산이 아니다.
      const deep = generateElementaryProblem(
        planeUnit("2-6-1"),
        seed,
        "심화하",
      );
      const ds = deep.figureSpec as PicSpec;
      const shown = ds.items ?? [];
      if (shown.some((x) => x.label === "라"))
        bad.push(`심화 ${seed}: 묻는 곳(라)이 그림에 있다 — 세면 답이다`);
      const st2 = ds.unit!;
      const total = Number(deep.content.match(/전체가 \$(\d+)\$/)?.[1] ?? NaN);
      const sum = shown.reduce((a, b) => a + b.count, 0) * st2;
      if (!Number.isFinite(total))
        bad.push(`심화 ${seed}: 전체 값을 발문에서 못 읽었다`);
      else if (answerOf(deep.answer) !== total - sum)
        bad.push(`심화 ${seed}: ${total}-${sum} ≠ ${deep.answer}`);
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("2-6-2 — 큰·작은 그림 개수가 자릿값과 맞는다 (나타내는 쪽)", () => {
    const bad: string[] = [];
    for (const tier of tiersOf(planeUnit("2-6-2")))
      for (const seed of GRAPH_SEEDS) {
        const p = generateElementaryProblem(planeUnit("2-6-2"), seed, tier);
        // ⚠️ D-113 확대 갈래는 **답 모양이 다르다** — 중은 «나타내는 수», 상은
        //    «큰 그림 수»를 묻는다. 그래도 재는 것은 같다: 지면의 그림 수와
        //    자릿값이 맞는가. 여기를 «답 모양이 아니다»로 두면 채운 갈래가
        //    아무 검사도 안 받는다(0 이 «깨끗»과 «못 셈»을 안 가르는 그 자리다).
        if (tier === "심화중" || tier === "심화상") {
          const tm = p.content.match(/(?:모두|합해|그림) \$(\d+)\$개/);
          if (!tm) {
            bad.push(`${tier} ${seed}: 그림 수를 못 읽었다 — ${p.content}`);
            continue;
          }
          const total = Number(tm[1]);
          const got = Number(/\$(\d+)\$/.exec(p.answer)![1]);
          // 중은 값을, 상은 큰 그림 수를 답한다 — 어느 쪽이든 자릿값이 맞아야 한다.
          const bigN = tier === "심화중" ? Math.floor(got / 10) : got;
          const smallN = total - bigN;
          if (smallN < 0 || smallN > 9)
            bad.push(
              `${tier} ${seed}: 작은 그림 ${smallN}개 — 일의 자리가 아니다`,
            );
          if (bigN < 1) bad.push(`${tier} ${seed}: 큰 그림 ${bigN}개`);
          const v = bigN * 10 + smallN;
          if (!p.solution.includes(`10\\times${bigN}+${smallN}=${v}`))
            bad.push(
              `${tier} ${seed}: 해설에 자릿값 등식이 없다 — ${p.solution.slice(0, 60)}`,
            );
          continue;
        }
        const bs = bigSmall(p.answer);
        if (!bs) {
          bad.push(`${tier} ${seed}: 답 모양이 아니다 — ${p.answer}`);
          continue;
        }
        const [big, small] = bs;
        // 큰 그림 한 개 = $10$, 작은 그림 한 개 = $1$ 이므로 값은 이렇게 선다.
        if (small < 1 || small > 9)
          bad.push(
            `${tier} ${seed}: 작은 그림 ${small}개 — 일의 자리가 아니다`,
          );
        if (big < 1) bad.push(`${tier} ${seed}: 큰 그림 ${big}개`);
        // 해설이 그 자릿값을 실제로 보여야 한다(등식으로).
        const val = big * 10 + small;
        const eqFwd = `10\\times${big}+${small}=${val}`;
        const eqBack = `${val}=10\\times${big}+${small}`;
        if (!p.solution.includes(eqFwd) && !p.solution.includes(eqBack))
          bad.push(
            `${tier} ${seed}: 해설에 자릿값 등식이 없다 — ${p.solution.slice(0, 60)}`,
          );
      }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  /**
   * ⚠️ **이것이 이 소단원의 목숨이다.** 큰·작은 그림을 그려 주면 「몇 개 그려야
   * 하나」의 답이 **지면에 그려져 있다.** 값 검산은 통과한다 — 답이 맞으니까.
   */
  it("2-6-2 는 그림그래프를 **그리지 않는다** — 그리면 세면 답이다", () => {
    const bad: string[] = [];
    let looked = 0;
    for (const tier of tiersOf(planeUnit("2-6-2")))
      for (const seed of GRAPH_SEEDS) {
        const spec = picOf("2-6-2", seed, tier);
        looked += 1;
        if (spec && spec.kind === "pictograph")
          bad.push(`${tier} ${seed}: 그림그래프를 그렸다 — 세면 답이다`);
      }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(looked, "2-6-2 를 하나도 못 봤다").toBe(
      tiersOf(planeUnit("2-6-2")).length * GRAPH_SEEDS.length,
    );
  });

  /**
   * ⚠️ **내가 실제로 낸 결함이다**(2026-08-24). 「$5$개**을** 나타냅니다」를 여섯 자리에
   * 하드코딩했다 — 소재마다 단위가 갈리는데(개·그루·권·명·대·자루) 조사를 글자로 박았다.
   * 2-5 에서 「무게**을**」로 같은 것을 했고, **두 번째**다.
   */
  it("단위 뒤 조사를 하드코딩하지 않는다 — 「개을」·「그루을」이 없다", () => {
    const bad: string[] = [];
    let looked = 0;
    for (const code of GRAPH_CODES)
      for (const tier of tiersOf(planeUnit(code)))
        for (const seed of GRAPH_SEEDS) {
          const p = generateElementaryProblem(planeUnit(code), seed, tier);
          const t = `${p.content}\n${p.solution}`;
          for (const m of t.matchAll(
            /\$\d+\$([가-힣]{1,2})([은는이가을를])(?![가-힣])/g,
          )) {
            looked += 1;
            const w = m[1]!;
            const got = m[2]!;
            const hasFinal = (w.charCodeAt(w.length - 1) - 0xac00) % 28 !== 0;
            const wantIdx = ["은는", "이가", "을를"].findIndex((pr) =>
              pr.includes(got),
            );
            const want = ["은는", "이가", "을를"][wantIdx]![hasFinal ? 0 : 1];
            if (got !== want)
              bad.push(
                `${code} ${tier} ${seed}: 「${w}${got}」→「${w}${want}」`,
              );
          }
        }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(
      looked,
      "수+단위+조사 자리를 하나도 못 봤다 — 축이 사라졌다",
    ).toBeGreaterThan(0);
  });
});
