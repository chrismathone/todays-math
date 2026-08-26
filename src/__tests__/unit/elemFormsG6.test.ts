/**
 * 초6 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
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
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `소단원 없음 ${code}`).toBeTruthy();
  return u!;
}

function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer);
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

function parseFrac(text: string): { n: number; d: number } | null {
  const mixed = /(\d+)\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (mixed) {
    const w = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    return { n: w * d + n, d };
  }
  const f = /\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (f) return { n: Number(f[1]), d: Number(f[2]) };
  const whole = /\$(\d+)\$/.exec(text);
  if (whole) return { n: Number(whole[1]), d: 1 };
  return null;
}

function expectFracEq(answer: string, num: number, den: number, label: string) {
  const got = parseFrac(answer);
  expect(got, `${label}: ${answer}`).toBeTruthy();
  expect(got!.n * den, label).toBe(got!.d * num);
}

describe("초6 1-1-1 (자연수)÷(자연수) — 묻는 대상이 답이다", () => {
  const unit = unitOf("1-1-1");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫은 나누어지는 수 / 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expectFracEq(p.answer, Number(m![1]), Number(m![2]), p.content);
    }
  });

  it("02 한 사람 몫은 양 / 인원", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "02");
      const m = p.content.match(
        /\$(\d+)\\,\\mathrm\{[A-Za-z]+\}\$.*?\$(\d+)\$명/,
      );
      expect(m, p.content).toBeTruthy();
      expectFracEq(p.answer, Number(m![1]), Number(m![2]), p.content);
    }
  });

  it("03 둘레÷변 또는 (전체-사용)÷인원", () => {
    const sidesOf: Record<string, number> = {
      삼: 3,
      사: 4,
      오: 5,
      육: 6,
      팔: 8,
    };
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "03");
      const poly = p.content.match(
        /둘레가 \$(\d+)\\,\\mathrm\{m\}\$ 인 정(삼|사|오|육|팔)각형/,
      );
      if (poly) {
        expectFracEq(p.answer, Number(poly[1]), sidesOf[poly[2]!]!, p.content);
        continue;
      }
      const cut = p.content.match(
        /\$(\d+)\\,\\mathrm\{m\}\$ 중에서 \$(\d+)\\,\\mathrm\{m\}\$.*?\$(\d+)\$명/,
      );
      expect(cut, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        Number(cut![1]) - Number(cut![2]),
        Number(cut![3]),
        p.content,
      );
    }
  });

  it("04 잘못 곱한 어떤 수÷k 또는 가장 큰÷가장 작은", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      const wrong = p.content.match(/어떤 수를 \$(\d+)\$/);
      const cards = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) =>
        Number(x[1]),
      );
      if (p.content.includes("수 카드")) {
        const nums = cards;
        expectFracEq(p.answer, Math.max(...nums), Math.min(...nums), p.content);
        continue;
      }
      expect(wrong, p.content).toBeTruthy();
      const k = Number(wrong![1]);
      const result = p.content.match(/곱했더니 \$(\d+)\$/);
      expect(result, p.content).toBeTruthy();
      const some = Number(result![1]) / k;
      expectFracEq(p.answer, some, k, p.content);
    }
  });

  it("05 분모는 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/분모/);
      expect(answerInt(p.answer)).toBe(Number(m![2]));
    }
  });

  it("06 분자는 나누어지는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(
        /나누어지는 수가 \$(\d+)\$, 나누는 수가 \$(\d+)\$/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/분자/);
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });

  it("07 역수 표기는 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      const m = p.content.match(/\$(\d+)\\div(\d+)=\\frac\{(\d+)\}\{(\d+)\}\$/);
      expect(m, p.content).toBeTruthy();
      expect(Number(m![1])).toBe(Number(m![4]));
      expect(Number(m![2])).toBe(Number(m![3]));
    }
  });

  it("08 같은 분모 두 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(/\$(\d+)\\div(\d+)\$.*?\$(\d+)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(m![2]).toBe(m![4]);
      expectFracEq(
        p.answer,
        Number(m![1]) + Number(m![3]),
        Number(m![2]),
        p.content,
      );
    }
  });

  it("09 한 사람 몫의 절반", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /\$(\d+)\\,\\mathrm\{[A-Za-z]+\}\$.*?\$(\d+)\$명/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/절반/);
      expectFracEq(p.answer, Number(m![1]), Number(m![2]) * 2, p.content);
    }
  });

  it("10 더 큰 몫", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = [...p.content.matchAll(/\$(\d+)\\div(\d+)\$/g)];
      expect(m.length, p.content).toBe(2);
      const a = Number(m[0]![1]);
      const b = Number(m[0]![2]);
      const c = Number(m[1]![1]);
      const d = Number(m[1]![2]);
      const left = a * d - c * b;
      if (left > 0) expectFracEq(p.answer, a, b, p.content);
      else expectFracEq(p.answer, c, d, p.content);
    }
  });
});

describe("초6 1-1-2 (분수)÷(자연수) — 분모에 곱한다", () => {
  const unit = unitOf("1-1-2");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫은 분자 / (분모×나누는 수)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/);
      expect(m, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        Number(m![1]),
        Number(m![2]) * Number(m![3]),
        p.content,
      );
    }
  });

  it("05 분모에 곱하는 수는 나누는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![3]));
    }
  });

  it("06 그대로 두는 분자는 원래 분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/분자/);
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });

  it("07 분자에 곱한 식은 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      expect(p.content).toMatch(/\\times/);
    }
  });

  it("08 같은 분모·같은 나누는 수 두 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = [...p.content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/g)];
      expect(m.length, p.content).toBe(2);
      expect(m[0]![2]).toBe(m[1]![2]);
      expect(m[0]![3]).toBe(m[1]![3]);
      const d = Number(m[0]![2]) * Number(m[0]![3]);
      expectFracEq(p.answer, Number(m[0]![1]) + Number(m[1]![1]), d, p.content);
    }
  });

  it("09 한 도막 × 이어 붙인 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const frac = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      const cuts = p.content.match(/똑같이 \$(\d+)\$도막/);
      const join = p.content.match(/그중 \$(\d+)\$도막/);
      expect(frac && cuts && join, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        Number(frac![1]) * Number(join![1]),
        Number(frac![2]) * Number(cuts![1]),
        p.content,
      );
    }
  });

  it("10 같은 분수를 다른 수로 나눈 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const frac = p.content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      const ks = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) => Number(x[1]));
      expect(frac, p.content).toBeTruthy();
      expect(ks.length).toBeGreaterThanOrEqual(2);
      const top = Number(frac![1]);
      const d = Number(frac![2]);
      const k = ks[0]!;
      const m = ks[1]!;
      expectFracEq(p.answer, top * (m - k), d * k * m, p.content);
    }
  });
});

function parseMixed(text: string): { w: number; t: number; d: number } | null {
  const m = /(\d+)\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
  if (!m) return null;
  return { w: Number(m[1]), t: Number(m[2]), d: Number(m[3]) };
}

function impOf(m: { w: number; t: number; d: number }): number {
  return m.w * m.d + m.t;
}

describe("초6 1-1-3 (대분수)÷(자연수) — 가분수로 고친 다음 나눈다", () => {
  const unit = unitOf("1-1-3");
  const sidesOf: Record<string, number> = {
    삼: 3,
    사: 4,
    오: 5,
    육: 6,
    팔: 8,
  };

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫은 가분수 분자 / (분모×나누는 수)", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const mix = parseMixed(p.content);
      const k = p.content.match(/\\div(\d+)/);
      expect(mix && k, p.content).toBeTruthy();
      expectFracEq(p.answer, impOf(mix!), mix!.d * Number(k![1]), p.content);
    }
  });

  it("05 가분수 분자는 자연수×분모+분자", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const mix = parseMixed(p.content);
      expect(mix, p.content).toBeTruthy();
      expect(p.content).toMatch(/가분수/);
      expect(answerInt(p.answer)).toBe(impOf(mix!));
    }
  });

  it("06 자연수 부분", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const mix = parseMixed(p.content);
      expect(mix, p.content).toBeTruthy();
      expect(p.content).toMatch(/자연수 부분/);
      expect(answerInt(p.answer)).toBe(mix!.w);
    }
  });

  it("07 분수 부분만 나눈 식은 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      expect(p.content).toMatch(/\\times/);
    }
  });

  it("08 두 대분수÷같은 수 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const mixes = [
        ...p.content.matchAll(/(\d+)\\frac\{(\d+)\}\{(\d+)\}\\div(\d+)/g),
      ];
      expect(mixes.length, p.content).toBe(2);
      expect(mixes[0]![4]).toBe(mixes[1]![4]);
      const k = Number(mixes[0]![4]);
      const a = {
        w: Number(mixes[0]![1]),
        t: Number(mixes[0]![2]),
        d: Number(mixes[0]![3]),
      };
      const b = {
        w: Number(mixes[1]![1]),
        t: Number(mixes[1]![2]),
        d: Number(mixes[1]![3]),
      };
      const d1 = a.d * k;
      const d2 = b.d * k;
      expectFracEq(p.answer, impOf(a) * d2 + impOf(b) * d1, d1 * d2, p.content);
    }
  });

  it("09 한 변×변의 수가 둘레", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const mix = parseMixed(p.content);
      const k = p.content.match(/똑같이 \$(\d+)\$도막/);
      const poly = p.content.match(/정(삼|사|오|육|팔)각형/);
      expect(mix && k && poly, p.content).toBeTruthy();
      expectFracEq(
        p.answer,
        impOf(mix!) * sidesOf[poly![1]!]!,
        mix!.d * Number(k![1]),
        p.content,
      );
    }
  });

  it("10 같은 대분수를 다른 수로 나눈 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const mix = parseMixed(p.content);
      const ks = [...p.content.matchAll(/\$(\d+)\$/g)].map((x) => Number(x[1]));
      expect(mix, p.content).toBeTruthy();
      expect(ks.length).toBeGreaterThanOrEqual(2);
      const k = ks[0]!;
      const n2 = ks[1]!;
      expectFracEq(
        p.answer,
        impOf(mix!) * (n2 - k),
        mix!.d * k * n2,
        p.content,
      );
    }
  });
});

const SINO_N: Record<string, number> = {
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
};

describe("초6 1-2-1 각기둥 밑면과 옆면 — 묻는 면이 답이다", () => {
  const unit = unitOf("1-2-1");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 옆면 수 = 밑면 변의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const byName = p.content.match(/^(삼|사|오|육|칠|팔)각기둥/);
      const byBase = p.content.match(/밑면이 (삼|사|오|육|칠|팔)각형/);
      const n = byName ? SINO_N[byName[1]!] : SINO_N[byBase![1]!];
      expect(n, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(n);
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("05 밑면은 2 · 06 옆면은 직사각형", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "05");
      expect(answerInt(a.answer)).toBe(2);
      expect(a.content).toMatch(/밑면/);
      expect(a.figureSpec).toBeTruthy();
      const b = generateElementaryForm(unit, seed, "06");
      expect(b.answer).toBe("직사각형");
      expect(b.figureSpec).toBeTruthy();
    }
  });

  it("07 이름에서 밑면 모양", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/^(삼|사|오|육|칠|팔)각기둥/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`${m![1]}각형`);
    }
  });

  it("08 옆면 하나 넓이 = 변×높이", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(
        /한 변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, 높이가 \$(\d+)\\,\\mathrm\{cm\}/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/옆면 하나/);
      expect(answerInt(p.answer)).toBe(Number(m![1]) * Number(m![2]));
    }
  });

  it("09 밑면 둘레 = 변의 수×한 변", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const poly = p.content.match(/밑면이 (삼|사|오|육|칠|팔)각형/);
      const a = p.content.match(/모두 \$(\d+)\\,\\mathrm\{cm\}/);
      expect(poly && a, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(SINO_N[poly![1]!]! * Number(a![1]));
    }
  });

  it("10 옆면 수 − 밑면 2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = p.content.match(/^(삼|사|오|육|칠|팔)각기둥/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(SINO_N[m![1]!]! - 2);
    }
  });
});

function sinoFrom(content: string): number | undefined {
  const m = content.match(/(삼|사|오|육|칠|팔)각(?:기둥|뿔)/);
  return m ? SINO_N[m[1]!] : undefined;
}

describe("초6 1-2-2 각기둥 이름과 구성 요소 — 세는 자리가 다르다", () => {
  const unit = unitOf("1-2-2");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("05 이름 앞의 수가 밑면 변의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const n = sinoFrom(p.content);
      expect(n, p.content).toBeTruthy();
      expect(p.content).toMatch(/변/);
      expect(answerInt(p.answer)).toBe(n);
    }
  });

  it("06 꼭짓점+면−모서리 = 2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.content).toMatch(/빼면/);
      expect(answerInt(p.answer)).toBe(2);
    }
  });

  it("07 한 밑면 꼭짓점 = 변의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const n = sinoFrom(p.content);
      expect(n, p.content).toBeTruthy();
      expect(p.content).toMatch(/한 밑면/);
      expect(answerInt(p.answer)).toBe(n);
    }
  });

  it("08 옆모서리 = 변의 수 · 09 밑면 모서리 = 2×변", () => {
    for (const seed of SEEDS) {
      const v = generateElementaryForm(unit, seed, "08");
      const n = sinoFrom(v.content);
      expect(n, v.content).toBeTruthy();
      expect(v.content).toMatch(/두 밑면을 잇는/);
      expect(answerInt(v.answer)).toBe(n);
      const e = generateElementaryForm(unit, seed, "09");
      const n2 = sinoFrom(e.content);
      expect(n2, e.content).toBeTruthy();
      expect(answerInt(e.answer)).toBe(2 * n2!);
    }
  });

  it("10 한 꼭짓점에서 만나는 모서리 3", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      expect(p.content).toMatch(/한 꼭짓점/);
      expect(answerInt(p.answer)).toBe(3);
      expect(p.figureSpec).toBeTruthy();
    }
  });
});

describe("초6 1-2-3 각기둥의 전개도 — 펼친 그림에서 묻는다", () => {
  const unit = unitOf("1-2-3");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("02 접으면 n각기둥", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "02");
      expect(p.answer).toMatch(/^[삼사오육칠팔]각기둥$/);
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("05 밑면이 되는 면 2 · 06 옆면은 직사각형", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "05");
      expect(a.content).toMatch(/전개도/);
      expect(answerInt(a.answer)).toBe(2);
      const b = generateElementaryForm(unit, seed, "06");
      expect(b.answer).toBe("직사각형");
    }
  });

  it("07 전개도 면 수 = 옆면+밑면2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const n = sinoFrom(p.content);
      expect(n, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(n! + 2);
    }
  });

  it("08 밑면 둘의 둘레 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const poly = p.content.match(/밑면이 (삼|사|오|육|칠|팔)각형/);
      const a = p.content.match(/모두 \$(\d+)\\,\\mathrm\{cm\}/);
      expect(poly && a, p.content).toBeTruthy();
      expect(p.content).toMatch(/두 면의 둘레/);
      expect(answerInt(p.answer)).toBe(2 * SINO_N[poly![1]!]! * Number(a![1]));
    }
  });

  it("09 접은 밑면은 n각형 · 10 옆면−밑면", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "09");
      expect(a.answer).toMatch(/^[삼사오육칠팔]각형$/);
      const b = generateElementaryForm(unit, seed, "10");
      const n = sinoFrom(b.content);
      expect(n, b.content).toBeTruthy();
      expect(answerInt(b.answer)).toBe(n! - 2);
    }
  });
});

describe("초6 1-2-4 각뿔 밑면과 옆면 — 밑면 1 · 옆면 삼각형", () => {
  const unit = unitOf("1-2-4");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 옆면 수 = 밑면 변의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const byName = p.content.match(/^(삼|사|오|육|칠|팔)각뿔/);
      const byBase = p.content.match(/밑면이 (삼|사|오|육|칠|팔)각형/);
      const n = byName ? SINO_N[byName[1]!] : SINO_N[byBase![1]!];
      expect(n, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(n);
      expect(p.figureSpec).toBeTruthy();
    }
  });

  it("05 밑면 1 · 06 옆면은 삼각형", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "05");
      expect(answerInt(a.answer)).toBe(1);
      expect(a.content).toMatch(/밑면/);
      const b = generateElementaryForm(unit, seed, "06");
      expect(b.answer).toBe("삼각형");
    }
  });

  it("07 이름에서 밑면 모양", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = p.content.match(/^(삼|사|오|육|칠|팔)각뿔/);
      expect(m, p.content).toBeTruthy();
      expect(p.answer).toBe(`${m![1]}각형`);
    }
  });

  it("08 옆면 하나 넓이 = 밑변×높이÷2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = p.content.match(
        /한 변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$, 옆면인 삼각형의 높이가 \$(\d+)\\,\\mathrm\{cm\}/,
      );
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe((Number(m![1]) * Number(m![2])) / 2);
    }
  });

  it("09 밑면 둘레 · 10 옆면−밑면1", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "09");
      const poly = a.content.match(/밑면이 (삼|사|오|육|칠|팔)각형/);
      const side = a.content.match(/모두 \$(\d+)\\,\\mathrm\{cm\}/);
      expect(poly && side, a.content).toBeTruthy();
      expect(answerInt(a.answer)).toBe(SINO_N[poly![1]!]! * Number(side![1]));
      const b = generateElementaryForm(unit, seed, "10");
      const n = sinoFrom(b.content);
      expect(n, b.content).toBeTruthy();
      expect(answerInt(b.answer)).toBe(n! - 1);
    }
  });
});

describe("초6 1-2-5 각뿔 이름과 구성 요소 — 밑면과 꼭짓점을 가른다", () => {
  const unit = unitOf("1-2-5");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("05 이름 앞의 수가 밑면 변의 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const n = sinoFrom(p.content);
      expect(n, p.content).toBeTruthy();
      expect(p.content).toMatch(/변/);
      expect(answerInt(p.answer)).toBe(n);
    }
  });

  it("06 꼭짓점+면−모서리 = 2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.content).toMatch(/빼면/);
      expect(answerInt(p.answer)).toBe(2);
    }
  });

  it("07 밑면 위 꼭짓점 = 변의 수 · 08 옆모서리 = 변의 수", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "07");
      const n = sinoFrom(a.content);
      expect(n, a.content).toBeTruthy();
      expect(a.content).toMatch(/밑면 위에 놓인 꼭짓점/);
      expect(answerInt(a.answer)).toBe(n);
      const b = generateElementaryForm(unit, seed, "08");
      const n2 = sinoFrom(b.content);
      expect(n2, b.content).toBeTruthy();
      expect(b.content).toMatch(/잇는 모서리/);
      expect(answerInt(b.answer)).toBe(n2);
    }
  });

  it("09 밑면을 이루는 모서리 · 10 밑면에 없는 꼭짓점 1", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "09");
      const n = sinoFrom(a.content);
      expect(n, a.content).toBeTruthy();
      expect(a.content).toMatch(/밑면을 이루는 모서리/);
      expect(answerInt(a.answer)).toBe(n);
      const b = generateElementaryForm(unit, seed, "10");
      expect(b.content).toMatch(/밑면에 있지 않은 꼭짓점/);
      expect(answerInt(b.answer)).toBe(1);
      expect(b.figureSpec).toBeTruthy();
    }
  });
});

function centsOf(text: string): number {
  const m = /([0-9]+(?:\.[0-9]+)?)/.exec(text);
  expect(m, text).toBeTruthy();
  return Math.round(Number(m![1]) * 100);
}

function answerCents(answer: string): number {
  const m = /^\$([0-9]+(?:\.[0-9]+)?)\$$/.exec(answer);
  expect(m, `소수 답이 아님: ${answer}`).toBeTruthy();
  return Math.round(Number(m![1]) * 100);
}

describe("초6 1-3-1 (소수)÷(자연수) — 몫이 1보다 크다", () => {
  const unit = unitOf("1-3-1");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫 × 나누는 수 = 나누어지는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)=\\square\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerCents(p.answer) * Number(m![2])).toBe(centsOf(m![1]!));
    }
  });

  it("05 나누는 수는 오른쪽 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\\div(\d+)/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]));
    }
  });

  it("06 몫의 정수 부분", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/=(\d+(?:\.\d+)?)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Math.floor(Number(m![1])));
    }
  });

  it("07 몫이 1보다 작다는 말은 아니요", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      expect(p.answer).toBe("아니요");
      expect(p.content).toMatch(/작다/);
    }
  });

  it("08 두 몫의 합", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "08");
      const m = [...p.content.matchAll(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)\$/g)];
      expect(m.length, p.content).toBe(2);
      const q1 = centsOf(m[0]![1]!) / Number(m[0]![2]);
      const q2 = centsOf(m[1]![1]!) / Number(m[1]![2]);
      expect(answerCents(p.answer)).toBe(Math.round(q1 + q2));
    }
  });

  it("09 한 몫에서 쓰고 남은 양", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const total = p.content.match(
        /\$([0-9]+(?:\.[0-9]+)?)\\,\\mathrm\{[A-Za-z]+\}/,
      );
      const bottles = p.content.match(/\$(\d+)\$개에/);
      const used = [
        ...p.content.matchAll(
          /\$([0-9]+(?:\.[0-9]+)?)\\,\\mathrm\{[A-Za-z]+\}/g,
        ),
      ];
      expect(total && bottles && used.length >= 2, p.content).toBeTruthy();
      const q = centsOf(total![1]!) / Number(bottles![1]);
      const u = centsOf(used[1]![1]!);
      expect(answerCents(p.answer)).toBe(q - u);
    }
  });

  it("10 두 몫의 차", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      const m = [...p.content.matchAll(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)\$/g)];
      expect(m.length, p.content).toBe(2);
      const q1 = centsOf(m[0]![1]!) / Number(m[0]![2]);
      const q2 = centsOf(m[1]![1]!) / Number(m[1]![2]);
      expect(answerCents(p.answer)).toBe(
        Math.abs(Math.round(q1) - Math.round(q2)),
      );
    }
  });
});

describe("초6 1-3-2 몫이 1보다 작은 (소수)÷(자연수)", () => {
  const unit = unitOf("1-3-2");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫 × 나누는 수 = 나누어지는 수 · 몫<1", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)=\\square\$/);
      expect(m, p.content).toBeTruthy();
      const q = answerCents(p.answer);
      expect(q).toBeLessThan(100);
      expect(q * Number(m![2])).toBe(centsOf(m![1]!));
    }
  });

  it("05 자연수 부분은 0", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(p.content).toMatch(/자연수 부분/);
      expect(answerInt(p.answer)).toBe(0);
    }
  });

  it("06 나누어지는 수가 더 작다 예 · 07 몫이 더 크다 아니요", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "06").answer).toBe("예");
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("아니요");
    }
  });

  it("08 두 몫의 합 · 10 두 몫의 차", () => {
    for (const seed of SEEDS) {
      const s = generateElementaryForm(unit, seed, "08");
      const sm = [
        ...s.content.matchAll(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)\$/g),
      ];
      expect(sm.length, s.content).toBe(2);
      const sq1 = centsOf(sm[0]![1]!) / Number(sm[0]![2]);
      const sq2 = centsOf(sm[1]![1]!) / Number(sm[1]![2]);
      expect(answerCents(s.answer)).toBe(Math.round(sq1 + sq2));
      const d = generateElementaryForm(unit, seed, "10");
      const dm = [
        ...d.content.matchAll(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)\$/g),
      ];
      expect(dm.length, d.content).toBe(2);
      const dq1 = centsOf(dm[0]![1]!) / Number(dm[0]![2]);
      const dq2 = centsOf(dm[1]![1]!) / Number(dm[1]![2]);
      expect(answerCents(d.answer)).toBe(
        Math.abs(Math.round(dq1) - Math.round(dq2)),
      );
    }
  });

  it("09 한 도막 × 이어 붙인 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const len = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\,\\mathrm\{m\}/);
      const cuts = p.content.match(/똑같이 \$(\d+)\$도막/);
      const join = p.content.match(/그중 \$(\d+)\$도막/);
      expect(len && cuts && join, p.content).toBeTruthy();
      const one = centsOf(len![1]!) / Number(cuts![1]);
      expect(answerCents(p.answer)).toBe(one * Number(join![1]));
    }
  });
});

describe("초6 1-3-3 소수점 아래 0을 내려 계산", () => {
  const unit = unitOf("1-3-3");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫 × 나누는 수 = 나누어지는 수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)=\\square\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerCents(p.answer) * Number(m![2])).toBe(centsOf(m![1]!));
    }
  });

  it("05 나누는 수 · 06 소수 둘째 자리 숫자", () => {
    for (const seed of SEEDS) {
      const a = generateElementaryForm(unit, seed, "05");
      const d = a.content.match(/\\div(\d+)/);
      expect(d, a.content).toBeTruthy();
      expect(answerInt(a.answer)).toBe(Number(d![1]));
      const b = generateElementaryForm(unit, seed, "06");
      const q = b.content.match(/=(\d+\.\d+)\$/);
      expect(q, b.content).toBeTruthy();
      const frac = q![1]!.split(".")[1] ?? "";
      expect(frac.length).toBeGreaterThanOrEqual(2);
      expect(answerInt(b.answer)).toBe(Number(frac[1]));
    }
  });

  it("07 0을 내린다는 말은 예", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("예");
    }
  });

  it("09 이틀치 = 하루×2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const km = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\,\\mathrm\{km\}/);
      const days = p.content.match(/\$(\d+)\$일 동안 매일/);
      expect(km && days, p.content).toBeTruthy();
      const one = centsOf(km![1]!) / Number(days![1]);
      expect(answerCents(p.answer)).toBe(one * 2);
    }
  });
});

describe("초6 1-3-4 몫의 소수 첫째 자리에 0", () => {
  const unit = unitOf("1-3-4");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 몫 × 나누는 수 = 나누어지는 수 · 소수 첫째 0", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)=\\square\$/);
      expect(m, p.content).toBeTruthy();
      const q = answerCents(p.answer);
      expect(Math.floor(q / 10) % 10).toBe(0);
      expect(q * Number(m![2])).toBe(centsOf(m![1]!));
    }
  });

  it("06 소수 첫째 자리 숫자는 0", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(answerInt(p.answer)).toBe(0);
      expect(p.content).toMatch(/첫째 자리/);
    }
  });

  it("09 검산 곱 = 전체 길이", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\,\\mathrm\{m\}/);
      expect(m, p.content).toBeTruthy();
      expect(answerCents(p.answer)).toBe(centsOf(m![1]!));
    }
  });
});

describe("초6 1-3-5 (자연수)÷(자연수) 몫을 소수로", () => {
  const unit = unitOf("1-3-5");

  it("등록이 10개", () => {
    expect(listedForms(unit)).toHaveLength(10);
  });

  it("01 자연수÷자연수의 몫이 소수", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "01");
      const m = p.content.match(/\$(\d+)\\div(\d+)=\\square\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerCents(p.answer) * Number(m![2])).toBe(Number(m![1]) * 100);
    }
  });

  it("06 나누어지는 수는 자연수 예 · 07 몫은 자연수 아니요", () => {
    for (const seed of SEEDS) {
      expect(generateElementaryForm(unit, seed, "06").answer).toBe("예");
      expect(generateElementaryForm(unit, seed, "07").answer).toBe("아니요");
    }
  });

  it("09 두 사람 몫 = 한 사람×2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const amt = p.content.match(
        /\$(\d+)\\,\\mathrm\{[A-Za-z]+\}\$.*?\$(\d+)\$명/,
      );
      expect(amt, p.content).toBeTruthy();
      expect(p.content).toMatch(/두 사람/);
      expect(answerCents(p.answer) * Number(amt![2])).toBe(
        Number(amt![1]) * 100 * 2,
      );
    }
  });
});

describe("초6 1-4 비와 비율", () => {
  it("1-4-1 05 어떤 수 × k = 큰 수", () => {
    const unit = unitOf("1-4-1");
    expect(listedForms(unit)).toHaveLength(10);
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$.*?\$(\d+)\$배/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer) * Number(m![2])).toBe(Number(m![1]));
    }
  });

  it("1-4-2 06 앞항 · 07 뒷항 · 08 합", () => {
    const unit = unitOf("1-4-2");
    expect(listedForms(unit)).toHaveLength(10);
    for (const seed of SEEDS) {
      const f = generateElementaryForm(unit, seed, "06");
      const ratio = f.content.match(/\$(\d+):(\d+)\$/);
      expect(ratio, f.content).toBeTruthy();
      expect(answerInt(f.answer)).toBe(Number(ratio![1]));
      const b = generateElementaryForm(unit, seed, "07");
      const r2 = b.content.match(/\$(\d+):(\d+)\$/);
      expect(answerInt(b.answer)).toBe(Number(r2![2]));
      const s = generateElementaryForm(unit, seed, "08");
      const r3 = s.content.match(/\$(\d+):(\d+)\$/);
      expect(answerInt(s.answer)).toBe(Number(r3![1]) + Number(r3![2]));
    }
  });

  it("1-4-5 08 두 %의 합 · 09 나머지 %", () => {
    const unit = unitOf("1-4-5");
    expect(listedForms(unit)).toHaveLength(10);
    for (const seed of SEEDS) {
      const s = generateElementaryForm(unit, seed, "08");
      const ps = [...s.content.matchAll(/\$(\d+)\\%\$/g)].map((x) =>
        Number(x[1]),
      );
      expect(ps.length).toBeGreaterThanOrEqual(2);
      expect(answerInt(s.answer)).toBe(ps[0]! + ps[1]!);
      const r = generateElementaryForm(unit, seed, "09");
      const p = r.content.match(/\$(\d+)\\%\$/);
      expect(p, r.content).toBeTruthy();
      expect(answerInt(r.answer)).toBe(100 - Number(p![1]));
    }
  });
});
