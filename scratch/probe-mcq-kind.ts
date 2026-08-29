/**
 * 객관식 **보기가 정답과 같은 종류의 수인가** — 엔진을 돌려 직접 잰다.
 *
 * 원장님 지적 2026-08-27: 초3 「두 수의 합」 보기에 `$-865$`·`$\frac{865}{2}$`.
 *
 * ⚠️ **DB 를 세지 않는다.** DB 는 «오늘 뽑힌 것»이라 안 뽑힌 문형은 구조적으로
 *    0이 된다. 재는 단위도 고치는 단위와 같이 **틀**(문형·유형)이어야 한다
 *    (2026-08-25 교훈). 그래서 적재기와 **같은 축**으로 돌린다.
 *
 * 열쇠가 살아 있는가는 **옛 코드**로 확인한다 —
 *   git stash push -- src/lib/engine/deriveFormats.ts && npx tsx scratch/probe-mcq-kind.ts
 * 이 판정기가 옛 코드에서 «많음», 새 코드에서 «0» 이어야 한다. 옛 코드에서도
 * 0이면 판정기가 죽은 것이지 데이터가 깨끗한 것이 아니다.
 */
import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "../src/lib/elementary/generate";
import { expandFamily } from "../src/lib/engine/expandEngine";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260827;
const MARKS = ["①", "②", "③", "④", "⑤"];

type Kind = "정수" | "음수" | "분수" | "소수" | "기타";

function kindOf(raw: string): Kind {
  const t = raw
    .trim()
    .replace(/^\$|\$$/g, "")
    .replace(/\\,/g, "")
    .replace(/\\mathrm\{[^}]*\}/g, "")
    .replace(/\^\{?\\circ\}?/g, "")
    .trim();
  if (/^-/.test(t)) return "음수";
  if (/\\d?frac\s*\{/.test(t)) return "분수";
  if (/^\d+\.\d+$/.test(t)) return "소수";
  if (/^\d+$/.test(t)) return "정수";
  return "기타";
}

function choiceValues(content: string): string[] {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    const mark = MARKS.find((m) => t.startsWith(m));
    if (mark) out.push(t.slice(mark.length).trim());
  }
  return out;
}

type Bad = { family: string; answer: string; values: string[] };
const bad: Bad[] = [];
/** 자릿수가 다른 보기 — 종류는 같지만 학생이 크기만 보고 지워 낸다. */
const wideGap: Bad[] = [];
let mcq = 0;

function inspect(family: string, content: string, answer: string): void {
  const values = choiceValues(content);
  const idx = MARKS.indexOf(answer.trim());
  if (values.length !== 5 || idx < 0) return;
  mcq += 1;
  const want = kindOf(values[idx]!);
  if (want !== "정수") return; // 정답이 «음이 아닌 정수»인 것만 본다
  const offenders = values.filter((v, i) => i !== idx && kindOf(v) !== "정수");
  if (offenders.length > 0) bad.push({ family, answer: values[idx]!, values });
  const digits = (t: string) => t.replace(/[^0-9]/g, "").length;
  const d0 = digits(values[idx]!);
  if (values.some((v, i) => i !== idx && Math.abs(digits(v) - d0) >= 1)) {
    wideGap.push({ family, answer: values[idx]!, values });
  }
}

for (const unit of elementaryUnits()) {
  for (const form of listedForms(unit)) {
    const family = `elem:${unit.grade}|${unit.section}|${form.id}`;
    let got;
    try {
      got = expandFamily((v) => {
        const p = generateElementaryForm(unit, SEED + v * 1009, form.id);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey: family,
          problemType: "계산",
        };
      }, 3);
    } catch {
      continue;
    }
    for (const it of got.items) {
      if (it.questionType === "객관식") inspect(family, it.content, it.answer);
    }
  }
}

for (const entry of registeredTypes()) {
  const family = `mid:${entry.key}`;
  let got;
  try {
    got = expandFamily((v) => {
      const p = generateMiddleProblem(entry.key, SEED, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey: family,
        problemType: "계산",
      };
    }, 3);
  } catch {
    continue;
  }
  for (const it of got.items) {
    if (it.questionType === "객관식") inspect(family, it.content, it.answer);
  }
}

console.log(`객관식 ${mcq}건을 봤다.`);
console.log(
  `정답이 «음이 아닌 정수»인데 보기에 다른 종류가 섞인 것 ${bad.length}건\n`,
);
const elem = bad.filter((b) => b.family.startsWith("elem:")).length;
console.log(`   초등 ${elem}건 · 중등 ${bad.length - elem}건`);
const gapElem = wideGap.filter((b) => b.family.startsWith("elem:")).length;
console.log(
  `
[따로] 종류는 같으나 **자릿수**가 다른 보기가 낀 것 ${wideGap.length}건` +
    ` (초등 ${gapElem} · 중등 ${wideGap.length - gapElem})`,
);
for (const b of wideGap.slice(0, 5)) {
  console.log(`  ${b.family}`);
  console.log(`     정답 ${b.answer} · 보기 ${b.values.join("  ")}`);
}
for (const b of bad.slice(0, 10)) {
  console.log(`  ${b.family}`);
  console.log(`     정답 ${b.answer} · 보기 ${b.values.join("  ")}`);
}
process.exit(bad.length > 0 ? 1 : 0);
