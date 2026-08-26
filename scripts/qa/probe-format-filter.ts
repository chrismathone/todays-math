/**
 * **형식 필터 후보 실측** — 「SQL 로 거른 것」과 「화면이 붙이는 라벨」이 몇 건 어긋나나.
 *
 * ```
 *   npx tsx scripts/qa/probe-format-filter.ts           # 후보별 어긋남 수
 *   npx tsx scripts/qa/probe-format-filter.ts --list    # 어긋난 문항 코드까지
 * ```
 *
 * ## 왜 재나
 *
 * 원장님 지시 2026-08-26: 「유형 드롭다운에 단답형 추가 · [단] 을 거를 수 있게 ·
 * [서] 도 서술형 필터에 걸리게」. 그런데 화면 라벨 `[객][단][서]` 는 **파생값**이다
 * (`classifyFormat` 이 content·answer·questionType·familyKey 를 **함께** 본다).
 * `/api/problems` 는 서버에서 거르고 페이지를 나누므로 Prisma `where` 에 넣을 수 있는
 * 조건이 필요한데, `content` 파싱(보기 세기)은 SQL 로 옮길 수 없다.
 *
 * 그래서 **후보 조건마다 「라벨과 몇 건 어긋나나」를 전량에 대고 센다.** 0이 아니면
 * 필터와 라벨이 갈리고, 그것은 원장님의 최우선 규칙(「모든 화면에서 모든 문제가 똑같은
 * 규칙으로 똑같이 보여야 한다」)을 깨는 것이다.
 *
 * ## 어긋남을 **두 방향으로** 센다
 *
 *   · `필터만` — SQL 은 뽑는데 라벨이 다르다 → 「[객] 인데 단답형 필터에 나온다」
 *   · `라벨만` — 라벨은 맞는데 SQL 이 안 뽑는다 → 「[단] 인데 단답형으로 걸러도 안 나온다」
 *
 * 한 방향만 세면 나머지는 구조적으로 0이다(2026-08-20 「양성만 대면 지어냄이 0」).
 *
 * ## 이 조사가 못 보는 것
 *
 * 판정의 «참»은 `classifyFormat` 이다 — 그 함수가 틀렸다면 이 수치는 그 틀림을 그대로
 * 물려받는다. 여기서 재는 것은 **「필터가 라벨과 같은 답을 내나」** 뿐이고, **「라벨이
 * 옳은가」는 다른 물음**이다(그쪽 대조군은 `probe-provenance.ts` 가 본다).
 */
import { PrismaClient } from "@prisma/client";

import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";

import {
  classifyFormat,
  FILTERABLE_FORMATS,
  FORMAT_SUPERSET_WHERE,
  formatSuperset,
  formatWithoutContent,
  PROBLEM_FORMATS,
  type ProblemFormat,
  type ProvenanceInput,
} from "../../src/lib/problem/provenance";

import { isDirectScript } from "../import/isDirectScript";

/** SQL 이 볼 수 있는 컬럼만 후보에 넘긴다 — `content` 는 여기 없다(파싱이 필요하다). */
export type SqlVisible = {
  source: string;
  familyKey: string | null;
  answer: string;
  questionType?: string | null;
  problemType?: string | null;
};

type Row = ProvenanceInput & {
  problemCode: string;
  problemType: string | null;
};

/** 정답 칸에 보기 번호가 있나 — Postgres `~` 로 그대로 옮길 수 있는 조건이다. */
const ANSWER_CIRCLED = /[\u2460-\u2473\u2776-\u277F\u2780-\u2789\u278A-\u2793]/;

/**
 * 후보 조건 — **`content` 를 안 본다.** 각 후보는 「이 형식으로 걸렀을 때 SQL 이 뽑는
 * 행」을 흉내 낸다. 이름은 보고서에 그대로 나간다.
 */
