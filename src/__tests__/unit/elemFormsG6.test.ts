/**
 * 초6 문형 — 참은 발문에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  coreForms,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";
import { EXTENDING_FORM_IDS } from "@/lib/elementary/difficulty";

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
    expect(coreForms(unit)).toHaveLength(10);
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
        /둘레가 \$(\d+)\\,\\mathrm\{m\}\$인 정(삼|사|오|육|팔)각형/,
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
      const m = p.content.match(/\$([0-9]+(?:\.[0-9]+)?)\\div(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(p.content).not.toMatch(/=/);
      expect(answerInt(p.answer)).toBe(
        Math.floor(Number(m![1]) / Number(m![2])),
      );
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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

  it("09 상자 두 개 길이는 전체÷개수×2", () => {
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "09");
      const m = p.content.match(
        /\$([0-9]+(?:\.[0-9]+)?)\\,\\mathrm\{m\}\$를 모두 사용하여.*?상자 \$(\d+)\$개/,
      );
      expect(m, p.content).toBeTruthy();
      expect(p.content).toMatch(/상자 \$2\$개/);
      expect(answerCents(p.answer) * Number(m![2])).toBe(centsOf(m![1]!) * 2);
    }
  });
});

describe("초6 1-3-5 (자연수)÷(자연수) 몫을 소수로", () => {
  const unit = unitOf("1-3-5");

  it("등록이 10개", () => {
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+)\$.*?\$(\d+)\$배/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer) * Number(m![2])).toBe(Number(m![1]));
    }
  });

  it("1-4-2 06 앞항 · 07 뒷항 · 08 합", () => {
    const unit = unitOf("1-4-2");
    expect(coreForms(unit)).toHaveLength(10);
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
    expect(coreForms(unit)).toHaveLength(10);
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

describe("초6 전량 문형 — 기본 01–10, 확대 갈래는 11·12", () => {
  const CORE_IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];

  it("소단원마다 기본 01–10", () => {
    const units = elementaryUnits().filter((u) => u.grade === "초6");
    expect(units.length).toBe(56);
    for (const u of units) {
      expect(
        coreForms(u).map((f) => f.id),
        u.section,
      ).toEqual(CORE_IDS);
    }
  });

  /**
   * 🔴 문형 12(D-114) — **확대 갈래를 채우면 문형도 따라와야 한다.**
   *
   * 이것이 D-114 가 막으려는 바로 그 결함이다: 갈래만 채우면 계량기는
   * 「다 찼다」고 하는데 적재기(`generateElementaryForm`)는 문형만 돌아
   * **지면에 한 건도 안 나간다.** 그래서 여기서는 문형 목록을 **갈래에서**
   * 유도해 대조한다 — 손으로 적은 기대값이 아니다.
   *
   * ⚠️ 「전부 12개」로 못 박지 마라 — 확대 갈래는 선택이라 채우는 내내 빨갛다.
   */
  it("확대 갈래를 채운 소단원은 문형 11·12 가 따라왔다", () => {
    const units = elementaryUnits().filter((u) => u.grade === "초6");
    let withExtending = 0;
    for (const u of units) {
      const want = [
        ...CORE_IDS,
        ...EXTENDING_FORM_IDS.filter(([tier]) =>
          supportedTiers(u).includes(tier),
        ).map(([, id]) => id),
      ];
      if (want.length > CORE_IDS.length) withExtending += 1;
      // 그림 문형 21~ · 진술 문형 31 · 32 는 이 축 밖이라 뺀다(`figureForms.ts` · `statementForms.ts`).
      expect(
        listedForms(u)
          .map((f) => f.id)
          .filter((id) => Number(id) < 21),
        u.section,
      ).toEqual(want);
      // 갈래와 문형이 **같은 함수**를 가리키는지까지 본다 — id 만 맞고
      // 다른 생성기를 달면 지면이 조용히 갈린다.
      for (const [tier, id] of EXTENDING_FORM_IDS) {
        if (!supportedTiers(u).includes(tier)) continue;
        const form = listedForms(u).find((f) => f.id === id)!;
        expect(form.tier, `${u.section} 문형 ${id}`).toBe(tier);
      }
    }
    // 음성 대조 — 하나도 안 채워졌으면 이 시험은 아무것도 안 지킨다.
    expect(
      withExtending,
      "초6 에 확대 갈래를 채운 소단원이 하나도 없다 — 이 시험이 장식이 된다",
    ).toBeGreaterThan(0);
  });
});

