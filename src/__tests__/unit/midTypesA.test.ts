import { describe, expect, it } from "vitest";

import { M1_BOOK2 } from "../../lib/middle/m1Book2";
import { M1EXTRA_TYPES } from "../../lib/middle/m1Extra";
import { M2_PROB } from "../../lib/middle/m2Prob";
import { M2_SYSTEM } from "../../lib/middle/m2System";
import { M2_SYSTEM_APPLY } from "../../lib/middle/m2SystemApply";
import { M2_QUAD } from "../../lib/middle/m2Quad";
import { M3_TYPES } from "../../lib/middle/m3";
import type { TypeEntry } from "../../lib/middle/types";

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

/** `$\dfrac{n}{d}$` 또는 `$n$` 을 분자·분모로 읽는다. */
function fractionAnswer(answer: string): { n: number; d: number } {
  const frac = answer.match(/\\dfrac\{(-?\d+)\}\{(\d+)\}/);
  if (frac) return { n: Number(frac[1]), d: Number(frac[2]) };
  return { n: numericAnswer(answer), d: 1 };
}

function gcdOf(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function implicitCoefficient(token: string): number {
  if (token === "" || token === "+") return 1;
  if (token === "-") return -1;
  return Number(token);
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

function coordinatePairs(content: string): Array<[number, number]> {
  return [...content.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
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

  const graphExpected: Record<string, (content: string) => number> = {
    "20": (content) =>
      Number(content.match(/좌표가 \$\((-?\d+), (-?\d+)\)\$/)?.[2]),
    "21": (content) => {
      const points = content.match(
        /\$A\((-?\d+), (-?\d+)\)\$, \$B\((-?\d+), (-?\d+)\)\$/,
      );
      return Math.abs(Number(points?.[3]) - Number(points?.[1]));
    },
    "22": (content) => {
      const points = content.match(
        /\$C\((-?\d+), (-?\d+)\)\$, \$D\((-?\d+), (-?\d+)\)\$/,
      );
      return Math.abs(Number(points?.[4]) - Number(points?.[2]));
    },
    "23": (content) => {
      const points = content.match(
        /두 점 \$\((-?\d+), (-?\d+)\)\$, \$\((-?\d+), (-?\d+)\)\$/,
      );
      return Number(points?.[4]) - Number(points?.[2]);
    },
    "24": (content) => {
      const values = content.match(
        /점 \$A\((-?\d+), (-?\d+)\)\$.*\$y\$는 \$(\d+)\$만큼.*\$x\$좌표가 \$(-?\d+)\$/,
      );
      const [x1, y1, slope, x2] = values!.slice(1).map(Number);
      return y1! + slope! * (x2! - x1!);
    },
    "25": (content) => {
      const list = content.match(/차례로 \$([^$]+)\$/)?.[1] ?? "";
      const values = (list.match(/-?\d+/g) ?? []).map(Number);
      return values.slice(1).filter((value, index) => value > values[index]!)
        .length;
    },
  };

  it.each(Object.keys(graphExpected))("그래프의 이해 유형 %s", (rpmType) => {
    const entry = M1EXTRA_TYPES.find(
      (candidate) =>
        candidate.unitSection === "그래프의 이해" &&
        candidate.rpmType === rpmType,
    );
    expect(entry).toBeDefined();
    for (const seed of [17, 203, 991]) {
      const problem = entry!.handler(seeded(seed));
      expect(numericAnswer(problem.answer)).toBe(
        graphExpected[rpmType]!(problem.content),
      );
    }
  });

  const frequencyPolygonExpected: Record<
    string,
    (content: string, points: Array<[number, number]>) => number
  > = {
    "44": (_content, points) =>
      points.reduce((sum, point) => sum + point[1], 0),
    "45": (content, points) => {
      const classValue = Number(content.match(/계급값이 \$(\d+)\$/)?.[1]);
      return points.find((point) => point[0] === classValue)![1];
    },
    "46": (_content, points) =>
      points.reduce((best, point) => (point[1] > best[1] ? point : best))[0],
    "47": (content, points) => {
      const classes = content.match(/계급값이 \$(\d+)\$인 계급과 \$(\d+)\$인/);
      const first = points.find((point) => point[0] === Number(classes?.[1]))!;
      const second = points.find((point) => point[0] === Number(classes?.[2]))!;
      return Math.abs(first[1] - second[1]);
    },
    "48": (content, points) => {
      const boundary = Number(content.match(/\$(\d+)\$ 미만/)?.[1]);
      return points
        .filter((point) => point[0] < boundary)
        .reduce((sum, point) => sum + point[1], 0);
    },
    "49": (_content, points) => {
      const half = points.length / 2;
      return points
        .slice(0, half)
        .filter((point, index) => point[1] > points[index + half]![1]).length;
    },
  };

  it.each(Object.keys(frequencyPolygonExpected))(
    "도수분포다각형 유형 %s",
    (rpmType) => {
      const entry = M1EXTRA_TYPES.find(
        (candidate) =>
          candidate.unitSection === "도수분포다각형" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        const points = coordinatePairs(problem.content);
        expect(points.length).toBeGreaterThan(0);
        expect(numericAnswer(problem.answer)).toBe(
          frequencyPolygonExpected[rpmType]!(problem.content, points),
        );
      }
    },
  );

  const numberAverageAgeExpected: Record<string, (content: string) => number> =
    {
      "01A": (content) => {
        const values = content.match(/합은 \$(\d+)\$이고 차는 \$(\d+)\$/);
        return (Number(values?.[1]) + Number(values?.[2])) / 2;
      },
      "02A": (content) => {
        const values = content.match(
          /합은 \$(\d+)\$이다.*\$(\d+)\$배보다 \$(\d+)\$만큼/,
        );
        return (
          (Number(values?.[1]) - Number(values?.[3])) /
          (Number(values?.[2]) + 1)
        );
      },
      "03A": (content) => {
        const values = content.match(
          /합은 \$(\d+)\$이고.*\$(\d+)\$배와.*\$(\d+)\$배의 합은 \$(\d+)\$/,
        );
        const [sum, a, b, weighted] = values!.slice(1).map(Number);
        return (b! * sum! - weighted!) / (b! - a!);
      },
      "04A": (content) => {
        const values = content.match(
          /평균 점수는 \$(\d+)\$점이다.*보다 \$(\d+)\$점 높을/,
        );
        return Number(values?.[1]) + Number(values?.[2]) / 2;
      },
      "05A": (content) => {
        const values = content.match(
          /\$(\d+)\$점인.*\$(\d+)\$점인.*모두 \$(\d+)\$명이고, 전체 평균은 \$(\d+)\$점/,
        );
        const [averageA, averageB, total, averageAll] = values!
          .slice(1)
          .map(Number);
        return ((averageAll! - averageB!) * total!) / (averageA! - averageB!);
      },
      "06A": (content) => {
        const values = content.match(
          /나이 차는 \$(\d+)\$세이다. \$(\d+)\$년 후.*\$(\d+)\$배/,
        );
        const [difference, years, multiple] = values!.slice(1).map(Number);
        return (difference! - (multiple! - 1) * years!) / (multiple! - 1);
      },
      "07A": (content) => {
        const values = content.match(
          /합은 \$(\d+)\$세이다. \$(\d+)\$년 전.*\$(\d+)\$배보다 \$(\d+)\$세/,
        );
        const [sum, years, multiple, extra] = values!.slice(1).map(Number);
        const younger =
          (sum! + (multiple! - 1) * years! - extra!) / (multiple! + 1);
        return sum! - younger;
      },
    };

  it.each(Object.keys(numberAverageAgeExpected))(
    "연립방정식의 활용(수, 평균, 나이) 유형 %s",
    (rpmType) => {
      const entry = M2_SYSTEM.find(
        (candidate) =>
          candidate.unitSection === "연립방정식의 활용(수, 평균, 나이)" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        expect(numericAnswer(problem.answer)).toBe(
          numberAverageAgeExpected[rpmType]!(problem.content),
        );
      }
    },
  );

  const twoVariableExpected: Record<string, (content: string) => number> = {
    "01A": (content) => {
      const values = content.match(
        /\$x=(-?\d+)\$, \$y=(-?\d+)\$.*\$(-?\d+)x([+-]\d+)y\$/,
      );
      const [x, y, a, b] = values!.slice(1).map(Number);
      return a! * x! + b! * y!;
    },
    "02A": (content) => {
      const values = content.match(
        /\$\((-?\d+), y\)\$.*\$(-?\d+)x([+-]\d+)y=(-?\d+)\$/,
      );
      const [x, a, b, c] = values!.slice(1).map(Number);
      return (c! - a! * x!) / b!;
    },
    "03A": (content) => {
      const values = content.match(
        /\$\((-?\d+), (-?\d+)\)\$.*\$ax([+-]\d*)y=(-?\d+)\$/,
      );
      const x = Number(values?.[1]);
      const y = Number(values?.[2]);
      const b = implicitCoefficient(values?.[3] ?? "");
      const c = Number(values?.[4]);
      return (c - b * y) / x;
    },
    "04A": (content) => {
      const values = content.match(/\$(\d+)x\+(\d+)y=(\d+)\$/);
      const [a, b, c] = values!.slice(1).map(Number);
      let count = 0;
      for (let x = 0; a! * x <= c!; x += 1) {
        if ((c! - a! * x) % b! === 0) count += 1;
      }
      return count;
    },
    "05A": (content) => {
      const first = content.match(/ax([+-]\d*)y=(-?\d+)/);
      const second = content.match(/([+-]?\d*)x\+by=(-?\d+)/);
      const solution = content.match(/해가 \$x=(-?\d+)\$, \$y=(-?\d+)\$/);
      const x = Number(solution?.[1]);
      const y = Number(solution?.[2]);
      const q = implicitCoefficient(first?.[1] ?? "");
      const c1 = Number(first?.[2]);
      const r = implicitCoefficient(second?.[1] ?? "");
      const c2 = Number(second?.[2]);
      return (c1 - q * y) / x - (c2 - r * x) / y;
    },
    "06A": (content) => {
      const values = content.match(
        /\$\(x, (-?\d+)\)\$.*\$(-?\d+)x([+-]\d+)y=(-?\d+)\$/,
      );
      const [y, a, b, c] = values!.slice(1).map(Number);
      return (c! - b! * y!) / a!;
    },
    "07A": (content) => {
      const values = content.match(
        /\$\((-?\d+), (-?\d+)\)\$.*\$ax\+by=(-?\d+)\$.*\$a-b=(-?\d+)\$/,
      );
      const [x, y, c, difference] = values!.slice(1).map(Number);
      const b = (c! - x! * difference!) / (x! + y!);
      return 2 * b + difference!;
    },
  };

  it.each(Object.keys(twoVariableExpected))(
    "미지수가 2개인 연립일차방정식 유형 %s",
    (rpmType) => {
      const entry = M2_SYSTEM.find(
        (candidate) =>
          candidate.unitSection === "미지수가 2개인 연립일차방정식" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        expect(numericAnswer(problem.answer)).toBe(
          twoVariableExpected[rpmType]!(problem.content),
        );
      }
    },
  );

  const systemApplyExpected: Record<string, (content: string) => number> = {
    "12A": (content) => {
      const values = content.match(/x\+y=(-?\d+).*x-y=(-?\d+)/);
      return (Number(values?.[1]) + Number(values?.[2])) / 2;
    },
    "13A": (content) => {
      const values = content.match(/x\+y=(-?\d+).*2x\+y=(-?\d+)/);
      return 2 * Number(values?.[1]) - Number(values?.[2]);
    },
    "14A": (content) => {
      const values = content.match(
        /kx-y=(-?\d+).*해가 \$x=(-?\d+)\$, \$y=(-?\d+)\$/,
      );
      return (Number(values?.[1]) + Number(values?.[3])) / Number(values?.[2]);
    },
    "15A": (content) => {
      const values = content.match(
        /x\+y=(-?\d+).*?([+-]?\d+)x-y=(-?\d+).*ax\+y=(-?\d+)/,
      );
      const [sum, p, c, target] = values!.slice(1).map(Number);
      const x = (sum! + c!) / (p! + 1);
      const y = sum! - x;
      return (target! - y) / x;
    },
    "16A": (content) => {
      const values = content.match(
        /ax\+y=(-?\d+).*x\+by=(-?\d+).*해가 \$x=(-?\d+)\$, \$y=(-?\d+)\$/,
      );
      const [c1, c2, x, y] = values!.slice(1).map(Number);
      return (c1! - y!) / x! + (c2! - x!) / y!;
    },
  };

  it.each(Object.keys(systemApplyExpected))(
    "연립방정식의 풀이의 응용 유형 %s",
    (rpmType) => {
      const entry = M2_SYSTEM_APPLY.find(
        (candidate) =>
          candidate.unitSection === "연립방정식의 풀이의 응용" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        expect(numericAnswer(problem.answer)).toBe(
          systemApplyExpected[rpmType]!(problem.content),
        );
      }
    },
  );

  const priceCountGeometryExpected: Record<
    string,
    (content: string) => number
  > = {
    "27A": (content) => {
      const [adultPrice, studentPrice, total, revenue] = (
        content.match(/\d+/g) ?? []
      )
        .slice(0, 4)
        .map(Number);
      return (
        (revenue! - studentPrice! * total!) / (adultPrice! - studentPrice!)
      );
    },
    "28A": (content) => {
      const [pencilPrice, notePrice, total, cost] = (
        content.match(/\d+/g) ?? []
      )
        .slice(0, 4)
        .map(Number);
      return (cost! - pencilPrice! * total!) / (notePrice! - pencilPrice!);
    },
    "29A": (content) => {
      const values = content.match(/둘레의 길이는 \$(\d+).*세로보다 \$(\d+)/);
      return (Number(values?.[1]) / 2 - Number(values?.[2])) / 2;
    },
    "30A": (content) => {
      const [total, increase, decrease, changed] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return (
        (100 * changed! - (100 - decrease!) * total!) / (increase! + decrease!)
      );
    },
    "31A": (content) => {
      const [low, high, total, value] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return (value! - low! * total!) / (high! - low!);
    },
  };

  it.each(Object.keys(priceCountGeometryExpected))(
    "연립방정식의 활용(가격, 개수, 증감, 도형) 유형 %s",
    (rpmType) => {
      const entry = M2_SYSTEM.find(
        (candidate) =>
          candidate.unitSection ===
            "연립방정식의 활용(가격, 개수, 증감, 도형)" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        expect(numericAnswer(problem.answer)).toBe(
          priceCountGeometryExpected[rpmType]!(problem.content),
        );
      }
    },
  );

  const concentrationRatioExpected: Record<
    string,
    (content: string) => number
  > = {
    "10A": (content) => {
      const values = content.match(/비는 \$(\d+):(\d+)\$이고.*\$(\d+)\$명/);
      const [first, second, total] = values!.slice(1).map(Number);
      return (first! * total!) / (first! + second!);
    },
    "11A": (content) => {
      const [total, rateA, rateB, defective] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return (100 * defective! - rateB! * total!) / (rateA! - rateB!);
    },
    "12A": (content) => {
      const [low, high, target, total] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return ((target! - low!) * total!) / (high! - low!);
    },
    "13A": (content) => {
      const [percentA, percentB, total, copper] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return (100 * copper! - percentB! * total!) / (percentA! - percentB!);
    },
    "14A": (content) => {
      const [percentA, percentB, target, total] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return ((target! - percentB!) * total!) / (percentA! - percentB!);
    },
    "15A": (content) => {
      const [percentA, percentB, total, copper] = (content.match(/\d+/g) ?? [])
        .slice(0, 4)
        .map(Number);
      return (100 * copper! - percentA! * total!) / (percentB! - percentA!);
    },
  };

  it.each(Object.keys(concentrationRatioExpected))(
    "연립방정식의 활용(농도, 비율, 합금) 유형 %s",
    (rpmType) => {
      const entry = M2_SYSTEM_APPLY.find(
        (candidate) =>
          candidate.unitSection === "연립방정식의 활용(농도, 비율, 합금)" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        expect(numericAnswer(problem.answer)).toBe(
          concentrationRatioExpected[rpmType]!(problem.content),
        );
      }
    },
  );

  const parallelogramConditionExpected: Record<
    string,
    (content: string) => number
  > = {
    "14A": (content) => {
      const values = content.match(/=\$?\((\d+)x\+(\d+)\).*\(x\+(\d+)\)/);
      return (
        (Number(values?.[3]) - Number(values?.[2])) / (Number(values?.[1]) - 1)
      );
    },
    "15A": (content) => {
      const values = content.match(/=\$?\((\d+)x\+(\d+)\).*\(x\+(\d+)\)/);
      return (
        (Number(values?.[3]) - Number(values?.[2])) / (Number(values?.[1]) - 1)
      );
    },
    "16A": (content) => {
      const values = content.match(/=\$?\((\d+)x\+(\d+)\).*\(x\+(\d+)\)/);
      return (
        (Number(values?.[3]) - Number(values?.[2])) / (Number(values?.[1]) - 1)
      );
    },
    "17A": (content) => {
      const values = content.match(/=\$?\((\d+)x\+(\d+)\).*\(x\+(\d+)\)/);
      return (
        (Number(values?.[3]) - Number(values?.[2])) / (Number(values?.[1]) - 1)
      );
    },
    "18A": (content) => 2 * Number(content.match(/AO\}=(\d+)/)?.[1]),
    "19A": (content) => {
      const values = (content.match(/\d+/g) ?? []).map(Number);
      return 2 * (values[0]! + values[1]!);
    },
  };

  it.each(Object.keys(parallelogramConditionExpected))(
    "평행사변형이 되는 조건 유형 %s",
    (rpmType) => {
      const entry = M2_QUAD.find(
        (candidate) =>
          candidate.unitSection === "평행사변형이 되는 조건" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        expect(numericAnswer(problem.answer)).toBe(
          parallelogramConditionExpected[rpmType]!(problem.content),
        );
      }
    },
  );

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

  /**
   * 확률의 뜻과 성질 01A~04A — **발문 글자에서 다시 센다.**
   *
   * `facts` 를 읽으면 생성기가 스스로 적어 둔 값을 되읽는 것이라 아무것도 안
   * 지킨다. 04A 는 포함·배제 식을 옮겨 적지 않고 $1$부터 $N$까지를 **직접 훑어**
   * 세므로, 생성기가 식을 잘못 세우면 갈라진다.
   */
  const probabilityMeaningExpected: Record<
    string,
    (content: string) => { n: number; d: number }
  > = {
    "01A": (content) => {
      const [total, favorable] = (content.match(/\d+/g) ?? []).map(Number);
      return { n: favorable!, d: total! };
    },
    "02A": (content) => {
      const [redCount, blueCount] = (content.match(/\d+/g) ?? []).map(Number);
      return { n: blueCount!, d: redCount! + blueCount! };
    },
    "03A": (content) => {
      const largest = Number(content.match(/\$1\$부터 \$(\d+)\$까지/)?.[1]);
      const threshold = Number(content.match(/수가 \$(\d+)\$ 이상/)?.[1]);
      let favorable = 0;
      for (let value = 1; value <= largest; value += 1) {
        if (value >= threshold) favorable += 1;
      }
      return { n: favorable, d: largest };
    },
    "04A": (content) => {
      const largest = Number(content.match(/\$1\$부터 \$(\d+)\$까지/)?.[1]);
      const divisors = (content.match(/\$(\d+)\$의 배수/g) ?? []).map((token) =>
        Number(token.match(/\d+/)![0]),
      );
      expect(divisors).toHaveLength(2);
      let favorable = 0;
      for (let value = 1; value <= largest; value += 1) {
        if (divisors.some((divisor) => value % divisor === 0)) favorable += 1;
      }
      return { n: favorable, d: largest };
    },
  };

  it.each(Object.keys(probabilityMeaningExpected))(
    "확률의 뜻과 성질 유형 %s",
    (rpmType) => {
      const entry = M2_PROB.find(
        (candidate) =>
          candidate.unitSection === "확률의 뜻과 성질" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991]) {
        const problem = entry!.handler(seeded(seed));
        const got = fractionAnswer(problem.answer);
        const want = probabilityMeaningExpected[rpmType]!(problem.content);
        expect(Number.isFinite(want.n)).toBe(true);
        expect(want.d).toBeGreaterThan(0);
        // 값이 같은가 — 나눗셈으로 재면 부동소수가 끼므로 엇곱으로 본다.
        expect(got.n * want.d).toBe(want.n * got.d);
        // 정답은 늘 기약분수다.
        expect(gcdOf(got.n, got.d)).toBe(1);
        // 확률은 $0$ 이상 $1$ 이하다.
        expect(got.n).toBeGreaterThanOrEqual(0);
        expect(got.n).toBeLessThanOrEqual(got.d);
      }
    },
  );

  it("확률의 뜻과 성질 유형 05A", () => {
    const entry = M2_PROB.find(
      (candidate) =>
        candidate.unitSection === "확률의 뜻과 성질" &&
        candidate.rpmType === "05A",
    );
    expect(entry).toBeDefined();
    for (const seed of [17, 203, 991]) {
      const problem = entry!.handler(seeded(seed));
      const [winning, losingBefore, num, den] = (
        problem.content.match(/\d+/g) ?? []
      ).map(Number);
      const added = numericAnswer(problem.answer);
      // 답대로 꽝 제비를 더 넣으면 발문이 말한 확률이 되는가 — 엇곱으로 다시 센다.
      expect(winning! * den!).toBe(num! * (winning! + losingBefore! + added));
      // 「더 넣었다」가 참이려면 더한 수가 $1$ 이상이어야 하고,
      // 처음 꽝 제비도 $1$ 개 이상 있어야 발문이 성립한다.
      expect(added).toBeGreaterThanOrEqual(1);
      expect(losingBefore).toBeGreaterThanOrEqual(1);
    }
  });

  /**
   * 04A 의 두 수는 **서로 배수 관계가 아니어야** 한다.
   *
   * $3$ 과 $6$ 이 뽑히면 「$3$의 배수 또는 $6$의 배수」가 그냥 「$3$의 배수」라
   * 포함·배제가 헛돈다. **값 검산으로는 안 걸린다** — 그래도 답은 맞기 때문이다.
   */
  it("확률의 뜻과 성질 유형 04A 의 두 수는 배수 관계가 아니다", () => {
    const entry = M2_PROB.find(
      (candidate) =>
        candidate.unitSection === "확률의 뜻과 성질" &&
        candidate.rpmType === "04A",
    );
    expect(entry).toBeDefined();
    for (let seed = 1; seed <= 120; seed += 1) {
      const problem = entry!.handler(seeded(seed));
      const divisors = (problem.content.match(/\$(\d+)\$의 배수/g) ?? []).map(
        (token) => Number(token.match(/\d+/)![0]),
      );
      expect(divisors).toHaveLength(2);
      const [small, large] = divisors as [number, number];
      expect(large % small).not.toBe(0);
    }
  });

  /**
   * 지면 — **값이 맞아도 흉한 것**을 따로 센다(2026-08-24 교훈).
   * `$\dfrac{3}{8}=\dfrac{3}{8}$` 같은 헛걸음은 값 검산으로 구조적으로 안 보인다.
   */
  it.each(["01A", "02A", "03A", "04A", "05A"])(
    "확률의 뜻과 성질 유형 %s 해설에 헛걸음이 없다",
    (rpmType) => {
      const entry = M2_PROB.find(
        (candidate) =>
          candidate.unitSection === "확률의 뜻과 성질" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991, 4242, 77]) {
        const problem = entry!.handler(seeded(seed));
        expect(problem.solution).not.toMatch(
          /\\dfrac\{(\d+)\}\{(\d+)\}=\\dfrac\{\1\}\{\2\}/,
        );
        expect(problem.solution).not.toMatch(/[+\-]0=/);
        expect(problem.content).not.toMatch(/\$0\$개/);
      }
    },
  );

  /**
   * 확률의 계산 06A·07A.
   *
   * 07A 는 주사위 조건을 **발문 글자에서 읽어 눈 $1$~$6$ 을 직접 훑어** 센다 —
   * 생성기의 `DICE_CONDS` 표에 적힌 개수를 되읽으면 그 표가 틀렸을 때 같이 틀린다.
   */
  it("확률의 계산 유형 06A", () => {
    const entry = M2_PROB.find(
      (candidate) =>
        candidate.unitSection === "확률의 계산" && candidate.rpmType === "06A",
    );
    expect(entry).toBeDefined();
    for (const seed of [17, 203, 991, 4242, 77]) {
      const problem = entry!.handler(seeded(seed));
      const given = [
        ...problem.content.matchAll(/\\dfrac\{(\d+)\}\{(\d+)\}/g),
      ].map((match) => ({ n: Number(match[1]), d: Number(match[2]) }));
      expect(given).toHaveLength(2);
      const [first, second] = given as [
        { n: number; d: number },
        { n: number; d: number },
      ];
      const want = {
        n: first.n * second.d + second.n * first.d,
        d: first.d * second.d,
      };
      // 「동시에 일어나지 않는다」가 성립하려면 합이 $1$ 을 넘으면 안 된다.
      expect(want.n).toBeLessThan(want.d);
      const got = fractionAnswer(problem.answer);
      expect(got.n * want.d).toBe(want.n * got.d);
      expect(gcdOf(got.n, got.d)).toBe(1);
    }
  });

  it("확률의 계산 유형 07A", () => {
    const entry = M2_PROB.find(
      (candidate) =>
        candidate.unitSection === "확률의 계산" && candidate.rpmType === "07A",
    );
    expect(entry).toBeDefined();
    for (let seed = 1; seed <= 40; seed += 1) {
      const problem = entry!.handler(seeded(seed));
      const cond = problem.content.match(
        /\$(\d+)\$(의 배수|의 약수| 이상| 이하)의 눈이 나올/,
      );
      expect(cond).not.toBeNull();
      const value = Number(cond![1]);
      let faces = 0;
      for (let face = 1; face <= 6; face += 1) {
        const hit =
          cond![2] === "의 배수"
            ? face % value === 0
            : cond![2] === "의 약수"
              ? value % face === 0
              : cond![2] === " 이상"
                ? face >= value
                : face <= value;
        if (hit) faces += 1;
      }
      expect(faces).toBeGreaterThan(0);
      // 동전 앞면 $\dfrac12$ × 주사위 $\dfrac{faces}{6}$
      const got = fractionAnswer(problem.answer);
      expect(got.n * 12).toBe(faces * got.d);
      expect(gcdOf(got.n, got.d)).toBe(1);
    }
  });

  it.each(["06A", "07A"])(
    "확률의 계산 유형 %s 해설에 헛걸음이 없다",
    (rpmType) => {
      const entry = M2_PROB.find(
        (candidate) =>
          candidate.unitSection === "확률의 계산" &&
          candidate.rpmType === rpmType,
      );
      expect(entry).toBeDefined();
      for (const seed of [17, 203, 991, 4242, 77]) {
        const problem = entry!.handler(seeded(seed));
        expect(problem.solution).not.toMatch(
          /\\dfrac\{(\d+)\}\{(\d+)\}=\\dfrac\{\1\}\{\2\}/,
        );
      }
    },
  );
});

