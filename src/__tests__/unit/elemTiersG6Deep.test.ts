/**
 * 초6 `2-2 소수의 나눗셈` — **확대 갈래 심화중·심화상** (D-113, 잣대 확정 2026-08-30).
 *
 * ## 축 — **되짚기 사슬의 «굳지 않는 마디»**
 *
 * 처음에는 **열거**(「모두 구하시오」·「몇 가지」)를 축으로 썼는데 **기각됐다.** 리드가
 * 문형 전량 6,900행으로 두 축을 견주니 열거는 갈래를 1.5~2배밖에 안 가르고, 심화하
 * **안에서** 걸음을 재니 열거형이 평균 0.39걸음으로 **그 소단원의 «연산»(0.79)보다도
 * 얕았다.** 되짚기 축은 22~40배 가른다. 그래서 이 파일도 통째로 다시 썼다.
 *
 *   심화하 (안 건드림) — 되짚기 사슬의 **마디마다 값이 하나로 굳는다**
 *   심화중            — 굳지 않는 마디가 **하나**, 그 소단원 성질과 조건이 굳혀 준다
 *   심화상            — 성질만으론 못 굳혀, **되짚기가 만든 후보**를 실제로 계산해
 *                       견주어야 하나가 남는다 (후보를 발문이 주지 않는다)
 *
 * ## 무엇을 잠그나 — **셋 다 지면에서 되짚기를 다시 밟는다**
 *
 * **㉠ 값** — 발문이 말하는 조건을 이 시험이 **다시 풀어** 답과 견준다. 엔진의 풀·계산을
 *    안 부르므로 동어반복이 아니다. 「$A$ 의 배수 중 범위 안의 것」·「반올림 구간의
 *    자연수」·「$a$ 로 나눈 나머지가 $r$ 인 수」를 **여기서 다시 만든다.**
 *
 * **㉡ 마디가 정말 안 굳나 (심화중·심화상의 정의)** — 그 조건이 후보를 **둘 이상**
 *    만들어야 한다. 하나만 만들면 마디가 굳은 것이고 그건 **심화하**다(반증 ①).
 *
 * **㉢ 답이 하나인가 (반증 ⑤)** — 새 잣대의 답은 전부 **하나**다. 답이 여럿이면 그것은
 *    열거 문형이고, 「모두 구하시오」를 지워도 답이 그대로면 열거는 등급의 근거가 아니다.
 *
 * **㉣ 순방향 한 걸음으로 답이 나오나 (반증 ⑥)** — 발문의 두 수를 한 번 곱하거나 나눠서
 *    답이 나오면 중·상이 아니다. 심화상은 **둘째 조건을 지워도 답이 그대로면** 안 된다
 *    (그러면 심화중과 같은 층이다).
 *
 * **㉤ 반증 ④ — 뒤집힘 필터.** 같은 소단원의 **연산·기본·응용**에 이 잣대를 대면
 *    **통과가 나오면 안 된다.** 나오면 그 소단원에서는 이 축이 난이도를 안 가르므로
 *    확대 갈래를 **비워야** 한다.
 *
 * ## 🔴 못 보는 것
 *
 * · **「굳지 않는다」를 이 시험이 «후보 수»로 잰다.** 사람이 읽는 「생각이 몇 번
 *   필요한가」는 못 잰다 — 후보가 둘이어도 학생이 한눈에 고를 수 있으면 얕다.
 * · **해설이 무엇을 시키는지는 못 잰다.** 리드가 초3 2-1-4 에서 짚은 자리다 —
 *   생성기가 전수 탐색을 해도 해설이 한 줄로 접으면 학생 경로는 얕다. 이 파일은
 *   **발문과 답**을 본다. 해설의 깊이는 사람이 `/dev/tier-bench/g6` 에서 본다.
 * · **심화상이 심화중보다 «어려운가»는 못 잰다.** 재는 것은 「굳히는 데 후보를 실제로
 *   만들어 견주어야 하는가」라는 **구조**뿐이다.
 * · **문형(`FORMS`) 경로는 안 본다** — 이 갈래는 적재본에 안 나간다(D-113 파일럿 범위).
 * · 값·구간을 재는 것은 여기 한 곳뿐이다. `elemTiersG6.test.ts` 는 확대 갈래를
 *   **세어서 건너뛴다** — 두 벌을 두면 한쪽만 고쳐도 아무도 모른다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const CODES = ["2-2-1", "2-2-2", "2-2-3", "2-2-4", "2-2-5"] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => i * 31 + 11);

const unitOf = (code: string) => {
  const u = elementaryUnits().find(
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원`).toBeTruthy();
  return u!;
};

// ── 지면에서 수를 읽는 자 — 엔진을 안 부른다 ──────────────────────────────
// 글자로 세므로 `0.30` 은 dp=2 다(수로 읽으면 0.3 이 되어 자릿수가 사라진다).

type Dec = { scaled: number; dp: number };

function decOf(tok: string): Dec | null {
  const m = tok.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  return { scaled: Number(`${m[1]}${frac}`), dp: frac.length };
}

/** `$…$` 안의 수를 **차례대로**. 단위·연산자·`\square` 는 수가 아니다. */
function decsIn(text: string): Dec[] {
  const out: Dec[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!|\\%/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .replace(/\\div|\\times|\\square|\\ldots|=/g, " ")
      .trim();
    for (const piece of tok.split(/\s+/)) {
      const v = decOf(piece);
      if (v) out.push(v);
    }
  }
  return out;
}

