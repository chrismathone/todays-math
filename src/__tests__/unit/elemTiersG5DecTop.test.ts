/**
 * **초5 2-4 소수의 곱셈 — 확대 갈래 «심화중»·«심화상» (D-113, 되짚기 축).**
 *
 * 🔴 **이 파일의 첫 판은 «열거 축»을 잠갔고, 그 축은 기각됐다.** 리드가 문형 전량
 *    (6,900행)에 두 축을 대 보니 열거는 갈래를 1.5~2배밖에 안 가르고 되짚기는
 *    22~40배 가른다. 그래서 잠그는 것을 통째로 바꿨다 — **옛 축의 시험은 지웠다.**
 *    (남겨 두면 다음 사람이 「두 축 다 지킨다」고 읽는다.)
 *
 * ## 확정 잣대와, 이 시험이 그중 **무엇을** 잠그나
 *
 * ```
 * 심화하  마디마다 값이 하나로 굳는다                     ← 안 건드림
 * 심화중  굳지 않는 마디가 하나, **소단원의 성질**이 굳힌다   ← ⑴⑵⑶
 * 심화상  성질로도 안 굳어 **만들어 견주어야** 하나가 남고,
 *         그 후보를 **발문이 주지 않고 되짚기가 만든다**      ← ⑷⑸⑹
 * ```
 *
 * ⑴ **되짚기가 실제로 갈라진다** — 발문이 방향을 안 말하므로 원래 수 후보가 **둘**이고,
 *    그중 **정확히 하나**만 소단원의 성질을 만족한다. 시험이 두 후보를 직접 만들어 센다.
 * ⑵ **방향을 발문이 말하지 않는다** — 말하면 마디가 굳어 심화하가 된다.
 * ⑶ **값 검산** — 잘못 쓴 값과 바른 값이 지면의 수로 다시 선다.
 * ⑷ **창이 하나만 남기지 않는다** — 조건에 드는 후보가 둘 이상이라, 창만 보고는 못 풀고
 *    **인수 되짚기로** 갈라야 답이 나온다. 이것이 심화상을 심화중 위에 세우는 축이다.
 * ⑸ **후보를 발문이 주지 않는다** — 미끼는 곱을 만들지 못한다(시험이 직접 확인).
 * ⑹ **반증 ⑥** — 발문의 수에 순방향 곱셈만으로 답이 나오지 않는다.
 *    규칙은 제품 모듈(`forwardReach.ts`) 하나를 쓴다 — 옮겨 적지 않는다.
 *
 * ## 🔴 이 시험이 **못 보는 것**
 *
 * · **「어려운가」 자체.** 난이도는 지면에 없다(`probe-elem-tier-ladder.ts` ㉡-b).
 *   높이는 원장님이 `/dev/tier-bench/g5` 에서 보신다.
 * · **「마디가 굳는가」를 사람처럼은 못 잰다.** ⑴ 은 «성질을 만족하는 후보가 하나»를
 *   세는 것이지, 학생이 그 성질을 실제로 써야 하는지는 못 본다.
 * · **해설이 무엇을 시키는지**는 안 본다. 리드가 짚은 초3 2-1-4 처럼 «생성기는 전수,
 *   해설은 한 줄»인 부류는 여기서 안 걸린다 — 사람이 네 갈래를 나란히 봐야 한다.
 * · **지면(문형) 경로.** 갈래만 봤다. 적재본에는 한 건도 안 나간다.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  forwardReachable,
  pageNumbers,
  rat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { countCalcSteps } from "@/lib/elementary/make";
import { renderMathHtml } from "@/lib/math/renderMathHtml";

import { tiersOf } from "../helpers/elemTiers";

const CODES = [
  "2-4-1",
  "2-4-2",
  "2-4-3",
  "2-4-4",
  "2-4-5",
  "2-4-6",
  "2-4-7",
] as const;

const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(code),
  )!;

const problem = (code: string, tier: ElemTier, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier);

/* ── 시험이 쓰는 자 — 정수 스케일로만 (부동소수 금지) ─────────────────────── */

