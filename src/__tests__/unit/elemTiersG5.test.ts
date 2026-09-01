/**
 * 초5 `1-6` 나머지 네 소단원의 난이도 4단 (D-72 확대 1차분).
 *
 * 참은 **찍힌 발문**에서 온다 — 생성기를 되부르지 않고 발문의 수로 넓이·둘레를 손으로
 * 다시 계산한다. 생성기를 부르면 그 생성기가 틀릴 때 시험도 같이 틀린다.
 *
 * 파일럿(`1-6-2`)은 `elementaryG5Tiers.test.ts` 가 지킨다. 여기는 1-6-1·1-6-3·1-6-4·1-6-5.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { preprocessMathText } from "@/lib/math/textPreprocess";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

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

/* ── 수식 뒤 조사 (2026-08-23 곁들이 · 08-23 확대) ──
 * 조사는 «소리 내어 읽은 마지막 소리»가 정한다. 표본이 아니라 **규칙**으로 잠그고,
 * 표준·갈래를 한 자리에서 전부 훑는다. 이 결함은 에러가 아니라 «그럴듯한 문장»으로
 * 나가므로 시험이 아니면 아무도 못 본다.
 *
 * ⚠️ **첫 판은 열쇠가 좁아 눈이 멀어 있었다.** `\frac{}{}$` 뒤 **붙여 쓴** 조사만 봐서
 *    「$6$를」(육이라 «을»)·「$…\div6$로」 같은 자리가 **구조적으로 0** 이었다
 *    (2026-08-23 g4 가 넓힌 검사로 잡아 회송 — 내 파일에서 실제로 9자리가 나왔다).
 *    이제 **모든 `$…$` 덩어리**와 **한 칸 띄운 조사**까지 본다.
 *
 * 규칙 셋(g4 정본): ① 분수로 끝나면 **분자**를 읽는다 ② 그 밖에는 끝의 수를 읽는다
 * ③ **조사 뒤에 한글이 바로 붙으면 조사가 아니다**(「$49$ 이상」의 «이», 계사 «이므로»).
 * ③ 이 없으면 범위 소단원이 통째로 거짓 양성이 된다(실측 41자리).
 */

/** «이» 는 계사(-이다)일 수 있다 — «$\frac{5}{10}$이므로» 는 옳다. 주격과 갈라야 한다. */
const COPULA_TAIL = /^(므로|고|다|라|며|면|지만|어야|었|니|기)/;

/** 덩어리를 읽었을 때 마지막 수. 못 읽으면 null — 애매하면 판정하지 않는다. */
function spokenTail(latex: string): number | null {
  const frac = /\\frac\{(\d+)\}\{\d+\}[^0-9]*$/.exec(latex);
  if (frac) return Number(frac[1]);
  const tail = /(\d+)[^0-9]*$/.exec(latex);
  return tail ? Number(tail[1]) : null;
}

