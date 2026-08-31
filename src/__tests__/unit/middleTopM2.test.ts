/**
 * 중2 **확대 갈래**(`심화중`·`심화상`) — `src/lib/middle/m2Top.ts` (D-116).
 *
 * ## 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * 이 시험은 생성기의 `facts` 를 믿지 않는다. **발문에 찍힌 글자**에서 수를 다시
 * 읽어 후보를 **전수로** 만들고, 그 결과를 정답과 맞댄다. 생성기의 식을 옮겨
 * 적으면 그 순간 동어반복이 되고, 제품이 틀릴수록 좋은 점수가 나온다
 * (2026-08-18 「지표의 «참»이 제품 상수에서 나오면 성적이 오른다」).
 *
 *   |90  비 조건과 일차방정식을 발문에서 읽어 → $t$ 를 여러 개 넣어 $k$ 를 확인하고
 *        $m$ 을 대입해 등식이 성립하는지 본다(분수는 정수 곱으로 견준다).
 *   |91  $px+qy=n$ 을 발문에서 읽어 → $x,y$ 를 **전수 탐색**해 합이 소수인 것이
 *        하나뿐임을 확인한다.
 *   경우의 수 90  $n!$ **순열을 실제로 다 만들어** 조건을 세어 본다.
 *   경우의 수 91  주사위 $36$ 쌍을 다 만들어 (가)(나)를 대 본다.
 *   피타고라스 90  $b$ 를 훑어 $a^2+b^2$ 이 제곱수인 것을 전수로 찾는다.
 *
 * ## 이 시험이 못 보는 것
 *
 * 「해설이 학생에게 충분한가」는 여기서 못 잰다 — 자는 `scripts/qa/probe-mid-solution-depth.ts`
 * 이고 그 자도 «생략 표지 없는 부실»은 못 본다. 그래서 보고서에 **눈으로 읽은
 * 기록**을 따로 남겼다(`tracks/reports/mid-top-m2.md` §5).
 */
import { describe, expect, it } from "vitest";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";
import { M2_TOP } from "../../lib/middle/m2Top";
import type { MidProblem } from "../../lib/middle/types";
import { extensionNumberReason, isCatalogType } from "../helpers/rpmCatalog";

const SEEDS = [20260901, 7, 4242, 99991, 31337, 555];
const VARIANTS = [0, 1, 2];

function rows(key: string): MidProblem[] {
  const out: MidProblem[] = [];
  for (const s of SEEDS) {
    for (const v of VARIANTS) out.push(generateMiddleProblem(key, s, v));
  }
  return out;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
}

/** 발문·해설에서 첫 정수를 읽는다 — 없으면 시험을 빨갛게 만든다. */
function num(text: string, re: RegExp, at = 1): number {
  const m = re.exec(text);
  expect(m, `발문에서 못 읽었다: ${re} ← ${text.slice(0, 120)}`).not.toBeNull();
  return Number(m![at]);
}

describe("중2 확대 갈래 명부 — 등록과 규약", () => {
  it("다섯 유형이 등록돼 있고 갈래가 심화중·심화상이다", () => {
    expect(M2_TOP.length).toBe(5);
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of M2_TOP) expect(keys.has(e.key), e.key).toBe(true);
    const tiers = new Map<string, string>();
    for (const e of M2_TOP) {
      const seen = new Set(rows(e.key).map((p) => p.difficulty));
      expect(seen.size, `${e.key} 갈래가 흔들린다: ${[...seen]}`).toBe(1);
      tiers.set(e.key, [...seen][0]!);
    }
    // 🔴 `resolveMiddleTier` 는 **내리기만** 한다(D-106). 확대 갈래가 살아 남는지를
    //    여기서 잠근다 — 등록값이 「기본」으로 바뀌면 이 줄이 먼저 빨개진다.
    expect(Object.fromEntries(tiers)).toEqual({
      "2-1|연립일차방정식|90": "심화중",
      "2-1|연립일차방정식|91": "심화상",
      "2-2|경우의 수|90": "심화중",
      "2-2|경우의 수|91": "심화상",
      "2-2|피타고라스 정리|90": "심화상",
    });
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인 최대를 넘고 제목은 새것이다)", () => {
    for (const e of M2_TOP) {
      expect(isCatalogType(e), `${e.key} 는 색인에 없어야 한다`).toBe(false);
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
  });

  it("우리 단원 이름에 실측 그대로 붙는다", () => {
    const count = new Map<string, number>();
    for (const e of M2_TOP) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    expect(count).toEqual(
      new Map([
        ["미지수가 2개인 연립일차방정식", 2],
        ["여러 가지 경우의 수", 1],
        ["경우의 수", 1],
        ["피타고라스 정리", 1],
      ]),
    );
  });
});

