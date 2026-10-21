/**
 * 초4 1-3 「곱셈과 나눗셈」 **심화중·심화상** — D-113 파일럿 한 대단원.
 *
 * 값·표기·규모·겹침은 `elemTiersG4MulDiv.test.ts` 가 `tiersOf(unit)` 로 돌기 때문에
 * **새 갈래도 그대로 덮인다**(2026-08-30 수술). 여기 두 벌로 적지 않는다.
 * 이 파일이 맡는 것은 그 파일이 **구조적으로 못 보는 것** 하나다 —
 *
 *     「되짚기 사슬에 **굳지 않는 마디**가 있는가, 그리고 무엇이 그것을 굳히는가」
 *
 * ## 잣대 (리드 확정 2026-08-30 — **되짚기 축**)
 *
 * ```
 * 심화하  마디마다 값이 하나로 굳는다                       (기준선 — 이 파일이 안 건드림)
 * 심화중  굳지 않는 마디가 하나 있고, 발문의 조건이나
 *         그 소단원의 성질이 그 마디를 굳혀 준다
 * 심화상  성질만으로는 못 굳혀, 그 소단원의 계산으로 나올 수 있는 값들을
 *         **실제로 만들어 견주어야** 하나가 남는다.
 *         그 후보를 **발문이 주지 않고 되짚기가 만든다**
 * ```
 *
 * ## 이 파일이 그 잣대를 **세는 형태**로 옮긴 방법
 *
 * 소단원마다 시험이 **발문에서** 그 마디의 후보 무리를 다시 만든다(생성기를 안 부른다).
 *
 * | | 잠그는 것 |
 * |---|---|
 * | 심화중 | 성질로 거른 뒤에도 후보가 **여럿**이고, 답은 그 무리의 **극값**이다 — 「가장 큰/작은」이라는 조건 **한 번**이 집는 자리. 그리고 반대쪽 극값을 집으면 **다른 답**이 나온다(마디가 정말 열려 있다는 증거) |
 * | 심화상 | 후보 무리에 그 소단원 계산을 **하나씩 실제로 걸어** 정확히 하나가 남고, 그 하나가 무리의 **극값이 아니다** — 극값이면 조건 한 번으로 집히므로 심화중이다. 그리고 후보 값이 발문의 수에 **없다**(되짚기가 만든 것이다) |
 * | 반증 ④ | 같은 소단원의 **연산·기본·응용**은 되짚어야 할 대상을 **아예 안 부르거나**, 불러도 **한 식으로 굳는다**(표준 1-3-5 «연산» `b × □ = a`). 굳지 않는 마디가 없으니 이 축이 난이도를 **뒤집지 않는다** — 실측 뒤집힘 **0** |
 *
 * ## 🔴 못 보는 것 — 반드시 읽어라
 *
 * ㉠ **「후보가 많다 = 어렵다」가 아니다.** 후보 아흔이어도 어림 한 번으로 열로 줄면
 *    걸음은 짧다. 이 축이 지키는 것은 「무엇이 마디를 굳히는가」이지 «양»이 아니다.
 * ㉡ **후보 무리를 만드는 규칙은 내가 적은 것이다.** 학생이 밟을 무리와 같은지는
 *    사람이 본다 — 그래서 이 파일럿은 원장님 시안(`/dev/tier-bench/g4`)이 목적이다.
 * ㉢ **「답이 나열이다 · 「모두 구하시오」」는 갈래를 못 가른다.** 초4 전량 실측
 *    (`census-elem-list-answers.ts`, 씨앗 12): 나열형 답이 연산 1.6% · 기본 4.3% ·
 *    **심화하 5.6%(4소단원)** 에 이미 있고, 2-1-4 «심화하»가 「$\square$ 에 들어갈 수
 *    있는 수를 **모두**」다. 그래서 이 파일은 그 꼴을 **축으로 안 쓴다.**
 * ㉣ **열거(후보를 훑는 양)는 기각된 축이다.** 문형 전량 6,900행 실측에서 열거는
 *    갈래를 1.5~2배밖에 안 가르고(초4는 기본 7.4% > 응용 5.5% 로 뒤집힌다),
 *    심화하 안에서 열거형은 평균 **0.39걸음**으로 그 소단원 «연산»(0.79)보다 얕았다.
 *    이 파일의 앞 판이 그 축이었고 **갈아엎었다** — 다시 그쪽으로 돌아가지 말 것.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = [
  "1-3-1",
  "1-3-2",
  "1-3-3",
  "1-3-4",
  "1-3-5",
  "1-3-6",
  "1-3-7",
] as const;
type Code = (typeof CODES)[number];

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260830 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

const gen = (code: string, seed: number, tier: string) =>
  generateElementaryProblem(unitOf(code), seed, tier as never);

/** 글에 실린 수 전부(KaTeX 안). 발문에서 참을 꺼내는 유일한 창구다. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

/** 어림 — 생성기의 함수를 부르지 않고 규칙을 여기서 다시 쓴다(동어반복 금지). */
const round10 = (v: number) => Math.round(v / 10) * 10;
const round100 = (v: number) => Math.round(v / 100) * 100;
const digitsOf = (v: number) => String(v).length;

