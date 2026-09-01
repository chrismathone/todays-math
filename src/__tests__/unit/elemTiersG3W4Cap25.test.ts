/**
 * 초3 물결 4 — `2-5 들이와 무게` 의 **심화중·심화상** (D-113 · D-115, 2026-09-01).
 *
 * ## 🔴 이 대단원에서 **되살리면 안 되는** 축이 하나 있다
 *
 * 「합·차의 한 자리를 가리고 자리 넘김으로 굳힌다」는 **죽은 축**이다. 토대 17 §2.2 ⑴ 이
 * 신청 예시를 전수로 검산해 심화하임을 보였고(후보가 늘 하나 — 반증 ①, 굳힌다는 조건을
 * 지워도 답이 같다 — 반증 ⑤), 물결 3 이 그 뿌리가 **항등식**임을 진법과 무관하게 확인했다.
 * 밑이 $1000$ 이고 미지수가 $[1,999]$ 이면 **mod 되짚기의 답이 정확히 하나**다.
 * 아래 ⑸ 가 그 축이 되살아나지 않게 잠근다.
 *
 * ## 무엇을 잠그나
 *
 *   ⑴ **심화중** — 「몇 그릇인가」가 안 굳고, **작은 자리(mL·g)의 끝자리**가 정확히
 *      하나를 남긴다. 그 성질은 «큰 자리를 끝까지 계산하지 않고» 가른다(D-115 ⑾ → 중).
 *   ⑵ **심화상** — 합을 **범위로만** 주어 작은 자리가 지면에 **없다**. 그래서 그 성질이
 *      한 후보도 못 자르고, 그릇 수를 하나씩 **실제로 만들어** 견주어야 한다(→ 상).
 *   ⑶ **반증 ⑥** — 지면의 수 넷을 `+ − × ÷` 로 한 번 엮어 답이 나오면 안 된다.
 *      🔴 공용 자의 `readRat` 은 「$4\,\mathrm{L}\ 811\,\mathrm{mL}$」 꼴 답을 못 읽어
 *      **이 대단원을 한 문항도 안 본다**(토대 17 §3 실측). 그래서 여기 자를 따로 두고
 *      **양성·음성 대조군을 둘 다** 건다.
 *   ⑷ **비운 자리** — 2-5-1·2-5-2·2-5-4·2-5-5 넷에는 확대 갈래가 없다.
 *   ⑸ 🔴 **죽은 축이 되살아나지 않는다** — 확대 갈래의 발문에 $\square$ 가 없다.
 *      그 축의 유일한 모양이 「합의 한 자리를 $\square$ 로 가린다」이기 때문이다.
 *   ⑹ **형제(2-5-3 ↔ 2-5-6)가 같은 문항이 아니다** — 단위가 다르고, 같은 씨앗에서
 *      발문이 겹치지 않는다.
 *
 * ## 어떻게 판정하나 — **생성기를 되부르지 않는다**
 *
 * 아래는 전부 **발문의 수만 읽어 사슬을 처음부터 다시 세운다.** 자리 넘김도 여기서
 * 다시 센다 — 생성기 쪽 규칙과 갈리면 빨개져야 한다.
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다(D-07).
 * 2. 「몇 그릇인가」가 **사실은 나눗셈이 아닌가**(반증 ③)는 기계가 못 정한다.
 *    이 회차의 판단 근거는 「초3 은 $7000\div1400$ 을 못 한다 · 이 대단원 해설에
 *    나눗셈이 한 번도 안 나온다」이고, 그것을 대신해 **해설이 실제로 «거듭 더하는»
 *    글인지**를 아래에서 센다(합 등식의 개수와 값).
 * 3. 지면 넓이·줄 수는 안 본다 — 심화상 해설이 길다.
 */
import { describe, expect, it } from "vitest";

import { pageNumbers } from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 24 }, (_, i) => 20260901 + i * 7919);

/** 이 대단원의 형제 둘 — 같은 공장을 쓰고 단위만 다르다. */
const PAIRS = [
  { code: "2-5-3", big: "L", small: "mL" },
  { code: "2-5-6", big: "kg", small: "g" },
] as const;

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function intAnswer(answer: string): number {
  expect(answer, `정답이 한 값이 아니다: ${answer}`).toMatch(/^\$\d+\$$/);
  return Number(answer.slice(1, -1));
}

