/**
 * 읽기 전용. 리드가 main의 .env로만 실행한다(학생 자료는 조회하지 않는다).
 * node --env-file=.env --conditions=react-server --import tsx scripts/qa/math-srs/count-form-items.ts
 *
 * 분모 1: 현행 소단원마다 seed 0~31로 생성한 최종 세션 문항(표본).
 * 분모 2: 은행 자격 행 전체 → 현행 상위 200 조회창 → self-check 제외 → 생존 후보.
 * 후보 필터와 생성기는 운영 함수를 그대로 호출한다. 시험에서는 DB를 불러오지 않는다.
 */
import { execFileSync } from "node:child_process";
import {
  getCourseProblemInput,
  needsComparison,
} from "../../../src/lib/math-srs/elementary/answers";
import { requiredForm } from "../../../src/lib/math-srs/elementary/answerForms";
import type { CourseProblem } from "../../../src/lib/math-srs/elementary/types";
import { isDirectScript } from "../../import/isDirectScript";

const REASONS = [
  "기약분수",
  "대분수",
  "가분수",
  "소수",
  "분수",
  "약분",
  "통분",
  "그리기",
  "설명",
  "식 쓰기",
] as const;
type Reason = (typeof REASONS)[number];
const emptyReasons = () =>
  Object.fromEntries(REASONS.map((reason) => [reason, 0])) as Record<
    Reason,
    number
  >;

/** Mirrors the existing gate, including mentions of intermediate steps. */
export function comparisonReasons(content: string): Reason[] {
  const found = new Set<Reason>();
  for (const match of content.matchAll(
    /(대분수|가분수|기약분수|소수|분수)\s*(?:로|꼴로)\s*(?:고치|고쳐|고쳤|나타내|나타냈|쓰|바꾸)/g,
  ))
    found.add(match[1] as Reason);
  const other: [Reason, RegExp][] = [
    ["약분", /약분(?:하|해)/],
    ["통분", /통분(?:하|해)/],
    ["그리기", /그리시오|그려\s*보/],
    ["설명", /이유를|설명하/],
    ["식 쓰기", /식을\s*(?:쓰|만드)/],
  ];
  for (const [reason, pattern] of other)
    if (pattern.test(content)) found.add(reason);
  if (Boolean(found.size) !== needsComparison({ content, answer: "" }))
    throw new Error(
      "needsComparison과 집계 사유가 달라졌습니다. 집계 규칙을 확인하세요.",
    );
  return REASONS.filter((reason) => found.has(reason));
}

export function countFinalProblems(problems: readonly CourseProblem[]) {
  const counts = {
    total: 0,
    fourChoicesAvailable: 0,
    fourChoicesShown: 0,
    directInput: 0,
    interactive: 0,
    selfCheck: 0,
    comparison: 0,
    supportedForm: { irreducible: 0, mixed: 0 },
    reasons: emptyReasons(),
  };
  for (const problem of problems) {
    counts.total++;
    const selfCheck = problem.input.mode === "self-check";
    const fourChoices = !selfCheck && problem.answerChoices?.length === 4;
    if (fourChoices) counts.fourChoicesAvailable++;
    if (selfCheck) counts.selfCheck++;
    else if (problem.interactive?.kind === "fraction-parts")
      counts.interactive++;
    else if (fourChoices) counts.fourChoicesShown++;
    else counts.directInput++;
    const reasons = comparisonReasons(problem.content);
    if (reasons.length) counts.comparison++;
    for (const reason of reasons) counts.reasons[reason]++;
    const form = requiredForm(problem);
    if (form) counts.supportedForm[form]++;
  }
  return counts;
}

