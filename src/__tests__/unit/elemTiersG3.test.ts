/**
 * 초3 1-1 「덧셈과 뺄셈」 4단 확대 (D-72) — 파일럿 `1-1-2` 를 뺀 세 소단원.
 *
 * **참은 발문에서 온다.** 생성기의 계산을 다시 부르지 않고, 지면에 실제로 찍히는 수를
 * 뽑아 여기서 다시 셈한다. 받아올림·받아내림도 여기 다시 적는다 — 제품 함수를 부르면
 * 동어반복이 된다(CLAUDE.md 2026-08-18 「지표의 «참»이 제품 상수에서 나오면」).
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS, type ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

/** 이 파일이 맡는 소단원 — 파일럿(1-1-2)은 딴 파일이 지킨다. */
const CODES = ["1-1-1", "1-1-3", "1-1-4"] as const;
type Code = (typeof CODES)[number];

/** 소단원 이름이 약속한 받아올림·받아내림 범위. */
const RANGE: Record<Code, [number, number]> = {
  "1-1-1": [0, 1], // 「받아올림이 없는, 한 번 있는」
  "1-1-3": [0, 1], // 「받아내림이 없는, 한 번 있는」
  "1-1-4": [2, 2], // 「받아내림이 두 번 있는」
};

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);