type S = [number, number];
const q = ([v, d]: S): number => v * (100000 / 10 ** d);
const mulS = (a: S, b: S): S => [a[0] * b[0], a[1] + b[1]];

function readDec(tok: string): S | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(tok.trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  return [Number(m[1] + frac), frac.length];
}

/** 꼬리 0 을 접은 뒤 남는 소수 자릿수. */
function places([v, d]: S): number {
  let val = v;
  let dp = d;
  while (dp > 0 && val % 10 === 0) {
    val /= 10;
    dp -= 1;
  }
  return dp;
}

function text([v, d]: S): string {
  let val = v;
  let dp = d;
  while (dp > 0 && val % 10 === 0) {
    val /= 10;
    dp -= 1;
  }
  return dp === 0 ? String(val) : (val / 10 ** dp).toFixed(dp);
}

const answerOf = (a: string, label: string): S => {
  const m = /^\$(\d+(?:\.\d+)?)\$$/.exec(a);
  expect(m, `${label}: 수 답이 아니다 — ${a}`).not.toBeNull();
  return readDec(m![1]!)!;
};

/** 소단원 이름이 내건 «어떤 수»의 성질. 참을 **교육과정 SSOT** 에서 뽑는다. */
function propertyOf(section: string): ((v: S) => boolean) | null {
  if (/곱의 소수점의 위치/.test(section)) return (v) => places(v) === 2;
  const m = /\((1보다 [작크]ㄴ? ?소수|1보다 작은 소수|1보다 큰 소수)\)/.exec(
    section,
  );
  if (/1보다 작은 소수/.test(section) && !/1보다 큰 소수/.test(section))
    return (v) => places(v) === 1 && q(v) > 0 && q(v) < q([1, 0]);
  if (/1보다 큰 소수/.test(section) && !/1보다 작은 소수/.test(section))
    return (v) => places(v) === 1 && q(v) > q([1, 0]);
  void m;
  return null;
}

/* ── 심화중 — 「소수점을 한 자리 잘못 옮겼다」 ───────────────────────────── */

type MidRead = { k: S; product: S } | null;

/** 발문에서 «곱하는 수»와 «잘못 계산한 값»을 읽는다. */
function readMid(content: string): MidRead {
  const m =
    /어떤 수에 \$([\d.]+)\$[을를] 곱해야 할 것을.*?곱했더니 \$([\d.]+)\$/.exec(
      content,
    ) ??
    /\$([\d.]+)\$에 어떤 수를 곱해야 할 것을.*?곱했더니 \$([\d.]+)\$/.exec(
      content,
    );
  if (!m) return null;
  const k = readDec(m[1]!);
  const product = readDec(m[2]!);
  return k && product ? { k, product } : null;
}