const range = (lo: number, hi: number) =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** 그 소단원이 여는 후보 무리 — 「몇십」·「두 자리 수」·「세 자리 수」. */
const TENS = range(2, 9).map((t) => t * 10);
const TWO = range(10, 99);
const THREE = range(100, 999);

/**
 * 심화중 한 문항 — **굳지 않는 마디의 후보 무리**와, 그 무리의 극값에서 답을 만드는 법.
 * 무리는 오직 발문에서 나온다.
 */
type Mid = {
  pool: number[];
  pick: "min" | "max";
  answer: (v: number) => string;
};

/**
 * 심화상 한 문항 — **되짚기가 연 후보 무리**와, 그 위에 거는 **그 소단원의 계산**.
 * `keep` 은 후보마다 실제로 곱하거나 나눈다.
 */
type Top = {
  pool: number[];
  keep: (v: number) => boolean;
  answer: (v: number) => string;
};

function midOf(code: Code, content: string): Mid {
  const num = (re: RegExp, at = 1) => {
    const m = content.match(re);
    expect(m, `${code} 심화중 발문을 못 읽었다: ${content}`).toBeTruthy();
    return Number(m![at]);
  };
  if (code === "1-3-1") {
    const b = num(/^어떤 수에 \$(\d+)\$[을를] 곱했더니/);
    const want = content.includes("다섯 자리") ? 5 : 4;
    const small = content.includes("가장 작은");
    return {
      pool: THREE.filter((v) => digitsOf(b * v) === want),
      pick: small ? "min" : "max",
      answer: (v) => `$${v}$`,
    };
  }
  if (code === "1-3-2") {
    const a = num(/^\$(\d+)\\times\\square\$의 곱이/);
    const want = content.includes("다섯 자리") ? 5 : 4;
    const small = content.includes("가장 작은");
    return {
      pool: TWO.filter((v) => digitsOf(a * v) === want),
      pick: small ? "min" : "max",
      answer: (v) => `$${v}$`,
    };
  }
  if (code === "1-3-3") {
    const b = num(/몇백으로 어림하여 \$(\d+)\$[과와] 곱했더니/);
    const est = num(/어림한 곱이 \$(\d+)\$[이가] 되었습니다/);
    expect(est % b, `어림한 곱이 몇십으로 안 나뉜다: ${content}`).toBe(0);
    const aa = est / b;
    return {
      pool: THREE.filter((v) => round100(v) === aa),
      pick: content.includes("가장 큰") ? "max" : "min",
      answer: (v) => `$${v}$`,
    };
  }
  if (code === "1-3-4") {
    const b = num(/^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니/);
    const q = num(/몫이 \$(\d+)\$[이가] 되고/);
    return {
      pool: range(0, b - 1), // 나머지 — 발문이 값을 안 준다
      pick: "max", // 「나머지는 나누는 수보다 작다」(소단원 성질) + 「가장 큰」
      answer: (r) => `$${b * q + r}$`,
    };
  }
  if (code === "1-3-5") {
    const b = num(
      /^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니 몫과 나머지가 같은/,
    );
    return {
      pool: range(1, 9).filter((t) => t < b), // 한 자리 수이고 나머지는 나누는 수보다 작다
      pick: "max",
      answer: (t) => `$${b * t + t}$`,
    };
  }
  if (code === "1-3-6") {
    const b = num(/^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니/);
    const q = num(/몫이 \$(\d+)\$[이가] 되고/);
    return {
      pool: range(0, b - 1),
      pick: "max",
      answer: (r) => `$${Math.floor((b * q + r + 1) / b)}$`,
    };
  }
  const a = num(/^\$(\d+)\\div\\square\$에서/);
  const k = num(/몫을 어림했더니 \$(\d+)\$[이가] 되었습니다/);
  expect(a % k, `어림한 몫이 자연수가 아니다: ${content}`).toBe(0);
  const bb = a / k;
  return {
    pool: TWO.filter((v) => round10(v) === bb),
    pick: "max",
    answer: (v) => `$${v}$`,
  };
}

