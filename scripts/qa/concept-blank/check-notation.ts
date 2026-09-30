/**
 * 개념 백지 은행 — 표기 검사(D-150 · 원장님 2026-09-30 «카텍스 사용할 것»).
 * 은행 글(용어 · 뜻 · 예 · ○× · 적용 · 그림 물음 · 그림 줄)에서 **수식 `$...$` 밖에 남은 수학 표기**를 센다.
 * 자는 초등 엔진의 것을 그대로 쓴다(`src/lib/elementary/rules.ts` — 원장님 2026-08-22 「모든 숫자는 KaTeX」 · 「8각형이 아니라 팔각형」 ·
 * 수식 뒤 조사). 여기에 수식 밖 유니코드 수학 글자(√ ² × ÷ − ∠ △ ° …)와 수식 오류(KaTeX 가 던지는 것)를 더한다.
 *
 * 그림 이름표(`tags[].answer`)는 SVG 안 글자라 재지 않는다(KaTeX 를 못 쓴다) — «통과»가 아니라 «안 잼».
 *
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/check-notation.ts [--part m3] [--show 40]
 * 끝 코드: 걸린 것이 있으면 1.
 */
import katex from "katex";
import { splitBlankSentence } from "../../../src/contracts/conceptBlank.contract";
import { BANK_PARTS } from "../../../src/lib/concept-blank/bank";
import {
  arabicPolygons,
  bareNumbers,
  josaFaults,
} from "../../../src/lib/elementary/rules";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const onlyPart = arg("part");
const show = Number(arg("show") ?? 25);

/** 수식 밖에 있으면 안 되는 유니코드 수학 글자 — 제품 표기는 `\sqrt` · `^2` · `\times` · `\angle` · `^\circ` … 다. */
const UNICODE_MATH = /[√∛²³⁴⁵⁶⁷⁸⁹⁰¹⁻⁺ⁿπ±≤≥≠×÷−∠△□°∥⊥≡∽∞]/g;
const stripMath = (s: string) => s.replace(/\$[^$]*\$/g, " ");

type Hit = {
  part: string;
  id: string;
  field: string;
  rule: string;
  what: string;
};
const hits: Hit[] = [];

function scan(part: string, id: string, field: string, raw: string) {
  // 뜻 문장은 핵심어 괄호를 걷어 읽는 글로 본다(핵심어 안의 수식은 그대로 수식이다).
  const text =
    field === "definition"
      ? splitBlankSentence(raw)
          .map((p) => p.text)
          .join("")
      : raw;
  const add = (rule: string, what: string[]) => {
    for (const w of what) hits.push({ part, id, field, rule, what: w });
  };
  if ((text.match(/\$/g) ?? []).length % 2 === 1)
    add("수식 짝", ["$ 가 홀수 개"]);
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    try {
      katex.renderToString(m[1]!, { throwOnError: true, strict: "ignore" });
    } catch (e) {
      add("수식 오류", [
        `${m[1]} — ${String((e as Error).message).slice(0, 60)}`,
      ]);
    }
  }
  add("수식 밖 숫자", bareNumbers(text));
  add("수식 밖 기호", stripMath(text).match(UNICODE_MATH) ?? []);
  add("아라비아 도형 이름", arabicPolygons(text));
  add("수식 뒤 조사", josaFaults(text));
}

let scanned = 0;
for (const [part, bank] of Object.entries(BANK_PARTS)) {
  if (onlyPart && part !== onlyPart) continue;
  for (const c of bank.concepts) {
    scan(part, c.id, "term", c.term);
    scan(part, c.id, "definition", c.definition);
    if (c.example) {
      scan(part, c.id, "example.prompt", c.example.prompt);
      scan(part, c.id, "example.answer", c.example.answer);
    }
    scanned++;
  }
  for (const o of bank.ox) {
    scan(part, o.id, "statement", o.statement);
    scan(part, o.id, "why", o.why);
    scanned++;
  }
  for (const a of bank.apply) {
    scan(part, a.id, "prompt", a.prompt);
    scan(part, a.id, "answer", a.answer);
    scanned++;
  }
  for (const f of bank.figures) {
    scan(part, f.id, "prompt", f.prompt);
    for (const l of f.lines) {
      scan(part, f.id, "line.label", l.label);
      scan(part, f.id, "line.answer", l.answer);
    }
    scanned++;
  }
}

const byPartRule = new Map<string, number>();
for (const h of hits) {
  const k = `${h.part} · ${h.rule}`;
  byPartRule.set(k, (byPartRule.get(k) ?? 0) + 1);
}
console.log(`은행 항목 ${scanned}개 검사`);
for (const [k, n] of [...byPartRule].sort()) console.log(`  ${k}: ${n}`);
for (const h of hits.slice(0, show))
  console.log(`표기 ${h.part} ${h.id} (${h.field}) [${h.rule}] «${h.what}»`);
if (hits.length > show) console.log(`… 그 밖 ${hits.length - show}건`);
console.log(hits.length ? `표기 ${hits.length}건` : "표기 0건");
process.exit(hits.length ? 1 : 0);
