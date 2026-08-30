/**
 * 초4 1-3 「곱셈과 나눗셈」 **심화중·심화상** — D-113 파일럿 한 대단원.
 *
 * 값·표기·규모·겹침은 `elemTiersG4MulDiv.test.ts` 가 `tiersOf(unit)` 로 돌기 때문에
 * **새 갈래도 그대로 덮인다**(2026-08-30 수술). 여기 두 벌로 적지 않는다. 이 파일이
 * 맡는 것은 그 파일이 **구조적으로 못 보는 것** 하나다 —
 *
 *     「이 문항의 답에 닿으려면 **경우를 훑어야 하나**」
 *
 * ## 축 — «시험이 답을 얻으려고 실제로 훑은 후보 수»
 *
 * 심화상 일곱은 시험이 **발문에서** 후보 집합을 다시 만들어 훑어야만 답이 재현된다.
 * 그래서 이 파일은 세 가지를 같이 잰다:
 *
 *   ⑴ **훑기의 결과가 지면의 답과 같다** — 참은 발문에서 온다(생성기를 되부르지 않는다).
 *   ⑵ **후보가 여덟 이상이다** — g4 벤치 보고서 §4 ㉠ 이 지적한 자리다:
 *      「「모두 몇 개」가 붙어도 후보가 **3가지**면 탐색이라 할 것이 없다」(초4 2-3-7).
 *      여덟은 그 3가지를 **확실히 가르는** 값으로 잡았고, 지금 실측은 12~900이다.
 *   ⑶ **후보 하나를 빼면 답이 달라진다** — 답이 훑기와 무관하면(=후보를 안 봐도 나오면)
 *      이 단정이 빨개진다. 「후보 집합이 장식인가」를 묻는 자리다.
 *
 * 카드 두 갈래(1-3-1·1-3-2)에는 **음성 대조**를 하나 더 둔다: 「큰 수부터 앞자리에」라는
 * 그럴듯한 지름길로 얻는 답이 **참 답과 갈린다**. 안 갈리면 그 문항은 훑을 것이 없다.
 *
 * ## 🔴 이 자가 **못 보는 것** — 「심화중이 심화하보다 어려운가」
 *
 * 못 잰다. 그리고 그건 「아직 안 만들었다」가 아니라 **재 봤는데 안 갈렸다**이다.
 * 다음 사람이 같은 것을 다시 시도하지 않도록 실측을 적어 둔다(2026-08-30):
 *
 * | 대 본 축 | 왜 안 갈리나 |
 * |---|---|
 * | 해설의 **계산 걸음 수**(`countCalcSteps`) | 1-3-5 에서 심화하·심화중이 **둘 다 2**다. 심화중이 더한 것은 「몫과 나머지가 같은 한 자리 수 중 가장 큰 것」을 세우는 일인데 그건 셈이 아니다 |
 * | 답까지 만드는 **감춘 중간값 수** | 1-3-7 **심화하**가 3(어림값·어림몫·실제몫)이라 심화중(1)보다 많다 |
 * | **답의 꼴**(값 하나인가) | 1-3-7 심화하의 «원상» 갈래가 이미 두 값(`$15$, $24$`)을 낸다 |
 *
 * 이 대단원에서 심화하 → 심화중을 가르는 성질이 **소단원마다 다르기 때문**이다
 * (되짚기 한 겹 더 · 어림의 원상 둘 겹침 · 관계에서 후보를 스스로 세우기). 한 축으로
 * 접으면 그 축은 어딘가에서 반드시 거짓이 된다 — 그러면 **거짓 경보가 가드를 끈다.**
 * 그래서 심화중에는 **바닥만** 건다(값이 맞다 · 답이 발문에 그대로 있지 않다 ·
 * 발문에 없는 값을 만들어야 한다). **높이는 원장님이 `/dev/tier-bench/g4` 에서 여섯을
 * 나란히 보고 정하신다** — 그것이 이 파일럿의 목적이다(D-71·D-07).
 *
 * ⚠️ 그리고 ⑴~⑶ 도 **「후보가 많다 = 어렵다」를 뜻하지 않는다.** 후보 900개를 규칙
 *    하나로 건너뛰면 한 걸음이다(1-3-6 이 실제로 그렇다 — 그게 그 문항의 알맹이다).
 *    이 축이 지키는 것은 **「훑지 않고는 답이 안 나온다」** 하나다.
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

const gen = (
  code: string,
  seed: number,
  tier: "심화하" | "심화중" | "심화상",
) => generateElementaryProblem(unitOf(code), seed, tier);

/** 글에 실린 수 전부(KaTeX 안). 발문에서 참을 꺼내는 유일한 창구다. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

/** 어림 — 생성기의 함수를 부르지 않고 규칙을 여기서 다시 쓴다(동어반복 금지). */
const round10 = (v: number) => Math.round(v / 10) * 10;
const round100 = (v: number) => Math.round(v / 100) * 100;