export function countBankWindow(
  rows: readonly Pick<CourseProblem, "content" | "answer">[],
) {
  const counts = {
    loaded: rows.length,
    selfCheckExcluded: 0,
    numeric: 0,
    selfCheckGroups: { irreducible: 0, mixed: 0, other: 0 },
    reasons: emptyReasons(),
  };
  for (const row of rows) {
    if (getCourseProblemInput(row).mode === "number") {
      counts.numeric++;
      continue;
    }
    counts.selfCheckExcluded++;
    const reasons = comparisonReasons(row.content);
    for (const reason of reasons) counts.reasons[reason]++;
    // Exclusive groups; multiple target forms or no target form stay in "other".
    const irreducible = reasons.includes("기약분수");
    const mixed = reasons.includes("대분수");
    if (irreducible && !mixed) counts.selfCheckGroups.irreducible++;
    else if (mixed && !irreducible) counts.selfCheckGroups.mixed++;
    else counts.selfCheckGroups.other++;
  }
  return counts;
}

type Counts = ReturnType<typeof countFinalProblems>;
const FINAL_METRICS = [
  "fourChoicesAvailable",
  "fourChoicesShown",
  "directInput",
  "interactive",
  "selfCheck",
  "comparison",
] as const;
function addCounts(total: Counts, next: Counts) {
  for (const key of ["total", ...FINAL_METRICS] as const)
    total[key] += next[key];
  for (const reason of REASONS) total.reasons[reason] += next.reasons[reason];
  total.supportedForm.irreducible += next.supportedForm.irreducible;
  total.supportedForm.mixed += next.supportedForm.mixed;
}

const share = (count: number, denominator: number) => ({
  count,
  denominator,
  percent: denominator
    ? Number(((100 * count) / denominator).toFixed(4))
    : null,
});