/** 수식 덩어리 뒤 조사가 그 소리와 맞는가 — 어긋난 자리를 모아 돌려준다. */
function fracJosaMisses(text: string): string[] {
  const FINAL = new Set([0, 1, 3, 6, 7, 8]);
  const RIEUL = new Set([1, 7, 8]);
  const out: string[] = [];
  const re = /\$([^$]+)\$ ?(으로|과|와|은|는|이|가|을|를|로)/g;
  for (const m of text.matchAll(re)) {
    const josa = m[2]!;
    const rest = text.slice(m.index + m[0].length);
    if (/^[가-힣]/.test(rest)) continue; // ③ 조사 뒤 한글 → 낱말의 일부
    if (josa === "이" && COPULA_TAIL.test(rest)) continue;
    const spoken = spokenTail(m[1]!);
    if (spoken === null) continue;
    const d = Number(String(spoken).slice(-1));
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
    if (!ok[josa]) out.push(`«${m[1]}» 뒤 «${josa}» (읽는 소리 ${spoken})`);
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
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
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(tiersOf(unitOf(code)).length);
      }
    }
  });

  it("갈래마다 씨앗에 반응한다 (R9)", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThan(2);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      const deep = problem("1-6-1", "심화하", seed);
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
      const deep = problem("1-6-3", "심화하", seed);
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
      const deep = problem("1-6-4", "심화하", seed);
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
      const deep = problem("1-6-5", "심화하", seed);
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES11) {
      for (const tier of tiersOf(unitOf(code))) {
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
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(tiersOf(unitOf(code)).length);
      }
    }
  });

  // 리드 지시(2026-08-23): 갈래마다 변형 8개 이상. R9 의 「>2」보다 세게 잠근다.
  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES11) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES11) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
    for (const tier of tiersOf(unitOf("1-1-1"))) {
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
        if (tier !== "심화하") {
          expect(
            ops.size,
            `${tier} @${seed}: 한 연산뿐이면 «섞여 있는 식»이 아니다\n${p.content}`,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("1-1-2 — 덧·뺄에 곱셈 «또는» 나눗셈 하나만 낀다", () => {
    for (const tier of tiersOf(unitOf("1-1-2"))) {
      for (const seed of SEEDS) {
        const p = problem("1-1-2", tier, seed);
        // 심화(□ 역산)의 해설은 «거꾸로 계산»이라 반대 연산(×↔÷)이 함께 나온다 —
        // 소단원 이름이 조건을 거는 것은 **주어진 식**(발문)이다.
        const ops =
          tier === "심화하" ? opsIn(p.content) : opsIn(p.content, p.solution);
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
    for (const tier of tiersOf(unitOf("1-1-3"))) {
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
      const p = problem("1-1-1", "심화하", seed);
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
      const p = problem("1-1-2", "심화하", seed);
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
      const p = problem("1-1-3", "심화하", seed);
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
      for (const tier of tiersOf(unitOf(code))) {
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES12) {
      for (const tier of tiersOf(unitOf(code))) {
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
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(tiersOf(unitOf(code)).length);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES12) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES12) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf("1-2-3"))) {
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

      const deep = problem("1-2-1", "심화하", seed);
      if (deep.content.includes("\\square")) {
        const shownD = nums(deep.content);
        const num = Math.max(...shownD);
        const missing = divs(num).filter((v) => !shownD.includes(v));
        expect(missing, deep.content).toEqual([
          answerNumber(deep.answer, "1-2-1 심화"),
        ]);
      } else {
        // 「약수 목록 → 어떤 수 → 그 수의 배수를 센다」. **약수 쪽에서 배수 쪽으로 건너간다** —
        // 예전의 「약수 중 $m$의 배수를 모두」는 응용과 똑같이 나열하고 거르는 것이었다.
        const shownD = nums(deep.content);
        const limit = shownD[shownD.length - 1]!;
        const num = Math.max(...shownD.slice(0, -1));
        expect(
          divs(num),
          `보인 목록이 약수 전량이 아니다: ${deep.content}`,
        ).toEqual(shownD.slice(0, -1));
        expect(
          limit % num,
          `경계가 배수에 앉으면 안 된다: ${deep.content}`,
        ).not.toBe(0);
        expect(answerNumber(deep.answer, "1-2-1 심화"), deep.content).toBe(
          Math.floor(limit / num),
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

      const deep = problem("1-2-2", "심화하", seed);
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

      // 심화 — 응용(「공약수를 모두 더하면」)을 **거꾸로** 돌리거나(합에서 최대공약수를
      // 되짚는다) 공약수 안에서 **조건을 하나 더 겹친다**(짝수만 센다).
      const deep = problem("1-2-3", "심화하", seed);
      if (deep.content.includes("모두 더하면")) {
        const [cnt, sum] = nums(deep.content) as [number, number];
        const g = answerNumber(deep.answer, "1-2-3 심화");
        expect(divs(g).length, `약수의 개수가 다르다: ${deep.content}`).toBe(
          cnt,
        );
        expect(
          divs(g).reduce((x, y) => x + y, 0),
          `약수의 합이 발문의 수와 다르다: ${deep.content}`,
        ).toBe(sum);
        // 🔴 되짚을 수 있으려면 **답이 하나**여야 한다. 합만 주면 안 된다 —
        //    $42$ 는 $20$·$26$·$41$ 셋의 약수의 합이다(이 검사가 실제로 잡았다).
        const 맞는수 = [];
        for (let v = 2; v <= 100; v += 1) {
          const d = divs(v);
          if (d.length === cnt && d.reduce((x, y) => x + y, 0) === sum) {
            맞는수.push(v);
          }
        }
        expect(맞는수, `조건에 맞는 수가 둘 이상이다: ${deep.content}`).toEqual(
          [g],
        );
      } else {
        const [g] = nums(deep.content) as [number];
        const evens = divs(g).filter((v) => v % 2 === 0);
        expect(
          evens.length,
          `짝수 공약수가 없으면 물을 것이 없다: ${deep.content}`,
        ).toBeGreaterThan(0);
        expect(answerNumber(deep.answer, "1-2-3 심화"), deep.content).toBe(
          evens.length,
        );
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

      const deep = problem("1-2-4", "심화하", seed);
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

      // 심화 — **최소공배수를 발문이 안 준다.** 「$k$번째로 작은 공배수」에서 되짚은 뒤
      // 범위 안 공배수를 세거나(개수) 더한다(합). 여기서도 최소공배수를 **다시** 구한다.
      const deep = problem("1-2-5", "심화하", seed);
      const [k, kth, limit] = nums(deep.content) as [number, number, number];
      expect(
        kth % k,
        `$k$번째 공배수가 $k$의 배수가 아니다: ${deep.content}`,
      ).toBe(0);
      const m = kth / k;
      expect(
        limit % m,
        `경계가 공배수에 앉으면 안 된다: ${deep.content}`,
      ).not.toBe(0);
      const commons: number[] = [];
      for (let v = m; v < limit; v += m) commons.push(v);
      expect(
        commons.length,
        `범위 안 공배수가 둘 이상이어야 견줄 것이 생긴다: ${deep.content}`,
      ).toBeGreaterThan(1);
      const want = deep.content.includes("모두 더하면")
        ? commons.reduce((s, v) => s + v, 0)
        : commons.length;
      expect(answerNumber(deep.answer, "1-2-5 심화"), deep.content).toBe(want);
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

      const deep = problem("1-2-6", "심화하", seed);
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
      const d4 = problem("1-2-4", "심화하", seed);
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
      const d6 = problem("1-2-6", "심화하", seed);
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
      for (const tier of tiersOf(unitOf(code))) {
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES13) {
      for (const tier of tiersOf(unitOf(code))) {
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
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(tiersOf(unitOf(code)).length);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES13) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES13) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          tablePairs(problem(code, tier, seed), `${code} ${tier} @${seed}`);
        }
      }
    }
    for (const tier of tiersOf(unitOf("1-3-3"))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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

  // ⚠️ 소단원마다 **자기가 내는 갈래**를 돈다(D-113 ⑺). 한 소단원의 갈래 목록으로
  //    세 소단원을 다 돌면, 확대 갈래를 한쪽만 채운 날 없는 갈래를 만들려다 던진다
  //    (2026-09-01 물결 4 에서 실제로 났다 — 1-3-1 만 심화중을 채웠다).
  it("낱말 축 — «식으로 나타내»는 1-3-2·1-3-3 에만 있고 1-3-1 에는 없다", () => {
    for (const seed of SEEDS) {
      for (const tier of tiersOf(unitOf("1-3-1"))) {
        const c1 = problem("1-3-1", tier, seed).content;
        expect(/식으로 나타내/.test(c1), `1-3-1 ${tier} @${seed}\n${c1}`).toBe(
          false,
        );
      }
      for (const tier of tiersOf(unitOf("1-3-2"))) {
        const c2 = problem("1-3-2", tier, seed).content;
        expect(/식으로 나타내/.test(c2), `1-3-2 ${tier} @${seed}\n${c2}`).toBe(
          true,
        );
      }
      for (const tier of tiersOf(unitOf("1-3-3"))) {
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
    for (const seed of SEEDS) {
      for (const code of ["1-3-1", "1-3-2"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          expect(lifeWords.test(c), `${code} ${tier} @${seed}\n${c}`).toBe(
            false,
          );
        }
      }
      for (const tier of tiersOf(unitOf("1-3-3"))) {
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
      ["1-3-1", tiersOf(unitOf("1-3-1"))],
      ["1-3-2", ["심화하"]],
      ["1-3-3", ["응용", "심화하"]],
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
      const dp = problem("1-3-1", "심화하", seed);
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
      const dp = problem("1-3-2", "심화하", seed);
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
      for (const tier of tiersOf(unitOf("1-3-3"))) {
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
      const d3 = problem("1-3-3", "심화하", seed);
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
      const d2 = problem("1-3-2", "심화하", seed);
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
      // 🔴 실패는 붉음이 아니라 **날것 폴백**으로 온다 — `renderMathHtml` 은
      //    「katex-error 를 절대 포함하지 않는다」고 스스로 적어 두었다(2026-08-30 실측).
      expect(html, rel).not.toContain("math-raw");
    }
    // 실제 생성물 한 벌 — 발문·정답·해설 통째로
    for (const code of CODES13) {
      const p = problem(code, "연산", 11);
      const html = renderMathHtml(`${p.content} ${p.answer} ${p.solution}`);
      expect(html, code).not.toContain("katex-error");
      expect(html, code).not.toMatch(/color:\s*#cc0000/i);
      // 🔴 실패는 붉음이 아니라 **날것 폴백**으로 온다 — `renderMathHtml` 은
      //    「katex-error 를 절대 포함하지 않는다」고 스스로 적어 두었다(2026-08-30 실측).
      expect(html, code).not.toContain("math-raw");
    }
  });

  it("1-3 세 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES13) {
      for (const tier of tiersOf(unitOf(code))) {
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES14) {
      for (const tier of tiersOf(unitOf(code))) {
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
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(
          new Set(rows).size,
          `${code} 씨앗 ${seed}\n${rows.join("\n")}`,
        ).toBe(tiersOf(unitOf(code)).length);
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES14) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래마다 답이 상수가 아니다 (답 분포)", () => {
    for (const code of CODES14) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf("1-4-2"))) {
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
      const dp = problem("1-4-1", "심화하", seed);
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
      const dp = problem("1-4-2", "심화하", seed);
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
      const dp = problem("1-4-3", "심화하", seed);
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
      const dp = problem("1-4-4", "심화하", seed);
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
      const dp = problem("1-4-5", "심화하", seed);
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
      const d4 = problem("1-4-4", "심화하", seed);
      expect(
        answerNumber(d4.answer, `@${seed}`),
        `범위가 비었다: ${d4.content}`,
      ).toBeGreaterThanOrEqual(1);
      // 1-4-5 심화 — 답 ≥ 1
      const d5 = problem("1-4-5", "심화하", seed);
      expect(
        answerNumber(d5.answer, `@${seed}`),
        `범위가 비었다: ${d5.content}`,
      ).toBeGreaterThanOrEqual(1);
      // 1-4-1 심화 범위 갈래 — 범위 속 분모 후보가 정확히 하나
      const d1 = problem("1-4-1", "심화하", seed);
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
      // 🔴 실패는 붉음이 아니라 **날것 폴백**으로 온다 — `renderMathHtml` 은
      //    「katex-error 를 절대 포함하지 않는다」고 스스로 적어 두었다(2026-08-30 실측).
      expect(html, code).not.toContain("math-raw");
    }
    // 빈칸 낀 분수 꼴도 — 1-4-1 연산·1-4-4 심화가 쓰는 모양 그대로
    for (const tex of [
      "$\\frac{4}{5}=\\frac{\\square}{20}$",
      "$\\frac{1}{4}<\\frac{\\square}{8}<\\frac{3}{4}$",
    ]) {
      const html = renderMathHtml(tex);
      expect(html, tex).not.toContain("katex-error");
      expect(html, tex).not.toMatch(/color:\s*#cc0000/i);
      // 🔴 실패는 붉음이 아니라 **날것 폴백**으로 온다 — `renderMathHtml` 은
      //    「katex-error 를 절대 포함하지 않는다」고 스스로 적어 두었다(2026-08-30 실측).
      expect(html, tex).not.toContain("math-raw");
    }
  });

  it("1-4 다섯 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES14) {
      for (const tier of tiersOf(unitOf(code))) {
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
    // 넓힌 축 — 분수 **밖**·**띄어 쓴** 조사도 본다(첫 판이 여기서 눈멀어 있었다)
    expect(fracJosaMisses("차 $6$를 더해")).toHaveLength(1); // 육 → «을»
    expect(fracJosaMisses("$48\\div6$로 계산했습니다")).toHaveLength(1); // 육 → «으로»
    expect(fracJosaMisses("$2,\\ 5,\\ 10$로 $3$개")).toHaveLength(1); // 십 → «으로»
    expect(fracJosaMisses("$6$ 를 더해")).toHaveLength(1); // 한 칸 띄워도 조사다
    expect(fracJosaMisses("차 $6$을 더해")).toHaveLength(0);
    expect(fracJosaMisses("$7$로 나누면")).toHaveLength(0); // 칠 = ㄹ받침
    // ③ 조사 뒤 한글 — 「이상」의 «이» 를 조사로 읽으면 범위 소단원이 통째로 거짓 양성
    expect(fracJosaMisses("$49$ 이상인 수를 모두")).toHaveLength(0);
    expect(fracJosaMisses("$38$ 이상 $49$ 이하인 수")).toHaveLength(0);
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES15) {
      for (const tier of tiersOf(unitOf(code))) {
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
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES15) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래마다 답이 상수가 아니다 (답 분포)", () => {
    for (const code of CODES15) {
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          answerFracValue(p.answer, `${code} ${tier} @${seed}`);
        }
      }
    }
  });

  it("이름 약속 — 「진분수」는 진분수만, 「대분수」는 대분수가 낀다 (⑵)", () => {
    // ⚠️ **소단원마다 자기 갈래를 돈다**(2026-08-31 물결 2). 형제 넷을 한 루프에 넣고
    //    대표 하나(`1-5-1`)의 `tiersOf` 로 돌면, **형제 중 하나만 확대 갈래를 채운 날**
    //    다른 형제에서 `generateElementaryProblem` 이 던진다 —
    //    `helpers/elemTiers` 머리말이 「그러면 루프를 소단원마다 쪼개라」고 적어 둔 자리다.
    //    실제로 1-5-1 에 «심화중» 이 붙고 1-5-2 는 비운 날 이 시험이 빨개졌다.
    for (const seed of SEEDS) {
      for (const code of ["1-5-1", "1-5-3"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          // 이름이 거는 것은 **피연산자**다 — 진분수끼리 더해도 «합»은 대분수가 될 수
          // 있고(교과서도 그렇게 쓴다), 심화의 역산 발문은 그 합을 내건다.
          // 그래서 마지막 덩어리(결과)를 뺀 나머지에만 «대분수 없음»을 건다.
          const chunks = [...c.matchAll(/\$([^$]+)\$/g)]
            .map((m) => m[1]!)
            .filter((x) => x.includes("\\frac"));
          const operands = tier === "심화하" ? chunks.slice(0, -1) : chunks;
          for (const piece of operands) {
            expect(
              /\d\\frac\{/.test(piece),
              `${code} ${tier} @${seed} 진분수 소단원의 피연산자가 대분수다\n${c}`,
            ).toBe(false);
          }
        }
      }
      for (const code of ["1-5-2", "1-5-4"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          expect(
            /\d\\frac\{/.test(c),
            `${code} ${tier} @${seed} 대분수 소단원에 대분수가 없다\n${c}`,
          ).toBe(true);
        }
      }
      // 덧셈 소단원은 뺄셈 문장을 쓰지 않는다.
      for (const tier of tiersOf(unitOf("1-5-1"))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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
        const dp = problem(code, "심화하", seed);
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
        const dp = problem(code, "심화하", seed);
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
        for (const tier of tiersOf(unitOf(code))) {
          const p = problem(code, tier, seed);
          const [num] = answerFracValue(p.answer, `${code} ${tier} @${seed}`);
          expect(num, `${code} ${tier} @${seed}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("\\frac 가 붉음 없이 그려진다 (렌더)", () => {
    for (const code of CODES15) {
      for (const tier of tiersOf(unitOf(code))) {
        const p = problem(code, tier, 11);
        const html = renderMathHtml(`${p.content} ${p.answer} ${p.solution}`);
        expect(html, `${code} ${tier}`).not.toContain("katex-error");
        expect(html, `${code} ${tier}`).not.toMatch(/color:\s*#cc0000/i);
        // 🔴 실패는 붉음이 아니라 **날것 폴백**으로 온다 — `renderMathHtml` 은
        //    「katex-error 를 절대 포함하지 않는다」고 스스로 적어 두었다.
        expect(html, `${code} ${tier}`).not.toContain("math-raw");
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
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
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

/* ── 2-1 수의 범위와 어림하기 (D-72 7차) — 재검산 도우미 ── */

const CODES21 = ["2-1-1", "2-1-2", "2-1-3", "2-1-4", "2-1-5", "2-1-6"] as const;

/** 어림 셋 — 시험이 **제 손으로** 다시 센다(엔진의 것을 안 부른다). */
const ceilT = (x: number, p: number): number => Math.ceil(x / p) * p;
const floorT = (x: number, p: number): number => Math.floor(x / p) * p;
const roundT = (x: number, p: number): number =>
  Math.floor((x % p) / (p / 10)) >= 5 ? ceilT(x, p) : floorT(x, p);

/** 자리 이름 → 자릿값. */
const PLACE_OF: Record<string, number> = { 십: 10, 백: 100, 천: 1000 };

/** 답이 `$a,\ b$` 꼴(두 수)일 때 그 둘. */
function answerPair(answer: string, label: string): [number, number] {
  const m = /^\$(\d+),\\ (\d+)\$$/.exec(answer);
  expect(m, `${label}: 두 수 답이 아니다 — ${answer}`).not.toBeNull();
  return [Number(m![1]), Number(m![2])];
}

/** 답이 `$a,\ b,\ c…$` 꼴일 때 전부. */
function answerList(answer: string, label: string): number[] {
  const m = /^\$(.+)\$$/.exec(answer);
  expect(m, `${label}: KaTeX 로 안 감싼 답 — ${answer}`).not.toBeNull();
  return m![1]!.split(",\\ ").map((s) => {
    expect(s, `${label}: 수가 아닌 항목 — ${answer}`).toMatch(/^\d+$/);
    return Number(s);
  });
}

/** 발문의 `$…$` 안 자연수 전부(순서대로). */
const intsIn = (t: string): number[] =>
  [...t.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    (m[1]!.match(/\d+/g) ?? []).map(Number),
  );

describe("[초5 2-1] 난이도 4단 확대 (D-72 7차)", () => {
  it("여섯 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES21) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES21) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES21) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES21) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래마다 답이 상수가 아니다 (답 분포)", () => {
    for (const code of CODES21) {
      for (const tier of tiersOf(unitOf(code))) {
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
    for (const code of CODES21) {
      for (const tier of tiersOf(unitOf(code))) {
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

  /* ── 낱말 축 (D-66⑸) ── */

  it("낱말 축 — 이상·이하 / 초과·미만 / 올림 / 버림 / 반올림이 제자리에 있다", () => {
    // ⚠️ 「반올림」은 「올림」을 **글자로 품는다** — 먼저 지우고 봐야 한다
    // (옛 표준이 `includes("올림")` 때문에 2-1-6 에서 올림 문항을 내던 그 자리).
    const hasUp = (c: string) => c.replace(/반올림/g, "").includes("올림");
    // 🔴 **소단원마다 «그 소단원이 내는 갈래»를 돈다.** 예전에는 대표 하나
    //    (`2-1-1`)의 `tiersOf` 로 여섯을 다 돌았는데, 확대 갈래(D-113)가 한쪽에만
    //    붙는 순간 다른 소단원에서 **던진다** — 물결 3 이 2-1-1 에만 «심화중»을
    //    세우자 곧바로 났다(물결 2 가 1-5 에서 겪은 그 자리이고,
    //    `helpers/elemTiers` 머리말이 미리 적어 둔 함정이다).
    const each = (code: string, fn: (tier: ElemTier, seed: number) => void) => {
      for (const tier of tiersOf(unitOf(code)))
        for (const seed of SEEDS) fn(tier, seed);
    };
    each("2-1-1", (tier, seed) => {
      const c1 = problem("2-1-1", tier, seed).content;
      expect(/이상|이하/.test(c1), `2-1-1 ${tier} @${seed}\n${c1}`).toBe(true);
      expect(/초과|미만/.test(c1), `2-1-1 ${tier} @${seed}\n${c1}`).toBe(false);
    });
    each("2-1-2", (tier, seed) => {
      const c2 = problem("2-1-2", tier, seed).content;
      expect(/초과|미만/.test(c2), `2-1-2 ${tier} @${seed}\n${c2}`).toBe(true);
      expect(/이상|이하/.test(c2), `2-1-2 ${tier} @${seed}\n${c2}`).toBe(false);
    });
    // 어림 셋 — 제 낱말이 반드시 있고, 반올림은 2-1-6 에만 있다.
    //
    // ⚠️ **발문+해설**에서 찾는다. 「기본」 갈래는 생활 장면에서 학생이 어림을
    //    **스스로 고르는** 것이 그 갈래의 정체라 발문에 낱말을 일부러 안 쓴다
    //    (「올림하시오」라고 말해 주면 판별이 사라진다). 발문만 보면 그 갈래가
    //    통째로 빨개지는데, 그것은 제품이 아니라 시험이 틀린 것이다.
    each("2-1-4", (tier, seed) => {
      const p = problem("2-1-4", tier, seed);
      expect(hasUp(`${p.content} ${p.solution}`), `2-1-4 ${tier}`).toBe(true);
      expect(p.content.includes("반올림"), `2-1-4 ${tier} 에 반올림`).toBe(
        false,
      );
      // 소수는 2-1-6 에만 (소단원 이름이 「어림의 활용」이라 거기가 자리다)
      expect(/\d\.\d/.test(p.content), `2-1-4 ${tier} 에 소수`).toBe(false);
    });
    each("2-1-5", (tier, seed) => {
      const p = problem("2-1-5", tier, seed);
      expect(
        `${p.content} ${p.solution}`.includes("버림"),
        `2-1-5 ${tier}`,
      ).toBe(true);
      expect(p.content.includes("반올림"), `2-1-5 ${tier} 에 반올림`).toBe(
        false,
      );
      expect(/\d\.\d/.test(p.content), `2-1-5 ${tier} 에 소수`).toBe(false);
    });
    each("2-1-6", (tier, seed) => {
      const p = problem("2-1-6", tier, seed);
      expect(
        `${p.content} ${p.solution}`.includes("반올림"),
        `2-1-6 ${tier}`,
      ).toBe(true);
    });
  });

  /* ── 경계 — 이 대단원의 알맹이 ── */

  it("2-1-1·2-1-2 — 경계값이 목록에 있고, 이상은 넣고 초과는 뺀다", () => {
    for (const seed of SEEDS) {
      for (const [code, keepEdge] of [
        ["2-1-1", true],
        ["2-1-2", false],
      ] as const) {
        const calc = problem(code, "연산", seed);
        const label = `${code} 연산 @${seed}`;
        const nums0 = intsIn(calc.content);
        const pool = nums0.slice(0, 5);
        const limit = nums0[5]!;
        expect(pool, `${label} 목록이 다섯이 아니다`).toHaveLength(5);
        // 경계값 자신이 목록에 **반드시** 있어야 두 낱말의 답이 갈린다
        expect(
          pool,
          `${label} 경계값이 목록에 없다\n${calc.content}`,
        ).toContain(limit);
        const want = pool
          .filter((v) => (keepEdge ? v >= limit : v > limit))
          .sort((a, b) => a - b);
        expect(answerList(calc.answer, label), calc.content).toEqual(want);
        // 반대쪽 낱말이면 답이 **달라야** 한다 — 경계값 하나가 그것을 보장한다
        const other = pool
          .filter((v) => (keepEdge ? v > limit : v >= limit))
          .sort((a, b) => a - b);
        expect(want.length, `${label} 두 낱말이 같은 답을 낸다`).not.toBe(
          other.length,
        );
      }
    }
  });

  it("개수로 독립 검산 — 낱말 넷이 경계를 어떻게 가르는가 (리드 지적)", () => {
    // 값 검산은 경계 하나 어긋나도 침묵할 수 있지만, **개수**는 1 이 어긋나 바로 보인다.
    for (const seed of SEEDS) {
      const a1 = problem("2-1-1", "응용", seed);
      const [lo1, hi1] = intsIn(a1.content);
      let evens = 0;
      for (let v = lo1!; v <= hi1!; v += 1) if (v % 2 === 0) evens += 1;
      expect(Number(/^\$(\d+)\$$/.exec(a1.answer)![1]), a1.content).toBe(evens);

      const a2 = problem("2-1-2", "응용", seed);
      const [lo2, hi2] = intsIn(a2.content);
      expect(
        Number(/^\$(\d+)\$$/.exec(a2.answer)![1]),
        `${a2.content}\n초과·미만은 양 끝을 뺀다`,
      ).toBe(hi2! - lo2! - 1);

      // 심화 역산 — 개수에서 끝값을 되짚는다(이상·이하는 +1, 초과·미만은 −1)
      const d1 = problem("2-1-1", "심화하", seed);
      const [aa, cnt] = intsIn(d1.content);
      const b1 = Number(/^\$(\d+)\$$/.exec(d1.answer)![1]);
      expect(b1 - aa! + 1, d1.content).toBe(cnt);
      const d2 = problem("2-1-2", "심화하", seed);
      const [aa2, cnt2] = intsIn(d2.content);
      const b2 = Number(/^\$(\d+)\$$/.exec(d2.answer)![1]);
      expect(b2 - aa2! - 1, d2.content).toBe(cnt2);
    }
  });

  it("2-1-3 — 경계값인 사람·물건이 «이상»엔 들고 «초과»엔 안 든다", () => {
    for (const seed of SEEDS) {
      for (const [tier, keepEdge] of [
        ["연산", true],
        ["기본", false],
      ] as const) {
        const p = problem("2-1-3", tier, seed);
        // 발문의 수 차례: 기준 · **후보 개수** · 값들. 개수는 씨앗마다 4~6 으로 갈린다
        // (답의 폭이 후보 수에 매여 있어 고정하면 답이 2종뿐이 된다 — 리드 검수 반려 ③).
        const ns = intsIn(p.content);
        const limit = ns[0]!;
        const count = ns[1]!;
        const values = ns.slice(2, 2 + count);
        expect(values, `2-1-3 ${tier} @${seed}\n${p.content}`).toHaveLength(
          count,
        );
        expect(
          values,
          `2-1-3 ${tier} @${seed} 경계값이 목록에 없다\n${p.content}`,
        ).toContain(limit);
        const want = values.filter((v) => (keepEdge ? v >= limit : v > limit));
        expect(Number(/^\$(\d+)\$$/.exec(p.answer)![1]), p.content).toBe(
          want.length,
        );
      }
    }
  });

  /* ── 어림 — 「뜻 없는 어림」이 없고, 역산 범위는 양방향으로 선다 ── */

  it("어림 문항은 뜻이 있다 — 아래 자리가 0인 수를 어림하라고 하지 않는다", () => {
    for (const code of ["2-1-4", "2-1-5", "2-1-6"] as const) {
      for (const tier of ["연산", "응용"] as const) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const placeName = /([십백천])의 자리/.exec(p.content)?.[1];
          if (!placeName) continue; // 소수 갈래 등
          const place = PLACE_OF[placeName]!;
          const x = intsIn(p.content)[0]!;
          expect(
            x % place,
            `${code} ${tier} @${seed}: ${x} 는 ${placeName}의 자리 아래가 0이라 어림이 뜻이 없다`,
          ).not.toBe(0);
        }
      }
    }
    // 반올림 판정 자리가 4 이하·5 이상 **양쪽**을 밟는가 — 한쪽만이면 그 가지가 죽는다
    let up = 0;
    let down = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const p = problem("2-1-6", "연산", seed);
      const placeName = /([십백천])의 자리/.exec(p.content)![1]!;
      const place = PLACE_OF[placeName]!;
      const x = intsIn(p.content)[0]!;
      if (Math.floor((x % place) / (place / 10)) >= 5) up += 1;
      else down += 1;
    }
    expect(up, "반올림에서 «올리는» 가지가 안 나왔다").toBeGreaterThan(20);
    expect(down, "반올림에서 «버리는» 가지가 안 나왔다").toBeGreaterThan(20);
  });

  it("2-1-4·2-1-5·2-1-6 연산·응용 — 어림값이 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      for (const [code, fn] of [
        ["2-1-4", ceilT],
        ["2-1-5", floorT],
        ["2-1-6", roundT],
      ] as const) {
        const calc = problem(code, "연산", seed);
        const pn = /([십백천])의 자리/.exec(calc.content)?.[1];
        if (pn) {
          const place = PLACE_OF[pn]!;
          const x = intsIn(calc.content)[0]!;
          expect(
            Number(/^\$(\d+)\$$/.exec(calc.answer)![1]),
            calc.content,
          ).toBe(fn(x, place));
        }
        const ap = problem(code, "응용", seed);
        const apn = /([십백천])의 자리/.exec(ap.content)?.[1];
        if (!apn) continue;
        const place = PLACE_OF[apn]!;
        const x = intsIn(ap.content)[0]!;
        const got = Number(/^\$(\d+)\$$/.exec(ap.answer)![1]);
        if (code === "2-1-4") expect(got, ap.content).toBe(ceilT(x, place) - x);
        else if (code === "2-1-5")
          expect(got, ap.content).toBe(x - floorT(x, place));
        else
          expect(got, ap.content).toBe(
            Math.abs(roundT(x, 10) - roundT(x, 100)),
          );
      }
    }
  });

  it("역산 범위는 **양방향**으로 선다 — 끝값은 그 어림값이 되고 바깥값은 안 된다", () => {
    // 리드 지적: 「범위를 이렇게 계산했다」를 옮겨 적으면 넓게 틀려도 조용하다.
    // 끝값을 직접 어림해 맞는지 보고, **바로 바깥값**도 어림해 안 맞는지 본다.
    for (const seed of SEEDS) {
      for (const [code, fn] of [
        ["2-1-4", ceilT],
        ["2-1-6", roundT],
      ] as const) {
        const p = problem(code, "심화하", seed);
        const label = `${code} 심화 @${seed}`;
        const place = PLACE_OF[/([십백천])의 자리/.exec(p.content)![1]!]!;
        const target = intsIn(p.content)[0]!;
        const [lo, hi] = answerPair(p.answer, label);
        expect(lo, `${label} 아래끝이 위끝보다 크다`).toBeLessThanOrEqual(hi);
        expect(fn(lo, place), `${label} 아래끝 ${lo}\n${p.content}`).toBe(
          target,
        );
        expect(fn(hi, place), `${label} 위끝 ${hi}\n${p.content}`).toBe(target);
        expect(
          fn(lo - 1, place),
          `${label} 아래끝 바깥 ${lo - 1} 도 ${target} 이 된다 — 범위가 넓다`,
        ).not.toBe(target);
        expect(
          fn(hi + 1, place),
          `${label} 위끝 바깥 ${hi + 1} 도 ${target} 이 된다 — 범위가 넓다`,
        ).not.toBe(target);
      }

      // 2-1-5 심화는 **조건 조합** — 두 어림을 동시에 만족하는 범위다
      const d5 = problem("2-1-5", "심화하", seed);
      const label5 = `2-1-5 심화 @${seed}`;
      const place5 = PLACE_OF[/([십백천])의 자리/.exec(d5.content)![1]!]!;
      const [u, dn] = intsIn(d5.content);
      const [lo5, hi5] = answerPair(d5.answer, label5);
      for (const v of [lo5, hi5]) {
        expect(ceilT(v, place5), `${label5} ${v} 의 올림\n${d5.content}`).toBe(
          u,
        );
        expect(floorT(v, place5), `${label5} ${v} 의 버림`).toBe(dn);
      }
      for (const v of [lo5 - 1, hi5 + 1]) {
        const both = ceilT(v, place5) === u && floorT(v, place5) === dn;
        expect(both, `${label5} 바깥값 ${v} 도 두 조건을 만족한다`).toBe(false);
      }
      // 두 조건이 **둘 다** 답을 깎는가 — 한쪽만으로는 범위가 더 넓어야 한다
      let onlyCeil = 0;
      let onlyFloor = 0;
      for (let v = dn! - place5; v <= u! + place5; v += 1) {
        if (v >= 1 && ceilT(v, place5) === u) onlyCeil += 1;
        if (v >= 1 && floorT(v, place5) === dn) onlyFloor += 1;
      }
      expect(onlyCeil, `${label5} 올림 조건이 놀고 있다`).toBeGreaterThan(
        hi5 - lo5 + 1,
      );
      expect(onlyFloor, `${label5} 버림 조건이 놀고 있다`).toBeGreaterThan(
        hi5 - lo5 + 1,
      );
    }
  });

  it("2-1-6 기본 — 소수 반올림이 정수 스케일로 다시 선다 (꼬리 0 없음)", () => {
    for (const seed of SEEDS) {
      const p = problem("2-1-6", "기본", seed);
      const label = `2-1-6 기본 @${seed}`;
      const src = /\$(\d+\.\d+)\$/.exec(p.content)![1]!;
      const ans = /^\$(\d+(?:\.\d+)?)\$$/.exec(p.answer)![1]!;
      // 백분의 일 정수로 재서 부동소수점을 안 쓴다
      const centi = Math.round(Number(src) * 100);
      const tenth = Math.floor(centi / 10) % 10;
      const hundredth = centi % 10;
      expect(
        hundredth,
        `${label} 둘째 자리가 0이면 반올림이 뜻이 없다`,
      ).not.toBe(0);
      const whole = Math.floor(centi / 100);
      const want = hundredth >= 5 ? whole * 10 + tenth + 1 : whole * 10 + tenth;
      expect(Math.round(Number(ans) * 10), `${label}\n${p.content}`).toBe(want);
      expect(ans, `${label} 꼬리 0 이 남았다 — ${ans}`).not.toMatch(/\.\d*0$/);
    }
  });

  it("전수 쓸기 1000 — 어림이 뜻을 잃는 세 자리를 구성이 막는다 (리드 검수 반려 ①②)", () => {
    // 셋 다 **값은 옳아서** 검산 가드가 조용한 부류다. 「그 문항이 뜻이 있나」는
    // 값 검산과 다른 축이라 따로 세야 하고, 10%짜리 분포는 **전수**라야 안다.
    let intAns = 0;
    let zeroDiff = 0;
    for (let seed = 0; seed < 1000; seed += 1) {
      // ① 「소수 첫째 자리까지」인데 답이 정수로 접히면 자리가 지면에서 사라진다
      //    (`dec` 가 꼬리 0 을 자른다 — 「$1.0$」이라 쓸 수도 없다).
      const r = problem("2-1-6", "기본", seed);
      if (/^\$\d+\$$/.test(r.answer)) {
        intAns += 1;
        if (intAns <= 2)
          expect(r.answer, `2-1-6 기본 @${seed} 정수 답\n${r.content}`).toMatch(
            /\./,
          );
      }
      // ② 「차를 구하시오」인데 두 어림이 같은 값이면 견줌이 뜻을 잃는다
      const a = problem("2-1-6", "응용", seed);
      if (a.answer === "$0$") {
        zeroDiff += 1;
        if (zeroDiff <= 2)
          expect(a.answer, `2-1-6 응용 @${seed} 차가 0\n${a.content}`).not.toBe(
            "$0$",
          );
      }
    }
    expect(intAns, "소수 첫째 자리 답이 정수로 접힌 자리").toBe(0);
    expect(zeroDiff, "두 어림이 같은 값을 가리킨 자리").toBe(0);
  });

  it("답의 가짓수가 넉넉하다 — 「상수답이 아니다」로는 2종도 통과한다 (반려 ③)", () => {
    // ⚠️ 앞서 「답 분포」 시험은 **가짓수 ≥ 2** 만 봤다. 그래서 2-1-3 연산·기본이
    //    «2종뿐»인 채로 통과했다(최빈 51.4% — 학생이 보기도 전에 둘 중 하나).
    //    지표를 **가짓수**로 바꿔야 그 자리가 보인다.
    const N = 1000;
    const bad: string[] = [];
    for (const code of CODES21) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Map<string, number>();
        for (let seed = 0; seed < N; seed += 1) {
          const ans = problem(code, tier, seed).answer;
          seen.set(ans, (seen.get(ans) ?? 0) + 1);
        }
        const top = Math.max(...seen.values());
        if (seen.size < 4 || top / N > 0.45) {
          bad.push(
            `${code} ${tier}: 가짓수 ${seen.size} · 최빈 ${((top / N) * 100).toFixed(1)}%`,
          );
        }
      }
    }
    expect(bad, "답의 폭이 좁은 갈래").toEqual([]);
  });

  it("2-1-3 후보 수가 씨앗마다 갈린다 — 답의 폭은 후보 수가 정한다", () => {
    const sizes = new Set<number>();
    for (let seed = 0; seed < 200; seed += 1) {
      const p = problem("2-1-3", "연산", seed);
      // 발문이 스스로 밝힌 개수와 실제 나열이 같아야 한다(「넷의」 하드코딩 금지)
      const said = Number(/\$(\d+)\$(?:개|명)의/.exec(p.content)![1]);
      // ⚠️ 목록을 고를 때 **쉼표가 있는** 덩어리를 요구한다 — 안 그러면 기준값
      //    「$12$ 살」이 먼저 걸려 나열이 1개로 읽힌다(내 첫 판이 그랬다).
      const listed = /\$(\d+(?:,\\ \d+)+)\$ (?:kg|살)/
        .exec(p.content)![1]!
        .split(",\\ ").length;
      expect(
        said,
        `2-1-3 연산 @${seed} 발문이 말한 수와 나열이 다르다\n${p.content}`,
      ).toBe(listed);
      sizes.add(listed);
    }
    expect(
      sizes.size,
      `후보 수가 한 가지뿐이다 — ${[...sizes]}`,
    ).toBeGreaterThanOrEqual(2);
  });

  it("2-1 여섯 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES21) {
      for (const tier of tiersOf(unitOf(code))) {
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

/* ── 2-2 분수의 곱셈 (D-72 8차) — 재검산 도우미 ── */

const CODES22 = ["2-2-1", "2-2-2", "2-2-3", "2-2-4"] as const;

/** 유리수 곱 — 시험이 제 손으로 센다(엔진의 mulFrac 을 안 부른다). */
const mulV = (x: [number, number], y: [number, number]): [number, number] => {
  const num = x[0] * y[0];
  const den = x[1] * y[1];
  const g = gcd2(num, den);
  return [num / g, den / g];
};

describe("[초5 2-2] 난이도 4단 확대 (D-72 8차)", () => {
  it("네 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES22) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES22) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("답의 가짓수가 넉넉하다 (씨앗 500 · 가짓수 ≥4 · 최빈 ≤45%)", () => {
    const N = 500;
    const bad: string[] = [];
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Map<string, number>();
        for (let seed = 0; seed < N; seed += 1) {
          const ans = problem(code, tier, seed).answer;
          seen.set(ans, (seen.get(ans) ?? 0) + 1);
        }
        const top = Math.max(...seen.values());
        if (seen.size < 4 || top / N > 0.45)
          bad.push(
            `${code} ${tier}: 가짓수 ${seen.size} · 최빈 ${((top / N) * 100).toFixed(1)}%`,
          );
      }
    }
    expect(bad, "답의 폭이 좁은 갈래").toEqual([]);
  });

  it("모든 수가 KaTeX 안에 있다 (R1) — 그림은 없다", () => {
    const bad: string[] = [];
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
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

  /* ── ① 기약은 «답의 꼴»로만 · 약분 과정이 빈 말이 아니다 ── */

  it("답은 언제나 기약이고, 발문은 기약을 요구하지 않는다 (①)", () => {
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const label = `${code} ${tier} @${seed}`;
          // 답의 꼴로만 잠근다 — 「약분」·「기약」은 이 소단원 이름이 아니다
          expect(
            /기약|약분하여 나타/.test(p.content),
            `${label} 발문이 기약을 요구한다\n${p.content}`,
          ).toBe(false);
          answerFracValue(p.answer, label); // 기약·대분수 정본 꼴을 잠근다
        }
      }
    }
  });

  it("약분이 **언제나** 일어난다 — 해설의 «약분»이 빈 말이 아니게 (①)", () => {
    // 「약분 과정이 해설에 선다」는 문장은, 약분이 **일어나는 짝을 뽑아야** 참이 된다.
    // 안 그러면 늘 기약이라 그 문장이 아무것도 안 가리킨다.
    //
    // ⚠️ 처음엔 문턱을 «200 중 100 초과» 로 눈대중해 두었는데, **변이가 그대로
    //    통과했다**(「자연수를 그냥 2~8 에서 뽑는다」 → 이론 비율 25/42 = **59.5%**
    //    라 119/200 으로 문턱을 넘는다). 구성은 공약수를 **반드시** 갖게 뽑으므로
    //    실측이 **100.0%** 다(씨앗 500 전량). 그러니 문턱도 **전량**이어야 한다 —
    //    구성이 보장하는 것을 확률로 재면 그 가드는 헐겁다(2026-08-23 실측).
    for (const [code, tier] of [
      ["2-2-1", "연산"],
      ["2-2-2", "연산"],
      ["2-2-4", "연산"],
    ] as const) {
      let reduced = 0;
      let read = 0;
      for (let seed = 0; seed < 200; seed += 1) {
        const p = problem(code, tier, seed);
        // 해설이 `\frac{큰}{d}=…` 로 한 번 더 접히면 약분이 일어난 것이다
        const beforeAfter = /\\frac\{(\d+)\}\{(\d+)\}=(?:\d|\\frac)/.exec(
          p.solution,
        );
        if (beforeAfter) {
          read += 1;
          const bn = Number(beforeAfter[1]);
          const bd = Number(beforeAfter[2]);
          if (gcd2(bn, bd) > 1) reduced += 1;
        }
      }
      // 분모를 먼저 지킨다 — 해설을 하나도 못 읽으면 «100%» 가 공허하다
      expect(read, `${code} ${tier}: 해설에서 곱셈 결과를 못 읽었다`).toBe(200);
      expect(
        reduced,
        `${code} ${tier}: 약분이 안 일어난 문항이 있다 (${reduced}/200)`,
      ).toBe(200);
    }
  });

  /* ── ② 차례가 이름의 약속 — 두 소단원이 서로의 음성 대조다 ── */

  it("2-2-1 은 «분수 먼저», 2-2-2 는 «자연수 먼저» (②)", () => {
    // □ 도 자연수 자리를 지킨다 — 역산 갈래는 그 자리를 □ 로 비워 내건다.
    const fracFirst = /\\frac\{\d+\}\{\d+\}\\times(?:\d|\\square)/;
    const wholeFirst =
      /(?:^|[^}\d])(?:\d+|\\square)\\times\\frac\{\d+\}\{\d+\}/;
    for (const seed of SEEDS) {
      for (const tier of tiersOf(unitOf("2-2-1"))) {
        const c1 = `${problem("2-2-1", tier, seed).content} ${problem("2-2-1", tier, seed).solution}`;
        const c2 = `${problem("2-2-2", tier, seed).content} ${problem("2-2-2", tier, seed).solution}`;
        // 제 차례가 있어야 하고 —
        expect(
          fracFirst.test(c1),
          `2-2-1 ${tier} @${seed} 분수 먼저가 없다\n${c1}`,
        ).toBe(true);
        expect(
          wholeFirst.test(c2),
          `2-2-2 ${tier} @${seed} 자연수 먼저가 없다\n${c2}`,
        ).toBe(true);
        // — 상대의 차례는 **발문에** 없어야 한다(음성 대조).
        expect(
          wholeFirst.test(problem("2-2-1", tier, seed).content),
          `2-2-1 ${tier} @${seed} 발문에 자연수가 앞선 식이 있다`,
        ).toBe(false);
        expect(
          fracFirst.test(problem("2-2-2", tier, seed).content),
          `2-2-2 ${tier} @${seed} 발문에 분수가 앞선 식이 있다`,
        ).toBe(false);
      }
    }
  });

  /* ── 산술 독립 검산 ── */

  it("2-2-1·2-2-2 — 곱이 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      for (const [code, tier] of [
        ["2-2-1", "연산"],
        ["2-2-2", "연산"],
      ] as const) {
        const p = problem(code, tier, seed);
        const label = `${code} ${tier} @${seed}`;
        const m =
          code === "2-2-1"
            ? /\\frac\{(\d+)\}\{(\d+)\}\\times(\d+)/.exec(p.content)!
            : /(\d+)\\times\\frac\{(\d+)\}\{(\d+)\}/.exec(p.content)!;
        const [fa, fd, k] =
          code === "2-2-1"
            ? [Number(m[1]), Number(m[2]), Number(m[3])]
            : [Number(m[2]), Number(m[3]), Number(m[1])];
        expect(
          answerFracValue(p.answer, label),
          `${label}\n${p.content}`,
        ).toEqual(mulV([fa, fd], [k, 1]));
      }
    }
  });

  it("2-2-3 — 두 진분수의 곱이 다시 서고, 피연산자가 모두 진분수다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-2-3", "연산", seed);
      const label = `2-2-3 연산 @${seed}`;
      const m = /\\frac\{(\d+)\}\{(\d+)\}\\times\\frac\{(\d+)\}\{(\d+)\}/.exec(
        p.content,
      )!;
      const [a, d, b, e] = [1, 2, 3, 4].map((i) => Number(m[i]));
      // 이름 약속 — 「진분수의 곱셈」이므로 피연산자가 둘 다 진분수다
      expect(a!, `${label} 앞이 진분수가 아니다`).toBeLessThan(d!);
      expect(b!, `${label} 뒤가 진분수가 아니다`).toBeLessThan(e!);
      expect(/\d\\frac\{/.test(p.content), `${label} 대분수가 있다`).toBe(
        false,
      );
      expect(
        answerFracValue(p.answer, label),
        `${label}\n${p.content}`,
      ).toEqual(mulV([a!, d!], [b!, e!]));
    }
  });

  it("2-2-4 — 대분수가 반드시 끼고, 가분수 전환이 해설에 선다 (③)", () => {
    for (const seed of SEEDS) {
      for (const tier of tiersOf(unitOf("2-2-4"))) {
        const p = problem("2-2-4", tier, seed);
        const label = `2-2-4 ${tier} @${seed}`;
        expect(
          /\d\\frac\{/.test(p.content),
          `${label} 대분수가 없다\n${p.content}`,
        ).toBe(true);
        expect(
          /가분수/.test(p.solution),
          `${label} 해설에 가분수 전환이 없다`,
        ).toBe(true);
      }
    }
  });

  it("2-2-4 심화 — 오개념(자연수부만 곱하기)을 실제로 밟게 하고 차가 선다 (③)", () => {
    // ⚠️ 이 갈래는 2026-08-23 까지 **응용** 자리에 있었다. D-72 가 4단 예시로 글자
    //    그대로 드는 문형(「잘못 계산했더니」)이라 3단에 두면 사다리가 뒤집힌다.
    for (const seed of SEEDS) {
      const p = problem("2-2-4", "심화하", seed);
      const label = `2-2-4 심화 @${seed}`;
      const m = /(\d+)\\frac\{(\d+)\}\{(\d+)\}\\times(\d+)/.exec(p.content)!;
      const [w, a, d, k] = [1, 2, 3, 4].map((i) => Number(m[i]));
      const right = mulV([w! * d! + a!, d!], [k!, 1]);
      const wrong = w! * k!;
      // 발문이 내건 «잘못 계산한 값» 이 정말 자연수부만 곱한 값이다
      // 인용 조사는 받침이 있으면 «이라고», 없으면 «라고» — 둘 다 읽는다.
      const said = Number(/곱해 \$(\d+)\$이?라고/.exec(p.content)![1]);
      expect(said, `${label} 잘못값이 자연수부 곱이 아니다\n${p.content}`).toBe(
        wrong,
      );
      // 차 = 바른 − 잘못 (바른 쪽이 언제나 크다 — 분수부가 0이 아니다)
      const diffNum = right[0] * 1 - wrong * right[1];
      const g = gcd2(Math.abs(diffNum), right[1]);
      expect(
        answerFracValue(p.answer, label),
        `${label}\n${p.content}`,
      ).toEqual([diffNum / g, right[1] / g]);
      expect(diffNum, `${label} 차가 0 이하다`).toBeGreaterThan(0);
    }
  });

  /* ── ④ 이웃 학년과 겹치지 않는다 — 손 목록이 아니라 실제로 뽑아 대조 ── */

  it("초6 2-1(분수의 나눗셈)·초5 1-5(분수 덧뺄셈)와 발문이 겹치지 않는다 (④)", () => {
    /** 수를 지운 «뼈대» — 수만 다른 같은 문형도 잡는다. */
    const skeleton = (t: string) => t.replace(/\d+/g, "#");
    const others = new Map<string, string>();
    const add = (grade: string, prefix: string) => {
      for (const u of elementaryUnits().filter(
        (x) => x.grade === grade && x.section.startsWith(prefix),
      )) {
        const tiers = supportedTiers(u);
        for (const tier of tiers.length ? tiers : [undefined]) {
          for (let seed = 1; seed <= 8; seed += 1) {
            const c = generateElementaryProblem(u, seed, tier).content;
            others.set(c, `${grade} ${u.section}`);
            others.set(`SKEL:${skeleton(c)}`, `${grade} ${u.section}`);
          }
        }
      }
    };
    add("초6", "2-1-");
    add("초5", "1-5-");
    expect(
      others.size,
      "이웃 모집단이 비었다 — 대조가 아무것도 안 한다",
    ).toBeGreaterThan(50);

    const clash: string[] = [];
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          const exact = others.get(c);
          if (exact)
            clash.push(`완전 일치 ${code} ${tier} ↔ ${exact}\n    ${c}`);
          const skel = others.get(`SKEL:${skeleton(c)}`);
          if (skel) clash.push(`골격 일치 ${code} ${tier} ↔ ${skel}\n    ${c}`);
        }
      }
    }
    expect(clash.slice(0, 3), `이웃과 겹친 발문 ${clash.length}건`).toEqual([]);
  });

  it("판별자 — 내 발문은 곱셈만 담는다(÷·+·− 0건) · 이웃엔 있다 (④ 음성 대조)", () => {
    // ⚠️ 처음엔 판별자를 「내 것에 ×가 있다」로 잡았는데, **음성 대조가 그것을
    //    깼다** — 이웃(초6 2-1 나눗셈 · 초5 1-5 덧뺄셈)의 **37.5%** 에도 ×가 있다
    //    (나눗셈은 역수를 «곱하고», 덧뺄셈은 통분에서 ×를 쓴다). 「내 것에 있다」는
    //    판별자가 아니다 — **이웃에 없어야** 갈라 준다.
    //
    //    실측(내 것 256행 · 이웃 576행, 2026-08-23):
    //      발문+해설 ×   : 내 100.0% / 이웃 37.5%  ← 한쪽만 참이라 약하다
    //      발문 ÷        : 내   0.0% / 이웃 17.7%  ← **한쪽 방향으로 확실**
    //      발문 수식 +·− : 내   0.0% / 이웃 22.2%
    //      발문 「나누」   : 내   0.0% / 이웃 21.2%
    //    그래서 잠그는 것은 **«내 발문에 다른 연산이 하나도 없다»** 쪽이다.
    const OTHER_OPS = /\\div|나누|나눗/;
    const addSub = (c: string) =>
      [...c.matchAll(/\$([^$]*)\$/g)].some((m) => /[+-]/.test(m[1]!));

    let mine = 0;
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const pr = problem(code, tier, seed);
          const label = `${code} ${tier} @${seed}`;
          expect(
            OTHER_OPS.test(pr.content),
            `${label} 발문에 나눗셈이 있다\n${pr.content}`,
          ).toBe(false);
          expect(
            addSub(pr.content),
            `${label} 발문 수식에 덧셈·뺄셈이 있다\n${pr.content}`,
          ).toBe(false);
          // 「기본·응용」은 문장으로만 주고 식은 학생이 세운다 — 그것이 그 갈래의
          // 정체라 **발문+해설**에서 곱셈을 찾는다(발문만 보면 시험이 틀린다).
          expect(
            `${pr.content} ${pr.solution}`,
            `${label} 에 곱셈이 없다`,
          ).toContain("\\times");
          mine += 1;
        }
      }
    }
    expect(mine).toBeGreaterThan(200);

    // 음성 대조 — 이웃에는 그 연산들이 **실제로 있다**. 없으면 이 판별자는
    // 「둘 다 0」이라 아무것도 안 가른다(0 이 «깨끗»인지 «못 셈»인지의 그 자리).
    let others = 0;
    let othersOtherOps = 0;
    for (const [grade, prefix] of [
      ["초6", "2-1-"],
      ["초5", "1-5-"],
    ] as const) {
      for (const u of elementaryUnits().filter(
        (x) => x.grade === grade && x.section.startsWith(prefix),
      )) {
        const tiers = supportedTiers(u);
        for (const tier of tiers.length ? tiers : [undefined]) {
          for (let seed = 1; seed <= 16; seed += 1) {
            const q = generateElementaryProblem(u, seed, tier);
            others += 1;
            if (OTHER_OPS.test(q.content) || addSub(q.content))
              othersOtherOps += 1;
          }
        }
      }
    }
    expect(others, "반대쪽 모집단이 비었다").toBeGreaterThan(200);
    expect(
      othersOtherOps / others,
      `이웃 발문의 ${((othersOtherOps / others) * 100).toFixed(1)}% 에만 다른 연산이 있다 — 판별자가 안 갈라 준다`,
    ).toBeGreaterThan(0.25);
  });

  it("2-2 네 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES22) {
      for (const tier of tiersOf(unitOf(code))) {
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

/* ── 2-4 소수의 곱셈 (D-72 9차) — 재검산 도우미 ── */

const CODES24 = [
  "2-4-1",
  "2-4-2",
  "2-4-3",
  "2-4-4",
  "2-4-5",
  "2-4-6",
  "2-4-7",
] as const;

/** 소수 표기를 **정수 스케일**로. 부동소수점을 안 쓴다. `[값, 자릿수]`. */
function decScaled(tok: string): [number, number] | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(tok);
  if (!m) return null;
  const frac = m[2] ?? "";
  return [Number(m[1] + frac), frac.length];
}

/** 답 덩어리에서 정수 스케일 값과 자릿수. */
function answerDecScaled(answer: string, label: string): [number, number] {
  const m = /^\$(\d+(?:\.\d+)?)\$$/.exec(answer);
  expect(m, `${label}: 수 답이 아니다 — ${answer}`).not.toBeNull();
  // 꼬리 0 은 지면 규약 위반이다 — `dec()` 가 접어야 한다
  expect(m![1], `${label}: 꼬리 0 이 남았다 — ${answer}`).not.toMatch(
    /\.\d*0$/,
  );
  return decScaled(m![1]!)!;
}

/** 발문의 `$…$` 안에 있는 소수·자연수 토큰들(순서대로). */
function decTokens(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(/\$([^$]+)\$/g)) {
    for (const piece of m[1]!.split(/\\times|=|\+|-/)) {
      const v = decScaled(piece.trim());
      if (v) out.push(v);
    }
  }
  return out;
}

/** 두 정수 스케일 값의 곱 — 자릿수는 더해진다(이 대단원의 알맹이). */
const mulScaled = (
  x: [number, number],
  y: [number, number],
): [number, number] => [x[0] * y[0], x[1] + y[1]];

/** 정수 스케일 값을 «접은» 꼴로 — 꼬리 0 을 없앤 [값, 자릿수]. */
function collapse([v, d]: [number, number]): [number, number] {
  let value = v;
  let dp = d;
  while (dp > 0 && value % 10 === 0) {
    value /= 10;
    dp -= 1;
  }
  return [value, dp];
}

describe("[초5 2-4] 난이도 4단 확대 (D-72 9차)", () => {
  it("일곱 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES24) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES24) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("답의 가짓수가 넉넉하다 (씨앗 500 · 가짓수 ≥4 · 최빈 ≤45%)", () => {
    const N = 500;
    const bad: string[] = [];
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Map<string, number>();
        for (let seed = 0; seed < N; seed += 1) {
          const ans = problem(code, tier, seed).answer;
          seen.set(ans, (seen.get(ans) ?? 0) + 1);
        }
        const top = Math.max(...seen.values());
        if (seen.size < 4 || top / N > 0.45)
          bad.push(
            `${code} ${tier}: 가짓수 ${seen.size} · 최빈 ${((top / N) * 100).toFixed(1)}%`,
          );
      }
    }
    expect(bad, "답의 폭이 좁은 갈래").toEqual([]);
  });

  it("모든 수가 KaTeX 안에 있다 (R1) — 그림은 없다", () => {
    const bad: string[] = [];
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
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

  /* ── 이름의 약속 — «차례»와 «크기»를 따로 잠근다 ── */

  // ⚠️ **갈래 루프는 소단원마다 쪼개져 있다** (D-113, 2026-08-30). 예전에는 형제 넷을
  //    `tiersOf(unitOf("2-4-1"))` **대표 하나**로 돌았다. 그러면 형제 중 하나만 먼저
  //    확대 갈래를 채우는 날 다른 형제에서 생성기가 **던진다** — 그건 결함이 아니라
  //    설계지만(`helpers/elemTiers.ts` 참조), 고치는 자리는 여기다. 대표를 바꿔 때우면
  //    다음 형제를 채울 때 또 던진다.
  it("차례 — 2-4-1·2 는 소수 먼저, 2-4-3·4 는 자연수 먼저 (서로의 음성 대조)", () => {
    // □ 도 그 자리를 지킨다(역산 갈래가 한쪽을 비운다).
    const decFirst = /(?:^|[^\d.])\d+\.\d+\\times(?:\d+|\\square)(?!\.)/;
    const wholeFirst = /(?:^|[^\d.])(?:\d+|\\square)\\times\d+\.\d+/;
    for (const seed of SEEDS) {
      for (const code of ["2-4-1", "2-4-2"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          const s = problem(code, tier, seed).solution;
          expect(
            decFirst.test(`${c} ${s}`),
            `${code} ${tier} @${seed} 소수 먼저가 없다\n${c}`,
          ).toBe(true);
          expect(
            wholeFirst.test(c),
            `${code} ${tier} @${seed} 발문에 자연수가 앞선 식이 있다\n${c}`,
          ).toBe(false);
        }
      }
      for (const code of ["2-4-3", "2-4-4"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          const s = problem(code, tier, seed).solution;
          expect(
            wholeFirst.test(`${c} ${s}`),
            `${code} ${tier} @${seed} 자연수 먼저가 없다\n${c}`,
          ).toBe(true);
          expect(
            decFirst.test(c),
            `${code} ${tier} @${seed} 발문에 소수가 앞선 식이 있다\n${c}`,
          ).toBe(false);
        }
      }
    }
  });

  it("크기 — 「1보다 작은」 소단원의 소수는 1 미만, 「1보다 큰」 쪽은 1 초과", () => {
    /** 발문·해설의 소수 토큰 값들(정수 스케일 → 실수 비교는 스케일로). */
    const decsIn = (t: string) => decTokens(t).filter(([, d]) => d > 0);
    for (const seed of SEEDS) {
      // 2-4-1·2-4-3: 곱하는 소수가 1보다 작다 → 발문에 «0.x» 가 반드시 있다
      for (const code of ["2-4-1", "2-4-3"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          const unders = decsIn(c).filter(([v, d]) => v < 10 ** d);
          expect(
            unders.length,
            `${code} ${tier} @${seed} 1보다 작은 소수가 없다\n${c}`,
          ).toBeGreaterThan(0);
        }
      }
      // 2-4-2·2-4-4: 곱하는 소수가 1보다 크다
      for (const code of ["2-4-2", "2-4-4"] as const) {
        for (const tier of tiersOf(unitOf(code))) {
          const c = problem(code, tier, seed).content;
          const overs = decsIn(c).filter(([v, d]) => v > 10 ** d);
          expect(
            overs.length,
            `${code} ${tier} @${seed} 1보다 큰 소수가 없다\n${c}`,
          ).toBeGreaterThan(0);
        }
      }
      // 2-4-5·2-4-6 연산 — 두 피연산자가 **둘 다** 그 크기다
      const c5 = problem("2-4-5", "연산", seed).content;
      const m5 = /(\d+\.\d+)\\times(\d+\.\d+)/.exec(c5)!;
      for (const t of [m5[1]!, m5[2]!]) {
        const [v, d] = decScaled(t)!;
        expect(v, `2-4-5 @${seed} ${t} 가 1보다 작지 않다`).toBeLessThan(
          10 ** d,
        );
      }
      const c6 = problem("2-4-6", "연산", seed).content;
      const m6 = /(\d+\.\d+)\\times(\d+\.\d+)/.exec(c6)!;
      for (const t of [m6[1]!, m6[2]!]) {
        const [v, d] = decScaled(t)!;
        expect(v, `2-4-6 @${seed} ${t} 가 1보다 크지 않다`).toBeGreaterThan(
          10 ** d,
        );
      }
    }
  });

  /* ── 자리 — 이 대단원의 알맹이 ── */

  it("자리가 접히지 않는다 — 전량 (씨앗 300)", () => {
    // ⚠️ `dec()` 가 꼬리 0 을 접으므로 지면에 「$0.20$」은 안 나온다. 그런데 그때
    //    답이 한 자리(또는 정수)로 **접혀** 「소수끼리 곱하면 자리가 더해진다」가
    //    지면에서 사라진다 — 값 검산이 구조적으로 못 보는 부류다(실측 8.6~27%).
    //    구성이 100% 를 보장하므로 문턱도 **전량**이다.
    const WANT: Record<string, number> = {
      "2-4-1": 1,
      "2-4-2": 1,
      "2-4-3": 1,
      "2-4-4": 1,
      "2-4-5": 2,
      "2-4-6": 2,
    };
    for (const [code, want] of Object.entries(WANT)) {
      // 심화는 **피연산자**(□)를 묻는 갈래라 기대 자릿수가 다르다 — 여기서 뺀다.
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (let seed = 0; seed < 300; seed += 1) {
          const p = problem(code, tier, seed);
          const [, dp] = answerDecScaled(p.answer, `${code} ${tier} @${seed}`);
          expect(
            dp,
            `${code} ${tier} @${seed} 자리가 접혔다 — ${p.answer}\n${p.content}`,
          ).toBe(want);
        }
      }
    }
  });

  it("소수 세 자리 이상이 없다 — 초5 범위 (2-4-7 은 자리를 옮기는 소단원이라 뺀다)", () => {
    for (const code of CODES24) {
      if (code === "2-4-7") continue;
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            expect(
              /\d\.\d{3}/.test(text),
              `${code} ${tier} @${seed} ${where} 에 소수 세 자리\n${text}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  /* ── 산술 독립 검산 — 정수 스케일로만 (부동소수점 금지) ── */

  it("2-4-1~6 연산 — 곱이 발문의 수로 다시 선다", () => {
    for (const seed of SEEDS) {
      for (const code of [
        "2-4-1",
        "2-4-2",
        "2-4-3",
        "2-4-4",
        "2-4-5",
        "2-4-6",
      ] as const) {
        const p = problem(code, "연산", seed);
        const label = `${code} 연산 @${seed}`;
        const toks = decTokens(p.content);
        expect(
          toks.length,
          `${label} 피연산자가 둘이 아니다\n${p.content}`,
        ).toBe(2);
        const want = collapse(mulScaled(toks[0]!, toks[1]!));
        expect(
          answerDecScaled(p.answer, label),
          `${label}\n${p.content}`,
        ).toEqual(want);
      }
    }
  });

  it("2-4-7 — 소수점이 옮겨진 칸수만큼 값이 바뀐다 (갈래마다 «무엇을 묻나»가 다르다)", () => {
    for (const seed of SEEDS) {
      // 연산·기본 — 한 번 옮긴다. 피연산자 둘의 곱이 그대로 답이다.
      for (const tier of ["연산", "기본"] as const) {
        const p = problem("2-4-7", tier, seed);
        const label = `2-4-7 ${tier} @${seed}`;
        const toks = decTokens(p.content);
        expect(toks.length, `${label}\n${p.content}`).toBe(2);
        expect(
          answerDecScaled(p.answer, label),
          `${label}\n${p.content}`,
        ).toEqual(collapse(mulScaled(toks[0]!, toks[1]!)));
      }

      // 응용 — 두 번 옮기되 **제자리로 돌아오지 않는다**(그러면 두 단계가 뜻을 잃는다)
      const ap = problem("2-4-7", "응용", seed);
      const apLabel = `2-4-7 응용 @${seed}`;
      const apToks = decTokens(ap.content);
      expect(apToks.length, `${apLabel}\n${ap.content}`).toBe(3);
      expect(
        answerDecScaled(ap.answer, apLabel),
        `${apLabel}\n${ap.content}`,
      ).toEqual(
        collapse(mulScaled(mulScaled(apToks[0]!, apToks[1]!), apToks[2]!)),
      );
      expect(
        collapse(apToks[0]!),
        `${apLabel} 제자리로 돌아왔다 — 두 단계가 뜻을 잃는다\n${ap.content}`,
      ).not.toEqual(answerDecScaled(ap.answer, apLabel));

      // 심화 — **역산 + 조건 조합**. 값 검산은 나눗셈 없이 «어긋난 곱»으로 한다:
      //   어떤 수 × A = X · 어떤 수 × B = 답  ⟹  답 × A = X × B.
      // ⚠️ 이 항등식은 「어떤 수」를 지면에서 **읽지 않고** 검산한다 — 발문에 없는
      //    값을 시험이 되만들면 그 순간 생성기와 같은 식을 두 벌 쓰는 셈이 된다.
      const dp2 = problem("2-4-7", "심화하", seed);
      const label = `2-4-7 심화 @${seed}`;
      const toks = decTokens(dp2.content);
      expect(toks.length, `${label}\n${dp2.content}`).toBe(3);
      const [mulA, given, mulB] = [toks[0]!, toks[1]!, toks[2]!];
      const ans = answerDecScaled(dp2.answer, label);
      expect(
        collapse(mulScaled(ans, mulA)),
        `${label} 역산이 안 맞는다\n${dp2.content}`,
      ).toEqual(collapse(mulScaled(given, mulB)));
      // 두 곱하는 수가 같으면 답이 곧 주어진 값이라 역산이 뜻을 잃는다
      expect(
        collapse(mulA),
        `${label} 곱하는 두 수가 같다 — 답이 곧 주어진 값이다\n${dp2.content}`,
      ).not.toEqual(collapse(mulB));
    }
  });

  /* ── 이웃 학년 (④) — 손 목록이 아니라 실제로 뽑아 대조 ── */

  it("초4 2-3(소수의 덧셈과 뺄셈)과 발문이 겹치지 않는다 — 갈래까지 (④)", () => {
    const skeleton = (t: string) => t.replace(/\d+/g, "#");
    const others = new Map<string, string>();
    for (const u of elementaryUnits().filter(
      (x) => x.grade === "초4" && x.section.startsWith("2-3-"),
    )) {
      const tiers = supportedTiers(u);
      for (const tier of tiers.length ? tiers : [undefined]) {
        for (let seed = 1; seed <= 8; seed += 1) {
          const c = generateElementaryProblem(u, seed, tier).content;
          others.set(c, u.section);
          others.set(`SKEL:${skeleton(c)}`, u.section);
        }
      }
    }
    expect(others.size, "이웃 모집단이 비었다").toBeGreaterThan(100);

    const clash: string[] = [];
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          if (others.get(c)) clash.push(`완전 일치 ${code} ${tier}\n    ${c}`);
          const s = others.get(`SKEL:${skeleton(c)}`);
          if (s) clash.push(`골격 일치 ${code} ${tier} ↔ ${s}\n    ${c}`);
        }
      }
    }
    expect(clash.slice(0, 3), `초4 2-3 과 겹친 발문 ${clash.length}건`).toEqual(
      [],
    );
  });

  it("판별자는 «곱셈» — 여기서는 강하다(측정으로 골랐다) (④ 음성 대조)", () => {
    // ⚠️ 같은 열쇠가 이웃에 따라 다르다. 초6 2-1(나눗셈)에서는 ×가 **37.5%** 라
    //    약했지만(2-2 때 실측), 초4 2-3(덧뺄셈)에서는 **0.0%** 라 강하다.
    //    그래서 판별자는 이웃마다 **다시 재서** 고른다.
    let mine = 0;
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          expect(
            `${p.content} ${p.solution}`,
            `${code} ${tier} @${seed} 에 곱셈이 없다`,
          ).toContain("\\times");
          mine += 1;
        }
      }
    }
    expect(mine).toBeGreaterThan(400);

    let others = 0;
    let withTimes = 0;
    for (const u of elementaryUnits().filter(
      (x) => x.grade === "초4" && x.section.startsWith("2-3-"),
    )) {
      const tiers = supportedTiers(u);
      for (const tier of tiers.length ? tiers : [undefined]) {
        for (let seed = 1; seed <= 16; seed += 1) {
          const q = generateElementaryProblem(u, seed, tier);
          others += 1;
          if (`${q.content} ${q.solution}`.includes("\\times")) withTimes += 1;
        }
      }
    }
    expect(others, "반대쪽 모집단이 비었다").toBeGreaterThan(300);
    expect(
      withTimes / others,
      `초4 2-3 의 ${((withTimes / others) * 100).toFixed(1)}% 에 ×가 있다 — 판별자가 약해졌다`,
    ).toBeLessThan(0.1);
  });

  it("2-4 일곱 소단원끼리 발문이 겹치지 않는다 (D-66 ⑸)", () => {
    const seen = new Map<string, string>();
    for (const code of CODES24) {
      for (const tier of tiersOf(unitOf(code))) {
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

/* ── 2-6 평균과 가능성 (D-72 10차) ────────────────────────────────────────── */

const CODES26 = ["2-6-1", "2-6-2", "2-6-3"] as const;

/** `$\frac{a}{b}$` 를 `[a, b]` 로. 없으면 null. */
function fracIn(text: string): [number, number] | null {
  const m = /\$\\frac\{(\d+)\}\{(\d+)\}\$/.exec(text);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

describe("[초5 2-6] 난이도 4단 확대 (D-72 10차)", () => {
  it("세 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES26) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES26) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES26) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES26) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("답의 가짓수가 넉넉하다 (씨앗 500 · 가짓수 ≥4 · 최빈 ≤45%)", () => {
    const N = 500;
    const bad: string[] = [];
    for (const code of CODES26) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Map<string, number>();
        for (let seed = 0; seed < N; seed += 1) {
          const ans = problem(code, tier, seed).answer;
          seen.set(ans, (seen.get(ans) ?? 0) + 1);
        }
        const top = Math.max(...seen.values());
        if (seen.size < 4 || top / N > 0.45)
          bad.push(
            `${code} ${tier}: 가짓수 ${seen.size} · 최빈 ${((top / N) * 100).toFixed(1)}%`,
          );
      }
    }
    expect(bad, "답의 폭이 좁은 갈래").toEqual([]);
  });

  it("모든 수가 KaTeX 안에 있다 (R1) — 그림은 없다", () => {
    const bad: string[] = [];
    for (const code of CODES26) {
      for (const tier of tiersOf(unitOf(code))) {
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

  /* ── 산술 독립 검산 ── */

  it("2-6-1 — 평균이 자료에서 다시 선다 (연산·기본·응용)", () => {
    for (const seed of SEEDS) {
      // 연산: 「$n$개의 수의 합이 $S$」 → 답은 S ÷ n
      const c = problem("2-6-1", "연산", seed);
      const [size, sum] = intsIn(c.content);
      expect(sum! % size!, `2-6-1 연산 @${seed} 합이 개수로 안 나뉜다`).toBe(0);
      expect(answerNumber(c.answer, `2-6-1 연산 @${seed}`)).toBe(sum! / size!);

      // 기본: 나열된 자료의 평균이 정확히 답이다
      const r = problem("2-6-1", "기본", seed);
      const vals = intsIn(r.content);
      const total = vals.reduce((a, b) => a + b, 0);
      expect(
        total % vals.length,
        `2-6-1 기본 @${seed} 평균이 정수가 아니다`,
      ).toBe(0);
      expect(answerNumber(r.answer, `2-6-1 기본 @${seed}`)).toBe(
        total / vals.length,
      );
    }
  });

  it("2-6-1 응용 — 평균보다 많은 날이 실제로 그 수이고, **하나도 없지 않다**", () => {
    // ⚠️ 하나도 없으면 묻는 것이 사라진다(답이 늘 0). 구성이 보장하므로 **전량**이다.
    for (let seed = 0; seed < 200; seed += 1) {
      const p = problem("2-6-1", "응용", seed);
      const label = `2-6-1 응용 @${seed}`;
      const nums = intsIn(p.content);
      const size = nums[0]!;
      const vals = nums.slice(1);
      expect(
        vals.length,
        `${label} 자료 수가 발문과 다르다\n${p.content}`,
      ).toBe(size);
      const total = vals.reduce((a, b) => a + b, 0);
      expect(total % size, `${label} 평균이 정수가 아니다`).toBe(0);
      const avg = total / size;
      const over = vals.filter((v) => v > avg).length;
      expect(
        over,
        `${label} 평균보다 많은 날이 없다\n${p.content}`,
      ).toBeGreaterThan(0);
      expect(answerNumber(p.answer, label), p.content).toBe(over);
    }
  });

  it("2-6-1 심화 — **두 모둠의 인원이 다르다** (같으면 «평균의 평균»이 정답이 된다)", () => {
    // ⚠️ 이 갈래의 알맹이는 「평균을 그냥 더해 2로 나누면 안 된다」이다. 인원이 같으면
    //    그 오답이 **정답과 같아져** 갈래가 통째로 뜻을 잃는다 — 값 검산은 그때도 초록이다.
    //    구성이 보장하므로 **전량**으로 잰다.
    for (let seed = 0; seed < 200; seed += 1) {
      const p = problem("2-6-1", "심화하", seed);
      const label = `2-6-1 심화 @${seed}`;
      // 가 모둠 $n1$명 … $a1$점 … 나 모둠 $n2$명 … $a2$점
      // ⚠️ 모둠 이름을 «$1$모둠»으로 적던 때는 앞의 두 자리를 건너뛰어야 했다.
      //    「가·나」로 바꾸면서(반증 ⑥ 오작동, 2026-08-31) 자리도 앞으로 당겼다 —
      //    자리로 읽는 검사는 발문 표기가 바뀌면 **조용히 엉뚱한 수를 읽는다.**
      const v = intsIn(p.content);
      const [n1, a1, n2, a2] = v;
      expect(n1, `${label} 발문을 못 읽었다\n${p.content}`).toBeGreaterThan(0);
      expect(
        n1,
        `${label} 두 모둠 인원이 같다 — 평균의 평균이 정답이 된다`,
      ).not.toBe(n2);
      const sum = n1! * a1! + n2! * a2!;
      expect(sum % (n1! + n2!), `${label} 전체 평균이 정수가 아니다`).toBe(0);
      expect(answerNumber(p.answer, label), p.content).toBe(sum / (n1! + n2!));
      // 「평균의 평균」은 답과 **달라야** 한다 — 그래야 이 문항이 무언가를 묻는다
      expect(
        (a1! + a2!) / 2,
        `${label} 평균의 평균이 정답과 같다 — 오개념을 안 가른다`,
      ).not.toBe(sum / (n1! + n2!));
    }
  });

  it("2-6-2 — 합·마지막 경기·최소 점수가 전부 다시 선다", () => {
    for (const seed of SEEDS) {
      // 연산: 평균 × 개수
      const c = problem("2-6-2", "연산", seed);
      const [avg, count] = intsIn(c.content);
      expect(answerNumber(c.answer, `2-6-2 연산 @${seed}`)).toBe(avg! * count!);

      // 기본: 경기 수 × 평균
      const r = problem("2-6-2", "기본", seed);
      const [games, ravg] = intsIn(r.content);
      expect(answerNumber(r.answer, `2-6-2 기본 @${seed}`)).toBe(
        games! * ravg!,
      );

      // 응용: t·(k+1) − a·k
      const ap = problem("2-6-2", "응용", seed);
      const [k, a, k1, t] = intsIn(ap.content);
      expect(k1, `2-6-2 응용 @${seed} 경기 수가 안 맞는다`).toBe(k! + 1);
      expect(answerNumber(ap.answer, `2-6-2 응용 @${seed}`), ap.content).toBe(
        t! * (k! + 1) - a! * k!,
      );
    }
  });

  it("2-6-2 심화 — 「최소 몇 점」이 **자연수이고 양수다** (구성 보장)", () => {
    // ⚠️ 「적어도 몇 점」은 답이 자연수라야 뜻이 선다. `t·(k+m) − a·k` 는 넷이 다
    //    정수라 언제나 정수이고 `t > a` 라 언제나 양수다 — 그러니 **전량**이다.
    for (let seed = 0; seed < 200; seed += 1) {
      const p = problem("2-6-2", "심화하", seed);
      const label = `2-6-2 심화 @${seed}`;
      const [k, a, m, total, t] = intsIn(p.content);
      expect(total, `${label} 전체 경기 수가 안 맞는다\n${p.content}`).toBe(
        k! + m!,
      );
      expect(t, `${label} 목표 평균이 지금 평균보다 높지 않다`).toBeGreaterThan(
        a!,
      );
      const need = t! * (k! + m!) - a! * k!;
      expect(Number.isInteger(need), `${label} 답이 정수가 아니다`).toBe(true);
      expect(need, `${label} 답이 0 이하다`).toBeGreaterThan(0);
      expect(answerNumber(p.answer, label), p.content).toBe(need);
    }
  });

  it("2-6-3 — 가능성이 자료에서 다시 선다 (기본·응용)", () => {
    for (const seed of SEEDS) {
      // 기본: 빨강 / 전체
      const r = problem("2-6-3", "기본", seed);
      const [red, blue] = intsIn(r.content);
      const got = fracIn(r.answer);
      expect(
        got,
        `2-6-3 기본 @${seed} 분수 답이 아니다 — ${r.answer}`,
      ).not.toBeNull();
      expect(
        got![0] * (red! + blue!),
        `2-6-3 기본 @${seed}\n${r.content}`,
      ).toBe(got![1] * red!);

      // 응용: 노랑 / 전체 (빨강도 파랑도 아닌 것)
      const ap = problem("2-6-3", "응용", seed);
      const [r2, b2, y2] = intsIn(ap.content);
      const g2 = fracIn(ap.answer)!;
      expect(
        g2[0] * (r2! + b2! + y2!),
        `2-6-3 응용 @${seed}\n${ap.content}`,
      ).toBe(g2[1] * y2!);
    }
  });

  it("2-6-3 심화 — 발문이 **무엇을 더하는지** 못 박고, 넣으면 목표에 정확히 닿는다", () => {
    // ⚠️ 「몇 개 더」는 더하는 대상이 안 정해지면 **답이 둘**이다(빨강을 넣는가,
    //    전체를 늘리는가). 발문에 「빨간 구슬만」이 반드시 있어야 한다.
    //    그리고 답을 먼저 잡고 파랑을 유도하므로 검산은 **항등식**이다 — 전량으로 잰다.
    for (let seed = 0; seed < 200; seed += 1) {
      const p = problem("2-6-3", "심화하", seed);
      const label = `2-6-3 심화 @${seed}`;
      expect(
        /빨간 구슬만 더 넣어/.test(p.content),
        `${label} 무엇을 더하는지 발문이 안 정한다 — 답이 둘이 된다\n${p.content}`,
      ).toBe(true);
      const [red, blue] = intsIn(p.content);
      const target = fracIn(p.content)!;
      const add = answerNumber(p.answer, label);
      expect(
        (red! + add) * target[1],
        `${label} 넣은 뒤 가능성이 목표와 다르다\n${p.content}`,
      ).toBe((red! + blue! + add) * target[0]);
      expect(add, `${label} 더 넣을 개수가 0 이하다`).toBeGreaterThan(0);
    }
  });

  it("2-6-1 자료에 **0 이하가 없다** — 「$-3$ 쪽을 읽었다」가 안 나온다", () => {
    // ⚠️ 마지막 치우침은 나머지의 합에 음수를 붙인 것이라 `spread·(size−1)` 까지 커진다.
    //    `avg` 가 그보다 작으면 자료에 **음수**가 섞이는데, 평균도 답도 맞아서
    //    산술 검산은 **초록이다.** 표준은 이걸 주석으로만 막아 뒀고 갈래가 안 물려받아
    //    실제로 났다(2026-08-23, 씨앗 25). 구성이 보장하므로 **전량**으로 잰다.
    for (let seed = 0; seed < 300; seed += 1) {
      for (const tier of ["기본", "응용"] as const) {
        const p = problem("2-6-1", tier, seed);
        for (const v of intsIn(p.content)) {
          expect(
            v,
            `2-6-1 ${tier} @${seed} 자료에 0 이하가 있다\n${p.content}`,
          ).toBeGreaterThan(0);
        }
        expect(
          /-\d/.test(p.content),
          `2-6-1 ${tier} @${seed} 발문에 음수가 있다\n${p.content}`,
        ).toBe(false);
      }
    }
  });

  /* ── R5 · 이웃 ── */

  it("표준 문항과 발문이 겹치지 않는다 (R5) — 골격까지", () => {
    const skeleton = (t: string) => t.replace(/\d+/g, "#");
    const std = new Map<string, string>();
    for (const code of CODES26) {
      const u = unitOf(code);
      for (let seed = 1; seed <= 40; seed += 1) {
        const c = generateElementaryProblem(u, seed).content;
        std.set(c, code);
        std.set(`SKEL:${skeleton(c)}`, code);
      }
    }
    expect(std.size, "표준 모집단이 비었다").toBeGreaterThan(20);

    const clash: string[] = [];
    for (const code of CODES26) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          if (std.get(c)) clash.push(`완전 일치 ${code} ${tier}\n    ${c}`);
          if (std.get(`SKEL:${skeleton(c)}`))
            clash.push(`골격 일치 ${code} ${tier}\n    ${c}`);
        }
      }
    }
    expect(clash.slice(0, 3), `표준과 겹친 발문 ${clash.length}건`).toEqual([]);
  });

  it("소재의 수가 세상에서 그럴듯하다 (AVG_TOPICS 교훈)", () => {
    // ⚠️ 「선수 $5$명의 **키**가 평균 $33$ cm」는 산술·표기·조건이 다 맞아서 **어느
    //    가드도 못 본다.** 수가 그 낱말과 어울리는지는 코드가 아니라 세상이 정한다.
    const bad: string[] = [];
    for (let seed = 0; seed < 200; seed += 1) {
      const deep = problem("2-6-1", "심화하", seed);
      for (const v of intsIn(deep.content).filter((x) => x > 20)) {
        if (v < 40 || v > 100) bad.push(`2-6-1 심화 @${seed} 점수 ${v}`);
      }
      const pages = problem("2-6-1", "기본", seed);
      for (const v of intsIn(pages.content)) {
        if (v > 60) bad.push(`2-6-1 기본 @${seed} 쪽수 ${v}`);
      }
      const marbles = problem("2-6-3", "심화하", seed);
      for (const v of intsIn(marbles.content)) {
        if (v > 30) bad.push(`2-6-3 심화 @${seed} 구슬 ${v}개`);
      }
    }
    expect(bad.slice(0, 5), `그럴듯하지 않은 수 ${bad.length}건`).toEqual([]);
  });
});

/* ── 2-3 합동과 대칭 (D-72 12차) ──────────────────────────────────────────── */

const CODES23 = ["2-3-1", "2-3-2", "2-3-3", "2-3-4"] as const;

/** 그림 스펙의 kind. 그림이 없으면 null. */
function figKind(p: { figureSpec: unknown }): string | null {
  const f = p.figureSpec as { kind?: string } | null;
  return f?.kind ?? null;
}

/** `namedShapes` 항목들. 다른 kind 면 빈 배열. */
function shapeItems(p: {
  figureSpec: unknown;
}): { shape?: string; label?: unknown }[] {
  const f = p.figureSpec as { kind?: string; items?: unknown } | null;
  return f?.kind === "namedShapes" && Array.isArray(f.items)
    ? (f.items as { shape?: string; label?: unknown }[])
    : [];
}

describe("[초5 2-3] 난이도 4단 확대 (D-72 12차)", () => {
  it("네 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES23) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES23) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES23) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 문항이 8개 이상이다 (변형 8+ — **그림까지 센다**)", () => {
    // ⚠️ 이 대단원은 수가 **그림에만** 있는 갈래가 있다(2-3-2 연산은 세 변이 전부
    //    `markedShape` 안에 있어 발문이 늘 같은 한 문장이다). 발문 글자만 세면 그
    //    갈래는 «변형 1»로 찍히는데, 학생이 보는 지면은 씨앗마다 **다른 삼각형**이다.
    //    「무엇이 학생에게 달라 보이는가」가 이 규칙이 지키려는 것이므로 **그림도 센다**
    //    — 「그림도 R5 다」와 같은 자리다(2026-08-23).
    for (const code of CODES23) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(
          SEEDS.map((s) => {
            const p = problem(code, tier, s);
            return `${p.content}「그림」${JSON.stringify(p.figureSpec ?? null)}`;
          }),
        );
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("그림이 **없는** 갈래는 발문 글자만으로 갈린다 (그림 뒤에 숨지 않는다)", () => {
    // ⚠️ 위 시험이 그림을 세므로, 그림 없는 갈래까지 느슨해지면 안 된다. 그림이 없는
    //    갈래는 예전 잣대(발문 글자)를 **그대로** 지킨다.
    for (const code of CODES23) {
      for (const tier of tiersOf(unitOf(code))) {
        const some = problem(code, tier, SEEDS[0]!);
        if (some.figureSpec) continue;
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier} (그림 없음)`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("답의 가짓수가 넉넉하다 (씨앗 500 · 가짓수 ≥4 · 최빈 ≤45%)", () => {
    const N = 500;
    const bad: string[] = [];
    for (const code of CODES23) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Map<string, number>();
        for (let seed = 0; seed < N; seed += 1) {
          const ans = problem(code, tier, seed).answer;
          seen.set(ans, (seen.get(ans) ?? 0) + 1);
        }
        const top = Math.max(...seen.values());
        if (seen.size < 4 || top / N > 0.45)
          bad.push(
            `${code} ${tier}: 가짓수 ${seen.size} · 최빈 ${((top / N) * 100).toFixed(1)}%`,
          );
      }
    }
    expect(bad, "답의 폭이 좁은 갈래").toEqual([]);
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES23) {
      for (const tier of tiersOf(unitOf(code))) {
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

  /* ── 그림 불변식 ── */

  it("도형마다 **기호가 붙는다** — 공용 라벨이 모자라 빈 이름이 새던 자리", () => {
    // ⚠️ 공용 `LABELS` 는 다섯(가~마)뿐인데 이 소단원은 여덟까지 그린다. 여섯째부터
    //    `undefined` 가 라벨로 들어가 그림에 **빈 이름**이 찍혔다(2026-08-23 실측
    //    28/40 씨앗). 발문·정답·해설은 멀쩡해서 **값 검산도 R1 도 전부 초록이었다** —
    //    그림을 직접 들여다봐야만 보이는 부류다. 구성이 보장하므로 **전량**으로 잰다.
    let seen = 0;
    for (const tier of tiersOf(unitOf("2-3-1"))) {
      for (let seed = 0; seed < 200; seed += 1) {
        const p = problem("2-3-1", tier, seed);
        const items = shapeItems(p);
        expect(
          items.length,
          `2-3-1 ${tier} @${seed} 그림에 도형이 없다`,
        ).toBeGreaterThan(0);
        for (const it of items) {
          seen += 1;
          expect(
            typeof it.label === "string" && it.label.length > 0,
            `2-3-1 ${tier} @${seed} 기호 없는 도형이 있다`,
          ).toBe(true);
        }
      }
    }
    expect(seen, "도형을 하나도 못 셌다").toBeGreaterThan(1000);
  });

  it("2-3-1 심화 — 답이 **유일하다**: 짝 없는 도형이 정확히 하나다", () => {
    // ⚠️ 「~이 되게 하려면 어느 것과 같게 하나」는 짝 없는 도형이 둘 이상이면 **답이
    //    여럿**이 된다. 값 검산으로는 안 보인다 — 어느 답을 대도 조건을 만족하니까.
    for (let seed = 0; seed < 200; seed += 1) {
      const p = problem("2-3-1", "심화하", seed);
      const items = shapeItems(p);
      expect(items.length, `2-3-1 심화 @${seed}`).toBe(4);
      const count = new Map<string, number>();
      for (const it of items)
        count.set(it.shape!, (count.get(it.shape!) ?? 0) + 1);
      const pairs = [...count.values()].filter((v) => v === 2).length;
      const lonely = [...count.values()].filter((v) => v === 1).length;
      expect(pairs, `2-3-1 심화 @${seed} 쌍이 하나가 아니다`).toBe(1);
      // 홑 둘 = 바꿀 것 + 짝 없는 것 하나. 셋이면 답이 여럿이 된다.
      expect(
        lonely,
        `2-3-1 심화 @${seed} 홑이 둘이 아니다 — 답이 여럿이다`,
      ).toBe(2);
      expect(
        items.some((it) => it.label === p.answer),
        `2-3-1 심화 @${seed} 답이 기호 목록에 없다\n${p.answer}`,
      ).toBe(true);
    }
  });

  /* ── 산술 독립 검산 ── */

  it("2-3-2 — 둘레·각·역산이 모두 다시 선다", () => {
    for (const seed of SEEDS) {
      // 연산: 그림의 세 변의 합
      const c = problem("2-3-2", "연산", seed);
      const sides = ((c.figureSpec as { sides?: string[] }).sides ?? []).map(
        (t) => Number(/\d+/.exec(t)![0]),
      );
      expect(sides.length, `2-3-2 연산 @${seed} 변이 셋이 아니다`).toBe(3);
      expect(answerNumber(c.answer, `2-3-2 연산 @${seed}`)).toBe(
        sides.reduce((x, y) => x + y, 0),
      );

      // 기본: 세 각의 합이 180
      const r = problem("2-3-2", "기본", seed);
      const degs = [...r.content.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) =>
        Number(m[1]),
      );
      const got = Number(/\$(\d+)\^\\circ\$/.exec(r.answer)![1]);
      expect(degs.reduce((x, y) => x + y, 0) + got, `2-3-2 기본 @${seed}`).toBe(
        180,
      );

      // 응용: 둘레의 합 ÷ 2 − 두 변
      const ap = problem("2-3-2", "응용", seed);
      const [both, s1, s2] = intsIn(ap.content);
      expect(both! % 2, `2-3-2 응용 @${seed} 둘레의 합이 홀수다`).toBe(0);
      expect(answerNumber(ap.answer, `2-3-2 응용 @${seed}`), ap.content).toBe(
        both! / 2 - s1! - s2!,
      );

      // 심화: (둘레 − 밑변) ÷ 2 — **자연수여야** 「각각 몇 cm」가 뜻을 가진다
      const d = problem("2-3-2", "심화하", seed);
      const [total, base] = intsIn(d.content);
      expect(
        (total! - base!) % 2,
        `2-3-2 심화 @${seed} 답이 정수가 아니다`,
      ).toBe(0);
      expect(answerNumber(d.answer, `2-3-2 심화 @${seed}`), d.content).toBe(
        (total! - base!) / 2,
      );
      // 삼각부등식 — 그려질 수 있는 삼각형이어야 한다
      expect(base, `2-3-2 심화 @${seed} 삼각부등식 위반`).toBeLessThan(
        total! - base!,
      );
    }
  });

  it("2-3-3 — 칸 수가 격자 그림과 맞는다 (기본·응용)", () => {
    for (let seed = 0; seed < 120; seed += 1) {
      const mid = 2; // n = 5 → 대칭축은 가운데 열
      for (const tier of ["기본", "응용"] as const) {
        const p = problem("2-3-3", tier, seed);
        const cells = (p.figureSpec as { cells?: [number, number][] }).cells!;
        const off = cells.filter(([c]) => c !== mid).length;
        const on = cells.length - off;
        expect(
          off,
          `2-3-3 ${tier} @${seed} 더 칠할 칸이 0 — 묻는 것이 사라진다`,
        ).toBeGreaterThan(0);
        const want = tier === "기본" ? off : off * 2 + on;
        expect(
          answerNumber(p.answer, `2-3-3 ${tier} @${seed}`),
          p.content,
        ).toBe(want);
      }
      // 심화: 완성 = 2·off + on 이므로 (완성 − 축 위) 가 **짝수**여야 한다
      const d = problem("2-3-3", "심화하", seed);
      const [done, on] = intsIn(d.content);
      expect((done! - on!) % 2, `2-3-3 심화 @${seed} 절반이 안 나뉜다`).toBe(0);
      expect(answerNumber(d.answer, `2-3-3 심화 @${seed}`), d.content).toBe(
        (done! - on!) / 2 + on!,
      );
    }
  });

  it("2-3-4 — 점대칭 칸·둘레가 다시 선다", () => {
    for (let seed = 0; seed < 120; seed += 1) {
      // 연산: 가운데 칸이 없으므로 「칸 수 = 더 칠할 칸 수」
      const c = problem("2-3-4", "연산", seed);
      const cells = (c.figureSpec as { cells?: [number, number][] }).cells!;
      expect(
        cells.every(([, r]) => r < 2),
        `2-3-4 연산 @${seed} 가운데 칸이 끼면 답이 칸 수와 달라진다`,
      ).toBe(true);
      expect(answerNumber(c.answer, `2-3-4 연산 @${seed}`)).toBe(cells.length);

      // 기본: (세 변의 합) × 2
      const r = problem("2-3-4", "기본", seed);
      const s3 = intsIn(r.content);
      expect(answerNumber(r.answer, `2-3-4 기본 @${seed}`), r.content).toBe(
        s3.reduce((x, y) => x + y, 0) * 2,
      );

      // 심화: 연속한 세 자연수 — 둘레 ÷ 2 가 **3의 배수**여야 한다
      const d = problem("2-3-4", "심화하", seed);
      const [round] = intsIn(d.content);
      expect(round! % 2, `2-3-4 심화 @${seed} 둘레가 홀수다`).toBe(0);
      expect(
        (round! / 2) % 3,
        `2-3-4 심화 @${seed} 연속 세 수로 안 나뉜다`,
      ).toBe(0);
      const k = answerNumber(d.answer, `2-3-4 심화 @${seed}`);
      expect(k + (k + 1) + (k + 2), d.content).toBe(round! / 2);
    }
  });

  /* ── R5 — 발문 **그리고 그림** ── */

  it("표준과 발문이 겹치지 않고, **그림 종류도 다르다** (R5)", () => {
    // ⚠️ 그림 문항은 지면에서 겹치는 것이 발문보다 **그림**이다. 표준 2-3-3·2-3-4 는
    //    `symmetry` 를 `motif` 로만 쓰고, 갈래는 **격자 모드**(`cells`)를 쓴다.
    //    「발문이 다르다」만 보면 지면이 똑같아 보이는 짝을 놓친다.
    const skeleton = (t: string) => t.replace(/\d+/g, "#");
    const std = new Map<string, string>();
    const stdMotif = new Set<string>();
    for (const code of CODES23) {
      const u = unitOf(code);
      for (let seed = 1; seed <= 40; seed += 1) {
        const p = generateElementaryProblem(u, seed);
        std.set(`SKEL:${skeleton(p.content)}`, code);
        const f = p.figureSpec as { kind?: string; motif?: string } | null;
        if (f?.kind === "symmetry" && f.motif) stdMotif.add(f.motif);
      }
    }
    expect(std.size, "표준 모집단이 비었다").toBeGreaterThan(10);

    const clash: string[] = [];
    for (const code of CODES23) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          if (std.get(`SKEL:${skeleton(p.content)}`))
            clash.push(`골격 일치 ${code} ${tier}\n    ${p.content}`);
          // 표준이 쓰는 motif 를 갈래가 다시 쓰면 지면이 같아 보인다
          const f = p.figureSpec as { kind?: string; motif?: string } | null;
          if (f?.kind === "symmetry" && f.motif && stdMotif.has(f.motif))
            clash.push(`그림 일치 ${code} ${tier} motif=${f.motif}`);
        }
      }
    }
    expect(clash.slice(0, 3), `표준과 겹친 것 ${clash.length}건`).toEqual([]);
  });

  it("수가 그림에만 있는 갈래는 **그림만으로** 갈린다 — 말투가 가드를 떠받치지 않는다", () => {
    // ⚠️ 이 갈래들의 발문에는 말투 묶음이 있는데, 그것을 **가드 버팀목으로 오해하면**
    //    다음 사람이 「지우면 시험이 깨진다」고 여겨 손을 못 댄다. 반대로 「그냥 장식」
    //    으로 여기고 지웠다가 정말 깨질 수도 있다. 둘 다 **주석으로는 못 막는다** —
    //    「지워도 초록이다」는 산문이라 낡는다(2026-08-23 g3: 없는 주석 < 낡은 주석
    //    < 틀린 주석. 셋 다 사람이 읽는 것만 고친다).
    //    그래서 **말투를 빼고** 그림 스펙만으로 갈리는지를 여기서 직접 잰다.
    for (const [code, tier] of [
      ["2-3-2", "연산"],
      ["2-3-3", "기본"],
      ["2-3-3", "응용"],
      ["2-3-4", "연산"],
    ] as const) {
      const figs = new Set(
        SEEDS.map((s) => JSON.stringify(problem(code, tier, s).figureSpec)),
      );
      expect(
        figs.size,
        `${code} ${tier}: 그림이 ${figs.size}가지뿐 — 말투를 빼면 변형이 무너진다`,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it("2-3-3·2-3-4 는 표준이 안 쓰는 **격자 모드**를 쓴다", () => {
    for (const [code, tier] of [
      ["2-3-3", "기본"],
      ["2-3-3", "응용"],
      ["2-3-4", "연산"],
    ] as const) {
      for (const seed of SEEDS) {
        const p = problem(code, tier, seed);
        expect(figKind(p), `${code} ${tier} @${seed}`).toBe("symmetry");
        const f = p.figureSpec as { cells?: unknown; motif?: unknown };
        expect(
          Array.isArray(f.cells),
          `${code} ${tier} @${seed} 격자가 아니다`,
        ).toBe(true);
        expect(
          f.motif,
          `${code} ${tier} @${seed} motif 를 쓰고 있다`,
        ).toBeUndefined();
      }
    }
  });
});

/* ── 2-5 직육면체 (D-72 13차) ─────────────────────────────────────────────── */

const CODES25 = ["2-5-1", "2-5-2", "2-5-3", "2-5-4", "2-5-5", "2-5-6"] as const;

/** 그림 스펙의 `{w,d,h}`. 그림이 없으면 null. */
function dimsOf(p: {
  figureSpec: unknown;
}): { w: number; d: number; h: number } | null {
  const f = p.figureSpec as { w?: number; d?: number; h?: number } | null;
  return f &&
    typeof f.w === "number" &&
    typeof f.d === "number" &&
    typeof f.h === "number"
    ? { w: f.w, d: f.d, h: f.h }
    : null;
}

describe("[초5 2-5] 난이도 4단 확대 (D-72 13차)", () => {
  it("여섯 소단원 모두 갈래 넷이 등록돼 있다", () => {
    for (const code of CODES25) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = problem(code, tier, 11);
        const b = problem(code, tier, 11);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
      }
    }
  });

  it("한 소단원 안에서 네 갈래 발문이 서로 갈린다", () => {
    for (const code of CODES25) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} 씨앗 ${seed}`).toBe(
          tiersOf(unitOf(code)).length,
        );
      }
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 문항이 8개 이상이다 (발문+그림)", () => {
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
        const rows = new Set(
          SEEDS.map((s) => {
            const p = problem(code, tier, s);
            return `${p.content}「그림」${JSON.stringify(p.figureSpec ?? null)}`;
          }),
        );
        expect(rows.size, `${code} ${tier}`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("답의 가짓수가 넉넉하다 (씨앗 500 · 가짓수 ≥4 · 최빈 ≤45%)", () => {
    // ⚠️ 이 대단원은 「평행한 면은 몇 쌍?」처럼 **답이 상수**가 되기 쉽다. 그래서
    //    «몇 개인가» 대신 «어느 것인가»(치수로 지목)를 묻는다 — 가드를 푸는 대신
    //    문형을 바꾼 것이고, 이 시험이 그 선택을 지킨다.
    const N = 500;
    const bad: string[] = [];
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Map<string, number>();
        for (let seed = 0; seed < N; seed += 1) {
          const ans = problem(code, tier, seed).answer;
          seen.set(ans, (seen.get(ans) ?? 0) + 1);
        }
        const top = Math.max(...seen.values());
        if (seen.size < 4 || top / N > 0.45)
          bad.push(
            `${code} ${tier}: 가짓수 ${seen.size} · 최빈 ${((top / N) * 100).toFixed(1)}%`,
          );
      }
    }
    expect(bad, "답의 폭이 좁은 갈래").toEqual([]);
  });

  it("모든 수가 KaTeX 안에 있다 (R1)", () => {
    const bad: string[] = [];
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
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

  /* ── 이름이 곧 조건 (D-66 ⑼) ── */

  it("**번호와 이름이 맞는다** — 2-5-1 은 직육면체, 2-5-2 는 정육면체", () => {
    // ⚠️ 이름이 짐작과 **반대**다: 2-5-1 이 「직사각형 6개」(직육면체)이고
    //    2-5-2 가 「정사각형 6개」(정육면체)다. 처음에 거꾸로 등록했고, 값도 조사도
    //    전부 맞아서 **어느 가드도 안 물었다** — 네 갈래를 렌더해 보고서야 찾았다
    //    (2026-08-23). 구성이 보장하므로 **전량**으로 잰다.
    for (let seed = 0; seed < 200; seed += 1) {
      for (const tier of tiersOf(unitOf("2-5-1"))) {
        const one = problem("2-5-1", tier, seed);
        expect(
          /직육면체/.test(one.content),
          `2-5-1 ${tier} @${seed} 발문에 «직육면체»가 없다\n${one.content}`,
        ).toBe(true);
        const two = problem("2-5-2", tier, seed);
        expect(
          /정육면체/.test(two.content),
          `2-5-2 ${tier} @${seed} 발문에 «정육면체»가 없다\n${two.content}`,
        ).toBe(true);
        // 정육면체 갈래의 그림은 세 모서리가 **모두 같아야** 한다
        const dims = dimsOf(two);
        if (dims)
          expect(
            dims.w === dims.d && dims.d === dims.h,
            `2-5-2 ${tier} @${seed} 그림이 정육면체가 아니다 ${JSON.stringify(dims)}`,
          ).toBe(true);
      }
    }
  });

  /* ── 산술 독립 검산 ── */

  it("2-5-1·2-5-2 — 모서리 길이의 합이 다시 선다", () => {
    for (const seed of SEEDS) {
      // 2-5-2 연산: 합 ÷ 12
      const c = problem("2-5-2", "연산", seed);
      const [total] = intsIn(c.content);
      expect(total! % 12, `2-5-2 연산 @${seed} 합이 12로 안 나뉜다`).toBe(0);
      expect(answerNumber(c.answer, `2-5-2 연산 @${seed}`)).toBe(total! / 12);

      // 2-5-1 연산: (w+d+h)×4
      const r = problem("2-5-1", "연산", seed);
      const [w, d, h] = intsIn(r.content);
      expect(answerNumber(r.answer, `2-5-1 연산 @${seed}`), r.content).toBe(
        4 * (w! + d! + h!),
      );
    }
  });

  it("2-5-3 — 평행한 면은 합동, 수직인 면은 넷 (성질이 답의 근거다)", () => {
    for (let seed = 0; seed < 120; seed += 1) {
      // 연산: 평행한 면의 넓이 = w·d
      const c = problem("2-5-3", "연산", seed);
      const [w, d] = intsIn(c.content);
      expect(answerNumber(c.answer, `2-5-3 연산 @${seed}`), c.content).toBe(
        w! * d!,
      );
      const cd = dimsOf(c)!;
      expect(
        cd.w === w && cd.d === d,
        `2-5-3 연산 @${seed} 발문의 치수가 그림과 다르다`,
      ).toBe(true);

      // 응용: 옆면 넷의 합 = 2h(w+d)
      const ap = problem("2-5-3", "응용", seed);
      const ad = dimsOf(ap)!;
      expect(answerNumber(ap.answer, `2-5-3 응용 @${seed}`), ap.content).toBe(
        2 * ad.h * (ad.w + ad.d),
      );

      // 심화: 그 합에서 높이를 되찾는다 — **나눗셈이 딱 떨어져야** 뜻이 선다
      const dp = problem("2-5-3", "심화하", seed);
      // ⚠️ 발문 가운데 「$4$개」가 끼므로 **자리로 세면 어긋난다**(실측: 합 대신 4를 집었다).
      //    묻는 값은 이름으로 집는다.
      const [dw, dd] = intsIn(dp.content);
      const sum = Number(/합이 \$(\d+)\$/.exec(dp.content)![1]);
      expect(
        sum! % (2 * (dw! + dd!)),
        `2-5-3 심화 @${seed} 높이가 정수가 아니다`,
      ).toBe(0);
      expect(answerNumber(dp.answer, `2-5-3 심화 @${seed}`), dp.content).toBe(
        sum! / (2 * (dw! + dd!)),
      );
    }
  });

  it("2-5-4 — 숨은 모서리 셋 · 보이는 아홉이 전체 넷과 맞물린다", () => {
    for (const seed of SEEDS) {
      const c = problem("2-5-4", "연산", seed);
      const [w, d, h] = intsIn(c.content);
      const s = w! + d! + h!;
      expect(answerNumber(c.answer, `2-5-4 연산 @${seed}`), c.content).toBe(s);

      const r = problem("2-5-4", "기본", seed);
      const rd = dimsOf(r)!;
      expect(answerNumber(r.answer, `2-5-4 기본 @${seed}`), r.content).toBe(
        3 * (rd.w + rd.d + rd.h),
      );

      const ap = problem("2-5-4", "응용", seed);
      const ad = dimsOf(ap)!;
      expect(answerNumber(ap.answer, `2-5-4 응용 @${seed}`), ap.content).toBe(
        2 * (ad.w + ad.d + ad.h),
      );

      // 심화: 보이는 합 ÷ 3 × 4 — **3으로 나누어떨어져야** 한다
      const dp = problem("2-5-4", "심화하", seed);
      const vis = Number(/합이 \$(\d+)\$/.exec(dp.content)![1]);
      expect(vis! % 3, `2-5-4 심화 @${seed} 보이는 합이 3으로 안 나뉜다`).toBe(
        0,
      );
      expect(answerNumber(dp.answer, `2-5-4 심화 @${seed}`), dp.content).toBe(
        (vis! / 3) * 4,
      );
    }
  });

  it("2-5-5 — 전개도 둘레는 한 모서리의 **14배**다 (엔진 배치 실측 근거)", () => {
    // ⚠️ 이 값은 **전개도를 어떻게 펼쳤나**에 매인다. `_net_cuboid` 의 십자 배치에서
    //    둘레는 `2w+8d+4h` 이고 정육면체면 `14e` 다 — 그려진 `<rect>` 여섯의 외곽을
    //    직접 재어 확인했다(2026-08-23: 4·4·4→56 · 8·5·3→68 · 6·2·7→56).
    //    **배치가 바뀌면 이 시험이 아니라 엔진이 먼저 바뀐다** — 그때 여기도 봐야 한다.
    for (const seed of SEEDS) {
      const c = problem("2-5-5", "연산", seed);
      const [e] = intsIn(c.content);
      expect(answerNumber(c.answer, `2-5-5 연산 @${seed}`), c.content).toBe(
        14 * e!,
      );
      const d = dimsOf(c)!;
      expect(
        d.w === e && d.d === e && d.h === e,
        `2-5-5 @${seed} 그림이 정육면체가 아니다`,
      ).toBe(true);

      // 심화: 둘레 → 한 모서리 → 모서리 합(12배). 14로 나누어떨어져야 한다
      const dp = problem("2-5-5", "심화하", seed);
      const [per] = intsIn(dp.content);
      expect(per! % 14, `2-5-5 심화 @${seed} 둘레가 14로 안 나뉜다`).toBe(0);
      expect(answerNumber(dp.answer, `2-5-5 심화 @${seed}`), dp.content).toBe(
        (per! / 14) * 12,
      );
    }
  });

  it("2-5-6 — 마주 보는 면은 넓이가 같다 (역산은 두 나눗셈이 떨어진다)", () => {
    for (const seed of SEEDS) {
      const c = problem("2-5-6", "연산", seed);
      const cd = dimsOf(c)!;
      expect(answerNumber(c.answer, `2-5-6 연산 @${seed}`), c.content).toBe(
        cd.w * cd.d,
      );

      // ⚠️ 심화 몫은 여기서 뺐다 — **그림이 없어졌기 때문**이다(2026-08-24).
      //    그림이 역산의 답을 글자로 찍고 있어서 뗐고, 그러면 `dimsOf` 가 설 데가
      //    없다. 심화는 아래 「발문에 실린 두 넓이가 답의 근거다」가 잠근다 —
      //    참을 그림이 아니라 **발문**에서 가져오므로 그쪽이 원래 옳은 자리다.
      const dp = problem("2-5-6", "심화하", seed);
      const [w, a1, a2] = intsIn(dp.content);
      expect(a1! % w!, `2-5-6 심화 @${seed} 첫 나눗셈이 안 떨어진다`).toBe(0);
      expect(a2! % w!, `2-5-6 심화 @${seed} 둘째 나눗셈이 안 떨어진다`).toBe(0);
    }
  });

  /* ── 형제 소단원 겹침 (D-66 ⒃) ── */

  it("초5 1-6(둘레와 넓이)과 발문이 겹치지 않는다 — 골격까지", () => {
    // ⚠️ 「직육면체 한 면의 넓이」는 사실상 「직사각형의 넓이」라 **자기 학년 안에서**
    //    겹친다. 그래서 2-5-1·2-5-2 에서 «한 면의 넓이·둘레»를 통째로 뺐다.
    //    2-5-3·2-5-6 의 넓이는 «어느 면인가»를 답하는 **수단**이라 골격이 다르다.
    const skeleton = (t: string) => t.replace(/\d+/g, "#");
    const others = new Set<string>();
    for (const u of elementaryUnits().filter(
      (x) => x.grade === "초5" && x.section.startsWith("1-6-"),
    )) {
      const tiers = supportedTiers(u);
      for (const tier of tiers.length ? tiers : [undefined]) {
        for (let seed = 1; seed <= 10; seed += 1)
          others.add(
            skeleton(generateElementaryProblem(u, seed, tier).content),
          );
      }
    }
    expect(others.size, "이웃 모집단이 비었다").toBeGreaterThan(20);

    const clash: string[] = [];
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          if (others.has(skeleton(c)))
            clash.push(`골격 일치 ${code} ${tier}\n    ${c}`);
        }
      }
    }
    expect(clash.slice(0, 3), `초5 1-6 과 겹친 발문 ${clash.length}건`).toEqual(
      [],
    );
  });

  it("겉넓이·부피를 쓰지 않는다 — 그건 **초6** 이다 (D-66 ⑶)", () => {
    // ⚠️ 초6 1-6-1「직육면체의 겉넓이」·1-6-2「부피」는 g6 가 이미 갈래를 썼다.
    //    여기서 쓰면 학년을 넘고 남의 문항과 겹친다.
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const word of ["겉넓이", "부피", "cm³", "m³"]) {
            expect(
              `${p.content} ${p.solution}`.includes(word),
              `${code} ${tier} @${seed} 에 «${word}» 가 있다 — 초6 내용이다`,
            ).toBe(false);
          }
        }
      }
    }
  });

  /* ── 변이가 찾아 준 구멍 넷 (2026-08-24 13차분 회차) ────────────────────────
   *
   * ⚠️ 아래 넷은 **전부 「값이 맞는데 틀린」 부류**라 앞 시험이 구조적으로 못 봤다.
   *    변이 여섯이 초록으로 빠져나갔고, 그 여섯을 보고 이 넷을 썼다. 여기 적어 두는
   *    까닭은 「무엇을 안 보고 있었나」가 시험 이름만으로는 안 남기 때문이다.
   */

  it("답이 언제나 양수다 — 「남는 것이 $-7$ cm」인 문항은 없다", () => {
    // ⚠️ 역산·「남는 양」 갈래는 **구성으로** 양수가 보장된다(D-66 ⒂). 그런데 그
    //    보장을 잠근 시험이 없어, 범위를 한 칸 넓히는 변이 둘이 초록으로 지나갔다.
    //    해설의 뺄셈은 산술적으로 맞으므로 값 검산·등식 판정기도 못 잡는 자리다.
    const bad: string[] = [];
    for (const code of CODES25) {
      for (const tier of tiersOf(unitOf(code))) {
        for (let seed = 0; seed < 200; seed += 1) {
          const p = problem(code, tier, seed);
          const v = answerNumber(p.answer, `${code} ${tier} @${seed}`);
          if (!(v > 0))
            bad.push(`${code} ${tier} @${seed}: ${p.answer} — ${p.content}`);
        }
      }
    }
    expect(bad.slice(0, 3), `양수가 아닌 답 ${bad.length}건`).toEqual([]);
  });

  it("2-5-3 기본 — «가장 넓은» 면을 고른다 (가장 좁은 쪽이 아니다)", () => {
    // ⚠️ 2-5-3 은 연산·응용·심화만 잠겨 있었다. 기본의 `Math.max` 를 `Math.min` 으로
    //    뒤집는 변이가 초록이었다 — 발문은 «가장 넓은»이라 하고 답은 가장 좁은 것인데
    //    해설도 같이 틀리므로 **자기 안에서는 앞뒤가 맞는다.**
    for (const seed of SEEDS) {
      const r = problem("2-5-3", "기본", seed);
      const d = dimsOf(r)!;
      expect(answerNumber(r.answer, `2-5-3 기본 @${seed}`), r.content).toBe(
        Math.max(d.w, d.d) * d.h,
      );
    }
  });

  it("2-5-6 심화 — **발문에 실린 두 넓이**가 답의 근거다 (그림이 아니라)", () => {
    // ⚠️ 앞 시험은 답을 **그림 치수**로 견줬다. 그러면 발문의 넓이만 틀어져도 초록이다
    //    — 「둘째 넓이를 $w$ 만큼 부풀리기」 변이가 정확히 그 구멍으로 빠져나갔다.
    //    게다가 부풀린 값도 $w$ 로 나누어떨어져 「나눗셈이 떨어지나」 가드까지 통과했다.
    //    참을 그림에서 가져오면 발문이 거짓말을 해도 안 보인다.
    for (const seed of SEEDS) {
      const dp = problem("2-5-6", "심화하", seed);
      const [w, a1, a2] = intsIn(dp.content);
      expect(answerNumber(dp.answer, `2-5-6 심화 @${seed}`), dp.content).toBe(
        4 * (w! + a1! / w! + a2! / w!),
      );
    }
  });

  it("2-5-1 심화 — 발문의 «세로의 $k$배»가 실제로 참이다", () => {
    // ⚠️ 이 조건이 답을 하나로 만든다. 깨져도 답은 여전히 «어떤 수»라서 값 검산이
    //    안 물고, 배수 관계를 되짚는 시험이 없어 변이가 초록이었다.
    for (const seed of SEEDS) {
      const dp = problem("2-5-1", "심화하", seed);
      const [total, k, h] = intsIn(dp.content);
      expect(total! % 4, `2-5-1 심화 @${seed} 합이 $4$ 로 안 나뉜다`).toBe(0);
      const d = answerNumber(dp.answer, `2-5-1 심화 @${seed}`);
      expect(total! / 4 - d - h!, dp.content).toBe(k! * d);
    }
  });

  /* ── 그림도 R5다 — 심화의 그림이 «발문에 없는 수»를 글자로 찍지 않는다 ────────
   *
   * ⚠️ **D-66 ⑻(발문이 답을 이미 말하지 않는다)의 «그림판»이다.** ⑺·⑿ 가
   *    「그림이 답하지 않는다 / 가리지 않는다」를 다루는데, **「그림이 답을 적어
   *    준다」는 또 다른 얼굴**이다. 나중에 D-66 에 얹을 값어치가 있다(리드 확인).
   *
   * ⚠️ **왜 필요한가** — 2-5-6 심화가 이랬다(2026-08-24). 발문은 「가로 $10$ cm인
   *    면 두 개의 넓이가 $40$·$60$」이고 역산이 `40÷10=4`·`60÷10=6` 인데, 붙은
   *    `netCuboid` 가 **`4 cm`·`6 cm` 를 변 밖에 글자로** 찍었다
   *    (`scripts/figure/elem_advanced.py` `_net_cuboid` 1726행: `w == d == h` 가
   *    아니면 세 치수를 늘 찍는다. `boxDims` 가 셋이 서로 다른 것을 **보장**하므로
   *    그 갈래에서는 **언제나** 찍힌다 — 60/60 이 우연이 아니라 구조다).
   *    학생은 두 나눗셈을 건너뛰고 읽으면 된다. **심화가 실질 연산으로 주저앉는다.**
   *    값·조사·등식·사다리 판정기가 **전부 초록**이었다. 그 축이 없었기 때문이다.
   *
   * ⚠️ **취향이 아니라 분모로 갈랐다.** 초5 심화 전량에서 씨앗 60개씩 세니
   *        1-3-1 · 1-3-2 · 2-3-1 · 2-3-2   치수 글자  0/60
   *        2-5-6                          치수 글자 60/60   ← 혼자
   *    넷 대 하나면 설계가 아니라 **빠뜨린 것**이다.
   *
   * ⚠️ **눈금을 픽스처로 박는다** — 실물만 보면 2-5-6 을 고치는 순간 양성이 사라져
   *    재현율을 영영 못 잰다(전량 초록이라 잘 도는 것처럼 보인다).
   *    눈금 = **양성 2 · 음성 2**. 위 census 표(양성 1 · 음성 4)가 실물 쪽 눈금이다.
   *
   * ⚠️ **이 열쇠가 못 보는 것** — 치수를 «변 밖에 글자로» 찍는 kind 는 실측으로
   *    `cuboid`·`netCuboid` 둘뿐이라 그 둘만 본다. `table`·`areaPoly` 등이 수를
   *    찍는지는 **안 쟀다.** 넓히려면 엔진 원문을 먼저 재라 — 안 재고 넓히면
   *    거짓 경보가 나고, 거짓 경보는 가드를 끈다(CLAUDE.md 2026-08-20).
   *
   * ⚠️ **옮길 때** — 이 축은 학년을 안 가린다. 공용 판정기가 원래 자리이고, 리드가
   *    「공용으로 옮길 후보」로 잡아 두었다. 옮기는 사람이 눈금을 다시 만들지
   *    않도록 위 수치와 픽스처를 그대로 가져갈 것.
   */

  /** 치수를 «변 밖에 글자로» 찍는 kind — `elem_advanced.py` 실측. */
  const labelsDims = (fs: Record<string, unknown>) =>
    (fs.kind === "cuboid" || fs.kind === "netCuboid") &&
    !(fs.w === fs.d && fs.d === fs.h);

  /** 그림이 발문에 없는 수를 새로 들이면 그 수들을 돌려준다. */
  const figureLeak = (content: string, fs: Record<string, unknown> | null) => {
    if (!fs || !labelsDims(fs)) return [];
    const inText = new Set(intsIn(content));
    return (["w", "d", "h"] as const)
      .map((k) => Number(fs[k]))
      .filter((v) => !inText.has(v));
  };

  it("심화의 그림은 **발문에 없는 수**를 글자로 찍지 않는다 (그림도 R5다)", () => {
    // ── 눈금 (양성 2 · 음성 2) — 이 판정기가 «아니오»를 낼 수 있는가 ──
    expect(
      figureLeak("가로가 $10$ cm인 면 두 개의 넓이가 각각 $40$ cm², $60$ cm²", {
        kind: "netCuboid",
        w: 10,
        d: 4,
        h: 6,
      }),
      "양성 — 역산의 답 $4$·$6$ 이 그림에 적혀 있다 (2-5-6 심화의 옛 모습)",
    ).toEqual([4, 6]);
    expect(
      figureLeak("모든 모서리 길이의 합이 $148$ cm인 직육면체가 있습니다", {
        kind: "cuboid",
        w: 24,
        d: 6,
        h: 7,
      }),
      "양성 — 발문에 없는 세 치수가 다 그림에 있다",
    ).toEqual([24, 6, 7]);
    expect(
      figureLeak("가로가 $6$ cm, 세로가 $4$ cm, 높이가 $7$ cm인 직육면체", {
        kind: "netCuboid",
        w: 6,
        d: 4,
        h: 7,
      }),
      "음성 — 발문이 이미 말한 치수다 (연산·기본은 이래야 한다)",
    ).toEqual([]);
    expect(
      figureLeak("한 모서리가 $9$ cm인 정육면체", {
        kind: "cuboid",
        w: 9,
        d: 9,
        h: 9,
      }),
      "음성 — 정육면체는 엔진이 치수를 안 찍는다",
    ).toEqual([]);

    // ── 실물 — 초5 심화 전량 ──
    const bad: string[] = [];
    for (const u of elementaryUnits().filter((x) => x.grade === "초5")) {
      if (!supportedTiers(u).length) continue;
      for (let seed = 0; seed < 60; seed += 1) {
        const p = generateElementaryProblem(u, seed, "심화하");
        const leak = figureLeak(
          p.content,
          p.figureSpec as Record<string, unknown> | null,
        );
        if (leak.length)
          bad.push(
            `${u.section} @${seed}: 그림이 ${leak.join("·")} 를 새로 들인다 — ${p.content}`,
          );
      }
    }
    expect(
      bad.slice(0, 3),
      `그림이 답을 글자로 흘리는 심화 ${bad.length}건`,
    ).toEqual([]);
  });
});
