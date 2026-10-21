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
  // 단위로 끝나면 단위를 읽는 끝 음절 — «밀리리터» → «터» · «킬로그램» → «램» · «톤» · «퍼센트» → «트» · «도»
  const unit = /[\d}]\s*\\,\s*\\mathrm\{([A-Za-z]+)\}(?:\^\{?[23]\}?)?$/.exec(latex);
  if (unit) return ({ mm: "터", cm: "터", m: "터", km: "터", mL: "터", L: "터", kL: "터", g: "램", kg: "램", mg: "램", t: "톤" } as Record<string, string>)[unit[1]!] ?? null;
  if (/\d\s*\\%$/.test(latex)) return "트";
  if (/\d\s*\^\{?\\circ\}?$/.test(latex)) return "도";
  if (/\\square$/.test(latex)) return "모";
  // 연산 기호 뒤 끝 토막(수 · 분수)이 끝소리다 — «$\frac16\times\frac38$» → «3»
  const tail = /(?:\\times|\\div|\\le|\\ge|\\leq|\\geq|[-+=<>:])\s*((?:\d+)?\\frac\{\d+\}\{\d+\}|\d+(?:\.\d+)?)$/.exec(latex);
  if (tail) return finalSound(tail[1]!);
  const fraction = /^-?(?:\d+)?\\frac\{(\d+)\}\{\d+\}$/.exec(latex);
  let number = fraction?.[1] ?? latex;
  if (!/^-?\d+(?:\.\d+)?$/.test(number)) return null;
  number = number.replace(/^-/, "");
  if (number.includes("."))
    return "영일이삼사오육칠팔구"[Number(number.at(-1))];
  const v = BigInt(number);
  if (v === BigInt(0)) return "영";
  const suffixes = ["", "만", "억", "조", "경"];
  let reduced = v;
  let group = 0;
  while (reduced % BigInt(10000) === BigInt(0)) {
    reduced /= BigInt(10000);
    group++;
  }
  if (group) return suffixes[group] ?? null;
  if (v % BigInt(10)) return "영일이삼사오육칠팔구"[Number(v % BigInt(10))];
  return v % BigInt(100) ? "십" : v % BigInt(1000) ? "백" : "천";
}

it("정수·소수·분수·대분수의 조사와 ㄹ 받침을 구별하고 모르는 식은 보존한다", () => {
  expect(
    mathJosa(
      "$24$을 $12$으로 $\\frac{3}{10}$를 $3\\frac{3}{4}$를 $7$으로 $0.2$을",
    ),
  ).toBe("$24$를 $12$로 $\\frac{3}{10}$을 $3\\frac{3}{4}$을 $7$로 $0.2$를");
  expect(mathJosa("$x$를 $2+3$을 $\\frac{1}{2}\\times3$를 $x^{2}$를")).toBe(
    "$x$를 $2+3$을 $\\frac{1}{2}\\times3$을 $x^{2}$를",
  );
  // 2026-10-20 교차 검수 — 분수의 곱은 끝 분수의 분자로 읽는다(«8분의 3» → «을»)
  expect(mathJosa("$\\frac{1}{6}\\times\\frac{3}{8}$를")).toBe("$\\frac{1}{6}\\times\\frac{3}{8}$을");
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
  process.stdout.write(
    JSON.stringify({
      problems,
      checked,
      skipped,
      errors: errors.length,
      examples: errors.slice(0, 30),
    }) + "\n",
  );
  expect(errors.slice(0, 30)).toEqual([]);
}, 120000);