/** 반증 ⑥ — 지면의 수 둘을 `+ − × ÷` 로 **한 번** 엮어 답에 닿나(1-3 판과 같은 규칙). */
function oneStep(nums: readonly number[], answer: number): boolean {
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      if (a + b === answer) return true;
      if (a - b === answer) return true;
      if (a * b !== a && a * b !== b && a * b === answer) return true;
      if (b !== 0 && a % b === 0 && a / b !== a && a / b === answer)
        return true;
    }
  return false;
}

describe("초3 물결 4 — 2-5 의 심화중·심화상 (D-113 · D-115)", () => {
  it("🔴 눈금 — 반증 ⑥ 자가 «닿는다»와 «안 닿는다»를 둘 다 낸다", () => {
    expect(oneStep([2, 300, 6, 900], 3), "몫 — $6\\div2$").toBe(true);
    expect(oneStep([2, 300, 6, 900], 600), "차 — $900-300$").toBe(true);
    expect(oneStep([2, 300, 6, 900], 1800), "곱 — $6\\times300$").toBe(true);
    expect(oneStep([1, 400, 8, 400], 401), "합").toBe(true);
    // 「아무 일도 안 하는 연산」은 한 걸음이 아니다 — `$8\times1$`·`$8\div1$` 은 «적용»이
    // 아니고, 「답이 지면에 이미 있다」는 이 자가 아니라 `page.includes` 가 본다.
    expect(oneStep([1, 400, 8, 400], 8), "×1 은 적용이 아니다").toBe(false);
    // 음성 대조군 — 무엇이든 닿는 자였다면 아래도 참이 된다.
    expect(oneStep([1, 850, 9, 250], 5), "음성").toBe(false);
    expect(oneStep([2, 700, 8, 100], 3), "음성").toBe(false);
  });

  it("🔴 죽은 축이 되살아나지 않는다 — 확대 갈래 발문에 $\\square$ 가 없다", () => {
    // 「합·차의 한 자리를 가린다」는 mod 되짚기의 답이 늘 하나라 **심화하**다.
    // 그 축의 유일한 지면 모양이 $\square$ 이므로, 여기서 막으면 되살아날 수 없다.
    for (const { code } of PAIRS)
      for (const tier of ["심화중", "심화상"] as const)
        for (const seed of SEEDS.slice(0, 12)) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          expect(
            p.content,
            `${code} ${tier} 씨앗 ${seed}: 죽은 축(자리 가리기)이 되살아났다`,
          ).not.toContain("square");
        }
  });

  for (const { code, big, small } of PAIRS) {
    it(`${code} 심화중 — 작은 자리의 끝자리가 후보 하나만 남긴다`, () => {
      const u = unitOf(code);
      const shapes = new Set<string>();
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(u, seed, "심화중");
        const at = `${code} 심화중 씨앗 ${seed}`;
        const k = intAnswer(p.answer);

        // ⑴ 지면에 찍히는 수는 넷 — 한 그릇의 (큰,작은) 과 모두 부은 뒤의 (큰,작은).
        const page = pageNumbers(p.content).map((r) => r.n);
        expect(
          page.length,
          `${at}: 지면의 수가 넷이 아니다\n${p.content}`,
        ).toBe(4);
        const [b, s, eb, es] = page as [number, number, number, number];

        // ⑵ 되짚기 — 사슬을 여기서 다시 세운다.
        const per = b * 1000 + s;
        const total = eb * 1000 + es;
        expect(total % per, `${at}: 그릇 수가 자연수가 아니다`).toBe(0);
        expect(total / per, `${at}: 답이 그릇 수가 아니다`).toBe(k);
        expect(
          k,
          `${at}: 그릇이 둘이면 «두 번 더하기»라 응용이다`,
        ).toBeGreaterThanOrEqual(3);
        expect(
          es,
          `${at}: 지면에 「$N$ ${big} $0$ ${small}」 가 나간다`,
        ).not.toBe(0);
        expect(total, `${at}: 큰 자리가 두 자리가 된다`).toBeLessThan(10000);

        // ⑶ 🔴 **성질이 정확히 하나를 남긴다** — 작은 자리의 끝자리로만 센다.
        //    이것이 이 갈래를 «중»으로 만드는 자리다(큰 자리는 안 본다).
        const byTail: number[] = [];
        for (let j = 1; j <= 9; j += 1)
          if ((s * j) % 1000 === es) byTail.push(j);
        expect(byTail, `${at}: 끝자리가 남기는 후보`).toEqual([k]);

        // ⑷ 반증 ⑤ — 그 성질이 실제로 **가르는 일을 한다**(끝자리가 안 변하면 장식이다).
        const tails = new Set(
          Array.from({ length: 9 }, (_, j) => (s * (j + 1)) % 1000),
        );
        expect(
          tails.size,
          `${at}: 작은 자리 끝자리가 안 변한다 — 그 성질은 장식이다 (반증 ⑤)`,
        ).toBeGreaterThan(1);

        // ⑸ 반증 ⑥.
        expect(page.includes(k), `${at}: 답이 지면에 이미 찍혀 있다`).toBe(
          false,
        );
        expect(
          oneStep(page, k),
          `${at}: 지면의 수 한 걸음으로 답이 나온다 — 반증 ⑥`,
        ).toBe(false);

        // ⑹ 해설 — 끝자리를 $k$ 개 늘어놓고, **큰 자리는 맨 끝 확인에서만** 쓴다.
        const sol = p.solution ?? "";
        const want = Array.from(
          { length: k },
          (_, i) => (s * (i + 1)) % 1000,
        ).join(",\\ ");
        expect(
          sol.includes(want),
          `${at}: 해설의 끝자리 목록이 틀리다 — ${want}\n${sol}`,
        ).toBe(true);
        const plus = [...sol.matchAll(/\$[^$]*\+[^$]*=[^$]*\$/g)].length;
        expect(
          plus,
          `${at}: 해설이 큰 자리를 여러 번 더한다 — 그건 상의 길이다 (D-115 ⑾)`,
        ).toBe(1);

        shapes.add(`${per}|${k}`);
      }
      // ⑺ 다양성 — 씨앗 24개에서 서로 다른 (한 그릇, 답)이 이보다 줄면 빨개진다.
      expect(
        shapes.size,
        `${code} 심화중의 «수 틀»이 너무 얇다: ${[...shapes].join(" ")}`,
      ).toBeGreaterThanOrEqual(8);
    });

    it(`${code} 심화상 — 자리 성질이 한 후보도 못 자르고 만들어 견주어야 한다`, () => {
      const u = unitOf(code);
      const shapes = new Set<string>();
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(u, seed, "심화상");
        const at = `${code} 심화상 씨앗 ${seed}`;
        const k = intAnswer(p.answer);

        const page = pageNumbers(p.content).map((r) => r.n);
        expect(
          page.length,
          `${at}: 지면의 수가 넷이 아니다\n${p.content}`,
        ).toBe(4);
        const [b, s, lo, hi] = page as [number, number, number, number];
        const per = b * 1000 + s;

        // ⑴ 🔴 **작은 자리가 지면에 없다** — 그래서 그 성질이 한 후보도 못 자른다.
        //    작은 단위는 «한 그릇의 양» 한 곳에만 나온다.
        const smalls = [...p.content.matchAll(/\\mathrm\{([a-zA-Z]+)\}/g)].map(
          (m) => m[1],
        );
        expect(
          smalls.filter((v) => v === small).length,
          `${at}: 작은 단위가 두 번 이상 나온다 — 끝자리로 갈리면 그건 중이다\n${p.content}`,
        ).toBe(1);

        // ⑵ 범위가 **정확히 하나**를 남기고, 그 하나가 답이다.
        const hits: number[] = [];
        for (let j = 2; j <= 9; j += 1) {
          const t = per * j;
          if (t > lo * 1000 && t < hi * 1000) hits.push(j);
        }
        expect(hits, `${at}: 범위가 남기는 후보`).toEqual([k]);
        expect(
          k,
          `${at}: 셋 미만이면 만들어 견주는 일이 아니다`,
        ).toBeGreaterThanOrEqual(3);

        // ⑶ 바로 앞·뒤가 실제로 빗나가고, 뒤엣것도 지면에 세울 수 있는 크기다.
        expect(
          per * (k - 1),
          `${at}: 앞 후보가 범위 안이다`,
        ).toBeLessThanOrEqual(lo * 1000);
        expect(
          per * (k + 1),
          `${at}: 뒤 후보가 범위 안이다`,
        ).toBeGreaterThanOrEqual(hi * 1000);
        expect(
          per * (k + 1),
          `${at}: 뒤 후보가 네 자리를 넘어 견줄 것이 못 된다`,
        ).toBeLessThan(10000);

        // ⑷ 반증 ⑥.
        expect(page.includes(k), `${at}: 답이 지면에 이미 찍혀 있다`).toBe(
          false,
        );
        expect(
          oneStep(page, k),
          `${at}: 지면의 수 한 걸음으로 답이 나온다 — 반증 ⑥`,
        ).toBe(false);

        // ⑸ 🔴 해설이 **실제로 거듭 더한다** — 이 걸음이 이 갈래를 상으로 만든다.
        //    $k+1$ 번째까지 만들어 «빗나가는 것»을 보여야 «견준 것»이다.
        const sol = p.solution ?? "";
        for (let j = 2; j <= k + 1; j += 1)
          expect(
            sol.includes(`${per * (j - 1)}+${per}=${per * j}`),
            `${at}: 해설에 ${j} 번째 합이 없다 — 만들어 견주지 않았다\n${sol}`,
          ).toBe(true);
        const plus = [...sol.matchAll(/\$[^$]*\+[^$]*=[^$]*\$/g)].length;
        expect(plus, `${at}: 해설의 합 등식 수가 ${k} 가 아니다`).toBe(k);
        // 곱셈으로 접으면 그건 이 소단원의 셈이 아니다(이 대단원 해설에 나눗셈·곱셈이 없다).
        expect(
          /\\div/.test(sol),
          `${at}: 해설이 나눗셈을 쓴다 — 초3 2-5 의 셈이 아니다`,
        ).toBe(false);

        shapes.add(`${per}|${k}`);
      }
      expect(
        shapes.size,
        `${code} 심화상의 «수 틀»이 너무 얇다: ${[...shapes].join(" ")}`,
      ).toBeGreaterThanOrEqual(8);
    });
  }

  it("형제 소단원(2-5-3 ↔ 2-5-6)이 같은 문항이 되지 않는다 (D-66⑸)", () => {
    for (const tier of ["심화중", "심화상"] as const)
      for (const seed of SEEDS.slice(0, 12)) {
        const [a, b] = PAIRS.map(
          (x) => generateElementaryProblem(unitOf(x.code), seed, tier).content,
        );
        expect(a, `${tier} 씨앗 ${seed}: 두 소단원의 발문이 같다`).not.toBe(b);
      }
  });

  it("🔴 비운 자리 — 2-5-1·2-5-2·2-5-4·2-5-5 에는 확대 갈래가 없다", () => {
    // 비교(2-5-1·2-5-4)는 답이 「가·나」·부등호라 **되짚을 값이 없다.**
    // 단위(2-5-2·2-5-5)는 환산이 **일대일**이라 마디가 늘 굳고(반증 ①), 「몇 그릇인가」를
    // 거기 넣으면 굳히는 성질이 「합과 차」의 자리 넘김이 되어 소단원 밖이다(반증 ③).
    for (const code of ["2-5-1", "2-5-2", "2-5-4", "2-5-5"]) {
      const tiers = supportedTiers(unitOf(code));
      expect(
        tiers,
        `${code}: 심화중이 생겼다 — 근거를 다시 대라`,
      ).not.toContain("심화중");
      expect(
        tiers,
        `${code}: 심화상이 생겼다 — 근거를 다시 대라`,
      ).not.toContain("심화상");
    }
  });
});
