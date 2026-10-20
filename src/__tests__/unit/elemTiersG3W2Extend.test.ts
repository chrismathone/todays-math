/**
 * 초3 물결 2 — `2-2 나눗셈` · `2-4 분수` · `2-6 그림그래프` 의 **심화중·심화상**
 * (D-113 · D-115, 2026-08-31).
 *
 * ## 무엇을 잠그나
 *
 *   ⑴ **심화중** — 되짚기 사슬에 **굳지 않는 마디가 하나** 있고(후보가 둘 이상),
 *      **그 소단원의 성질이 정확히 하나만** 남긴다. 그리고 **성질을 빼면 여럿이
 *      남는다** — 안 그러면 그 성질은 장식이고 그 문항은 심화하다(반증 ①·⑤).
 *   ⑵ **심화상** — 후보가 **셋 이상**이고 그 소단원의 성질이 **한 개도 못 걸러 낸다.**
 *      실제로 만들어(나누어) 견주어야 하나가 남는다.
 *   ⑶ **반증 ⑥** — 발문에 찍힌 수를 순방향으로 엮어 답이 나오면 중·상이 아니다.
 *      **제품 규칙(`forwardReach`)을 그대로 부르고, 입력은 «지면»에서 읽는다** —
 *      생성기가 무엇을 세었는지는 안 본다(둘이 갈리면 지면이 옳다).
 *   ⑷ **비운 자리를 잠근다** — 2-2-1·2-2-2·2-4-4·2-4-6·2-6-1 에 확대 갈래가 생기면
 *      빨개진다. 그 자리를 되살리려면 보고서 §3 의 «세어서 나온 근거»를 다시 대야 한다.
 *
 * ## 어떻게 판정하나 — **생성기를 되부르지 않는다**
 *
 * 아래 판정은 전부 **발문의 수만 읽어 사슬을 처음부터 다시 세운다**. 생성기의 목록을
 * import 하면 「목록이 목록과 같다」가 되어 아무것도 안 지킨다.
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다.
 * 2. `forwardReachable` 은 수를 셋까지·연산을 두 번까지만 엮는다. 그리고 **나눗셈이
 *    아예 없다** — 그래서 ⑶ 의 «양성 대조군»을 이 대단원의 연산 갈래로는 세울 수
 *    없다(나눗셈 소단원의 1단조차 «안 닿음»이 된다). 대신 **손으로 만든 양성**을
 *    대어 「이 자가 «예»를 낼 수 있는가」부터 확인한다 — 그게 없으면 0 은 «깨끗»과
 *    «못 셈»을 안 가른다.
 * 3. 읽을 수 없는 발문은 **통과가 아니라 빨강**이다. 발문 문법을 넓히면 아래 파서도
 *    같이 넓혀야 한다 — 그게 이 시험의 이빨이다.
 */
import { describe, expect, it } from "vitest";

import {
  forwardReachable,
  pageNumbers,
  rat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 24 }, (_, i) => 20260831 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** 정답이 «수 하나»인 갈래. */
function intAnswer(answer: string): number {
  expect(answer, `정답이 한 값이 아니다: ${answer}`).toMatch(/^\$\d+\$$/);
  return Number(answer.slice(1, -1));
}

/** 정답이 «분수»인 갈래. */
function fracAnswer(answer: string): [number, number] {
  const m = answer.match(/^\$\\frac\{(\d+)\}\{(\d+)\}\$$/);
  expect(m, `정답이 분수가 아니다: ${answer}`).toBeTruthy();
  return [Number(m![1]), Number(m![2])];
}

/** `나누는 수가 $b$인 나눗셈 … $r$` 짝을 나온 순서대로. */
function divisorPairs(text: string): [number, number][] {
  return [
    ...text.matchAll(/나누는 수가 \$(\d+)\$인 나눗셈[^.]*?\$(\d+)\$/g),
  ].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
}

/** `$L$보다 크고 $U$보다 작` — 단위가 끼어도 읽는다. */
function bounds(text: string): [number, number] {
  const m = text.match(
    /\$(\d+)\$[^$]*보다 (?:크|많)고 \$(\d+)\$[^$]*보다 (?:작|적)/,
  );
  expect(m, `범위를 못 읽었다: ${text}`).toBeTruthy();
  return [Number(m![1]), Number(m![2])];
}

