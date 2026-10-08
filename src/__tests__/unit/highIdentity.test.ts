/**
 * 공통수학1 「항등식과 나머지정리」 14유형 — **독립 검산** (고등 엔진 본보기의 시험).
 *
 * 생성기의 답을 그대로 믿지 않는다. `facts`(발문의 원 수치)로 유형마다 **다른 식**을 세워
 * 답을 다시 낸다 — 긴 나눗셈(`plongDivide`) · 여러 점 대입 · 두 점 보간 · BigInt 거듭제곱.
 * 다항식 셈과 지면 읽기는 제품(`src/lib/high/poly.ts`)을 안 부르고 `helpers/highPage.ts` 에
 * 다시 적었다(같이 틀리지 않게).
 *
 * `VERIFY` 는 `facts` 만 본다 — **발문에 딴 수를 찍는** 결함은 못 본다. 그 축은 `SHOWN` 이
 * 맡는다(지면의 수식에서 다항식을 읽어 facts 로 만든 것과 맞댄다).
 *
 * 난이도 칸은 색인의 **검은 표**가 정한다(`high-engine-plan.md` §1-4) — 규칙은 여기 있고
 * 모듈은 칸을 직접 적는다. 모듈이 색인 json 을 읽으면 제품이 저장소 밖 산출물에 기댄다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { bareNumbers } from "../../lib/elementary/rules";
import { expandFamily } from "../../lib/engine/expandEngine";
import {
  generateHighProblem,
  generateHighSet,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_IDENTITY } from "../../lib/high/h1Identity";
import type { HighProblem } from "../../lib/high/types";
import {
  highCatalog,
  modalTiers,
  padd,
  parsePolyTex,
  pkey,
  plongDivide,
  pmul,
  proots,
  pscale,
  ptrim,
  pval,
  readAnswer,
  roMismatches,
  shownPolys,
  tiersAllowedBy,
  type P,
} from "../helpers/highPage";
import { josaMismatches, pageSmells } from "../helpers/midPage";

const BOOK = "공통수학1";
const MINOR = "항등식과 나머지정리";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);
const rowOf = (number: string) => {
  const row = catalogRows.find((t) => t.number === number);
  if (!row) throw new Error(`색인에 없는 번호: ${number}`);
  return row;
};

/** 여러 점에서 두 식이 같은가 — 항등식 주장을 값으로 확인한다. */
function sameAt(f: (x: number) => number, g: (x: number) => number): boolean {
  for (let x = -4; x <= 4; x += 1) if (f(x) !== g(x)) return false;
  return true;
}

type Fact = Record<string, number>;
type Expect = number | P;