export const CANDIDATES: ReadonlyArray<{
  name: string;
  detail: string;
  match: (row: SqlVisible, want: ProblemFormat) => boolean;
}> = [
  {
    name: "A. 현행 유형 필터 (problem_type)",
    detail: "지금 화면의 「유형」 드롭다운. 서술형만 형식 축과 겹친다.",
    match: (r, want) =>
      want === "descriptive" ? r.problemType === "서술형" : false,
  },
  {
    name: "B. question_type 직결",
    detail: "question_type = '단답형' | '서술형' | '객관식'",
    match: (r, want) =>
      (want === "short_answer" && r.questionType === "단답형") ||
      (want === "descriptive" && r.questionType === "서술형") ||
      (want === "multiple_choice" && r.questionType === "객관식") ||
      (want === "unknown" && r.questionType === null),
  },
  {
    name: "C. question_type + 엔진 표지",
    detail:
      "B 에 「family_key 가 elem:/mid: 이면 단답형」을 더한다(엔진은 전량 단답형 생성기).",
    match: (r, want) => {
      const engine =
        (r.familyKey ?? "").startsWith("elem:") ||
        (r.familyKey ?? "").startsWith("mid:");
      if (want === "short_answer") {
        return (
          r.questionType === "단답형" || (engine && r.questionType === null)
        );
      }
      if (want === "descriptive") return r.questionType === "서술형";
      if (want === "multiple_choice") return r.questionType === "객관식";
      return r.questionType === null && !engine;
    },
  },
  {
    name: "D. C + 정답 원문자",
    detail:
      "C 에 「정답이 보기 번호면 객관식」을 더한다. content 파싱만 빠진 판이다.",
    match: (r, want) => {
      const circled = ANSWER_CIRCLED.test(r.answer);
      const engine =
        (r.familyKey ?? "").startsWith("elem:") ||
        (r.familyKey ?? "").startsWith("mid:");
      if (circled) return want === "multiple_choice";
      if (want === "short_answer") {
        return (
          r.questionType === "단답형" || (engine && r.questionType !== "서술형")
        );
      }
      if (want === "descriptive") {
        return (
          r.questionType === "서술형" ||
          (r.questionType === null && !engine && r.problemType === "서술형")
        );
      }
      if (want === "multiple_choice") return r.questionType === "객관식";
      return r.questionType === null && !engine && r.problemType !== "서술형";
    },
  },
];

export async function loadRows(prisma: PrismaClient): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT "source"::text                                    AS "source",
           "family_key"                                      AS "familyKey",
           "origin_problem_id"::text                         AS "originProblemId",
           "figure_urls"                                     AS "figureUrls",
           CASE WHEN "figure_svg" IS NOT NULL AND "figure_svg" <> ''
                THEN '<svg/>' ELSE NULL END                  AS "figureSvg",
           "content", "answer",
           "problem_code"                                    AS "problemCode",
           "question_type"                                   AS "questionType",
           "problem_type"                                    AS "problemType"
      FROM "problem"
  `;
}

export type Mismatch = {
  candidate: string;
  format: ProblemFormat;
  /** SQL 은 뽑는데 라벨이 다르다. */
  filterOnly: string[];
  /** 라벨은 그것인데 SQL 이 안 뽑는다. */
  labelOnly: string[];
  /** 라벨 기준 그 형식의 전체 건수 — 어긋남의 분모다. */
  labelTotal: number;
};

export function measure(rows: readonly Row[]): {
  total: number;
  labelCount: Record<ProblemFormat, number>;
  mismatches: Mismatch[];
} {
  const labelCount = Object.fromEntries(
    PROBLEM_FORMATS.map((k) => [k, 0]),
  ) as Record<ProblemFormat, number>;
  const labels = new Map<Row, ProblemFormat>();
  for (const row of rows) {
    const fmt = classifyFormat(row);
    labels.set(row, fmt);
    labelCount[fmt] += 1;
  }

  const mismatches: Mismatch[] = [];
  for (const candidate of CANDIDATES) {
    for (const format of PROBLEM_FORMATS) {
      const filterOnly: string[] = [];
      const labelOnly: string[] = [];
      for (const row of rows) {
        const label = labels.get(row)!;
        const picked = candidate.match(row, format);
        if (picked && label !== format) filterOnly.push(row.problemCode);
        if (!picked && label === format) labelOnly.push(row.problemCode);
      }
      mismatches.push({
        candidate: candidate.name,
        format,
        filterOnly,
        labelOnly,
        labelTotal: labelCount[format],
      });
    }
  }
  return { total: rows.length, labelCount, mismatches };
}

/**
 * 「정답에 보기 번호가 있는데 라벨은 객관식이 아니다」인 행을 눈으로 보게 편다.
 * 후보 D 가 어긋나는 자리가 **정확히 이 부류**다 — 수만 세면 무엇이 옳은지 못 정한다.
 */
export function inspectCircledNonChoice(rows: readonly Row[]) {
  const out: {
    problemCode: string;
    label: ProblemFormat;
    questionType: string | null;
    problemType: string | null;
    choices: number;
    figures: number;
    answer: string;
    head: string;
  }[] = [];
  for (const row of rows) {
    if (!ANSWER_CIRCLED.test(row.answer)) continue;
    const label = classifyFormat(row);
    if (label === "multiple_choice") continue;
    out.push({
      problemCode: row.problemCode,
      label,
      questionType: row.questionType ?? null,
      problemType: row.problemType,
      choices: parseProblemContent(row.content).choices.length,
      figures: row.figureUrls.length,
      answer: row.answer.replace(/\s+/g, " ").slice(0, 44),
      head: row.content.replace(/\s+/g, " ").slice(0, 96),
    });
  }
  return out;
}

/**
 * 「지금 유형=서술형 으로 걸리는 것」과 「라벨이 [서] 인 것」이 어떻게 어긋나나.
 * 드롭다운의 «서술형» 을 어느 축으로 붙일지는 **이 표를 보고** 정한다.
 */
export function crossProblemTypeVsFormat(rows: readonly Row[]) {
  const table = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.problemType ?? "null"} × ${classifyFormat(row)}`;
    table.set(key, (table.get(key) ?? 0) + 1);
  }
  return [...table].sort((a, b) => b[1] - a[1]);
}

