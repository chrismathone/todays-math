/**
 * 객관식 **보기**가 정답과 모양이 다른가 — 실제 적재본을 센다.
 *
 * 원장님 지적: 초3 「두 수의 합」 객관식에 `865/2`·`-865` 가 보기로 나온다.
 * 초등 교육과정에 없는 수라 학생이 계산 없이 지워 낸다 — 오답이 아니라 장식이다.
 *
 * ⚠️ 「초3 만」 세지 않는다. 그러면 같은 결함이 다른 학년에 있어도 0이 된다.
 *    **정답의 모양**과 **보기의 모양**을 견주어 전 학년을 훑는다.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MARKS = ["①", "②", "③", "④", "⑤"];

/** familyKey 가 학년을 담는다 — `elem:초3|1-5-4 …` / `mid:2-2|…`. */
function gradeOf(familyKey: string): string {
  const m = familyKey.match(/^(?:elem|mid):([^|]+)\|/);
  return m ? m[1]! : "(무리 없음)";
}

/** 보기 줄에서 값만 뽑는다. */
function choiceValues(content: string): string[] {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    const mark = MARKS.find((m) => t.startsWith(m));
    if (!mark) continue;
    out.push(t.slice(mark.length).trim());
  }
  return out;
}

const FRACTION = /\\d?frac\s*\{/;
const NEGATIVE = /(^|[$\s{(])-\s*\d/;
const DECIMAL = /\d\.\d/;

type Kind = "정수" | "분수" | "소수" | "음수" | "기타";

function kindOf(raw: string): Kind {
  const t = raw.trim();
  if (FRACTION.test(t)) return t.includes("-") ? "음수" : "분수";
  if (NEGATIVE.test(t)) return "음수";
  if (DECIMAL.test(t)) return "소수";
  if (/^\$?-?\d+\$?/.test(t.replace(/\\,|\\mathrm\{[^}]*\}/g, "")))
    return "정수";
  return "기타";
}

async function main() {
  const rows = await prisma.problem.findMany({
    where: { questionType: "객관식" },
    select: {
      problemCode: true,
      familyKey: true,
      content: true,
      answer: true,
    },
  });
  console.log(`객관식 ${rows.length}행.\n`);

  let checked = 0;
  const badRows: {
    code: string;
    family: string;
    grade: string;
    answerKind: Kind;
    offenders: string[];
    values: string[];
  }[] = [];

  for (const r of rows) {
    const values = choiceValues(r.content ?? "");
    if (values.length !== 5) continue;
    checked += 1;
    // 정답이 어느 보기인지 — answer 는 `①`~`⑤`.
    const idx = MARKS.indexOf((r.answer ?? "").trim());
    if (idx < 0) continue;
    const answerKind = kindOf(values[idx]!);
    if (answerKind !== "정수") continue; // 정답이 «음이 아닌 정수»인 것만 본다
    if (kindOf(values[idx]!) === "음수") continue;
    const offenders = values.filter((v, i) => {
      if (i === idx) return false;
      const k = kindOf(v);
      return k === "분수" || k === "음수" || k === "소수";
    });
    if (offenders.length === 0) continue;
    badRows.push({
      code: r.problemCode ?? "?",
      family: r.familyKey ?? "?",
      grade: gradeOf(r.familyKey ?? ""),
      answerKind,
      offenders,
      values,
    });
  }

  console.log(`보기 다섯을 읽은 행 ${checked}건.`);
  console.log(
    `정답이 «음이 아닌 정수»인데 보기에 분수·음수·소수가 섞인 행 ${badRows.length}건\n`,
  );

  const byGrade = new Map<string, number>();
  for (const b of badRows)
    byGrade.set(b.grade, (byGrade.get(b.grade) ?? 0) + 1);
  console.log("학년별:");
  for (const [g, n] of [...byGrade].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${g}  ${n}건`);
  }

  console.log("\n표본 12건:");
  for (const b of badRows.slice(0, 12)) {
    console.log(`  ${b.code} [${b.grade}] ${b.family}`);
    console.log(`     보기: ${b.values.join("  ")}`);
  }
}

main().finally(() => prisma.$disconnect());
