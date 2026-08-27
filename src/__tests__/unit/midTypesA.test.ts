import { describe, expect, it } from "vitest";

import { M1EXTRA_TYPES } from "../../lib/middle/m1Extra";
import { M2_SYSTEM_APPLY } from "../../lib/middle/m2SystemApply";

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

function frequencyRows(
  content: string,
): Array<{ low: number; high: number; frequency: number }> {
  return content
    .split("\n")
    .map((line) => line.match(/^(\d+) 이상 (\d+) 미만 \| (\d+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      low: Number(match[1]),
      high: Number(match[2]),
      frequency: Number(match[3]),
    }));
}

function histogramRows(
  content: string,
): Array<{ low: number; high: number; frequency: number }> {
  return content
    .split("\n")
    .map((line) => line.match(/^(\d+)~(\d+) \| (■+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      low: Number(match[1]),
      high: Number(match[2]),
      frequency: match[3]!.length,
    }));
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

  const frequencyExpected: Record<
    string,
    (content: string, rows: ReturnType<typeof frequencyRows>) => number
  > = {
    "29": (_content, rows) => rows.reduce((sum, row) => sum + row.frequency, 0),
    "30": (content, rows) => {
      const low = Number(content.match(/\$(\d+)\$ 이상/)?.[1]);
      return rows.find((row) => row.low === low)!.frequency;
    },
    "31": (_content, rows) =>
      rows.reduce((best, row) => (row.frequency > best.frequency ? row : best))
        .low,
    "32": (_content, rows) => Math.max(...rows.map((row) => row.frequency)),
    "33": (_content, rows) => rows[0]!.high - rows[0]!.low,
    "34": (content, rows) => {
      const low = Number(content.match(/\$(\d+)\$ 이상/)?.[1]);
      const row = rows.find((candidate) => candidate.low === low)!;
      return (row.low + row.high) / 2;
    },
    "35": (content, rows) => {
      const boundary = Number(content.match(/\$(\d+)\$ 미만/)?.[1]);
      return rows
        .filter((row) => row.high <= boundary)
        .reduce((sum, row) => sum + row.frequency, 0);
    },
    "36": (_content, rows) => {
      const frequencies = rows.map((row) => row.frequency);
      return Math.max(...frequencies) - Math.min(...frequencies);
    },
  };

  it.each(Object.keys(frequencyExpected))("도수분포표 유형 %s", (rpmType) => {
    const entry = M1EXTRA_TYPES.find(
      (candidate) =>
        candidate.unitSection === "도수분포표" && candidate.rpmType === rpmType,
    );
    expect(entry).toBeDefined();
    for (const seed of [17, 203, 991]) {
      const problem = entry!.handler(seeded(seed));
      const rows = frequencyRows(problem.content);
      expect(rows.length).toBeGreaterThan(0);
      expect(numericAnswer(problem.answer)).toBe(
        frequencyExpected[rpmType]!(problem.content, rows),
      );
    }
  });

  const coordinateExpected: Record<
    string,
    (x: number, y: number, content: string) => number
  > = {
    "12": (x) => x,
    "13": (_x, y) => y,
    "14": (x, y) => (x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3),
    "15": (_x, _y, content) => -Number(content.match(/a\+(-?\d+)/)?.[1]),
    "16": (_x, _y, content) => -Number(content.match(/a\+(-?\d+)/)?.[1]),
    "17": (_x, y) => Math.abs(y),
    "18": (x) => Math.abs(x),
    "19": (x, y) => -x - y,
  };

  it.each(Object.keys(coordinateExpected))(
    "순서쌍과 좌표평면 기본 유형 %s",
    (rpmType) => {
      const entry = M1EXTRA_TYPES.find(
        (candidate) =>
          candidate.unitSection === "순서쌍과 좌표평면(기본)" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        const point = problem.content.match(/\$[A-Z]\((-?\d+), (-?\d+)\)\$/);
        const x = Number(point?.[1] ?? 0);
        const y = Number(point?.[2] ?? 0);
        expect(numericAnswer(problem.answer)).toBe(
          coordinateExpected[rpmType]!(x, y, problem.content),
        );
      }
    },
  );

  const histogramExpected: Record<
    string,
    (content: string, rows: ReturnType<typeof histogramRows>) => number
  > = {
    "37": (_content, rows) => rows.reduce((sum, row) => sum + row.frequency, 0),
    "38": (content, rows) => {
      const low = Number(content.match(/\$(\d+)\$ 이상/)?.[1]);
      return rows.find((row) => row.low === low)!.frequency;
    },
    "39": (_content, rows) =>
      rows.reduce((best, row) => (row.frequency > best.frequency ? row : best))
        .low,
    "40": (_content, rows) => rows[0]!.high - rows[0]!.low,
    "41": (content, rows) => {
      const boundary = Number(content.match(/\$(\d+)\$ 미만/)?.[1]);
      return rows
        .filter((row) => row.high <= boundary)
        .reduce((sum, row) => sum + row.frequency, 0);
    },
    "42": (_content, rows) => {
      const frequencies = rows.map((row) => row.frequency);
      return Math.max(...frequencies) - Math.min(...frequencies);
    },
    "43": (content, rows) => {
      const range = content.match(/\$(\d+)\$ 이상 \$(\d+)\$ 미만/);
      const low = Number(range?.[1]);
      const high = Number(range?.[2]);
      return rows
        .filter((row) => row.low >= low && row.high <= high)
        .reduce((sum, row) => sum + row.frequency, 0);
    },
  };

  it.each(Object.keys(histogramExpected))("히스토그램 유형 %s", (rpmType) => {
    const entry = M1EXTRA_TYPES.find(
      (candidate) =>
        candidate.unitSection === "히스토그램" && candidate.rpmType === rpmType,
    );
    expect(entry).toBeDefined();
    for (const seed of [17, 203, 991]) {
      const problem = entry!.handler(seeded(seed));
      const rows = histogramRows(problem.content);
      expect(rows.length).toBeGreaterThan(0);
      expect(numericAnswer(problem.answer)).toBe(
        histogramExpected[rpmType]!(problem.content, rows),
      );
    }
  });

  it.each(["19A", "20A", "21A", "22A", "23A", "24A", "25A", "26A"])(
    "해가 특수한 연립방정식 유형 %s",
    (rpmType) => {
      const entry = M2_SYSTEM_APPLY.find(
        (candidate) =>
          candidate.unitSection === "해가 특수한 연립방정식" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        const table = problem.content.match(
          /계수표: (a|\d+), (a|\d+), (\d+) \/ (a|\d+), (a|\d+), (\d+)/,
        );
        expect(table).not.toBeNull();
        const cells = table!
          .slice(1)
          .map((value) => (value === "a" ? null : Number(value)));
        const [a1, b1, _c1, a2, b2] = cells;
        let expected: number;
        if (a1 === null) expected = a2! / (b2! / b1!);
        else if (b1 === null) expected = b2! / (a2! / a1);
        else if (a2 === null) expected = a1 * (b2! / b1);
        else expected = b1 * (a2 / a1);
        expect(numericAnswer(problem.answer)).toBe(expected);
      }
    },
  );
});