/**
 * **후보 집합의 SQL 판과 JS 판이 같은 행을 고르는가** — 그리고 「후보 − 어긋난 행」이
 * 정말 라벨 집합과 같은가. 공유 DB **전량**에 대고 잰다.
 *
 * 왜 여기서만 잴 수 있나: `FORMAT_SUPERSET_WHERE`(Prisma)와 `formatSuperset`(JS)은
 * **규칙을 두 벌 적은 것**이고, 둘이 갈리는 자리는 대개 **NULL 삼값논리**다
 * (`question_type <> '서술형'` 은 널 행에 대해 참이 아니다). 그건 JS 로는 흉내 낼 수
 * 없다 — 진짜 Postgres 에 물어봐야 한다.
 *
 * 그리고 이 확인이 라우트 전체를 덮는다: 라우트가 하는 일이 정확히
 * 「후보 집합을 긁고 → 어긋난 행을 빼고 → 그 결과를 돌려준다」이기 때문이다.
 */
async function probeSuperset(prisma: PrismaClient, rows: readonly Row[]) {
  const byId = new Map<string, Row & { id: string }>();
  const all = await prisma.$queryRaw<(Row & { id: string })[]>`
    SELECT "id"::text AS "id",
           "source"::text AS "source",
           "family_key" AS "familyKey",
           "origin_problem_id"::text AS "originProblemId",
           "figure_urls" AS "figureUrls",
           CASE WHEN "figure_svg" IS NOT NULL AND "figure_svg" <> ''
                THEN '<svg/>' ELSE NULL END AS "figureSvg",
           "content", "answer",
           "problem_code" AS "problemCode",
           "question_type" AS "questionType",
           "problem_type" AS "problemType"
      FROM "problem"
  `;
  for (const row of all) byId.set(row.id, row);
  if (all.length !== rows.length) {
    console.log(
      `⚠️ 두 조회의 분모가 다르다 (${rows.length} vs ${all.length}) — 그 사이 행이 늘었다.`,
    );
  }

  let broken = 0;
  for (const format of FILTERABLE_FORMATS) {
    const started = Date.now();
    const sqlRows = await prisma.problem.findMany({
      where: FORMAT_SUPERSET_WHERE[format] as never,
      select: { id: true },
    });
    const supersetMs = Date.now() - started;
    const sqlIds = new Set(sqlRows.map((r) => r.id));
    const jsIds = new Set(
      all.filter((row) => formatSuperset(row, format)).map((row) => row.id),
    );

    const sqlOnly = [...sqlIds].filter((id) => !jsIds.has(id));
    const jsOnly = [...jsIds].filter((id) => !sqlIds.has(id));

    // 후보 안에서 본문을 읽어야 하는 행 · 최종적으로 빠질 행.
    const candidates = [...jsIds].map((id) => byId.get(id)!);
    const needContent = candidates.filter(
      (row) => formatWithoutContent(row) === null,
    );
    const rejected = candidates.filter((row) => classifyFormat(row) !== format);
    const labelCount = all.filter(
      (row) => classifyFormat(row) === format,
    ).length;
    const served = candidates.length - rejected.length;

    const ok =
      sqlOnly.length === 0 && jsOnly.length === 0 && served === labelCount;
    if (!ok) broken += 1;
    console.log(`\n── ${format}`);
    console.log(
      `   ${ok ? "🟢" : "🔴"} 후보 SQL ${sqlIds.size.toLocaleString()} · JS ${jsIds.size.toLocaleString()}` +
        ` (SQL만 ${sqlOnly.length} · JS만 ${jsOnly.length})  [${supersetMs}ms]`,
    );
    console.log(
      `      본문을 읽어야 하는 행 ${needContent.length} · 빠질 행 ${rejected.length}` +
        ` → 내보내는 행 ${served.toLocaleString()} / 라벨 ${labelCount.toLocaleString()}`,
    );
    for (const id of [...sqlOnly, ...jsOnly].slice(0, 5)) {
      const row = byId.get(id);
      console.log(
        `      ⚠️ ${row?.problemCode ?? id} qt=${row?.questionType ?? "null"} pt=${row?.problemType ?? "null"} family=${row?.familyKey ?? "null"}`,
      );
    }
  }
  return broken;
}

