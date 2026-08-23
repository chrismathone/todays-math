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
