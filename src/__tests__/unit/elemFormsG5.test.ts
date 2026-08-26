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
