/**
 * 초5 `1-6` 나머지 네 소단원의 난이도 4단 (D-72 확대 1차분).
 *
 * 참은 **찍힌 발문**에서 온다 — 생성기를 되부르지 않고 발문의 수로 넓이·둘레를 손으로
 * 다시 계산한다. 생성기를 부르면 그 생성기가 틀릴 때 시험도 같이 틀린다.
 *
 * 파일럿(`1-6-2`)은 `elementaryG5Tiers.test.ts` 가 지킨다. 여기는 1-6-1·1-6-3·1-6-4·1-6-5.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS, type ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { preprocessMathText } from "@/lib/math/textPreprocess";

const CODES = ["1-6-1", "1-6-3", "1-6-4", "1-6-5"] as const;

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(code),
  )!;

/** 씨앗 16개 — 8개로는 갈래 안쪽 두 가지 중 한쪽이 경계를 못 만난다(파일럿에서 실측). */
const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

const problem = (code: string, tier: ElemTier, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier);

/* ── 분수 뒤 조사 (2026-08-23 곁들이) ──
 * 조사는 «소리 내어 읽은 마지막 소리»가 정하고, 분수는 **분자로 끝난다**(«삼분의 이»).
 * 표본이 아니라 **규칙**으로 잠근다 — 표준·갈래를 한 자리에서 전부 훑는다.
 * 이 결함은 에러가 아니라 «그럴듯한 문장»으로 나가므로 시험이 아니면 아무도 못 본다.
 */

/** «이» 는 계사(-이다)일 수 있다 — «$\frac{5}{10}$이므로» 는 옳다. 주격과 갈라야 한다. */
const COPULA_TAIL = /^(므로|고|다|라|며|면|지만|어야|었|니|기)/;

/** 분수 덩어리 바로 뒤 조사가 분자 소리와 맞는가 — 어긋난 자리를 모아 돌려준다. */
function fracJosaMisses(text: string): string[] {
  const FINAL = new Set([0, 1, 3, 6, 7, 8]);
  const RIEUL = new Set([1, 7, 8]);
  const out: string[] = [];
  const re = /\\frac\{(\d+)\}\{(\d+)\}\$(으로|과|와|은|는|이|가|을|를|로)/g;
  for (const m of text.matchAll(re)) {
    const num = Number(m[1]);
    const josa = m[3]!;
    const rest = text.slice(m.index + m[0].length);
    if (josa === "이" && COPULA_TAIL.test(rest)) continue;
    const d = num % 10;
    const f = FINAL.has(d);
    const r = RIEUL.has(d);
    const ok: Record<string, boolean> = {
      과: f,
      와: !f,
      은: f,
      는: !f,
      이: f,
      가: !f,
      을: f,
      를: !f,
      으로: f && !r,
      로: !f || r,
    };
    if (!ok[josa]) out.push(`분자 ${num} 뒤 «${josa}»`);
  }
  return out;
}

/**
 * KaTeX 덩어리 안의 수. `$12$` 뿐 아니라 `$7\,\mathrm{m}^2$` 도 읽는다 —
 * 단위(`\mathrm{…}`)와 지수(`^2`)는 «값»이 아니므로 먼저 지운다.
 *
 * ⚠️ 처음엔 `\$(\d+)\$` 로만 잡았다. 그러면 1-6-3 의 단위 발문이 통째로 빈 배열이 되어
 * **검산이 아무것도 안 하고 초록**이 된다 — 시험이 눈먼 자리였다.
 */
const nums = (t: string) =>
  [...t.matchAll(/\$([^$]*)\$/g)]
    .map((m) => m[1]!.replace(/\\mathrm\{[^}]*\}/g, " ").replace(/\^\d+/g, " "))
    .flatMap((chunk) => chunk.match(/\d+/g) ?? [])
    .map(Number);

function answerNumber(answer: string, label: string): number {
  expect(answer, `${label}: 정답이 KaTeX 로 안 감싸였다 — ${answer}`).toMatch(
    /^\$\d+\$$/,
  );
  return Number(answer.slice(1, -1));
}

/** KaTeX 밖에 남은 맨 숫자 (R1). */
const bare = (t: string) => t.replace(/\$[^$]*\$/g, " ").match(/\d+/g) ?? [];

/** 한자 수사 → 변의 수 (R4 — 발문에 아라비아 숫자 각형이 있으면 안 된다). */
const SINO_SIDES: Record<string, number> = {
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
};

describe("[초5 1-6] 난이도 4단 확대 (D-72)", () => {
  it("네 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const rows = ELEM_TIERS.map((t) => problem(code, t, seed).content);
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(4);
      }
    }
  });

  it("갈래마다 씨앗에 반응한다 (R9)", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThan(2);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const loose = bare(text);
            if (loose.length)
              bad.push(`${code} ${tier} @${seed} ${where}: ${loose.join(",")}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("도형 이름은 한자 수사다 (R4)", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          expect(
            c.match(/\d+\s*각형/g),
            `${code} ${tier} @${seed}: ${c}`,
          ).toBeNull();
        }
      }
    }
  });

  /* ── 축 성질: 그 소단원에서 갈래를 실제로 가르는 것 ── */

  it("연산 갈래에는 그림이 없다 — 치수가 글로 주어진다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        expect(
          problem(code, "연산", seed).figureSpec,
          `${code} @${seed}`,
        ).toBeNull();
      }
    }
  });

  it("기본 갈래는 «한 겹»을 쓴다 — 그림이면 발문에 치수가 없다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = problem(code, "기본", seed);
        if (p.figureSpec === null) continue; // 문장 한 겹 (1-6-1·1-6-3)
        expect(
          nums(p.content),
          `${code} @${seed}: 그림 문항인데 발문에 수가 있다\n${p.content}`,
        ).toEqual([]);
        const spec = p.figureSpec as { kind?: string };
        expect(spec.kind, `${code} @${seed}`).toBe("areaPoly");
      }
    }
  });

  // ⚠️ 리드 신호(D-66 ⑸): 이웃 소단원끼리 닮으면 안 된다.
  // 1-6-1 기본은 **문장**, 1-6-4·1-6-5 기본은 **그림** — 한 겹의 종류가 다르다.
  it("1-6-1 기본은 문장 한 겹이고 1-6-4·1-6-5 기본은 그림 한 겹이다", () => {
    for (const seed of SEEDS) {
      expect(
        problem("1-6-1", "기본", seed).figureSpec,
        `1-6-1 @${seed}`,
      ).toBeNull();
      for (const code of ["1-6-4", "1-6-5"]) {
        expect(
          problem(code, "기본", seed).figureSpec,
          `${code} @${seed}`,
        ).not.toBeNull();
      }
    }
  });

  /* ── 산술 독립 검산 ── */

  it("1-6-1 — 둘레가 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      // 연산
      const calc = problem("1-6-1", "연산", seed);
      const cn = nums(calc.content);
      const cA = answerNumber(calc.answer, "1-6-1 연산");
      const poly = calc.content.match(/정([가-힣])각형/);
      if (poly) {
        const sides = SINO_SIDES[poly[1]!];
        expect(sides, `한자 수사를 못 읽음: ${poly[1]}`).toBeGreaterThan(0);
        expect(cA, calc.content).toBe(sides! * cn[0]!);
      } else {
        expect(cA, calc.content).toBe(2 * (cn[0]! + cn[1]!));
      }

      // 응용 — 답이 «길이» 여야 한다(1-6-2 응용은 «넓이»다)
      const app = problem("1-6-1", "응용", seed);
      const an = nums(app.content);
      const aA = answerNumber(app.answer, "1-6-1 응용");
      expect(app.content, `응용이 넓이를 묻는다: ${app.content}`).toMatch(
        /몇 cm입니까\?$/,
      );
      const ap = app.content.match(/정([가-힣])각형/);
      if (ap) {
        expect(aA, app.content).toBe(an[0]! / SINO_SIDES[ap[1]!]!);
      } else {
        const [per, d] = an as [number, number];
        expect((per / 2 + d) % 2, app.content).toBe(0);
        expect(aA, app.content).toBe((per / 2 + d) / 2);
      }

      // 심화 — 귀퉁이를 잘라도 둘레는 처음 직사각형과 같다
      const deep = problem("1-6-1", "심화", seed);
      const [w, h, cw, ch] = nums(deep.content) as [
        number,
        number,
        number,
        number,
      ];
      expect(cw, `잘라 낸 조각이 원판보다 크다: ${deep.content}`).toBeLessThan(
        w,
      );
      expect(ch, `잘라 낸 조각이 원판보다 크다: ${deep.content}`).toBeLessThan(
        h,
      );
      expect(answerNumber(deep.answer, "1-6-1 심화"), deep.content).toBe(
        2 * (w + h),
      );
    }
  });

  it("1-6-3 — 단위 환산이 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-6-3", "연산", seed);
      const k = nums(calc.content)[0]!;
      const factor = calc.content.includes("km") ? 1000000 : 10000;
      expect(answerNumber(calc.answer, "1-6-3 연산"), calc.content).toBe(
        k * factor,
      );

      const read = problem("1-6-3", "기본", seed);
      const [rw, rh] = nums(read.content) as [number, number];
      expect(answerNumber(read.answer, "1-6-3 기본"), read.content).toBe(
        rw * rh,
      );

      // 응용 — cm 로 주고 m² 로 묻는다(두 단계). 두 치수가 100 의 배수여야 답이 자연수다.
      const app = problem("1-6-3", "응용", seed);
      const [aw, ah] = nums(app.content) as [number, number];
      expect(aw % 100, app.content).toBe(0);
      expect(ah % 100, app.content).toBe(0);
      expect(answerNumber(app.answer, "1-6-3 응용"), app.content).toBe(
        (aw / 100) * (ah / 100),
      );

      // 심화 — 넓이(m²)와 가로(cm)에서 세로(m) 를 되찾는다
      const deep = problem("1-6-3", "심화", seed);
      const [area, wcm] = nums(deep.content) as [number, number];
      expect(wcm % 100, deep.content).toBe(0);
      expect(area % (wcm / 100), deep.content).toBe(0);
      expect(answerNumber(deep.answer, "1-6-3 심화"), deep.content).toBe(
        area / (wcm / 100),
      );
    }
  });

  it("1-6-4 — 삼각형·평행사변형 넓이가 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-6-4", "연산", seed);
      const [b, h] = nums(calc.content) as [number, number];
      const isTri = calc.content.includes("삼각형");
      expect(answerNumber(calc.answer, "1-6-4 연산"), calc.content).toBe(
        isTri ? (b * h) / 2 : b * h,
      );
      if (isTri)
        expect(
          (b * h) % 2,
          `삼각형 넓이가 자연수가 아니다: ${calc.content}`,
        ).toBe(0);

      // 기본 — 그림의 치수로 검산
      const read = problem("1-6-4", "기본", seed);
      const spec = read.figureSpec as {
        shape: string;
        base: number;
        height: number;
      };
      const area =
        spec.shape === "tri"
          ? (spec.base * spec.height) / 2
          : spec.base * spec.height;
      expect(Number.isInteger(area), `${JSON.stringify(spec)}`).toBe(true);
      expect(answerNumber(read.answer, "1-6-4 기본"), read.content).toBe(area);

      // 응용 — 넓이와 밑변에서 높이를 되찾는다. 답은 «길이» 다.
      const app = problem("1-6-4", "응용", seed);
      const [aArea, aBase] = nums(app.content) as [number, number];
      const aTri = app.content.includes("삼각형");
      expect(answerNumber(app.answer, "1-6-4 응용"), app.content).toBe(
        aTri ? (aArea * 2) / aBase : aArea / aBase,
      );

      // 심화 — 넓이가 같은 두 도형을 잇는다(네 걸음)
      const deep = problem("1-6-4", "심화", seed);
      const [pb, ph, tb] = nums(deep.content) as [number, number, number];
      const th = (2 * pb * ph) / tb;
      expect(
        Number.isInteger(th),
        `높이가 자연수가 아니다: ${deep.content}`,
      ).toBe(true);
      expect(th, `높이가 0 이하다: ${deep.content}`).toBeGreaterThan(0);
      expect(answerNumber(deep.answer, "1-6-4 심화"), deep.content).toBe(th);
    }
  });

  it("1-6-5 — 마름모·사다리꼴 넓이가 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-6-5", "연산", seed);
      const cn = nums(calc.content);
      if (calc.content.includes("마름모")) {
        const [d1, d2] = cn as [number, number];
        expect(d1, `두 대각선이 같으면 정사각형이다: ${calc.content}`).not.toBe(
          d2,
        );
        expect(answerNumber(calc.answer, "1-6-5 연산"), calc.content).toBe(
          (d1 * d2) / 2,
        );
      } else {
        const [top, bot, h] = cn as [number, number, number];
        expect(
          bot,
          `아랫변이 윗변보다 길어야 한다: ${calc.content}`,
        ).toBeGreaterThan(top);
        expect(
          h,
          `높이가 아랫변을 넘으면 사다리꼴로 안 보인다: ${calc.content}`,
        ).toBeLessThanOrEqual(bot);
        expect(answerNumber(calc.answer, "1-6-5 연산"), calc.content).toBe(
          ((top + bot) * h) / 2,
        );
      }

      // 기본 — 그림의 치수로 검산
      const read = problem("1-6-5", "기본", seed);
      const spec = read.figureSpec as {
        shape: string;
        base: number;
        height: number;
        top?: number;
        d2?: number;
      };
      const area =
        spec.shape === "rhombus"
          ? (spec.base * spec.d2!) / 2
          : ((spec.top! + spec.base) * spec.height) / 2;
      expect(Number.isInteger(area), JSON.stringify(spec)).toBe(true);
      expect(answerNumber(read.answer, "1-6-5 기본"), read.content).toBe(area);

      // 응용 — 넓이에서 모르는 변을 되찾는다. 답은 «길이» 다.
      const app = problem("1-6-5", "응용", seed);
      const an = nums(app.content);
      const aA = answerNumber(app.answer, "1-6-5 응용");
      if (app.content.includes("마름모")) {
        const [aArea, d1] = an as [number, number];
        expect(aA, app.content).toBe((aArea * 2) / d1);
      } else {
        const [aArea, bot, h] = an as [number, number, number];
        expect(aA, app.content).toBe((aArea * 2) / h - bot);
      }
      expect(aA, `되찾은 변이 0 이하다: ${app.content}`).toBeGreaterThan(0);

      // 심화 — 합과 차를 조합한다
      const deep = problem("1-6-5", "심화", seed);
      const [dArea, dh, dd] = nums(deep.content) as [number, number, number];
      const sum = (dArea * 2) / dh;
      expect(
        Number.isInteger(sum),
        `두 변의 합이 자연수가 아니다: ${deep.content}`,
      ).toBe(true);
      expect((sum - dd) % 2, `윗변이 자연수가 아니다: ${deep.content}`).toBe(0);
      expect(answerNumber(deep.answer, "1-6-5 심화"), deep.content).toBe(
        (sum - dd) / 2,
      );
    }
  });

  it("씨앗 0~999 어디서도 던지지 않는다 — 뽑을 후보가 비지 않는다", () => {
    // 씨앗 16개로는 못 보는 부류가 있다: `area64Deep` 의 밑변 후보가 **손 목록**이라
    // `2×넓이=98`(밑변 7·높이 7)이면 빈 배열이 되어 `pick` 이 던졌다 — 1,000씨앗에서
    // 30회 실측(2026-08-23). 후보를 약수에서 유도하도록 고쳤고, 여기서 잠근다.
    const fails: string[] = [];
    for (const code of ["1-6-4", "1-6-5", "1-6-1", "1-6-3"] as const) {
      for (const tier of ELEM_TIERS) {
        for (let seed = 0; seed < 1000; seed += 1) {
          try {
            problem(code, tier, seed);
          } catch (err) {
            fails.push(
              `${code} ${tier} @${seed}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }
    expect(fails.slice(0, 5), `던진 자리 ${fails.length}개`).toEqual([]);
  });

  it("이웃 소단원과 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of [...CODES, "1-6-2", ...CODES11]) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const key = p.content;
          const owner = `${code} «${tier}»`;
          const prev = seen.get(key);
          // 같은 (소단원·갈래)가 씨앗을 달리해 겹치는 것은 여기 몫이 아니다 — R9 가 본다.
          // 여기서 막는 것은 **다른 소단원끼리** 같은 발문을 내는 것이다(D-66 ⑸).
          if (prev !== undefined && prev !== owner) {
            expect(
              prev,
              `다른 소단원이 같은 발문을 낸다: ${prev} / ${owner}\n  ${key}`,
            ).toBe(owner);
          }
          seen.set(key, owner);
        }
      }
    }
  });
});

