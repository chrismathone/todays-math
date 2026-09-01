/**
 * 초3 물결 4 — `2-4-1` 의 **심화상** (D-113 · D-115, 2026-09-01).
 *
 * ## 🔴 이 갈래는 **앞 회차의 «비움»을 뒤집은 것**이다
 *
 * 물결 2 는 2-4-1·2-4-2·2-4-3 의 심화상을 비우며 스스로 이렇게 적었다:
 *
 * > ⚠️ 이 하나는 **「없다」가 아니라 「내가 못 찾았다」**에 가깝다 — 전수로 반증하지 않았다.
 *
 * 전수로 세니 **1,492자리**가 있었다(서로 다른 (분모,분자,준 개수) 187).
 * 그러므로 이 파일은 「채웠다」만 잠그는 것이 아니라 **뒤집은 근거**를 잠근다 —
 * 무너지면 빨개지고, 그때 다시 물어야 한다.
 *
 * ## 무엇을 잠그나
 *
 *   ⑴ **성질이 한 후보도 못 자른다** — 창 안에 「묶음 수의 배수」가 **둘 이상**이다.
 *      하나뿐이면 그건 물결 2 의 **심화중**이지 상이 아니다(반증 ②).
 *   ⑵ **후보마다 만들어 견주어야 한다** — 「$P$ 개가 온전한 묶음 수가 되는」 후보가
 *      정확히 하나이고, 다른 후보에서는 **아예 나누어떨어지지 않는다.**
 *      뒤엣것이 없으면 해설의 「딱 떨어지는 것은 … 뿐입니다」가 거짓이 된다.
 *   ⑶ **해설이 후보를 하나도 빠뜨리지 않고 실제로 나눈다** — 그 걸음이 이 갈래를 상으로
 *      만든다. 늘어놓기만 하고 안 나누면 그건 다른 문항이다.
 *   ⑷ **반증 ⑥ 을 «유리수까지» 본다** — 답이 진분수라 공용 `forwardReachable` 은
 *      구조적으로 못 닿는다(정수만 만든다). 그 0 은 «깨끗»이 아니라 «못 셈»이므로
 *      「지면 두 수를 분수로 읽는 길」을 여기서 따로 보고, **눈금으로 살아 있음을 보인다.**
 *   ⑸ **2-4-2·2-4-3 은 그대로 비어 있다** — 그쪽은 분수를 발문이 주고 개수를 답하므로
 *      후보가 여럿이면 답도 여럿이 된다(구성상 불가).
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다(D-07).
 * 2. 답 분수의 **기약 여부는 안 본다** — 2-4-1 은 분수가 **답**이라 안 거르는 것이
 *    이 소단원의 규약이다(`frac32` 머리말의 비대칭). $\frac{4}{8}$ 이 정답이다.
 */
import { describe, expect, it } from "vitest";

import { pageNumbers } from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 24 }, (_, i) => 20260901 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/**
 * 발문에서 값을 **낱말로** 읽는다 — 수를 자리로 집으면 안 된다.
 *
 * ⚠️ 첫 판은 `pageNumbers` 가 낸 수 뭉치에서 «가장 작은 것이 창의 아래끝»이라 집었다가
 *    빨개졌다 — **묶음 수 $d$ 가 창의 아래끝보다 작을 수 있다**(「$35$~$45$ · $8$묶음」).
 *    그리고 준 개수 $P$ 는 발문에 **두 번** 나오므로 지면의 수는 넷이 아니라 다섯이다.
 */
function readRange(c: string, at: string): [number, number] {
  const m = c.match(/\$(\d+)\$개보다 많고 \$(\d+)\$개보다 적/);
  expect(m, `${at}: 창을 못 읽었다\n${c}`).toBeTruthy();
  return [Number(m![1]), Number(m![2])];
}

function readGroups(c: string, at: string): number {
  const m = c.match(/똑같이 \$(\d+)\$묶음으로/);
  expect(m, `${at}: 묶음 수를 못 읽었다\n${c}`).toBeTruthy();
  return Number(m![1]);
}

function readGiven(c: string, at: string): number {
  const m = c.match(/\$(\d+)\$개는 전체의/);
  expect(m, `${at}: 준 개수를 못 읽었다\n${c}`).toBeTruthy();
  return Number(m![1]);
}

/** 지면의 수 둘을 한 번 엮어 **분수** $k/d$ 에 닿나 (반증 ⑥ · 유리수 판). */
function fracOneStep(nums: readonly number[], kn: number, kd: number): boolean {
  const eq = (a: number, b: number) => a * kd === kn * b;
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      if (eq(a + b, 1) || eq(a - b, 1)) return true;
      if (a * b !== a && a * b !== b && eq(a * b, 1)) return true;
      if (b !== 0 && eq(a, b)) return true;
    }
  return nums.some((v) => eq(v, 1));
}

