/**
 * 판정형 **픽스처 등록부** — 배선 시험이 살아 있는 등록부(0단계에서는 비어 있다)에 기대지 않게.
 *
 * 꼴은 일부러 단순하다 — 정수 두 수의 덧셈 `$a+b=c$`. 다시 재는 함수(`truthOf`)는 지면 글을
 * 정규식으로 읽어 따로 더한다(생성기의 값을 다시 쓰지 않는다).
 */
import { intBetween } from "@/lib/elementary/rng";
import type {
  JudgeBody,
  JudgeDefinition,
  JudgeOption,
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
