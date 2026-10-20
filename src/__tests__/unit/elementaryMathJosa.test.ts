// @vitest-environment node
import { expect, it } from "vitest";
import { mathJosa } from "@/lib/elementary/format";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
  coreForms,
  generateElementaryForm,
} from "@/lib/elementary/generate";

// 독립 검산: 숫자를 한국어 끝 음절로 옮긴 뒤 유니코드 받침을 검사한다.
function finalSound(latex: string): string | null {
  const fraction = /^-?(?:\d+)?\\frac\{(\d+)\}\{\d+\}$/.exec(latex);
  let number = fraction?.[1] ?? latex;
  if (!/^-?\d+(?:\.\d+)?$/.test(number)) return null;
  number = number.replace(/^-/, "");
  if (number.includes("."))
    return "영일이삼사오육칠팔구"[Number(number.at(-1))];
  const v = BigInt(number);
  if (v === 0n) return "영";
  const suffixes = ["", "만", "억", "조", "경"];
  let reduced = v;
  let group = 0;
  while (reduced % 10000n === 0n) {
    reduced /= 10000n;
    group++;
  }
  if (group) return suffixes[group] ?? null;
  if (v % 10n) return "영일이삼사오육칠팔구"[Number(v % 10n)];
  return v % 100n ? "십" : v % 1000n ? "백" : "천";
}

it("정수·소수·분수·대분수의 조사와 ㄹ 받침을 구별하고 모르는 식은 보존한다", () => {
  expect(
    mathJosa(
      "$24$을 $12$으로 $\\frac{3}{10}$를 $3\\frac{3}{4}$를 $7$으로 $0.2$을",
    ),
  ).toBe("$24$를 $12$로 $\\frac{3}{10}$을 $3\\frac{3}{4}$을 $7$로 $0.2$를");
  expect(mathJosa("$x$를 $2+3$을 $\\frac{1}{2}\\times3$를")).toBe(
    "$x$를 $2+3$을 $\\frac{1}{2}\\times3$를",
  );
  expect(mathJosa("$10000$로 $1000000000000$은")).toBe(
    "$10000$으로 $1000000000000$는",
  );
});

it("초3~초6 전 단원·난이도·등록 문형: 수식 뒤 조사를 읽는 소리로 검사한다", () => {
  let checked = 0,
    skipped = 0,
    problems = 0;
  const errors: string[] = [];
  const scan = (text: string, label: string) => {
    for (const m of text.matchAll(
      /\$([^$]+)\$(으로|로|을|를|이|가|은|는|과|와)(?![가-힣])/g,
    )) {
      const last = finalSound(m[1]);
      if (!last) {
        skipped++;
        continue;
      }
      checked++;
      const batchim = (last.charCodeAt(0) - 0xac00) % 28;
      const pair = ["을를", "이가", "은는", "과와"].find((p) =>
        p.includes(m[2]),
      );
      const expected = pair
        ? pair[batchim ? 0 : 1]
        : batchim && batchim !== 8
          ? "으로"
          : "로";
      if (expected !== m[2]) errors.push(`${label}: ${m[0]} → ${expected}`);
    }
  };
  for (const u of elementaryUnits())
    for (let i = 1; i <= 20; i++) {
      const seed = i * 7919;
      const variants = [
        ...[undefined, ...supportedTiers(u)].map(
          (tier) =>
            [tier ?? "기존", generateElementaryProblem(u, seed, tier)] as const,
        ),
        ...coreForms(u).map(
          (f) =>
            [`문형${f.id}`, generateElementaryForm(u, seed, f.id)] as const,
        ),
      ];
      for (const [kind, p] of variants) {
        problems++;
        for (const text of [p.content, p.solution])
          scan(text, `${u.grade}:${u.section.split(" ")[0]}:${kind}:${seed}`);
      }
    }
  console.log(
    JSON.stringify({
      problems,
      checked,
      skipped,
      errors: errors.length,
      examples: errors.slice(0, 30),
    }),
  );
  expect(errors.slice(0, 30)).toEqual([]);
}, 120000);
