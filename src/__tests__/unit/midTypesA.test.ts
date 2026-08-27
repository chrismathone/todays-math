import { describe, expect, it } from "vitest";

import { M1EXTRA_TYPES } from "../../lib/middle/m1Extra";
import { M2_SYSTEM } from "../../lib/middle/m2System";
import { M2_SYSTEM_APPLY } from "../../lib/middle/m2SystemApply";
import { M2_QUAD } from "../../lib/middle/m2Quad";

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
});