describe("초3 물결 4 — 2-4-1 의 심화상 (D-113 · D-115)", () => {
  it("🔴 눈금 — 분수용 반증 ⑥ 자가 «닿는다»와 «안 닿는다»를 둘 다 낸다", () => {
    // 지면 두 수를 분수로 읽는 길이 답과 같으면 «닿는다».
    expect(fracOneStep([10, 25, 3, 15], 2, 5), "$10/25=2/5$").toBe(true);
    expect(fracOneStep([2, 6, 8, 40], 1, 3), "$2/6=1/3$").toBe(true);
    expect(fracOneStep([3, 5, 8, 40], 8, 1), "지면의 수 그대로").toBe(true);
    // 음성 대조군 — 무엇이든 닿는 자였다면 아래도 참이 된다.
    expect(fracOneStep([60, 80, 8, 32], 4, 8), "음성").toBe(false);
    expect(fracOneStep([25, 40, 6, 15], 3, 6), "음성").toBe(false);
  });

  it("2-4-1 심화상 — 성질이 못 자르고 후보마다 만들어 견주어야 한다", () => {
    const u = unitOf("2-4-1");
    const shapes = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화상");
      const at = `2-4-1 심화상 씨앗 ${seed}`;

      // 답은 분수 $k/d$ 다.
      const am = p.answer.match(/^\$\\frac\{(\d+)\}\{(\d+)\}\$$/);
      expect(am, `${at}: 답이 분수가 아니다 — ${p.answer}`).toBeTruthy();
      const k = Number(am![1]);
      const d = Number(am![2]);

      // ⑴ 지면에 서는 값은 **넷뿐**이다 — 창의 두 끝 · 묶음 수 · 준 개수.
      //    (준 개수는 발문에 두 번 나오므로 «개수»가 아니라 «집합»으로 잰다.)
      const [L, U] = readRange(p.content, at);
      const dOnPage = readGroups(p.content, at);
      const P = readGiven(p.content, at);
      expect(dOnPage, `${at}: 발문의 묶음 수가 답의 분모와 다르다`).toBe(d);
      expect(U, `${at}: 창의 위끝이 아래끝보다 작다`).toBeGreaterThan(L);
      const page = pageNumbers(p.content).map((r) => r.n);
      expect(
        [...new Set(page)].sort((x, y) => x - y),
        `${at}: 지면에 뜻 없는 수가 더 있다\n${p.content}`,
      ).toEqual([...new Set([L, U, d, P])].sort((x, y) => x - y));

      // ⑵ 사슬을 **여기서 다시 세운다** — 창 안의 「묶음 수의 배수」 전부.
      const cands: number[] = [];
      for (let t = L + 1; t < U; t += 1) if (t % d === 0) cands.push(t);
      expect(
        cands.length,
        `${at}: 창 안 배수가 하나뿐이면 성질이 곧바로 굳힌다 — 그건 심화중이다`,
      ).toBeGreaterThan(1);

      // ⑶ 🔴 **「$P$ 개가 온전한 묶음 수가 되는」 후보가 정확히 하나**이고,
      //    다른 후보에서는 **아예 나누어떨어지지 않는다.**
      const alive = cands.filter((t) => P % (t / d) === 0);
      expect(
        alive.length,
        `${at}: 준 개수가 여러 후보에서 떨어진다 — 해설의 「뿐입니다」가 거짓이 된다`,
      ).toBe(1);
      const T = alive[0]!;
      const m = T / d;
      expect(P / m, `${at}: 답의 분자가 «몇 묶음»과 다르다`).toBe(k);
      expect(
        k,
        `${at}: 분자가 분모 이상이면 «그중 몇 묶음»이 아니다`,
      ).toBeLessThan(d);
      expect(
        k,
        `${at}: 분자가 $1$ 이면 단위분수라 2-4-2 의 자리다`,
      ).toBeGreaterThan(1);

      // ⑷ 반증 ⑥ — 지면의 수로는 답 분수에 못 닿는다.
      expect(
        fracOneStep(page, k, d),
        `${at}: 지면 두 수를 엮어 답 분수가 나온다 — 반증 ⑥`,
      ).toBe(false);

      // ⑸ 해설이 후보를 **하나도 빠뜨리지 않고 실제로 나눈다**(이 걸음이 «상»이다).
      const sol = p.solution ?? "";
      for (const t of cands)
        expect(
          sol.includes(`${t}\\div${d}=${t / d}`),
          `${at}: 해설이 후보 ${t} 를 안 나눴다 — 만들어 견주지 않았다\n${sol}`,
        ).toBe(true);
      const divs = [...sol.matchAll(/\$[^$]*\\div[^$]*=[^$]*\$/g)].length;
      expect(
        divs,
        `${at}: 해설의 나눗셈 등식이 «후보 수 + 마무리 하나»가 아니다`,
      ).toBe(cands.length + 1);

      shapes.add(`${d}|${k}|${P}`);
    }
    // ⑹ 다양성 — 전수 1,492자리 · 서로 다른 (분모,분자,준 개수) 187 에서 뽑는다.
    expect(
      shapes.size,
      `2-4-1 심화상의 «수 틀»이 너무 얇다: ${[...shapes].join(" ")}`,
    ).toBeGreaterThanOrEqual(12);
  });

  it("2-4-1 심화중과 심화상이 **구성상 안 섞인다**", () => {
    // 중은 창 안 배수가 **하나**, 상은 **둘 이상**이다. 한 지면에서 갈린다.
    const u = unitOf("2-4-1");
    for (const seed of SEEDS.slice(0, 12)) {
      const at = `심화중 씨앗 ${seed}`;
      const mid = generateElementaryProblem(u, seed, "심화중");
      const [L, U] = readRange(mid.content, at);
      const d = readGroups(mid.content, at);
      let cnt = 0;
      for (let t = L + 1; t < U; t += 1) if (t % d === 0) cnt += 1;
      expect(
        cnt,
        `${at}: 창 안 배수가 하나가 아니다 — 상과 섞인다\n${mid.content}`,
      ).toBe(1);
    }
  });

  it("🔴 2-4-2·2-4-3 의 심화상은 그대로 비어 있다 (구성상 불가)", () => {
    // 분수를 **발문이 주고 개수를 답**하므로, 후보 전체 수가 여럿이면 답도 여럿이 된다.
    for (const code of ["2-4-2", "2-4-3"])
      expect(
        supportedTiers(unitOf(code)),
        `${code}: 심화상이 생겼다 — 「답이 여럿이 되지 않는가」를 먼저 세라`,
      ).not.toContain("심화상");
  });
});