describe("초6 1-6-2 부피 — 밑면의 넓이와 높이를 가른다", () => {
  it("05 밑면은 가로×세로 · 06 은 부피÷밑면", () => {
    const unit = unitOf("1-6-2");
    for (const seed of SEEDS) {
      const base = generateElementaryForm(unit, seed, "05");
      const m = base.content.match(
        /가로가 \$(\d+)\\,\\mathrm\{cm\}\$, 세로가 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      expect(m, base.content).toBeTruthy();
      expect(base.content).toMatch(/밑면의 넓이/);
      expect(answerInt(base.answer)).toBe(Number(m![1]) * Number(m![2]));
      const h = generateElementaryForm(unit, seed, "06");
      const hm = h.content.match(
        /부피가 \$(\d+)\$ cm³이고 밑면의 넓이가 \$(\d+)\$ cm²/,
      );
      expect(hm, h.content).toBeTruthy();
      expect(answerInt(h.answer) * Number(hm![2])).toBe(Number(hm![1]));
      expect(h.content).not.toMatch(/높이가 \$/);
    }
  });
});

describe("초6 2-3 쌓기나무 — 묻는 칸이 답이다", () => {
  it("2-3-1 05 한 층만 · 06 최고층 칸은 발문의 가로가 아니다", () => {
    const unit = unitOf("2-3-1");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const cols = Number(p.content.match(/가로 \$(\d+)\$칸/)![1]);
      expect(p.content).toMatch(/한 층만/);
      expect(answerInt(p.answer)).toBeGreaterThanOrEqual(0);
      expect(p.content).toContain(`가로 $${cols}$칸`);
      const q = generateElementaryForm(unit, seed, "06");
      expect(q.content).toMatch(/가장 높은 층과 같은/);
      expect(answerInt(q.answer)).toBeGreaterThan(0);
    }
  });

  it("2-3-1 07 바닥 칸", () => {
    const unit = unitOf("2-3-1");
    for (const seed of SEEDS) {
      const floor = generateElementaryForm(unit, seed, "07");
      const cols = Number(floor.content.match(/가로 \$(\d+)\$칸/)![1]);
      const r = Number(floor.content.match(/세로 \$(\d+)\$칸/)![1]);
      expect(answerInt(floor.answer)).toBe(cols * r);
    }
  });

  it("2-3-2 10 전체−놓인 칸은 음이 아니다", () => {
    const unit = unitOf("2-3-2");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "10");
      expect(answerInt(p.answer)).toBeGreaterThanOrEqual(0);
      expect(p.content).toMatch(/빼면/);
    }
  });
});

describe("초6 2-4 비례식과 비례배분", () => {
  it("2-4-1 06 전항은 a×k · 07 후항은 b×k", () => {
    const unit = unitOf("2-4-1");
    for (const seed of SEEDS) {
      const f = generateElementaryForm(unit, seed, "06");
      const m = f.content.match(/\$(\d+):(\d+)\$/);
      const k = f.content.match(/각각 \$(\d+)\$/);
      expect(m, f.content).toBeTruthy();
      expect(k, f.content).toBeTruthy();
      expect(answerInt(f.answer)).toBe(Number(m![1]) * Number(k![1]));
      const b = generateElementaryForm(unit, seed, "07");
      const m2 = b.content.match(/\$(\d+):(\d+)\$/);
      const k2 = b.content.match(/각각 \$(\d+)\$/);
      expect(answerInt(b.answer)).toBe(Number(m2![2]) * Number(k2![1]));
    }
  });

  it("2-4-2 05 나누는 수는 두 항의 공약수", () => {
    const unit = unitOf("2-4-2");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+):(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      const g = answerInt(p.answer);
      expect(a % g).toBe(0);
      expect(b % g).toBe(0);
      expect(g).toBeGreaterThan(1);
    }
  });

  it("2-4-5 05 묶음 수는 두 항의 합", () => {
    const unit = unitOf("2-4-5");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const m = p.content.match(/\$(\d+):(\d+)\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) + Number(m![2]));
    }
  });
});