/** 서로 다른 카드 `size` 장을 자리까지 정해 늘어놓은 것 전부. */
function layouts(cards: readonly number[], size: number): number[][] {
  if (size === 0) return [[]];
  const out: number[][] = [];
  for (let i = 0; i < cards.length; i += 1) {
    const rest = [...cards.slice(0, i), ...cards.slice(i + 1)];
    for (const tail of layouts(rest, size - 1)) out.push([cards[i]!, ...tail]);
  }
  return out;
}

const digitsToNumber = (ds: readonly number[]) =>
  ds.reduce((acc, d) => acc * 10 + d, 0);

/** 발문 첫머리의 수 카드 목록. */
function cardsIn(content: string): number[] {
  const head = content.match(/^((?:\$\d+\$(?:, )?)+) 의 수 카드/);
  expect(head, `수 카드 목록을 못 읽었다: ${content}`).toBeTruthy();
  return numbersIn(head![1]!);
}

/**
 * 심화상 한 문항의 **후보 집합과 그 위의 셈**. 후보는 발문이 열어 놓은 경우를 남김없이
 * 담고, `solve` 는 그 위에서만 답을 만든다 — 그래서 후보를 빼면 답이 흔들린다.
 */
type Search = {
  candidates: number[];
  solve: (cs: readonly number[]) => string;
};

const listAnswer = (vs: readonly number[]) =>
  [...vs]
    .sort((a, b) => a - b)
    .map((v) => `$${v}$`)
    .join(", ");