/** 반증 ⑥ — 제품 규칙을 그대로 부르되 입력은 **지면**에서 읽는다. */
function forwardOk(content: string, answer: number, at: string): void {
  expect(
    forwardReachable(pageNumbers(content), rat(answer)),
    `${at}: 순방향으로 답이 나온다 — 반증 ⑥\n${content}`,
  ).toBe(false);
}

describe("초3 물결2 — 확대 갈래의 잣대", () => {
  it("⑶ 눈금 — 순방향 판정기가 «예»를 낼 수 있다 (양성 대조군)", () => {
    // 이 양성이 무너지면 아래의 모든 «false» 는 «못 셈»이 된다.
    expect(forwardReachable(pageNumbers("$8$ $4$"), rat(32))).toBe(true);
    expect(forwardReachable(pageNumbers("$8$ $4$ $5$"), rat(27))).toBe(true);
    expect(forwardReachable(pageNumbers("$8$ $4$"), rat(31))).toBe(false);
  });

  it("⑷ 비운 자리는 비어 있다 — 되살리려면 근거를 다시 대라", () => {
    for (const code of ["2-2-1", "2-2-2", "2-4-4", "2-4-6", "2-6-1"]) {
      const t = supportedTiers(unitOf(code));
      expect(t, `${code}: 심화중을 비웠다(보고서 §3)`).not.toContain("심화중");
      expect(t, `${code}: 심화상을 비웠다(보고서 §3)`).not.toContain("심화상");
    }
    // 🔴 **2-4-1 의 심화상 잠금은 물결 4(2026-09-01)가 뒤집었다.**
    //    이 회차는 「성질이 늘 하나로 굳어 상이 안 선다」로 비웠고, 보고서 §7 에
    //    스스로 「**«없다»가 아니라 «내가 못 찾았다»**에 가깝다 — 전수로 반증하지
    //    않았다」고 적어 두었다. 물결 4 가 전수로 세니 **1,492자리**가 있었다
    //    (창을 넓혀 배수를 여럿으로 만들고 「그중 몇 묶음이 $P$ 개」를 같이 준다).
    //    ⚠️ **이 줄을 지우지 않고 뒤집는다** — 「비었다」를 잠근 자리가 지워지면
    //    다음 사람이 그 자리에 잠금이 있었다는 것조차 모른다.
    //    새 갈래의 근거는 `elemTiersG3W4Frac241.test.ts` 가 잠근다.
    expect(supportedTiers(unitOf("2-4-1"))).toContain("심화상");
    // 2-4-2·2-4-3 은 **여전히 비어 있다** — 분수를 발문이 주고 개수를 답하므로
    // 후보 전체 수가 여럿이면 답도 여럿이 된다(구성상 불가, 물결 4 가 확인).
    for (const code of ["2-4-2", "2-4-3"])
      expect(
        supportedTiers(unitOf(code)),
        `${code}: 심화상을 비웠다(물결 2 §3-㉣ · 물결 4 §7)`,
      ).not.toContain("심화상");
  });

  it("2-2-3 심화중 — 나머지를 모르는 마디를 «나누어떨어짐»이 하나로 굳힌다", () => {
    const u = unitOf("2-2-3");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화중");
      const ans = intAnswer(p.answer);
      const at = `2-2-3 심화중 씨앗 ${seed}`;
      // 발문이 말하는 나누는 수 둘 — 어느 쪽이 «몫이 있는 쪽»인지는 답으로 가린다.
      const divisors = [...p.content.matchAll(/나누는 수가 \$(\d+)\$/g)].map(
        (m) => Number(m[1]),
      );
      expect(
        divisors,
        `${at}: 나누는 수 둘을 못 읽었다\n${p.content}`,
      ).toHaveLength(2);
      const qm = p.content.match(/몫이 \$(\d+)\$/);
      expect(qm, `${at}: 몫을 못 읽었다`).toBeTruthy();
      const q = Number(qm![1]);
      const b1 = divisors.find(
        (b) => Math.floor(ans / b) === q && ans % b !== 0,
      );
      const b2 = divisors.find((b) => b !== b1);
      expect(
        b1,
        `${at}: 몫 ${q} 과 나머지를 함께 내는 나누는 수가 없다`,
      ).toBeTruthy();
      expect(ans % b2!, `${at}: 두 번째 나눗셈이 나누어떨어지지 않는다`).toBe(
        0,
      );

      // 마디가 안 굳는다 — 나머지를 모르면 후보가 $b_1-1$ 개다.
      const cand: number[] = [];
      for (let r = 1; r <= b1! - 1; r += 1) cand.push(b1! * q + r);
      expect(
        cand.length,
        `${at}: 후보가 둘 미만이면 심화하다(반증 ①)`,
      ).toBeGreaterThanOrEqual(2);
      expect(cand, `${at}: 정답이 후보 안에 없다`).toContain(ans);

      // 성질이 **정확히 하나**만 남긴다.
      const hits = cand.filter((x) => x % b2! === 0);
      expect(hits, `${at}: 성질이 하나만 남겨야 한다`).toEqual([ans]);
      // 성질을 빼면 여럿이 남는다 — 안 그러면 그 성질은 장식이다(반증 ⑤).
      expect(
        cand.length,
        `${at}: 성질을 빼도 하나뿐이면 심화하다`,
      ).toBeGreaterThan(1);

      forwardOk(p.content, ans, at);
    }
  });

  it("2-2-3 심화상 — 성질이 한 개도 못 걸러 실제로 다 나눈다", () => {
    const u = unitOf("2-2-3");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화상");
      const ans = intAnswer(p.answer);
      const at = `2-2-3 심화상 씨앗 ${seed}`;
      const pairs = divisorPairs(p.content);
      expect(
        pairs,
        `${at}: (나누는 수, 나머지) 짝 둘을 못 읽었다\n${p.content}`,
      ).toHaveLength(2);
      const [[b1, r1], [b2, r2]] = pairs as [
        [number, number],
        [number, number],
      ];
      const [lo, hi] = bounds(p.content);

      // 첫 조건이 만드는 후보 — 발문이 주지 않는다(되짚기가 만든다).
      const cand: number[] = [];
      for (let x = lo + 1; x < hi; x += 1) if (x % b1 === r1) cand.push(x);
      expect(
        cand.length,
        `${at}: 후보가 셋 미만이면 심화중과 안 갈린다`,
      ).toBeGreaterThanOrEqual(3);
      expect(cand, `${at}: 정답이 후보 안에 없다`).toContain(ans);

      // 「나머지 < 나누는 수」는 후보를 **하나도** 못 자른다 — 그래서 상이다.
      expect(
        cand.every((x) => x % b1 === r1 && r1 < b1),
        `${at}: 성질이 후보를 가른다면 그것은 심화중이다`,
      ).toBe(true);

      // 둘째 조건은 **나눠 봐야** 안다.
      const hits = cand.filter((x) => x % b2 === r2);
      expect(hits, `${at}: 답이 하나로 남아야 한다`).toEqual([ans]);

      // 해설이 후보를 **하나씩 실제로** 나눈다(D-115 ⑾ — 참은 해설이 밟는 길이다).
      for (const x of cand)
        expect(p.solution, `${at}: 해설이 후보 ${x} 를 안 나눈다`).toContain(
          `${b2}\\times${Math.floor(x / b2)}=${b2 * Math.floor(x / b2)}`,
        );

      forwardOk(p.content, ans, at);
    }
  });

  it("2-2-4 심화중 — «몫이 세 자리인가»가 나누는 수를 하나로 굳힌다", () => {
    const u = unitOf("2-2-4");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화중");
      const ans = intAnswer(p.answer);
      const at = `2-2-4 심화중 씨앗 ${seed}`;
      const nm = p.content.match(/나뉘는 수가 \$(\d+)\$/);
      const rm = p.content.match(/나머지(?:가|는) \$(\d+)\$/);
      expect(
        nm && rm,
        `${at}: 나뉘는 수·나머지를 못 읽었다\n${p.content}`,
      ).toBeTruthy();
      const N = Number(nm![1]);
      const r = Number(rm![1]);
      expect(N, `${at}: 나뉘는 수가 세 자리라야 한다`).toBeGreaterThanOrEqual(
        100,
      );
      expect(N, `${at}: 나뉘는 수가 세 자리라야 한다`).toBeLessThanOrEqual(999);
      const M = N - r;

      // 되짚기가 후보를 만든다 — 「나머지 < 나누는 수」 + 「나누어떨어진다」.
      const cand: number[] = [];
      for (let b = 3; b <= 9; b += 1) if (b > r && M % b === 0) cand.push(b);
      expect(
        cand.length,
        `${at}: 후보가 둘 미만이면 심화하다`,
      ).toBeGreaterThanOrEqual(2);
      expect(cand, `${at}: 정답이 후보 안에 없다`).toContain(ans);

      // 성질이 정확히 하나를 남긴다 — 그리고 성질을 빼면 여럿이다(반증 ⑤).
      const three = cand.filter((b) => M / b >= 100);
      expect(three, `${at}: «몫이 세 자리»가 하나만 남겨야 한다`).toEqual([
        ans,
      ]);
      expect(
        cand.length,
        `${at}: 성질을 빼도 하나뿐이면 심화하다`,
      ).toBeGreaterThan(1);
      // 이 성질은 **끝까지 나누지 않고** 안다 — 백의 자리와 나누는 수의 크기다.
      expect(
        cand.every((b) => Math.floor(M / 100) >= b === M / b >= 100),
        `${at}: 백의 자리 규칙과 실제 몫 자릿수가 어긋난다`,
      ).toBe(true);

      forwardOk(p.content, ans, at);
    }
  });

  it("2-2-4 심화상 — 성질이 한 개도 못 걸러 차례로 나눈다", () => {
    const u = unitOf("2-2-4");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화상");
      const ans = intAnswer(p.answer);
      const at = `2-2-4 심화상 씨앗 ${seed}`;
      const nm = p.content.match(/나뉘는 수가 \$(\d+)\$/);
      const rm = p.content.match(/나머지(?:가|는) \$(\d+)\$/);
      expect(
        nm && rm,
        `${at}: 나뉘는 수·나머지를 못 읽었다\n${p.content}`,
      ).toBeTruthy();
      const N = Number(nm![1]);
      const r = Number(rm![1]);

      // 후보는 「나머지 < 나누는 수」가 만든다 — 발문이 주지 않는다.
      const cand: number[] = [];
      for (let b = r + 1; b <= 9; b += 1) cand.push(b);
      expect(
        cand.length,
        `${at}: 후보가 셋 미만이면 심화중과 안 갈린다`,
      ).toBeGreaterThanOrEqual(3);

      // 성질(몫의 자릿수)이 **하나도** 못 자른다 — 후보 전부가 두 자리 몫이다.
      expect(
        cand.every((b) => {
          const q = Math.floor(N / b);
          return q >= 10 && q <= 99;
        }),
        `${at}: 몫의 자릿수가 후보를 가른다면 그것은 심화중이다`,
      ).toBe(true);

      const hits = cand.filter((b) => N % b === r);
      expect(hits.length, `${at}: 나누는 수가 하나로 정해져야 한다`).toBe(1);
      expect(ans, `${at}: 정답은 그 나눗셈의 몫이다`).toBe((N - r) / hits[0]!);

      // 해설이 후보를 **하나씩 실제로** 나눈다.
      for (const b of cand)
        expect(p.solution, `${at}: 해설이 후보 ${b} 를 안 나눈다`).toContain(
          `${b}\\times${Math.floor(N / b)}=${b * Math.floor(N / b)}`,
        );

      forwardOk(p.content, ans, at);
    }
  });

  it("2-4-1·2-4-2·2-4-3 심화중 — «전체가 묶음 수로 나누어떨어진다»가 굳힌다", () => {
    for (const code of ["2-4-1", "2-4-2", "2-4-3"]) {
      const u = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(u, seed, "심화중");
        const at = `${code} 심화중 씨앗 ${seed}`;
        const [lo, hi] = bounds(p.content);
        const dm = p.content.match(/\$(\d+)\$묶음/);
        expect(dm, `${at}: 묶음 수를 못 읽었다\n${p.content}`).toBeTruthy();
        const d = Number(dm![1]);

        // 마디가 안 굳는다 — 창 안의 수가 여럿이다.
        const window: number[] = [];
        for (let v = lo + 1; v < hi; v += 1) window.push(v);
        expect(
          window.length,
          `${at}: 창이 하나뿐이면 마디가 이미 굳었다`,
        ).toBeGreaterThan(1);
        // 성질이 정확히 하나를 남긴다.
        const hits = window.filter((v) => v % d === 0);
        expect(
          hits.length,
          `${at}: «묶음 수로 나누어떨어짐»이 하나만 남겨야 한다`,
        ).toBe(1);
        const total = hits[0]!;
        const one = total / d;

        if (code === "2-4-1") {
          const [num, den] = fracAnswer(p.answer);
          expect(den, `${at}: 분모는 묶음 수다`).toBe(d);
          const pm = p.content.match(/\$(\d+)\$개(?:였|는|입)/);
          expect(pm, `${at}: 꺼낸 개수를 못 읽었다\n${p.content}`).toBeTruthy();
          expect(Number(pm![1]), `${at}: 꺼낸 개수는 한 묶음의 배수다`).toBe(
            one * num,
          );
          expect(
            forwardReachable(pageNumbers(p.content), rat(num, den)),
            `${at}: 순방향으로 답이 나온다 — 반증 ⑥`,
          ).toBe(false);
        } else {
          const fm = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
          expect(fm, `${at}: 발문의 분수를 못 읽었다`).toBeTruthy();
          expect(Number(fm![2]), `${at}: 분모는 묶음 수다`).toBe(d);
          const k = Number(fm![1]);
          // 소단원 이름이 갈라 놓은 것 — (1) 은 단위분수, (2) 는 분자 $2$ 이상.
          if (code === "2-4-2")
            expect(k, `${at}: (1) 은 단위분수라야 한다`).toBe(1);
          else
            expect(
              k,
              `${at}: (2) 는 분자가 $2$ 이상이라야 한다`,
            ).toBeGreaterThanOrEqual(2);
          expect(intAnswer(p.answer), `${at}: 답은 $k$ 묶음의 개수다`).toBe(
            one * k,
          );
          forwardOk(p.content, intAnswer(p.answer), at);
        }
      }
    }
  });

  it("2-4-5 심화중 — «분모보다 작은 수 가운데 가장 큰 나머지»가 굳힌다", () => {
    const u = unitOf("2-4-5");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화중");
      const ans = intAnswer(p.answer);
      const at = `2-4-5 심화중 씨앗 ${seed}`;
      const nm = p.content.match(/\\frac\{(\d+)\}\{\\square\}/);
      const wm = p.content.match(/자연수 부분(?:이|은) \$(\d+)\$/);
      expect(
        nm && wm,
        `${at}: 분자·자연수 부분을 못 읽었다\n${p.content}`,
      ).toBeTruthy();
      const N = Number(nm![1]);
      const w = Number(wm![1]);

      // 나머지를 안 주면 마디가 안 굳는다 — 분모마다 나머지 후보가 $d-1$ 개다.
      expect(ans, `${at}: 분모는 $2$보다 커야 한다`).toBeGreaterThan(2);
      const rest = N - w * ans;
      expect(rest, `${at}: 나머지는 분모보다 $1$ 작은 수다`).toBe(ans - 1);
      expect(
        rest,
        `${at}: 나머지 후보가 둘 이상이라야 마디가 안 굳는다`,
      ).toBeGreaterThan(0);
      expect(ans - 1, `${at}: 나머지 후보 수`).toBeGreaterThanOrEqual(2);
      // 이 분모가 유일하다 — 다른 분모로는 「자연수부 $w$ + 나머지 최대」가 안 된다.
      const all: number[] = [];
      for (let d = 2; d <= 30; d += 1) if ((w + 1) * d - 1 === N) all.push(d);
      expect(all, `${at}: 답이 하나로 정해져야 한다`).toEqual([ans]);

      forwardOk(p.content, ans, at);
    }
  });

  it("2-4-5 심화상 — 성질이 한 개도 못 걸러 후보를 다 만들어 견준다", () => {
    const u = unitOf("2-4-5");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화상");
      const [num, den] = fracAnswer(p.answer);
      const at = `2-4-5 심화상 씨앗 ${seed}`;
      const dm = p.content.match(/\\frac\{\\square\}\{(\d+)\}/);
      expect(dm, `${at}: 분모를 못 읽었다\n${p.content}`).toBeTruthy();
      expect(Number(dm![1]), `${at}: 발문의 분모와 답의 분모가 다르다`).toBe(
        den,
      );
      const [lo, hi] = bounds(p.content);

      // 되짚기가 후보를 만든다 — 「자연수 부분 = 나머지」인 가분수 분자.
      const cand: number[] = [];
      for (let r = 1; r <= den - 1; r += 1) cand.push(r * (den + 1));
      expect(
        cand.length,
        `${at}: 후보가 셋 미만이면 심화중과 안 갈린다`,
      ).toBeGreaterThanOrEqual(3);
      // 「나머지 < 분모」는 후보를 **하나도** 못 자른다.
      expect(
        cand.every((v) => v % (den + 1) < den),
        `${at}: 성질이 후보를 가른다면 그것은 심화중이다`,
      ).toBe(true);
      // 범위가 하나만 남긴다 — 그것이 답이다.
      expect(
        cand.filter((v) => v > lo && v < hi),
        `${at}: 답이 하나여야 한다`,
      ).toEqual([num]);
      // 가분수라야 한다(분자 ≥ 분모).
      expect(num, `${at}: 답이 가분수가 아니다`).toBeGreaterThanOrEqual(den);

      expect(
        forwardReachable(pageNumbers(p.content), rat(num, den)),
        `${at}: 순방향으로 답이 나온다 — 반증 ⑥`,
      ).toBe(false);
    }
  });

  it("2-6-2 심화중 — «작은 그림은 $9$ 개를 넘지 않는다»가 가장 작은 값을 정한다", () => {
    const u = unitOf("2-6-2");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화중");
      const ans = intAnswer(p.answer);
      const at = `2-6-2 심화중 씨앗 ${seed}`;
      const tm = p.content.match(/(?:모두|합해) \$(\d+)\$개/);
      expect(tm, `${at}: 그림 수를 못 읽었다\n${p.content}`).toBeTruthy();
      const total = Number(tm![1]);
      expect(
        total,
        `${at}: 규약이 걸리려면 그림이 열 개를 넘어야 한다`,
      ).toBeGreaterThan(10);

      // 마디가 안 굳는다 — $a+b$ 만으로는 값이 안 정해진다.
      const vals: number[] = [];
      for (let a = 0; a <= total; a += 1)
        if (total - a <= 9) vals.push(9 * a + total);
      const noRule: number[] = [];
      for (let a = 0; a <= total; a += 1) noRule.push(9 * a + total);
      expect(noRule.length, `${at}: 후보가 하나면 심화하다`).toBeGreaterThan(1);
      // 성질이 가장 작은 것을 정한다 — 그리고 성질을 빼면 답이 달라진다(반증 ⑤).
      expect(Math.min(...vals), `${at}: 성질이 정한 가장 작은 값`).toBe(ans);
      expect(
        Math.min(...noRule),
        `${at}: 성질을 빼도 답이 같으면 장식이다`,
      ).not.toBe(ans);
      // 그림그래프를 그리지 않는다(그리면 세는 것으로 답이 나온다).
      expect(p.figureSpec, `${at}: 2-6-2 는 그림을 안 붙인다`).toBeNull();

      forwardOk(p.content, ans, at);
    }
  });

  it("2-6-2 심화상 — 규약이 한 후보도 못 잘라 값을 다 만들어 본다", () => {
    const u = unitOf("2-6-2");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, "심화상");
      const ans = intAnswer(p.answer);
      const at = `2-6-2 심화상 씨앗 ${seed}`;
      const tm = p.content.match(/(?:모두|합해|그림) \$(\d+)\$개/);
      expect(tm, `${at}: 그림 수를 못 읽었다\n${p.content}`).toBeTruthy();
      const total = Number(tm![1]);
      const [lo, hi] = bounds(p.content);

      // 규약이 **한 후보도 못 자른다** — 그림이 아홉 개 이하다.
      expect(
        total,
        `${at}: 그림이 열 개를 넘으면 규약이 자른다(그건 심화중이다)`,
      ).toBeLessThanOrEqual(9);
      const vals: number[] = [];
      for (let a = 0; a <= total; a += 1) vals.push(9 * a + total);
      expect(
        vals.length,
        `${at}: 후보가 셋 미만이면 심화중과 안 갈린다`,
      ).toBeGreaterThanOrEqual(3);
      const hits = vals.filter((v) => v > lo && v < hi);
      expect(hits.length, `${at}: 값이 하나로 정해져야 한다`).toBe(1);
      expect(ans, `${at}: 답은 큰 그림 수다`).toBe((hits[0]! - total) / 9);
      expect(
        total - ans,
        `${at}: 작은 그림도 있어야 «나타내기»다`,
      ).toBeGreaterThan(0);
      expect(p.figureSpec, `${at}: 2-6-2 는 그림을 안 붙인다`).toBeNull();

      forwardOk(p.content, ans, at);
    }
  });
});