/**
 * 갈래 A 소유 7모듈 전량 — **지면에 날 LaTeX 명령이 나가는가.**
 *
 * ## 2026-08-27 에 실제로 있던 일
 *
 * 이 갈래가 이미 커밋한 22유형이 지면에 `\overline{AB}` 대신 `overline{AB}` 를,
 * `\times` 대신 **탭 문자**를, `\%` 대신 **주석을 여는 `%`** 를 내보내고 있었다.
 * 원인은 템플릿 문자열에 `\\overline` 대신 `\overline` 를 적은 것 — JS 는
 * 모르는 이스케이프를 **조용히 글자로** 바꾼다(`\t` 는 아예 탭이 된다).
 *
 * **값 검산도 KaTeX 도 이 부류를 구조적으로 못 잡는다.** 값은 맞고, KaTeX 는
 * `overline{AB}` 를 유효한 글자로 그린다(2026-08-16 「KaTeX 가 초록이라고
 * 지면이 멀쩡한 게 아니다」와 같은 자리). 원장님이 종이에서 찾아 줄 때까지
 * 아무도 모른다.
 *
 * ## 열쇠 — 손 목록을 쓰지 않는다
 *
 * 「무엇이 잔재인지」를 미리 정하면 목록에 없는 부류는 영영 0이다(2026-08-18).
 * 그래서 **말뭉치 자신에게 묻는다**: 이 유형들이 실제로 쓰는 `\명령` 이름을
 * 모아 어휘로 삼고, 수식 안의 «백슬래시 없는 영문 덩어리»가 그 어휘로
 * 시작하면 잔재로 본다. 도형 라벨(`ABCD`·`AH`)은 어휘에 없어 저절로 빠진다.
 */