const VERIFY: Record<string, (f: Fact) => Expect> = {
  "01": (f) => {
    if (f.mode === 0) {
      expect(
        sameAt(
          (x) => x ** 3 + f.L2! * x * x + f.a! * x + f.L0!,
          (x) => (x - f.r!) * (x * x + f.b! * x + f.c!),
        ),
        "좌변과 우변이 항등식이 아니다",
      ).toBe(true);
      return [f.a! + f.b! + f.c!, f.a! + f.b! - f.c!, f.a! * f.b! * f.c!][
        f.exprId!
      ]!;
    }
    if (f.mode === 1) {
      const x = (f.m! + Math.sqrt(f.m! * f.m! + 4 * f.n!)) / 2;
      const y = x - f.m!;
      for (const k of [0, 1, -3, 7]) {
        expect(
          Math.abs(k * x + x * y - k * y - f.m! * k - f.n!),
          "k 에 관계없이 성립하지 않는다",
        ).toBeLessThan(1e-6);
      }
      return Math.round(f.exprId === 0 ? x * x + y * y : (x + y) ** 2);
    }
    expect(
      sameAt(
        (x) => x ** 3 + f.P! * x + f.a!,
        (x) => (x * x + f.d! * x + f.e!) * (x - f.d!) + f.b! * x + f.R!,
      ),
      "몫 x-d 로 놓은 항등식이 성립하지 않는다",
    ).toBe(true);
    return [f.a! * f.b!, f.a! + f.b!][f.exprId!]!;
  },

  "02": (f) => {
    if (f.mode === 0) {
      return [f.a! * f.b! * f.c!, f.a! + f.b! + f.c!, f.a! - f.b! + f.c!][
        f.exprId!
      ]!;
    }
    if (f.mode === 1) {
      return [2 * f.a! + f.b! - f.c!, f.a! + f.b! + f.c!, f.a! * f.b! * f.c!][
        f.exprId!
      ]!;
    }
    const lhs: number[] = new Array<number>(f.n! + 1).fill(0);
    lhs[0] = f.b!;
    lhs[1] = f.a!;
    lhs[f.n!] = 1;
    expect(pval(lhs, f.u!), "x=u 에서 0 이 아니다").toBe(0);
    expect(pval(lhs, f.v!), "x=v 에서 0 이 아니다").toBe(0);
    const { q, r } = plongDivide(lhs, proots([f.u!, f.v!]));
    expect(r, "나누어떨어지지 않는다").toEqual([0]);
    return pval(q, f.t!);
  },

  "03": (f) => {
    if (f.mode === 0) {
      for (const y of [0, 1, -2, 3]) {
        const x = f.n! - f.m! * y;
        expect(f.p! * f.a! * x + f.b! * y, "관계식 위에서 등식이 깨진다").toBe(
          f.q!,
        );
      }
      return f.a! + f.b!;
    }
    for (const k of [0, 1, -2, 5]) {
      expect(
        f.al! * f.al! + (k + f.s!) * f.al! + (k + f.t!) * f.p! + f.q!,
        "k 에 관계없이 α 가 근이 아니다",
      ).toBe(0);
    }
    return f.p! + f.q!;
  },

  "04": (f) => {
    const base = ptrim([f.c0!, f.c1!, f.c2!]);
    const S1 = pval(base, 1) ** f.n!;
    const Sm = pval(base, -1) ** f.n!;
    const S0 = pval(base, 0) ** f.n!;
    if (f.kind === 0) return S1;
    if (f.kind === 1) return (S1 + Sm) / 2;
    if (f.kind === 2) return (S1 - Sm) / 2;
    return S1 - S0;
  },

  "05": (f) => {
    if (f.mode === 0) {
      const { r } = plongDivide([f.K!, f.a!, 0, 1], [f.b!, f.d!, 1]);
      expect(r, "나머지가 발문과 다르다").toEqual(ptrim([f.r0!, f.r1!]));
      return f.a! + f.b!;
    }
    if (f.mode === 1) {
      const { r } = plongDivide([-f.a!, f.Q!, f.P!, 1], [f.b!, f.D!, 1]);
      expect(r, "나누어떨어지지 않는다").toEqual([0]);
      return [f.a! - f.b!, f.a! + f.b!][f.exprId!]!;
    }
    const { r } = plongDivide([f.b!, 0, f.a!, 1], proots([f.u!, f.v!]));
    expect(r, "나머지가 발문과 다르다").toEqual(ptrim([f.r0!, f.r1!]));
    return [f.a! * f.b!, f.a! + f.b!][f.exprId!]!;
  },

  "06": (f) => {
    if (f.mode === 0) return f.m! * f.F! + f.n! * f.G!;
    if (f.mode === 1) {
      const poly = [f.q!, f.a!, f.p!, 1];
      expect(pval(poly, f.u!), "두 나머지가 같지 않다").toBe(pval(poly, f.v!));
      return f.a!;
    }
    const poly = [f.k!, 0, f.b!, f.a!, 1];
    expect(pval(poly, 1), "x-1 나머지가 발문과 다르다").toBe(f.R1!);
    expect(pval(poly, -1), "x+1 나머지가 발문과 다르다").toBe(f.R2!);
    return [f.a! * f.b!, f.a! + f.b!][f.exprId!]!;
  },

  "07": (f) => {
    if (f.mode === 0) {
      const slope = (f.P! - f.Q!) / (f.u! - f.v!);
      const intercept = f.P! - slope * f.u!;
      return slope * f.t! + intercept;
    }
    const R1 = [f.m! * f.p! + f.n! - f.al! * f.p!, f.al!];
    const R2 = [f.m! * f.r! + f.n! - f.gm! * f.r!, f.gm!];
    const fp = pval(R1, f.p!);
    const fr = pval(R2, f.r!);
    const slope = (fp - fr) / (f.p! - f.r!);
    const intercept = fp - slope * f.p!;
    return ptrim([intercept, slope]);
  },

  "08": (f) => {
    if (f.mode === 2) {
      const coefs = new Array<number>(f.e1! + 1).fill(0);
      coefs[f.e1!] = f.s1!;
      coefs[f.e2!] = f.s2!;
      coefs[f.e3!] = f.s3!;
      coefs[0] = f.k!;
      const { r } = plongDivide(coefs, [0, -1, 0, 1]);
      return pval(r, f.t!);
    }
    const D = [f.Q!, f.P!, 1];
    const rem = [f.r0!, f.r1!];
    const lead = (f.K! - pval(rem, f.t!)) / pval(D, f.t!);
    expect(Number.isInteger(lead), "이차식 몫의 계수가 정수가 아니다").toBe(
      true,
    );
    const R = padd(pscale(D, lead), rem);
    return f.mode === 0 ? pval(R, f.w!) : R;
  },

  "09": (f) => {
    expect(f.p! * f.al! + f.q!, "대입값이 나눗셈의 근이 아니다").toBe(f.w!);
    expect([f.u!, f.v!]).toContain(f.w!);
    const fw = pval([f.r0!, f.r1!], f.w!);
    return f.mode === 0 ? fw : (f.al! - f.k!) * fw;
  },

  "10": (f) => {
    if (f.mode === 0) return f.v! * ((f.v! - f.u!) * f.S! + f.R!);
    const f1 = 1 + f.s! + f.c!;
    const fm = (-1) ** f.e1! + f.s! * (-1) ** f.e2! - f.c!;
    // ⚠️ `% 2` 는 음수에서 `-0` 을 낸다 — `toBe(0)` 이 거짓으로 빨개진다.
    expect(Number.isInteger((f1 - fm) / 2), "몫의 나머지가 정수가 아니다").toBe(
      true,
    );
    return (f1 - fm) / 2;
  },

  "11": (f) => {
    if (f.mode === 0) {
      const poly = [f.K!, f.b!, f.a!, 1];
      expect(pval(poly, f.u!), "x=u 에서 0 이 아니다").toBe(0);
      expect(pval(poly, f.v!), "x=v 에서 0 이 아니다").toBe(0);
      return [f.a! * f.b!, f.a! + f.b!][f.exprId!]!;
    }
    if (f.mode === 1) {
      const poly = [f.q!, f.p!, f.k!, 0, 1];
      expect(pval(poly, f.u!), "x=u 에서 0 이 아니다").toBe(0);
      return f.k!;
    }
    return (f.t! - f.u!) * (f.t! - f.v!) * (f.t! - f.w!) + f.K!;
  },

  "12": (f) => {
    if (f.mode === 0) {
      const { r } = plongDivide([f.K!, f.b!, f.a!, 1], proots([f.u!, f.v!]));
      expect(r, "나누어떨어지지 않는다").toEqual([0]);
      return [f.a! - f.b!, f.a! * f.b!][f.exprId!]!;
    }
    const poly = [f.b!, f.a!, f.P!, 1];
    const { r } = plongDivide(poly, proots([f.u!, f.v!]));
    expect(r, "나누어떨어지지 않는다").toEqual([0]);
    return pval(poly, f.t!);
  },

  "13": (f) =>
    f.mode === 0
      ? [f.A! * f.b! * f.c! * f.d!, f.A! + f.b! + f.c! + f.d!][f.exprId!]!
      : [f.A! * f.b! + f.c! * f.d!, f.A! * f.b! * f.c! * f.d!][f.exprId!]!,

  "14": (f) => {
    if (f.mode === 0 || f.variant === 0) {
      const n = BigInt(f.N!);
      return Number(n ** BigInt(f.e!) % BigInt(f.M!));
    }
    const b = BigInt(f.b!);
    const sum =
      b ** BigInt(f.e!) + b ** BigInt(f.e! + 1) + b ** BigInt(f.e! + 2);
    return Number(sum % BigInt(f.M!));
  },
};

