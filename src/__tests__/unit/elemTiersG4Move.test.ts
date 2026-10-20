/**
 * 초4 1-4 「평면도형의 이동」 4단 확대 (D-72) — 네 소단원 전부.
 *
 * **참은 발문·그림에서 온다.** 좌표 변환(뒤집기·돌리기)은 여기서 **독립 재구현**해
 * 검산한다(팀장 지침 2026-08-23) — 엔진·생성기 함수를 되부르지 않는다.
 *
 * 그림 갈래 둘(1-4-3 기본·1-4-4 기본)은 발문이 거의 고정이고 **변형이 그림에 산다**
 * (리드 승인 2026-08-23): 변형은 «발문+figureSpec 짝»으로 ≥8, 그림만으로도 ≥6 을
 * 따로 잠근다. 나머지 열넷은 발문 기준 그대로다.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = ["1-4-1", "1-4-2", "1-4-3", "1-4-4"] as const;
const FIGURE_TIERS = new Set(["1-4-3|기본", "1-4-4|기본"]);

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function gen(code: string, seed: number, tier: (typeof ELEM_TIERS)[number]) {
  return generateElementaryProblem(unitOf(code), seed, tier);
}

function answerNum(answer: string): number {
  const m = answer.match(/\$(\d+)/);
  expect(m, `정답에서 수를 못 읽음: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/** 해설 식 왼쪽 계산 — 곱·나눗셈 먼저(다른 g4 시험과 같은 자). */
function evalLhs(lhs: string): number {
  const toks = lhs.split(/(\\times|\\div|\+|-)/).filter((t) => t !== "");
  const nums: number[] = [Number(toks[0])];
  const ops: string[] = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i]!;
    const v = Number(toks[i + 1]);
    if (op === "\\times") nums[nums.length - 1]! *= v;
    else if (op === "\\div") nums[nums.length - 1]! /= v;
    else {
      ops.push(op);
      nums.push(v);
    }
  }
  let out = nums[0]!;
  for (let i = 0; i < ops.length; i += 1)
    out = ops[i] === "+" ? out + nums[i + 1]! : out - nums[i + 1]!;
  return out;
}

/* ── 좌표 변환 독립 재구현 — 셀 집합을 정규화 문자열로 견준다.
 *    관례 방향이 렌더러와 뒤집혀 있어도 «서로 다름» 판정은 불변이다. */
type Cell = readonly [number, number];
function norm(cells: Cell[]): string {
  const minA = Math.min(...cells.map((c) => c[0]));
  const minB = Math.min(...cells.map((c) => c[1]));
  return cells
    .map((c) => `${c[0] - minA},${c[1] - minB}`)
    .sort()
    .join(";");
}
const flipH = (cells: Cell[], size: number): Cell[] =>
  cells.map((c) => [size - 1 - c[0], c[1]] as const);
const flipV = (cells: Cell[], size: number): Cell[] =>
  cells.map((c) => [c[0], size - 1 - c[1]] as const);
const rot90 = (cells: Cell[], size: number): Cell[] =>
  cells.map((c) => [size - 1 - c[1], c[0]] as const);

type MoveSpec = { kind: string; cells: Cell[]; op: string; n: number };