describe("갈래 A 중등 유형 지면 — 날 LaTeX 명령", () => {
  const MODULES: [string, TypeEntry[]][] = [
    ["m1Book2", M1_BOOK2],
    ["m1Extra", M1EXTRA_TYPES],
    ["m2Prob", M2_PROB],
    ["m2Quad", M2_QUAD],
    ["m2System", M2_SYSTEM],
    ["m2SystemApply", M2_SYSTEM_APPLY],
    ["m3", M3_TYPES],
  ];
  const SEEDS = [17, 203, 991];

  /**
   * 줄바꿈 `\\` 를 먼저 치운다.
   *
   * ⚠️ 뒤돌아보기(`(?<!\\)`)로는 못 가른다 — `\\\dfrac`(줄바꿈 바로 뒤의 명령)
   *    에서 셋째 역슬래시가 둘째 뒤에 오므로 **멀쩡한 명령이 잔재로 걸린다**.
   *    실측 거짓 경보 1유형(`m2System|…|09`). 거짓 경보는 가드를 끈다(2026-08-20).
   */
  function maskRowBreaks(text: string): string {
    return text.replace(/\\\\/g, " ");
  }

  const corpus: { key: string; text: string }[] = [];
  for (const [name, list] of MODULES) {
    for (const entry of list) {
      for (const seed of SEEDS) {
        let problem;
        try {
          problem = entry.handler(seeded(seed));
        } catch {
          continue;
        }
        for (const part of [
          problem.content,
          problem.answer,
          problem.solution,
        ]) {
          if (typeof part === "string") {
            corpus.push({ key: `${name}|${entry.key}`, text: part });
          }
        }
      }
    }
  }

  const vocabulary = new Set<string>();
  for (const s of corpus) {
    for (const m of maskRowBreaks(s.text).matchAll(/\\([A-Za-z]+)/g)) {
      if (m[1]!.length >= 2) vocabulary.add(m[1]!);
    }
  }
  /** `\t`·`\b` 로 먹힌 명령의 꼬리 — 어휘에는 안 남는다. */
  const EATEN_TAILS = new Set([
    "imes",
    "riangle",
    "an",
    "extbf",
    "egin",
    "frac",
  ]);

  it("표본이 실제로 모였다", () => {
    // 말뭉치가 비면 아래 검사들이 «구조적으로 0» 이 된다.
    expect(corpus.length).toBeGreaterThan(1000);
    expect(vocabulary.size).toBeGreaterThan(10);
  });

  it("수식 안에 백슬래시를 잃은 명령이 없다", () => {
    const bad: string[] = [];
    for (const s of corpus) {
      for (const span of s.text.match(/\$[^$]*\$/g) ?? []) {
        const stripped = maskRowBreaks(span).replace(/\\[A-Za-z]+/g, " ");
        for (const run of stripped.match(/[A-Za-z]{2,}/g) ?? []) {
          const hit =
            EATEN_TAILS.has(run) ||
            [...vocabulary].some((name) => run.startsWith(name));
          if (hit) bad.push(`${s.key}: ${run} — ${span.slice(0, 60)}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("발문·정답·해설에 제어문자가 없다", () => {
    // `\times` 를 한 겹으로 적으면 `\t` 가 **탭**이 된다. 지면에서는 그냥 빈칸이다.
    const bad = corpus
      .filter((s) => /[\t\v\f\b]/.test(s.text))
      .map((s) => s.key);
    expect([...new Set(bad)].slice(0, 8)).toEqual([]);
  });

  it("수식 안 백분율은 `\\%` 로 적혀 있다", () => {
    // 날 `%` 는 KaTeX 에서 **주석을 연다** — 그 뒤가 지면에서 사라진다.
    const bad: string[] = [];
    for (const s of corpus) {
      for (const span of s.text.match(/\$[^$]*\$/g) ?? []) {
        if (/(?<!\\)%/.test(maskRowBreaks(span))) {
          bad.push(`${s.key}: ${span.slice(0, 60)}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("수식 안에 홑 역슬래시가 없다", () => {
    // `\begin{cases}…=10\-3x+…` — 줄바꿈 `\\` 를 한 겹만 적은 자리다.
    // 날 명령이 안 남으므로 위 어휘 훑기로는 구조적으로 안 보인다.
    const bad: string[] = [];
    for (const s of corpus) {
      for (const span of s.text.match(/\$[^$]*\$/g) ?? []) {
        if (/\\[^A-Za-z,%{}\\ ]/.test(span.replace(/\\\\/g, " "))) {
          bad.push(`${s.key}: ${span.slice(0, 60)}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