/** 지면에 적힌 그대로의 글자 — 답을 **글자로** 견주려고 쓴다. */
const show = (d: Dec) =>
  d.dp === 0
    ? String(d.scaled)
    : `${Math.trunc(d.scaled / 10 ** d.dp)}.${String(d.scaled % 10 ** d.dp).padStart(d.dp, "0")}`;

/** 답에 실린 `$…$` 값들 — 하나여야 한다(㉢). */
const answerDecs = (answer: string) =>
  [...answer.matchAll(/\$([^$]*)\$/g)]
    .map((m) =>
      decOf(
        m[1]!
          .replace(/\\,|\\;|\\!/g, "")
          .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
          .trim(),
      ),
    )
    .filter((v): v is Dec => v !== null);

/** 정수 나눗셈으로 **소수 첫째 자리까지 반올림** — 부동소수를 안 거친다. */
const round1 = (n: number, b: number) => {
  const s = n * 10;
  return Math.floor(s / b) + ((s % b) * 2 >= b ? 1 : 0);
};

/**
 * 발문의 두 수를 **한 번 곱하거나 나눠서** 답이 나오는가 (㉣ · 반증 ⑥).
 *
 * ⚠️ `+`·`-` 는 **일부러 뺐다.** 넣으면 우연 일치가 난다(실측: `4.5-2=2.5` 가 하필
 * 두 걸음짜리 답과 같았다). 이 대단원이 실제로 쓰는 연산만 본다.
 */
function oneStepAway(page: Dec[], want: Dec): string | null {
  const w = want.scaled / 10 ** want.dp;
  const eq = (x: number) => Math.abs(x - w) < 1e-9;
  for (const a of page)
    for (const b of page) {
      if (a === b) continue;
      const av = a.scaled / 10 ** a.dp;
      const bv = b.scaled / 10 ** b.dp;
      if (eq(av * bv)) return `${show(a)}×${show(b)}`;
      if (bv !== 0 && eq(av / bv)) return `${show(a)}÷${show(b)}`;
    }
  return null;
}

/**
 * 🔴 **되짚기를 지면에서 다시 밟는다.**
 *
 * `first` — 첫 조건이 만드는 **후보**(굳지 않는 마디). 둘 이상이어야 심화하가 아니다.
 * `final` — 둘째 조건(심화상)이나 「가장 큰/적은」(심화중)까지 걸러 **하나** 남은 것.
 *
 * 후보를 만드는 규칙은 **발문의 낱말**로 고른다 — 엔진의 어느 함수도 안 부른다.
 */