describe("[초4 4단] 1-4 평면도형의 이동 — 네 소단원", () => {
  it("네 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = gen(code, 31337, tier);
        const b = gen(code, 31337, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("해설의 셈이 하나도 빠짐없이 실제로 맞는다", () => {
    const bad: string[] = [];
    const eq = /\$([\d+\-\\a-z]+)=(\d+)\$/g;
    const pure = /^\d+(?:(?:\+|-|\\times|\\div)\d+)*$/;
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const m of p.solution.matchAll(eq)) {
            if (!pure.test(m[1]!)) continue;
            const want = evalLhs(m[1]!);
            if (want !== Number(m[2]))
              bad.push(
                `${code} ${tier} seed ${seed}: ${m[1]}=${m[2]} (참 ${want})`,
              );
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("규모 — 모든 수가 1400 아래다 (90°×15 = 1350 이 최대)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const all = `${p.content} ${p.answer} ${p.solution}`;
          for (const m of all.matchAll(/\d+/g)) {
            if (Number(m[0]) >= 1400)
              bad.push(`${code} ${tier} seed ${seed}: ${m[0]}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // 변형 8+ — 그림 갈래 둘은 «발문+그림 짝»으로 세고(변형이 그림에 산다, 리드 승인
  // 2026-08-23), 그림만으로도 6 이상을 따로 잠근다. 나머지는 발문 기준.
  it("갈래마다 변형이 8가지 이상이다 (그림 갈래는 발문+그림 짝)", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const isFig = FIGURE_TIERS.has(`${code}|${tier}`);
        const seen = new Set<string>();
        const figs = new Set<string>();
        for (const s of SEEDS) {
          const p = gen(code, s, tier);
          seen.add(
            isFig ? `${p.content}${JSON.stringify(p.figureSpec)}` : p.content,
          );
          if (isFig) figs.add(JSON.stringify(p.figureSpec));
        }
        expect(
          seen.size,
          `${code} ${tier}: 변형이 ${seen.size}가지뿐이다`,
        ).toBeGreaterThanOrEqual(8);
        if (isFig)
          expect(
            figs.size,
            `${code} ${tier}: 그림이 ${figs.size}가지뿐이다`,
          ).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("표준·갈래 스무 문항의 발문·그림 짝이 겹치지 않는다 (R5)", () => {
    for (const seed of SEEDS) {
      const all: string[] = [];
      for (const code of CODES) {
        const std = generateElementaryProblem(unitOf(code), seed);
        all.push(`${std.content}${JSON.stringify(std.figureSpec ?? null)}`);
        for (const tier of tiersOf(unitOf(code))) {
          const p = gen(code, seed, tier);
          all.push(`${p.content}${JSON.stringify(p.figureSpec ?? null)}`);
        }
      }
      const dup = all.filter((c, i) => all.indexOf(c) !== i);
      expect(dup, `seed ${seed}: ${dup[0]?.slice(0, 60) ?? ""}`).toEqual([]);
    }
  });

  it("모든 수가 KaTeX 안에 있다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
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
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ③ MOVE_SHAPES 잣대 — 표준·갈래가 같이 쓰는 조각 전부: rot180(S) ≠ S
  //    (= 좌우 뒤집기와 위아래 뒤집기 결과가 다름과 동치), 그리고 회전 셋이 서로 다르다.
  //    조각은 그림 갈래의 figureSpec 에서 수집한다 — 목록을 옮겨 적지 않는다.
  it("쓰이는 조각은 전부 비대칭이다 — 뒤집기 두 답·회전 세 답이 유일하다", () => {
    const seenShapes = new Map<string, { cells: Cell[]; n: number }>();
    for (const seed of SEEDS) {
      for (const [code, tier] of [
        ["1-4-3", "기본"],
        ["1-4-4", "기본"],
      ] as const) {
        const spec = gen(code, seed, tier).figureSpec as MoveSpec;
        seenShapes.set(norm(spec.cells), { cells: spec.cells, n: spec.n });
      }
      // 표준 그림 갈래도 같은 잣대에 든다.
      const std3 = generateElementaryProblem(unitOf("1-4-3"), seed);
      const s3 = std3.figureSpec as MoveSpec | null;
      if (s3?.cells)
        seenShapes.set(norm(s3.cells), { cells: s3.cells, n: s3.n });
    }
    expect(seenShapes.size, "조각이 하나도 안 걷혔다").toBeGreaterThanOrEqual(
      3,
    );
    for (const { cells, n } of seenShapes.values()) {
      const base = norm(cells);
      const h = norm(flipH(cells, n));
      const v = norm(flipV(cells, n));
      const r1 = norm(rot90(cells, n));
      const r2 = norm(rot90(rot90(cells, n), n));
      const r3 = norm(rot90(rot90(rot90(cells, n), n), n));
      expect(h, `조각 ${base}: 두 뒤집기가 같다(180° 대칭)`).not.toBe(v);
      expect(new Set([r1, r2, r3]).size, `조각 ${base}: 회전 답이 겹친다`).toBe(
        3,
      );
      expect(r2, `조각 ${base}: 180° 돌려도 같다`).not.toBe(base);
    }
  });

  // ── 소단원별 독립 재계산

  it("1-4-1 — 점의 이동 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-4-1", seed, "연산");
      let m = calc.content.match(
        /([가-힣]+)으로 \$(\d+)\$칸 옮긴 다음 ([가-힣]+)으로 \$(\d+)\$칸 더/,
      );
      expect(m, calc.content).toBeTruthy();
      expect(m![1], "같은 방향이어야 한다").toBe(m![3]);
      expect(calc.answer).toBe(
        `${m![1]}으로 $${Number(m![2]) + Number(m![4])}$칸`,
      );

      const basic = gen("1-4-1", seed, "기본");
      m = basic.content.match(
        /([가-힣]+)으로 \$(\d+)\$칸 옮긴 다음 ([가-힣]+)으로 \$(\d+)\$칸 옮겼/,
      );
      expect(m, basic.content).toBeTruthy();
      expect(m![1]).not.toBe(m![3]);
      expect(Number(m![4]), "뒤 방향이 남아야 한다").toBeGreaterThan(
        Number(m![2]),
      );
      expect(basic.answer).toBe(
        `${m![3]}으로 $${Number(m![4]) - Number(m![2])}$칸`,
      );

      const apply = gen("1-4-1", seed, "응용");
      m = apply.content.match(
        /([가-힣]+)으로 \$(\d+)\$칸, ([가-힣]+)으로 \$(\d+)\$칸, ([가-힣]+)으로 \$(\d+)\$칸 차례로/,
      );
      expect(m, apply.content).toBeTruthy();
      expect(apply.answer).toBe(
        `${m![1]}으로 $${Number(m![2]) - Number(m![6])}$칸, ${m![3]}으로 $${Number(m![4])}$칸`,
      );

      const deep = gen("1-4-1", seed, "심화하");
      m = deep.content.match(
        /([가-힣]+)으로 \$(\d+)\$칸 옮겨야 할 것을 잘못하여 ([가-힣]+)으로 \$(\d+)\$칸/,
      );
      expect(m, deep.content).toBeTruthy();
      expect(m![2], "같은 칸수를 반대로").toBe(m![4]);
      expect(answerNum(deep.answer)).toBe(2 * Number(m![2]));
    }
  });

  it("1-4-2 — 밀기 네 갈래의 답을 발문에서 다시 구한다", () => {
    const basicKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-4-2", seed, "연산");
      let m = calc.content.match(
        /\$(\d+)\\,\\mathrm\{cm\}\$ 민 다음 [가-힣]+으로 \$(\d+)\\,\\mathrm\{cm\}\$ 더/,
      );
      expect(m, calc.content).toBeTruthy();
      expect(answerNum(calc.answer)).toBe(Number(m![1]) + Number(m![2]));

      const basic = gen("1-4-2", seed, "기본");
      m = basic.content.match(
        /가로 \$(\d+)\\,\\mathrm\{cm\}\$, 세로 \$(\d+)\\,\\mathrm\{cm\}\$인 직사각형/,
      );
      if (m) {
        basicKinds.add("세로불변");
        expect(answerNum(basic.answer)).toBe(Number(m[2]));
      } else {
        basicKinds.add("성질");
        expect(basic.answer).toBe("위치");
      }

      const apply = gen("1-4-2", seed, "응용");
      m = apply.content.match(
        /([가-힣]+)으로 \$(\d+)\\,\\mathrm\{cm\}\$ 민 다음 ([가-힣]+)으로 \$(\d+)\\,\\mathrm\{cm\}\$ 밀었/,
      );
      expect(m, apply.content).toBeTruthy();
      const a = Number(m![2]);
      const b = Number(m![4]);
      expect(a, "같으면 «예» 유형(표준)과 겹친다").not.toBe(b);
      expect(apply.answer).toBe(
        `${a > b ? m![1] : m![3]}으로 $${Math.abs(a - b)}\\,\\mathrm{cm}$`,
      );

      const deep = gen("1-4-2", seed, "심화하");
      m = deep.content.match(
        /([가-힣]+)으로 \$(\d+)\\,\\mathrm\{cm\}\$ 밀어야 할 것을 잘못하여 ([가-힣]+)으로 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      expect(m, deep.content).toBeTruthy();
      expect(answerNum(deep.answer)).toBe(Number(m![2]) + Number(m![4]));
    }
    expect(basicKinds.size, `기본이 ${[...basicKinds]}뿐`).toBe(2);
  });

  it("1-4-3 — 뒤집기 네 갈래의 답을 발문·그림에서 다시 구한다", () => {
    const basicAns = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-4-3", seed, "연산");
      let m = calc.content.match(
        /(?:가로|세로)가 \$(\d+)\$칸인 .*(?:왼쪽|위)에서 \$(\d+)\$번째/,
      );
      expect(m, calc.content).toBeTruthy();
      expect(calc.answer).toBe(`$${Number(m![1]) + 1 - Number(m![2])}$번째`);

      const basic = gen("1-4-3", seed, "기본");
      const spec = basic.figureSpec as MoveSpec;
      expect(spec.kind).toBe("rotateFlip");
      expect(["flipH", "flipV"]).toContain(spec.op);
      const askedV = /위아래로 뒤집은 것입니까/.test(basic.content);
      expect(
        askedV || /좌우로 뒤집은 것입니까/.test(basic.content),
        basic.content,
      ).toBe(true);
      const yes = (spec.op === "flipV") === askedV;
      expect(basic.answer).toBe(yes ? "예" : "아니요");
      basicAns.add(basic.answer);

      const apply = gen("1-4-3", seed, "응용");
      m = apply.content.match(/좌우로 \$(\d+)\$번, 위아래로 \$(\d+)\$번/);
      expect(m, apply.content).toBeTruthy();
      const h = Number(m![1]) % 2 === 1;
      const v = Number(m![2]) % 2 === 1;
      const want =
        h && v
          ? "시계 방향으로 $180^\\circ$ 돌린 도형과 같다"
          : h
            ? "좌우로 한 번 뒤집은 도형과 같다"
            : v
              ? "위아래로 한 번 뒤집은 도형과 같다"
              : "처음 도형과 같다";
      expect(apply.answer, apply.content).toBe(want);

      const deep = gen("1-4-3", seed, "심화하");
      m = deep.content.match(/\$(\d+)\$번보다 많고 \$(\d+)\$번보다 적다면/);
      expect(m, deep.content).toBeTruthy();
      const lo = Number(m![1]);
      const hi = Number(m![2]);
      const evens = [];
      for (let x = lo + 1; x < hi; x += 1) if (x % 2 === 0) evens.push(x);
      expect(evens.length, `${lo}~${hi} 안 짝수가 유일해야 한다`).toBe(1);
      expect(answerNum(deep.answer)).toBe(evens[0]!);
    }
    expect(basicAns.size, "기본의 예·아니요가 다 나와야 한다").toBe(2);
  });

  it("1-4-4 — 돌리기 네 갈래의 답을 발문·그림에서 다시 구한다 (시계 규약)", () => {
    const TURN: Record<string, number> = {
      rot90: 90,
      rot180: 180,
      rot270: 270,
    };
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-4-4", seed, "연산");
      let m = calc.content.match(
        /\$90\^\\circ\$씩 \$(\d+)\$번 돌(?:렸습니다|린 도형)/,
      );
      expect(m, calc.content).toBeTruthy();
      const t = Number(m![1]);
      expect(t % 4, "4의 배수면 답이 0°가 된다").not.toBe(0);
      expect(answerNum(calc.answer)).toBe((90 * t) % 360);

      const basic = gen("1-4-4", seed, "기본");
      const spec = basic.figureSpec as MoveSpec;
      expect(spec.kind).toBe("rotateFlip");
      // ④ 시계 규약 — op 는 시계 방향, 반시계 답은 360−d 다.
      expect(TURN[spec.op], basic.content).toBeTruthy();
      expect(/시계 반대 방향/.test(basic.content), basic.content).toBe(true);
      expect(answerNum(basic.answer)).toBe(360 - TURN[spec.op]!);

      const apply = gen("1-4-4", seed, "응용");
      m = apply.content.match(
        /시계 방향으로 \$(\d+)\^\\circ\$ 돌린 다음 (시계 반대 방향|다시 시계 방향)으로 \$(\d+)\^\\circ\$/,
      );
      expect(m, apply.content).toBeTruthy();
      const d1 = Number(m![1]);
      const d2 = Number(m![3]);
      const net =
        m![2] === "시계 반대 방향" ? (d1 - d2 + 360) % 360 : (d1 + d2) % 360;
      expect(net, "0°면 문항이 죽는다").toBeGreaterThan(0);
      expect(answerNum(apply.answer)).toBe(net);

      const deep = gen("1-4-4", seed, "심화하");
      m = deep.content.match(
        /시계 방향으로 \$(\d+)\^\\circ\$ 돌렸더니 가 도형/,
      );
      if (m) {
        deepKinds.add("되돌리기");
        expect(answerNum(deep.answer)).toBe(360 - Number(m[1]));
      } else {
        deepKinds.add("배수조건");
        m = deep.content.match(/\$(\d+)\$번보다 많고 \$(\d+)\$번보다 적다면/);
        expect(m, deep.content).toBeTruthy();
        const lo = Number(m![1]);
        const hi = Number(m![2]);
        const mult = [];
        for (let x = lo + 1; x < hi; x += 1) if (x % 4 === 0) mult.push(x);
        expect(mult.length, `${lo}~${hi} 안 4의 배수가 유일해야 한다`).toBe(1);
        expect(answerNum(deep.answer)).toBe(mult[0]!);
      }
    }
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  // 발문이 그림 짝을 가리키므로 실제로 그려져야 한다.
  it("그림 갈래 둘의 짝 그림이 실제로 그려진다", async () => {
    const bad: string[] = [];
    for (const seed of SEEDS.slice(0, 3)) {
      for (const [code, tier] of [
        ["1-4-3", "기본"],
        ["1-4-4", "기본"],
      ] as const) {
        const p = gen(code, seed, tier);
        const r = await renderFigureSpec(p.figureSpec);
        if (!r.ok) bad.push(`${code} ${tier} 씨앗 ${seed}: ${r.error}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