/* ────────── 초5 1-1 자연수의 혼합 계산 — 4단 (D-72 확대 2차) ────────── */

const CODES11 = ["1-1-1", "1-1-2", "1-1-3"] as const;

/**
 * `$…$` 덩어리(발문+해설)에 나타난 연산 기호. 이 대단원은 **소단원 이름이 연산 집합을
 * 내걸므로**(D-66 ⑼) 갈래 넷 전부가 그 집합을 지키는지를 이 열쇠로 잰다.
 */
function opsIn(...texts: string[]): Set<string> {
  const set = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(/\$([^$]*)\$/g)) {
      const chunk = m[1]!;
      if (chunk.includes("\\times")) set.add("×");
      if (chunk.includes("\\div")) set.add("÷");
      if (chunk.includes("+")) set.add("+");
      if (chunk.includes("-")) set.add("−");
    }
  }
  return set;
}

describe("[초5 1-1] 난이도 4단 확대 (D-72 2차)", () => {
  it("세 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES11) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES11) {
      for (const tier of ELEM_TIERS) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES11) {
      for (const seed of SEEDS) {
        const rows = ELEM_TIERS.map((t) => problem(code, t, seed).content);
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(4);
      }
    }
  });

  // 리드 지시(2026-08-23): 갈래마다 변형 8개 이상. R9 의 「>2」보다 세게 잠근다.
  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES11) {
      for (const tier of ELEM_TIERS) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES11) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const loose = bare(text);
            if (loose.length)
              bad.push(`${code} ${tier} @${seed} ${where}: ${loose.join(",")}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("혼합 계산에는 그림이 없다 — 갈래 넷 전부", () => {
    for (const code of CODES11) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          expect(
            problem(code, tier, seed).figureSpec,
            `${code} ${tier} @${seed}`,
          ).toBeNull();
        }
      }
    }
  });

  /* ── 소단원 이름이 내건 연산 집합 (D-66 ⑼) ── */

  it("1-1-1 — 덧뺄 또는 곱나눗 **한 가족만** 쓴다 (수식 기준)", () => {
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        const p = problem("1-1-1", tier, seed);
        const ops = opsIn(p.content, p.solution);
        const addSub = ops.has("+") || ops.has("−");
        const mulDiv = ops.has("×") || ops.has("÷");
        expect(
          addSub && mulDiv,
          `${tier} @${seed}: 두 가족이 섞였다 ${[...ops].join("")}\n${p.content}`,
        ).toBe(false);
        // 심화(잘못 계산)는 한쪽 연산이 말로만 나올 수 있다 — 나머지 갈래는 둘 다 있어야 한다.
        if (tier !== "심화") {
          expect(
            ops.size,
            `${tier} @${seed}: 한 연산뿐이면 «섞여 있는 식»이 아니다\n${p.content}`,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("1-1-2 — 덧·뺄에 곱셈 «또는» 나눗셈 하나만 낀다", () => {
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        const p = problem("1-1-2", tier, seed);
        // 심화(□ 역산)의 해설은 «거꾸로 계산»이라 반대 연산(×↔÷)이 함께 나온다 —
        // 소단원 이름이 조건을 거는 것은 **주어진 식**(발문)이다.
        const ops =
          tier === "심화" ? opsIn(p.content) : opsIn(p.content, p.solution);
        expect(ops.has("+"), `${tier} @${seed}\n${p.content}`).toBe(true);
        expect(ops.has("−"), `${tier} @${seed}\n${p.content}`).toBe(true);
        expect(
          ops.has("×") !== ops.has("÷"),
          `${tier} @${seed}: ×·÷ 는 정확히 하나여야 한다(둘 다면 1-1-3 이다) ${[...ops].join("")}\n${p.content}`,
        ).toBe(true);
      }
    }
  });

  it("1-1-3 — 네 연산이 전부 든다", () => {
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        const p = problem("1-1-3", tier, seed);
        const ops = opsIn(p.content, p.solution);
        expect(
          ops.size,
          `${tier} @${seed}: ${[...ops].join("")}\n${p.content}`,
        ).toBe(4);
      }
    }
  });

  /* ── 산술 독립 검산 + «잘못된 순서 값 ≠ 정답» (리드 지시 2026-08-23) ── */

  it("1-1-1 연산 — 값이 다시 서고, 뒤부터 접은 값과 갈린다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-1", "연산", seed);
      const [a, b, c] = nums(p.content) as [number, number, number];
      const ans = answerNumber(p.answer, "1-1-1 연산");
      // 「도로 접기」 금지 — b == c 면 계산을 안 해도 답이 a 그대로다.
      expect(c, `상쇄 꼴이다: ${p.content}`).not.toBe(b);
      if (p.content.includes("\\div")) {
        expect(a % b, p.content).toBe(0);
        expect(ans, p.content).toBe((a / b) * c);
        // 뒤(b×c)를 먼저 접은 a÷(b×c) 는 정답과 달라야 한다 — 분수 비교 대신 곱으로 잰다.
        expect(ans * b * c, `순서를 안 가른다: ${p.content}`).not.toBe(a);
      } else {
        expect(a, `중간값 자연수: ${p.content}`).toBeGreaterThan(b);
        expect(ans, p.content).toBe(a - b + c);
        expect(a - b - c, `순서를 안 가른다: ${p.content}`).not.toBe(ans);
      }
    }
  });

  it("1-1-2 연산 — 값이 다시 서고, 왼쪽부터 그냥 접은 값과 갈린다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-2", "연산", seed);
      const [a, b, c, d] = nums(p.content) as [number, number, number, number];
      const ans = answerNumber(p.answer, "1-1-2 연산");
      if (p.content.includes("\\times")) {
        expect(a - b * c, `중간값 자연수: ${p.content}`).toBeGreaterThan(0);
        expect(d, `상쇄 꼴이다(뺀 만큼 도로 더함): ${p.content}`).not.toBe(
          b * c,
        );
        expect(ans, p.content).toBe(a - b * c + d);
        expect((a - b) * c + d, `순서를 안 가른다: ${p.content}`).not.toBe(ans);
      } else {
        expect(b % c, p.content).toBe(0);
        expect(d, `상쇄 꼴이다(더한 몫만큼 도로 뺌): ${p.content}`).not.toBe(
          b / c,
        );
        expect(ans, p.content).toBe(a + b / c - d);
        expect(ans, p.content).toBeGreaterThan(0);
        // 왼쪽부터 값 (a+b)÷c−d 와 갈린다 — 분수 비교 대신 곱으로 잰다.
        expect((ans + d) * c, `순서를 안 가른다: ${p.content}`).not.toBe(a + b);
      }
    }
  });

  it("1-1-3 연산 — 값이 다시 서고, 왼쪽부터 그냥 접은 값과 갈린다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-3", "연산", seed);
      const [a, b, c, d, e] = nums(p.content) as [
        number,
        number,
        number,
        number,
        number,
      ];
      const ans = answerNumber(p.answer, "1-1-3 연산");
      expect(d % e, p.content).toBe(0);
      if (p.content.startsWith("$(")) {
        expect(a, `중간값 자연수: ${p.content}`).toBeGreaterThan(b);
        expect(ans, p.content).toBe((a - b) * c + d / e);
        expect((a - b) * c + d, `순서를 안 가른다: ${p.content}`).not.toBe(
          ans * e,
        );
      } else {
        expect(
          c,
          `상쇄 꼴이다(더한 만큼 몫으로 도로 뺌): ${p.content}`,
        ).not.toBe(d / e);
        expect(ans, p.content).toBe(a * b + c - d / e);
        expect(a * b + c - d, `순서를 안 가른다: ${p.content}`).not.toBe(
          ans * e,
        );
      }
    }
  });

  it("1-1-1 기본·응용 — 발문의 수로 답이 다시 선다", () => {
    for (const seed of SEEDS) {
      const read = problem("1-1-1", "기본", seed);
      const [a, b, c] = nums(read.content) as [number, number, number];
      const rA = answerNumber(read.answer, "1-1-1 기본");
      if (read.content.includes("정거장")) {
        expect(a, read.content).toBeGreaterThan(b);
        expect(c, `상쇄 꼴이다(내린 만큼 도로 탐): ${read.content}`).not.toBe(
          b,
        );
        expect(rA, read.content).toBe(a - b + c);
      } else {
        expect(a % b, read.content).toBe(0);
        expect(c, `도막은 ${b}개뿐이다: ${read.content}`).toBeLessThan(b);
        expect(rA, read.content).toBe((a / b) * c);
      }

      const app = problem("1-1-1", "응용", seed);
      const an = nums(app.content) as [number, number, number];
      const aA = answerNumber(app.answer, "1-1-1 응용");
      if (app.content.includes("봉지")) {
        expect((an[0] * an[1]) % an[2], app.content).toBe(0);
        // c ∈ {a, b} 면 ×a÷a 꼴로 접혀 답이 발문의 수 그대로다.
        expect(an[2], `상쇄 꼴이다: ${app.content}`).not.toBe(an[0]);
        expect(an[2], `상쇄 꼴이다: ${app.content}`).not.toBe(an[1]);
        expect(aA, app.content).toBe((an[0] * an[1]) / an[2]);
      } else {
        expect(aA, app.content).toBe(an[0] - an[1] - an[2]);
        expect(aA, app.content).toBeGreaterThan(0);
      }
    }
  });

  it("1-1-1 심화 — 어떤 수를 되찾아 바르게 계산한 값이 맞다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-1", "심화", seed);
      const ans = answerNumber(p.answer, "1-1-1 심화");
      if (p.content.includes("더해야")) {
        // 잘못: x−b=c → x=c+b, 바르게: x+b=c+2b
        const [b, c] = nums(p.content) as [number, number];
        expect(ans, p.content).toBe(c + 2 * b);
      } else {
        // 「$b$를 곱해야 … $b$로 나누었더니 $c$」 — b 가 발문에 두 번 찍힌다(조사 «로» 앞).
        const [b, b2, c] = nums(p.content) as [number, number, number];
        expect(b2, `곱하는 수와 나누는 수가 다르다: ${p.content}`).toBe(b);
        // 잘못: x÷b=c → x=b×c, 바르게: x×b=b²c
        expect(ans, p.content).toBe(b * b * c);
      }
    }
  });

  it("1-1-2 기본·응용 — 발문의 수로 답이 다시 선다", () => {
    for (const seed of SEEDS) {
      const read = problem("1-1-2", "기본", seed);
      const rn = nums(read.content) as [number, number, number, number];
      const rA = answerNumber(read.answer, "1-1-2 기본");
      if (read.content.includes("친구")) {
        expect(rn[0] - rn[1] * rn[2], read.content).toBeGreaterThan(0);
        expect(rn[3], `상쇄 꼴이다: ${read.content}`).not.toBe(rn[1] * rn[2]);
        expect(rA, read.content).toBe(rn[0] - rn[1] * rn[2] + rn[3]);
      } else {
        expect(rn[0] % rn[1], read.content).toBe(0);
        expect(rn[3], `상쇄 꼴이다: ${read.content}`).not.toBe(rn[2]);
        expect(rA, read.content).toBe(rn[0] / rn[1] + rn[2] - rn[3]);
        expect(rA, read.content).toBeGreaterThan(0);
      }

      const app = problem("1-1-2", "응용", seed);
      const aA = answerNumber(app.answer, "1-1-2 응용");
      if (app.content.includes("문구점")) {
        const [b, c, d, e, a] = nums(app.content) as [
          number,
          number,
          number,
          number,
          number,
        ];
        expect(
          a,
          `치른 돈이 물건값보다 커야 한다: ${app.content}`,
        ).toBeGreaterThan(b * c + d * e);
        expect(aA, app.content).toBe(a - (b * c + d * e));
      } else {
        const [a, b, c, d] = nums(app.content) as [
          number,
          number,
          number,
          number,
        ];
        expect((a - b) % c, app.content).toBe(0);
        expect(aA, app.content).toBe((a - b) / c + d);
      }
    }
  });

  it("1-1-2 심화 — □를 발문의 식에 되넣으면 등식이 선다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-2", "심화", seed);
      const [a, c, d, r] = nums(p.content) as [number, number, number, number];
      const ans = answerNumber(p.answer, "1-1-2 심화");
      if (p.content.includes("\\square\\times")) {
        expect(a + ans * c - d, p.content).toBe(r);
        expect(a + ans * c, `중간값 자연수: ${p.content}`).toBeGreaterThan(d);
      } else {
        expect(ans % c, `□÷${c} 가 나누어떨어져야 한다: ${p.content}`).toBe(0);
        expect(a - ans / c + d, p.content).toBe(r);
        expect(a, `중간값 자연수: ${p.content}`).toBeGreaterThan(ans / c);
      }
    }
  });

  it("1-1-3 기본·응용 — 발문의 수로 답이 다시 서고 나눗셈이 떨어진다", () => {
    for (const seed of SEEDS) {
      const read = problem("1-1-3", "기본", seed);
      const rn = nums(read.content) as [number, number, number, number, number];
      const rA = answerNumber(read.answer, "1-1-3 기본");
      if (read.content.includes("통")) {
        expect(rn[0] % rn[1], read.content).toBe(0);
        expect(
          rn[4],
          `상쇄 꼴이다(부은 만큼 도로 덞): ${read.content}`,
        ).not.toBe(rn[2] * rn[3]);
        expect(rA, read.content).toBe(rn[0] / rn[1] + rn[2] * rn[3] - rn[4]);
        expect(rA, read.content).toBeGreaterThan(0);
      } else {
        expect(rn[3] % rn[4], read.content).toBe(0);
        expect(rn[0] - rn[1] * rn[2], read.content).toBeGreaterThan(0);
        expect(rn[3] / rn[4], `상쇄 꼴이다: ${read.content}`).not.toBe(
          rn[1] * rn[2],
        );
        expect(rA, read.content).toBe(rn[0] - rn[1] * rn[2] + rn[3] / rn[4]);
      }

      const app = problem("1-1-3", "응용", seed);
      const an = nums(app.content) as [number, number, number, number, number];
      const aA = answerNumber(app.answer, "1-1-3 응용");
      if (app.content.includes("상자")) {
        const [c, d, g, people, e] = an;
        expect((c * d + g) % people, app.content).toBe(0);
        expect(
          g,
          `낱개가 상자 하나를 채우면 안 된다: ${app.content}`,
        ).toBeLessThanOrEqual(d);
        expect(aA, app.content).toBe((c * d + g) / people - e);
        expect(aA, app.content).toBeGreaterThan(0);
      } else {
        const [a, b, c, d, e] = an;
        expect(a - b * c, `중간값 자연수: ${app.content}`).toBeGreaterThan(0);
        expect((a - b * c) % d, app.content).toBe(0);
        expect(aA, app.content).toBe((a - b * c) / d + e);
      }
    }
  });

  it("1-1-3 심화 — 차가 맞거나 □가 등식에 되들어간다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-3", "심화", seed);
      const ans = answerNumber(p.answer, "1-1-3 심화");
      if (p.content.includes("괄호를 빠뜨리고")) {
        const [a, b, c, d, e, a2, b2, c2, d2, e2] = nums(p.content) as [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ];
        expect([a2, b2, c2, d2, e2], p.content).toEqual([a, b, c, d, e]);
        expect(d % e, p.content).toBe(0);
        const right = (a - b) * c + d / e;
        const wrong = a - b * c + d / e;
        expect(
          wrong,
          `잘못 계산한 값도 자연수여야 한다: ${p.content}`,
        ).toBeGreaterThan(0);
        expect(ans, p.content).toBe(right - wrong);
        expect(ans, p.content).toBeGreaterThan(0);
      } else {
        const [b, c, m1, m2, r] = nums(p.content) as [
          number,
          number,
          number,
          number,
          number,
        ];
        expect(ans, `□−${b} 가 자연수여야 한다: ${p.content}`).toBeGreaterThan(
          b,
        );
        expect((ans - b) % c, p.content).toBe(0);
        expect((ans - b) / c + m1 * m2, p.content).toBe(r);
      }
    }
  });

  it("1-1 세 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES11) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const owner = `${code} «${tier}»`;
          const prev = seen.get(p.content);
          if (prev !== undefined && prev !== owner) {
            expect(
              prev,
              `다른 소단원이 같은 발문을 낸다: ${prev} / ${owner}\n  ${p.content}`,
            ).toBe(owner);
          }
          seen.set(p.content, owner);
        }
      }
    }
  });
});

/* ────────── 초5 1-2 약수와 배수 — 4단 (D-72 확대 3차) ────────── */

const CODES12 = ["1-2-1", "1-2-2", "1-2-3", "1-2-4", "1-2-5", "1-2-6"] as const;

/* 참은 발문의 수 + 시험 자신의 산술로 다시 선다 — 생성기의 math.ts 를 부르지 않는다. */
const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));
const lcm2 = (a: number, b: number): number => (a * b) / gcd2(a, b);
function divs(v: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= v; i += 1) if (v % i === 0) out.push(i);
  return out;
}
const related = (x: number, y: number): boolean => x % y === 0 || y % x === 0;

describe("[초5 1-2] 난이도 4단 확대 (D-72 3차)", () => {
  it("여섯 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES12) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES12) {
      for (const tier of ELEM_TIERS) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES12) {
      for (const seed of SEEDS) {
        const rows = ELEM_TIERS.map((t) => problem(code, t, seed).content);
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(4);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES12) {
      for (const tier of ELEM_TIERS) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES12) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const loose = bare(text);
            if (loose.length)
              bad.push(`${code} ${tier} @${seed} ${where}: ${loose.join(",")}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("약수와 배수에는 그림이 없다 — 갈래 넷 전부", () => {
    for (const code of CODES12) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          expect(
            problem(code, tier, seed).figureSpec,
            `${code} ${tier} @${seed}`,
          ).toBeNull();
        }
      }
    }
  });

  /* ── 낱말 축 (D-66 ⑸) — 소단원 주제가 발문의 낱말에서 갈린다 ── */

  it("1-2-1·1-2-2 발문에는 공약수·공배수 계열 낱말이 없다", () => {
    for (const code of ["1-2-1", "1-2-2"]) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          expect(
            /공약수|공배수/.test(c),
            `${code} ${tier} @${seed}\n${c}`,
          ).toBe(false);
        }
      }
    }
  });

  it("1-2-3 발문은 공약수 쪽이고 1-2-5 발문은 공배수 쪽이다", () => {
    for (const seed of SEEDS) {
      for (const tier of ELEM_TIERS) {
        const c3 = problem("1-2-3", tier, seed).content;
        expect(/공약수/.test(c3), `1-2-3 ${tier} @${seed}\n${c3}`).toBe(true);
        expect(/공배수/.test(c3), `1-2-3 ${tier} @${seed}\n${c3}`).toBe(false);
        const c5 = problem("1-2-5", tier, seed).content;
        expect(/공배수/.test(c5), `1-2-5 ${tier} @${seed}\n${c5}`).toBe(true);
        expect(/공약수/.test(c5), `1-2-5 ${tier} @${seed}\n${c5}`).toBe(false);
        // 1-2-4 는 공배수를, 1-2-6 은 «최대공약수»를 입에 올리지 않는다.
        const c4 = problem("1-2-4", tier, seed).content;
        expect(/공배수/.test(c4), `1-2-4 ${tier} @${seed}\n${c4}`).toBe(false);
        const c6 = problem("1-2-6", tier, seed).content;
        expect(/최대공약수/.test(c6), `1-2-6 ${tier} @${seed}\n${c6}`).toBe(
          false,
        );
      }
    }
  });

  /* ── 산술 독립 검산 ── */

  it("1-2-1 — 약수·배수가 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-2-1", "연산", seed);
      const cA = answerNumber(calc.answer, "1-2-1 연산");
      if (calc.content.includes("약수")) {
        const [num] = nums(calc.content) as [number];
        expect(cA, calc.content).toBe(divs(num)[1]);
      } else {
        const [b, k] = nums(calc.content) as [number, number];
        expect(cA, calc.content).toBe(b * k);
      }

      const read = problem("1-2-1", "기본", seed);
      const rA = answerNumber(read.answer, "1-2-1 기본");
      const [head, ...shown] = nums(read.content) as [number, ...number[]];
      expect(shown.length, read.content).toBe(4);
      if (read.content.includes("아닌")) {
        const strangers = shown.filter((v) => head % v !== 0);
        expect(strangers, read.content).toEqual([rA]);
      } else {
        const multiples = shown.filter((v) => v % head === 0);
        expect(multiples, read.content).toEqual([rA]);
      }

      const app = problem("1-2-1", "응용", seed);
      const aA = answerNumber(app.answer, "1-2-1 응용");
      if (app.content.includes("부터")) {
        const [, M, b] = nums(app.content) as [number, number, number];
        expect(M % b, `경계가 배수에 앉으면 안 된다: ${app.content}`).not.toBe(
          0,
        );
        expect(aA, app.content).toBe(Math.floor(M / b));
      } else {
        const [num, K] = nums(app.content) as [number, number];
        expect(divs(num), `K 는 약수여야 그럴듯하다: ${app.content}`).toContain(
          K,
        );
        expect(aA, app.content).toBe(divs(num).filter((v) => v > K).length);
      }

      const deep = problem("1-2-1", "심화", seed);
      if (deep.content.includes("\\square")) {
        const shownD = nums(deep.content);
        const num = Math.max(...shownD);
        const missing = divs(num).filter((v) => !shownD.includes(v));
        expect(missing, deep.content).toEqual([
          answerNumber(deep.answer, "1-2-1 심화"),
        ]);
      } else {
        const [num, m] = nums(deep.content) as [number, number];
        expect(nums(deep.answer), deep.content).toEqual(
          divs(num).filter((v) => v % m === 0),
        );
      }
    }
  });

  it("1-2-2 — 관계가 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-2-2", "연산", seed);
      const eq = calc.content.match(
        /\$(?:(\d+)\\times\\square|\\square\\times(\d+))=(\d+)\$/,
      )!;
      const factor = Number(eq[1] ?? eq[2]);
      const product = Number(eq[3]);
      expect(
        factor * answerNumber(calc.answer, "1-2-2 연산"),
        calc.content,
      ).toBe(product);

      const read = problem("1-2-2", "기본", seed);
      if (read.content.includes("기호")) {
        const [x, y, u, v] = nums(read.content) as [
          number,
          number,
          number,
          number,
        ];
        const firstRelated = related(x, y);
        expect(
          firstRelated !== related(u, v),
          `정확히 한 짝만 관계여야 한다: ${read.content}`,
        ).toBe(true);
        expect(read.answer, read.content).toBe(firstRelated ? "㉠" : "㉡");
      } else {
        const [c, a] = nums(read.content) as [number, number];
        expect(c % a, read.content).toBe(0);
        expect(read.answer, read.content).toBe("약수");
      }

      const app = problem("1-2-2", "응용", seed);
      if (app.content.includes("곱셈식")) {
        const [c, p, q] = nums(app.content) as [number, number, number];
        expect(p * q, app.content).toBe(c);
        expect(nums(app.answer), app.content).toEqual([
          1,
          Math.min(p, q),
          Math.max(p, q),
          c,
        ]);
      } else {
        const [a, ...shown] = nums(app.content) as [number, ...number[]];
        const good = shown.filter((v) => related(v, a)).sort((x, y) => x - y);
        expect(good.length, app.content).toBe(2);
        expect(nums(app.answer), app.content).toEqual(good);
      }

      const deep = problem("1-2-2", "심화", seed);
      // ㉯(범위 속 배수)도 「…보다 작을 때」를 담는다 — «보다 크고»가 갈라 준다.
      if (!deep.content.includes("보다 크고")) {
        const [num] = nums(deep.content) as [number];
        expect(nums(deep.answer), deep.content).toEqual(divs(num).slice(0, -1));
      } else {
        const [b, , L] = nums(deep.content) as [number, number, number];
        const want: number[] = [];
        for (let v = b + 1; v < L; v += 1) if (v % b === 0) want.push(v);
        expect(nums(deep.answer), deep.content).toEqual(want);
        expect(want.length, deep.content).toBeGreaterThan(0);
      }
    }
  });

  it("1-2-3 — 공약수 집합이 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-2-3", "연산", seed);
      if (calc.content.includes("어떤 두 수")) {
        const [g] = nums(calc.content) as [number];
        expect(nums(calc.answer), calc.content).toEqual(divs(g));
      } else {
        const [a, b] = nums(calc.content) as [number, number];
        const cd = divs(gcd2(a, b));
        expect(answerNumber(calc.answer, "1-2-3 연산"), calc.content).toBe(
          cd[cd.length - 2],
        );
      }

      const read = problem("1-2-3", "기본", seed);
      if (read.content.includes("아닌")) {
        const [a, b, ...shown] = nums(read.content) as [
          number,
          number,
          ...number[],
        ];
        const strangers = shown.filter((v) => !(a % v === 0 && b % v === 0));
        expect(strangers, read.content).toEqual([
          answerNumber(read.answer, "1-2-3 기본"),
        ]);
      } else {
        const [g] = nums(read.content) as [number];
        expect(answerNumber(read.answer, "1-2-3 기본"), read.content).toBe(
          divs(g).length,
        );
      }

      const app = problem("1-2-3", "응용", seed);
      const cdApp = (a: number, b: number) => divs(gcd2(a, b));
      if (app.content.includes("더하면")) {
        const [a, b] = nums(app.content) as [number, number];
        expect(answerNumber(app.answer, "1-2-3 응용"), app.content).toBe(
          cdApp(a, b).reduce((x, y) => x + y, 0),
        );
      } else {
        const [a, b, K] = nums(app.content) as [number, number, number];
        const rest = cdApp(a, b).filter((v) => v > K);
        expect(rest.length, app.content).toBeGreaterThan(0);
        expect(nums(app.answer), app.content).toEqual(rest);
      }

      const deep = problem("1-2-3", "심화", seed);
      if (deep.content.includes("모두 쓰면")) {
        const shown = nums(deep.content);
        const g = answerNumber(deep.answer, "1-2-3 심화");
        expect(shown, deep.content).toEqual(divs(g));
      } else {
        const [x, y, z] = nums(deep.content) as [number, number, number];
        const g = gcd2(gcd2(x, y), z);
        expect(
          g,
          `세 수가 서로소면 물을 것이 없다: ${deep.content}`,
        ).toBeGreaterThan(1);
        expect(answerNumber(deep.answer, "1-2-3 심화"), deep.content).toBe(g);
      }
    }
  });

  it("1-2-4 — 최대공약수 활용이 다시 서고, 나누는 수 > 나머지다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-2-4", "연산", seed);
      {
        const [a, b] = nums(calc.content) as [number, number];
        expect(answerNumber(calc.answer, "1-2-4 연산"), calc.content).toBe(
          gcd2(a, b),
        );
      }

      const read = problem("1-2-4", "기본", seed);
      {
        const [a, b] = nums(read.content) as [number, number];
        expect(answerNumber(read.answer, "1-2-4 기본"), read.content).toBe(
          gcd2(a, b),
        );
      }

      const app = problem("1-2-4", "응용", seed);
      {
        const [a, b] = nums(app.content) as [number, number];
        const g = gcd2(a, b);
        const aA = answerNumber(app.answer, "1-2-4 응용");
        if (app.content.includes("밤")) {
          expect(aA, app.content).toBe(a / g);
        } else {
          expect(aA, app.content).toBe((a / g) * (b / g));
        }
      }

      const deep = problem("1-2-4", "심화", seed);
      const dA = answerNumber(deep.answer, "1-2-4 심화");
      if (deep.content.includes("나머지가")) {
        const [a, r1, b, r2] = nums(deep.content) as [
          number,
          number,
          number,
          number,
        ];
        // 리드 경계(2026-08-23): 나누는 수는 나머지보다 커야 한다 — 어기면 그럴듯한 오답.
        expect(dA, `나누는 수 ≤ 나머지: ${deep.content}`).toBeGreaterThan(r1);
        expect(dA, `나누는 수 ≤ 나머지: ${deep.content}`).toBeGreaterThan(r2);
        expect((a - r1) % dA, deep.content).toBe(0);
        expect((b - r2) % dA, deep.content).toBe(0);
        // 최대성 — 이보다 큰 공약수가 남아 있으면 «가장 큰»이 거짓이다.
        expect(gcd2(a - r1, b - r2), deep.content).toBe(dA);
      } else {
        const [a, b] = nums(deep.content) as [number, number];
        expect(dA, deep.content).toBe(divs(gcd2(a, b)).length);
      }
    }
  });

  it("1-2-5 — 공배수 집합이 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-2-5", "연산", seed);
      if (calc.content.includes("어떤 두 수")) {
        const [m] = nums(calc.content) as [number];
        expect(nums(calc.answer), calc.content).toEqual([m, 2 * m, 3 * m]);
      } else {
        const [a, b] = nums(calc.content) as [number, number];
        expect(answerNumber(calc.answer, "1-2-5 연산"), calc.content).toBe(
          lcm2(a, b),
        );
      }

      const read = problem("1-2-5", "기본", seed);
      if (read.content.includes("찾아 쓰시오")) {
        const [a, b, ...shown] = nums(read.content) as [
          number,
          number,
          ...number[],
        ];
        const m = lcm2(a, b);
        const commons = shown.filter((v) => v % m === 0);
        expect(commons, read.content).toEqual([
          answerNumber(read.answer, "1-2-5 기본"),
        ]);
      } else {
        const [m, k] = nums(read.content) as [number, number];
        expect(answerNumber(read.answer, "1-2-5 기본"), read.content).toBe(
          k * m,
        );
      }

      const app = problem("1-2-5", "응용", seed);
      const aA = answerNumber(app.answer, "1-2-5 응용");
      if (app.content.includes("부터")) {
        const [, L, a, b] = nums(app.content) as [
          number,
          number,
          number,
          number,
        ];
        const m = lcm2(a, b);
        expect(
          L,
          `범위가 100 을 넘는다(수 규모): ${app.content}`,
        ).toBeLessThanOrEqual(100);
        expect(
          L % m,
          `경계가 공배수에 앉으면 안 된다: ${app.content}`,
        ).not.toBe(0);
        expect(aA, app.content).toBe(Math.floor(L / m));
      } else {
        const [a, b, K] = nums(app.content) as [number, number, number];
        const m = lcm2(a, b);
        expect(aA % m, app.content).toBe(0);
        expect(
          Math.abs(K - aA) * 2,
          `가장 가까운 수가 갈린다(동률): ${app.content}`,
        ).toBeLessThan(m);
      }

      const deep = problem("1-2-5", "심화", seed);
      if (deep.content.includes("세 번째로 작은 수가")) {
        const [T] = nums(deep.content) as [number];
        expect(answerNumber(deep.answer, "1-2-5 심화") * 3, deep.content).toBe(
          T,
        );
      } else {
        const [x, y, z] = nums(deep.content) as [number, number, number];
        expect(answerNumber(deep.answer, "1-2-5 심화"), deep.content).toBe(
          lcm2(lcm2(x, y), z),
        );
      }
    }
  });

  it("1-2-6 — 최소공배수 활용이 다시 서고, 나머지 < 나누는 수다", () => {
    for (const seed of SEEDS) {
      const calc = problem("1-2-6", "연산", seed);
      const cA = answerNumber(calc.answer, "1-2-6 연산");
      if (calc.content.includes("공약수")) {
        const [g, p, q] = nums(calc.content) as [number, number, number];
        expect(
          gcd2(p, q),
          `두 몫이 서로 나눠지면 답이 틀린다: ${calc.content}`,
        ).toBe(1);
        expect(cA, calc.content).toBe(g * p * q);
      } else {
        const [a, b] = nums(calc.content) as [number, number];
        expect(cA, calc.content).toBe(lcm2(a, b));
      }

      const read = problem("1-2-6", "기본", seed);
      {
        const [a, b] = nums(read.content) as [number, number];
        expect(answerNumber(read.answer, "1-2-6 기본"), read.content).toBe(
          lcm2(a, b),
        );
      }

      const app = problem("1-2-6", "응용", seed);
      const aA = answerNumber(app.answer, "1-2-6 응용");
      if (app.content.includes("전등")) {
        const [a, b, T] = nums(app.content) as [number, number, number];
        const m = lcm2(a, b);
        expect(
          T,
          `시간이 100초를 넘는다(수 규모): ${app.content}`,
        ).toBeLessThanOrEqual(100);
        expect(
          T % m,
          `경계에 앉으면 «몇 번»이 갈린다: ${app.content}`,
        ).not.toBe(0);
        expect(aA, app.content).toBe(Math.floor(T / m));
      } else {
        const [a, b] = nums(app.content) as [number, number];
        const m = lcm2(a, b);
        expect(aA, app.content).toBe((m / a) * (m / b));
      }

      const deep = problem("1-2-6", "심화", seed);
      const dA = answerNumber(deep.answer, "1-2-6 심화");
      if (deep.content.includes("나머지가")) {
        const [a, b, r] = nums(deep.content) as [number, number, number];
        // 리드 경계(2026-08-23): 나머지는 «모든» 나누는 수보다 작아야 한다.
        expect(r, `나머지 ≥ 나누는 수: ${deep.content}`).toBeLessThan(a);
        expect(r, `나머지 ≥ 나누는 수: ${deep.content}`).toBeLessThan(b);
        expect((dA - r) % a, deep.content).toBe(0);
        expect((dA - r) % b, deep.content).toBe(0);
        // 최소성 — 나머지를 뺀 것이 최소공배수 그 자체여야 한다.
        expect(dA - r, deep.content).toBe(lcm2(a, b));
      } else {
        const [M, a] = nums(deep.content) as [number, number];
        expect(lcm2(a, dA), deep.content).toBe(M);
        // 최소성 — 더 작은 후보가 남아 있으면 «가장 작은»이 거짓이다.
        for (let d = 1; d < dA; d += 1) {
          if (M % d === 0) {
            expect(lcm2(a, d), `더 작은 후보 ${d}: ${deep.content}`).not.toBe(
              M,
            );
          }
        }
      }
    }
  });

  /**
   * 나머지 조건의 경계는 씨앗 16개로 못 지킨다 — 뽑는 범위를 한 칸 넓히는 변이가
   * 16개 씨앗에서는 위반 값을 안 뽑아 초록이었다(2026-08-23 변이 하네스 실측).
   * 200개를 쓸어 위반이 «뽑힐 수 있으면 반드시 뽑히게» 한다. 분기 표본 수도 세어
   * 쓸기가 헛돌지 않았음을 함께 잠근다(0 은 「깨끗」과 「못 셈」을 구분하지 않는다).
   */
  it("나머지 조건의 경계 — 나누는 수 > 나머지 (씨앗 200개 쓸기)", () => {
    let hit4 = 0;
    let hit6 = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const d4 = problem("1-2-4", "심화", seed);
      if (d4.content.includes("나머지가")) {
        hit4 += 1;
        const [a, r1, b, r2] = nums(d4.content) as [
          number,
          number,
          number,
          number,
        ];
        const ans = answerNumber(d4.answer, "1-2-4 심화");
        expect(ans, `나누는 수 ≤ 나머지: ${d4.content}`).toBeGreaterThan(
          Math.max(r1, r2),
        );
        expect(gcd2(a - r1, b - r2), d4.content).toBe(ans);
      }
      const d6 = problem("1-2-6", "심화", seed);
      if (d6.content.includes("나머지가")) {
        hit6 += 1;
        const [a, b, r] = nums(d6.content) as [number, number, number];
        expect(r, `나머지 ≥ 나누는 수: ${d6.content}`).toBeLessThan(
          Math.min(a, b),
        );
        expect(answerNumber(d6.answer, "1-2-6 심화") - r, d6.content).toBe(
          lcm2(a, b),
        );
      }
    }
    expect(hit4, "1-2-4 나머지 분기가 쓸기에 안 걸렸다").toBeGreaterThan(20);
    expect(hit6, "1-2-6 나머지 분기가 쓸기에 안 걸렸다").toBeGreaterThan(20);
  });

  it("1-2 여섯 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES12) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const owner = `${code} «${tier}»`;
          const prev = seen.get(p.content);
          if (prev !== undefined && prev !== owner) {
            expect(
              prev,
              `다른 소단원이 같은 발문을 낸다: ${prev} / ${owner}\n  ${p.content}`,
            ).toBe(owner);
          }
          seen.set(p.content, owner);
        }
      }
    }
  });
});

