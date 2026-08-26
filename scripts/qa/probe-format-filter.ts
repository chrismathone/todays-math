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

async function main() {
  const list = process.argv.includes("--list");
  const prisma = new PrismaClient();
  try {
    const rows = await loadRows(prisma);
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