function unitOf(code: Code) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** KaTeX 안에 찍힌 수를 **나온 순서대로**. 한 덩어리에 여럿일 수 있다. */
function nums(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

function answerOf(answer: string): number {
  expect(answer, `정답이 KaTeX 로 안 감싸졌다: ${answer}`).toMatch(/^\$\d+\$$/);
  return Number(answer.slice(1, -1));
}

function carries(a: number, b: number): number {
  let count = 0;
  let carry = 0;
  for (let place = 1; place <= 100; place *= 10) {
    const s =
      (Math.floor(a / place) % 10) + (Math.floor(b / place) % 10) + carry;
    carry = s >= 10 ? 1 : 0;
    count += carry;
  }
  return count;
}

function borrows(a: number, b: number): number {
  let count = 0;
  let owe = 0;
  for (let place = 1; place <= 100; place *= 10) {
    const top = (Math.floor(a / place) % 10) - owe;
    const bot = Math.floor(b / place) % 10;
    if (top < bot) {
      count += 1;
      owe = 1;
    } else {
      owe = 0;
    }
  }
  return count;
}

/**
 * 해설에 적힌 셈을 그대로 꺼낸다 — `$A+B=C$` · `$A-B=C$`.
 * 해설은 «학생이 실제로 밟는 단계»라, 여기 적힌 셈이 곧 그 갈래가 시키는 일이다.
 */
function steps(
  solution: string,
): { a: number; op: "+" | "-"; b: number; c: number }[] {
  return [...solution.matchAll(/\$(\d+)([+-])(\d+)=(\d+)\$/g)].map((m) => ({
    a: Number(m[1]),
    op: m[2] as "+" | "-",
    b: Number(m[3]),
    c: Number(m[4]),
  }));
}

describe("[초3 4단] 1-1 덧셈과 뺄셈 — 파일럿 밖 세 소단원", () => {
  it("세 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(unitOf(code), 31337, tier);
        const b = generateElementaryProblem(unitOf(code), 31337, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("해설의 셈이 하나도 빠짐없이 **실제로 맞는다**", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          const st = steps(p.solution);
          expect(
            st.length,
            `${code} ${tier} seed ${seed}: 해설에 식이 없다`,
          ).toBeGreaterThan(0);
          for (const s of st) {
            const want = s.op === "+" ? s.a + s.b : s.a - s.b;
            if (want !== s.c) {
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b}=${s.c} (참 ${want})`,
              );
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("정답은 해설 **마지막 단계**의 값과 같다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          const st = steps(p.solution);
          const last = st[st.length - 1]!;
          expect(
            answerOf(p.answer),
            `${code} ${tier} seed ${seed}: ${p.content}`,
          ).toBe(last.c);
        }
      }
    }
  });

  it("모든 셈이 (세 자리)±(세 자리)이고 소단원이 약속한 받아올림·받아내림이다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const [lo, hi] = RANGE[code];
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const s of steps(p.solution)) {
            // 되짚는 셈은 방향이 반대다 — 소단원이 약속한 것은 «바른» 방향의 셈이다.
            // 덧셈 소단원이면 덧셈만, 뺄셈 소단원이면 뺄셈만 잣대에 건다.
            const want = code === "1-1-1" ? "+" : "-";
            if (s.op !== want) continue;
            if (s.a < 100 || s.a > 999 || s.b < 100 || s.b > 999) {
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b} — 세 자리가 아니다`,
              );
              continue;
            }
            const got = s.op === "+" ? carries(s.a, s.b) : borrows(s.a, s.b);
            if (got < lo || got > hi) {
              bad.push(
                `${code} ${tier} seed ${seed}: ${s.a}${s.op}${s.b} — ${got}번 (${lo}~${hi} 이어야)`,
              );
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("D-72 축 — 1단은 한 단계, 3단은 두 단계, 4단은 되짚는다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unitOf(code), seed, "연산");
        expect(steps(calc.solution).length, `${code} 연산 seed ${seed}`).toBe(
          1,
        );

        const apply = generateElementaryProblem(unitOf(code), seed, "응용");
        const applySteps = steps(apply.solution);
        expect(applySteps.length, `${code} 응용 seed ${seed}`).toBe(2);
        // 두 단계여야 한다 — 첫 셈의 답이 둘째 셈에 **들어가야** 「중간값」이다.
        const s1 = applySteps[0]!;
        const s2 = applySteps[1]!;
        expect(
          s1.c === s2.a || s1.c === s2.b,
          `${code} 응용 seed ${seed}: 중간값이 안 이어진다`,
        ).toBe(true);

        // 4단은 되짚는다 — 소단원의 «바른» 방향과 **반대** 셈이 반드시 하나 있다.
        const deep = generateElementaryProblem(unitOf(code), seed, "심화");
        const reverseOp = code === "1-1-1" ? "-" : "+";
        expect(
          steps(deep.solution).some((s) => s.op === reverseOp),
          `${code} 심화 seed ${seed}: 되짚는 셈이 없다`,
        ).toBe(true);
      }
    }
  });

  it("2단은 문장으로 묻는다 — 발문에 계산식이 없다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "기본");
        expect(p.content, `${code} seed ${seed}`).not.toMatch(
          /[+\-]\d|\\square/,
        );
        expect(p.content.length, `${code} seed ${seed}`).toBeGreaterThan(30);
      }
    }
  });

  it("갈래마다 변형 공간이 여덟 가지 이상이다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const stems = new Set<string>();
        for (let seed = 0; seed < 240; seed += 1) {
          stems.add(
            generateElementaryProblem(unitOf(code), seed, tier).content.replace(
              /\$[^$]*\$/g,
              "#",
            ),
          );
        }
        expect(stems.size, `${code} ${tier} 변형 공간`).toBeGreaterThanOrEqual(
          8,
        );
      }
    }
  });

  it("네 갈래 발문이 서로 갈리고, 파일럿(1-1-2)과도 겹치지 않는다", () => {
    for (const seed of SEEDS) {
      const seen = new Set<string>();
      for (const code of [...CODES, "1-1-2"] as const) {
        for (const tier of ELEM_TIERS) {
          const u = elementaryUnits().find(
            (x) => x.grade === "초3" && x.section.startsWith(code),
          )!;
          seen.add(generateElementaryProblem(u, seed, tier).content);
        }
      }
      expect(seen.size, `seed ${seed}: 같은 발문이 겹친다`).toBe(16);
    }
  });

  it("씨앗을 바꾸면 갈래마다 문항이 바뀐다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const seen = new Set(
          SEEDS.map(
            (s) => generateElementaryProblem(unitOf(code), s, tier).content,
          ),
        );
        expect(seen.size, `${code} ${tier} 가 씨앗에 반응하지 않는다`).toBe(
          SEEDS.length,
        );
      }
    }
  });

  it("모든 갈래의 수가 KaTeX 안에 있다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            expect(
              outside,
              `${code} ${tier} seed ${seed} ${label}: ${text}`,
            ).toBeNull();
          }
        }
      }
    }
  });

  it("수 바로 뒤에 조사를 붙이지 않는다", () => {
    // 수는 **읽는 소리**로 조사가 갈린다($4$→사→「가」, $3$→삼→「이」).
    // 글자만 봐서는 못 정하므로 그런 자리는 문장을 바꿔야 한다.
    const risk = /\$[^$]*\$\s*(은|는|이|가|을|를|과|와|으로|로)(?![가-힣])/;
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          for (const text of [p.content, p.answer, p.solution]) {
            // 단위가 붙은 수(`$4\,\mathrm{cm}$ 는`)는 단위 이름이 소리를 정하므로 뺀다.
            if (risk.test(text) && !/\\mathrm/.test(text)) {
              bad.push(`${code} ${tier} seed ${seed}: ${text.match(risk)![0]}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
