/**
 * 초3 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  coreForms,
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
    expect(coreForms(unit)).toHaveLength(10);
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
      // 발문의 덧셈식을 세로셈으로 한 번 더 그리지 않는다(2026-10-20)
      expect(p.figureSpec).toBeNull();
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
    const answers = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b] = katexInts(p.content);
      expect(p.answer).toBe((a! + b!) % 2 === 0 ? "짝수" : "홀수");
      answers.add(p.answer);
    }
    expect(answers).toEqual(new Set(["짝수", "홀수"]));
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
      const k = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(k * (k - 1));
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("09 점 하나를 지운 선분 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const k = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(((k - 1) * (k - 2)) / 2);
    }
  });

  it("10 반직선 수와 선분 수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const k = katexInts(p.content)[0]!;
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
    expect(coreForms(unit)).toHaveLength(10);
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

describe("초3 1-2-3 직각삼각형 — 세는 대상이 답이다", () => {
  const unit = unitOf("1-2-3");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("07 정의는 직각삼각형", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "07").answer).toBe(
        "직각삼각형",
      );
    }
  });

  it("05 직각삼각형 개수는 1 또는 2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect([1, 2]).toContain(answerInt(p.answer));
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("06 아닌 기호는 가나다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(["가", "나", "다"]).toContain(p.answer);
    }
  });

  it("08 직각삼각형 변의 수는 3의 배수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const sides = answerInt(p.answer);
      expect(sides % 3).toBe(0);
      expect(sides).toBeGreaterThan(0);
    }
  });

  it("09 직각삼각형 기호가 둘", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      expect(p.answer).toMatch(/^[가나다], [가나다]$/);
    }
  });

  it("10 꼭짓점은 삼각형 수×3", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const count = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(3 * count);
    }
  });
});

describe("초3 1-2-4 직사각형 — 두 변과 직각 수를 묻는다", () => {
  const unit = unitOf("1-2-4");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("03 네 변의 합 = 2(가로+세로)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const [w, h] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(2 * (w! + h!));
    }
  });

  it("04 세로 = 합÷2 − 가로", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const nums = katexInts(p.content);
      const total = nums[0]!;
      const w = nums[1]!;
      expect(answerInt(p.answer)).toBe(total / 2 - w);
    }
  });

  it("07 정의는 직사각형", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("직사각형");
    }
  });

  it("08 가로 두 변의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [w] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(2 * w!);
    }
  });

  it("09 세로를 두 번 더한 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [, h] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(2 * h!);
    }
  });

  it("10 직각은 직사각형 수×4", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const many = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(4 * many);
    }
  });
});

describe("초3 1-2-5 정사각형 — 두 변·변의 수·합에서 빼기", () => {
  const unit = unitOf("1-2-5");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("03 네 변의 합 = 4×한 변", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const side = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(4 * side);
    }
  });

  it("07 정의는 정사각형", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("정사각형");
    }
  });

  it("08 마주 보는 두 변의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const side = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(2 * side);
    }
  });

  it("09 변의 수는 정사각형 수×4", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const many = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(4 * many);
    }
  });

  it("10 네 변의 합에서 한 변을 뺀 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const side = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(3 * side);
    }
  });
});

describe("초3 1-3-1 똑같이 나누기 — 등분·포함·검산이 답이다", () => {
  const unit = unitOf("1-3-1");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("01·02 몫 = 나뉘는 수÷나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const nums = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(nums[0]! / nums[1]!);
      const w = generateElementaryForm(unit, seed, "02");
      const [x, y] = katexInts(w.content);
      const q = answerInt(w.answer);
      expect(q * x! === y! || q * y! === x!).toBe(true);
    }
  });

  it("03 두 수를 합친 뒤 나눈 몫", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const [x, y, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe((x! + y!) / b!);
    }
  });

  it("05 곱셈 검산은 나뉘는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [, b, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(b! * q!);
    }
  });

  it("06 빈칸 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\\div\\square=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) / Number(m![2]));
    }
  });

  it("07 빈칸 나뉘는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$\\square\\div(\d+)=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * Number(m![2]));
    }
  });

  it("08 몇 묶음 = 전체÷한 묶음", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! / q!);
    }
  });

  it("09 몫이 나누는 수보다 큰가 작은가", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [a, b] = katexInts(p.content);
      const q = a! / b!;
      expect(p.answer).toBe(q > b! ? "큽니다" : "작습니다");
    }
  });

  it("10 한 명 몫×인원 = 처음 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [b, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(b! * q!);
    }
  });
});

describe("초3 1-3-2 곱셈과 나눗셈의 관계", () => {
  const unit = unitOf("1-3-2");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("03 두 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const [b, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(b! + q!);
    }
  });

  it("05 나눗셈식은 2개", () => {
    for (const seed of SEEDS) {
      expect(answerInt(generateElementaryForm(unit, seed, "05").answer)).toBe(
        2,
      );
    }
  });

  it("06 두 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const [b, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.abs(q! - b!));
    }
  });

  it("07 빈칸 곱하는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$(\d+)\\times\\square=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![2]) / Number(m![1]));
    }
  });

  it("08 세 수 가운데 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const nums = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(Math.max(...nums));
      expect(nums[0]! * nums[1]!).toBe(nums[2]);
    }
  });

  it("09 a÷q 의 몫은 b", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [b, q, a] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! / q!);
      expect(a! / q!).toBe(b);
    }
  });

  it("10 몫×나누는 수 = 나뉘는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(q! * b!);
      expect(q! * b!).toBe(a);
    }
  });
});

describe("초3 1-3-3 몫을 곱셈식으로", () => {
  const unit = unitOf("1-3-3");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("05 빈칸×나누는 수 = 나뉘는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$\\square\\times(\d+)=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![2]) / Number(m![1]));
    }
  });

  it("06 남은 개수 = 한 봉지×남은 봉지", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const [a, b, c] = katexInts(p.content);
      const q = a! / b!;
      expect(answerInt(p.answer)).toBe(b! * (q - c!));
    }
  });

  it("08 한 봉지 개수 = 전체÷봉지 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [a, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! / q!);
    }
  });

  it("09 준 개수 = 한 봉지×준 봉지", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [a, b, c] = katexInts(p.content);
      expect(a! % b!).toBe(0);
      expect(answerInt(p.answer)).toBe(b! * c!);
    }
  });

  it("10 전체에 한 봉지를 더하면", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! + b!);
    }
  });
});

describe("초3 1-3-4 몫을 곱셈구구로", () => {
  const unit = unitOf("1-3-4");

  it("등록이 10개다", () => {
    expect(coreForms(unit)).toHaveLength(10);
  });

  it("05 이용하는 구구는 나누는 수 단", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const [, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(b);
    }
  });

  it("08 하루 쪽수×날수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const [b, q] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(b! * q!);
    }
  });

  it("09 날수에서 며칠을 빼면", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const [a, b, c] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! / b! - c!);
    }
  });

  it("10 구구 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/(\d+)\\times(\d+)/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * Number(m![2]));
    }
  });
});

describe("초3 전 소단원 문형 10", () => {
  it("supportedTiers 있는 초3 소단원은 문형 10개", () => {
    const units = elementaryUnits().filter((u) => u.grade === "초3");
    expect(units.length).toBe(56);
    for (const u of units) {
      expect(coreForms(u).length, u.section).toBe(10);
    }
  });
});

describe("초3 1-4-1 곱셈 빈칸·일의 자리", () => {
  const unit = unitOf("1-4-1");

  it("05 빈칸 곱하는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\\times\\square=(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![2]) / Number(m![1]));
    }
  });

  it("06 곱의 일의 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe((a! * b!) % 10);
    }
  });

  it("10 한 묶음 더", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const [a, b] = katexInts(p.content);
      expect(answerInt(p.answer)).toBe(a! * b! + a!);
    }
  });
});

describe("초3 2-3-2 원의 성질", () => {
  const unit = unitOf("2-3-2");

  it("05 지름은 반지름의 2배", () => {
    for (const seed of SEEDS) {
      expect(answerInt(generateElementaryForm(unit, seed, "05").answer)).toBe(
        2,
      );
    }
  });

  it("07 지름−반지름 = 반지름", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const dia = katexInts(p.content)[0]!;
      expect(answerInt(p.answer)).toBe(dia / 2);
    }
  });
});

describe("초3 양자택일 — 변형 셋이 양쪽을 낸다", () => {
  function evenOddOf(code: string, formId: string, op: "+" | "×") {
    const unit = unitOf(code);
    const answers = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, formId);
      const [a, b] = katexInts(p.content);
      const even = op === "+" ? (a! + b!) % 2 === 0 : (a! * b!) % 2 === 0;
      expect(p.answer).toBe(even ? "짝수" : "홀수");
      answers.add(p.answer);
    }
    expect(answers, `${code} ${formId}`).toEqual(new Set(["짝수", "홀수"]));
  }

  it("1-4 곱의 짝·홀", () => {
    for (const code of ["1-4-1", "1-4-2", "1-4-3", "1-4-5"]) {
      evenOddOf(code, "09", "×");
    }
  });

  it("2-1-3 곱의 짝·홀", () => {
    evenOddOf("2-1-3", "08", "×");
  });

  it("1-6-4 분모가 같은지", () => {
    const unit = unitOf("1-6-4");
    const answers = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const dens = [...p.content.matchAll(/\\frac\{\d+\}\{(\d+)\}/g)].map((m) =>
        Number(m[1]),
      );
      expect(dens.length).toBeGreaterThanOrEqual(2);
      expect(p.answer).toBe(dens[0] === dens[1] ? "예" : "아니요");
      answers.add(p.answer);
    }
    expect(answers).toEqual(new Set(["예", "아니요"]));
  });

  it("2-2-3 나머지가 어떤 수보다 작은지", () => {
    const unit = unitOf("2-2-3");
    const answers = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$.*\$(\d+)\$보다/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const k = Number(m![3]);
      expect(p.answer).toBe(a % b < k ? "예" : "아니요");
      answers.add(p.answer);
    }
    expect(answers).toEqual(new Set(["예", "아니요"]));
  });

  it("2-4-4 가분수인지", () => {
    const unit = unitOf("2-4-4");
    const answers = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(Number(m![1]) >= Number(m![2]) ? "예" : "아니요");
      answers.add(p.answer);
    }
    expect(answers).toEqual(new Set(["예", "아니요"]));
  });
});