/** 발문이 **보여 줘야 하는** 다항식 — facts 로 시험이 따로 만든다. */
const SHOWN: Record<string, (f: Fact) => number[][]> = {
  "01": () => [],
  "02": (f) => {
    if (f.mode === 0) {
      return [
        padd(
          padd(
            pscale(proots([f.v!, f.w!]), f.a!),
            pscale(proots([f.u!, f.w!]), f.b!),
          ),
          pscale(proots([f.u!, f.v!]), f.c!),
        ),
      ];
    }
    if (f.mode === 1) {
      const sh = [-f.s!, 1];
      return [padd(padd(pscale(pmul(sh, sh), f.a!), pscale(sh, f.b!)), [f.c!])];
    }
    return [];
  },
  "03": () => [],
  "04": () => [],
  "05": (f) =>
    f.mode === 0
      ? [[f.r0!, f.r1!]]
      : f.mode === 1
        ? []
        : [proots([f.u!, f.v!]), [f.r0!, f.r1!]],
  "06": (f) =>
    f.mode === 0
      ? [[f.F!], [f.G!], [-f.al!, 1]]
      : f.mode === 1
        ? [
            [-f.u!, 1],
            [-f.v!, 1],
          ]
        : [[f.R1!], [f.R2!]],
  "07": (f) =>
    f.mode === 0
      ? [[f.P!], [f.Q!], proots([f.u!, f.v!]), [-f.u!, 1], [-f.v!, 1]]
      : [proots([f.p!, f.q!]), proots([f.r!, f.s!]), proots([f.p!, f.r!])],
  "08": (f) => {
    if (f.mode === 2) {
      const coefs = new Array<number>(f.e1! + 1).fill(0);
      coefs[f.e1!] = f.s1!;
      coefs[f.e2!] = f.s2!;
      coefs[f.e3!] = f.s3!;
      coefs[0] = f.k!;
      return [coefs];
    }
    return [[f.Q!, f.P!, 1], [f.r0!, f.r1!], [f.K!], [-f.t!, 1]];
  },
  "09": (f) => [proots([f.u!, f.v!]), [f.r0!, f.r1!], [-f.al!, 1]],
  "10": (f) => (f.mode === 0 ? [[f.R!], [f.S!], [-f.u!, 1], [-f.v!, 1]] : []),
  "11": (f) =>
    f.mode === 0
      ? [
          [-f.u!, 1],
          [-f.v!, 1],
        ]
      : f.mode === 1
        ? [[-f.u!, 1]]
        : [[f.K!], [-f.t!, 1]],
  // 꼴 1 은 나누는 이차식을 **곱꼴**로 보여 준다((x-1)(x+2)) — 전개형을 기대하면 안 된다.
  "12": (f) => (f.mode === 0 ? [proots([f.u!, f.v!])] : [[-f.t!, 1]]),
  "13": (f) => {
    const sh = [-f.s!, 1];
    return [
      padd(
        padd(
          padd(
            pscale(pmul(pmul(sh, sh), sh), f.A!),
            pscale(pmul(sh, sh), f.b!),
          ),
          pscale(sh, f.c!),
        ),
        [f.d!],
      ),
    ];
  },
  "14": (f) => [[f.M!]],
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_IDENTITY) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 항등식과 나머지정리 — 등록", () => {
  it("색인 14유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(14);
    expect(H1_IDENTITY.length).toBe(catalogRows.length);
    for (const e of H1_IDENTITY) {
      const row = rowOf(e.rpmType);
      expect(e.rpmTitle, `${e.key} 제목`).toBe(row.title);
      expect(e.rpmMinor).toBe(MINOR);
      expect(e.rpmBook).toBe(BOOK);
      expect(e.grade).toBe(BOOK);
      expect(e.key).toBe(`${BOOK}|${MINOR}|${e.rpmType}`);
    }
  });

  it("유형의 단원은 교육과정 시드에 실제로 있는 이름이다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === BOOK).map((u) => u.section),
    );
    for (const e of H1_IDENTITY) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_IDENTITY) expect(keys.has(e.key)).toBe(true);
  });
});

