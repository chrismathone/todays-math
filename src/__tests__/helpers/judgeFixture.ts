/**
 * 판정형 **픽스처 등록부** — 배선 시험이 살아 있는 등록부(0단계에서는 비어 있다)에 기대지 않게.
 *
 * 꼴은 일부러 단순하다 — 정수 두 수의 덧셈 `$a+b=c$`. 다시 재는 함수(`truthOf`)는 지면 글을
 * 정규식으로 읽어 따로 더한다(생성기의 값을 다시 쓰지 않는다).
 */
import { intBetween } from "@/lib/elementary/rng";
import type {
  CompareAsk,
  CompareBody,
  CompareJudgeDefinition,
  CompareOption,
  JudgeBody,
  JudgeDefinition,
  JudgeOption,
  JudgeValue,
} from "@/lib/middle/judge/contract";

const EQ = /^\$(-?\d+)\+(-?\d+)=(-?\d+)\$$/;

export function fixtureTruth(text: string): boolean | null {
  const m = EQ.exec(text.trim());
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) === Number(m[3]);
}

function option(a: number, b: number, shown: number): JudgeOption {
  const ok = a + b === shown;
  return {
    text: `$${a}+${b}=${shown}$`,
    claimedTrue: ok,
    // 해설 조각에 그 보기의 식을 다시 적는다 — 시험이 «해설이 보기 차례를 따라가나»를 이것으로 잰다.
    brief: `$${a}+${b}=${a + b}$`,
    detail: ok
      ? `$${a}+${b}=${a + b}$이므로 옳다.`
      : `$${a}+${b}=${a + b}$이므로 옳지 않다(하나 더함).`,
    why: ok ? null : "하나 더함",
  };
}

export function fixtureDefinition(
  over: Partial<JudgeDefinition> = {},
): JudgeDefinition {
  return {
    grade: "중1",
    unitSection: "유리수의 덧셈과 뺄셈",
    familyId: "fixture-add",
    title: "픽스처 — 정수 덧셈 판정",
    asks: ["옳지 않은 것", "옳은 것"],
    sources: ["1-1|정수와 유리수의 계산|01"],
    difficulty: "기본",
    difficultyBasis: "픽스처",
    ruleVersion: 1,
    generate: (rng, ask): JudgeBody => {
      const used = new Set<string>();
      const options: JudgeOption[] = [];
      while (options.length < 5) {
        const a = intBetween(rng, 1, 40);
        const b = intBetween(rng, 1, 40);
        if (used.has(`${a}+${b}`)) continue;
        used.add(`${a}+${b}`);
        // 첫째가 «다른 하나» — 섞기는 등록부가 한다.
        const odd = options.length === 0;
        const wantTrue = ask === "옳지 않은 것" ? !odd : odd;
        options.push(option(a, b, wantTrue ? a + b : a + b + 1));
      }
      return {
        lead:
          ask === "옳지 않은 것"
            ? "다음 중 계산이 옳지 않은 것은?"
            : "다음 중 계산이 옳은 것은?",
        briefLead: "계산하면",
        options,
        facts: {},
      };
    },
    truthOf: fixtureTruth,
    ...over,
  };
}

// ── 비교 문형 픽스처 (2026-10-08 엔진 보강 2단계) ─────────────────────────────────

const SUM = /^\$(-?\d+)\+(-?\d+)\$$/;
const INT = /^\$(-?\d+)\$$/;

/** 지면 글 `$a+b$`(또는 값 하나 `$c$`)를 **따로** 읽어 더한다 — 생성기의 값을 다시 쓰지 않는다. */
export function compareFixtureValue(text: string): number | null {
  const t = text.trim();
  const s = SUM.exec(t);
  if (s) return Number(s[1]) + Number(s[2]);
  const i = INT.exec(t);
  return i ? Number(i[1]) : null;
}

const asValue = (v: number): JudgeValue => ({ n: BigInt(v), d: BigInt(1) });

/** 비교 문형 보기 조각 — 시험이 주장 · 글 · 해설을 따로 흔들 수 있게 낱개로 연다. */
export function compareOption(
  a: number,
  b: number,
  over: Partial<CompareOption> = {},
): CompareOption {
  return {
    text: `$${a}+${b}$`,
    claimed: asValue(a + b),
    brief: `$${a + b}$`,
    work: `더하면 $${a}+${b}=${a + b}$`,
    ...over,
  };
}

export const COMPARE_LEAD: Record<CompareAsk, string> = {
  "나머지 넷과 다른 하나": "다음 중 계산 결과가 나머지 넷과 다른 하나는?",
  "가장 큰 것": "다음 중 계산 결과가 가장 큰 것은?",
  "가장 작은 것": "다음 중 계산 결과가 가장 작은 것은?",
};

/** 정수 두 수의 덧셈 `$a+b$` 다섯 — 4+1 은 목표값을 먼저 정해 역산하고, 극값은 다섯 합이 서로 다르게. */
export function compareFixtureDefinition(
  over: Partial<CompareJudgeDefinition> = {},
): CompareJudgeDefinition {
  return {
    form: "compare",
    grade: "중1",
    unitSection: "유리수의 덧셈과 뺄셈",
    familyId: "fixture-compare",
    title: "픽스처 — 정수 덧셈 비교",
    asks: ["나머지 넷과 다른 하나", "가장 큰 것", "가장 작은 것"],
    sources: ["1-1|정수와 유리수의 계산|01"],
    difficulty: "기본",
    difficultyBasis: "픽스처",
    ruleVersion: 1,
    generate: (rng, ask): CompareBody => {
      const options: CompareOption[] = [];
      const lefts = new Set<number>();
      if (ask === "나머지 넷과 다른 하나") {
        const v = intBetween(rng, 10, 40);
        while (options.length < 5) {
          const a = intBetween(rng, 1, 9);
          if (lefts.has(a)) continue;
          lefts.add(a);
          // 첫째가 «다른 하나» — 섞기는 등록부가 한다.
          options.push(
            compareOption(a, (options.length === 0 ? v + 1 : v) - a),
          );
        }
      } else {
        const sums = new Set<number>();
        while (options.length < 5) {
          const a = intBetween(rng, 1, 9);
          const b = intBetween(rng, 1, 40);
          if (lefts.has(a) || sums.has(a + b)) continue;
          lefts.add(a);
          sums.add(a + b);
          options.push(compareOption(a, b));
        }
      }
      return {
        lead: COMPARE_LEAD[ask],
        briefLead: "계산하면",
        options,
        facts: {},
      };
    },
    valueOf: (text) => {
      const v = compareFixtureValue(text);
      return v === null ? null : asValue(v);
    },
    ...over,
  };
}