/* ── 1-3 대응 관계 (D-72 4차) — 재검산 도우미 ── */

const CODES13 = ["1-3-1", "1-3-2", "1-3-3"] as const;

/**
 * 정본 꼴 대응식 답 파서 — «△=□×k · △=□+c · △=□−c» 밖의 꼴이면 여기서 죽는다
 * (기호 규약 2026-08-23 리드 확정: 종속량 왼쪽 · □ 먼저 · 상수 뒤 · x·y 금지).
 */
function parseRel(answer: string, label: string): (x: number) => number {
  const m = /^\$\\triangle=\\square(?:\\times(\d+)|\+(\d+)|-(\d+))\$$/.exec(
    answer,
  );
  expect(m, `${label}: 정본 꼴이 아니다 — ${answer}`).not.toBeNull();
  if (m![1] !== undefined) {
    const k = Number(m![1]);
    expect(
      k,
      `${label}: 배는 2 이상이어야 한다(1배는 항등)`,
    ).toBeGreaterThanOrEqual(2);
    return (x) => x * k;
  }
  if (m![2] !== undefined) {
    const c = Number(m![2]);
    return (x) => x + c;
  }
  const c = Number(m![3]!);
  return (x) => x - c;
}

/** 대응표를 (□값, △값) 문자열 짝으로 — 가로꼴(윗줄 □·아랫줄 △)을 함께 잠근다. */
function tablePairs(
  p: { figureSpec: Record<string, unknown> | null },
  label: string,
): [string, string][] {
  const spec = p.figureSpec as {
    kind?: string;
    headers?: string[];
    rows?: string[][];
  } | null;
  expect(spec?.kind, `${label}: 대응표가 없다`).toBe("table");
  const headers = spec!.headers!;
  const rows = spec!.rows!;
  expect(headers[0], label).toBe("□");
  expect(rows.length, label).toBe(1);
  expect(rows[0]![0], label).toBe("△");
  expect(headers.length, label).toBe(5);
  return headers.slice(1).map((h, i) => [h, rows[0]![i + 1]!]);
}