function retrace(
  code: string,
  content: string,
): { first: string[]; final: string[]; window: number } | null {
  const ds = decsIn(content);

  // ── 2-2-1·2-2-2·2-2-3 — 「$A$ 로 나눈 몫이 …」가 어떤 수를 **배수열**로 묶는다 ──
  if (code === "2-2-1" || code === "2-2-2" || code === "2-2-3") {
    const two = /나눈 몫도/.test(content); // 심화상은 나눗셈 조건이 둘이다
    if (ds.length !== (two ? 4 : 3)) return null;
    const a = ds[0]!;
    const b = two ? ds[1]! : null;
    const lo = ds[two ? 2 : 1]!;
    const up = ds[two ? 3 : 2]!;
    // 전부 ×100 정수로 옮겨 **정수 곱셈으로만** 견준다(부동소수를 안 거친다).
    const c100 = (d: Dec) => d.scaled * 10 ** (2 - d.dp);
    const a100 = c100(a);
    const b100 = b ? c100(b) : 0;
    // 몫의 해상도 — 발문이 말한다. 「자연수」면 1, 「소수 한 자리 수」면 0.1.
    const qStep = /몫이 자연수|몫도 자연수/.test(content) ? 100 : 10;
    // 어떤 수의 해상도 — 소단원이 정한다.
    const xMod = code === "2-2-3" ? 100 : code === "2-2-1" ? 10 : 1;
    const twoDp = code === "2-2-2"; // 「소수 두 자리 수」라고 발문이 못 박는다
    const inRange = (x100: number) => x100 > c100(lo) && x100 < c100(up);
    const okShape = (x100: number) =>
      x100 % xMod === 0 && (!twoDp || x100 % 10 !== 0);
    // 범위 «만»으로 남는 값 — 이것이 둘 이상이어야 소단원 성질이 일을 한다(㉡).
    let window = 0;
    for (let x = c100(lo) + 1; x < c100(up); x += 1)
      if (okShape(x)) window += 1;
    const first: string[] = [];
    for (let j = 1; ; j += 1) {
      const x100 = (a100 * (j * qStep)) / 100;
      if (x100 >= c100(up)) break;
      if (!Number.isInteger(x100) || !inRange(x100) || !okShape(x100)) continue;
      first.push(show({ scaled: x100, dp: 2 }).replace(/\.?0+$/, "") || "0");
    }
    const asDec = (t: string) => decOf(t)!;
    const final = b
      ? first.filter((t) => {
          const x100 = c100(asDec(t));
          return qStep === 100 ? x100 % b100 === 0 : (x100 * 10) % b100 === 0;
        })
      : first;
    return { first, final, window };
  }

  // ── 2-2-4 — 반올림한 값 하나가 **구간**을 가리킨다 ──
  if (code === "2-2-4") {
    const midHead = content.match(/\$\\square\\div(\d+)\$/);
    const heads = [
      ...content.matchAll(/\$(\d+)\$(?:로|으로) 나눈 몫을 반올림/g),
    ].map((m) => Number(m[1]));
    const rs = [...content.matchAll(/나타내면 \$(\d+)\.(\d)\$/g)].map((m) =>
      Number(`${m[1]}${m[2]}`),
    );
    const b1 = midHead ? Number(midHead[1]) : heads[0];
    if (b1 === undefined || !Number.isFinite(b1) || rs.length === 0)
      return null;
    const lo100 = (rs[0]! * 10 - 5) * b1;
    const hi100 = (rs[0]! * 10 + 5) * b1;
    const ns: number[] = [];
    for (let n = Math.ceil(lo100 / 100); n * 100 < hi100; n += 1)
      if (n * 100 >= lo100) ns.push(n);
    if (midHead) {
      // 심화중 — 「가장 큰 자연수」가 하나를 고른다
      return {
        first: ns.map(String),
        final: ns.length > 0 ? [String(ns[ns.length - 1])] : [],
        window: ns.length,
      };
    }
    // 심화상 — 둘째 반올림을 각 후보에 실제로 해 본다
    const b2 = heads[1];
    if (b2 === undefined || rs.length < 2) return null;
    return {
      first: ns.map(String),
      final: ns.filter((n) => round1(n, b2) === rs[1]!).map(String),
      window: ns.length,
    };
  }

  // ── 2-2-5 — 「$k$ 명에게 주고 조금 남는다」·「$r$ 이 남는다」 ──
  if (code === "2-2-5") {
    const mid = content.match(
      /\$(\d+)\\,\\mathrm\{[a-zA-Z]+\}\$씩 나누어 주었더니 \$(\d+)\$명[^$]*\$(\d+)\\,/,
    );
    if (mid) {
      const per = Number(mid[1]);
      const k = Number(mid[2]);
      const rmin = Number(mid[3]);
      // 되짚기: 처음 양은 `(per·k, per·k+per)` 안의 소수 첫째 자리 수 — **여럿**이다
      const first: string[] = [];
      for (let t = per * k * 10 + 1; t < (per * k + per) * 10; t += 1)
        first.push(show({ scaled: t, dp: 1 }));
      const ok = first.filter((t) => decOf(t)!.scaled > (per * k + rmin) * 10);
      return {
        first,
        final: ok.length > 0 ? [ok[0]!] : [],
        window: first.length,
      };
    }
    const top = content.match(
      /\$(\d+)\\,\\mathrm\{[a-zA-Z]+\}\$씩 나누어 주면 \$([\d.]+)\\,\\mathrm\{[a-zA-Z]+\}\$[^$]*\$(\d+)\\,\\mathrm\{[a-zA-Z]+\}\$씩 나누어 주면 \$([\d.]+)\\,\\mathrm\{[a-zA-Z]+\}\$[^$]*\$([\d.]+)\\,/,
    );
    if (!top) return null;
    const a = Number(top[1]);
    const ra10 = decOf(top[2]!)!.scaled;
    const b = Number(top[3]);
    const rb10 = decOf(top[4]!)!.scaled;
    const cap10 = decOf(top[5]!)!.scaled;
    const first: string[] = [];
    for (let k = 1; ; k += 1) {
      const t = a * 10 * k + ra10;
      if (t >= cap10) break;
      first.push(show({ scaled: t, dp: 1 }));
    }
    const final = first.filter((t) => {
      const v = decOf(t)!.scaled;
      return v > b * 10 && (v - rb10) % (b * 10) === 0;
    });
    return { first, final, window: first.length };
  }
  return null;
}

