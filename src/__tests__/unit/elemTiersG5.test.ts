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