/**
 * 수 짝만 보고 관계를 되찾는다 — 곱(×k)·더함(+c) 중 **정확히 하나**만 맞아야 한다.
 * 둘 다 맞으면 표가 애매한 것이고, 하나도 안 맞으면 표가 깨진 것이다.
 */
function inferRel(
  pairs: [string, string][],
  label: string,
): (x: number) => number {
  const numeric = pairs
    .filter(([a, b]) => /^\d+$/.test(a) && /^\d+$/.test(b))
    .map(([a, b]) => [Number(a), Number(b)] as const);
  expect(
    numeric.length,
    `${label}: 관계를 세울 수 짝이 둘보다 적다`,
  ).toBeGreaterThanOrEqual(2);
  const [x0, y0] = numeric[0]!;
  const fits: ((x: number) => number)[] = [];
  if (y0 % x0 === 0 && y0 / x0 >= 2) {
    const k = y0 / x0;
    if (numeric.every(([x, y]) => y === x * k)) fits.push((x) => x * k);
  }
  if (y0 !== x0) {
    const c = y0 - x0;
    if (numeric.every(([x, y]) => y - x === c)) fits.push((x) => x + c);
  }
  expect(fits.length, `${label}: 관계가 하나로 안 선다(${fits.length}개)`).toBe(
    1,
  );
  return fits[0]!;
}