describe("[초5 2-4 확대] 심화중 — 「굳지 않는 마디를 소단원의 성질이 굳힌다」", () => {
  it("일곱 소단원 모두 여섯 갈래가 등록돼 있다", () => {
    for (const code of CODES) {
      expect(tiersOf(unitOf(code)), code).toEqual([
        "연산",
        "기본",
        "응용",
        "심화하",
        "심화중",
        "심화상",
      ]);
    }
  });

  it("🔴 되짚기 후보가 **둘**이고, 성질을 만족하는 것은 **하나**뿐이다", () => {
    let checked = 0;
    for (const code of CODES) {
      const holds = propertyOf(unitOf(code).section);
      expect(holds, `${code}: 소단원 이름에서 성질을 못 읽었다`).not.toBeNull();
      for (const seed of SEEDS) {
        const p = problem(code, "심화중", seed);
        const read = readMid(p.content);
        expect(
          read,
          `${code} @${seed} 발문을 못 읽었다\n${p.content}`,
        ).not.toBeNull();
        const { k, product } = read!;
        const answer = answerOf(p.answer, `${code} 심화중 @${seed}`);

        // 되짚기 ① — 잘못 쓴 수는 하나로 굳는다: wrong × k = product
        // 곱셈으로만 확인한다(나눗셈은 이 학년 밖이다).
        const wrongs: S[] = [];
        for (let v = 1; v <= 9999; v += 1) {
          for (let d = 0; d <= 4; d += 1) {
            const cand: S = [v, d];
            if (q(mulS(cand, k)) === q(product)) wrongs.push(cand);
          }
        }
        const wrong = wrongs.find((w) => places(w) >= 0);
        expect(wrong, `${code} @${seed} 잘못 쓴 수를 못 찾았다`).toBeDefined();

        // 되짚기 ② — 소수점을 한 자리 옮긴 **두** 후보. 방향은 발문에 없다.
        const cands: S[] = [
          [wrong![0], wrong![1] - 1],
          [wrong![0], wrong![1] + 1],
        ].map(([v, d]) => {
          let val = v;
          let dp = d;
          while (dp < 0) {
            val *= 10;
            dp += 1;
          }
          return [val, dp] as S;
        });
        const fit = cands.filter((c) => holds!(c));
        expect(
          fit.length,
          `${code} 심화중 @${seed} 성질을 만족하는 후보가 ${fit.length}개다 — ` +
            `하나여야 마디가 «굳는다»\n${p.content}`,
        ).toBe(1);

        // ⑶ 값 검산 — 바른 값이 그 후보로 다시 선다.
        expect(
          text(mulS(fit[0]!, k)),
          `${code} 심화중 @${seed}\n${p.content}`,
        ).toBe(text(answer));
        checked += 1;
      }
    }
    expect(checked).toBe(CODES.length * SEEDS.length);
  });

  it("⑵ 발문이 **방향을 말하지 않는다** — 말하면 마디가 굳어 심화하가 된다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const c = problem(code, "심화중", seed).content;
        expect(c, `${code} @${seed}`).toContain("한 자리 잘못 옮긴");
        expect(
          /(오른쪽|왼쪽)으로/.test(c),
          `${code} 심화중 @${seed} 발문이 옮긴 방향을 말한다 — 되짚기가 굳는다\n${c}`,
        ).toBe(false);
      }
    }
  });
});

/* ── 심화상 — 「만들어 견주어야 하나가 남는다」 ──────────────────────────── */

type TopRead = { product: S; probe: S; lo: S; hi: S } | null;

function readTop(content: string): TopRead {
  const p = /곱했더니 \$([\d.]+)\$[이가] 되었습니다/.exec(content);
  const w = /\$([\d.]+)\$보다 크고 \$([\d.]+)\$보다 작을 때/.exec(content);
  const pr =
    /\$([\d.]+)\$[과와] .*?를 곱한 값/.exec(content) ??
    /와 \$([\d.]+)\$[을를] 곱한 값/.exec(content);
  if (!p || !w || !pr) return null;
  const product = readDec(p[1]!);
  const lo = readDec(w[1]!);
  const hi = readDec(w[2]!);
  const probe = readDec(pr[1]!);
  return product && lo && hi && probe ? { product, probe, lo, hi } : null;
}