function searchOf(code: Code, content: string): Search {
  if (code === "1-3-1") {
    // 카드 넷 → (세 자리 수)×(몇십). 몇십에 놓을 카드 4 × 남은 세 장의 배열 6.
    const cards = cardsIn(content);
    expect(cards.length, content).toBe(4);
    const candidates: number[] = [];
    for (const three of layouts(cards, 3)) {
      const tens = cards.find((c) => !three.includes(c))! * 10;
      candidates.push(digitsToNumber(three) * tens);
    }
    return {
      candidates,
      solve: (cs) => `$${Math.max(...cs)}$, $${Math.min(...cs)}$`,
    };
  }
  if (code === "1-3-2") {
    // 카드 다섯 → (세 자리 수)×(두 자리 수). 5P3 × 2P2 = 120.
    const cards = cardsIn(content);
    expect(cards.length, content).toBe(5);
    const candidates: number[] = [];
    for (const three of layouts(cards, 3)) {
      const rest = cards.filter((c) => !three.includes(c));
      for (const two of layouts(rest, 2)) {
        candidates.push(digitsToNumber(three) * digitsToNumber(two));
      }
    }
    return {
      candidates,
      solve: (cs) => `$${Math.max(...cs)}$, $${Math.min(...cs)}$`,
    };
  }
  if (code === "1-3-3") {
    // 카드 넷 중 두 장으로 만든 두 자리 수 12가지 중 «몇십으로 어림한 값»이 맞는 것.
    const cards = cardsIn(content);
    expect(cards.length, content).toBe(4);
    const a = content.match(/\$(\d+)\$[은는] 몇백으로/);
    const est = content.match(/어림했더니 \$(\d+)\$[이가] 되었습니다/);
    expect(a && est, content).toBeTruthy();
    const aa = round100(Number(a![1]));
    const target = Number(est![1]);
    expect(target % aa, `어림한 곱이 몇백으로 안 나뉜다: ${content}`).toBe(0);
    const bb = target / aa;
    const candidates = layouts(cards, 2).map((ds) => digitsToNumber(ds));
    return {
      candidates,
      solve: (cs) => listAnswer(cs.filter((v) => round10(v) === bb)),
    };
  }
  if (code === "1-3-4") {
    // 범위 안의 수를 **하나도 빼지 않고** 훑는다 — 규칙(등차)을 시험이 쓰지 않는다.
    const m = content.match(
      /^\$(\d+)\$부터 \$(\d+)\$까지의 수 중에서 \$(\d+)\$(?:으로|로) 나누었을 때 나머지가 \$(\d+)\$인/,
    );
    expect(m, content).toBeTruthy();
    const [from, to, b, r] = [1, 2, 3, 4].map((i) => Number(m![i]));
    const candidates: number[] = [];
    for (let v = from!; v <= to!; v += 1) candidates.push(v);
    return {
      candidates,
      solve: (cs) => `$${cs.filter((v) => v % b! === r!).length}$개`,
    };
  }
  if (code === "1-3-5") {
    // 몫이 한 자리인 «어떤 수» 전부(몫 1~9 × 나머지 0~b-1)를 훑는다.
    const m = content.match(
      /^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니 나머지가 있고, 몫은 나머지의 \$(\d+)\$배인/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    const k = Number(m![2]);
    const candidates: number[] = [];
    for (let v = b; v <= b * 9 + b - 1; v += 1) candidates.push(v);
    return {
      candidates,
      solve: (cs) =>
        listAnswer(
          cs.filter((v) => {
            const r = v % b;
            return r >= 1 && Math.floor(v / b) === r * k;
          }),
        ),
    };
  }
  if (code === "1-3-6") {
    // 세 자리 수 900개를 통째로 훑는다 — «나머지의 폭»이라는 규칙을 시험이 쓰지 않는다.
    const m = content.match(
      /^어떤 세 자리 수를 \$(\d+)\$(?:으로|로) 나누었더니 몫이 \$(\d+)\$[이가] 되었습니다/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    const q = Number(m![2]);
    const candidates: number[] = [];
    for (let v = 100; v <= 999; v += 1) candidates.push(v);
    return {
      candidates,
      solve: (cs) => `$${cs.filter((v) => Math.floor(v / b) === q).length}$개`,
    };
  }
  // 1-3-7 — 두 자리 수 90개를 훑는다. 어림의 창(bb-5~bb+4)도 시험이 미리 쓰지 않는다.
  const m = content.match(
    /^\$(\d+)\$[을를] 어떤 두 자리 수로 나누려고 합니다\. 나누는 수를 몇십으로 어림하면 \$(\d+)\$[이가] 되고, 나누어떨어집니다/,
  );
  expect(m, content).toBeTruthy();
  const a = Number(m![1]);
  const bb = Number(m![2]);
  const candidates: number[] = [];
  for (let v = 10; v <= 99; v += 1) candidates.push(v);
  return {
    candidates,
    solve: (cs) =>
      listAnswer(cs.filter((v) => round10(v) === bb && a % v === 0)),
  };
}

/**
 * 심화중 한 문항의 **답과, 답에 닿는 동안 만들어야 하는 값들**.
 * 사슬은 **내가 적은 것**이다 — 학생이 밟을 사슬과 같은지는 사람이 본다.
 * 이 자가 지키는 것은 「발문의 수만 옮겨 적으면 답이 안 된다」 하나다.
 */
function midOf(
  code: Code,
  content: string,
): { answer: string; made: number[] } {
  if (code === "1-3-1") {
    const m = content.match(
      /^어떤 수에 \$(\d+)\$[을를] 곱해야 할 것을 잘못하여 더했더니 \$(\d+)\$[이가]/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    const wrong = Number(m![2]);
    const x = wrong - b;
    const right = x * b;
    return { answer: `$${right - wrong}$`, made: [x, right] };
  }
  if (code === "1-3-2") {
    const m = content.match(
      /^어떤 수에 \$(\d+)\$[을를] 곱해야 할 것을 잘못하여 \$(\d+)\$의 십의 자리 숫자와 일의 자리 숫자를 바꾼 수를 곱했더니 \$(\d+)\$[이가]/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    expect(Number(m![2]), "바꿀 수가 곱할 수와 달라졌다").toBe(b);
    const wrong = Number(m![3]);
    const bs = (b % 10) * 10 + Math.floor(b / 10);
    expect(wrong % bs, `잘못 곱한 값이 안 떨어진다: ${content}`).toBe(0);
    const x = wrong / bs;
    const right = x * b;
    return {
      answer: `$${Math.abs(right - wrong)}$`,
      made: [bs, x, right],
    };
  }
  if (code === "1-3-3") {
    const m = content.match(
      /^몇백으로 어림하면 \$(\d+)\$[이가] 되는 세 자리 수 중에서 가장 큰 수와, 몇십으로 어림하면 \$(\d+)\$[이가] 되는 두 자리 수 중에서 가장 작은 수의 곱/,
    );
    expect(m, content).toBeTruthy();
    const big = Number(m![1]) + 49;
    const small = Number(m![2]) - 5;
    return { answer: `$${big * small}$`, made: [big, small] };
  }
  if (code === "1-3-4") {
    const m = content.match(
      /^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니 몫이 \$(\d+)\$[이가] 되고 나머지는 가장 큰 수/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    const q = Number(m![2]);
    return { answer: `$${b * q + (b - 1)}$`, made: [b - 1, b * q] };
  }
  if (code === "1-3-5") {
    const m = content.match(
      /^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니 몫과 나머지가 같은 한 자리 수/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    // 「몫과 나머지가 같은 한 자리 수」의 최댓값 — 발문에 없는 값이다.
    const t = 9;
    return { answer: `$${b * t + t}$`, made: [t, b * t] };
  }
  if (code === "1-3-6") {
    const m = content.match(
      /^어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니 몫이 \$(\d+)\$[이가] 되고 나머지는 가장 큰 수가 되었습니다\. 어떤 수보다 \$1\$ 큰 수를 \$(\d+)\$(?:으로|로) 나눈 몫/,
    );
    expect(m, content).toBeTruthy();
    const b = Number(m![1]);
    const q = Number(m![2]);
    expect(Number(m![3]), "두 번째 나누는 수가 달라졌다").toBe(b);
    const x = b * q + (b - 1);
    expect((x + 1) % b, "한 큰 수가 안 떨어진다").toBe(0);
    return { answer: `$${(x + 1) / b}$`, made: [b - 1, x, x + 1] };
  }
  const m = content.match(
    /^\$(\d+)\\div\\square\$ 에서 나누는 수 \$\\square\$ 를 몇십으로 어림하여 몫을 어림했더니 \$(\d+)\$[이가]/,
  );
  expect(m, content).toBeTruthy();
  const a = Number(m![1]);
  const k = Number(m![2]);
  expect(a % k, `어림한 몫이 자연수가 아니다: ${content}`).toBe(0);
  const bb = a / k;
  expect(bb % 10, `어림한 나누는 수가 몇십이 아니다: ${content}`).toBe(0);
  return { answer: `$${bb + 4}$`, made: [bb] };
}

describe("[초4 6단] 1-3 곱셈과 나눗셈 — 심화중·심화상 (D-113 파일럿)", () => {
  it("일곱 소단원이 핵심 넷 위에 확대 둘을 **모두** 갖는다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      expectCoreTiers(unit, code);
      const tiers = tiersOf(unit);
      expect(tiers, `${code}: 여섯 갈래가 아니다`).toEqual([
        "연산",
        "기본",
        "응용",
        "심화하",
        "심화중",
        "심화상",
      ]);
    }
  });

  // ── 심화상 — 훑기 축 ────────────────────────────────────────────────

  it("심화상 — 발문에서 후보를 다시 만들어 **훑은 결과**가 지면의 답과 같다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const { candidates, solve } = searchOf(code, p.content);
        const got = solve(candidates);
        if (got !== p.answer) {
          bad.push(
            `${code} seed ${seed}: 훑기 «${got}» ≠ 지면 «${p.answer}»\n      ${p.content.replace(/\n/g, " ")}`,
          );
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("심화상 — 훑은 후보가 **여덟 이상**이다 (「후보 3가지」는 탐색이 아니다)", () => {
    const smallest = new Map<Code, number>();
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const size = searchOf(code, p.content).candidates.length;
        smallest.set(code, Math.min(smallest.get(code) ?? size, size));
      }
    }
    for (const code of CODES) {
      expect(
        smallest.get(code),
        `${code}: 후보가 ${smallest.get(code)}개뿐이다`,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it("심화상 — **후보 하나를 빼면 답이 달라진다** (후보 집합이 장식이 아니다)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const { candidates, solve } = searchOf(code, p.content);
        const full = solve(candidates);
        const shaken = candidates.some(
          (_, i) =>
            solve([...candidates.slice(0, i), ...candidates.slice(i + 1)]) !==
            full,
        );
        if (!shaken) bad.push(`${code} seed ${seed}: ${p.content}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // 카드 두 갈래의 음성 대조 — 「큰 수부터 앞자리에」로는 최댓값이 안 나온다.
  // 이 단정이 초록이라는 것은 「지름길로 찍으면 틀린다」는 뜻이다.
  it("심화상 카드 갈래 — 그럴듯한 지름길로 얻는 곱은 참 최댓값과 갈린다", () => {
    for (const code of ["1-3-1", "1-3-2"] as const) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화상");
        const cards = [...cardsIn(p.content)].sort((a, b) => b - a);
        const three = digitsToNumber(cards.slice(0, 3));
        const shortcut =
          code === "1-3-1"
            ? three * cards[3]! * 10
            : three * digitsToNumber(cards.slice(3, 5));
        const truth = Math.max(...searchOf(code, p.content).candidates);
        expect(
          shortcut,
          `${code} seed ${seed}: 지름길이 참 최댓값과 같다 — 훑을 것이 없다`,
        ).not.toBe(truth);
      }
    }
  });

  // ── 심화중 — 바닥만 건다(높이는 사람이 본다, 파일 머리 참조) ──────────

  it("심화중 — 답을 발문에서 다시 구한다 (일곱 소단원)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화중");
        const { answer } = midOf(code, p.content);
        if (answer !== p.answer) {
          bad.push(
            `${code} seed ${seed}: 다시 구한 값 «${answer}» ≠ 지면 «${p.answer}»`,
          );
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("심화중 — 답이 발문에 그대로 있지 않고, 발문에 없는 값을 만들어야 한다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화중");
        const given = new Set(numbersIn(p.content));
        const { made } = midOf(code, p.content);
        for (const v of numbersIn(p.answer)) {
          if (given.has(v))
            bad.push(`${code} seed ${seed}: 답 ${v} 가 발문에 있다`);
        }
        if (made.every((v) => given.has(v))) {
          bad.push(`${code} seed ${seed}: 발문의 수만으로 답이 나온다`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  // ── 눈금 — 이 자가 «아니오»를 낼 수 있나 ──────────────────────────────
  //
  // 위 단정이 전부 초록인 것이 «깨끗»인지 «못 셈»인지 갈라야 한다. 지어낸 지면을
  // 대어 훑기와 사슬이 실제로 갈라내는지 회차마다 보인다(양성·음성 둘 다).
  it("눈금 — 훑기가 틀린 답을 잡고 맞는 답을 통과시킨다", () => {
    const card4 = "$2$, $3$, $5$, $8$ 의 수 카드가 한 장씩 있습니다.";
    const s = searchOf("1-3-1", card4);
    expect(s.candidates.length, "카드 넷의 후보는 24가지다").toBe(24);
    // 양성 — 참 답(훑어서 나온 값)
    expect(s.solve(s.candidates)).toBe("$42560$, $7160$");
    // 음성 — 후보를 셋만 남기면 답이 달라진다(=후보 집합이 답을 정한다)
    expect(s.solve(s.candidates.slice(0, 3))).not.toBe("$42560$, $7160$");

    const div = searchOf(
      "1-3-7",
      "$120$을 어떤 두 자리 수로 나누려고 합니다. 나누는 수를 몇십으로 어림하면 $20$이 되고, 나누어떨어집니다. 나누는 수가 될 수 있는 수를 모두 구하시오.",
    );
    expect(div.candidates.length, "두 자리 수는 90개다").toBe(90);
    expect(div.solve(div.candidates)).toBe("$15$, $20$, $24$");
    // 음성 — 어림 조건이 없으면 $10$·$12$ 같은 것이 섞여 답이 달라진다
    expect(div.solve(div.candidates.filter((v) => v !== 15))).not.toBe(
      "$15$, $20$, $24$",
    );
  });

  it("눈금 — 심화중 사슬이 지어낸 지면에서도 같은 답을 낸다", () => {
    // 양성 — 「$40$을 곱해야 할 것을 더했더니 $556$」 → 어떤 수 $516$ · 바른 값 $20640$
    expect(
      midOf(
        "1-3-1",
        "어떤 수에 $40$을 곱해야 할 것을 잘못하여 더했더니 $556$이 되었습니다. 바르게 계산한 값은 잘못 계산한 값보다 얼마나 더 큰가?",
      ),
    ).toEqual({ answer: "$20084$", made: [516, 20640] });
    // 음성 — 잘못 계산한 값이 달라지면 답도 달라져야 한다(사슬이 발문을 실제로 읽는다)
    expect(
      midOf(
        "1-3-1",
        "어떤 수에 $40$을 곱해야 할 것을 잘못하여 더했더니 $557$이 되었습니다. 바르게 계산한 값은 잘못 계산한 값보다 얼마나 더 큰가?",
      ).answer,
    ).not.toBe("$20084$");
  });
});