describe("[초5 1-3] 난이도 4단 확대 (D-72 4차)", () => {
  it("세 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES13) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES13) {
      for (const tier of ELEM_TIERS) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES13) {
      for (const seed of SEEDS) {
        const rows = ELEM_TIERS.map((t) => problem(code, t, seed).content);
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(4);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES13) {
      for (const tier of ELEM_TIERS) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES13) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const loose = bare(text);
            if (loose.length)
              bad.push(`${code} ${tier} @${seed} ${where}: ${loose.join(",")}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("표는 1-3-1·1-3-2 에만 붙고(□·△ 가로꼴), 1-3-3 은 그림이 없다", () => {
    for (const code of ["1-3-1", "1-3-2"] as const) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          tablePairs(problem(code, tier, seed), `${code} ${tier} @${seed}`);
        }
      }
    }
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        expect(
          problem("1-3-3", tier, seed).figureSpec,
          `1-3-3 ${tier} @${seed}`,
        ).toBeNull();
      }
    }
  });

  it("x·y 가 어디에도 없다 — 갈래 넷 + 표준(옛 경로), 표 속까지", () => {
    // LaTeX 명령(\triangle 등)을 걷어 낸 뒤 남는 라틴 글자가 있으면 안 된다.
    // x·y 만 세면 «다른 문자로 돌아온 회귀»(a·b·k …)를 못 본다.
    const latinLeft = (t: string) =>
      t.replace(/\\[a-zA-Z]+/g, " ").match(/[A-Za-z]/g) ?? [];
    const cellsOf = (spec: Record<string, unknown> | null): string => {
      if (!spec) return "";
      const s = spec as { headers?: string[]; rows?: string[][] };
      return [...(s.headers ?? []), ...(s.rows ?? []).flat()].join(" ");
    };
    for (const code of CODES13) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
            ["표", cellsOf(p.figureSpec)],
          ] as const) {
            expect(
              latinLeft(text),
              `${code} ${tier} @${seed} ${where}: ${text}`,
            ).toEqual([]);
          }
        }
      }
      // 표준(갈래 없이 — 옛 correspond 경로)도 같은 규약이다 (2026-08-23 리드 조건 ⑵).
      for (let seed = 1; seed <= 16; seed += 1) {
        const p = generateElementaryProblem(unitOf(code), seed);
        for (const [where, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution],
          ["표", cellsOf(p.figureSpec)],
        ] as const) {
          expect(
            latinLeft(text),
            `${code} 표준 @${seed} ${where}: ${text}`,
          ).toEqual([]);
        }
      }
    }
  });

  /* ── 낱말 축 (D-66 ⑸) ── */

  it("낱말 축 — «식으로 나타내»는 1-3-2·1-3-3 에만 있고 1-3-1 에는 없다", () => {
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        const c1 = problem("1-3-1", tier, seed).content;
        expect(/식으로 나타내/.test(c1), `1-3-1 ${tier} @${seed}\n${c1}`).toBe(
          false,
        );
        const c2 = problem("1-3-2", tier, seed).content;
        expect(/식으로 나타내/.test(c2), `1-3-2 ${tier} @${seed}\n${c2}`).toBe(
          true,
        );
        const c3 = problem("1-3-3", tier, seed).content;
        expect(/식으로 나타내/.test(c3), `1-3-3 ${tier} @${seed}\n${c3}`).toBe(
          tier === "연산" || tier === "기본",
        );
      }
    }
  });

  it("낱말 축 — 1-3-1·1-3-2 는 추상 표만, 1-3-3 은 생활 장면 + □·△ 지정", () => {
    const lifeWords =
      /자동차|세발자전거|오리|거미|곤충|봉지|접시|화분|상자|통나무|리본|철사|빨랫줄|테이프|막대|도막|나이|동생|형|언니|누나/;
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        for (const code of ["1-3-1", "1-3-2"] as const) {
          const c = problem(code, tier, seed).content;
          expect(lifeWords.test(c), `${code} ${tier} @${seed}\n${c}`).toBe(
            false,
          );
        }
        const c3 = problem("1-3-3", tier, seed).content;
        expect(lifeWords.test(c3), `1-3-3 ${tier} @${seed}\n${c3}`).toBe(true);
        expect(/표는|빈칸/.test(c3), `1-3-3 ${tier} @${seed}\n${c3}`).toBe(
          false,
        );
        // 기호 배정은 발문이 항상 말한다: «…를 □, …를 △라고 할 때»
        expect(
          /를 □, /.test(c3) && /를 △라고 할 때/.test(c3),
          `1-3-3 ${tier} @${seed} 기호 지정이 없다\n${c3}`,
        ).toBe(true);
      }
    }
  });

  it("답이 식인 갈래는 정본 꼴 하나뿐이고, 나머지는 수다", () => {
    const formulaTiers: [string, readonly ElemTier[]][] = [
      ["1-3-2", ["연산", "기본", "응용"]],
      ["1-3-3", ["연산", "기본"]],
    ];
    for (const [code, tiers] of formulaTiers) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          parseRel(
            problem(code, tier, seed).answer,
            `${code} ${tier} @${seed}`,
          );
        }
      }
    }
    const numberTiers: [string, readonly ElemTier[]][] = [
      ["1-3-1", ELEM_TIERS],
      ["1-3-2", ["심화"]],
      ["1-3-3", ["응용", "심화"]],
    ];
    for (const [code, tiers] of numberTiers) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          answerNumber(
            problem(code, tier, seed).answer,
            `${code} ${tier} @${seed}`,
          );
        }
      }
    }
  });

  /* ── 산술 독립 검산 — 참은 찍힌 표·발문에서 ── */

  it("1-3-1 — 표의 수로 답이 다시 선다 (빈칸·판별·먼 항·역산)", () => {
    for (const seed of SEEDS) {
      // 연산 — 발문이 지목한 □의 빈칸
      const calc = problem("1-3-1", "연산", seed);
      const cp = tablePairs(calc, "1-3-1 연산");
      const cf = inferRel(cp, "1-3-1 연산");
      const blanks = cp.filter(([, b]) => b === "");
      expect(blanks.length, calc.content).toBe(1);
      const bx = nums(calc.content)[2]!;
      expect(Number(blanks[0]![0]), "빈칸 자리가 발문과 다르다").toBe(bx);
      expect(answerNumber(calc.answer, "1-3-1 연산"), calc.content).toBe(
        cf(bx),
      );

      // 기본 — 몇 배 / 몇만큼
      const read = problem("1-3-1", "기본", seed);
      const rp = tablePairs(read, "1-3-1 기본");
      const rA = answerNumber(read.answer, "1-3-1 기본");
      if (read.content.includes("몇 배")) {
        for (const [a, b] of rp)
          expect(Number(b), `${read.content} 표 ${a}→${b}`).toBe(
            Number(a) * rA,
          );
      } else {
        expect(read.content, read.content).toContain("몇만큼");
        for (const [a, b] of rp)
          expect(Number(b) - Number(a), `${read.content} 표 ${a}→${b}`).toBe(
            rA,
          );
      }

      // 응용 — 표 밖 정방향
      const ap = problem("1-3-1", "응용", seed);
      const app = tablePairs(ap, "1-3-1 응용");
      const af = inferRel(app, "1-3-1 응용");
      const m = nums(ap.content)[2]!;
      expect(
        m,
        `${ap.content}: 표 안의 수를 물으면 «먼 항»이 아니다`,
      ).toBeGreaterThan(Math.max(...app.map(([a]) => Number(a))));
      expect(answerNumber(ap.answer, "1-3-1 응용"), ap.content).toBe(af(m));

      // 심화 — 표 밖 역산
      const dp = problem("1-3-1", "심화", seed);
      const dpp = tablePairs(dp, "1-3-1 심화");
      const df = inferRel(dpp, "1-3-1 심화");
      const v = nums(dp.content)[2]!;
      const dA = answerNumber(dp.answer, "1-3-1 심화");
      expect(df(dA), `${dp.content}: 답을 되넣으면 △가 서야 한다`).toBe(v);
      expect(dA, dp.content).toBeGreaterThan(
        Math.max(...dpp.map(([a]) => Number(a))),
      );
    }
  });

  it("1-3-2 — 식이 표의 (□,△) 전 행에 들어맞는다", () => {
    for (const seed of SEEDS) {
      for (const tier of ["연산", "기본", "응용"] as const) {
        const p = problem("1-3-2", tier, seed);
        const f = parseRel(p.answer, `1-3-2 ${tier}`);
        const pairs = tablePairs(p, `1-3-2 ${tier}`);
        for (const [a, b] of pairs)
          expect(f(Number(a)), `${p.answer} vs 표 ${a}→${b}`).toBe(Number(b));
        const tops = pairs.map(([a]) => Number(a));
        if (tier === "응용") {
          // 뛰엄뛰엄 보장 — «1씩» 발판이 없어야 두 단계다
          const gaps = [
            tops[1]! - tops[0]!,
            tops[2]! - tops[1]!,
            tops[3]! - tops[2]!,
          ];
          expect(Math.max(...gaps), p.content).toBeGreaterThanOrEqual(2);
          // 발문 닻(□=x0 → △=y0)이 표 첫 열과 같다
          expect(nums(p.content)[0], p.content).toBe(tops[0]);
          expect(nums(p.content)[1], p.content).toBe(Number(pairs[0]![1]));
        } else {
          // «1씩 커질 때» — 윗줄이 정말 1씩 커지고 발문의 시작 수에서 출발한다
          expect(tops[0], p.content).toBe(nums(p.content)[0]);
          for (let i = 1; i < 4; i += 1)
            expect(tops[i]! - tops[i - 1]!, p.content).toBe(1);
        }
      }

      // 심화 — ㉠(정방향) + ㉡(역방향)
      const dp = problem("1-3-2", "심화", seed);
      const pairs = tablePairs(dp, "1-3-2 심화");
      const f = inferRel(pairs, "1-3-2 심화");
      const i1 = pairs.findIndex(([, b]) => b === "㉠");
      const i2 = pairs.findIndex(([a]) => a === "㉡");
      expect(i1, `${dp.content} ㉠이 없다`).toBeGreaterThan(0);
      expect(i2, `${dp.content} ㉡이 없다`).toBeGreaterThan(0);
      expect(i1, "㉠·㉡이 같은 칸이다").not.toBe(i2);
      const tick1 = f(Number(pairs[i1]![0]));
      const bottom2 = Number(pairs[i2]![1]);
      let tick2 = -1;
      for (let x = 1; x <= 100; x += 1)
        if (f(x) === bottom2) {
          tick2 = x;
          break;
        }
      expect(
        tick2,
        `${dp.content}: ㉡ 역산이 자연수로 안 떨어진다`,
      ).toBeGreaterThan(0);
      expect(answerNumber(dp.answer, "1-3-2 심화"), dp.content).toBe(
        tick1 + tick2,
      );
      // ㉡ 누출 방지 — 이웃 □ 사이가 2뿐이면 «그 사이의 수»가 하나라 역산 없이 풀린다
      if (i2 < 3)
        expect(
          Number(pairs[i2 + 1]![0]) - Number(pairs[i2 - 1]![0]),
          `${dp.content} ㉡ 이웃 간격`,
        ).toBeGreaterThanOrEqual(3);
      // 발문 닻이 표 첫 열과 같다
      expect(nums(dp.content)[0], dp.content).toBe(Number(pairs[0]![0]));
      expect(nums(dp.content)[1], dp.content).toBe(Number(pairs[0]![1]));
    }
  });

  it("1-3-3 — 장면의 수로 답이 다시 선다 (배·자르기 +1·나이 차)", () => {
    for (const seed of SEEDS) {
      for (const tier of ELEM_TIERS) {
        const p = problem("1-3-3", tier, seed);
        const c = p.content;
        const ns = nums(c);
        const label = `1-3-3 ${tier} @${seed}`;
        if (tier === "연산") {
          expect(p.answer, `${label}\n${c}`).toBe(
            `$\\triangle=\\square\\times${ns[1]}$`,
          );
        } else if (tier === "기본") {
          if (c.includes("자르면")) {
            expect(p.answer, `${label}\n${c}`).toBe("$\\triangle=\\square+1$");
          } else if (c.includes("많습니다")) {
            expect(p.answer, `${label}\n${c}`).toBe(
              `$\\triangle=\\square+${ns[0]}$`,
            );
          } else {
            expect(c, label).toContain("적습니다");
            expect(p.answer, `${label}\n${c}`).toBe(
              `$\\triangle=\\square-${ns[0]}$`,
            );
          }
        } else if (tier === "응용") {
          const a = answerNumber(p.answer, label);
          if (c.includes("자르면"))
            expect(a, `${label}\n${c}`).toBe(ns[1]! + 1);
          else expect(a, `${label}\n${c}`).toBe(ns[1]! * ns[2]!);
        } else {
          const a = answerNumber(p.answer, label);
          if (c.includes("자르면")) {
            expect(a, `${label}\n${c}`).toBe(ns[1]! - 1);
          } else {
            expect(ns[2]! % ns[1]!, `${label} 나눗셈이 안 떨어진다\n${c}`).toBe(
              0,
            );
            expect(a, `${label}\n${c}`).toBe(ns[2]! / ns[1]!);
          }
        }
      }
    }
  });

  it("경계 쓸기 200 — 자르기 +1 방향·역산 나눗셈·차 관계 자연수·㉡ 간격 (구성 보장)", () => {
    let hitCut = 0;
    let hitMul = 0;
    let hitSub = 0;
    let hitTick = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      // 1-3-3 심화 — 자르기는 △−1(off-by-one 방향), 배는 나눗셈이 떨어진다
      const d3 = problem("1-3-3", "심화", seed);
      const n3 = nums(d3.content);
      if (d3.content.includes("자르면")) {
        hitCut += 1;
        expect(answerNumber(d3.answer, `@${seed}`), d3.content).toBe(
          n3[1]! - 1,
        );
      } else {
        hitMul += 1;
        expect(n3[2]! % n3[1]!, d3.content).toBe(0);
      }
      // 1-3-2 기본 — 차 관계면 △가 전부 자연수(□ > c 를 뽑는 범위가 보장)
      const r2 = problem("1-3-2", "기본", seed);
      if (r2.answer.includes("\\square-")) {
        hitSub += 1;
        for (const [, b] of tablePairs(r2, `1-3-2 기본 @${seed}`))
          expect(Number(b), r2.content).toBeGreaterThanOrEqual(1);
      }
      // 1-3-2 심화 — ㉡의 이웃 □ 간격이 3 미만이면 사이 수가 하나뿐이라 역산이 죽는다
      const d2 = problem("1-3-2", "심화", seed);
      const pr = tablePairs(d2, `1-3-2 심화 @${seed}`);
      const i2 = pr.findIndex(([a]) => a === "㉡");
      if (i2 > 0 && i2 < 3) {
        hitTick += 1;
        expect(
          Number(pr[i2 + 1]![0]) - Number(pr[i2 - 1]![0]),
          d2.content,
        ).toBeGreaterThanOrEqual(3);
      }
    }
    expect(hitCut, "자르기 심화가 쓸기에 안 걸렸다").toBeGreaterThan(20);
    expect(hitMul, "배 심화가 쓸기에 안 걸렸다").toBeGreaterThan(20);
    expect(hitSub, "차 관계 기본이 쓸기에 안 걸렸다").toBeGreaterThan(20);
    expect(hitTick, "㉡ 가운데 자리가 쓸기에 안 걸렸다").toBeGreaterThan(20);
  });

  it("△=□ 꼴이 도형 접두사 규칙에 안 걸리고 붉음 없이 그려진다 (렌더)", () => {
    for (const rel of [
      "\\triangle=\\square\\times4",
      "\\triangle=\\square+7",
      "\\triangle=\\square-2",
    ]) {
      // 전처리가 △= 를 도형 라벨(\triangle \mathrm{…})로 읽으면 여기서 죽는다
      const pre = preprocessMathText(`$${rel}$`);
      expect(pre, rel).toContain(rel);
      expect(pre, rel).not.toContain("\\mathrm");
      const html = renderMathHtml(`$${rel}$`);
      expect(html, rel).not.toContain("katex-error");
      expect(html, rel).not.toMatch(/color:\s*#cc0000/i);
    }
    // 실제 생성물 한 벌 — 발문·정답·해설 통째로
    for (const code of CODES13) {
      const p = problem(code, "연산", 11);
      const html = renderMathHtml(`${p.content} ${p.answer} ${p.solution}`);
      expect(html, code).not.toContain("katex-error");
      expect(html, code).not.toMatch(/color:\s*#cc0000/i);
    }
  });

  it("1-3 세 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES13) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const owner = `${code} «${tier}»`;
          const prev = seen.get(p.content);
          if (prev !== undefined && prev !== owner) {
            expect(
              prev,
              `다른 소단원이 같은 발문을 낸다: ${prev} / ${owner}\n  ${p.content}`,
            ).toBe(owner);
          }
          seen.set(p.content, owner);
        }
      }
    }
  });
});

/* ── 1-4 약분과 통분 (D-72 5차) — 재검산 도우미 ── */

const CODES14 = ["1-4-1", "1-4-2", "1-4-3", "1-4-4", "1-4-5"] as const;

/** 본문·답에 나온 `\frac{a}{b}` 전부 — 순서대로. */
const fracChunks = (t: string): [number, number][] =>
  [...t.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);

/** 답이 분수 하나인 갈래 — 진분수(R2)까지 잠근다. */
function answerFrac(answer: string, label: string): [number, number] {
  const m = /^\$\\frac\{(\d+)\}\{(\d+)\}\$$/.exec(answer);
  expect(m, `${label}: 분수 답이 아니다 — ${answer}`).not.toBeNull();
  const num = Number(m![1]);
  const den = Number(m![2]);
  expect(num, `${label}: 진분수가 아니다(R2) — ${answer}`).toBeLessThan(den);
  return [num, den];
}

/** 답이 소수 하나인 갈래 — 1 미만까지 잠근다. */
function answerDec(answer: string, label: string): number {
  const m = /^\$(0\.\d+)\$$/.exec(answer);
  expect(m, `${label}: 소수 답이 아니다 — ${answer}`).not.toBeNull();
  return Number(m![1]);
}

/** 기약형 — 시험은 엔진의 simplify 를 부르지 않는다. */
const simp2 = (a: number, b: number): [number, number] => [
  a / gcd2(a, b),
  b / gcd2(a, b),
];

describe("[초5 1-4] 난이도 4단 확대 (D-72 5차)", () => {
  it("다섯 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES14) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES14) {
      for (const tier of ELEM_TIERS) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES14) {
      for (const seed of SEEDS) {
        const rows = ELEM_TIERS.map((t) => problem(code, t, seed).content);
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(4);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES14) {
      for (const tier of ELEM_TIERS) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래마다 답이 상수가 아니다 (답 분포)", () => {
    for (const code of CODES14) {
      for (const tier of ELEM_TIERS) {
        const answers = new Set(
          SEEDS.map((s) => problem(code, tier, s).answer),
        );
        expect(
          answers.size,
          `${code} ${tier} 답이 한 가지뿐이다`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1) — 그림은 없다", () => {
    const bad: string[] = [];
    for (const code of CODES14) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          expect(p.figureSpec, `${code} ${tier} @${seed} 그림`).toBeNull();
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const loose = bare(text);
            if (loose.length)
              bad.push(`${code} ${tier} @${seed} ${where}: ${loose.join(",")}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("낱말 축 (D-66⑸) — 약분·통분·크기가 같은·소수가 제 소단원에만 나온다", () => {
    const axes: [RegExp, string][] = [
      [/크기가 같은/, "1-4-1"],
      [/약분|기약/, "1-4-2"],
      [/통분|공통분모/, "1-4-3"],
      [/소수/, "1-4-5"],
    ];
    for (const code of CODES14) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          for (const [re, ownerCode] of axes) {
            if (code !== ownerCode)
              expect(
                re.test(c),
                `${code} ${tier} @${seed} 에 «${re.source}»\n${c}`,
              ).toBe(false);
          }
        }
      }
    }
    // 주인 소단원 쪽 필수 낱말
    for (const seed of SEEDS) {
      for (const tier of ELEM_TIERS) {
        expect(/약분|기약/.test(problem("1-4-2", tier, seed).content)).toBe(
          true,
        );
        expect(/통분|공통분모/.test(problem("1-4-3", tier, seed).content)).toBe(
          true,
        );
        expect(/소수|0\./.test(problem("1-4-5", tier, seed).content)).toBe(
          true,
        );
      }
    }
  });

  /* ── 산술 독립 검산 — 참은 찍힌 발문·답에서 (gcd·lcm 은 시험 것) ── */

  it("1-4-1 — 크기가 같음이 교차곱으로 다시 선다", () => {
    for (const seed of SEEDS) {
      // 연산 — 빈칸을 채우면 등식이 성립한다
      const calc = problem("1-4-1", "연산", seed);
      const m1 = /\\frac\{(\d+)\}\{(\d+)\}=\\frac\{\\square\}\{(\d+)\}/.exec(
        calc.content,
      );
      const m2 = /\\frac\{(\d+)\}\{(\d+)\}=\\frac\{(\d+)\}\{\\square\}/.exec(
        calc.content,
      );
      const ansC = answerNumber(calc.answer, "1-4-1 연산");
      if (m1) {
        expect(Number(m1[1]) * Number(m1[3]), calc.content).toBe(
          ansC * Number(m1[2]),
        );
      } else {
        expect(m2, `빈칸 꼴이 아니다\n${calc.content}`).not.toBeNull();
        expect(Number(m2![1]) * ansC, calc.content).toBe(
          Number(m2![3]) * Number(m2![2]),
        );
      }

      // 기본 — 나눈 수 / 지정 분모의 분자
      const read = problem("1-4-1", "기본", seed);
      const rf = fracChunks(read.content);
      const ansR = answerNumber(read.answer, "1-4-1 기본");
      if (read.content.includes("나눈 수를")) {
        const [[A, B], [sn, sd]] = [rf[0]!, rf[1]!];
        expect(A, read.content).toBe(sn * ansR);
        expect(B, read.content).toBe(sd * ansR);
      } else {
        expect(read.content).toContain("분자를 구하시오");
        const [sn, sd] = rf[0]!;
        const den = Number(/분모가 \$(\d+)\$인/.exec(read.content)![1]);
        expect(sn * den, read.content).toBe(ansR * sd);
      }

      // 응용 — 합·차 조건과 값이 함께 선다
      const ap = problem("1-4-1", "응용", seed);
      const [sn, sd] = fracChunks(ap.content)[0]!;
      const cond = Number(
        /(?:합|차)가? ?이? ?\$(\d+)\$인/.exec(ap.content)?.[1] ??
          /\$(\d+)\$인 분수를 구하시오/.exec(ap.content)![1],
      );
      const [x, y] = answerFrac(ap.answer, "1-4-1 응용");
      expect(sn * y, ap.content).toBe(x * sd);
      if (ap.content.includes("합이")) expect(x + y, ap.content).toBe(cond);
      else expect(y - x, ap.content).toBe(cond);

      // 심화 — 더한 수 역산 / 범위 속 유일한 분모
      const dp = problem("1-4-1", "심화", seed);
      const [dn, dd] = fracChunks(dp.content)[0]!;
      if (dp.content.includes("더했습니다")) {
        const add = Number(/분모에 \$(\d+)\$[을를]/.exec(dp.content)![1]);
        const ansD = answerNumber(dp.answer, "1-4-1 심화");
        expect(dn * (dd + add), dp.content).toBe(dd * (dn + ansD));
      } else {
        const [, loS, hiS] = /\$(\d+)\$보다 크고 \$(\d+)\$보다 작은/.exec(
          dp.content,
        )!;
        const lo = Number(loS);
        const hi = Number(hiS);
        const [x2, y2] = answerFrac(dp.answer, "1-4-1 심화");
        expect(dn * y2, dp.content).toBe(x2 * dd);
        expect(y2, dp.content).toBeGreaterThan(lo);
        expect(y2, dp.content).toBeLessThan(hi);
        // 범위 속 분모 후보(dd 의 배수)가 정확히 하나 — 답이 하나로 좁혀졌는가
        let cands = 0;
        for (let v = lo + 1; v < hi; v += 1) if (v % dd === 0) cands += 1;
        expect(cands, `${dp.content} 범위 속 분모 후보`).toBe(1);
      }
    }
  });

  it("1-4-2 — 약분·기약이 gcd 로 다시 선다 (⑴)", () => {
    for (const seed of SEEDS) {
      // 연산 — 지정 수로 나눈 결과 그대로
      const calc = problem("1-4-2", "연산", seed);
      const [A, B] = fracChunks(calc.content)[0]!;
      const t = Number(/\$(\d+)\$[으]?로 약분/.exec(calc.content)![1]);
      const [x, y] = answerFrac(calc.answer, "1-4-2 연산");
      expect(A, calc.content).toBe(x * t);
      expect(B, calc.content).toBe(y * t);

      // 기본 — 가장 큰 수 = gcd / 만들 수 있는 분수 수 = gcd 약수 − 1
      const read = problem("1-4-2", "기본", seed);
      const [rA, rB] = fracChunks(read.content)[0]!;
      const ansR = answerNumber(read.answer, "1-4-2 기본");
      if (read.content.includes("가장 큰 수")) {
        expect(ansR, read.content).toBe(gcd2(rA, rB));
      } else {
        expect(read.content).toContain("몇 개");
        expect(ansR, read.content).toBe(divs(gcd2(rA, rB)).length - 1);
      }

      // 응용 — 기약분수의 합 / 약분 전 분수
      const ap = problem("1-4-2", "응용", seed);
      if (ap.content.includes("기약분수로 나타냈을 때")) {
        const [aA, aB] = fracChunks(ap.content)[0]!;
        const [rn, rd] = simp2(aA, aB);
        expect(gcd2(rn, rd), `기약이 아니다: ${ap.content}`).toBe(1);
        expect(answerNumber(ap.answer, "1-4-2 응용"), ap.content).toBe(rn + rd);
      } else {
        const den = Number(/분모가 \$(\d+)\$인/.exec(ap.content)![1]);
        const [sn, sd] = fracChunks(ap.content)[0]!;
        expect(gcd2(sn, sd), `목표가 기약이 아니다: ${ap.content}`).toBe(1);
        const [x2, y2] = answerFrac(ap.answer, "1-4-2 응용");
        expect(y2, ap.content).toBe(den);
        expect(simp2(x2, y2), ap.content).toEqual([sn, sd]);
      }

      // 심화 — 약분 전 합 역산 / 약분되는 진분수 전수
      const dp = problem("1-4-2", "심화", seed);
      const ansD = answerNumber(dp.answer, "1-4-2 심화");
      if (dp.content.includes("어떤 분수의")) {
        const t2 = Number(/각각 \$(\d+)\$[으]?로 나누어/.exec(dp.content)![1]);
        const [sn, sd] = fracChunks(dp.content)[0]!;
        expect(ansD, dp.content).toBe(t2 * (sn + sd));
      } else {
        const den = Number(/분모가 \$(\d+)\$인 진분수/.exec(dp.content)![1]);
        let count = 0;
        for (let m = 1; m < den; m += 1) if (gcd2(m, den) > 1) count += 1;
        expect(ansD, dp.content).toBe(count);
      }
    }
  });

  it("1-4-3 — 발문의 방식 낱말과 답의 공통분모가 일치한다 (⑵)", () => {
    for (const seed of SEEDS) {
      // 연산 — «두 분모의 곱» 방식
      const calc = problem("1-4-3", "연산", seed);
      expect(calc.content, "연산은 곱 방식을 말해야 한다").toContain(
        "두 분모의 곱",
      );
      const [[a, d1], [b, d2]] = fracChunks(calc.content);
      const got = fracChunks(calc.answer);
      expect(got.length, calc.answer).toBe(2);
      expect(got[0], calc.content).toEqual([a * d2, d1 * d2]);
      expect(got[1], calc.content).toEqual([b * d1, d1 * d2]);

      // 기본 — «최소공배수» 방식 + 두 방식이 실제로 갈리는 짝
      const read = problem("1-4-3", "기본", seed);
      expect(read.content, "기본은 최소공배수 방식을 말해야 한다").toContain(
        "최소공배수",
      );
      const [[ra, rd1], [rb, rd2]] = fracChunks(read.content);
      expect(
        gcd2(rd1, rd2),
        `두 방식이 갈리지 않는 짝: ${read.content}`,
      ).toBeGreaterThan(1);
      const L = lcm2(rd1, rd2);
      const rGot = fracChunks(read.answer);
      expect(rGot[0], read.content).toEqual([(ra * L) / rd1, L]);
      expect(rGot[1], read.content).toEqual([(rb * L) / rd2, L]);

      // 응용 — 통분한 분자의 합·차
      const ap = problem("1-4-3", "응용", seed);
      expect(ap.content).toContain("최소공배수");
      const [[pa, pd1], [pb, pd2]] = fracChunks(ap.content);
      expect(gcd2(pd1, pd2), ap.content).toBeGreaterThan(1);
      const pL = lcm2(pd1, pd2);
      const p = (pa * pL) / pd1;
      const q = (pb * pL) / pd2;
      const ansA = answerNumber(ap.answer, "1-4-3 응용");
      if (ap.content.includes("분자의 합"))
        expect(ansA, ap.content).toBe(p + q);
      else expect(ansA, ap.content).toBe(Math.abs(p - q));

      // 심화 — 원분수 역산 / 공통분모 개수
      const dp = problem("1-4-3", "심화", seed);
      if (dp.content.includes("어떤 분수를 구하시오")) {
        const [da, dd1] = fracChunks(dp.content)[0]!;
        const den2 = Number(/분모가 \$(\d+)\$인/.exec(dp.content)![1]);
        const [, pS, qS] =
          /분자가 각각 \$(\d+)\$[과와] \$(\d+)\$[이가] 되었습니다/.exec(
            dp.content,
          )!;
        const dL = lcm2(dd1, den2);
        expect(Number(pS), dp.content).toBe((da * dL) / dd1);
        const [x, y] = answerFrac(dp.answer, "1-4-3 심화");
        expect(y, dp.content).toBe(den2);
        expect([x, y], dp.content).toEqual(simp2(Number(qS), dL));
      } else {
        const [[, cd1], [, cd2]] = fracChunks(dp.content);
        expect(answerNumber(dp.answer, "1-4-3 심화"), dp.content).toBe(
          Math.floor(99 / lcm2(cd1, cd2)),
        );
      }
    }
  });

  it("1-4-4 — 비교가 교차곱으로 다시 서고 동률이 없다 (⑶)", () => {
    const cross = (f: [number, number], g: [number, number]): number =>
      f[0] * g[1] - g[0] * f[1];
    for (const seed of SEEDS) {
      // 연산 — 같은 분모 «더 큰» / 단위분수 «더 작은»
      const calc = problem("1-4-4", "연산", seed);
      const cf = fracChunks(calc.content).slice(0, 2);
      expect(cross(cf[0]!, cf[1]!), `동률: ${calc.content}`).not.toBe(0);
      if (calc.content.includes("더 큰")) {
        expect(cf[0]![1], "같은 분모여야 한다").toBe(cf[1]![1]);
        const big = cross(cf[0]!, cf[1]!) > 0 ? cf[0]! : cf[1]!;
        expect(answerFrac(calc.answer, "1-4-4 연산"), calc.content).toEqual(
          big,
        );
      } else {
        expect(cf[0]![0], "단위분수여야 한다").toBe(1);
        expect(cf[1]![0], "단위분수여야 한다").toBe(1);
        const small = cross(cf[0]!, cf[1]!) < 0 ? cf[0]! : cf[1]!;
        expect(answerFrac(calc.answer, "1-4-4 연산"), calc.content).toEqual(
          small,
        );
      }

      // 기본 — 다른 분모 «더 작은»
      const read = problem("1-4-4", "기본", seed);
      const rf = fracChunks(read.content).slice(0, 2);
      expect(rf[0]![1], `분모가 같다: ${read.content}`).not.toBe(rf[1]![1]);
      expect(cross(rf[0]!, rf[1]!), `동률: ${read.content}`).not.toBe(0);
      const small = cross(rf[0]!, rf[1]!) < 0 ? rf[0]! : rf[1]!;
      expect(answerFrac(read.answer, "1-4-4 기본"), read.content).toEqual(
        small,
      );

      // 응용 — 세 분수, 전부 다른 값
      const ap = problem("1-4-4", "응용", seed);
      const af = fracChunks(ap.content).slice(0, 3);
      for (let i = 0; i < 3; i += 1)
        for (let j = i + 1; j < 3; j += 1)
          expect(cross(af[i]!, af[j]!), `동률: ${ap.content}`).not.toBe(0);
      const sorted = [...af].sort(cross);
      const want = ap.content.includes("가장 큰") ? sorted[2]! : sorted[0]!;
      expect(answerFrac(ap.answer, "1-4-4 응용"), ap.content).toEqual(want);

      // 심화 — □ 개수를 전수로 다시 센다
      const dp = problem("1-4-4", "심화", seed);
      const ansD = answerNumber(dp.answer, "1-4-4 심화");
      let la: number;
      let ld: number;
      let ha: number;
      let hd: number;
      let e: number;
      const m =
        /\\frac\{(\d+)\}\{(\d+)\}<\\frac\{\\square\}\{(\d+)\}<\\frac\{(\d+)\}\{(\d+)\}/.exec(
          dp.content,
        );
      if (m) {
        [la, ld, e, ha, hd] = [
          Number(m[1]),
          Number(m[2]),
          Number(m[3]),
          Number(m[4]),
          Number(m[5]),
        ];
      } else {
        const fm = fracChunks(dp.content).slice(0, 2);
        [la, ld] = fm[0]!;
        [ha, hd] = fm[1]!;
        e = Number(/분모가 \$(\d+)\$인/.exec(dp.content)![1]);
      }
      let count = 0;
      for (let v = 1; v < e; v += 1)
        if (la * e < v * ld && v * hd < ha * e) count += 1;
      expect(ansD, dp.content).toBe(count);
      expect(count, `범위가 비었다: ${dp.content}`).toBeGreaterThanOrEqual(1);
      // 아래 경계는 약분된 꼴 — 통분 한 겹이 살아 있어야 심화다
      expect(ld, `경계가 그대로 /${e} 다: ${dp.content}`).toBeLessThan(e);
    }
  });

  it("1-4-5 — 분수·소수 값이 천분율로 다시 선다", () => {
    for (const seed of SEEDS) {
      // 연산 — 변환
      const calc = problem("1-4-5", "연산", seed);
      const [fn, fd] = fracChunks(calc.content)[0]!;
      expect((fn * 1000) % fd, `유한소수가 아니다: ${calc.content}`).toBe(0);
      expect(
        Math.round(answerDec(calc.answer, "1-4-5 연산") * 1000),
        calc.content,
      ).toBe((fn * 1000) / fd);

      // 기본 — 소수 먼저 «더 작은»
      const read = problem("1-4-5", "기본", seed);
      const dm = /\$(0\.\d+)\$/.exec(read.content)!;
      const decMilli = Math.round(Number(dm[1]) * 1000);
      const [rn, rd] = fracChunks(read.content)[0]!;
      const fracMilli = (rn * 1000) / rd;
      expect(decMilli, `동률: ${read.content}`).not.toBe(fracMilli);
      const wantChunk =
        decMilli < fracMilli ? `$${dm[1]}$` : `$\\frac{${rn}}{${rd}}$`;
      expect(read.answer, read.content).toBe(wantChunk);

      // 응용 — 세 수 비교
      const ap = problem("1-4-5", "응용", seed);
      const [an, ad] = fracChunks(ap.content)[0]!;
      const decsRaw = [...ap.content.matchAll(/\$(0\.\d+)\$/g)].map(
        (x) => x[1]!,
      );
      expect(decsRaw.length, ap.content).toBe(2);
      const items: [number, string][] = [
        [(an * 1000) / ad, `$\\frac{${an}}{${ad}}$`],
        [Math.round(Number(decsRaw[0]) * 1000), `$${decsRaw[0]}$`],
        [Math.round(Number(decsRaw[1]) * 1000), `$${decsRaw[1]}$`],
      ];
      const vals = items.map(([v]) => v);
      expect(new Set(vals).size, `동률: ${ap.content}`).toBe(3);
      const sorted = [...items].sort((x2, y2) => x2[0] - y2[0]);
      const want = ap.content.includes("가장 큰") ? sorted[2]! : sorted[0]!;
      expect(ap.answer, ap.content).toBe(want[1]);

      // 심화 — 소수 경계 사이 □/d 를 전수로 다시 센다
      const dp = problem("1-4-5", "심화", seed);
      const dmDeep = /0\.(\d)<\\frac\{\\square\}\{(\d+)\}<0\.(\d)/.exec(
        dp.content,
      )!;
      const h = Number(dmDeep[1]);
      const den = Number(dmDeep[2]);
      const k = Number(dmDeep[3]);
      let count = 0;
      for (let v = 1; v <= den; v += 1)
        if (v * 10 > h * den && v * 10 < k * den) count += 1;
      expect(answerNumber(dp.answer, "1-4-5 심화"), dp.content).toBe(count);
      expect(count, `범위가 비었다: ${dp.content}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("경계 쓸기 200 — 동률 없음·범위 비지 않음·유일성 (구성 보장)", () => {
    let hitUnique = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      // 1-4-4 기본 — 동률이 나오면 구성이 깨진 것
      const r4 = problem("1-4-4", "기본", seed);
      const rf = fracChunks(r4.content).slice(0, 2);
      expect(rf[0]![0] * rf[1]![1], `동률: ${r4.content}`).not.toBe(
        rf[1]![0] * rf[0]![1],
      );
      // 1-4-4 심화 — 답 ≥ 1
      const d4 = problem("1-4-4", "심화", seed);
      expect(
        answerNumber(d4.answer, `@${seed}`),
        `범위가 비었다: ${d4.content}`,
      ).toBeGreaterThanOrEqual(1);
      // 1-4-5 심화 — 답 ≥ 1
      const d5 = problem("1-4-5", "심화", seed);
      expect(
        answerNumber(d5.answer, `@${seed}`),
        `범위가 비었다: ${d5.content}`,
      ).toBeGreaterThanOrEqual(1);
      // 1-4-1 심화 범위 갈래 — 범위 속 분모 후보가 정확히 하나
      const d1 = problem("1-4-1", "심화", seed);
      if (d1.content.includes("보다 크고")) {
        hitUnique += 1;
        const [, dd] = fracChunks(d1.content)[0]!;
        const [, loS, hiS] = /\$(\d+)\$보다 크고 \$(\d+)\$보다 작은/.exec(
          d1.content,
        )!;
        let cands = 0;
        for (let v = Number(loS) + 1; v < Number(hiS); v += 1)
          if (v % dd === 0) cands += 1;
        expect(cands, d1.content).toBe(1);
      }
    }
    expect(hitUnique, "1-4-1 범위 갈래가 쓸기에 안 걸렸다").toBeGreaterThan(20);
  });

  it("\\frac 가 붉음 없이 그려진다 (렌더 ⑷)", () => {
    for (const code of CODES14) {
      const p = problem(code, "연산", 11);
      const html = renderMathHtml(`${p.content} ${p.answer} ${p.solution}`);
      expect(html, code).not.toContain("katex-error");
      expect(html, code).not.toMatch(/color:\s*#cc0000/i);
    }
    // 빈칸 낀 분수 꼴도 — 1-4-1 연산·1-4-4 심화가 쓰는 모양 그대로
    for (const tex of [
      "$\\frac{4}{5}=\\frac{\\square}{20}$",
      "$\\frac{1}{4}<\\frac{\\square}{8}<\\frac{3}{4}$",
    ]) {
      const html = renderMathHtml(tex);
      expect(html, tex).not.toContain("katex-error");
      expect(html, tex).not.toMatch(/color:\s*#cc0000/i);
    }
  });

  it("1-4 다섯 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES14) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const owner = `${code} «${tier}»`;
          const prev = seen.get(p.content);
          if (prev !== undefined && prev !== owner) {
            expect(
              prev,
              `다른 소단원이 같은 발문을 낸다: ${prev} / ${owner}\n  ${p.content}`,
            ).toBe(owner);
          }
          seen.set(p.content, owner);
        }
      }
    }
  });
});

/* ── 분수 뒤 조사 — 표준·갈래 전량 (2026-08-23 곁들이) ── */

describe("[초5 표기] 분수 뒤 조사는 분자 소리와 맞는다", () => {
  it("판정기 자기 시험 — 걸려야 할 것과 걸리면 안 될 것을 둘 다 댄다", () => {
    // 양성 대조 — 이것들이 안 걸리면 아래 «0건»은 «깨끗»이 아니라 «못 셈»이다.
    expect(fracJosaMisses("$\\frac{7}{8}$를 통분")).toHaveLength(1);
    expect(fracJosaMisses("$\\frac{2}{3}$과 $\\frac{1}{4}$")).toHaveLength(1);
    expect(fracJosaMisses("가분수 $\\frac{20}{7}$로 고친")).toHaveLength(1);
    // 음성 대조
    expect(fracJosaMisses("$\\frac{7}{8}$을 통분")).toHaveLength(0);
    expect(fracJosaMisses("$\\frac{2}{3}$와 $\\frac{1}{4}$")).toHaveLength(0);
    expect(fracJosaMisses("$\\frac{1}{2}$로 고친")).toHaveLength(0); // 일 = ㄹ받침
    expect(fracJosaMisses("$\\frac{5}{10}$이므로 답은")).toHaveLength(0); // 계사
  });

  it("초5 전 소단원 — 표준과 등록된 갈래 넷 전부에서 어긋남이 없다", () => {
    const units = elementaryUnits().filter((u) => u.grade === "초5");
    const bad: string[] = [];
    let scanned = 0;
    for (const unit of units) {
      const tiers = supportedTiers(unit);
      for (let seed = 1; seed <= 8; seed += 1) {
        for (const tier of [undefined, ...tiers]) {
          const p = generateElementaryProblem(unit, seed, tier);
          scanned += 1;
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            for (const miss of fracJosaMisses(text)) {
              bad.push(
                `${unit.section} «${tier ?? "표준"}» @${seed} ${where}: ${miss}\n    ${text}`,
              );
            }
          }
        }
      }
    }
    // 훑은 자리가 없으면 «0건»이 아무것도 뜻하지 않는다 — 분모를 먼저 지킨다.
    expect(scanned, "훑은 산출이 없다").toBeGreaterThan(1000);
    expect(bad, `분수 뒤 조사 어긋남 ${bad.length}자리`).toEqual([]);
  });
});

/* ── 1-5 분수의 덧셈과 뺄셈 (D-72 6차) — 재검산 도우미 ── */

const CODES15 = ["1-5-1", "1-5-2", "1-5-3", "1-5-4"] as const;

/** `$…$` 안의 분수·대분수·자연수를 **값**(분자/분모)으로 읽는다. 시험이 직접 판다. */
function readFracValue(chunk: string): [number, number] | null {
  const mixed = /^(\d+)\\frac\{(\d+)\}\{(\d+)\}$/.exec(chunk);
  if (mixed) {
    const w = Number(mixed[1]);
    const nn = Number(mixed[2]);
    const dd = Number(mixed[3]);
    return [w * dd + nn, dd];
  }
  const plain = /^\\frac\{(\d+)\}\{(\d+)\}$/.exec(chunk);
  if (plain) return [Number(plain[1]), Number(plain[2])];
  const whole = /^(\d+)$/.exec(chunk);
  if (whole) return [Number(whole[1]), 1];
  return null;
}

/**
 * 답 덩어리(`$…$`) 하나를 값으로 읽고, **쓰인 꼴**이 정본인지 잠근다.
 *
 * ⚠️ 검사를 **값**에 걸면 안 된다 — 대분수 `1\frac{1}{12}` 의 값은 13/12 이고
 *    「분자 < 분모」가 당연히 거짓이다. 처음에 그렇게 짜서 멀쩡한 답 여섯 갈래가
 *    빨갛게 나왔다(2026-08-23). 규약은 **분수부**에 대한 것이다.
 */
function answerFracValue(answer: string, label: string): [number, number] {
  const m = /^\$([^$]+)\$$/.exec(answer);
  expect(m, `${label}: KaTeX 로 안 감싼 답 — ${answer}`).not.toBeNull();
  const chunk = m![1]!;
  const v = readFracValue(chunk);
  expect(v, `${label}: 분수 꼴이 아니다 — ${answer}`).not.toBeNull();

  // ⑷ 표기 규약 — 쓰인 꼴의 **분수부**가 진분수이고 기약이어야 한다.
  const written = /^(?:(\d+))?\\frac\{(\d+)\}\{(\d+)\}$/.exec(chunk);
  if (written) {
    const pn = Number(written[2]);
    const pd = Number(written[3]);
    expect(pn, `${label}: 분수부가 가분수다 — ${answer}`).toBeLessThan(pd);
    // ⑴ 기약 — 시험이 gcd 로 따로 검산한다(엔진의 simplify 를 안 부른다)
    expect(gcd2(pn, pd), `${label}: 분수부가 기약이 아니다 — ${answer}`).toBe(
      1,
    );
    if (written[1] !== undefined) {
      expect(
        Number(written[1]),
        `${label}: 자연수부가 0이면 대분수로 쓰지 않는다 — ${answer}`,
      ).toBeGreaterThan(0);
    }
  } else {
    // 자연수로 떨어진 답 — `\frac` 이 남아 있으면 안 된다.
    expect(chunk, `${label}: 알 수 없는 답 꼴 — ${answer}`).toMatch(/^\d+$/);
  }
  return v!;
}

/** 본문의 `$…$` 덩어리들 중 분수·대분수·자연수로 읽히는 것만. */
function fracValuesIn(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(/\$([^$]+)\$/g)) {
    for (const piece of m[1]!.split(/[+\-=]/)) {
      const v = readFracValue(piece.trim());
      if (v) out.push(v);
    }
  }
  return out;
}

const addV = (x: [number, number], y: [number, number]): [number, number] => {
  const num = x[0] * y[1] + y[0] * x[1];
  const den = x[1] * y[1];
  const g = gcd2(num, den);
  return [num / g, den / g];
};
const subV = (x: [number, number], y: [number, number]): [number, number] => {
  const num = x[0] * y[1] - y[0] * x[1];
  const den = x[1] * y[1];
  const g = gcd2(Math.abs(num), den);
  return [num / g, den / g];
};

describe("[초5 1-5] 난이도 4단 확대 (D-72 6차)", () => {
  it("네 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES15) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES15) {
      for (const seed of SEEDS) {
        const rows = ELEM_TIERS.map((t) => problem(code, t, seed).content);
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(4);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래마다 답이 상수가 아니다 (답 분포)", () => {
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        const answers = new Set(
          SEEDS.map((s) => problem(code, tier, s).answer),
        );
        expect(
          answers.size,
          `${code} ${tier} 답이 한 가지뿐이다`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1) — 그림은 없다", () => {
    const bad: string[] = [];
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          expect(p.figureSpec, `${code} ${tier} @${seed}`).toBeNull();
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const loose = bare(text);
            if (loose.length)
              bad.push(`${code} ${tier} @${seed} ${where}: ${loose.join(",")}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("답이 언제나 기약이고 가분수를 그대로 내지 않는다 (⑴⑷)", () => {
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          answerFracValue(p.answer, `${code} ${tier} @${seed}`);
        }
      }
    }
  });

  it("이름 약속 — 「진분수」는 진분수만, 「대분수」는 대분수가 낀다 (⑵)", () => {
    for (const seed of SEEDS) {
      for (const tier of ELEM_TIERS) {
        for (const code of ["1-5-1", "1-5-3"] as const) {
          const c = problem(code, tier, seed).content;
          // 이름이 거는 것은 **피연산자**다 — 진분수끼리 더해도 «합»은 대분수가 될 수
          // 있고(교과서도 그렇게 쓴다), 심화의 역산 발문은 그 합을 내건다.
          // 그래서 마지막 덩어리(결과)를 뺀 나머지에만 «대분수 없음»을 건다.
          const chunks = [...c.matchAll(/\$([^$]+)\$/g)]
            .map((m) => m[1]!)
            .filter((x) => x.includes("\\frac"));
          const operands = tier === "심화" ? chunks.slice(0, -1) : chunks;
          for (const piece of operands) {
            expect(
              /\d\\frac\{/.test(piece),
              `${code} ${tier} @${seed} 진분수 소단원의 피연산자가 대분수다\n${c}`,
            ).toBe(false);
          }
        }
        for (const code of ["1-5-2", "1-5-4"] as const) {
          const c = problem(code, tier, seed).content;
          expect(
            /\d\\frac\{/.test(c),
            `${code} ${tier} @${seed} 대분수 소단원에 대분수가 없다\n${c}`,
          ).toBe(true);
        }
        // 덧셈 소단원은 뺄셈 문장을 쓰지 않는다.
        expect(
          /뺐더니|뺀 |덜어|남은|더 많이|중에서/.test(
            problem("1-5-1", tier, seed).content,
          ),
          `1-5-1 ${tier} @${seed} 에 뺄셈 문장`,
        ).toBe(false);
      }
    }
  });

  it("뺄셈 갈래는 결과가 언제나 양수다 (⑶)", () => {
    for (const code of ["1-5-3", "1-5-4"] as const) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const [num] = answerFracValue(p.answer, `${code} ${tier} @${seed}`);
          expect(
            num,
            `${code} ${tier} @${seed} 답이 0 이하다\n${p.content}`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it("1-5-1·1-5-2 — 발문의 수로 합이 다시 선다", () => {
    for (const seed of SEEDS) {
      for (const code of ["1-5-1", "1-5-2"] as const) {
        for (const tier of ["연산", "응용"] as const) {
          const p = problem(code, tier, seed);
          const vs = fracValuesIn(p.content);
          const label = `${code} ${tier} @${seed}`;
          expect(
            vs.length,
            `${label} 발문에 분수가 없다`,
          ).toBeGreaterThanOrEqual(2);
          const sum = vs.slice(1).reduce((acc, v) => addV(acc, v), vs[0]!);
          expect(
            answerFracValue(p.answer, label),
            `${label}\n${p.content}`,
          ).toEqual(sum);
        }
        // 심화 — 답 + 발문의 더한 수 = 발문의 합
        const dp = problem(code, "심화", seed);
        const label = `${code} 심화 @${seed}`;
        const vs = fracValuesIn(dp.content);
        expect(vs.length, label).toBe(2);
        const ans = answerFracValue(dp.answer, label);
        expect(addV(ans, vs[0]!), `${label}\n${dp.content}`).toEqual(vs[1]!);
      }
    }
  });

  it("1-5-3·1-5-4 — 발문의 수로 차가 다시 선다", () => {
    for (const seed of SEEDS) {
      for (const code of ["1-5-3", "1-5-4"] as const) {
        const calc = problem(code, "연산", seed);
        const label = `${code} 연산 @${seed}`;
        const vs = fracValuesIn(calc.content);
        expect(vs.length, label).toBe(2);
        expect(
          answerFracValue(calc.answer, label),
          `${label}\n${calc.content}`,
        ).toEqual(subV(vs[0]!, vs[1]!));

        // 심화 — 두 꼴은 **구조가 반대**다. 한 덩어리로 보면 부호가 뒤집힌다.
        //   □ 식  : `A-□=R`      → A − 답 = R   (답이 빼는 수)
        //   문장  : `어떤 수에서 X를 뺐더니 R` → 답 − X = R (답이 처음 수)
        const dp = problem(code, "심화", seed);
        const dLabel = `${code} 심화 @${seed}`;
        const dvs = fracValuesIn(dp.content);
        expect(dvs.length, dLabel).toBe(2);
        const ans = answerFracValue(dp.answer, dLabel);
        if (dp.content.includes("□")) {
          expect(subV(dvs[0]!, ans), `${dLabel}\n${dp.content}`).toEqual(
            dvs[1]!,
          );
        } else {
          expect(subV(ans, dvs[0]!), `${dLabel}\n${dp.content}`).toEqual(
            dvs[1]!,
          );
        }
      }
    }
  });

  it("1-5-4 응용 — 자연수에서 대분수를 빼 받아내림이 반드시 인다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-5-4", "응용", seed);
      const label = `1-5-4 응용 @${seed}`;
      const vs = fracValuesIn(p.content);
      expect(vs.length, `${label}\n${p.content}`).toBe(2);
      expect(vs[0]![1], `${label} 앞이 자연수가 아니다`).toBe(1);
      // 뒤가 대분수(분수부가 0이 아님) → 받아내림이 반드시 인다
      expect(vs[1]![0] % vs[1]![1], `${label} 받아내림이 없다`).not.toBe(0);
      expect(
        answerFracValue(p.answer, label),
        `${label}\n${p.content}`,
      ).toEqual(subV(vs[0]!, vs[1]!));
    }
  });

  it("경계 쓸기 200 — 뺄셈 결과 양수·기약·정본 꼴 (구성 보장)", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const code of CODES15) {
        for (const tier of ELEM_TIERS) {
          const p = problem(code, tier, seed);
          const [num] = answerFracValue(p.answer, `${code} ${tier} @${seed}`);
          expect(num, `${code} ${tier} @${seed}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("\\frac 가 붉음 없이 그려진다 (렌더)", () => {
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        const p = problem(code, tier, 11);
        const html = renderMathHtml(`${p.content} ${p.answer} ${p.solution}`);
        expect(html, `${code} ${tier}`).not.toContain("katex-error");
        expect(html, `${code} ${tier}`).not.toMatch(/color:\s*#cc0000/i);
      }
    }
  });

  it("소재와 동사가 어울린다 — 「색종이를 먹는다」가 없다 (씨앗 2000 쓸기)", () => {
    // g4 가 초4 2-1 착수 조사 중 잡아 회송한 결함(2026-08-23). 소재와 동사를 **따로**
    // 뽑으면 씨앗 2,000개 중 670회가 「색종이를 먹었습니다」였다. 동사를 소재에 딸린
    // 값으로 묶어 고쳤고, 여기서 **짝 자체**를 잠근다 — 소재를 늘려도 같은 결함이 안 난다.
    const EDIBLE = /피자|케이크|과자|빵|우유|주스|물|밀가루|설탕/;
    const bad: string[] = [];
    for (let seed = 0; seed < 2000; seed += 1) {
      const c = problem("1-5-3", "응용", seed).content;
      const s = problem("1-5-3", "응용", seed).solution;
      const eats = /먹/.test(c) || /먹/.test(s);
      if (!eats) continue;
      // 「먹」이 나왔으면 그 소재는 먹을 수 있는 것이어야 한다.
      const thing = /^(\S+) 한 (?:판|개|장)의/.exec(c)?.[1] ?? "";
      if (!EDIBLE.test(thing))
        bad.push(`@${seed} «${thing}» 를 먹는다\n    ${c}`);
    }
    expect(bad.slice(0, 3), `어울리지 않는 짝 ${bad.length}자리`).toEqual([]);
  });

  it("초4 2-1 과 발문이 겹치지 않는다 — 같은 이름의 네 소단원 (g4 협의)", () => {
    // 초4 2-1 과 초5 1-5 는 소단원 이름이 넷 다 같다. 판별자는 **분모**다 —
    // 초4 는 동분모, 초5 는 서로 다른 분모(1-5-3 응용의 «전체 1» 갈래만 동분모다).
    const g4Units = elementaryUnits().filter(
      (u) => u.grade === "초4" && u.section.startsWith("2-1-"),
    );
    if (g4Units.length === 0) return; // 아직 안 들어왔으면 이 검사는 건너뛴다
    const g4Contents = new Set<string>();
    for (const u of g4Units) {
      for (const tier of supportedTiers(u).length
        ? supportedTiers(u)
        : [undefined]) {
        for (let seed = 1; seed <= 16; seed += 1) {
          g4Contents.add(generateElementaryProblem(u, seed, tier).content);
        }
      }
    }
    const clash: string[] = [];
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          if (g4Contents.has(c))
            clash.push(`${code} ${tier} @${seed}\n    ${c}`);
        }
      }
    }
    expect(clash, `초4 2-1 과 겹친 발문 ${clash.length}건`).toEqual([]);
  });

  it("1-5 네 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES15) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const owner = `${code} «${tier}»`;
          const prev = seen.get(p.content);
          if (prev !== undefined && prev !== owner) {
            expect(
              prev,
              `다른 소단원이 같은 발문을 낸다: ${prev} / ${owner}\n  ${p.content}`,
            ).toBe(owner);
          }
          seen.set(p.content, owner);
        }
      }
    }
  });
});