describe("2-1|연립일차방정식|90 — 비로 굳힌 값을 해로 하는 일차방정식 (심화중)", () => {
  const KEY = "2-1|연립일차방정식|90";

  it("비를 여러 $t$ 로 확인하고, 구한 $m$ 이 실제로 그 방정식을 만족시킨다", () => {
    for (const p of rows(KEY)) {
      // ⑴ 발문에서 비와 식을 읽는다.
      const ratio = /\$(\d*)a=(\d*)b\$/.exec(p.content);
      expect(ratio, p.content).not.toBeNull();
      const pp = ratio![1] === "" ? 1 : Number(ratio![1]);
      const qq = ratio![2] === "" ? 1 : Number(ratio![2]);
      const frac = /\\dfrac\{(\d*)a\+(\d*)b\}\{a-b\}/.exec(p.content);
      expect(frac, p.content).not.toBeNull();
      const ca = frac![1] === "" ? 1 : Number(frac![1]);
      const cb = frac![2] === "" ? 1 : Number(frac![2]);

      // ⑵ $t$ 를 여럿 넣어 «값이 $t$ 에 안 흔들린다»를 **실제로** 확인한다.
      const ks = new Set<number>();
      for (const t of [1, 2, 3, 5, 11, 37]) {
        const a = qq * t;
        const b = pp * t;
        expect(pp * a).toBe(qq * b); // 비 조건이 정말 성립하는가
        ks.add((ca * a + cb * b) / (a - b));
      }
      expect(ks.size, `${p.content}\n$k$ 가 $t$ 에 흔들린다: ${[...ks]}`).toBe(
        1,
      );
      const k = [...ks][0]!;

      // ⑶ 발문의 방정식에 $x=k$, $m=$정답 을 넣어 등식이 성립하는지 본다.
      const eq =
        /\\dfrac\{x\+m\}\{(\d+)\}-\\dfrac\{x-(\d+)\}\{(\d+)\}=(\d+)\$/.exec(
          p.content,
        );
      expect(eq, p.content).not.toBeNull();
      const [u, c, v, d] = [1, 2, 3, 4].map((i) => Number(eq![i]));
      const m = num(p.answer, /(-?\d+)/);
      // 분수를 피해 **정수 곱**으로 견준다.
      expect(
        v! * (k + m) - u! * (k - c!),
        `${p.content}\n정답 ${m} 이 방정식을 안 만족시킨다 (k=${k})`,
      ).toBe(u! * v! * d!);
    }
  });

  it("해설이 적는 $k$ 가 발문에서 다시 구한 값과 같다", () => {
    for (const p of rows(KEY)) {
      // 「$k$ 를 적는가」만 보면 **아무 수나 적어도 초록**이다 — 값을 견준다.
      const ratio = /\$(\d*)a=(\d*)b\$/.exec(p.content)!;
      const pp = ratio[1] === "" ? 1 : Number(ratio[1]);
      const qq = ratio[2] === "" ? 1 : Number(ratio[2]);
      const frac = /\\dfrac\{(\d*)a\+(\d*)b\}\{a-b\}/.exec(p.content)!;
      const ca = frac[1] === "" ? 1 : Number(frac[1]);
      const cb = frac[2] === "" ? 1 : Number(frac[2]);
      const want = (ca * qq + cb * pp) / (qq - pp);
      const shown = /=(-?\d+)\$이다\. \(\$t\$가 약분되므로/.exec(p.solution);
      expect(shown, p.solution).not.toBeNull();
      expect(Number(shown![1]), `${p.content}\n해설의 $k$ 가 다르다`).toBe(
        want,
      );
      expect(p.solution).toContain("로 놓을 수 있다");
      expect(p.solution).toContain("양변에");
    }
  });
});

describe("2-1|연립일차방정식|91 — 자연수 해 중 합이 소수인 것 (심화상)", () => {
  const KEY = "2-1|연립일차방정식|91";

  it("전수 탐색으로 «합이 소수인 해가 하나뿐»이고 정답이 그 곱이다", () => {
    for (const p of rows(KEY)) {
      const eq = /\$(\d+)x\+(\d+)y=(\d+)\$/.exec(p.content);
      expect(eq, p.content).not.toBeNull();
      const [pp, qq, n] = [1, 2, 3].map((i) => Number(eq![i]));
      const hits: [number, number][] = [];
      const all: [number, number][] = [];
      for (let x = 1; pp! * x < n!; x += 1) {
        for (let y = 1; qq! * y < n!; y += 1) {
          if (pp! * x + qq! * y !== n!) continue;
          all.push([x, y]);
          if (isPrime(x + y)) hits.push([x, y]);
        }
      }
      expect(
        all.length,
        `${p.content}\n후보가 너무 적다`,
      ).toBeGreaterThanOrEqual(4);
      expect(
        hits.length,
        `${p.content}\n합이 소수인 해가 하나가 아니다: ${JSON.stringify(hits)}`,
      ).toBe(1);
      expect(num(p.answer, /(-?\d+)/), p.content).toBe(
        hits[0]![0] * hits[0]![1],
      );
    }
  });

  it("「$x=y$ 면 그것이 답」이라는 지름길이 없다 (씨앗 200개)", () => {
    // 🔴 **씨앗 여섯으로는 이 경계를 못 넘는다.** 변이(「$x=y$ 차단 가드 제거」)를
    //    넣어도 여섯 씨앗에서는 그런 문항이 한 건도 안 뽑혀 시험이 **초록**이었다 —
    //    가드가 없는 게 아니라 **픽스처가 경계를 안 갈랐다**(2026-08-21 그 자리).
    //    분모를 200씨앗 × 변형 3 으로 넓히자 빨개진다.
    const bad: string[] = [];
    for (let s = 0; s < 200; s += 1) {
      for (const v of VARIANTS) {
        const p = generateMiddleProblem(KEY, 20260901 + s * 7919, v);
        const eq = /\$(\d+)x\+(\d+)y=(\d+)\$/.exec(p.content)!;
        const [pp, qq, n] = [1, 2, 3].map((i) => Number(eq[i]));
        for (let y = 1; qq! * y + pp! <= n!; y += 1) {
          if ((n! - qq! * y) % pp! !== 0) continue;
          if ((n! - qq! * y) / pp! === y) bad.push(p.content);
        }
      }
    }
    expect(bad.slice(0, 3), `$x=y$ 인 해가 있는 문항 ${bad.length}건`).toEqual(
      [],
    );
  });

  it("해설이 후보를 하나도 빠뜨리지 않고 늘어놓는다 (분모를 지킨다)", () => {
    for (const p of rows(KEY)) {
      const eq = /\$(\d+)x\+(\d+)y=(\d+)\$/.exec(p.content)!;
      const [pp, qq, n] = [1, 2, 3].map((i) => Number(eq[i]));
      const ys: number[] = [];
      for (let y = 1; qq! * y + pp! <= n!; y += 1) {
        if ((n! - qq! * y) % pp! === 0) ys.push(y);
      }
      const listed =
        /그러므로 \$y\$는 (.+?)이고, 이때 \$x\$는 차례로 (.+?)이다\./.exec(
          p.solution,
        );
      expect(listed, p.solution).not.toBeNull();
      expect(
        (listed![1]!.match(/\$-?\d+\$/g) ?? []).length,
        `해설의 $y$ 목록이 전수와 다르다\n${p.solution}`,
      ).toBe(ys.length);
      expect((listed![2]!.match(/\$-?\d+\$/g) ?? []).length).toBe(ys.length);
      const sums = /각 순서쌍에서 \$x\+y\$를 구하면 차례로 (.+?)이다\./.exec(
        p.solution,
      );
      expect(sums, p.solution).not.toBeNull();
      expect((sums![1]!.match(/\$-?\d+\$/g) ?? []).length).toBe(ys.length);
    }
  });
});

describe("2-2|경우의 수|90 — 이웃 조건과 앞뒤 조건 (심화중)", () => {
  const KEY = "2-2|경우의 수|90";

  /** 순열을 실제로 다 만든다 — 생성기의 곱셈식을 옮겨 적지 않는다. */
  function permutations(items: string[]): string[][] {
    if (items.length <= 1) return [items];
    const out: string[][] = [];
    for (let i = 0; i < items.length; i += 1) {
      const rest = [...items.slice(0, i), ...items.slice(i + 1)];
      for (const tail of permutations(rest)) out.push([items[i]!, ...tail]);
    }
    return out;
  }

  it("$n!$ 순열을 전수로 세어 정답과 맞는다", () => {
    for (const p of rows(KEY)) {
      const names = (p.content.match(/^(\$[A-F]\$, )+\$[A-F]\$/)?.[0] ?? "")
        .match(/[A-F]/g)!
        .map((x) => x);
      expect(names.length, p.content).toBeGreaterThanOrEqual(5);
      const near = /\$([A-F])\$와 \$([A-F])\$는 서로 이웃하(지 않)?고/.exec(
        p.content,
      );
      expect(near, p.content).not.toBeNull();
      const wantAdjacent = near![3] === undefined;
      // 순서 조건은 지면에 두 꼴로 나온다 — 둘이면 「$X$가 $Y$보다 앞에」,
      // 셋이면 「$X$, $Y$, $Z$가 앞에서부터 이 순서대로」.
      const twoOrder = /\$([A-F])\$가 \$([A-F])\$보다 앞에 서는/.exec(
        p.content,
      );
      const threeOrder =
        /((?:\$[A-F]\$, ){2}\$[A-F]\$)가 앞에서부터 이 순서대로 서는/.exec(
          p.content,
        );
      expect(
        twoOrder !== null || threeOrder !== null,
        `순서 조건을 못 읽었다: ${p.content}`,
      ).toBe(true);
      const wanted = twoOrder
        ? [twoOrder[1]!, twoOrder[2]!]
        : (threeOrder![1]!.match(/[A-F]/g) ?? []);
      expect(wanted.length, p.content).toBeGreaterThanOrEqual(2);

      // 🔴 불변식 — 이웃 짝과 순서 짝이 겹치면 «절반» 논법이 깨진다.
      expect(
        wanted.includes(near![1]!) || wanted.includes(near![2]!),
        `이웃 짝과 순서 짝이 겹친다: ${p.content}`,
      ).toBe(false);

      let count = 0;
      for (const perm of permutations(names)) {
        const i1 = perm.indexOf(near![1]!);
        const i2 = perm.indexOf(near![2]!);
        const adjacent = Math.abs(i1 - i2) === 1;
        if (adjacent !== wantAdjacent) continue;
        const pos = wanted.map((x) => perm.indexOf(x));
        if (!pos.every((v, i) => i === 0 || pos[i - 1]! < v)) continue;
        count += 1;
      }
      expect(num(p.answer, /(-?\d+)/), p.content).toBe(count);
    }
  });
});

describe("2-2|경우의 수|91 — 두 조건을 모두 만족시키는 순서쌍 (심화상)", () => {
  const KEY = "2-2|경우의 수|91";

  it("주사위 $36$ 쌍을 전수로 만들어 두 조건을 대면 정답과 맞는다", () => {
    for (const p of rows(KEY)) {
      const k = num(p.content, /\(가\) \$a\+b\$는 \$(\d+)\$의 배수이다\./);
      const prod = /\(나\) \$ab\$는 \$(\d+)\$의 배수이다\./.exec(p.content);
      const eq =
        /\(나\) \$x\$에 대한 일차방정식 \$ax=b\+(\d+)\$의 해가 자연수이다\./.exec(
          p.content,
        );
      expect(prod !== null || eq !== null, p.content).toBe(true);
      const condB = prod
        ? (a: number, b: number) => (a * b) % Number(prod[1]) === 0
        : (a: number, b: number) => (b + Number(eq![1])) % a === 0;
      let both = 0;
      let onlyA = 0;
      let onlyB = 0;
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) {
          const A = (a + b) % k === 0;
          const B = condB(a, b);
          if (A) onlyA += 1;
          if (B) onlyB += 1;
          if (A && B) both += 1;
        }
      }
      expect(num(p.answer, /(-?\d+)/), p.content).toBe(both);
      // 🔴 두 조건이 **둘 다 물어야** 한다 — 한쪽만으로 답이 같으면 나머지는 장식이다.
      expect(both, `조건 (나)가 장식이다: ${p.content}`).not.toBe(onlyA);
      expect(both, `조건 (가)가 장식이다: ${p.content}`).not.toBe(onlyB);
    }
  });

  it("해설이 조건 (가)의 순서쌍을 하나도 빠뜨리지 않는다", () => {
    for (const p of rows(KEY)) {
      const k = num(p.content, /\(가\) \$a\+b\$는 \$(\d+)\$의 배수이다\./);
      let n = 0;
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) if ((a + b) % k === 0) n += 1;
      }
      const line =
        /조건 \(가\)를 만족시키는 순서쌍 .+?는 (.+?)의 \$\d+\$가지이다\./.exec(
          p.solution,
        );
      expect(line, p.solution).not.toBeNull();
      expect((line![1]!.match(/\$\(\d+,\\,\d+\)\$/g) ?? []).length).toBe(n);
    }
  });
});

