/**
 * 초3 `2-1 곱셈` **심화중·심화상** — D-113 파일럿, **되짚기 축** (2026-08-30).
 *
 * ## 축이 바뀌었다 — 첫 판(열거 축)은 **기각**됐다
 *
 * 처음엔 「답이 후보 하나냐 후보 전체냐」로 잠갔다. 리드 패널이 문형 전량 6,900행으로
 * 두 축을 재어 **열거는 갈래를 1.5~2배밖에 안 가르고 되짚기는 22~40배 가른다**는 것을
 * 보였고, 심화하 **안에서** 열거형은 평균 0.39 걸음으로 그 소단원의 «연산»(0.79)보다도
 * 얕았다. 내 초3 산출물도 실제로 한 칸씩 낮게 앉았다.
 *
 * ## 지금 축 — **되짚기 사슬의 마디가 굳는가**
 *
 *   · **심화하**(기준선) — 마디마다 값이 **하나로 굳는다**.
 *   · **심화중** — 굳지 않는 마디가 **하나** 있고, **그 소단원의 성질**이 굳혀 준다.
 *   · **심화상** — 성질로도 **아무것도 못 잘라 내어**, 후보를 실제로 곱해 견주어야 한다.
 *
 * 이 대단원의 되짚기는 **곱의 일의 자리**다. 초3 2-1 은 나눗셈을 못 쓰므로(D-66⑶)
 * 인수를 되짚는 길이 곱셈구구뿐이다 — 아래 판정은 **발문의 수만 읽어 그 곱셈구구를
 * 처음부터 다시 돌려** 후보를 만든다. 생성기를 되부르지 않으므로 동어반복이 아니다.
 *
 * ## 이 파일이 잠그는 것
 *
 *   ⑴ 심화중 — 되짚기 후보가 **둘 이상**(마디가 안 굳는다)이고, 정답이 그중 하나이며,
 *      발문이 내건 **성질이 정확히 하나만** 남긴다. **성질을 빼면 여럿이 남는다** —
 *      그래야 그 성질이 등급의 근거다(안 그러면 심화하다, 반증 1).
 *   ⑵ 심화상 — 후보가 **셋 이상**이고 **올림도 자릿수도 후보끼리 모두 같아**
 *      성질이 한 개도 못 걸러 낸다. 곱의 크기로만 하나가 남는다.
 *   ⑶ **반증 ④(뒤집힘 필터)** — 같은 소단원의 **연산·기본·응용**은 발문의 수를
 *      **순방향**으로 조합하면 답이 나온다(= 되짚기 축이 그 갈래를 안 집는다).
 *      심화 셋은 안 나온다. **양성·음성 대조군이 한 시험 안에 다 있다.**
 *   ⑷ 2-1-4 심화하(수 카드)의 **해설이 답에 이른다** — 리드가 짚은 결함.
 *
 * ## ⚠️ 못 보는 것
 *
 * 1. 「그 되짚기가 초등학생에게 실제로 어려운가」는 못 잰다 — 원장님 몫이다.
 * 2. 순방향 도달 검사는 **수를 최대 셋까지, 연산을 두 번까지**만 조합한다. 그보다
 *    복잡한 순방향 경로가 있으면 못 본다(그러면 ⑶ 의 음성 쪽이 느슨해진다).
 * 3. 읽을 수 없는 발문은 **통과가 아니라 빨강**이다 — 파서가 못 읽으면 그 자리에서
 *    실패한다. 발문 문법을 넓히면 파서도 같이 넓혀야 한다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const MUL21 = ["2-1-1", "2-1-2", "2-1-3", "2-1-4"] as const;
const SEEDS = Array.from({ length: 24 }, (_, i) => 20260830 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** KaTeX 안에 찍힌 수를 나온 순서대로. */
function nums(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

function answerOf(answer: string): number {
  expect(answer, `정답이 한 값이 아니다: ${answer}`).toMatch(/^\$\d+\$$/);
  return Number(answer.slice(1, -1));
}

/** (세 자리)×(한 자리) 올림 횟수 — 생성기와 **따로** 센다. */
function carries3x1(a: number, b: number): number {
  let count = 0;
  let carry = 0;
  for (let d = 0; d < 3; d += 1) {
    const v = (Math.floor(a / 10 ** d) % 10) * b + carry;
    carry = Math.floor(v / 10);
    if (carry > 0) count += 1;
  }
  return count;
}

/** **되짚기를 여기서 다시 돌린다** — 곱셈구구가 만드는 후보. */
function reverseOnes(o: number, r: number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= 9; k += 1) if ((o * k) % 10 === r) out.push(k);
  return out;
}

