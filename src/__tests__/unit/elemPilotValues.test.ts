/**
 * 파일럿 새 틀 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/generate";

const SEEDS = [20260826, 7, 1009, 7919, 4242, 17, 99, 31337, 555, 42];

function unitOf(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(code),
  );
  expect(u).toBeTruthy();
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

describe("초3 2-3-1 원 — 묻는 대상이 답이다", () => {
  const unit = unitOf("초3", "2-3-1");

  it("01 그림 선분 이름은 지름 또는 반지름", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      expect(["지름", "반지름"]).toContain(p.answer);
      expect(p.content).toMatch(/굵게 그린 선분/);
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("05·06 정의는 반지름·지름", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "05").answer).toBe("반지름");
      expect(generateElementaryForm(unit, seed, "06").answer).toBe("지름");
    }
  });

  it("07 지름의 중점은 원의 중심", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.content).toMatch(/중점/);
      expect(p.answer).toBe("원의 중심");
    }
  });

  it("08 가장 긴 현은 지름 · 09 반대 반지름은 지름 · 10 반 접기는 반지름", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "08").answer).toBe("지름");
      expect(generateElementaryForm(unit, seed, "09").answer).toBe("지름");
      expect(generateElementaryForm(unit, seed, "10").answer).toBe("반지름");
    }
  });
});

describe("초4 1-6-5 등호 — 발문 식으로 □를 다시 푼다", () => {
  const unit = unitOf("초4", "1-6-5");

  it("05 왼쪽 빈칸 □+a=b+c", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const eq = p.content.match(/\$\\square\+(\d+)=(\d+)\+(\d+)\$/);
      expect(eq, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(eq![2]) + Number(eq![3]) - Number(eq![1]),
      );
    }
  });

  it("06 교환 a+b=b+□ 의 □는 a", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const eq = p.content.match(/\$(\d+)\+(\d+)=\2\+\\square\$/);
      expect(eq, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(eq![1]));
    }
  });

  it("07 a+□+c=s", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const eq = p.content.match(/\$(\d+)\+\\square\+(\d+)=(\d+)\$/);
      expect(eq, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(eq![3]) - Number(eq![1]) - Number(eq![2]),
      );
    }
  });

  it("08 a-b=c-□", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const eq = p.content.match(/\$(\d+)-(\d+)=(\d+)-\\square\$/);
      expect(eq, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(eq![3]) - (Number(eq![1]) - Number(eq![2])),
      );
    }
  });

  it("09 □-a=b+c", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const eq = p.content.match(/\$\\square-(\d+)=(\d+)\+(\d+)\$/);
      expect(eq, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        Number(eq![1]) + Number(eq![2]) + Number(eq![3]),
      );
    }
  });

  it("10 a+b=□×c", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const eq = p.content.match(/\$(\d+)\+(\d+)=\\square\\times(\d+)\$/);
      expect(eq, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(
        (Number(eq![1]) + Number(eq![2])) / Number(eq![3]),
      );
    }
  });

  it("기존 02·03 도 등호 양변이 같아진다", () => {
    for (const seed of SEEDS) {
      const basic = generateElementaryForm(unit, seed, "02");
      const eq = basic.content.match(/\$(\d+)\+(\d+)\+(\d+)=(\d+)\+\\square\$/);
      expect(eq, basic.content).toBeTruthy();
      expect(answerInt(basic.answer)).toBe(
        Number(eq![1]) + Number(eq![2]) + Number(eq![3]) - Number(eq![4]),
      );
    }
  });
});

describe("초5 2-5-1 직육면체 — 개수는 치수와 무관, 합은 치수로", () => {
  const unit = unitOf("초5", "2-5-1");

  it("01 모서리 합 = 4(w+d+h)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const [w, d, h] = katexInts(p.content);
      expect(w && d && h).toBeTruthy();
      expect(answerInt(p.answer)).toBe(4 * (w! + d! + h!));
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("02 면 6 · 05 꼭짓점 8 · 06 모서리 12", () => {
    for (const seed of SEEDS) {
      expect(answerInt(generateElementaryForm(unit, seed, "02").answer)).toBe(
        6,
      );
      expect(answerInt(generateElementaryForm(unit, seed, "05").answer)).toBe(
        8,
      );
      expect(answerInt(generateElementaryForm(unit, seed, "06").answer)).toBe(
        12,
      );
    }
  });

  it("07 합동 면 3쌍 · 08 한 꼭짓점 모서리 3 · 09 면 종류 3 · 10 지정 면 2", () => {
    for (const seed of SEEDS) {
      expect(answerInt(generateElementaryForm(unit, seed, "07").answer)).toBe(
        3,
      );
      expect(answerInt(generateElementaryForm(unit, seed, "08").answer)).toBe(
        3,
      );
      expect(answerInt(generateElementaryForm(unit, seed, "09").answer)).toBe(
        3,
      );
      expect(answerInt(generateElementaryForm(unit, seed, "10").answer)).toBe(
        2,
      );
    }
  });

  it("03 역산 높이 = 합/4 − 가로 − 세로", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const nums = katexInts(p.content);
      const total = nums[0]!;
      const w = nums[1]!;
      const d = nums[2]!;
      expect(answerInt(p.answer)).toBe(total / 4 - w - d);
    }
  });
});

describe("등록부가 10을 가리킨다", () => {
  it("세 소단원 listedForms 길이 합이 30", () => {
    const n = [
      unitOf("초3", "2-3-1"),
      unitOf("초4", "1-6-5"),
      unitOf("초5", "2-5-1"),
    ].reduce((s, u) => s + listedForms(u).length, 0);
    expect(n).toBe(30);
  });
});
