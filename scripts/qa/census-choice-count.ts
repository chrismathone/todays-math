/**
 * **발견기** — 문항의 **보기 개수 분포**를 센다 (원장님 지시 2026-08-25: 「4지선다를 5지선다로」).
 *
 *   npx tsx scripts/qa/census-choice-count.ts             # 공유 DB (출제 가능분)
 *   npx tsx scripts/qa/census-choice-count.ts --all       # 격리분까지 — **반증용**
 *   npx tsx scripts/qa/census-choice-count.ts --engine    # 중등 엔진 유형 × 씨앗
 *   npx tsx scripts/qa/census-choice-count.ts --seeds 200
 *
 * ## 열쇠를 손으로 정하지 않는다
 *
 * ㉠ **보기 개수**는 `parseProblemContent(content).choices.length` — 지면이 실제로
 *    그리는 그 목록이다. 「①~⑤ 를 세면 되겠지」로 손수 세면 지면과 갈라진다.
 * ㉡ **분모**를 `question_type` 컬럼으로 가르지 **않는다.** 그 컬럼은 못 믿는다 —
 *    CLAUDE.md 2026-08-18: 「정답이 ①인데 «서술형» 이라 적힌 행이 36건 있었다」.
 *
 * 🔴 **그런데 «정답 모양» 만으로도 못 가른다.** 처음에 「정답이 보기 표식인 것」만
 *    분모로 잡았더니 **원장님이 지목하신 바로 그 문항이 사라졌다** —
 *    `J30401-A04-002` 는 보기가 ①②③④ 넷인데 정답이 `$3$` 이다(「옳은 것은 몇 개인가」).
 *    그 열쇠로는 「4지선다」의 대부분이 구조적으로 안 보인다.
 *
 *    그래서 분모는 **지면에 보기가 그려지는 문항**(`choices.length > 0`)이고,
 *    정답 모양은 **거르는 자가 아니라 교차축**으로 쓴다. 서술형·단답형은 지면에
 *    보기가 없으므로 이 분모에 애초에 안 들어온다.
 *    (2026-08-18 「판정 근거를 한 컬럼에서만 찾으면 다른 컬럼에 있는 답이 «없는 것»이
 *     된다」와 같은 자리다.)
 *
 * 그리고 **어긋나는 자리를 반드시 찍는다** — 「정답이 표식인데 지면에 보기가 없는」 행.
 * 0 으로 뭉개면 새는 줄 모른다.
 *
 * ⚠️ DB 를 건드리지 않는다(읽기 전용).
 */
import { PrismaClient } from "@prisma/client";

import { enclosedAnswerMarks } from "../../src/lib/problem/chooseAllRule";
import {
  CHOICE_COUNT,
  choiceCountOf,
  hasChoices,
} from "../../src/lib/problem/choiceCountRule";

const ALL_ROWS = process.argv.includes("--all");
const ENGINE = process.argv.includes("--engine");
const numArg = (flag: string, dflt: number) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const SEEDS = numArg("--seeds", 40);

/** 정답 «모양» — 거르는 자가 아니라 **교차축**이다. */
export function answerKind(answer: string): "표식" | "개수" | "그밖" {
  if (enclosedAnswerMarks(answer) !== null) return "표식";
  const bare = answer.trim().replace(/\$/g, "");
  if (/^-?\d+\s*(개|가지|명)?$/.test(bare)) return "개수";
  return "그밖";
}

type Row = {
  label: string;
  content: string;
  answer: string;
  familyKey: string;
  unit: string;
  questionType: string;
};

function bump<K>(m: Map<K, number>, k: K) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