describe("고등 공통수학1 항등식과 나머지정리 — 값", () => {
  it("정답을 facts 로 다시 세운 것과 같다", () => {
    eachProblem((p, key, number) => {
      const expected = VERIFY[number]!(p.facts);
      const got = readAnswer(p.answer);
      if (typeof expected === "number") {
        expect(got, `${key} (${JSON.stringify(p.facts)})`).toBe(expected);
      } else {
        expect(pkey(got as P), `${key} (${JSON.stringify(p.facts)})`).toBe(
          pkey(expected),
        );
      }
    });
  });

  it("발문이 facts 가 말하는 다항식을 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const shown = shownPolys(p.content);
      for (const want of SHOWN[number]!(p.facts)) {
        expect(
          shown.has(pkey(want)),
          `${key}: 발문에 ${pkey(want)} 가 없다`,
        ).toBe(true);
        checked += 1;
      }
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1000);
  });
});

describe("고등 공통수학1 항등식과 나머지정리 — 지면", () => {
  it("수는 전부 수식 안에 있다", () => {
    eachProblem((p, key) => {
      expect(bareNumbers(p.content), `${key} 발문`).toEqual([]);
      expect(bareNumbers(p.answer), `${key} 정답`).toEqual([]);
      expect(bareNumbers(p.solution), `${key} 해설`).toEqual([]);
      for (const d of p.distractors ?? []) {
        expect(bareNumbers(d), `${key} 오답`).toEqual([]);
      }
    });
  });

  it("지면 냄새가 없다 — 값은 맞고 보기만 흉한 것", () => {
    eachProblem((p, key) => {
      expect(pageSmells(p.content), `${key} 발문`).toEqual([]);
      expect(pageSmells(p.answer), `${key} 정답`).toEqual([]);
      expect(pageSmells(p.solution), `${key} 해설`).toEqual([]);
      for (const d of p.distractors ?? []) {
        expect(pageSmells(d), `${key} 오답`).toEqual([]);
      }
    });
  });

  it("수식 뒤 조사가 읽기와 맞는다 — 을/를·이/가 와 (으)로", () => {
    eachProblem((p, key) => {
      expect(josaMismatches(p.content), `${key} 발문`).toEqual([]);
      expect(josaMismatches(p.solution), `${key} 해설`).toEqual([]);
      expect(roMismatches(p.content), `${key} 발문 (으)로`).toEqual([]);
      expect(roMismatches(p.solution), `${key} 해설 (으)로`).toEqual([]);
    });
  });

  it("해설은 여러 줄이고 마지막 줄이 답을 말한다", () => {
    eachProblem((p, key) => {
      const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
      expect(lines.length, `${key} 해설 줄 수`).toBeGreaterThanOrEqual(2);
      const body = /^\$(.+)\$$/.exec(p.answer.trim())![1]!;
      expect(
        lines[lines.length - 1]!.includes(body),
        `${key} 해설 끝에 답이 없다: ${lines[lines.length - 1]}`,
      ).toBe(true);
    });
  });
});

