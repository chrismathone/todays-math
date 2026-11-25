import { describe, expect, it } from "vitest";

import { createRng } from "../../lib/elementary/rng";
import { generateMiddleProblem } from "../../lib/middle/generate";
import { evalTex } from "../../lib/middle/judge/texArith";
import { M1_TEXTBOOK_NUMBER } from "../../lib/middle/m1TextbookNumber";
import { assertChooseAllAnswerCount } from "../../lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "../../lib/problem/choiceCountRule";

const math = (s: string) => [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
const marks = ["①", "②", "③", "④", "⑤"];
const parts = (s: string) => s.split("\n").filter((l) => /^\(\d\)/.test(l));

function value(s: string): bigint {
  const v = evalTex(s);
  if (!v || v.n % v.d !== BigInt(0)) throw new Error(`정수가 아님: ${s}`);
  return v.n / v.d;
}

// 생성기는 소인수 지수를 합성한다. 시험은 지면을 읽어 약수/배수를 전수 탐색한다.
function divisors(ns: bigint[]): bigint[] {
  const min = ns.reduce((a, b) => (a < b ? a : b));
  const result: bigint[] = [];
  for (let d = BigInt(1); d <= min; d++) {
    if (ns.every((n) => n % d === BigInt(0))) result.push(d);
  }
  return result;
}

function commonMultiple(ns: bigint[]): bigint {
  const step = ns.reduce((a, b) => (a > b ? a : b));
  for (let n = step; n <= BigInt(10000); n += step) {
    if (ns.every((d) => n % d === BigInt(0))) return n;
  }
  throw new Error("최소공배수 상한 초과");
}

function prime(n: bigint): boolean {
  return n > BigInt(1) && divisors([n]).length === 2;
}

function rangeValues(content: string): bigint[] {
  if (content.includes("두 자리"))
    return Array.from({ length: 90 }, (_, i) => BigInt(i + 10));
  const lower = /\$([^$]+)\$(이상|초과)/.exec(content.replaceAll("$ ", "$"));
  const upper = /\$([^$]+)\$(이하|미만)/.exec(content.replaceAll("$ ", "$"));
  if (!upper) throw new Error(`범위 상한을 못 읽음: ${content}`);
  const lo = lower
    ? value(lower[1]!) + BigInt(lower[2] === "초과" ? 1 : 0)
    : BigInt(1);
  const hi = value(upper[1]!) - BigInt(upper[2] === "미만" ? 1 : 0);
  const ns: bigint[] = [];
  for (let n = lo; n <= hi; n++) ns.push(n);
  return ns;
}

describe("T1 자연수 새 유형 — 표시된 수를 독립 검산", () => {
  it("기존 키와 분리된 아홉 유형을 정의한다", () => {
    expect(M1_TEXTBOOK_NUMBER.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 9 }, (_, i) => `N${String(i + 1).padStart(2, "0")}`),
    );
    expect(new Set(M1_TEXTBOOK_NUMBER.map((e) => e.key)).size).toBe(9);
  });

  for (const code of [
    "N01",
    "N02",
    "N03",
    "N04",
    "N05",
    "N06",
    "N07",
    "N08",
    "N09",
  ]) {
    it(`${code}: 120 씨앗의 결정성·표시값·정답·순서·보기 규칙`, () => {
      const entry = M1_TEXTBOOK_NUMBER.find((e) => e.rpmType === code)!;
      const contents = new Set<string>();
      const subcounts = new Set<number>();
      const forms = new Set<number>();
      const countModes = new Set<string>();
      for (let seed = 0; seed < 120; seed++) {
        const p = entry.handler(createRng(seed));
        expect(entry.handler(createRng(seed))).toEqual(p);
        contents.add(p.content);
        assertChooseAllAnswerCount(p.content, p.answer, code);
        assertChoiceCount(p.content, code);
        assertChoiceMarks(p.content, code);
        expect(p.content + p.answer + p.solution).not.toMatch(
          /\^\{[01]\}|\\dfrac\{[^}]+\}\{[01]\}/,
        );
        const questionParts = parts(p.content);
        if (questionParts.length) {
          subcounts.add(questionParts.length);
          expect(parts(p.answer).map((l) => l.slice(0, 3))).toEqual(
            questionParts.map((_, i) => `(${i + 1})`),
          );
        }

        if (code === "N02" && p.content.includes("가장 가까운")) {
          const [a, b, target] = math(p.content).map(value) as [
            bigint,
            bigint,
            bigint,
          ];
          const lcm = commonMultiple([a, b]);
          const multiples: bigint[] = [];
          for (let n = BigInt(1); n <= target + lcm; n++) {
            if (n % a === BigInt(0) && n % b === BigInt(0)) multiples.push(n);
          }
          const distance = (n: bigint) =>
            n > target ? n - target : target - n;
          const ordered = multiples.sort((x, y) =>
            Number(distance(x) - distance(y)),
          );
          expect(distance(ordered[0]!)).toBeLessThan(distance(ordered[1]!));
          expect(value(math(p.answer)[0]!)).toBe(ordered[0]);
          forms.add(0);
        } else if (code === "N02" && p.content.includes("번째")) {
          const [a, b, c, k] = math(p.content).map(value) as [
            bigint,
            bigint,
            bigint,
            bigint,
          ];
          expect(value(math(p.answer)[0]!)).toBe(commonMultiple([a, b, c]) * k);
          const bases = math(p.answer)[0]!
            .split("\\times")
            .map((s) => BigInt(s.match(/^\d+/)![0]));
          expect(bases.every(prime)).toBe(true);
          expect(new Set(bases).size).toBe(bases.length);
          forms.add(1);
        } else if (code === "N02" && p.content.includes("최소공배수가")) {
          const lcm = value(math(p.content)[0]!);
          const matches = rangeValues(p.content).filter(
            (n) => n % lcm === BigInt(0),
          );
          expect(value(math(p.answer)[0]!)).toBe(BigInt(matches.length));
          countModes.add(
            p.content.includes("두 자리") ? "two-digits" : "bounded",
          );
        } else if (code === "N01" || code === "N02") {
          questionParts.forEach((line, i) => {
            const ns = math(line).map(value);
            expect(ns.length).toBeGreaterThanOrEqual(2);
            expect(ns.length).toBeLessThanOrEqual(3);
            expect(new Set(ns).size).toBe(ns.length);
            ns.forEach((n) => expect(n <= BigInt(900)).toBe(true));
            const want =
              code === "N01" ? divisors(ns).at(-1)! : commonMultiple(ns);
            expect(value(math(parts(p.answer)[i]!)[0]!)).toBe(want);
          });
        } else if (code === "N03") {
          const ns = math(p.content).map(value);
          const answers = math(p.answer).map(value);
          expect(answers).toEqual([divisors(ns).at(-1)!, commonMultiple(ns)]);
        } else if (code === "N04" || code === "N09") {
          const [lead, ...choices] = p.content.split("\n");
          const ns = math(lead!).map(value);
          const not = lead!.includes("아닌");
          const vals = choices.map((l) => value(math(l)[0]!));
          expect(new Set(vals).size).toBe(5);
          const wanted = vals.flatMap((v, i) =>
            ns.every((n) => n % v === BigInt(0)) !== not ? [marks[i]] : [],
          );
          expect(p.answer.split(", ")).toEqual(wanted);
          expect(wanted).toHaveLength(not ? 1 : 2);
          forms.add(Number(not));
        } else if (code === "N05") {
          questionParts.forEach((line, i) => {
            const lhs = evalTex(math(line)[0]!)!;
            const rhsText = math(parts(p.answer)[i]!)[0]!;
            const rhs = evalTex(rhsText)!;
            expect(lhs).not.toBeNull();
            expect(rhs).not.toBeNull();
            expect(lhs.n * rhs.d).toBe(rhs.n * lhs.d);
            expect(rhsText).toMatch(/\^\{[2-6]\}/);
            // 각 밑은 한 번만 남아야 한다. 값 일치만으로는 반복 곱을 답에 그대로 쓰는 오류를 못 잡는다.
            const bases = [
              ...rhsText.matchAll(/(?<!\d)(\d+)(?=\^|\\right)/g),
            ].map((m) => m[1]);
            expect(new Set(bases).size).toBe(bases.length);
            forms.add(Number(p.facts[`form${i}`]));
          });
        } else if (code === "N06" && p.content.includes("개수")) {
          const nums = math(p.content).map(value);
          expect(nums).toContain(BigInt(1));
          const primeCount = nums.filter(prime).length;
          const compositeCount = nums.filter(
            (n) => n > BigInt(1) && !prime(n),
          ).length;
          const both = p.content.includes("각각");
          const expected = both
            ? [primeCount, compositeCount]
            : [p.content.includes("합성수") ? compositeCount : primeCount];
          expect(math(p.answer).map(value)).toEqual(expected.map(BigInt));
          forms.add(both ? 5 : p.content.includes("합성수") ? 4 : 3);
        } else if (code === "N06") {
          const [lead, ...choices] = p.content.split("\n");
          const nums = choices.map((l) => value(math(l)[0]!));
          const selected = (n: bigint) =>
            lead!.includes("합성수")
              ? n > BigInt(1) && !prime(n)
              : lead!.includes("아닌")
                ? !prime(n)
                : prime(n);
          const wanted = nums.flatMap((n, i) =>
            selected(n) ? [marks[i]] : [],
          );
          expect(new Set(nums).size).toBe(5);
          expect(p.answer.split(", ")).toEqual(wanted);
          expect(wanted).toHaveLength(lead!.includes("모두") ? 2 : 1);
          forms.add(p.facts.mode!);
        } else if (code === "N07" && p.content.includes("개수")) {
          const target = value(math(p.content)[0]!);
          const even = p.content.includes("짝수");
          const matches = rangeValues(p.content).filter(
            (n) =>
              (!even || n % BigInt(2) === BigInt(0)) &&
              divisors([target, n]).length === 1,
          );
          expect(value(math(p.answer)[0]!)).toBe(BigInt(matches.length));
          forms.add(2);
          countModes.add(even ? "even" : "all");
        } else if (code === "N07") {
          const [lead, ...choices] = p.content.split("\n");
          const head = math(lead!).map(value);
          const wanted = choices.flatMap((l, i) =>
            divisors([...head, ...math(l).map(value)]).length === 1
              ? [marks[i]]
              : [],
          );
          expect(p.answer.split(", ")).toEqual(wanted);
          expect(wanted).toHaveLength(lead!.includes("모두") ? 2 : 1);
          forms.add(p.facts.paired!);
        } else if (code === "N08" && p.content.includes("개수")) {
          const ds = divisors(math(p.content).map(value));
          const even = p.content.includes("짝수");
          const matches = ds.filter(
            (n) => !even || n % BigInt(2) === BigInt(0),
          );
          expect(value(math(p.answer)[0]!)).toBe(BigInt(matches.length));
          countModes.add(even ? "even" : "all");
        } else if (code === "N08") {
          questionParts.forEach((line, i) => {
            const ns = math(line).map(value);
            const want = divisors(ns);
            expect(math(parts(p.answer)[i]!).map(value)).toEqual(want);
          });
        }
      }
      expect(contents.size).toBeGreaterThan(100);
      if (["N01", "N02", "N05", "N08"].includes(code))
        expect(subcounts.size).toBeGreaterThan(1);
      if (["N02", "N04", "N09"].includes(code)) expect(forms.size).toBe(2);
      if (["N05", "N07"].includes(code)) expect(forms.size).toBe(3);
      if (code === "N06") expect(forms.size).toBe(6);
      if (["N02", "N07", "N08"].includes(code)) expect(countModes.size).toBe(2);
    });
  }
});

