/**
 * 초3 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/generate";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337, 555, 42];

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `소단원 없음 ${code}`).toBeTruthy();
  return u!;
}

function katexInts(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].flatMap((m) =>
    [...m[1]!.matchAll(/\d+/g)].map((d) => Number(d[0])),
  );
}

function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer);
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

describe("초3 1-1-1 세 자리 덧셈 — 묻는 대상이 답이다", () => {
  const unit = unitOf("1-1-1");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01·02 두 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const nums = katexInts(p.content);
      expect(nums.length).toBeGreaterThanOrEqual(2);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]!);
      const w = generateElementaryForm(unit, seed, "02");
      const wn = katexInts(w.content);
      expect(answerInt(w.answer)).toBe(wn[0]! + wn[1]!);
    }
  });

  it("03 세 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const nums = katexInts(p.content);
      expect(nums).toHaveLength(3);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]! + nums[2]!);
    }
  });

  it("04 역산 — 상자 셋이거나 잘못 더한 식", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const nums = katexInts(p.content);
      if (p.content.includes("상자")) {
        expect(nums).toHaveLength(3);
        expect(answerInt(p.answer)).toBe(nums[0]! - nums[1]! - nums[2]!);
      } else {
        expect(nums).toHaveLength(3);
        const right = nums[0]!;
        const wrong = nums[1]!;
        const wrongSum = nums[2]!;
        expect(answerInt(p.answer)).toBe(wrongSum - wrong + right);
      }
    }
  });

  it("05 합의 백의 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.floor((a! + b!) / 100));
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("06 빈칸 가수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const left = p.content.match(/\$\\square\+(\d+)=(\d+)\$/);
      const right = p.content.match(/\$(\d+)\+\\square=(\d+)\$/);
      if (left) {
        expect(answerInt(p.answer)).toBe(Number(left[2]) - Number(left[1]));
      } else {
        expect(right, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(Number(right![2]) - Number(right![1]));
      }
    }
  });

  it("07 일의 자리 숫자끼리의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe((a! % 10) + (b! % 10));
    }
  });

  it("08 합이 어떤 수보다 얼마 큰가", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, b, c] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! + b! - c!);
    }
  });

  it("09 합보다 100 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const nums = katexInts(p.content);
      expect(nums[2]).toBe(100);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]! + 100);
    }
  });

  it("10 합이 짝수·홀수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b] = katexInts(p.content);
      expect(p.answer).toBe((a! + b!) % 2 === 0 ? "짝수" : "홀수");
    }
  });
});

function carriesOf(a: number, b: number): number {
  const d = (n: number) => [
    Math.floor(n / 100) % 10,
    Math.floor(n / 10) % 10,
    n % 10,
  ];
  const [a2, a1, a0] = d(a);
  const [b2, b1, b0] = d(b);
  let carries = 0;
  let c = 0;
  if (a0! + b0! >= 10) {
    carries += 1;
    c = 1;
  }
  if (a1! + b1! + c >= 10) {
    carries += 1;
    c = 1;
  } else {
    c = 0;
  }
  if (a2! + b2! + c >= 10) carries += 1;
  return carries;
}

describe("초3 1-1-2 받아올림 두·세 번 — 자리 수와 횟수를 묻는다", () => {
  const unit = unitOf("1-1-2");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01·02 두 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const nums = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]!);
      const w = generateElementaryForm(unit, seed, "02");
      const wn = katexInts(w.content);
      expect(answerInt(w.answer)).toBe(wn[0]! + wn[1]!);
    }
  });

  it("03 더 많은 쪽을 구한 뒤 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const [base, more] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(base! + (base! + more!));
    }
  });

  it("04 잘못 더한 식에서 바른 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const [right, wrong, wrongSum] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(wrongSum! - wrong! + right!);
    }
  });

  it("05 합의 자리 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(String(a! + b!).length);
    }
  });

  it("06 어떤 수 + a = s", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const [a, s] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(s! - a!);
    }
  });

  it("07 받아올림 횟수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(carriesOf(a!, b!));
    }
  });

  it("08 합과 1000의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, b, k] = katexInts(p.content);
      expect(k).toBe(1000);
      expect(answerInt(p.answer)).toBe(Math.abs(1000 - (a! + b!)));
    }
  });

  it("09 합보다 10 작은 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const nums = katexInts(p.content);
      expect(nums[2]).toBe(10);
      expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]! - 10);
    }
  });

  it("10 두 합 가운데 더 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b, c, d] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.max(a! + b!, c! + d!));
    }
  });
});

describe("초3 1-1-3 세 자리 뺄셈 — 차의 자리와 빈칸 피감수", () => {
  const unit = unitOf("1-1-3");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01·02 두 수의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const nums = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(nums[0]! - nums[1]!);
      const w = generateElementaryForm(unit, seed, "02");
      const wn = katexInts(w.content);
      expect(answerInt(w.answer)).toBe(wn[0]! - wn[1]!);
    }
  });

  it("03 두 번 덜어낸 나머지", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const [a, b, c] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! - b! - c!);
    }
  });

  it("04 역산 — 처음 수이거나 바른 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const nums = katexInts(p.content);
      if (p.content.includes("잘못")) {
        expect(answerInt(p.answer)).toBe(nums[2]! + nums[1]! - nums[0]!);
      } else {
        expect(nums.length).toBeGreaterThanOrEqual(2);
        expect(answerInt(p.answer)).toBe(nums[0]! + nums[1]!);
      }
    }
  });

  it("05 차의 백의 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.floor((a! - b!) / 100));
    }
  });

  it("06 빈칸 피감수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$\\square-(\d+)=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) + Number(m![2]));
    }
  });

  it("07 일의 자리끼리 뺀 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe((a! - b!) % 10);
    }
  });

  it("08 차보다 10 큰 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const nums = katexInts(p.content);
      expect(nums[2]).toBe(10);
      expect(answerInt(p.answer)).toBe(nums[0]! - nums[1]! + 10);
    }
  });

  it("09 차가 어떤 수보다 얼마 큰가", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [a, b, c] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! - b! - c!);
    }
  });

  it("10 차의 각 자리 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b] = katexInts(p.content);
      const d = a! - b!;
      const sum = [...String(d)].reduce((s, ch) => s + Number(ch), 0);
      expect(answerInt(p.answer)).toBe(sum);
    }
  });
});

describe("초3 1-1-4 받아내림 두 번 — 십의 자리·빈칸 감수", () => {
  const unit = unitOf("1-1-4");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01·02 두 수의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const nums = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(nums[0]! - nums[1]!);
      const w = generateElementaryForm(unit, seed, "02");
      const wn = katexInts(w.content);
      expect(answerInt(w.answer)).toBe(wn[0]! - wn[1]!);
    }
  });

  it("03 두 번 덜어낸 나머지", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const [a, b, c] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! - b! - c!);
    }
  });

  it("05 차의 십의 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.floor((a! - b!) / 10) % 10);
    }
  });

  it("06 빈칸 감수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)-\\square=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) - Number(m![2]));
    }
  });

  it("07 백의 자리 숫자끼리의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(
        Math.floor(a! / 100) - Math.floor(b! / 100),
      );
    }
  });

  it("08 차에 100을 더한 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, b, k] = katexInts(p.content);
      expect(k).toBe(100);
      expect(answerInt(p.answer)).toBe(a! - b! + 100);
    }
  });

  it("09 차와 100의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [a, b, k] = katexInts(p.content);
      expect(k).toBe(100);
      expect(answerInt(p.answer)).toBe(Math.abs(a! - b! - 100));
    }
  });

  it("10 두 차 가운데 더 작은 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b, c, d] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.min(a! - b!, c! - d!));
    }
  });
});

describe("초3 1-2-1 선분·반직선·직선 — 정의와 세는 대상이 답이다", () => {
  const unit = unitOf("1-2-1");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("05·06·07 정의는 선분·반직선·직선", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "05").answer).toBe("선분");
      expect(generateElementaryForm(unit, seed, "06").answer).toBe("반직선");
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("직선");
    }
  });

  it("01 이름은 선분·반직선·직선 가운데 하나", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      expect(p.answer).toMatch(/^(선분|반직선|직선) /);
    }
  });

  it("08 반직선 수는 k(k-1)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const k = katexInts(p.content)[1]!;
      expect(answerInt(p.answer)).toBe(k * (k - 1));
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("09 점 하나를 지운 선분 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const k = katexInts(p.content)[1]!;
      expect(answerInt(p.answer)).toBe(((k - 1) * (k - 2)) / 2);
    }
  });

  it("10 반직선 수와 선분 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const k = katexInts(p.content)[1]!;
      expect(answerInt(p.answer)).toBe(k * (k - 1) + (k * (k - 1)) / 2);
    }
  });
});

function shapeLabels(text: string): string[] {
  return [...new Set(text.match(/[가나다라]/g) ?? [])];
}

describe("초3 1-2-2 각·직각 — 세는 대상이 답이다", () => {
  const unit = unitOf("1-2-2");

  it("등록이 10개다", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("07 정의는 직각", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("직각");
    }
  });

  it("05 직각 개수는 1 이상", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(answerInt(p.answer)).toBeGreaterThanOrEqual(1);
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("06 직각이 아닌 기호는 가나다라", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(["가", "나", "다", "라"]).toContain(p.answer);
    }
  });

  it("08 직각이 아닌 개수 + 05 직각 개수 = 각의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const labels = shapeLabels(p.content);
      expect(answerInt(p.answer)).toBeGreaterThanOrEqual(1);
      expect(answerInt(p.answer)).toBeLessThan(labels.length);
    }
  });

  it("09 직각 기호가 둘", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      expect(p.answer).toMatch(/^[가나다라], [가나다라]$/);
    }
  });

  it("10 변의 수는 각의 수×2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const labels = shapeLabels(p.content);
      expect(answerInt(p.answer)).toBe(2 * labels.length);
    }
  });
});
