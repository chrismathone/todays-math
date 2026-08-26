/**
 * 형식 필터의 **지문** — 변이 하네스의 ⑶ 단계(「동작이 바뀌었나」)가 쓴다.
 *
 *     npx tsx scripts/qa/format-filter-fingerprint.ts
 *
 * ## 왜 필요한가
 *
 * 「파일이 바뀌었다」와 「동작이 바뀌었다」는 다른 말이다. 이 저장소는 그 한 겹을
 * 빠뜨려 **멀쩡한 가드를 의심하고 고치러 갈 뻔했다**(CLAUDE.md 2026-08-21). 그래서
 * 변이를 넣은 뒤 이 지문을 다시 찍어 달라졌는지 먼저 보고, 안 달라졌으면 판정을 **거부**한다.
 *
 * ## 무엇을 찍나 — DB 를 안 쓴다(순수하고 빠르다)
 *
 *  ⑴ 판정 — 입력 공간 전수 × 보기 칸 수마다 `classifyFormatWithChoices` ·
 *     `formatWithoutContent` · `formatSuperset` 의 답
 *  ⑵ 후보 집합의 **Prisma `where` 조각** — JSON 으로 굳혀 찍는다. 조건을 고치면
 *     여기가 달라진다(규칙 함수만 보면 SQL 쪽 변이가 「동작 그대로」로 거부된다)
 *  ⑶ 「유형」 드롭다운이 값을 두 축으로 가르는 표
 *  ⑷ 응답 직렬화가 형식 판정의 **증거를 싣는가** — `serializeProblem` 이 낸 값으로
 *     라벨을 다시 매겨 찍는다. `questionType` 을 빠뜨리면 여기가 달라진다.
 *
 * ⚠️ **라우트(`route.ts`)와 MSW 핸들러는 여기 없다.** 서버 없이는 못 그린다 — 그 둘의
 *    변이는 하네스가 ⑶ 을 «구조»로 표시하고 넘어간다. 숨기지 않으려고 적어 둔다.
 */
import type { Problem as ProblemRow } from "@prisma/client";

import {
  PROBLEM_FILTER_OPTIONS,
  splitProblemFilterValue,
} from "../../src/components/problem/labels";
import { serializeProblem } from "../../src/lib/serializers";
import {
  classifyFormat,
  classifyFormatWithChoices,
  FILTERABLE_FORMATS,
  FORMAT_COND_EXERCISE,
  FORMAT_SUPERSET_WHERE,
  formatSuperset,
  toPrismaWhere,
  formatWithoutContent,
  type FormatEvidence,
} from "../../src/lib/problem/provenance";

const CHOICE_COUNTS = [0, 1, 2, 5];
const ANSWERS = ["12", "①"];
const QUESTION_TYPES = [null, "", "객관식", "단답형", "서술형"];
const PROBLEM_TYPES = [null, "계산", "개념", "활용", "서술형"];
const FAMILY_KEYS = [null, "solo:abc", "elem:초6|x|연산", "mid:3-1|y|06"];

function everyEvidence(): FormatEvidence[] {
  const rows: FormatEvidence[] = [];
  for (const answer of ANSWERS) {
    for (const questionType of QUESTION_TYPES) {
      for (const problemType of PROBLEM_TYPES) {
        for (const familyKey of FAMILY_KEYS) {
          rows.push({ answer, questionType, problemType, familyKey });
        }
      }
    }
  }
  return rows;
}

/** 직렬화가 형식 증거를 잃는지 보려고 세우는 최소 행 — 값은 판정을 가르도록 골랐다. */
function sampleRow(
  questionType: string | null,
  problemType: string,
  content = "다음을 구하시오.",
  answer = "7",
): ProblemRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    problemCode: "J10101-AAAA",
    userId: null,
    unitId: "00000000-0000-4000-8000-000000000002",
    source: "past_exam",
    originProblemId: null,
    familyKey: null,
    difficulty: "기본",
    problemType,
    questionType,
    content,
    answer,
    solution: null,
    reviewStatus: "approved",
    directUseAllowed: true,
    pool: "shared",
    figureUrls: [],
    figureSvg: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as unknown as ProblemRow;
}

const lines: string[] = [];

lines.push("## ⑴ 판정");
for (const ev of everyEvidence()) {
  const key = `${ev.answer}|${ev.questionType ?? "∅"}|${ev.problemType ?? "∅"}|${ev.familyKey ?? "∅"}`;
  const verdicts = CHOICE_COUNTS.map((n) =>
    classifyFormatWithChoices(n, ev),
  ).join(",");
  const supersets = FILTERABLE_FORMATS.map((f) =>
    formatSuperset(ev, f) ? "1" : "0",
  ).join("");
  lines.push(
    `${key} :: ${verdicts} | ${formatWithoutContent(ev) ?? "∅"} | ${supersets}`,
  );
}

lines.push("## ⑵ 후보 집합 where");
for (const format of FILTERABLE_FORMATS) {
  lines.push(`${format} :: ${JSON.stringify(FORMAT_SUPERSET_WHERE[format])}`);
}
// 뽑아 내는 함수의 **모든 가지**를 밟는다 — 실제 조건이 안 쓰는 모양까지.
// 이게 없으면 안 쓰이는 가지를 망가뜨린 변이가 「동작 그대로」로 판정 거부된다.
lines.push(`연습 :: ${JSON.stringify(toPrismaWhere(FORMAT_COND_EXERCISE))}`);

lines.push("## ⑶ 유형 드롭다운");
for (const option of PROBLEM_FILTER_OPTIONS) {
  lines.push(
    `${option.label} :: ${option.value} → ${JSON.stringify(splitProblemFilterValue(option.value))}`,
  );
}

/**
 * 본문 두 갈래 — **보기 0칸**과 **보기 5칸 + 정답이 보기 번호**.
 *
 * ⚠️ 5칸짜리가 **꼭 있어야 한다.** 전에는 표본이 전부 0칸이라 「`classifyFormat` 이
 *    보기 칸 수를 늘 0으로 넘긴다」 변이가 지문을 **안 바꿨고**, 하네스가 그 변이를
 *    「무효」로 판정 거부했다(2026-08-26). 지문이 못 보는 축은 변이시킬 수 없다.
 */
const CONTENTS: [string, string, string][] = [
  ["보기0", "다음을 구하시오.", "7"],
  ["보기5", "다음 중 옳은 것은?\n① 가\n② 나\n③ 다\n④ 라\n⑤ 마", "③"],
];

lines.push("## ⑷ 직렬화가 싣는 증거");
for (const [shape, content, answer] of CONTENTS) {
  for (const questionType of QUESTION_TYPES) {
    for (const problemType of ["계산", "서술형"]) {
      const row = sampleRow(questionType, problemType, content, answer);
      const sent = serializeProblem(row);
      lines.push(
        `${shape}|${questionType ?? "∅"}|${problemType} :: 서버 ${classifyFormat(row)} · 화면 ${classifyFormat(sent)}`,
      );
    }
  }
}

process.stdout.write(`${lines.join("\n")}\n`);
