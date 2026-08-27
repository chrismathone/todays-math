import { describe, expect, it } from "vitest";

import { M1EXTRA_TYPES } from "../../lib/middle/m1Extra";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function valuesFromStemAndLeaf(content: string): number[] {
  const values: number[] = [];
  for (const line of content.split("\n")) {
    const match = line.match(/^(\d+) \|(?: (\d+(?: \d+)*))?$/);
    if (!match) continue;
    const stem = Number(match[1]);
    for (const leaf of (match[2] ?? "").split(" ").filter(Boolean)) {
      values.push(stem * 10 + Number(leaf));
    }
  }
  return values;
}

function numericAnswer(answer: string): number {
  const match = answer.match(/-?\d+(?:\.\d+)?/);
  if (!match) throw new Error(`숫자 정답을 찾을 수 없음: ${answer}`);
  return Number(match[0]);
}

const stemLeafExpected: Record<
  string,
  (content: string, values: number[]) => number
> = {
  "20": (content, values) => {
    const stem = Number(content.match(/십의 자리 숫자가 \$(\d+)\$/)?.[1]);
    return values.filter((value) => Math.floor(value / 10) === stem).length;
  },
  "21": (_content, values) => values.length,
  "22": (_content, values) => Math.max(...values) - Math.min(...values),
  "23": (_content, values) =>
    values.reduce((sum, value) => sum + value, 0) / values.length,
  "24": (_content, values) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!,
  "25": (_content, values) => {
    const counts = new Map<number, number>();
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  },
  "26": (content, values) => {
    const threshold = Number(content.match(/\$(\d+)\$ 이상/)?.[1]);
    return values.filter((value) => value >= threshold).length;
  },
  "27": (content, values) => {
    const bounds = content.match(/\$(\d+)\$ 이상 \$(\d+)\$ 이하/);
    const low = Number(bounds?.[1]);
    const high = Number(bounds?.[2]);
    return values.filter((value) => value >= low && value <= high).length;
  },
  "28": (_content, values) => {
    const odd = values.filter((value) => value % 2 !== 0).length;
    return Math.abs(odd - (values.length - odd));
  },
};

describe("갈래 A 중등 유형 값 검산", () => {
  it.each(Object.keys(stemLeafExpected))(
    "줄기와 잎 그림 유형 %s",
    (rpmType) => {
      const entry = M1EXTRA_TYPES.find(
        (candidate) =>
          candidate.unitSection === "줄기와 잎 그림" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();

      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        const values = valuesFromStemAndLeaf(problem.content);
        expect(values.length).toBeGreaterThan(0);
        expect(numericAnswer(problem.answer)).toBe(
          stemLeafExpected[rpmType]!(problem.content, values),
        );
      }
    },
  );
});
