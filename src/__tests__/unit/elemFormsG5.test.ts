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
