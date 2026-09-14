/**
 * 맞붙은 인라인 수식(`$A$$B$`)이 화면에서 빨간 날 LaTeX 로 나오는 자리를 **실제 함수로**
 * 재현한다 — 원장님 2026-09-14 「후보정 필요한 해설이 일부 보이네」.
 *
 * 읽어서 짐작하지 않고 단계마다 통과시켜 본다:
 *   raw → normalizeOcrText → preprocessMathText
 * 그리고 `preprocessMathText` 를 **raw 에 바로** 걸어 본 것과 견준다.
 *
 * ⚠️ 마스킹 표식은 **출력할 수 없는 제어문자**다(`MASK_OPEN = U+0000`,
 *    `MASK_CLOSE = U+0001`). 소스에 리터럴로 적으면 `//g` 처럼 주석이 되어 버리므로
 *    반드시 `\u0000` 이스케이프로 쓴다(2026-09-14 에 그렇게 한 번 깨뜨렸다).
 *
 * 돌리는 법:  npx tsx scratch/probe-math-glue.ts
 */
import fs from "node:fs";

import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
import { tokenizeMath } from "@/lib/math/segments";
import { preprocessMathText } from "@/lib/math/textPreprocess";
import { normalizeOcrText } from "@/lib/problem/parseProblemContent";

const SAMPLE =
  "C:/Users/user/AppData/Local/Temp/claude/D--todays-math/5013f6aa-4795-4e1c-950b-5f6ca7aa5266/scratchpad/sol-long.json";

const raw: string = JSON.parse(fs.readFileSync(SAMPLE, "utf8")).solution;

const OPEN_RE = new RegExp("\\u0000", "g");
const CLOSE_RE = new RegExp("\\u0001", "g");

/** 되돌려지지 못한 마스크 표식이 남아 있나 — 화면의 `◈0◈` 가 그것이다. */
function controls(text: string): string {
  const open = (text.match(OPEN_RE) ?? []).length;
  const close = (text.match(CLOSE_RE) ?? []).length;
  return open || close
    ? `U+0000 ${open}개 · U+0001 ${close}개 **샜다**`
    : "없음";
}

/** 두 문자열이 **어디서부터** 달라지는지 — 손상이 시작되는 자리를 집는다. */
function firstDiff(a: string, b: string): string {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  if (i === n && a.length === b.length) return "  차이 없음";
  const show = (s: string) =>
    JSON.stringify(s.slice(Math.max(0, i - 45), i + 45));
  return `  @${i} 부터 달라진다\n    before: ${show(a)}\n    after : ${show(b)}`;
}

function report(label: string, text: string) {
  const doubles: number[] = [];
  for (let i = text.indexOf("$$"); i !== -1; i = text.indexOf("$$", i + 1))
    doubles.push(i);
  const segments = tokenizeMath(text);
  const display = segments.filter((s) => s.type === "display");
  console.log(`\n[${label}] ${text.length}자 · $$ ${doubles.length}곳`);
  console.log(
    `  조각 ${segments.length} — text ${segments.filter((s) => s.type === "text").length} · ` +
      `inline ${segments.filter((s) => s.type === "inline").length} · display ${display.length}`,
  );
  console.log(`  제어문자: ${controls(text)}`);
  // 🔴 display 조각이 수십 자를 넘으면 그건 수식이 아니라 **삼켜진 산문**이다.
  for (const seg of display) {
    if (seg.value.length > 40) {
      console.log(
        `  ⚠️ 삼켜진 display ${seg.value.length}자: ${JSON.stringify(seg.value.slice(0, 70))}…`,
      );
    }
  }
}

report("raw (DB 원문)", raw);

/**
 * `normalizeOcrText` 는 속으로 `normalizeMathgenText` → `maskMath` → `unmask` →
 * `collapseWhitespace` 를 탄다. 어느 단계가 `$` 를 끼워 넣는지 가르려면 **첫 단계만**
 * 따로 걸어 봐야 한다 — 안 그러면 「어딘가에서 망가진다」까지밖에 못 말한다.
 */
const mathgenOnly = normalizeMathgenText(raw);
report("normalizeMathgenText 만", mathgenOnly);
console.log(`  raw 와 같은가: ${mathgenOnly === raw}`);
console.log(firstDiff(raw, mathgenOnly));

const normalized = normalizeOcrText(raw);
report("normalizeOcrText", normalized);
console.log(`  raw 와 같은가: ${normalized === raw}`);
console.log(firstDiff(raw, normalized));

const chained = preprocessMathText(normalized);
report("→ preprocessMathText (실제 화면 경로)", chained);

const direct = preprocessMathText(raw);
report("preprocessMathText(raw) 직접 — 앞단을 건너뛰면", direct);

console.log(`\n두 경로가 같은가: ${chained === direct}`);