describe("고등 공통수학1 항등식과 나머지정리 — 난이도와 형식", () => {
  it("유형이 내는 칸은 색인의 검은 표가 허락한 것뿐이고, 가장 많은 칸을 실제로 낸다", () => {
    for (const entry of H1_IDENTITY) {
      const levels = rowOf(entry.rpmType).levels;
      const allowed = tiersAllowedBy(levels);
      const modal = modalTiers(levels);
      const seen = new Set<string>();
      for (const seed of SEEDS) {
        for (let v = 0; v < VARIANTS; v += 1) {
          seen.add(generateHighProblem(entry.key, seed, v).difficulty);
        }
      }
      for (const t of seen) {
        expect(
          allowed.has(t),
          `${entry.key}: 표 ${JSON.stringify(levels)} 가 허락하지 않는 칸 ${t}`,
        ).toBe(true);
      }
      expect(seen.has("기본"), `${entry.key}: 대표문제 꼴(기본)이 없다`).toBe(
        true,
      );
      expect(
        [...modal].some((t) => seen.has(t)),
        `${entry.key}: 표에서 가장 많은 칸(${[...modal].join(",")})을 안 낸다`,
      ).toBe(true);
    }
  });

  it("변형을 세 벌 뽑을 수 있고, 변형마다 객관식이 나온다", () => {
    for (const entry of H1_IDENTITY) {
      expect(() => generateHighSet(entry.key, 20260913, 3)).not.toThrow();
      const got = expandFamily((v) => {
        const p = generateHighProblem(entry.key, 20260913, v);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey: `high:${entry.key}`,
          problemType: "계산",
          distractors: p.distractors,
        };
      }, 3);
      expect(got.skippedMcq, `${entry.key}: ${got.reasons.join(" / ")}`).toBe(
        0,
      );
      expect(
        got.items.filter((i) => i.questionType === "객관식"),
        entry.key,
      ).toHaveLength(3);
    }
  });

  it("생성기가 낸 오답은 넷이고 정답과 겹치지 않는다", () => {
    let withDistractors = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      withDistractors += 1;
      expect(p.distractors, key).toHaveLength(4);
      expect(new Set([p.answer, ...p.distractors]).size, key).toBe(5);
      for (const d of p.distractors) {
        const inner = /^\$(.+)\$$/.exec(d)?.[1];
        expect(inner && parsePolyTex(inner) !== null, `${key} 오답: ${d}`).toBe(
          true,
        );
      }
    });
    expect(
      withDistractors,
      "오답을 내는 꼴이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(0);
  });
});