describe("초6 2-5 원의 둘레와 넓이", () => {
  it("2-5-1 06 지름은 반지름의 두 배", () => {
    const unit = unitOf("2-5-1");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      const m = p.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
      expect(m, p.content).toBeTruthy();
      expect(answerInt(p.answer)).toBe(Number(m![1]) * 2);
    }
  });

  it("2-5-2 05 지름 · 08 원주=6r", () => {
    const unit = unitOf("2-5-2");
    for (const seed of SEEDS) {
      const d = generateElementaryForm(unit, seed, "05");
      const rm = d.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
      expect(rm, d.content).toBeTruthy();
      expect(answerInt(d.answer)).toBe(Number(rm![1]) * 2);
      const c = generateElementaryForm(unit, seed, "08");
      const r = Number(
        c.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/)![1],
      );
      expect(answerInt(c.answer)).toBe(6 * r);
    }
  });

  it("2-5-4 05 r² · 10 두 배면 넓이 4배", () => {
    const unit = unitOf("2-5-4");
    for (const seed of SEEDS) {
      const sq = generateElementaryForm(unit, seed, "05");
      const r = Number(
        sq.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/)![1],
      );
      expect(answerInt(sq.answer)).toBe(r * r);
      const sc = generateElementaryForm(unit, seed, "10");
      expect(answerInt(sc.answer)).toBe(4);
    }
  });
});

describe("초6 2-6 원기둥·원뿔·구", () => {
  it("2-6-1 05 밑면 2 · 10 반지름은 지름÷2", () => {
    const unit = unitOf("2-6-1");
    for (const seed of SEEDS) {
      const b = generateElementaryForm(unit, seed, "05");
      expect(answerInt(b.answer)).toBe(2);
      const r = generateElementaryForm(unit, seed, "10");
      const d = Number(
        r.content.match(/지름이 \$(\d+)\\,\\mathrm\{cm\}\$/)![1],
      );
      expect(answerInt(r.answer)).toBe(d / 2);
    }
  });

  it("2-6-2 07 전개도 면 3 · 09 지름=2r", () => {
    const unit = unitOf("2-6-2");
    for (const seed of SEEDS) {
      const f = generateElementaryForm(unit, seed, "07");
      expect(answerInt(f.answer)).toBe(3);
      const d = generateElementaryForm(unit, seed, "09");
      const rm = d.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
      expect(rm, d.content).toBeTruthy();
      expect(answerInt(d.answer)).toBe(Number(rm![1]) * 2);
    }
  });

  it("2-6-3 05 밑면 1 · 07 반지름+높이", () => {
    const unit = unitOf("2-6-3");
    for (const seed of SEEDS) {
      const b = generateElementaryForm(unit, seed, "05");
      expect(answerInt(b.answer)).toBe(1);
      const s = generateElementaryForm(unit, seed, "07");
      const rm = s.content.match(
        /반지름이 \$(\d+)\\,\\mathrm\{cm\}\$이고 높이가 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      expect(rm, s.content).toBeTruthy();
      expect(answerInt(s.answer)).toBe(Number(rm![1]) + Number(rm![2]));
    }
  });

  it("2-6-4 06 반지름+지름=3r · 10 둘레=6r (원주율 3)", () => {
    const unit = unitOf("2-6-4");
    for (const seed of SEEDS) {
      const d = generateElementaryForm(unit, seed, "06");
      const r = Number(
        d.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/)![1],
      );
      expect(answerInt(d.answer)).toBe(3 * r);
      const c = generateElementaryForm(unit, seed, "10");
      const r2 = Number(
        c.content.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/)![1],
      );
      expect(answerInt(c.answer)).toBe(6 * r2);
    }
  });
});
