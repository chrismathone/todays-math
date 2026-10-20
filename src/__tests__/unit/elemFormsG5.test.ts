/**
 * 초5 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
} from "@/lib/elementary/generate";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337, 555, 42];

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초5" && x.section.startsWith(code),
  );
  expect(u).toBeTruthy();
  return u!;
}

function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer);
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

function ownDivisors(num: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= num; i += 1) if (num % i === 0) out.push(i);
  return out;
}

describe("초5 1-1-1 혼합 계산 — 묻는 대상이 답이다", () => {
  const unit = unitOf("1-1-1");

  it("01 앞에서부터 계산한 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const add = p.content.match(/\$(\d+)-(\d+)\+(\d+)=\\square\$/);
      const mul = p.content.match(/\$(\d+)\\div(\d+)\\times(\d+)=\\square\$/);
      if (add) {
        expect(answerInt(p.answer)).toBe(
          Number(add[1]) - Number(add[2]) + Number(add[3]),
        );
      } else {
        expect(mul, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(
          (Number(mul![1]) / Number(mul![2])) * Number(mul![3]),
        );
      }
    }
  });

  it("05 괄호 친 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const add = p.content.match(/\$(\d+)-\((\d+)\+(\d+)\)\$/);
      const mul = p.content.match(/\$(\d+)\\div\((\d+)\\times(\d+)\)\$/);
      if (add) {
        expect(answerInt(p.answer)).toBe(
          Number(add[1]) - Number(add[2]) - Number(add[3]),
        );
      } else {
        expect(mul, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(
          Number(mul![1]) / (Number(mul![2]) * Number(mul![3])),
        );
      }
    }
  });

  it("06 첫 걸음", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const add = p.content.match(/\$(\d+)-(\d+)\+(\d+)\$/);
      const mul = p.content.match(/\$(\d+)\\div(\d+)\\times(\d+)\$/);
      if (add) {
        expect(answerInt(p.answer)).toBe(Number(add[1]) - Number(add[2]));
      } else {
        expect(mul, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(Number(mul![1]) / Number(mul![2]));
      }
    }
  });

  it("07 판정은 앞에서부터 다시 계산한다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const add = p.content.match(/\$(\d+)-(\d+)\+(\d+)=(\d+)\$/);
      const mul = p.content.match(/\$(\d+)\\div(\d+)\\times(\d+)=(\d+)\$/);
      if (add) {
        const right = Number(add[1]) - Number(add[2]) + Number(add[3]);
        expect(p.answer).toBe(right === Number(add[4]) ? "예" : "아니요");
      } else {
        expect(mul, p.content).toBeTruthy();
        const right = (Number(mul![1]) / Number(mul![2])) * Number(mul![3]);
        expect(p.answer).toBe(right === Number(mul![4]) ? "예" : "아니요");
      }
    }
  });

  it("08 앞에서부터와 괄호의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const add = p.content.match(
        /\$(\d+)-(\d+)\+(\d+)\$.*\$\1-\((\d+)\+(\d+)\)\$/,
      );
      const mul = p.content.match(
        /\$(\d+)\\div(\d+)\\times(\d+)\$.*\$\1\\div\((\d+)\\times(\d+)\)\$/,
      );
      if (add) {
        const left = Number(add[1]) - Number(add[2]) + Number(add[3]);
        const paren = Number(add[1]) - Number(add[4]) - Number(add[5]);
        expect(answerInt(p.answer)).toBe(left - paren);
      } else {
        expect(mul, p.content).toBeTruthy();
        const left = (Number(mul![1]) / Number(mul![2])) * Number(mul![3]);
        const paren = Number(mul![1]) / (Number(mul![4]) * Number(mul![5]));
        expect(answerInt(p.answer)).toBe(left - paren);
      }
    }
  });

  it("09 빠진 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const add = p.content.match(/\$(\d+)-\\square\+(\d+)=(\d+)\$/);
      const mul = p.content.match(/\$(\d+)\\div\\square\\times(\d+)=(\d+)\$/);
      if (add) {
        expect(answerInt(p.answer)).toBe(
          Number(add[1]) + Number(add[2]) - Number(add[3]),
        );
      } else {
        expect(mul, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(
          Number(mul![1]) / (Number(mul![3]) / Number(mul![2])),
        );
      }
    }
  });

  it("10 값이 더 큰 식", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      expect(["㉠", "㉡"]).toContain(p.answer);
      const add = [...p.content.matchAll(/\$(\d+)-(\d+)\+(\d+)\$/g)];
      const parenAdd = [...p.content.matchAll(/\$(\d+)-\((\d+)\+(\d+)\)\$/g)];
      if (parenAdd.length === 1 && add.length >= 1) {
        const leftN =
          Number(add[0]![1]) - Number(add[0]![2]) + Number(add[0]![3]);
        const parenN =
          Number(parenAdd[0]![1]) -
          Number(parenAdd[0]![2]) -
          Number(parenAdd[0]![3]);
        const leftFirst =
          p.content.indexOf(add[0]![0]) < p.content.indexOf(parenAdd[0]![0]);
        const biggerIsLeft = leftN > parenN;
        expect(p.answer).toBe(biggerIsLeft === leftFirst ? "㉠" : "㉡");
      } else {
        const mul = [...p.content.matchAll(/\$(\d+)\\div(\d+)\\times(\d+)\$/g)];
        const parenMul = [
          ...p.content.matchAll(/\$(\d+)\\div\((\d+)\\times(\d+)\)\$/g),
        ];
        expect(parenMul.length).toBe(1);
        expect(mul.length).toBeGreaterThanOrEqual(1);
        const leftN =
          (Number(mul[0]![1]) / Number(mul[0]![2])) * Number(mul[0]![3]);
        const parenN =
          Number(parenMul[0]![1]) /
          (Number(parenMul[0]![2]) * Number(parenMul[0]![3]));
        const leftFirst =
          p.content.indexOf(mul[0]![0]) < p.content.indexOf(parenMul[0]![0]);
        expect(p.answer).toBe(leftN > parenN === leftFirst ? "㉠" : "㉡");
      }
    }
  });
});

describe("초5 1-1-2 세 연산 — 곱·나눗셈을 먼저", () => {
  const unit = unitOf("1-1-2");

  it("01 곱셈·나눗셈을 먼저 한 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const mul = p.content.match(
        /\$(\d+)-(\d+)\\times(\d+)\+(\d+)=\\square\$/,
      );
      const div = p.content.match(/\$(\d+)\+(\d+)\\div(\d+)-(\d+)=\\square\$/);
      if (mul) {
        expect(answerInt(p.answer)).toBe(
          Number(mul[1]) - Number(mul[2]) * Number(mul[3]) + Number(mul[4]),
        );
      } else {
        expect(div, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(
          Number(div![1]) + Number(div![2]) / Number(div![3]) - Number(div![4]),
        );
      }
    }
  });

  it("05 앞에서부터 접은 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const mul = p.content.match(/\$(\d+)-(\d+)\\times(\d+)\+(\d+)\$/);
      const div = p.content.match(/\$(\d+)\+(\d+)\\div(\d+)-(\d+)\$/);
      if (mul) {
        expect(answerInt(p.answer)).toBe(
          (Number(mul[1]) - Number(mul[2])) * Number(mul[3]) + Number(mul[4]),
        );
      } else {
        expect(div, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(
          (Number(div![1]) + Number(div![2])) / Number(div![3]) -
            Number(div![4]),
        );
      }
    }
  });

  it("06 가장 먼저 하는 계산", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const mul = p.content.match(/\$(\d+)-(\d+)\\times(\d+)\+(\d+)\$/);
      const div = p.content.match(/\$(\d+)\+(\d+)\\div(\d+)-(\d+)\$/);
      if (mul) {
        expect(answerInt(p.answer)).toBe(Number(mul[2]) * Number(mul[3]));
      } else {
        expect(div, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(Number(div![2]) / Number(div![3]));
      }
    }
  });

  it("07 판정", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const mul = p.content.match(/\$(\d+)-(\d+)\\times(\d+)\+(\d+)=(\d+)\$/);
      const div = p.content.match(/\$(\d+)\+(\d+)\\div(\d+)-(\d+)=(\d+)\$/);
      if (mul) {
        const right =
          Number(mul[1]) - Number(mul[2]) * Number(mul[3]) + Number(mul[4]);
        expect(p.answer).toBe(right === Number(mul[5]) ? "예" : "아니요");
      } else {
        expect(div, p.content).toBeTruthy();
        const right =
          Number(div![1]) + Number(div![2]) / Number(div![3]) - Number(div![4]);
        expect(p.answer).toBe(right === Number(div![5]) ? "예" : "아니요");
      }
    }
  });

  it("08 앞에서부터와 바른 값의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const mul = p.content.match(/\$(\d+)-(\d+)\\times(\d+)\+(\d+)\$/);
      const div = p.content.match(/\$(\d+)\+(\d+)\\div(\d+)-(\d+)\$/);
      if (mul) {
        const right =
          Number(mul[1]) - Number(mul[2]) * Number(mul[3]) + Number(mul[4]);
        const ltr =
          (Number(mul[1]) - Number(mul[2])) * Number(mul[3]) + Number(mul[4]);
        expect(answerInt(p.answer)).toBe(Math.abs(ltr - right));
      } else {
        expect(div, p.content).toBeTruthy();
        const right =
          Number(div![1]) + Number(div![2]) / Number(div![3]) - Number(div![4]);
        const ltr =
          (Number(div![1]) + Number(div![2])) / Number(div![3]) -
          Number(div![4]);
        expect(answerInt(p.answer)).toBe(Math.abs(ltr - right));
      }
    }
  });

  it("09 식의 값에 더한다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const mul = p.content.match(
        /\$(\d+)-(\d+)\\times(\d+)\+(\d+)\$.*?\$(\d+)\$/,
      );
      const div = p.content.match(
        /\$(\d+)\+(\d+)\\div(\d+)-(\d+)\$.*?\$(\d+)\$/,
      );
      if (mul) {
        const r =
          Number(mul[1]) - Number(mul[2]) * Number(mul[3]) + Number(mul[4]);
        expect(answerInt(p.answer)).toBe(r + Number(mul[5]));
      } else {
        expect(div, p.content).toBeTruthy();
        const r =
          Number(div![1]) + Number(div![2]) / Number(div![3]) - Number(div![4]);
        expect(answerInt(p.answer)).toBe(r + Number(div![5]));
      }
    }
  });

  it("10 값이 더 큰 식", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      expect(["㉠", "㉡"]).toContain(p.answer);
      const mulLtr = p.content.match(/\$\((\d+)-(\d+)\)\\times(\d+)\+(\d+)\$/);
      const mulRight = p.content.match(
        /\$(\d+)-\((\d+)\\times(\d+)\)\+(\d+)\$/,
      );
      if (mulLtr && mulRight) {
        const ltr =
          (Number(mulLtr[1]) - Number(mulLtr[2])) * Number(mulLtr[3]) +
          Number(mulLtr[4]);
        const right =
          Number(mulRight[1]) -
          Number(mulRight[2]) * Number(mulRight[3]) +
          Number(mulRight[4]);
        const ltrFirst =
          p.content.indexOf(mulLtr[0]) < p.content.indexOf(mulRight[0]);
        expect(p.answer).toBe(ltr > right === ltrFirst ? "㉠" : "㉡");
      } else {
        const divLtr = p.content.match(/\$\((\d+)\+(\d+)\)\\div(\d+)-(\d+)\$/);
        const divRight = p.content.match(
          /\$(\d+)\+\((\d+)\\div(\d+)\)-(\d+)\$/,
        );
        expect(divLtr, p.content).toBeTruthy();
        expect(divRight, p.content).toBeTruthy();
        const ltr =
          (Number(divLtr![1]) + Number(divLtr![2])) / Number(divLtr![3]) -
          Number(divLtr![4]);
        const right =
          Number(divRight![1]) +
          Number(divRight![2]) / Number(divRight![3]) -
          Number(divRight![4]);
        const rightFirst =
          p.content.indexOf(divRight![0]) < p.content.indexOf(divLtr![0]);
        expect(p.answer).toBe(right > ltr === rightFirst ? "㉠" : "㉡");
      }
    }
  });
});

describe("초5 1-1-3 네 연산", () => {
  const unit = unitOf("1-1-3");

  it("01 곱셈·나눗셈을 먼저 한 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const flat = p.content.match(
        /\$(\d+)\\times(\d+)\+(\d+)-(\d+)\\div(\d+)=\\square\$/,
      );
      const paren = p.content.match(
        /\$\((\d+)-(\d+)\)\\times(\d+)\+(\d+)\\div(\d+)=\\square\$/,
      );
      if (flat) {
        expect(answerInt(p.answer)).toBe(
          Number(flat[1]) * Number(flat[2]) +
            Number(flat[3]) -
            Number(flat[4]) / Number(flat[5]),
        );
      } else {
        expect(paren, p.content).toBeTruthy();
        expect(answerInt(p.answer)).toBe(
          (Number(paren![1]) - Number(paren![2])) * Number(paren![3]) +
            Number(paren![4]) / Number(paren![5]),
        );
      }
    }
  });

  it("05 곱셈의 결과", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\\times(\d+)\+(\d+)-(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * Number(m![2]));
    }
  });

  it("06 판정", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /\$(\d+)\\times(\d+)\+(\d+)-(\d+)\\div(\d+)=(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      const right =
        Number(m![1]) * Number(m![2]) +
        Number(m![3]) -
        Number(m![4]) / Number(m![5]);
      expect(p.answer).toBe(right === Number(m![6]) ? "예" : "아니요");
    }
  });

  it("07 괄호 다음을 앞에서부터", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(
        /\$\((\d+)-(\d+)\)\\times(\d+)\+(\d+)\\div(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      const acc =
        (Number(m![1]) - Number(m![2])) * Number(m![3]) + Number(m![4]);
      expect(answerInt(p.answer)).toBe(acc / Number(m![5]));
    }
  });

  it("08 곱셈 결과와 나눗셈 결과의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\\times(\d+)\+(\d+)-(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * Number(m![2]) + Number(m![4]) / Number(m![5]),
      );
    }
  });

  it("09 식의 값에 더한다", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /\$(\d+)\\times(\d+)\+(\d+)-(\d+)\\div(\d+)\$.*?\$(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      const r =
        Number(m![1]) * Number(m![2]) +
        Number(m![3]) -
        Number(m![4]) / Number(m![5]);
      expect(answerInt(p.answer)).toBe(r + Number(m![6]));
    }
  });

  it("10 값이 더 큰 식", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      expect(["㉠", "㉡"]).toContain(p.answer);
      const withP = p.content.match(
        /\$\((\d+)-(\d+)\)\\times(\d+)\+(\d+)\\div(\d+)\$/,
      );
      const noP = p.content.match(
        /\$(\d+)-(\d+)\\times(\d+)\+(\d+)\\div(\d+)\$/,
      );
      expect(withP, p.content).toBeTruthy();
      expect(noP, p.content).toBeTruthy();
      const hi =
        (Number(withP![1]) - Number(withP![2])) * Number(withP![3]) +
        Number(withP![4]) / Number(withP![5]);
      const lo =
        Number(noP![1]) -
        Number(noP![2]) * Number(noP![3]) +
        Number(noP![4]) / Number(noP![5]);
      const parenFirst =
        p.content.indexOf(withP![0]) < p.content.indexOf(noP![0]);
      expect(p.answer).toBe(hi > lo === parenFirst ? "㉠" : "㉡");
    }
  });
});

describe("초5 1-2-1 약수와 배수", () => {
  const unit = unitOf("1-2-1");

  it("05 약수의 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$의 약수는 모두 몇 개/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(ownDivisors(Number(m![1])).length);
    }
  });

  it("06 가장 큰 약수는 그 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\$의 약수 중에서 가장 큰/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });

  it("07 약수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$(\d+)\$의 약수를 모두 더하면/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        ownDivisors(Number(m![1])).reduce((a, b) => a + b, 0),
      );
    }
  });

  it("08 짝수인 약수 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$의 약수 중에서 짝수는/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        ownDivisors(Number(m![1])).filter((v) => v % 2 === 0).length,
      );
    }
  });

  it("09 1과 자신을 뺀 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$의 약수 중에서/);
      expect(m, p.content).toBeTruthy();
      const n0 = Number(m![1]);
      expect(answerInt(p.answer)).toBe(
        ownDivisors(n0).filter((v) => v !== 1 && v !== n0).length,
      );
    }
  });

  it("10 M보다 작은 가장 큰 배수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\$(\d+)\$의 배수 중에서 \$(\d+)\$보다 작은/);
      expect(m, p.content).toBeTruthy();
      const b = Number(m![1]);
      const M = Number(m![2]);
      expect(answerInt(p.answer)).toBe(Math.floor((M - 1) / b) * b);
    }
  });
});

describe("초5 1-2-2 약수와 배수의 관계", () => {
  const unit = unitOf("1-2-2");

  it("05 배수 판정", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 배수입니까/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(
        Number(m![1]) % Number(m![2]) === 0 ? "예" : "아니요",
      );
    }
  });

  it("06 몫", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 배수입니다.*나누면 몫/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) / Number(m![2]));
    }
  });

  it("07 두 수의 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 약수입니다\. 두 수/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * Number(m![2]));
    }
  });

  it("08 L보다 큰 가장 작은 배수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$의 배수 중에서 \$(\d+)\$보다 큰/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const L = Number(m![2]);
      expect(answerInt(p.answer)).toBe(Math.ceil((L + 1) / a) * a);
    }
  });

  it("09 나머지", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$.*나머지/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) % Number(m![2]));
    }
  });

  it("10 곱셈식에서 알 수 있는 약수 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const equations = [...p.content.matchAll(/\$(\d+)\\times(\d+)=(\d+)\$/g)];
      expect(equations, p.content).toHaveLength(2);
      const uniq = new Set(equations.flatMap((m) => m.slice(1).map(Number)));
      expect(answerInt(p.answer)).toBe(uniq.size);
    }
  });
});

describe("초5 1-2-3 공약수와 최대공약수", () => {
  const unit = unitOf("1-2-3");

  function gcdOf(x: number, y: number): number {
    let a = x;
    let b = y;
    while (b !== 0) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  }

  it("05 최대공약수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 최대공약수/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(gcdOf(Number(m![1]), Number(m![2])));
    }
  });

  it("06 가장 작은 공약수는 1", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.content).toMatch(/가장 작은/);
      expect(answerInt(p.answer)).toBe(1);
    }
  });

  it("07 홀수 공약수 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 공약수 중에서 홀수/);
      expect(m, p.content).toBeTruthy();
      const g = gcdOf(Number(m![1]), Number(m![2]));
      expect(answerInt(p.answer)).toBe(
        ownDivisors(g).filter((v) => v % 2 === 1).length,
      );
    }
  });

  it("08 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$(?:을|를) 최대공약수/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = gcdOf(a, b);
      expect(answerInt(p.answer)).toBe(a / g + b / g);
    }
  });

  it("09 짝수 공약수 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 공약수 중에서 짝수/);
      expect(m, p.content).toBeTruthy();
      const g = gcdOf(Number(m![1]), Number(m![2]));
      expect(answerInt(p.answer)).toBe(
        ownDivisors(g)
          .filter((v) => v % 2 === 0)
          .reduce((s, v) => s + v, 0),
      );
    }
  });

  it("10 가장 큰 공약수와 가장 작은 공약수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 공약수 중에서 가장 큰/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(gcdOf(Number(m![1]), Number(m![2])) + 1);
    }
  });
});

function lcmOf(x: number, y: number): number {
  let a = x;
  let b = y;
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return (x * y) / a;
}

describe("초5 1-2-4 최대공약수 구하는 방법", () => {
  const unit = unitOf("1-2-4");

  it("05 더 큰 몫", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /두 수 \$(\d+)\$, \$(\d+)\$(?:을|를) 최대공약수/,
      );
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = ownDivisors(a)
        .filter((d) => b % d === 0)
        .pop()!;
      expect(answerInt(p.answer)).toBe(Math.max(a / g, b / g));
    }
  });

  it("06 최대공약수로 나눈 몫", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const values = [...p.content.matchAll(/\$(\d+)\$/g)].map((m) =>
        Number(m[1]),
      );
      const [a, b, x] = values;
      const common = ownDivisors(a).filter((d) => b % d === 0);
      expect(p.content).toContain("나눈 몫");
      expect(answerInt(p.answer)).toBe(x / Math.max(...common));
    }
  });

  it("09 두 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /두 수 \$(\d+)\$, \$(\d+)\$(?:을|를) 최대공약수/,
      );
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = ownDivisors(a)
        .filter((d) => b % d === 0)
        .pop()!;
      expect(answerInt(p.answer)).toBe(Math.abs(a / g - b / g));
    }
  });

  it("10 최대공약수로 나눈 두 몫의 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(
        /두 수 \$(\d+)\$, \$(\d+)\$(?:을|를) 각각 최대공약수/,
      );
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]),
        b = Number(m![2]);
      const g = Math.max(...ownDivisors(a).filter((d) => b % d === 0));
      expect(answerInt(p.answer)).toBe((a / g) * (b / g));
    }
  });
});

describe("초5 1-2-5 공배수와 최소공배수", () => {
  const unit = unitOf("1-2-5");

  it("05 세 번째 공배수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 공배수 중에서 세 번째/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(3 * lcmOf(Number(m![1]), Number(m![2])));
    }
  });

  it("06 첫 세 공배수 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /\$(\d+)\$.*\$(\d+)\$의 공배수를 작은 수부터 세 개/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(6 * lcmOf(Number(m![1]), Number(m![2])));
    }
  });

  it("10 최소공배수의 몇 배", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\$(\d+)\$.*\$(\d+)\$의 공배수 \$(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      const m0 = lcmOf(Number(m![1]), Number(m![2]));
      expect(answerInt(p.answer)).toBe(Number(m![3]) / m0);
    }
  });
});

describe("초5 1-2-6 최소공배수 구하는 방법", () => {
  const unit = unitOf("1-2-6");

  it("05 최소공배수÷한 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /두 수 \$(\d+)\$, \$(\d+)\$의 최소공배수를 \$(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        lcmOf(Number(m![1]), Number(m![2])) / Number(m![3]),
      );
    }
  });

  it("06 공약수와 두 몫의 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /공약수 \$(\d+)\$.*몫이 \$(\d+)\$.*\$(\d+)\$.*두 몫의 공약수/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * Number(m![2]) * Number(m![3]),
      );
    }
  });

  it("10 동시에 출발하는 간격", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(
        /버스는 \$(\d+)\$분마다, 지하철은 \$(\d+)\$분마다/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(lcmOf(Number(m![1]), Number(m![2])));
    }
  });
});

describe("초5 1-3-1 대응 관계 — 표에서 다시 센다", () => {
  const unit = unitOf("1-3-1");

  function triValues(p: {
    figureSpec: Record<string, unknown> | null;
  }): number[] {
    expect(p.figureSpec).toBeTruthy();
    const rows = p.figureSpec!.rows as string[][];
    return rows[0]!.slice(1).map(Number);
  }

  it("05 가장 큰 △", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(answerInt(p.answer)).toBe(Math.max(...triValues(p)));
    }
  });

  it("06 △의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(answerInt(p.answer)).toBe(triValues(p).reduce((a, b) => a + b, 0));
    }
  });

  it("07 최대-최소", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const ys = triValues(p);
      expect(answerInt(p.answer)).toBe(Math.max(...ys) - Math.min(...ys));
    }
  });

  it("08 가장 작은 △", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      expect(answerInt(p.answer)).toBe(Math.min(...triValues(p)));
    }
  });

  it("09 한 칸 증가량", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const ys = triValues(p);
      expect(answerInt(p.answer)).toBe(ys[1]! - ys[0]!);
    }
  });

  it("10 합에서 최대를 뺀 값", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const ys = triValues(p);
      expect(answerInt(p.answer)).toBe(
        ys.reduce((a, b) => a + b, 0) - Math.max(...ys),
      );
    }
  });
});

describe("초5 1-3-2 대응 관계를 식으로", () => {
  const unit = unitOf("1-3-2");

  it("05 곱 관계에서 △", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /\\triangle=\\square\\times(\d+)\$.*□가 \$(\d+)\$이면/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * Number(m![2]));
    }
  });

  it("06 덧셈 관계에서 △", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /\\triangle=\\square\+(\d+)\$.*□가 \$(\d+)\$이면/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) + Number(m![2]));
    }
  });

  it("07 곱 관계에서 □", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(
        /\\triangle=\\square\\times(\d+)\$.*△가 \$(\d+)\$이면/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![2]) / Number(m![1]));
    }
  });

  it("10 뺄셈 관계에서 △", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(
        /\\triangle=\\square-(\d+)\$.*□가 \$(\d+)\$이면/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![2]) - Number(m![1]));
    }
  });
});

describe("초5 1-3-3 생활 속 대응", () => {
  const unit = unitOf("1-3-3");

  it("05 한 개에 딸린 수", () => {
    const known: Record<string, number> = {
      자동차: 4,
      세발자전거: 3,
      오리: 2,
      거미: 8,
      곤충: 6,
    };
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const name = Object.keys(known).find((k) => p.content.includes(k));
      expect(name, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(known[name!]!);
    }
  });

  it("08 나이", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(
        /동생보다 \$(\d+)\$살 많습니다\. 동생이 \$(\d+)\$살/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) + Number(m![2]));
    }
  });

  it("09 도막에서 자른 횟수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$(\d+)\$도막으로/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) - 1);
    }
  });
});

describe("초5 1-4-1 크기가 같은 분수", () => {
  const unit = unitOf("1-4-1");

  it("06 분모는 몇 배", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /\\frac\{(\d+)\}\{(\d+)\}.+\\frac\{(\d+)\}\{(\d+)\}/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![4]) / Number(m![2]));
    }
  });

  it("10 분자가 지정된 분수의 분모", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}.+분자가 \$(\d+)\$인/);
      expect(m, p.content).toBeTruthy();
      const g = Number(m![3]) / Number(m![1]);
      expect(answerInt(p.answer)).toBe(Number(m![2]) * g);
    }
  });
});

describe("초5 1-4-2 약분", () => {
  const unit = unitOf("1-4-2");

  it("06 기약분수의 분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = ownDivisors(a)
        .filter((d) => b % d === 0)
        .pop()!;
      expect(answerInt(p.answer)).toBe(a / g);
    }
  });

  it("07 기약분수의 분모", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = ownDivisors(a)
        .filter((d) => b % d === 0)
        .pop()!;
      expect(answerInt(p.answer)).toBe(b / g);
    }
  });
});

describe("초5 2-2-1 분수×자연수", () => {
  const unit = unitOf("2-2-1");

  it("05 약분하기 전 분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      const k = p.content.match(/\$(\d+)\$을|\$(\d+)\$를/);
      expect(m, p.content).toBeTruthy();
      expect(k, p.content).toBeTruthy();
      const a = Number(m![1]);
      const nat = Number(k![1] ?? k![2]);
      expect(answerInt(p.answer)).toBe(a * nat);
    }
  });
});

describe("초5 2-2-2 자연수×분수", () => {
  const unit = unitOf("2-2-2");

  it("05 약분하기 전 분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const k = p.content.match(/^\$(\d+)\$/);
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      expect(k, p.content).toBeTruthy();
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(k![1]) * Number(m![1]));
    }
  });
});

describe("초5 2-2-3 진분수 곱", () => {
  const unit = unitOf("2-2-3");

  it("05 분자끼리 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const ms = [...p.content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)];
      expect(ms.length).toBeGreaterThanOrEqual(2);
      expect(answerInt(p.answer)).toBe(Number(ms[0]![1]) * Number(ms[1]![1]));
    }
  });
});

describe("초5 2-2-4 대분수 곱", () => {
  const unit = unitOf("2-2-4");

  it("05 가분수 분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(m![1]) * Number(m![3]) + Number(m![2]),
      );
    }
  });
});

describe("초5 2-3-1 합동", () => {
  const unit = unitOf("2-3-1");

  it("06 그림의 도형 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const spec = p.figureSpec as { items?: unknown[] } | null;
      expect(spec?.items, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(spec!.items!.length);
    }
  });
});

describe("초5 2-3-2 합동인 도형의 성질", () => {
  const unit = unitOf("2-3-2");

  it("05 대응변", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/한 변이 \$(\d+)\$ cm/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });
});

describe("초5 2-3-3 선대칭", () => {
  const unit = unitOf("2-3-3");

  it("05 두 도형 대칭축 합", () => {
    const axis: Record<string, number> = {
      이등변삼각형: 1,
      직사각형: 2,
      정삼각형: 3,
      정사각형: 4,
      정오각형: 5,
      정육각형: 6,
      정팔각형: 8,
    };
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const names = Object.keys(axis).filter((n) => p.content.includes(n));
      expect(names.length).toBe(2);
      expect(answerInt(p.answer)).toBe(axis[names[0]!]! + axis[names[1]!]!);
    }
  });
});

describe("초5 2-3-4 점대칭", () => {
  const unit = unitOf("2-3-4");

  it("07 마주 보는 변", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/한 변이 \$(\d+)\$ cm/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });
});

describe("초5 2-4-1 작은 소수×자연수", () => {
  const unit = unitOf("2-4-1");

  it("05 소수점을 무시한 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$0\.(\d+)\$과|\$0\.(\d+)\$와/);
      const k = p.content.match(/\$(\d+)\$을|\$(\d+)\$를/);
      expect(m, p.content).toBeTruthy();
      expect(k, p.content).toBeTruthy();
      const t = Number(m![1] ?? m![2]);
      const nat = Number(k![1] ?? k![2]);
      expect(answerInt(p.answer)).toBe(t * nat);
    }
  });
});

describe("초5 2-4-2 큰 소수×자연수", () => {
  const unit = unitOf("2-4-2");

  it("06 소수 첫째 자리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\$(\d+\.\d+)\\times(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      const prod = Number(m![1]) * Number(m![2]);
      const digit = Math.round(prod * 10) % 10;
      expect(answerInt(p.answer)).toBe(digit);
    }
  });
});

describe("초5 2-4-3 자연수×작은 소수", () => {
  const unit = unitOf("2-4-3");

  it("05 소수점을 무시한 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const k = p.content.match(/^\$(\d+)\$/);
      const t = p.content.match(/\$0\.(\d+)\$/);
      expect(k, p.content).toBeTruthy();
      expect(t, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(k![1]) * Number(t![1]));
    }
  });
});

describe("초5 2-4-4 자연수×큰 소수", () => {
  const unit = unitOf("2-4-4");

  it("05 소수점을 무시한 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const k = p.content.match(/^\$(\d+)\$/);
      const a = p.content.match(/\$(\d+)\.(\d+)\$/);
      expect(k, p.content).toBeTruthy();
      expect(a, p.content).toBeTruthy();
      const scaled = Number(a![1]) * 10 + Number(a![2]);
      expect(answerInt(p.answer)).toBe(Number(k![1]) * scaled);
    }
  });
});

describe("초5 2-4-5 작은 소수×작은 소수", () => {
  const unit = unitOf("2-4-5");

  it("05 소수점을 무시한 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const ms = [...p.content.matchAll(/\$0\.(\d+)\$/g)];
      expect(ms.length).toBeGreaterThanOrEqual(2);
      expect(answerInt(p.answer)).toBe(Number(ms[0]![1]) * Number(ms[1]![1]));
    }
  });
});

describe("초5 2-4-6 큰 소수×큰 소수", () => {
  const unit = unitOf("2-4-6");

  it("05 소수점을 무시한 곱", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const ms = [...p.content.matchAll(/\$(\d+)\.(\d+)\$/g)];
      expect(ms.length).toBeGreaterThanOrEqual(2);
      const a = Number(ms[0]![1]) * 10 + Number(ms[0]![2]);
      const b = Number(ms[1]![1]) * 10 + Number(ms[1]![2]);
      expect(answerInt(p.answer)).toBe(a * b);
    }
  });
});

describe("초5 2-4-7 소수점 위치", () => {
  const unit = unitOf("2-4-7");

  it("05 오른쪽으로 옮긴 칸 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$을|\$(\d+)\$를/);
      expect(m, p.content).toBeTruthy();
      const mul = Number(m![1] ?? m![2]);
      const steps = mul === 10 ? 1 : mul === 100 ? 2 : 3;
      expect(answerInt(p.answer)).toBe(steps);
    }
  });
});

describe("초5 2-5-2 정육면체", () => {
  const unit = unitOf("2-5-2");

  it("05 면의 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(answerInt(p.answer)).toBe(6);
    }
  });
});

describe("초5 2-5-3 직육면체의 성질", () => {
  const unit = unitOf("2-5-3");

  it("05 밑면과 수직인 모서리 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /가로가 \$(\d+)\$ cm, 세로가 \$(\d+)\$ cm, 높이가 \$(\d+)\$ cm/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(4 * Number(m![3]));
    }
  });
});

describe("초5 2-5-4 겨냥도", () => {
  const unit = unitOf("2-5-4");

  it("07 숨은 가로 모서리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/가로가 \$(\d+)\$ cm/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });
});

describe("초5 2-5-5 정육면체 전개도", () => {
  const unit = unitOf("2-5-5");

  it("08 둘레에서 한 모서리", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/둘레가 \$(\d+)\$ cm/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) / 14);
    }
  });
});

describe("초5 2-5-6 직육면체 전개도", () => {
  const unit = unitOf("2-5-6");

  it("05 가로·세로 면 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(answerInt(p.answer)).toBe(2);
    }
  });
});

describe("초5 2-6-1 평균", () => {
  const unit = unitOf("2-6-1");

  it("05 쪽수의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const inner = p.content.match(/차례로 \$([^$]+)\$ 쪽/);
      expect(inner, p.content).toBeTruthy();
      const vals = inner![1].match(/\d+/g)!.map(Number);
      expect(answerInt(p.answer)).toBe(vals.reduce((a, b) => a + b, 0));
    }
  });
});

describe("초5 2-6-2 평균 이용", () => {
  const unit = unitOf("2-6-2");

  it("02 전체와 평균에서 경기 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "02");
      const m = p.content.match(
        /모두 \$(\d+)\$점을 얻었고 경기당 평균은 \$(\d+)\$점/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) / Number(m![2]));
    }
  });

  it("05 자료 개수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/평균이 \$(\d+)\$인 자료의 합이 \$(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![2]) / Number(m![1]));
    }
  });
});

describe("초5 2-6-3 가능성", () => {
  const unit = unitOf("2-6-3");

  it("05 구슬의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(
        /빨간 구슬 \$(\d+)\$개와 파란 구슬 \$(\d+)\$개/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) + Number(m![2]));
    }
  });
});

describe("초5 양자택일 — 변형 셋이 양쪽을 낸다", () => {
  function expectBoth(
    code: string,
    formId: string,
    check: (
      content: string,
      figureSpec: Record<string, unknown> | null,
    ) => boolean,
  ) {
    const unit = unitOf(code);
    const answers = new Set<string>();
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, formId);
      const yes = check(p.content, p.figureSpec);
      expect(p.answer, p.content).toBe(yes ? "예" : "아니요");
      answers.add(p.answer);
    }
    expect(answers, `${code} ${formId}`).toEqual(new Set(["예", "아니요"]));
  }

  function dollars(content: string): number[] {
    return [...content.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
  }

  function fracs(content: string): [number, number][] {
    return [...content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
  }

  it("1-2-4 공약수 판정", () => {
    expectBoth("1-2-4", "08", (c) => {
      const [d, a, b] = dollars(c);
      return a! % d! === 0 && b! % d! === 0;
    });
  });

  it("1-2-5 공배수 판정", () => {
    expectBoth("1-2-5", "09", (c) => {
      const [x, a, b] = dollars(c);
      return x! % a! === 0 && x! % b! === 0;
    });
  });

  it("1-2-6 최소공배수=곱", () => {
    expectBoth("1-2-6", "09", (c) => {
      const [a, b, prod] = dollars(c);
      return lcmOf(a!, b!) === prod;
    });
  });

  it("1-3-2 대응 관계 판정", () => {
    expectBoth("1-3-2", "08", (c, fig) => {
      const shown = Number(c.match(/\\triangle=\\square\\times(\d+)/)?.[1]);
      const row = (fig as { rows?: string[][] } | null)?.rows?.[0] ?? [];
      const y = Number(row[1]);
      const from = dollars(c)[0]!;
      return y === from * shown;
    });
  });

  it("1-4-1 같은 크기 분수", () => {
    expectBoth("1-4-1", "07", (c) => {
      const [a, b] = fracs(c);
      return a![0] * b![1] === b![0] * a![1];
    });
  });

  it("1-4-5 분수와 소수", () => {
    expectBoth("1-4-5", "07", (c) => {
      const [fn, fd] = fracs(c)[0]!;
      const dec = c.match(/소수 \$([^$]+)\$/)?.[1];
      return fn / fd === Number(dec);
    });
  });

  it("2-1-1 이상에 들어가는가", () => {
    expectBoth("2-1-1", "08", (c) => {
      const [a, k] = dollars(c);
      return k! >= a!;
    });
  });

  it("2-1-2 초과에 들어가는가", () => {
    expectBoth("2-1-2", "07", (c) => {
      const [a, k] = dollars(c);
      return k! > a!;
    });
  });

  it("2-2-1 곱이 1보다 큰가", () => {
    expectBoth("2-2-1", "10", (c) => {
      const [a, d] = fracs(c)[0]!;
      const k = Number(c.match(/\\times(\d+)/)?.[1]);
      return a * k > d;
    });
  });

  it("1-3-3 생활 대응 판정", () => {
    expectBoth("1-3-3", "07", (c) => {
      const per = Number(c.match(/\$(\d+)\$[가-힣]*씩/)?.[1]);
      const shown = Number(c.match(/\\times(\d+)/)?.[1]);
      return per === shown;
    });
  });

  it("1-5-2 분수부 올림", () => {
    expectBoth("1-5-2", "08", (c) => {
      const mixed = [...c.matchAll(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/g)].map(
        (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
      );
      const [, a, d1] = mixed[0]!;
      const [, b, d2] = mixed[1]!;
      return a / d1 + b / d2 >= 1;
    });
  });

  it("1-5-3 차가 1/2보다 큰가", () => {
    expectBoth("1-5-3", "07", (c) => {
      const [big, small] = fracs(c);
      return big![0] / big![1] - small![0] / small![1] > 0.5;
    });
  });

  it("1-5-4 받아내림", () => {
    expectBoth("1-5-4", "08", (c) => {
      const mixed = [...c.matchAll(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/g)].map(
        (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
      );
      const [, a, d1] = mixed[0]!;
      const [, b, d2] = mixed[1]!;
      return a / d1 < b / d2;
    });
  });

  it("2-4-1 소수×자연수가 1보다 큰가", () => {
    expectBoth("2-4-1", "09", (c) => {
      const m = c.match(/\$(\d+(?:\.\d+)?)\\times(\d+)\$/);
      return Number(m![1]) * Number(m![2]) > 1;
    });
  });

  it("2-4-2 곱이 어떤 수보다 큰가", () => {
    expectBoth("2-4-2", "09", (c) => {
      const m = c.match(/\$(\d+(?:\.\d+)?)\\times(\d+)\$/);
      const target = dollars(c).pop()!;
      return Number(m![1]) * Number(m![2]) > target;
    });
  });

  it("2-4-3 자연수×소수가 1보다 큰가", () => {
    expectBoth("2-4-3", "08", (c) => {
      const m = c.match(/\$(\d+)\\times(\d+(?:\.\d+)?)\$/);
      return Number(m![1]) * Number(m![2]) > 1;
    });
  });

  it("2-4-5 곱이 0.1보다 큰가", () => {
    expectBoth("2-4-5", "08", (c) => {
      const m = c.match(/\$(\d+(?:\.\d+)?)\\times(\d+(?:\.\d+)?)\$/);
      return Number(m![1]) * Number(m![2]) > 0.1;
    });
  });

  it("2-4-6 곱이 10보다 큰가", () => {
    expectBoth("2-4-6", "08", (c) => {
      const m = c.match(/\$(\d+(?:\.\d+)?)\\times(\d+(?:\.\d+)?)\$/);
      return Number(m![1]) * Number(m![2]) > 10;
    });
  });
});
