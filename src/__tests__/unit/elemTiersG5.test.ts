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
    for (const code of [...CODES, "1-6-2"]) {
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
