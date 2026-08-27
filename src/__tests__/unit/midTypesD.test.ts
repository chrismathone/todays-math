import { describe, expect, it } from "vitest";

import { M1_BOOK1 } from "@/lib/middle/m1Book1";
import { M1_LINEAR_APPLY } from "@/lib/middle/m1LinearApply";
import { M1_NUM } from "@/lib/middle/m1Num";

const FIRST_FIVE = [
  { entries: M1_LINEAR_APPLY, section: "일차방정식의 활용(비율, 시계, 규칙)" },
  {
    entries: M1_LINEAR_APPLY,
    section: "일차방정식의 활용(증가와 감소, 원가와 정가)",
  },
  { entries: M1_BOOK1, section: "일차식의 뜻Ⅰ" },
  { entries: M1_NUM, section: "공약수와 최대공약수" },
  { entries: M1_BOOK1, section: "소수와 거듭제곱" },
] as const;

function rngFrom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function answerNumber(answer: string): number {
  const matched = answer.match(/-?\d+(?:\.\d+)?/);
  if (!matched) throw new Error(`숫자 정답을 찾지 못함: ${answer}`);
  return Number(matched[0]);
}

const RATIO_CHECKS: Record<string, (content: string) => number> = {
  "23": (content) => {
    const [, a, b, part] = content.match(
      /비가 \$(\d+):(\d+)\$.*남학생이 \$(\d+)\$/,
    )!;
    return (Number(part) / Number(a)) * (Number(a) + Number(b));
  },
  "24": (content) => {
    const [, a, b, added] = content.match(
      /비가 \$(\d+):(\d+)\$.*공을 \$(\d+)\$개/,
    )!;
    return (Number(a) * Number(added)) / (Number(b) - Number(a));
  },
  "25": (content) => {
    const [, rate, used] = content.match(
      /\$(\d+)\\%\$.*\$(\d+)\\,\\mathrm\{kg\}\$/,
    )!;
    return (Number(used) * 100) / Number(rate);
  },
  "26": (content) =>
    Number(content.match(/분침이 \$(\d+)\^\{\\circ\}\$/)![1]) / 6,
  "27": (content) => {
    const [, count, top] = content.match(
      /연속하여 \$(\d+)\$개의 수.*수는 \$(\d+)\$/,
    )!;
    return (Number(count) * (2 * Number(top) + (Number(count) - 1) * 7)) / 2;
  },
  "28": (content) => {
    const [, first, diff, n] = content.match(
      /수 \$(\d+)\$에서.*\$(\d+)\$씩.*\$(\d+)\$번째/,
    )!;
    return Number(first) + (Number(n) - 1) * Number(diff);
  },
  "29": (content) =>
    (Number(content.match(/성냥개비 \$(\d+)\$개로/)![1]) - 1) / 3,
  "30": (content) => {
    const [, a, b, turnsA] = content.match(
      /각각 \$(\d+)\$개, \$(\d+)\$개.*가 \$(\d+)\$바퀴/,
    )!;
    return (Number(a) * Number(turnsA)) / Number(b);
  },
};

const CHANGE_CHECKS: Record<string, (content: string) => number> = {
  "31": (content) => {
    const [, rate, after] = content.match(
      /\$(\d+)\\%\$ 증가하여.*\$(\d+)\$명/,
    )!;
    return (Number(after) * 100) / (100 + Number(rate));
  },
  "32": (content) => {
    const [, rate, after] = content.match(
      /\$(\d+)\\%\$ 감소하여.*\$(\d+)\$개/,
    )!;
    return (Number(after) * 100) / (100 - Number(rate));
  },
  "33": (content) => {
    const [, rate, sale] = content.match(/원가의 \$(\d+)\\%\$.*\$(\d+)\$원/)!;
    return (Number(sale) * 100) / (100 + Number(rate));
  },
  "34": (content) => {
    const [, rate, sale] = content.match(/\$(\d+)\\%\$ 할인하여 \$(\d+)\$원/)!;
    return (Number(sale) * 100) / (100 - Number(rate));
  },
  "35": (content) => {
    const [, up, down, after] = content.match(
      /\$(\d+)\\%\$ 증가.*\$(\d+)\\%\$ 감소하여 \$(\d+)\$개/,
    )!;
    return (
      (Number(after) * 10000) / ((100 + Number(up)) * (100 - Number(down)))
    );
  },
  "36": (content) => {
    const [, rate, included] = content.match(
      /\$(\d+)\\%\$의 세금.*\$(\d+)\$원/,
    )!;
    return (Number(included) * 100) / (100 + Number(rate));
  },
  "37": (content) => {
    const [, rate, good] = content.match(/\$(\d+)\\%\$가 불량품.*\$(\d+)\$개/)!;
    return (Number(good) * 100) / (100 - Number(rate));
  },
  "38": (content) => {
    const [, first, second, left] = content.match(
      /\$(\d+)\\%\$를 교재비로.*\$(\d+)\\%\$를 준비물비로.*\$(\d+)\$원/,
    )!;
    return (Number(left) * 100) / (100 - Number(first) - Number(second));
  },
};

describe("중등 유형 갈래 D", () => {
  it.each(FIRST_FIVE)(
    "$section 소단원은 서로 다른 유형 10개를 갖는다",
    ({ entries, section }) => {
      const selected = entries.filter((entry) => entry.unitSection === section);
      expect(selected).toHaveLength(10);
      expect(new Set(selected.map((entry) => entry.key)).size).toBe(10);
    },
  );

  it.each(Object.keys(RATIO_CHECKS))(
    "비율·시계·규칙 유형 %s의 값을 발문에서 다시 계산한다",
    (rpmType) => {
      const entry = M1_LINEAR_APPLY.find(
        (candidate) => candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [11, 29, 47]) {
        const problem = entry!.handler(rngFrom(seed));
        expect(answerNumber(problem.answer)).toBe(
          RATIO_CHECKS[rpmType]!(problem.content),
        );
      }
    },
  );

  it.each(Object.keys(CHANGE_CHECKS))(
    "증가·감소·가격 유형 %s의 값을 발문에서 다시 계산한다",
    (rpmType) => {
      const entry = M1_LINEAR_APPLY.find(
        (candidate) => candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [13, 31, 53]) {
        const problem = entry!.handler(rngFrom(seed));
        expect(answerNumber(problem.answer)).toBe(
          CHANGE_CHECKS[rpmType]!(problem.content),
        );
      }
    },
  );
});