// ── 발문 파서 ────────────────────────────────────────────────────────────────

/**
 * 곱해지는 **기준 수**.
 *
 * ⚠️ 처음엔 「자리 범위 안에서 가장 큰 수」로 읽었다. **문턱($500$·$700$)이 그 범위에
 *    들어와** 기준 수를 문턱으로 읽었고, 그러면 되짚기를 엉뚱한 수로 돌린다.
 *    조건이 말한 수(문턱·일의 자리)를 **먼저 빼고** 남은 것에서 고른다.
 */
function baseOf(content: string, min: number, max: number): number | null {
  const said = new Set<number>();
  for (const m of content.matchAll(/\$(\d+)\$보다 [크작]/g))
    said.add(Number(m[1]));
  for (const m of content.matchAll(/일의 자리 숫자가 \$(\d+)\$/g))
    said.add(Number(m[1]));
  const cand = nums(content).filter(
    (v) => v >= min && v <= max && !said.has(v),
  );
  return cand.length === 1 ? cand[0]! : null;
}

/** 「곱의 일의 자리 숫자가 $r$」 — **정확히 한 번**이어야 읽는다. */
function onesDigitOf(content: string): number | null {
  const m = [...content.matchAll(/일의 자리 숫자가 \$(\d+)\$/g)];
  return m.length === 1 ? Number(m[0]![1]) : null;
}

/** 「올림이 …」 — 손 열쇠다. **정확히 하나만** 맞아야 하고 아니면 null(=빨강). */
function carryWordOf(content: string): number | null {
  const words = [
    /올림이 한 번도 없었습니다/,
    /올림이 한 번 있었습니다/,
    /올림이 두 번 있었습니다/,
    /올림이 세 번 있었습니다/,
  ];
  const hit = words
    .map((re, i) => (re.test(content) ? i : -1))
    .filter((i) => i >= 0);
  return hit.length === 1 ? hit[0]! : null;
}

/** 「… 자리 수」 — 마찬가지로 정확히 하나. */
function digitWordOf(content: string): number | null {
  const words = [/두 자리 수/, /세 자리 수/, /네 자리 수/];
  const hit = words
    .map((re, i) => (re.test(content) ? i + 2 : -1))
    .filter((i) => i >= 0);
  return hit.length === 1 ? hit[0]! : null;
}

/**
 * 곱의 크기 조건 — 두 겹일 수도, **한쪽뿐**일 수도 있다(맨 앞·맨 뒤 후보를 고를 때).
 * `[아래끝, 위끝]` 로 돌려주고 없는 쪽은 `null` 이다. 꼴이 안 맞으면 `null`(=빨강).
 *
 * ⚠️ 「크」 쪽은 활용형이 첫 음절을 안 나눈다(크고·큰·큽니다) — 손 열쇠라 닫힌 집합으로
 *    적고 **정확히 하나만** 맞아야 읽는다. 목록에 없는 말투를 쓰면 조용히 통과하는
 *    대신 빨개진다.
 */
function rangeOf(content: string): [number | null, number | null] | null {
  const both = [...content.matchAll(/\$(\d+)\$보다 크고 \$(\d+)\$보다 작/g)];
  if (both.length === 1) return [Number(both[0]![1]), Number(both[0]![2])];
  if (both.length > 1) return null;
  const less = [...content.matchAll(/\$(\d+)\$보다 작/g)];
  const more = [...content.matchAll(/\$(\d+)\$보다 [크큰큽]/g)];
  if (less.length === 1 && more.length === 0)
    return [null, Number(less[0]![1])];
  if (more.length === 1 && less.length === 0)
    return [Number(more[0]![1]), null];
  return null;
}