async function main() {
  if (
    execFileSync("git", ["branch", "--show-current"], {
      encoding: "utf8",
    }).trim() !== "main"
  )
    throw new Error(
      "리드가 main에서만 실행해야 합니다. 워크트리에서는 DB를 조회하지 않습니다.",
    );
  if (!process.env.DATABASE_URL)
    throw new Error("main의 .env를 --env-file=.env로 불러오세요.");

  // Importing the pure counters in Vitest never loads db or the server-only loader.
  const { db } = await import("../../../src/lib/db");
  try {
    const { problemEligibleWhere } =
      await import("../../../src/lib/problemEligibility");
    const { loadCourseBankCandidates } =
      await import("../../../src/lib/math-srs/courseBank");
    const { COURSE_SECTIONS } =
      await import("../../../src/lib/math-srs/elementary/catalog");
    const { generateCourseSession } =
      await import("../../../src/lib/math-srs/elementary/generator");
    const seeds = Array.from({ length: 32 }, (_, seed) => seed);
    const generatedAt = new Date().toISOString();
    const now = new Date("2026-10-01T00:00:00.000Z");
    const final = countFinalProblems([]);
    const bank = {
      eligibleBeforeLimit: 0,
      ...countBankWindow([]),
      otherExcludedAfterSelfCheck: 0,
      survivors: 0,
      survivorsInSessionTiers: 0,
    };
    const bySection = [];
    for (const section of COURSE_SECTIONS) {
      const unit = await db.unit.findFirst({
        where: {
          grade: section.unit.grade,
          chapter: section.unit.chapter,
          section: section.unit.section,
        },
        select: { id: true },
      });
      const where = {
        ...problemEligibleWhere(),
        unitId: unit?.id,
        questionType: "단답형",
      };
      const eligibleBeforeLimit = unit ? await db.problem.count({ where }) : 0;
      const rows = unit
        ? await db.problem.findMany({
            where,
            select: { content: true, answer: true },
            orderBy: { id: "asc" },
            take: 200,
          })
        : [];
      // Do not maintain another copy of the production survival filter.
      const candidates = await loadCourseBankCandidates(section.id);
      const window = countBankWindow(rows);
      const otherExcludedAfterSelfCheck = window.numeric - candidates.length;
      if (otherExcludedAfterSelfCheck < 0)
        throw new Error(
          `집계 중 은행이 바뀌었거나 로더가 바뀌었습니다: ${section.id}`,
        );
      const survivorsInSessionTiers = candidates.filter((candidate) =>
        ["연산", "기본", "응용"].includes(candidate.tier),
      ).length;
      bank.eligibleBeforeLimit += eligibleBeforeLimit;
      bank.loaded += window.loaded;
      bank.selfCheckExcluded += window.selfCheckExcluded;
      bank.numeric += window.numeric;
      bank.otherExcludedAfterSelfCheck += otherExcludedAfterSelfCheck;
      bank.survivors += candidates.length;
      bank.survivorsInSessionTiers += survivorsInSessionTiers;
      for (const key of ["irreducible", "mixed", "other"] as const)
        bank.selfCheckGroups[key] += window.selfCheckGroups[key];
      for (const reason of REASONS)
        bank.reasons[reason] += window.reasons[reason];

      const sectionFinal = countFinalProblems([]);
      for (const seed of seeds)
        addCounts(
          sectionFinal,
          countFinalProblems(
            generateCourseSession(section.id, seed, now, "learn", candidates)
              .problems,
          ),
        );
      addCounts(final, sectionFinal);
      bySection.push({
        sectionId: section.id,
        bank: {
          eligibleBeforeLimit,
          ...window,
          otherExcludedAfterSelfCheck,
          survivors: candidates.length,
          survivorsInSessionTiers,
        },
        final: sectionFinal,
      });
      process.stderr.write(
        `${section.id}: 최종 표본 ${sectionFinal.total}문항 집계\n`,
      );
    }

    console.log(
      JSON.stringify(
        {
          generatedAt,
          denominator: {
            description:
              "현행 소단원별 고정 seed 세션의 최종 문항 표본; 학생 노출 빈도나 가능한 모든 문항의 전수가 아님",
            sections: COURSE_SECTIONS.length,
            seeds,
            sessions: COURSE_SECTIONS.length * seeds.length,
            itemsPerSession: 5,
            finalItems: final.total,
            bank: "출제 자격 단답형 전체 → 단원별 id순 상위 200 → self-check 우선 제외 → 나머지 필터 제외 → 운영 로더 생존 후보",
            notes: [
              "은행 단답형 전체는 problemEligibleWhere와 DB 가시성 울타리를 통과한 행이다. 저장소 밖 은행 원본 전체가 아니다.",
              "self-check 제외 사유는 상위 200 조회창 안에서 센다. 그 뒤의 행으로 조회창을 다시 채우지 않는다.",
              "기약분수·대분수 제외 묶음은 현행 needsComparison 언급 기준; 실제 자동 판정 가능한 직접 명령 수와 다르다.",
              "두 꼴이 함께 언급되면 제외 묶음은 other이며, 상세 reasons는 중복 집계이므로 합이 분모를 넘을 수 있다.",
              "fourChoicesAvailable은 보기 4개를 만들 수 있는 수, fourChoicesShown은 분수 칠하기 우선 표시까지 반영한 수다.",
              "fourChoicesShown + directInput + interactive + selfCheck = finalItems. 분수 칠하기를 직접 입력으로 세지 않는다.",
              "은행 조회는 순차 읽기이며 동시 수정에 대한 단일 시점 스냅샷은 아니다.",
            ],
          },
          final,
          finalShares: Object.fromEntries(
            FINAL_METRICS.map((key) => [key, share(final[key], final.total)]),
          ),
          comparisonReasonsAmongSelfCheck: Object.fromEntries(
            REASONS.map((reason) => [
              reason,
              share(final.reasons[reason], final.selfCheck),
            ]),
          ),
          bank,
          bankShares: {
            selfCheckAmongLoaded: share(bank.selfCheckExcluded, bank.loaded),
            survivorsAmongLoaded: share(bank.survivors, bank.loaded),
            reasonsAmongSelfCheck: Object.fromEntries(
              REASONS.map((reason) => [
                reason,
                share(bank.reasons[reason], bank.selfCheckExcluded),
              ]),
            ),
          },
          bySection,
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}

if (isDirectScript(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "집계 실패");
    process.exitCode = 1;
  });
}
