/**
 * 초6 확대 갈래 **4차분(물결 4)** — `1-3 소수의 나눗셈` (D-113 축 · D-115 잣대, 2026-09-01).
 *
 * 값이 맞는지는 `elemTiersG6.test.ts` 가 이미 잰다(발문을 다시 읽어 유리수로 검산한다).
 * 여기서는 **잣대**를 잰다. 축은 2·3차분과 같고, 이 회차가 **하나를 더한다** — ㉧.
 *
 * | 축 | 무엇을 재나 |
 * |---|---|
 * | ㉠ 마디가 정말 안 굳나 | 굳히는 성질을 **빼면** 후보가 여럿이어야 한다 |
 * | ㉡ 성질이 하나로 굳히나 | 그 성질을 걸면 정확히 **하나**가 남는다 |
 * | ㉢ «중»과 «상»이 갈리나 | 심화상은 후보를 **다 계산해야** 갈리고, 심화중은 비교로 갈린다 |
 * | ㉣ 반증 ⑥ | 발문의 수에 순방향 연산·±한 걸음을 대어 답이 나오면 안 된다 |
 * | ㉤ 반증 ④ | 같은 소단원의 연산·기본·응용이 이 축을 안 쓴다 |
 * | ㉥ 해설이 늘어놓나 | 심화중은 안 늘어놓고 심화상은 늘어놓는다 (D-115 ⑾) |
 * | ㉦ 그림 | 확대 갈래는 역산이라 그림이 없다 |
 * | 🔴 ㉧ **감추는 자리가 2-2 와 다른가** | 이 회차가 새로 세운 축 — 아래 참조 |
 *
 * ## 🔴 ㉧ 는 왜 필요한가 — **겹침을 막는 것이 성질이 아니라 «감추는 자리»다**
 *
 * 토대 §2.4 의 적대 검토가 1-3 에 🔴 를 둘 찍었다: 「몫이 소수 한 자리」→배수열은
 * **2-2-2 심화중 그대로**이고, 「$A$ 로도 $B$ 로도」는 **2-2-1·2-2-2 심화상 그대로**다.
 * 그런데 성질을 바꿔도(«$0$을 내린다» 로) **문장 뼈대는 그대로 겹친다** — 2-2 의 확대
 * 갈래 다섯이 전부 「어떤 수를 $d$ 로 나누었더니 <성질>. **어떤 수가 $lo$ 보다 크고
 * $hi$ 보다 작을 때**…」이기 때문이다. 겹치는 알맹이는 **나누어지는 수를 감추는 것**이다.
 *
 * 그래서 4차분은 감추는 자리를 옮겼다 — 1-3 은 **나누는 수**를 감춘다. 이 축이 그것을
 * 잠근다. **양성 대조군을 같이 둔다**: 2-2 의 심화중이 그 뼈대에 **걸려야** 한다.
 * 안 그러면 이 검사는 «아니오»를 낼 수 없는 도장이다(2026-08-23).
 *
 * ## 🔴 이 파일이 **못 보는 것**
 *
 * 1. **「학생이 몇 번 생각하나」는 못 잰다.** 재는 것은 후보의 **개수**와 **해설의 모양**이다.
 * 2. **㉤ 는 대리 지표다.** 「이 축의 표지가 연산·기본·응용에 없다」는 「그것들이 되짚기를
 *    안 시킨다」와 같은 말이 아니다. 다섯 소단원 갈래를 눈으로 읽은 결과가 보고서 §2.1 에 있다.
 * 3. **비운 일곱(1-3-1 둘 · 1-3-2 상 · 1-3-3 중 · 1-3-4 중 · 1-3-5 둘)은 여기서 안 지킨다.**
 *    금지는 잣대가 아니라 판단이라 다음 회차가 **측정을 대고** 뒤집을 수 있어야 한다
 *    (3차분이 같은 판단을 했다). 근거는 보고서 §2.1·§3 에 수와 함께 적었다.
 * 4. **㉨(지름길)의 문턱은 «측정한 값보다 넉넉하게» 잡은 것이다.** 지금 실측이
 *    문턱의 절반이 못 되므로 이 자는 **회귀를 잡는 자**이지 최적을 증명하는 자가 아니다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  readRat,
  type Rat,
} from "@/lib/elementary/forwardReach";

import {
  ENUM_THRESHOLD,
  enumeratedSteps,
} from "../../../scripts/qa/probe-elem-tier-enumeration";

const SEEDS = Array.from({ length: 24 }, (_, i) => i * 37 + 5);
/** 지름길은 **분포**라 표본이 두꺼워야 한다 — 24씨앗은 절반을 놓친다(2026-08-30 메모리). */
const WIDE_SEEDS = Array.from({ length: 120 }, (_, i) => i * 17 + 3);