function topOf(code: Code, content: string): Top {
  const num = (re: RegExp, at = 1) => {
    const m = content.match(re);
    expect(m, `${code} 심화상 발문을 못 읽었다: ${content}`).toBeTruthy();
    return Number(m![at]);
  };
  const id = (v: number) => `$${v}$`;
  if (code === "1-3-1") {
    const a = num(/^\$(\d+)\$에 어떤 몇십을 곱했더니/);
    const low = num(/곱했더니 \$(\d+)\$보다 크고/);
    const high = num(/크고 \$(\d+)\$보다 작은/);
    // 후보는 「몇십」 — 소단원 성질이 열고, **곱해 봐야** 어느 것인지 정해진다.
    return { pool: TENS, keep: (t) => a * t > low && a * t < high, answer: id };
  }
  if (code === "1-3-2") {
    const a = num(/^\$(\d+)\\times\\square\$의 곱이/);
    const low = num(/의 곱이 \$(\d+)\$보다 크고/);
    const high = num(/크고 \$(\d+)\$보다 작습니다/);
    return { pool: TWO, keep: (k) => a * k > low && a * k < high, answer: id };
  }
  if (code === "1-3-3") {
    const a = num(/^\$(\d+)\$[과와] 어떤 두 자리 수의 곱을/);
    const est = num(/어림한 곱이 \$(\d+)\$[이가] 되었습니다/);
    const real = num(/실제 곱이 \$(\d+)\$일 때/);
    return {
      pool: TWO,
      keep: (k) => round100(a) * round10(k) === est && a * k === real,
      answer: id,
    };
  }
  if (code === "1-3-4") {
    const x = num(/^\$(\d+)\$[을를] 어떤 몇십으로 나누었더니/);
    const q = num(/몫이 \$(\d+)\$[이가] 되었습니다/);
    return { pool: TENS, keep: (t) => Math.floor(x / t) === q, answer: id };
  }
  if (code === "1-3-5") {
    const nn = num(
      /^\$(\d+)\$[을를] 어떤 두 자리 수로 나누었더니 나누어떨어지고/,
    );
    return {
      pool: TWO,
      keep: (d) => nn % d === 0 && nn / d >= 1 && nn / d <= 9,
      answer: id,
    };
  }
  if (code === "1-3-6") {
    const nn = num(
      /^\$(\d+)\$[을를] 어떤 두 자리 수로 나누었더니 몫이 두 자리/,
    );
    const r = num(/나머지가 \$(\d+)\$[이가] 되었습니다/);
    return {
      pool: TWO,
      keep: (d) => nn % d === r && digitsOf(Math.floor(nn / d)) === 2,
      answer: id,
    };
  }
  const a = num(
    /^\$(\d+)\$[을를] 어떤 두 자리 수로 나누었더니 나누어떨어졌습니다/,
  );
  const bb = num(/몇십으로 어림하면 \$(\d+)\$[이가] 됩니다/);
  return {
    pool: TWO,
    keep: (d) => a % d === 0 && round10(d) === bb,
    answer: id,
  };
}

/**
 * **반증 ④ — 뒤집힘 필터.** 발문이 **되짚어야 할 대상을 말로 부르는가**.
 *
 * 리드의 반증 ⑥은 「발문이 준 수에 그 소단원 연산을 순방향으로만 적용해 답이 나오면
 * 중·상이 아니다」다. 그것을 **닫힘 집합**(두 걸음 안의 모든 결과)으로 재 봤고
 * **버렸다** — 재 본 결과를 남긴다:
 *
 * | 무엇이 났나 | 왜 |
 * |---|---|
 * | 거짓 경보 — 1-3-3 «응용» 16/16 이 「순방향으로 못 닿는다」 | 어림→곱→차라서 **세 걸음**이다. 걸음을 늘리면 아래가 더 나빠진다 |
 * | 거짓 통과 — 1-3-1 «심화상» 답 $80$·$30$ 이 「닿는다」 | 답이 **작은 수**라 큰 수들의 덧뺄셈·어림에서 **우연히** 나온다 |
 *
 * 닫힘 집합은 커질수록 작은 답을 우연히 삼킨다. 그래서 이 자는 그 축을 안 쓰고,
 * 되짚기의 **자국**을 본다 — 발문이 미지의 대상을 말로 부르는가(`어떤 …`·□).
 *
 * ⚠️ **못 보는 것**: 말을 안 쓰고 마디를 여는 발문은 이 열쇠에 안 걸린다.
 *    그리고 말을 써도 **한 식으로 굳는** 자리가 있다(표준 1-3-5 «연산»
 *    `$23\times\square=161$` — 리드 반증 ①의 그 자리). 그 둘은 아래에서 갈라 본다.
 */