describe("T1 자연수 후보가 그대로 재사용하는 기존 키", () => {
  for (const key of [
    "1-1|소인수분해|01",
    "1-1|소인수분해|03",
    "1-1|최대공약수와 최소공배수|01",
    "1-1|최대공약수와 최소공배수|25",
  ]) {
    it(`${key}: 발문에서 읽은 값으로 60 씨앗 재검산`, () => {
      for (let seed = 0; seed < 60; seed++) {
        const p = generateMiddleProblem(key, seed);
        const shown = math(p.content);
        if (key === "1-1|소인수분해|01") {
          expect(value(math(p.answer)[0]!)).toBe(
            BigInt(shown.map(value).filter(prime).length),
          );
        } else if (key === "1-1|소인수분해|03") {
          expect(value(shown[0]!)).toBe(value(math(p.answer)[0]!));
          expect(math(p.answer)[0]).toMatch(/\^\{[2-4]\}/);
        } else if (key.endsWith("|01")) {
          const [limit, target] = shown.map(value) as [bigint, bigint];
          let count = BigInt(0);
          for (let n = BigInt(1); n <= limit; n++)
            if (divisors([n, target]).length === 1) count++;
          expect(value(math(p.answer)[0]!)).toBe(count);
        } else {
          const [a, b, k] = shown.map(value) as [bigint, bigint, bigint];
          const multiples: bigint[] = [];
          for (let n = BigInt(1); multiples.length < Number(k); n++) {
            if (n % a === BigInt(0) && n % b === BigInt(0)) multiples.push(n);
          }
          expect(value(math(p.answer)[0]!)).toBe(multiples.at(-1));
        }
      }
    });
  }
});