describe("[초5 2-4 확대] 심화상 — 「창만으로는 못 풀고 되짚기로 갈라야 한다」", () => {
  it("🔴 조건 창에 드는 후보가 **둘 이상**이고, 곱을 만드는 것은 **하나**뿐이다", () => {
    // 이것이 심화상을 심화중 위에 세우는 유일한 반증 가능한 문장이다.
    // 창이 하나만 남기면 학생이 창만 보고 답을 얻어 되짚기가 장식이 된다.
    let checked = 0;
    for (const code of CODES) {
      if (code === "2-4-7") continue; // 2-4-7 은 꼴이 달라 아래에서 따로 본다
      const holdsDec = propertyOf(unitOf(code).section);
      expect(holdsDec, `${code}: 성질을 못 읽었다`).not.toBeNull();
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        const read = readTop(p.content);
        expect(
          read,
          `${code} @${seed} 발문을 못 읽었다\n${p.content}`,
        ).not.toBeNull();
        const { product, probe, lo, hi } = read!;

        // 창에 드는 후보를 **시험이 직접** 만든다.
        // ⚠️ **어느 후보 줄인지는 발문이 말한다** — 「그 자연수」면 자연수, 「두 소수 중
        //    하나」면 소수다. 첫 판은 둘을 섞어 두어 «짝이 둘»이라는 **거짓 빨강**이
        //    났다(2-4-2 @202: 소수 $2.6$ 이 자연수 자리에 섞여 들었다).
        const naturals: S[] = [];
        for (let v = 2; v <= 9; v += 1) naturals.push([v, 0]);
        const decs: S[] = [];
        for (let v = 1; v <= 49; v += 1) {
          const cand: S = [v, 1];
          if (holdsDec!(cand)) decs.push(cand);
        }
        const winPool = /그 자연수/.test(p.content) ? naturals : decs;
        const pool = decs;
        const inWindow = winPool.filter((o) => {
          const val = q(mulS(probe, o));
          return val > q(lo) && val < q(hi);
        });
        expect(
          inWindow.length,
          `${code} 심화상 @${seed} 창에 드는 후보가 ${inWindow.length}개다 — ` +
            `둘 이상이어야 되짚기가 필요하다\n${p.content}`,
        ).toBeGreaterThanOrEqual(2);

        // 그중 곱을 만드는 짝이 정확히 하나 — 그 짝의 다른 인수가 답이다.
        const partners = inWindow
          .map((o) => {
            const hit = pool.find(
              (d) => places(d) >= 1 && q(mulS(d, o)) === q(product),
            );
            return hit ? { o, d: hit } : null;
          })
          .filter((x): x is { o: S; d: S } => x !== null);
        expect(
          partners.length,
          `${code} 심화상 @${seed} 곱을 만드는 짝이 ${partners.length}개다\n${p.content}`,
        ).toBe(1);
        expect(
          text(partners[0]!.d),
          `${code} 심화상 @${seed}\n${p.content}`,
        ).toBe(text(answerOf(p.answer, `${code} @${seed}`)));
        checked += 1;
      }
    }
    expect(checked).toBe((CODES.length - 1) * SEEDS.length);
  });

  it("2-4-7 은 **두 후보를 다 계산해 봐야** 갈린다 (자리 옮기기가 판정에 든다)", () => {
    for (const seed of SEEDS) {
      const p = problem("2-4-7", "심화상", seed);
      const two =
        /어떤 소수에 \$(\d+)\$ 또는 \$(\d+)\$[을를] 곱했더니 \$([\d.]+)\$/.exec(
          p.content,
        );
      expect(two, `2-4-7 @${seed}\n${p.content}`).not.toBeNull();
      const cut = /\$([\d.]+)\$보다 (작을|클) 때/.exec(p.content)!;
      const probe = /어떤 소수에 \$([\d.]+)\$[을를] 곱한 값/.exec(p.content)!;
      const [a, b] = [Number(two![1]), Number(two![2])];
      const product = readDec(two![3]!)!;
      // 두 후보 — 곱을 각각 되짚는다(곱셈으로만 확인).
      // ⚠️ `[87,1]` 과 `[870,2]` 는 **같은 수**다(8.7). 표기로 세면 후보가 부풀어
      //    «넷»이라는 거짓 빨강이 난다 — 첫 판이 그랬다. 값으로 접어서 센다.
      const seen = new Set<number>();
      const cands: S[] = [];
      for (let v = 1; v <= 999; v += 1)
        for (let d = 1; d <= 3; d += 1) {
          const c: S = [v, d];
          if (
            q(mulS(c, [a, 0])) !== q(product) &&
            q(mulS(c, [b, 0])) !== q(product)
          )
            continue;
          if (seen.has(q(c))) continue;
          seen.add(q(c));
          cands.push(c);
        }
      expect(
        cands.length,
        `2-4-7 심화상 @${seed} 후보가 ${cands.length}개다 — 둘이어야 한다\n${p.content}`,
      ).toBe(2);
      const m = readDec(probe[1]!)!;
      const bound = readDec(cut[1]!)!;
      const keep = cands.filter((c) =>
        cut[2] === "작을" ? q(mulS(c, m)) < q(bound) : q(mulS(c, m)) > q(bound),
      );
      expect(
        keep.length,
        `2-4-7 심화상 @${seed} 조건이 ${keep.length}개를 남긴다\n${p.content}`,
      ).toBe(1);
      expect(text(keep[0]!), `2-4-7 @${seed}\n${p.content}`).toBe(
        text(answerOf(p.answer, `2-4-7 @${seed}`)),
      );
    }
  });
});