describe("[초6 확대] 2-2 소수의 나눗셈 — 되짚기 축 (D-113)", () => {
  it("다섯 소단원이 심화중·심화상을 **둘 다** 낸다", () => {
    for (const code of CODES) {
      const tiers = supportedTiers(unitOf(code));
      expect(tiers, code).toContain("심화중");
      expect(tiers, code).toContain("심화상");
    }
  });

  it("㉠ 답은 **지면에서 되짚기를 다시 밟아** 나온 그 하나다", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ["심화중", "심화상"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const r = retrace(code, p.content);
          if (!r) {
            bad.push(`${where}: 되짚기를 못 읽음 — ${p.content}`);
            continue;
          }
          checked += 1;
          if (r.final.length !== 1) {
            bad.push(
              `${where}: 되짚어 남는 값이 ${r.final.length}개 (${r.final.join(", ")}) — ${p.content}`,
            );
            continue;
          }
          const got = answerDecs(p.answer).map(show);
          if (got.join(",") !== r.final.join(",")) {
            bad.push(
              `${where}: 답 ${p.answer} (${r.final[0]} 이어야) — ${p.content}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 분모를 같이 못 박는다 — 훑기가 조용히 줄면 «0건»이 «못 셈»이 된다.
    expect(checked).toBe(CODES.length * 2 * SEEDS.length);
  });

  it("㉡ 마디가 **정말 안 굳는다** — 조건 하나만으로는 값이 안 정해진다 (반증 ①)", () => {
    // 🔴 이것이 심화중·심화상의 **정의**다. 검사가 죽으면 「되짚기 축」이 이름만 남고,
    //    마디가 굳는 문항이 위 두 칸에 조용히 앉는다.
    //
    // ⚠️ **두 갈래를 같은 수로 재면 안 된다** — 굳히는 방식이 다르다.
    //    심화중: 되짚기가 배수열·구간을 만들고 **발문의 조건**(범위·「가장 큰」)이 고른다.
    //            → 그 **조건만** 남겼을 때 값이 여럿이어야 소단원 성질이 일을 한다(`window`).
    //    심화상: **성질까지 써도** 후보가 여럿이고, 둘째 계산이 하나를 남긴다(`first`).
    //    처음에 둘 다 `first` 로 쟀더니 심화중이 「후보 1개」로 전량 빨갛게 났다 —
    //    구성이 범위 안에 배수를 **정확히 하나** 두기 때문이다. 그건 결함이 아니라
    //    **내 자가 심화중의 정의를 잘못 옮긴 것**이었다.
    const bad: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const mid = generateElementaryProblem(unit, seed, "심화중");
        const rm = retrace(code, mid.content)!;
        if (rm.window < 2) {
          bad.push(
            `${code} 심화중 seed=${seed}: 조건만으로 값이 ${rm.window}개 — 마디가 굳었다(심화하다) — ${mid.content}`,
          );
        }
        const top = generateElementaryProblem(unit, seed, "심화상");
        const rt = retrace(code, top.content)!;
        if (rt.first.length < 2) {
          bad.push(
            `${code} 심화상 seed=${seed}: 첫 조건이 후보를 ${rt.first.length}개만 만든다 — ${top.content}`,
          );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉡-b 심화상은 **둘째 조건이 없으면 답이 안 선다** — 심화중과 층이 갈린다", () => {
    // 심화상의 정의는 「성질만으론 못 굳혀 후보를 실제로 만들어 견주어야 한다」이다.
    // 첫 조건만으로 답이 하나면 그것은 심화중이다.
    const bad: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화상");
        const r = retrace(code, p.content)!;
        if (r.first.length === r.final.length) {
          bad.push(
            `${code} 심화상 seed=${seed}: 둘째 조건이 아무것도 안 거른다 — ${p.content}`,
          );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉢ 답은 **하나**다 — 열거 문형이 아니다 (반증 ⑤)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ["심화중", "심화상"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const n = answerDecs(p.answer).length;
          if (n !== 1) {
            bad.push(`${code} ${tier} seed=${seed}: 답이 ${n}개 — ${p.answer}`);
          }
          if (/모두\s*(구하|쓰|고르|찾)/.test(p.content)) {
            bad.push(
              `${code} ${tier} seed=${seed}: 「모두 …시오」 — 열거는 등급의 근거가 아니다`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉣ 발문의 두 수를 **한 번 곱하거나 나눠서** 답이 나오지 않는다 (반증 ⑥)", () => {
    // 🔴 **양성 대조를 같이 잡는다.** 「심화중·심화상이 0」만 보면 이 자가 눈이 멀어도
    //    (수를 못 읽어 빈 배열이어도) 늘 초록이다. 같은 소단원의 **연산**은 발문이 식을
    //    그대로 주므로 **반드시 걸려야** 한다.
    const bad: string[] = [];
    let caught = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const cAns = answerDecs(calc.answer);
        if (cAns.length === 1 && oneStepAway(decsIn(calc.content), cAns[0]!)) {
          caught += 1;
        }
        for (const tier of ["심화중", "심화상"] as const) {
          const p = generateElementaryProblem(unit, seed, tier);
          const ans = answerDecs(p.answer);
          if (ans.length !== 1) continue;
          const hit = oneStepAway(decsIn(p.content), ans[0]!);
          if (hit) {
            bad.push(
              `${code} ${tier} seed=${seed}: ${hit} 한 번이면 답이 나온다 — ${p.content}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 음성 대조 — 이 자가 「한 걸음」을 실제로 잡는가.
    expect(
      caught,
      "연산 갈래에서 한 걸음을 하나도 못 잡았다 — 이 자가 죽었다",
    ).toBeGreaterThan(CODES.length * SEEDS.length * 0.5);
  });

  it("㉤ 반증 ④ — 같은 소단원의 **연산·기본·응용**은 이 잣대를 통과하지 않는다", () => {
    // 🔴 통과가 나오면 그 소단원에서는 되짚기 축이 난이도를 안 가른다 — 확대 갈래를
    //    **비워야** 한다. 「굳지 않는 마디가 있는가」의 지면 대리 지표는
    //    ⑴ 되짚기를 시키는 낱말(「어떤 수」·`\square`·「~가 되려면」)이 있고
    //    ⑵ 답이 발문의 두 수 한 걸음으로 **안** 나온다 — 둘 다다.
    //    ⚠️ 이 대리 지표는 손 목록이라 샌다. 그래서 아래 §「눈으로 본 것」을 보고서에
    //       같이 적었다 — 15갈래(5소단원 × 3)를 실제로 읽었다.
    const bad: string[] = [];
    let judged = 0;
    let reached = 0; // 되짚기 표지가 있어 **한 걸음인지 실제로 재 본** 자리
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          judged += 1;
          const backword = /어떤 수|\\square|되려면|이 되었습니다/.test(
            p.content,
          );
          if (!backword) continue;
          const ans = answerDecs(p.answer);
          if (ans.length !== 1) continue;
          reached += 1;
          if (oneStepAway(decsIn(p.content), ans[0]!)) continue;
          bad.push(
            `${code} ${tier} seed=${seed}: 되짚기 축을 통과한다 — 이 소단원은 비워야 한다 (${p.content})`,
          );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(judged).toBe(CODES.length * 3 * SEEDS.length);
    // 🔴 **「0건」이 «깨끗»인지 «못 셈»인지 가른다.** 되짚기 표지가 있는 자리에
    //    한 번도 안 닿았으면 위의 0 은 아무것도 증명하지 않는다. 실측: 2-2-1·2-2-2·
    //    2-2-3 의 **연산**이 `…=\square` 를 쓰므로 반드시 닿는다(48자리).
    expect(
      reached,
      "되짚기 표지가 있는 연산·기본·응용에 한 번도 안 닿았다 — 이 필터는 아무것도 안 쟀다",
    ).toBeGreaterThanOrEqual(3 * SEEDS.length);
  });

  it("심화중·심화상은 씨앗마다 갈리고, 같은 씨앗이면 늘 같다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ["심화중", "심화상"] as const) {
        const pages = SEEDS.map(
          (s) => generateElementaryProblem(unit, s, tier).content,
        );
        expect(
          new Set(pages).size,
          `${code} ${tier} 씨앗 다양성`,
        ).toBeGreaterThan(1);
        const again = generateElementaryProblem(unit, SEEDS[0]!, tier);
        expect(again.content, `${code} ${tier} 재현`).toBe(pages[0]);
      }
    }
  });
});