/**
 * 응답이 `questionType` 을 안 실으면 화면 라벨이 몇 건이나 달라지나 —
 * 2026-08-26 에 `serializeProblem` 이 그 값을 빠뜨리고 있던 결함의 크기다.
 */
function blindWithoutQuestionType(rows: readonly Row[]) {
  const drift = new Map<string, number>();
  for (const row of rows) {
    const withIt = classifyFormat(row);
    const without = classifyFormat({ ...row, questionType: null });
    if (withIt === without) continue;
    const key = `${withIt} → ${without}`;
    drift.set(key, (drift.get(key) ?? 0) + 1);
  }
  return [...drift].sort((a, b) => b[1] - a[1]);
}

async function main() {
  const list = process.argv.includes("--list");
  const prisma = new PrismaClient();
  try {
    const rows = await loadRows(prisma);
    if (process.argv.includes("--superset")) {
      console.log(
        `전량 ${rows.length.toLocaleString()}건 — 후보 집합 SQL↔JS 대조 + 「후보 − 어긋난 행 = 라벨」`,
      );
      const broken = await probeSuperset(prisma, rows);
      console.log("\n── 응답이 questionType 을 안 실을 때의 라벨 표류");
      const drift = blindWithoutQuestionType(rows);
      if (drift.length === 0) console.log("   (없음)");
      for (const [key, n] of drift) {
        console.log(`   ${key.padEnd(34)} ${String(n).padStart(7)}`);
      }
      if (broken > 0) process.exitCode = 1;
      return;
    }
    if (process.argv.includes("--cross")) {
      console.log("problem_type × 형식 라벨 (전량)");
      for (const [key, n] of crossProblemTypeVsFormat(rows)) {
        console.log(`   ${key.padEnd(34)} ${String(n).padStart(7)}`);
      }
      return;
    }
    if (process.argv.includes("--inspect")) {
      const found = inspectCircledNonChoice(rows);
      console.log(`정답에 보기 번호가 있는데 라벨이 [객] 이 아닌 행 — ${found.length}건
`);
      const byLabel = new Map<string, number>();
      for (const f of found)
        byLabel.set(f.label, (byLabel.get(f.label) ?? 0) + 1);
      for (const [k, v] of byLabel) console.log(`   ${k}: ${v}`);
      const byChoices = new Map<number, number>();
      for (const f of found)
        byChoices.set(f.choices, (byChoices.get(f.choices) ?? 0) + 1);
      console.log(
        `   보기 칸 수 분포: ${[...byChoices]
          .sort((a, b) => a[0] - b[0])
          .map(([k, v]) => `${k}칸=${v}`)
          .join(" · ")}`,
      );
      const limit = Number(process.env.SAMPLE ?? 30);
      for (const f of found.slice(0, limit)) {
        console.log(
          `
  ${f.problemCode} [${f.label}] qt=${f.questionType ?? "null"} pt=${f.problemType} 보기=${f.choices} 그림=${f.figures}` +
            `
     정답: ${f.answer}` +
            `
     본문: ${f.head}`,
        );
      }
      return;
    }
    const r = measure(rows);
    console.log(
      `\n전량 ${r.total.toLocaleString()}건 — 라벨(classifyFormat) 분포`,
    );
    for (const k of PROBLEM_FORMATS) {
      console.log(`   ${k.padEnd(16)} ${r.labelCount[k].toLocaleString()}`);
    }
    for (const candidate of CANDIDATES) {
      console.log(`\n── ${candidate.name}`);
      console.log(`   ${candidate.detail}`);
      for (const m of r.mismatches.filter(
        (x) => x.candidate === candidate.name,
      )) {
        const bad = m.filterOnly.length + m.labelOnly.length;
        const mark = bad === 0 ? "🟢" : "🔴";
        console.log(
          `   ${mark} ${m.format.padEnd(16)} 라벨 ${String(m.labelTotal).padStart(6)} · ` +
            `필터만 ${String(m.filterOnly.length).padStart(6)} · 라벨만 ${String(m.labelOnly.length).padStart(6)}`,
        );
        if (list && bad > 0) {
          for (const c of m.filterOnly.slice(0, 10))
            console.log(`        필터만 ${c}`);
          for (const c of m.labelOnly.slice(0, 10))
            console.log(`        라벨만 ${c}`);
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (isDirectScript(import.meta.url)) {
  void main();
}