/** 후보가 그 크기 조건을 지키나. */
function inRange(p: number, lo: number | null, hi: number | null): boolean {
  return (lo === null || p > lo) && (hi === null || p < hi);
}

/**
 * **순방향으로 답이 나오나** — 발문의 수 둘·셋을 ×·+·− 로 한두 번 엮어 본다.
 * 반증 ⑥ 의 자다. 「수를 그대로 베낀 것」은 순방향이 아니므로 **연산을 반드시 한 번은**
 * 쓴다.
 */
function forwardReaches(content: string, answer: number): boolean {
  const ns = nums(content);
  const ops = (x: number, y: number) => [x * y, x + y, x - y, y - x];
  for (let i = 0; i < ns.length; i += 1) {
    for (let j = 0; j < ns.length; j += 1) {
      if (i === j) continue;
      for (const v of ops(ns[i]!, ns[j]!)) {
        if (v === answer) return true;
        for (let k = 0; k < ns.length; k += 1) {
          if (k === i || k === j) continue;
          if (ops(v, ns[k]!).includes(answer)) return true;
        }
      }
    }
  }
  return false;
}

describe("[초3 D-113] 2-1 곱셈 — 되짚기 축", () => {
  it("채운 자리와 **비운 자리**가 그대로다", () => {
    // 네 소단원 모두 심화중은 선다.
    for (const code of MUL21)
      expect(supportedTiers(unitOf(code)), `${code} 심화중`).toContain(
        "심화중",
      );
    // 심화상은 **둘만** 선다. 비운 자리도 잠근다 — 누가 채우면 그 근거를 다시 세우게 한다.
    for (const code of ["2-1-2", "2-1-3"] as const)
      expect(supportedTiers(unitOf(code)), `${code} 심화상`).toContain(
        "심화상",
      );
    for (const code of ["2-1-1", "2-1-4"] as const)
      expect(
        supportedTiers(unitOf(code)),
        `${code} 심화상을 채웠다 — 보고서 §2.2 의 «비운 까닭»을 다시 보고, 근거가 바뀌었으면 이 줄을 고쳐라`,
      ).not.toContain("심화상");
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of MUL21) {
      for (const tier of supportedTiers(unitOf(code))) {
        const a = generateElementaryProblem(unitOf(code), 424242, tier);
        const b = generateElementaryProblem(unitOf(code), 424242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  /**
   * 🔴 **알맹이 ⑴ — 심화중: 마디가 안 굳고, 성질이 하나만 남긴다.**
   * 「성질을 빼면 여럿이 남는다」를 같이 요구하는 것이 핵심이다 — 없으면 성질이
   * 장식이어도 초록이고, 그건 심화하다(반증 1).
   */
  it("심화중 — 되짚기 후보가 여럿이고 소단원 성질이 정확히 하나를 남긴다", () => {
    let judged = 0;
    for (const code of ["2-1-1", "2-1-2", "2-1-3"] as const) {
      const threeByOne = code !== "2-1-3";
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "심화중");
        const where = `${code} 심화중 seed ${seed}: ${p.content.replace(/\n/g, " ")}`;
        const a = baseOf(
          p.content,
          threeByOne ? 100 : 10,
          threeByOne ? 999 : 99,
        );
        const r = onesDigitOf(p.content);
        expect(a, `${where} — 기준 수를 못 읽었다`).toBeTruthy();
        expect(r, `${where} — 곱의 일의 자리를 못 읽었다`).not.toBeNull();

        // 되짚기를 여기서 다시 돌린다.
        const ks = reverseOnes(a! % 10, r!);
        expect(
          ks.length,
          `${where} — 되짚기 후보가 하나뿐이다(그러면 심화하다)`,
        ).toBeGreaterThanOrEqual(2);
        const ans = answerOf(p.answer);
        expect(ks, `${where} — 답이 되짚기 후보가 아니다`).toContain(ans);

        // 성질이 정확히 하나를 남기는가 — 그리고 **성질을 빼면 여럿**인가.
        const survivors = threeByOne
          ? (() => {
              const want = carryWordOf(p.content);
              expect(want, `${where} — 올림 조건을 못 읽었다`).not.toBeNull();
              return ks.filter((k) => carries3x1(a!, k) === want);
            })()
          : (() => {
              const want = digitWordOf(p.content);
              expect(want, `${where} — 자릿수 조건을 못 읽었다`).not.toBeNull();
              return ks.filter((k) => String(a! * k).length === want);
            })();
        expect(survivors, `${where} — 성질이 남긴 후보`).toEqual([ans]);
        judged += 1;
      }
    }
    expect(judged, "한 문항도 안 읽었다").toBe(3 * SEEDS.length);
  });

  /** 2-1-4 심화중 — 곱의 크기가 후보를 만들고 일의 자리 성질이 하나를 굳힌다. */
  it("2-1-4 심화중 — 범위가 만든 후보를 일의 자리 성질이 하나로 굳힌다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unitOf("2-1-4"), seed, "심화중");
      const where = `2-1-4 심화중 seed ${seed}: ${p.content.replace(/\n/g, " ")}`;
      const range = rangeOf(p.content);
      const r = onesDigitOf(p.content);
      expect(range, `${where} — 범위를 못 읽었다`).toBeTruthy();
      expect(r, `${where} — 일의 자리를 못 읽었다`).not.toBeNull();
      const a = baseOf(p.content, 11, 99);
      expect(a, `${where} — 기준 수를 못 읽었다`).toBeTruthy();
      const [T1, T2] = range!;
      // 범위가 만드는 후보를 여기서 다시 만든다(몇십몇만).
      const win: number[] = [];
      for (let b = 10; b <= 99; b += 1)
        if (b % 10 !== 0 && inRange(a! * b, T1, T2)) win.push(b);
      expect(
        win.length,
        `${where} — 범위가 만든 후보가 둘 미만`,
      ).toBeGreaterThanOrEqual(2);
      const survivors = win.filter((b) => ((b % 10) * (a! % 10)) % 10 === r);
      expect(survivors, `${where} — 일의 자리가 남긴 후보`).toEqual([
        answerOf(p.answer),
      ]);
    }
  });

  /**
   * 🔴 **알맹이 ⑵ — 심화상: 성질이 한 개도 못 걸러 낸다.**
   * 후보끼리 올림도 자릿수도 같아야 한다. 하나라도 다르면 그 성질로 잘리므로 심화중이다.
   */
  it("심화상 — 후보 셋 이상이고 성질로는 하나도 못 걸러, 곱의 크기로만 갈린다", () => {
    let judged = 0;
    for (const code of ["2-1-2", "2-1-3"] as const) {
      const threeByOne = code !== "2-1-3";
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "심화상");
        const where = `${code} 심화상 seed ${seed}: ${p.content.replace(/\n/g, " ")}`;
        const a = baseOf(
          p.content,
          threeByOne ? 100 : 10,
          threeByOne ? 999 : 99,
        );
        const r = onesDigitOf(p.content);
        const range = rangeOf(p.content);
        expect(a, `${where} — 기준 수를 못 읽었다`).toBeTruthy();
        expect(r, `${where} — 일의 자리를 못 읽었다`).not.toBeNull();
        expect(range, `${where} — 범위를 못 읽었다`).toBeTruthy();

        const ks = reverseOnes(a! % 10, r!);
        expect(
          ks.length,
          `${where} — 후보가 셋 미만이면 심화중 자리다`,
        ).toBeGreaterThanOrEqual(3);
        // 성질이 아무것도 못 자른다.
        const digits = ks.map((k) => String(a! * k).length);
        expect(
          new Set(digits).size,
          `${where} — 자릿수가 갈린다(그 성질로 잘리므로 심화중이다)`,
        ).toBe(1);
        if (threeByOne) {
          const cs = ks.map((k) => carries3x1(a!, k));
          expect(
            new Set(cs).size,
            `${where} — 올림이 갈린다(그 성질로 잘리므로 심화중이다)`,
          ).toBe(1);
        }
        // 곱의 크기로만 하나가 남는다.
        const [T1, T2] = range!;
        const survivors = ks.filter((k) => inRange(a! * k, T1, T2));
        expect(survivors, `${where} — 범위가 남긴 후보`).toEqual([
          answerOf(p.answer),
        ]);
        judged += 1;
      }
    }
    expect(judged, "한 문항도 안 읽었다").toBe(2 * SEEDS.length);
  });

  /**
   * 🔴 **알맹이 ⑶ — 반증 ④ 뒤집힘 필터.** 양성 대조군(연산·기본·응용)과
   * 음성 대조군(심화 셋)이 **한 시험 안에** 있다. 양성이 무너지면 이 자가
   * 「되짚기를 못 재는 것」이고, 음성이 무너지면 그 문항이 순방향이다.
   */
  it("반증 ④ — 연산·기본·응용은 순방향으로 답이 나오고, 심화 셋은 안 나온다", () => {
    const forwardHits: string[] = [];
    const reverseMiss: string[] = [];
    for (const code of MUL21) {
      for (const tier of supportedTiers(unitOf(code))) {
        let forward = 0;
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          if (forwardReaches(p.content, answerOf(p.answer))) forward += 1;
        }
        const mine = tier === "심화중" || tier === "심화상";
        const core = !tier.startsWith("심화");
        if (core && forward < SEEDS.length)
          forwardHits.push(
            `${code} ${tier}: 순방향 도달 ${forward}/${SEEDS.length}`,
          );
        // ⚠️ **심화하는 0 을 요구하지 않는다.** 기준선이라 내 손이 안 닿는 데다,
        //    수가 셋이면 «우연히» 맞는 조합이 생긴다(실측 2-1-2 심화하 1/24 —
        //    그 문항은 되짚기가 맞고 순방향 조합이 우연히 같은 값을 냈다).
        //    **내가 채운 두 갈래는 0 이어야 한다** — 거기서 우연이 나오면 그건
        //    발문이 순방향으로도 풀린다는 뜻이라 반증 ⑥ 이다.
        if (mine && forward > 0)
          reverseMiss.push(`${code} ${tier}: 순방향으로 ${forward}건이 풀린다`);
        if (tier === "심화하" && forward > SEEDS.length / 4)
          reverseMiss.push(
            `${code} 심화하: 순방향 ${forward}/${SEEDS.length} — 우연이라기엔 너무 많다`,
          );
      }
    }
    // 양성 — 이 줄이 빨개지면 이 자가 «순방향»을 못 읽는 것이다(음성의 0이 뜻을 잃는다).
    expect(forwardHits, "연산·기본·응용이 순방향으로 안 풀린다").toEqual([]);
    // 음성 — 되짚기 갈래가 순방향으로 풀리면 그건 중·상이 아니다(반증 6).
    expect(reverseMiss, "심화 갈래가 순방향으로 풀린다").toEqual([]);
  });

  /**
   * 🔴 **알맹이 ⑷ — 2-1-4 심화하 해설이 답에 이른다** (리드 지적).
   * 옛 해설은 「십의 자리 숫자가 클수록 곱이 큽니다」로 접어 `87×92` 와 `82×97` 을
   * 안 갈랐다(씨앗 0~299 전량). 이제 남은 두 배치를 **실제로 곱해 견주어야** 한다.
   */
  it("2-1-4 심화하 — 해설이 남은 두 배치를 곱해 견주고 그 답에 이른다", () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const p = generateElementaryProblem(unitOf("2-1-4"), seed, "심화하");
      const where = `2-1-4 심화하 seed ${seed}`;
      const steps = [
        ...p.solution.matchAll(/\$(\d+)\\times(\d+)=(\d+)\$/g),
      ].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
      // 두 배치를 견준다 — 하나만 찍으면 「접었다」는 옛 결함 그대로다.
      expect(steps.length, `${where}: 견준 곱이 둘이 아니다`).toBe(2);
      for (const [x, y, z] of steps)
        expect(x * y, `${where}: ${x}×${y}`).toBe(z);
      expect(
        steps[0]![2] !== steps[1]![2],
        `${where}: 두 배치의 곱이 같아 견줄 것이 없다`,
      ).toBe(true);
      // 정답이 그 둘 중 하나이고, 카드 전수 비교의 최댓값·최솟값과 같다.
      const ans = answerOf(p.answer);
      expect(
        [steps[0]![2], steps[1]![2]],
        `${where}: 정답이 견준 두 곱 안에 없다 — 해설이 답에 이르지 못한다`,
      ).toContain(ans);
      const cards = nums(p.content);
      expect(cards.length, `${where}: 카드가 넷이 아니다`).toBe(4);
      const askBig = /가장 큰|가장 클 때|가장 크게/.test(p.content);
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
      expect(ans, `${where}: 전수 비교와 다르다`).toBe(best);
    }
  });

  /**
   * 리드가 짚은 「해설이 접었다」의 **근거를 여기 못 박는다** — 카드 넉 장에서
   * 「십의 자리에 큰(작은) 두 수」로 좁힌 뒤에도 **배치가 둘 남고 그 곱이 서로 다르다.**
   * 126가지 조합 전량에서 그렇다 = 그 성질만으로는 절대 답에 못 이른다.
   * (이 수치가 `.tmp-orca` 에만 있으면 근거가 아니다 — 시험 안에 둔다.)
   */
  it("카드 넉 장은 성질로 좁혀도 늘 두 배치가 남는다 — 126가지 전량", () => {
    let combos = 0;
    let ruleFinishes = 0;
    const badMax: string[] = [];
    const badMin: string[] = [];
    for (let a = 1; a <= 9; a += 1)
      for (let b = a + 1; b <= 9; b += 1)
        for (let c = b + 1; c <= 9; c += 1)
          for (let d = c + 1; d <= 9; d += 1) {
            combos += 1;
            const cards = [a, b, c, d];
            const [d1, d2, d3, d4] = [...cards].sort((x, y) => y - x) as [
              number,
              number,
              number,
              number,
            ];
            let max = -1;
            let min = Number.MAX_SAFE_INTEGER;
            for (let i = 0; i < 4; i += 1)
              for (let j = 0; j < 4; j += 1)
                for (let k = 0; k < 4; k += 1)
                  for (let l = 0; l < 4; l += 1) {
                    if (new Set([i, j, k, l]).size !== 4) continue;
                    const v =
                      (cards[i]! * 10 + cards[j]!) *
                      (cards[k]! * 10 + cards[l]!);
                    if (v > max) max = v;
                    if (v < min) min = v;
                  }
            const mA = (d1 * 10 + d3) * (d2 * 10 + d4);
            const mB = (d1 * 10 + d4) * (d2 * 10 + d3);
            const nA = (d4 * 10 + d1) * (d3 * 10 + d2);
            const nB = (d4 * 10 + d2) * (d3 * 10 + d1);
            if (Math.max(mA, mB) !== max) badMax.push(cards.join(""));
            if (Math.min(nA, nB) !== min) badMin.push(cards.join(""));
            if (mA === mB || nA === nB) ruleFinishes += 1;
          }
    expect(combos, "조합을 하나도 안 봤다").toBe(126);
    expect(badMax, "성질로 좁힌 둘 안에 최대 곱이 없는 조합").toEqual([]);
    expect(badMin, "성질로 좁힌 둘 안에 최소 곱이 없는 조합").toEqual([]);
    expect(
      ruleFinishes,
      "성질만으로 끝나는(두 배치의 곱이 같은) 조합 — 하나라도 있으면 해설이 그때는 접어도 된다",
    ).toBe(0);
  });

  it("두 갈래 모두 씨앗에 따라 답이 갈린다 — 상수답 금지", () => {
    for (const code of MUL21) {
      for (const tier of supportedTiers(unitOf(code)).filter((t) =>
        ["심화중", "심화상"].includes(t),
      )) {
        const seen = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1)
          seen.add(generateElementaryProblem(unitOf(code), seed, tier).answer);
        expect(seen.size, `${code} ${tier} 상수답`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