/* ── 반증 ⑥ · 지면 · 사다리 ──────────────────────────────────────────────── */

describe("[초5 2-4 확대] 반증문과 지면", () => {
  it("⑥ 발문의 수에 **순방향 곱셈만으로** 답이 나오지 않는다", () => {
    // 규칙은 제품 모듈 하나를 쓴다 — 옮겨 적으면 두 벌이 되어 한쪽만 고쳐도 모른다.
    for (const code of CODES) {
      for (const tier of ["심화중", "심화상"] as const) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const m = /^\$(\d+(?:\.\d+)?)\$$/.exec(p.answer)!;
          const [w, f = ""] = m[1]!.split(".");
          expect(
            forwardReachable(
              pageNumbers(p.content),
              rat(Number(w! + f), 10 ** f.length),
            ),
            `${code} ${tier} @${seed} 순방향으로 풀린다 — 되짚기가 아니다\n${p.content}`,
          ).toBe(false);
        }
      }
    }
  });

  it("⑥ 의 자가 **«예»도 낼 수 있다** — 연산·기본·응용은 순방향으로 닿는다 (음성 대조)", () => {
    // 위 검사가 전량 초록인 것이 «깨끗»인지 «못 셈»인지 갈라야 한다.
    let looked = 0;
    for (const code of CODES) {
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS.slice(0, 8)) {
          const p = problem(code, tier, seed);
          const m = /^\$(\d+(?:\.\d+)?)\$$/.exec(p.answer);
          if (!m) continue;
          const [w, f = ""] = m[1]!.split(".");
          expect(
            forwardReachable(
              pageNumbers(p.content),
              rat(Number(w! + f), 10 ** f.length),
            ),
            `${code} ${tier} @${seed} 가 순방향으로 안 닿는다 — 반증 ④ 후보다\n${p.content}`,
          ).toBe(true);
          looked += 1;
        }
      }
    }
    expect(looked, "음성 대조를 하나도 못 했다").toBeGreaterThan(100);
  });

  it("지면이 성하다 — 날 LaTeX 이 안 나간다", () => {
    // ⚠️ `renderMathHtml` 은 「katex-error 를 절대 포함하지 않는다」고 스스로 적어
    //    두었다 — 실패는 `.math-raw` **중립 폴백**으로 온다(2026-08-30 실측).
    const fails = (h: string) =>
      h.includes("katex-error") ||
      /color:\s*#cc0000/i.test(h) ||
      h.includes("math-raw");
    expect(fails(renderMathHtml("$\\notacommand{3}$")), "검출기가 죽었다").toBe(
      true,
    );
    expect(fails(renderMathHtml("$0.3\\times68=20.4$")), "거짓 경보").toBe(
      false,
    );
    for (const code of CODES) {
      for (const tier of ["심화중", "심화상"] as const) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          expect(
            fails(renderMathHtml(`${p.content} ${p.answer} ${p.solution}`)),
            `${code} ${tier} @${seed}\n${p.content}`,
          ).toBe(false);
        }
      }
    }
  });

  it("사다리 — 두 갈래의 해설 계산 걸음이 같은 씨앗의 «심화하»보다 많다", () => {
    // ⚠️ 이 자는 **심화중과 심화상을 서로 가르지 못한다**. 둘 사이의 축은 위
    //    「창이 둘 이상」이고, 여기는 심화하와의 층만 잠근다.
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const low = countCalcSteps(problem(code, "심화하", seed).solution);
        for (const tier of ["심화중", "심화상"] as const) {
          expect(
            countCalcSteps(problem(code, tier, seed).solution),
            `${code} ${tier} @${seed} 가 심화하(${low})보다 걸음이 많지 않다`,
          ).toBeGreaterThan(low);
        }
      }
    }
  });
});