const unitOf = (code: string) => {
  const u = elementaryUnits().find(
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원`).toBeTruthy();
  return u!;
};

const gen = (code: string, seed: number, tier: "심화중" | "심화상") =>
  generateElementaryProblem(unitOf(code), seed, tier);

// ── 시험이 직접 드는 유리수 (엔진 것을 안 쓴다) ────────────────────────────
type R = { n: number; d: number };
const g = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : g(b, a % b);
const rr = (n: number, d = 1): R => {
  const k = g(n, d) || 1;
  return { n: n / k, d: d / k };
};
/** 소수 글자를 유리수로. `4.25` → `17/4`. */
function readDec(tok: string): R | null {
  const m = tok.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  return rr(Number(`${m[1]}${frac}`), 10 ** frac.length);
}
/**
 * 소수 자릿수 — 분모에 $2$·$5$ 말고 다른 소인수가 남으면 **안 끝난다**(null).
 * 생성기의 `centsQuotientDp` 를 안 부른다(부르면 동어반복이다).
 */
function decDp(v: R): number | null {
  let d = v.d;
  let two = 0;
  let five = 0;
  while (d % 2 === 0) {
    d /= 2;
    two += 1;
  }
  while (d % 5 === 0) {
    d /= 5;
    five += 1;
  }
  return d === 1 ? Math.max(two, five) : null;
}
const tenthOf = (v: R) => Math.floor((v.n * 10) / v.d) % 10;

/**
 * ±**한 걸음**으로 답에 닿나 — 🔴 **일부러 여기에 다시 짓는다.**
 *
 * 생성기는 공용 `pmOneStepReachable` 을 쓴다. 시험이 그것을 부르면 동어반복이 되어
 * 「가드를 지우는」 변이가 초록이 된다(3차분이 같은 까닭으로 자기 판을 남겼다).
 * 「규칙을 두 벌 두지 마라」의 **의도된 예외**다.
 */
function pmOneStep(nums: readonly R[], ans: R): boolean {
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      for (const v of [
        rr(a.n * b.d + b.n * a.d, a.d * b.d),
        rr(a.n * b.d - b.n * a.d, a.d * b.d),
      ]) {
        if (v.n === ans.n && v.d === ans.d) return true;
      }
    }
  return false;
}

// ── 발문 판독 (생성기 분기를 안 쓴다 — 지면 글자만 읽는다) ─────────────────

/** 「나누는 수가 $lo$ 보다 크고 $hi$ 보다 작을 때」의 후보 자연수. */
function windowCandidates(content: string): number[] | null {
  const m = content.match(
    /나누는 수가 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
  );
  if (!m) return null;
  const out: number[] = [];
  for (let d = Number(m[1]) + 1; d < Number(m[2]); d += 1) out.push(d);
  return out;
}

/** 「$X$ 를 어떤 자연수로 나누었더니」의 $X$. */
function dividendOf(content: string): R | null {
  const m = content.match(/\$(\d+(?:\.\d+)?)\$[을를] 어떤 자연수로/);
  return m ? readDec(m[1]!) : null;
}

/** 그 소단원의 «자리» 성질 — 1-3-3 은 「$0$을 내려 두 자리」, 1-3-4 는 「첫째 자리 $0$」. */
const PLACE_RULE: Record<string, (q: R) => boolean> = {
  "1-3-3": (q) => decDp(q) === 2,
  "1-3-4": (q) => decDp(q) === 2 && tenthOf(q) === 0,
};

/** 창 안에서 그 성질을 지키는 나누는 수들. */
function hits(code: "1-3-3" | "1-3-4", content: string): number[] {
  const cands = windowCandidates(content);
  const x = dividendOf(content);
  expect(cands, `${code}: 창을 못 읽음 — ${content}`).toBeTruthy();
  expect(x, `${code}: 나누어지는 수를 못 읽음 — ${content}`).toBeTruthy();
  return cands!.filter((d) => PLACE_RULE[code]!(rr(x!.n, x!.d * d)));
}

describe("[초6 4차분] 1-3 소수의 나눗셈 — 나누는 수를 감춘다", () => {
  it("㉠ 마디가 안 굳는다 — 굳히는 성질을 빼면 후보가 여럿이다", () => {
    for (const seed of SEEDS) {
      // 1-3-2 — 나누는 수를 모르면 「어떤 소수」가 여럿이다.
      // (몫만으로는 못 굳는다. $q\times d$ 가 $d$ 마다 다른 값이다.)
      const mid = gen("1-3-2", seed, "심화중");
      const q = readDec(
        mid.content.match(/몫이 \$(\d+(?:\.\d+)?)\$[이가] 되었습니다/)?.[1] ??
          "",
      );
      expect(q, `1-3-2 seed=${seed}: 몫을 못 읽음`).toBeTruthy();
      const open = new Set<string>();
      for (let d = 2; d <= 12; d += 1) {
        const v = rr(q!.n * d, q!.d);
        if (decDp(v) === 1) open.add(`${v.n}/${v.d}`);
      }
      expect(
        open.size,
        `1-3-2 seed=${seed}: 나누는 수를 몰라도 답이 하나다 — 마디가 안 열렸다`,
      ).toBeGreaterThanOrEqual(2);

      // 1-3-3·1-3-4 — 자리 성질을 빼면 창 안 자연수가 전부 후보다.
      for (const code of ["1-3-3", "1-3-4"] as const) {
        const p = gen(code, seed, "심화상");
        const cands = windowCandidates(p.content);
        expect(
          cands?.length ?? 0,
          `${code} seed=${seed}: 창이 후보를 셋은 만들어야 한다 — ${p.content}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("㉡ 성질이 정확히 하나를 남긴다 — 답이 둘인 문항은 값 검산이 못 본다", () => {
    for (const seed of SEEDS) {
      for (const code of ["1-3-3", "1-3-4"] as const) {
        const p = gen(code, seed, "심화상");
        expect(
          hits(code, p.content),
          `${code} seed=${seed}: 조건을 지키는 나누는 수가 하나여야 한다 — ${p.content}`,
        ).toHaveLength(1);
      }
      // 1-3-2 — 「$A$ 보다 큰 자연수 중 가장 작은 수」는 하나다. 그리고 $A$ 는
      // 자연수가 아니어야 「가장 작은」이 흔들리지 않는다.
      const mid = gen("1-3-2", seed, "심화중");
      const a = readDec(
        mid.content.match(
          /나누는 수가 \$(\d+(?:\.\d+)?)\$[을를] 나누면/,
        )?.[1] ?? "",
      );
      expect(a, `1-3-2 seed=${seed}: $A$ 를 못 읽음`).toBeTruthy();
      expect(
        a!.d,
        `1-3-2 seed=${seed}: $A$ 가 자연수면 「가장 작은」이 애매하다`,
      ).toBeGreaterThan(1);
    }
  });

  it("㉢ «중»은 비교로 갈리고 «상»은 다 계산해야 갈린다 (D-115 ⑾)", () => {
    for (const seed of SEEDS) {
      for (const code of ["1-3-3", "1-3-4"] as const) {
        const p = gen(code, seed, "심화상");
        const x = dividendOf(p.content)!;
        const cands = windowCandidates(p.content)!;
        // «값이 지면에 적히는»(소수 두 자리 안에 끝나는) 후보가 둘은 있어야
        // 학생이 실제로 **견줄 거리**가 생긴다. 하나뿐이면 나머지는 「안 끝난다」로
        // 한꺼번에 버려져 «계산해 견주기»가 아니라 «걸러 내기»가 된다.
        const printable = cands.filter((d) => {
          const k = decDp(rr(x.n, x.d * d));
          return k !== null && k <= 2;
        });
        expect(
          printable.length,
          `${code} seed=${seed}: 견줄 후보가 둘은 있어야 «상» 이다 — ${p.content}`,
        ).toBeGreaterThanOrEqual(2);
      }
      // 1-3-2 는 반대다 — 「$A$ 보다 큰가」는 **나눠 보지 않고** 갈린다.
      // 그래서 발문에 창(두 끝)이 없어야 한다(창이 있으면 후보를 늘어놓게 된다).
      const mid = gen("1-3-2", seed, "심화중");
      expect(
        windowCandidates(mid.content),
        `1-3-2 seed=${seed}: 심화중에 후보 창이 생겼다 — «상» 의 모양이다`,
      ).toBeNull();
    }
  });

  it("㉣ 반증 ⑥ — 순방향으로도 ±한 걸음으로도 안 닿고, 답이 지면에 없다", () => {
    const bad: string[] = [];
    for (const seed of WIDE_SEEDS) {
      for (const [code, tier] of [
        ["1-3-2", "심화중"],
        ["1-3-3", "심화상"],
        ["1-3-4", "심화상"],
      ] as const) {
        const p = gen(code, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim()) as Rat | null;
        expect(
          ans,
          `${code} seed=${seed}: 답을 못 읽음 — ${p.answer}`,
        ).toBeTruthy();
        const nums = pageNumbers(p.content);
        if (forwardReachable(nums, ans!)) bad.push(`${code} ${seed} 순방향`);
        if (answerPrintedOnPage(nums, ans!))
          bad.push(`${code} ${seed} 지면에 답`);
        if (pmOneStep(nums as R[], ans as R))
          bad.push(`${code} ${seed} ±한 걸음`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("㉤ 반증 ④ — 연산·기본·응용은 이 축의 표지를 안 쓴다", () => {
    const 표지 = [
      /나누는 수가 \$\d+\$보다 크고/,
      /가장 작은 수/,
      /소수 두 자리 수가 되었습니다/,
      /소수점 아래 \$0\$을 내려 계산하게 되어/,
    ];
    const bad: string[] = [];
    for (const code of ["1-3-1", "1-3-2", "1-3-3", "1-3-4", "1-3-5"] as const) {
      const unit = unitOf(code);
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const c = generateElementaryProblem(unit, seed, tier).content;
          for (const re of 표지) {
            if (re.test(c)) bad.push(`${code} ${tier} seed=${seed}: ${re}`);
          }
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉥ 심화중은 해설이 안 늘어놓고, 심화상은 늘어놓는다 (D-115 ⑾)", () => {
    for (const seed of SEEDS) {
      expect(
        enumeratedSteps(gen("1-3-2", seed, "심화중").solution),
        `1-3-2 심화중 seed=${seed}: 해설이 후보를 늘어놓는다 — «상» 의 길이다`,
      ).toBeLessThan(ENUM_THRESHOLD);
      for (const code of ["1-3-3", "1-3-4"] as const) {
        expect(
          enumeratedSteps(gen(code, seed, "심화상").solution),
          `${code} 심화상 seed=${seed}: 후보를 안 늘어놓는다 — «중» 의 길이다`,
        ).toBeGreaterThanOrEqual(ENUM_THRESHOLD);
      }
    }
  });

  it("㉦ 확대 갈래에 그림이 없다 — 되짚을 값을 그림이 알려 주면 마디가 안 열린다", () => {
    for (const seed of SEEDS) {
      for (const [code, tier] of [
        ["1-3-2", "심화중"],
        ["1-3-3", "심화상"],
        ["1-3-4", "심화상"],
      ] as const) {
        expect(
          gen(code, seed, tier).figureSpec,
          `${code} ${tier} seed=${seed}: 그림이 붙었다`,
        ).toBeNull();
      }
    }
  });

  it("🔴 ㉧ 감추는 자리가 2-2 와 다르다 — 그리고 2-2 는 그 뼈대에 «걸린다»(양성 대조)", () => {
    // 2-2 의 뼈대: 「어떤 수가 $lo$ 보다 크고 $hi$ 보다 작을 때」 = **나누어지는 수**를 감춘다.
    // ⚠️ 사이에 낀 말을 허용해야 한다 — 2-2-2 는 「어떤 수가 **소수 두 자리 수이고**
    //    $8.27$ 보다 크고 …」라 딱 붙은 판으로 재면 **셋 중 하나가 안 걸린다**(실측 48/72).
    //    양성 대조가 반쪽이면 이 축의 «아니오»도 반쪽이다.
    const 이차이_뼈대 =
      /어떤 수가[^.]*\$[\d.]+\$보다 크고 \$[\d.]+\$보다 작을 때/;

    // 🔴 양성 대조 — 이 열쇠가 «예»를 낼 수 있는가. 못 내면 아래 «아니오»는 도장이다.
    let 걸린_이차이 = 0;
    for (const seed of SEEDS) {
      for (const code of ["2-2-1", "2-2-2", "2-2-3"] as const) {
        if (이차이_뼈대.test(gen(code, seed, "심화중").content))
          걸린_이차이 += 1;
      }
    }
    expect(
      걸린_이차이,
      "2-2 심화중이 이 뼈대에 안 걸린다 — 열쇠가 죽었다(«아니오»만 내는 도장)",
    ).toBe(SEEDS.length * 3);

    // 음성 — 1-3 의 확대 갈래는 그 뼈대를 쓰지 않고, **나누는 수**를 감춘다.
    for (const seed of SEEDS) {
      for (const [code, tier] of [
        ["1-3-2", "심화중"],
        ["1-3-3", "심화상"],
        ["1-3-4", "심화상"],
      ] as const) {
        const c = gen(code, seed, tier).content;
        expect(
          이차이_뼈대.test(c),
          `${code} ${tier} seed=${seed}: 2-2 의 뼈대(나누어지는 수를 감춤)를 썼다 — ${c}`,
        ).toBe(false);
        expect(
          /나누는 수|어떤 자연수로 나누었더니|자연수로 나누었더니/.test(c),
          `${code} ${tier} seed=${seed}: 나누는 수를 감추지 않았다 — ${c}`,
        ).toBe(true);
      }
    }
  });

  it("🔴 ㉨ 지름길 — 「가장 큼·가장 작음·가운데」가 우연보다 크게 앞서지 않는다", () => {
    for (const code of ["1-3-3", "1-3-4"] as const) {
      let n = 0;
      let chance = 0;
      const hit = { 큼: 0, 작음: 0, 가운데: 0 };
      for (const seed of WIDE_SEEDS) {
        const p = gen(code, seed, "심화상");
        const cands = windowCandidates(p.content)!;
        const d = hits(code, p.content)[0]!;
        n += 1;
        chance += 1 / cands.length;
        if (d === Math.max(...cands)) hit.큼 += 1;
        if (d === Math.min(...cands)) hit.작음 += 1;
        if (d === cands[Math.floor(cands.length / 2)]) hit.가운데 += 1;
      }
      const 비율 = (v: number) => v / n;
      // 실측(2026-09-01, 씨앗 120): 1-3-3 큼 .33 작음 .28 가운데 .26 (우연 .27) ·
      //                             1-3-4 큼 .19 작음 .34 가운데 .21 (우연 .24)
      // 문턱은 그 위로 넉넉히 잡는다 — 「무조건 가장 큰 것」(=1.00)이 들어오면 빨개진다.
      for (const [name, v] of Object.entries(hit)) {
        expect(
          비율(v),
          `${code}: 「${name}」 지름길 ${(비율(v) * 100).toFixed(1)}% (우연 ${((chance / n) * 100).toFixed(1)}%)`,
        ).toBeLessThan(0.45);
      }
      // 그리고 우연 확률 자체가 너무 크면(창이 좁으면) 위 문턱이 뜻을 잃는다.
      expect(chance / n, `${code}: 창이 너무 좁다`).toBeLessThan(0.34);
    }
  });
});

// ══════════ 4차분 — `1-4 비와 비율` ══════════
//
// 굳힘 축은 「비율은 두 수를 하나로 뭉갠다 + **항·사람은 자연수**」다. 그래서 이 파일이
// 잠그는 것은 **정수성의 «운반체»** 다 — 1-4 는 사람·항, 1-5 는 눈금 cm(토대 §1.4 의 두 칸이
// 서로를 가리켜 모순이라, 살릴 수 있는 읽기를 골라 코드와 시험에 못 박는다).
//
// 🔴 심화상은 비웠다. 근거는 보고서 §2.2 — 선형 사슬에서 조건 둘은 접히고,
//    접히지 않게 둘째를 값 비교로 두면 첫 창이 잉여가 된다.

const G14 = [
  ["1-4-3", "심화중"],
  ["1-4-5", "심화중"],
  ["1-4-6", "심화중"],
] as const;

/** 「… $lo$ 보다 크고(많고) $hi$ 보다 작을(적을) 때」의 창. */
function windowOf14(content: string): [number, number] | null {
  const m = content.match(
    /\$(\d+)\$(?:명)?보다 (?:크고|많고) \$(\d+)\$(?:명)?보다 (?:작을|적을) 때/,
  );
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** 그 창을 굳히는 배수열의 모듈러스 — 발문 글자에서 다시 얻는다(엔진을 안 부른다). */
function modulusOf14(content: string): number | null {
  const f = content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
  if (f && content.includes("두 항이 모두 자연수")) return Number(f[2]);
  const p = content.match(/\$(\d+)\\%\$/);
  if (p) {
    const v = Number(p[1]);
    return 100 / g(v, 100);
  }
  return null;
}

describe("[초6 4차분] 1-4 비와 비율 — 값을 안 주고 정수성으로 굳힌다", () => {
  it("㉠㉡ 창이 후보를 여럿 만들고, 배수는 정확히 하나다", () => {
    for (const seed of SEEDS) {
      for (const [code, tier] of G14) {
        const p = gen(code, seed, tier);
        const w = windowOf14(p.content);
        const m = modulusOf14(p.content);
        expect(
          w,
          `${code} seed=${seed}: 창을 못 읽음 — ${p.content}`,
        ).toBeTruthy();
        expect(
          m,
          `${code} seed=${seed}: 배수열을 못 읽음 — ${p.content}`,
        ).toBeTruthy();
        const nat = w![1] - w![0] - 1;
        // 🔴 1-4-3 만 일곱이다 — 공용 반증 ⑥ 자가 이 갈래에서 창의 **두 끝**을
        //    구조적으로 걷어낸다(답이 $\frac pq\times$기준량이라 기준량이 창의 끝에
        //    붙으면 `a×b±c` 꼴이 된다. 실측: 자리 0 이 1,428 → 0).
        //    막을 수 없으므로 창을 넓혀 그 누수의 몫을 줄인다 — 그 사실을 여기 잠근다.
        expect(
          nat,
          `${code} seed=${seed}: 창 안 자연수가 모자라 성질이 일하지 못한다 — ${p.content}`,
        ).toBeGreaterThanOrEqual(code === "1-4-3" ? 7 : 5);
        const hit: number[] = [];
        for (let v = w![0] + 1; v < w![1]; v += 1)
          if (v % m! === 0) hit.push(v);
        expect(
          hit,
          `${code} seed=${seed}: 창 안 배수가 하나여야 한다 — ${p.content}`,
        ).toHaveLength(1);
      }
    }
  });

  it("㉣ 반증 ⑥ — 순방향으로도 ±한 걸음으로도 안 닿고, 답이 지면에 없다", () => {
    const bad: string[] = [];
    for (const seed of WIDE_SEEDS) {
      for (const [code, tier] of G14) {
        const p = gen(code, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim()) as Rat | null;
        expect(
          ans,
          `${code} seed=${seed}: 답을 못 읽음 — ${p.answer}`,
        ).toBeTruthy();
        const nums = pageNumbers(p.content);
        if (forwardReachable(nums, ans!)) bad.push(`${code} ${seed} 순방향`);
        if (answerPrintedOnPage(nums, ans!))
          bad.push(`${code} ${seed} 지면에 답`);
        if (pmOneStep(nums as R[], ans as R))
          bad.push(`${code} ${seed} ±한 걸음`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("㉤ 반증 ④ — 연산·기본·응용은 이 축(정수성 + 창)을 안 쓴다", () => {
    const 표지 = [
      /두 항이 모두 자연수/,
      /수가 자연수이고 전체/,
      /찬성한 학생 수가 자연수/,
    ];
    const bad: string[] = [];
    for (const code of [
      "1-4-1",
      "1-4-2",
      "1-4-3",
      "1-4-4",
      "1-4-5",
      "1-4-6",
    ] as const) {
      const unit = unitOf(code);
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const c = generateElementaryProblem(unit, seed, tier).content;
          for (const re of 표지)
            if (re.test(c)) bad.push(`${code} ${tier} ${seed}: ${re}`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉥ 심화중은 해설이 후보를 안 늘어놓는다 · ㉦ 그림이 없다", () => {
    for (const seed of SEEDS) {
      for (const [code, tier] of G14) {
        const p = gen(code, seed, tier);
        expect(
          enumeratedSteps(p.solution),
          `${code} seed=${seed}: 해설이 늘어놓는다 — «상» 의 길이다`,
        ).toBeLessThan(ENUM_THRESHOLD);
        expect(p.figureSpec, `${code} seed=${seed}: 그림이 붙었다`).toBeNull();
      }
    }
  });

  it("🔴 ㉧′ 정수성의 운반체가 «사람·항»이다 — 눈금 cm 는 1-5 몫이다", () => {
    // 🔴 음성 대조를 **리터럴로** 못 박는다. 살아 있는 1-5 를 쓰면 그쪽이 비어 있는 동안
    //    이 열쇠가 «아니오»를 낼 수 있는지 확인할 수 없다(D-115 ⑼ 와 같은 처방).
    const 눈금_지면 =
      "전체 길이가 $20\\,\\mathrm{cm}$ 인 띠그래프에서 $35\\%$ 를 차지하는 " +
      "항목의 길이가 자연수 cm 일 때, 띠의 전체 길이는 몇 cm입니까?";
    const 눈금축 = (c: string) => /cm|눈금|띠그래프|원그래프/.test(c);
    expect(눈금축(눈금_지면), "열쇠가 «예»를 못 낸다 — 도장이다").toBe(true);

    for (const seed of SEEDS) {
      for (const [code, tier] of G14) {
        const c = gen(code, seed, tier).content;
        expect(
          눈금축(c),
          `${code} seed=${seed}: 1-5 의 눈금 축을 썼다 — ${c}`,
        ).toBe(false);
        expect(
          /자연수/.test(c),
          `${code} seed=${seed}: 정수성을 지면이 말하지 않는다 — ${c}`,
        ).toBe(true);
      }
    }
  });

  it("🔴 ㉨ 지름길 — 답의 자리가 창의 첫·끝·가운데에 몰리지 않는다", () => {
    for (const [code, tier] of G14) {
      let n = 0;
      let chance = 0;
      const hit = { 첫: 0, 끝: 0, 가운데: 0 };
      for (const seed of WIDE_SEEDS) {
        const p = gen(code, seed, tier);
        const w = windowOf14(p.content)!;
        const m = modulusOf14(p.content)!;
        let base = 0;
        for (let v = w[0] + 1; v < w[1]; v += 1) if (v % m === 0) base = v;
        const nat = w[1] - w[0] - 1;
        n += 1;
        chance += 1 / nat;
        if (base === w[0] + 1) hit.첫 += 1;
        if (base === w[1] - 1) hit.끝 += 1;
        if (base === w[0] + 1 + Math.floor(nat / 2)) hit.가운데 += 1;
      }
      for (const [name, v] of Object.entries(hit)) {
        expect(
          v / n,
          `${code}: 「${name}」 지름길 ${((v / n) * 100).toFixed(1)}% (우연 ${((chance / n) * 100).toFixed(1)}%)`,
        ).toBeLessThan(0.35);
      }
    }
  });
});

// ══════════ 4차분 — `2-1 분수의 나눗셈` · `1-5 여러 가지 그래프` ══════════
//
// 두 대단원을 한 파일에 두는 까닭: **둘 다 «축을 남에게서 갈라 내는» 일**이라
// 그 가름을 한자리에서 잠가야 한다.
//   2-1 ↔ 2-2 … 2-1 은 **수치 범위를 발문에 안 적는다**(창은 진분수 약속이 준다)
//   1-5 ↔ 1-4 … 1-5 는 정수성의 운반체가 **눈금 cm** 다
//
// 🔴 2-1-1 **심화중은 비웠다** — 「$\square$ 가 두 자리 수」로 고르면 후보가 배수열이라
//    두 자리 수는 늘 꼬리다(답이 언제나 가장 큰 후보 = 지름길 100%). 보고서 §2.4.

// 🔴 2-1-1 은 **중·상 둘 다 비웠다** — 「두 자리 수」는 늘 꼬리(지름길 100%)이고,
//    「견줄 값」을 적으려면 자연수가 발문에 들어가는데 이 소단원의 조건 검사가
//    그것을 금지한다(`kindsPresent("분수","분수")`). 근거는 `g6.ts` 의 그 자리 주석과
//    보고서 §2.4 에 있다. 남은 자리는 2-1-5 하나다.
const G21 = [["2-1-5", "심화중"]] as const;

/** 「$\frac{\square}{d}$」의 분모. */
const squareDen = (c: string) => {
  const m = c.match(/\\frac\{\\square\}\{(\d+)\}/);
  return m ? Number(m[1]) : null;
};
/** 「$\div\frac{a}{d}$」의 나누는 분자. */
const divisorTop = (c: string) => {
  const m = c.match(/\\div\\frac\{(\d+)\}\{\d+\}/);
  return m ? Number(m[1]) : null;
};

describe("[초6 4차분] 2-1 분수의 나눗셈 — 소단원 약속이 창을 공짜로 준다", () => {
  it("㉠㉡ 진분수 약속이 후보를 셋 이상 만들고, 성질이 하나를 남긴다", () => {
    for (const seed of SEEDS) {
      // 2-1-5 심화중 — 진분수부 후보 $1..d-1$ 에서 「가분수 분자가 $a$ 의 배수」 하나.
      const mid = gen("2-1-5", seed, "심화중");
      const d5 = squareDen(mid.content)!;
      const a5 = divisorTop(mid.content)!;
      const w = Number(
        mid.content.match(/\$(\d+)\\frac\{\\square\}/)?.[1] ?? NaN,
      );
      expect(
        Number.isFinite(w) && d5 > 0 && a5 > 0,
        `2-1-5 seed=${seed}: 발문을 못 읽음 — ${mid.content}`,
      ).toBe(true);
      const hit: number[] = [];
      for (let s = 1; s < d5; s += 1) if ((w * d5 + s) % a5 === 0) hit.push(s);
      // 🔴 **기약을 빼고** 센다 — 발문은 「진분수」라고만 하므로, 기약을 조건으로
      //    세어 유일하다고 하면 지면에는 답이 둘인 문항이 나간다(실제로 그랬다).
      expect(
        hit,
        `2-1-5 seed=${seed}: 「진분수」만으로 답이 하나여야 한다 — ${mid.content}`,
      ).toHaveLength(1);
      expect(
        d5 > 3 && hit[0]! < d5,
        `2-1-5 seed=${seed}: 진분수 약속이 창을 안 준다`,
      ).toBe(true);
    }
  });

  it("🔴 ㉧″ 발문에 «수치 범위»가 없다 — 창은 소단원 약속이 준다 (2-2 와 가르는 축)", () => {
    const 범위문 = /\$[\d.]+\$(?:명|cm)?보다 (?:크고|많고|길고)/;
    // 양성 대조 — 2-2 심화중은 그 문장을 **쓴다**. 못 쓰면 이 열쇠가 도장이다.
    let 걸린 = 0;
    for (const seed of SEEDS)
      for (const code of ["2-2-1", "2-2-3"] as const)
        if (범위문.test(gen(code, seed, "심화중").content)) 걸린 += 1;
    expect(걸린, "2-2 심화중이 범위문을 안 쓴다 — 열쇠가 죽었다").toBe(
      SEEDS.length * 2,
    );
    // 음성 — 2-1 의 확대 갈래는 범위를 안 적는다.
    for (const seed of SEEDS)
      for (const [code, tier] of G21) {
        const c = gen(code, seed, tier).content;
        expect(
          범위문.test(c),
          `${code} ${tier} seed=${seed}: 범위를 적었다 — ${c}`,
        ).toBe(false);
        expect(
          c.includes("진분수"),
          `${code} ${tier} seed=${seed}: 진분수 약속을 안 썼다 — ${c}`,
        ).toBe(true);
      }
  });

  it("㉣ 반증 ⑥ · ㉥ 해설의 길 · ㉦ 그림 없음", () => {
    const bad: string[] = [];
    for (const seed of WIDE_SEEDS)
      for (const [code, tier] of G21) {
        const p = gen(code, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim()) as Rat | null;
        const nums = pageNumbers(p.content);
        if (!ans) bad.push(`${code} ${seed} 답 못 읽음`);
        else {
          if (forwardReachable(nums, ans)) bad.push(`${code} ${seed} 순방향`);
          if (answerPrintedOnPage(nums, ans))
            bad.push(`${code} ${seed} 지면에 답`);
          if (pmOneStep(nums as R[], ans as R))
            bad.push(`${code} ${seed} ±한 걸음`);
        }
      }
    expect(bad.slice(0, 8)).toEqual([]);
    for (const seed of SEEDS) {
      // 중은 안 늘어놓는다 — D-115 ⑾. (이 대단원에 «상» 은 없다 — 위 주석의 ⑵)
      expect(
        enumeratedSteps(gen("2-1-5", seed, "심화중").solution),
        `2-1-5 심화중 seed=${seed}: 해설이 늘어놓는다 — «상» 의 길이다`,
      ).toBeLessThan(ENUM_THRESHOLD);
      for (const [code, tier] of G21)
        expect(
          gen(code, seed, tier).figureSpec,
          `${code} ${tier}: 그림`,
        ).toBeNull();
    }
  });
});

describe("[초6 4차분] 1-5-2 띠그래프로 나타내기 — 눈금이 굳힌다", () => {
  it("㉠㉡ 창이 후보를 여럿 만들고 배수는 하나 · ㉦ 그림이 없다", () => {
    for (const seed of SEEDS) {
      const p = gen("1-5-2", seed, "심화중");
      const w = p.content.match(
        /전체 길이가 \$(\d+)\$ cm 보다 길고 \$(\d+)\$ cm 보다 짧을 때/,
      );
      const pct = Number(p.content.match(/\$(\d+)\\%\$/)?.[1] ?? NaN);
      expect(w, `1-5-2 seed=${seed}: 창을 못 읽음 — ${p.content}`).toBeTruthy();
      expect(Number.isFinite(pct), `1-5-2 seed=${seed}: 비율을 못 읽음`).toBe(
        true,
      );
      const [lo, hi] = [Number(w![1]), Number(w![2])];
      expect(
        hi - lo - 1,
        `1-5-2 seed=${seed}: 창이 좁다`,
      ).toBeGreaterThanOrEqual(5);
      const b = 100 / g(pct, 100);
      const hit: number[] = [];
      for (let v = lo + 1; v < hi; v += 1) if (v % b === 0) hit.push(v);
      expect(
        hit,
        `1-5-2 seed=${seed}: 창 안 배수가 하나여야 한다`,
      ).toHaveLength(1);
      expect(p.figureSpec, `1-5-2 seed=${seed}: 그림이 붙었다`).toBeNull();
    }
  });

  it("🔴 ㉧‴ 정수성의 운반체가 «눈금 cm» 다 — 사람 수는 1-4 몫이다", () => {
    // 음성 대조를 **리터럴로** 못 박는다(살아 있는 1-4 를 쓰면 그쪽을 고칠 때 같이 흔들린다).
    const 사람축 = (c: string) =>
      /명보다 많고|학생 수가 자연수|반대한 학생/.test(c);
    const 사람_지면 =
      "어느 학교 전체 학생의 $36\\%$ 가 안경을 쓴 학생입니다. 안경을 쓴 학생 수가 " +
      "자연수이고 전체 학생이 $94$명보다 많고 $109$명보다 적을 때, 전체 학생은 몇 명입니까?";
    expect(사람축(사람_지면), "열쇠가 «예»를 못 낸다 — 도장이다").toBe(true);
    for (const seed of SEEDS) {
      const c = gen("1-5-2", seed, "심화중").content;
      expect(
        사람축(c),
        `1-5-2 seed=${seed}: 1-4 의 «사람 수» 축을 썼다 — ${c}`,
      ).toBe(false);
      expect(
        /자연수 cm/.test(c),
        `1-5-2 seed=${seed}: 눈금을 안 말한다 — ${c}`,
      ).toBe(true);
    }
  });

  it("㉣ 반증 ⑥ · ㉥ 해설이 안 늘어놓는다", () => {
    const bad: string[] = [];
    for (const seed of WIDE_SEEDS) {
      const p = gen("1-5-2", seed, "심화중");
      const ans = readRat(p.answer.replace(/\$/g, "").trim()) as Rat | null;
      const nums = pageNumbers(p.content);
      if (!ans) bad.push(`1-5-2 ${seed} 답 못 읽음`);
      else {
        if (forwardReachable(nums, ans)) bad.push(`1-5-2 ${seed} 순방향`);
        if (answerPrintedOnPage(nums, ans)) bad.push(`1-5-2 ${seed} 지면에 답`);
        if (pmOneStep(nums as R[], ans as R))
          bad.push(`1-5-2 ${seed} ±한 걸음`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    for (const seed of SEEDS)
      expect(
        enumeratedSteps(gen("1-5-2", seed, "심화중").solution),
        `1-5-2 seed=${seed}: 해설이 늘어놓는다`,
      ).toBeLessThan(ENUM_THRESHOLD);
  });
});