/**
 * 2026-10-08 적재 전 관문(`scripts/qa/highLoadGate.ts`)이 찾은 것 — **값은 맞는데 답이 발문에 그대로 적힌 판**.
 * 값 검산(`VERIFY`)은 답이 맞아 못 보고, 지면 대조(`SHOWN`)는 «있어야 할 식이 있나»만 본다.
 * 꼴마다 «그대로 적히는 조건»을 facts 로 직접 대고, 분모(그 꼴이 실제로 몇 판 돌았나)를 같이 센다.
 */
describe("고등 공통수학1 항등식과 나머지정리 — 답이 발문에 그대로 있지 않다", () => {
  const SWEEP = Array.from({ length: 300 }, (_, i) => i + 1);
  const modeRuns = (number: string, mode: number): HighProblem[] =>
    SWEEP.map((seed) =>
      generateHighProblem(`${BOOK}|${MINOR}|${number}`, seed, 0),
    ).filter((p) => p.facts.mode === mode);

  it("07 꼴 0: 값을 묻는 점이 나누는 일차식의 근이 아니다 — 근이면 답이 주어진 나머지다", () => {
    const runs = modeRuns("07", 0);
    expect(runs.length, "07 꼴 0 이 돈 판").toBeGreaterThan(80);
    for (const p of runs) {
      const { u, v, t, P, Q } = p.facts;
      expect([u, v], `${p.content}`).not.toContain(t);
      expect([P, Q], `답 ${p.answer} — ${p.content}`).not.toContain(
        readAnswer(p.answer),
      );
    }
  });

  it("07 꼴 1: 주어진 두 나머지 어느 것도 답과 같은 식이 아니다 — 기울기가 같으면 같은 직선이다", () => {
    const runs = modeRuns("07", 1);
    expect(runs.length, "07 꼴 1 이 돈 판").toBeGreaterThan(80);
    for (const p of runs) {
      const { m, al, gm } = p.facts;
      expect([al, gm], `${p.content}`).not.toContain(m);
      const body = /^\$(.+)\$$/.exec(p.answer.trim())![1]!;
      expect(
        shownPolys(p.content).has(pkey(parsePolyTex(body)!)),
        `답 ${p.answer} 가 발문에 있다 — ${p.content}`,
      ).toBe(false);
    }
  });

  it("08 꼴 0: 값을 묻는 점이 나누는 일차식의 근이 아니다", () => {
    const runs = modeRuns("08", 0);
    expect(runs.length, "08 꼴 0 이 돈 판").toBeGreaterThan(50);
    for (const p of runs) expect(p.facts.w, `${p.content}`).not.toBe(p.facts.t);
  });
});