describe("2-2|피타고라스 정리|90 — 빗변이 아닌 한 변이 주어진 직각삼각형 (심화상)", () => {
  const KEY = "2-2|피타고라스 정리|90";

  it("$b$ 를 훑는 전수 탐색으로 삼각형을 모두 찾아 정답과 맞는다", () => {
    for (const p of rows(KEY)) {
      const a = num(
        p.content,
        /빗변이 아닌 한 변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      // 🔴 **인수분해를 안 쓴다** — $b$ 를 그대로 훑어 $a^2+b^2$ 이 제곱수인지 본다.
      //    생성기와 다른 길이어야 검산이 동어반복이 아니다.
      const tri: { b: number; c: number }[] = [];
      const limit = (a * a - 1) / 2; // $c-b\ge1$ 이면 $b\le(a^2-1)/2$
      for (let b = 1; b <= limit; b += 1) {
        const s = a * a + b * b;
        const c = Math.round(Math.sqrt(s));
        if (c * c === s) tri.push({ b, c });
      }
      expect(
        tri.length,
        `${p.content}\n후보가 둘 미만이다`,
      ).toBeGreaterThanOrEqual(2);
      const ans = num(p.answer, /(-?\d+)/);
      if (/모두 몇 개인지/.test(p.content)) {
        expect(ans, p.content).toBe(tri.length);
      } else if (/넓이의 합/.test(p.content)) {
        expect(ans, p.content).toBe(tri.reduce((s, t) => s + (a * t.b) / 2, 0));
      } else {
        expect(ans, p.content).toBe(tri.reduce((s, t) => s + t.c, 0));
      }
      // 해설이 찾은 $(b,c)$ 를 하나도 빠뜨리지 않는다.
      const listed = /\$\(b,\\,c\)\$는 차례로 (.+?)이다\./.exec(p.solution);
      expect(listed, p.solution).not.toBeNull();
      expect((listed![1]!.match(/\$\(\d+,\\,\d+\)\$/g) ?? []).length).toBe(
        tri.length,
      );
    }
  });

  it("한 변은 늘 짝수다 — 홀수면 해설의 「둘 다 짝수」 걸음이 하는 일이 없다", () => {
    for (const p of rows(KEY)) {
      const a = num(
        p.content,
        /빗변이 아닌 한 변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      expect(a % 2, `${p.content}\n홀수 변은 굳힘 걸음을 장식으로 만든다`).toBe(
        0,
      );
    }
  });
});