const NAMES_UNKNOWN = /어떤 수|어떤 몇십|어떤 두 자리 수|\\square|□/;

/** 「$b\times\square=a$」처럼 **한 식이 그 자리를 곧바로 굳히는가.** */
function hardensInOneStep(content: string): boolean {
  return /\$\d+\\times\\square=\d+\$/.test(content);
}

describe("[초4 6단] 1-3 곱셈과 나눗셈 — 심화중·심화상 (D-113 파일럿)", () => {
  it("일곱 소단원이 핵심 넷 위에 확대 둘을 **모두** 갖는다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      expectCoreTiers(unit, code);
      expect(tiersOf(unit), `${code}: 여섯 갈래가 아니다`).toEqual([
        "연산",
        "기본",
        "응용",
        "심화하",
        "심화중",
        "심화상",
      ]);
    }
  });

  // ── 심화중 — 「굳지 않는 마디를 조건 한 번이 집는다」 ────────────────────

  it("심화중 — 마디의 후보가 여럿이고, 답은 그 무리의 **극값**이다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화중");
        const { pool, pick, answer } = midOf(code, p.content);
        if (pool.length < 2) {
          bad.push(
            `${code} seed ${seed}: 마디 후보가 ${pool.length}개 — 안 열렸다`,
          );
          continue;
        }
        const got = answer(
          pick === "min" ? Math.min(...pool) : Math.max(...pool),
        );
        if (got !== p.answer) {
          bad.push(
            `${code} seed ${seed}: 극값에서 «${got}» ≠ 지면 «${p.answer}»`,
          );
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // 음성 대조 — 반대쪽 극값이 **같은 답**을 주면 그 마디는 안 열린 것이고,
  // 「가장 큰/작은」이라는 조건이 아무 일도 안 한 것이다(=심화하다).
  it("심화중 — 반대쪽 극값을 집으면 **다른 답**이 나온다 (마디가 정말 열려 있다)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화중");
        const { pool, answer } = midOf(code, p.content);
        if (answer(Math.min(...pool)) === answer(Math.max(...pool))) {
          bad.push(`${code} seed ${seed}: 양 끝이 같은 답이다 — ${p.content}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // ── 심화상 — 「성질로는 못 굳혀, 계산해 견주어야 하나가 남는다」 ─────────

  it("심화상 — 후보에 소단원 계산을 걸면 **정확히 하나**가 남고, 그것이 답이다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const { pool, keep, answer } = topOf(code, p.content);
        const left = pool.filter(keep);
        if (left.length !== 1) {
          bad.push(
            `${code} seed ${seed}: 남은 후보 ${left.length}개 — ${p.content}`,
          );
          continue;
        }
        if (answer(left[0]!) !== p.answer) {
          bad.push(
            `${code} seed ${seed}: «${answer(left[0]!)}» ≠ 지면 «${p.answer}»`,
          );
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // 🔴 **이것이 심화중과 가르는 자리다.** 답이 무리의 극값이면 「가장 큰/작은」이라는
  //    조건 한 번으로 집히므로 심화중이지 심화상이 아니다.
  it("심화상 — 남은 하나가 후보 무리의 **극값이 아니다** (조건 한 번으로는 안 집힌다)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const { pool } = topOf(code, p.content);
        const v = Number(p.answer.replace(/[^\d]/g, ""));
        if (v === Math.min(...pool) || v === Math.max(...pool)) {
          bad.push(
            `${code} seed ${seed}: 답 ${v} 가 무리의 끝이다 — ${p.content}`,
          );
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("심화상 — 후보를 **발문이 주지 않는다** (되짚기가 만든 것이다)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const { pool, keep } = topOf(code, p.content);
        const given = new Set(numbersIn(p.content));
        const named = pool.filter(keep).filter((v) => given.has(v));
        if (named.length > 0) {
          bad.push(
            `${code} seed ${seed}: 답 후보 ${named} 가 발문에 적혀 있다`,
          );
        }
        // 후보 무리 자체도 발문이 열거하지 않는다 — 무리가 발문의 수보다 훨씬 크다.
        if (pool.length <= given.size) {
          bad.push(
            `${code} seed ${seed}: 후보 무리(${pool.length})가 발문의 수만큼 작다`,
          );
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // ── 반증 ④ — 뒤집힘 필터를 **실제로 댄다** ──────────────────────────────

  it("반증④ — 연산·기본·응용에는 **열린 마디가 없다** (있어도 한 식으로 굳는다)", () => {
    const bad: string[] = [];
    let named = 0;
    for (const code of CODES) {
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          if (!NAMES_UNKNOWN.test(p.content)) continue;
          named += 1;
          if (!hardensInOneStep(p.content)) {
            bad.push(
              `${code} ${tier} seed ${seed}: 미지의 대상을 부르는데 한 식으로 안 굳는다 — ${p.content.replace(/\n/g, " ")}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // 🔴 분모 — 미지의 대상을 부르는 자리가 하나도 없으면 위 단정은 **한 번도 안 돈다.**
    //    표준 1-3-5 «연산»이 그 자리다(`$23\times\square=161$`). 그것이 사라지면
    //    이 시험은 「깨끗」이 아니라 「못 셈」이 되므로 여기서 먼저 빨개진다.
    expect(
      named,
      "미지의 대상을 부르는 하위 갈래가 하나도 없다",
    ).toBeGreaterThan(0);
  });

  // 위 필터가 «아니오»를 낼 수 있어야 그 초록이 뜻이 있다 — 확대 둘은 반드시 부르고,
  // 부른 자리가 한 식으로 굳으면 안 된다.
  it("반증④ 음성 대조 — 심화중·심화상은 마디를 부르고, 한 식으로는 안 굳는다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ["심화중", "심화상"] as const) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          if (!NAMES_UNKNOWN.test(p.content)) {
            bad.push(`${code} ${tier} seed ${seed}: 미지의 대상을 안 부른다`);
          }
          if (hardensInOneStep(p.content)) {
            bad.push(
              `${code} ${tier} seed ${seed}: 한 식으로 굳는다 — 심화하다`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // ── 눈금 — 이 자가 «아니오»를 낼 수 있나 (양성·음성 둘 다) ──────────────

  it("눈금 — 지어낸 지면에서 마디와 견주기가 실제로 갈라낸다", () => {
    // 심화중 양성 — 「$60$ 을 곱해 다섯 자리, 가장 작은 세 자리 수」 → $167$
    const mid = midOf(
      "1-3-1",
      "어떤 수에 $60$을 곱했더니 곱이 다섯 자리 수가 되었습니다. 어떤 수가 될 수 있는 세 자리 수 중에서 가장 작은 수를 구하시오.",
    );
    expect(mid.pool.length, "마디가 안 열렸다").toBeGreaterThan(1);
    expect(mid.answer(Math.min(...mid.pool))).toBe("$167$");
    // 음성 — 반대쪽 끝은 다른 답이어야 한다(조건이 일을 한다)
    expect(mid.answer(Math.max(...mid.pool))).not.toBe("$167$");

    // 심화상 양성 — 후보 아흔에 나눗셈을 걸면 하나만 남는다
    const top = topOf(
      "1-3-7",
      "$665$를 어떤 두 자리 수로 나누었더니 나누어떨어졌습니다. 나누는 수를 몇십으로 어림하면 $20$이 됩니다. 나누는 수를 구하시오.",
    );
    expect(top.pool.length).toBe(90);
    expect(top.pool.filter(top.keep)).toEqual([19]);
    // 음성 — 어림 조건을 뺀 «계산만» 으로는 하나가 안 남는다(성질이 필요하다)
    expect(TWO.filter((d) => 665 % d === 0).length).toBeGreaterThan(1);

    // 마디 열쇠 — 양성·음성
    expect(NAMES_UNKNOWN.test("어떤 수에 $60$을 곱했더니")).toBe(true);
    expect(NAMES_UNKNOWN.test("$684$에 $67$을 곱하시오.")).toBe(false);
    expect(hardensInOneStep(String.raw`$23\times\square=161$ 에서`)).toBe(true);
    expect(hardensInOneStep(String.raw`$684\times\square$ 의 곱이`)).toBe(
      false,
    );
  });
});