async function dbRows(): Promise<{ rows: Row[]; note: string }> {
  const prisma = new PrismaClient();
  try {
    const all = await prisma.problem.count();
    const rows = await prisma.problem.findMany({
      where: ALL_ROWS ? {} : { directUseAllowed: true },
      select: {
        problemCode: true,
        content: true,
        answer: true,
        familyKey: true,
        questionType: true,
        unit: { select: { grade: true, section: true } },
      },
    });
    return {
      rows: rows.map((r) => ({
        label: r.problemCode,
        content: r.content,
        answer: r.answer,
        familyKey: r.familyKey ?? "(없음)",
        unit: `${r.unit.grade} ${r.unit.section}`,
        questionType: r.questionType ?? "(없음)",
      })),
      note: ALL_ROWS
        ? `⚠️ 반증용 확대 모집단 — 공유 DB **전량** ${rows.length}. 처리 대상이 아니다.`
        : `공유 DB · 전체 ${all} 중 출제 가능 ${rows.length} · 격리 ${all - rows.length}`,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function engineRows(): Promise<{ rows: Row[]; note: string }> {
  const { registeredTypes, generateMiddleProblem } =
    await import("../../src/lib/middle/generate");
  const rows: Row[] = [];
  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      try {
        const p = generateMiddleProblem(t.key, 20260825 + s * 7919);
        rows.push({
          label: `${t.key}#${s}`,
          content: p.content,
          answer: p.answer,
          familyKey: `mid:${t.key}`,
          unit: `${p.grade} ${p.unitSection}`,
          questionType: "단답형",
        });
      } catch {
        /* 생성 실패는 census-choose-all 이 센다 */
      }
    }
  }
  return {
    rows,
    note: `중등 엔진 · 유형 ${registeredTypes().length} × 씨앗 ${SEEDS} = ${rows.length}건`,
  };
}

async function main() {
  const { rows, note } = ENGINE ? await engineRows() : await dbRows();
  console.log(note);

  const choice = rows.filter((r) => hasChoices(r.content));
  const markAnswered = rows.filter((r) => answerKind(r.answer) === "표식");
  const missedByMarkKey = choice.filter(
    (r) => answerKind(r.answer) !== "표식",
  ).length;
  console.log(
    `\n지면에 보기가 그려지는 문항 ${choice.length} / ${rows.length}` +
      `\n  대조 — 「정답이 보기 표식인 것」만 셌으면 ${markAnswered.length}건이다.` +
      ` **그 열쇠는 ${missedByMarkKey}건을 못 본다.**`,
  );

  const markAnswerNoChoices = markAnswered.filter(
    (r) => !hasChoices(r.content),
  );
  console.log(
    `  ⚠️ 정답이 표식인데 지면에 보기가 없다: ${markAnswerNoChoices.length}건`,
  );
  for (const r of markAnswerNoChoices.slice(0, 8)) {
    console.log(`     · ${r.label} «${r.answer}»  ${r.familyKey}`);
  }

  const cross = new Map<string, number>();
  for (const r of choice) {
    bump(
      cross,
      `보기 ${choiceCountOf(r.content)} × 정답 ${answerKind(r.answer)}`,
    );
  }
  console.log(`\n=== 보기 개수 × 정답 모양 ===`);
  for (const [k, n] of [...cross.entries()].sort()) {
    console.log(`  ${k.padEnd(24)} ${String(n).padStart(5)}`);
  }

  const byCount = new Map<number, number>();
  for (const r of choice) bump(byCount, choiceCountOf(r.content));
  console.log(`\n=== 보기 개수 분포 (보기 있는 문항 ${choice.length}건) ===`);
  for (const [n, c] of [...byCount.entries()].sort((a, b) => a[0] - b[0])) {
    const flag = n === CHOICE_COUNT ? "" : "   ← 다섯이 아니다";
    console.log(
      `  보기 ${String(n).padStart(2)}개   ${String(c).padStart(5)}${flag}`,
    );
  }

  const odd = choice.filter((r) => choiceCountOf(r.content) !== CHOICE_COUNT);
  console.log(`\n=== 보기가 다섯이 아닌 문항 ${odd.length}건 ===`);
  const byFamily = new Map<string, number>();
  for (const r of odd) bump(byFamily, `${r.familyKey}  |  ${r.unit}`);
  for (const [k, n] of [...byFamily.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${k}`);
  }
  console.log(`\n  — 문항 목록 (앞 40) —`);
  for (const r of odd.slice(0, 40)) {
    console.log(
      `  ${r.label}  보기 ${choiceCountOf(r.content)}  정답 «${r.answer}» (${answerKind(r.answer)})  ${r.familyKey}`,
    );
  }

  const qt = new Map<string, number>();
  for (const r of choice) bump(qt, r.questionType);
  console.log(
    `\n보기 있는 문항들의 question_type 컬럼 값: ` +
      [...qt.entries()].map(([k, n]) => `${k} ${n}`).join(" · ") +
      `\n  (이 컬럼으로 갈랐으면 분모가 달라졌을 것이다 — 그래서 안 쓴다)`,
  );
}

if (process.argv[1]?.includes("census-choice-count")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
