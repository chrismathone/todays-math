/**
 * 문제은행 P0 — **출처 메타데이터 · 지정 두 슬롯 준비도 조사** (읽기 전용 · 2026-10-14).
 *
 *   npx tsx --env-file=<.env> scripts/qa/bank/bank-readiness-census.ts [--out <폴더>]
 *
 * goal-bank-arithmetic-brand §출처별 탐색 «실행 전에 다음 준비도 표를 실제 데이터에서 산출한다» 의 표:
 *   1. 교과서 — 출판사 · 책 · 개정 · 단원 번호 · 자료 종류/회차 · 자료 안 번호의 보유/누락, 원문-변형 연결(지정 두 슬롯 0/2 · 1/2 · 2/2)
 *   2. 기출 — `Exam`/`ExamQuestion` · `past_exam` 원문 · 그 원문의 변형 행 수와 학교 · 과목 · 연도 · 번호 · 사용 가능 수
 *   3. 엔진 — `manual` 가운데 엔진 표지(`familyKey`)가 없는 행(엔진 문항 수로 광고하지 않는다)
 *
 * 🔴 **쓰지 않는다** — 질의 전부를 `SET TRANSACTION READ ONLY` 트랜잭션 안에서 돈다(쓰기는 DB 가 거절한다).
 *    수만 낸다 — 문항 글 · 교재 원문을 싣지 않는다(교재 원문은 저장소 밖 규칙). 책 이름 · 출판사는 메타데이터다.
 * 출력: `<폴더>/census.json` · `<폴더>/census.md`(기본 `.qa-artifacts/bank-readiness-census-<날짜>/`).
 * 슬롯의 셈은 화면 · 복습과 같은 함수(`slotCensus.ts` → `textbookSlotReadiness`)다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { PrismaClient, type Prisma } from "@prisma/client";

import {
  BANK_SOURCE_GROUP_SOURCES,
  BANK_SOURCE_GROUPS,
} from "../../../src/contracts/bankSource.contract";
import { problemEligibleWhere } from "../../../src/lib/problemEligibility";
import { problemVisibleWhere } from "../../../src/lib/problemPool";
import {
  SLOT_CENSUS_SELECT,
  summarizeSlotCensus,
} from "../../../src/lib/import/schoolTextbook/slotCensus";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const stamp = new Date().toISOString().slice(0, 10);
const out = resolve(
  option("--out") ?? `.qa-artifacts/bank-readiness-census-${stamp}`,
);

const prisma = new PrismaClient({ log: [] });
type Tx = Prisma.TransactionClient;

const VISIBLE = problemVisibleWhere();
const ELIGIBLE = problemEligibleWhere();
const both = async (tx: Tx, where: Prisma.ProblemWhereInput) => {
  const [held, available] = await Promise.all([
    tx.problem.count({ where: { AND: [VISIBLE, where] } }),
    tx.problem.count({ where: { AND: [ELIGIBLE, where] } }),
  ]);
  return { held, available };
};
const nulls = <T extends Record<string, unknown>>(
  rows: readonly T[],
  keys: readonly (keyof T)[],
) =>
  Object.fromEntries(
    keys.map((key) => [
      key,
      rows.filter((row) => row[key] === null || row[key] === "").length,
    ]),
  ) as Record<keyof T, number>;
const tally = <T>(rows: readonly T[], key: (row: T) => string) => {
  const out: Record<string, number> = {};
  for (const row of rows) out[key(row)] = (out[key(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};

async function textbook(tx: Tx) {
  const source = { source: "school_textbook" as const };
  const books = await tx.sourceBook.findMany({
    where: { kind: "school_textbook" },
    select: {
      id: true,
      grade: true,
      publisher: true,
      author: true,
      title: true,
      curriculum: true,
    },
  });
  const materials = await tx.sourceMaterial.findMany({
    where: { bookId: { in: books.map((book) => book.id) } },
    select: {
      id: true,
      bookId: true,
      kind: true,
      chapterNo: true,
      middleNo: true,
      sectionNo: true,
      unitRaw: true,
      semester: true,
      round: true,
      levelRaw: true,
      sequence: true,
    },
  });
  const [perMaterialHeld, perMaterialOpen, duplicates] = await Promise.all([
    tx.problem.groupBy({
      by: ["sourceMaterialId"],
      where: { AND: [VISIBLE, source] },
      _count: { _all: true },
    }),
    tx.problem.groupBy({
      by: ["sourceMaterialId"],
      where: { AND: [ELIGIBLE, source] },
      _count: { _all: true },
    }),
    tx.problem.groupBy({
      by: ["sourceMaterialId", "questionNumber"],
      where: { AND: [VISIBLE, source, { sourceMaterialId: { not: null } }] },
      _count: { _all: true },
    }),
  ]);
  const held = new Map(
    perMaterialHeld.map((r) => [r.sourceMaterialId, r._count._all]),
  );
  const open = new Map(
    perMaterialOpen.map((r) => [r.sourceMaterialId, r._count._all]),
  );
  const materialOf = new Map(materials.map((m) => [m.id, m]));
  const perBook = books
    .map((book) => {
      const own = materials.filter((m) => m.bookId === book.id);
      return {
        grade: book.grade,
        publisher: book.publisher,
        author: book.author,
        title: book.title,
        curriculum: book.curriculum,
        materials: own.length,
        materialsWithProblems: own.filter((m) => (held.get(m.id) ?? 0) > 0)
          .length,
        held: own.reduce((n, m) => n + (held.get(m.id) ?? 0), 0),
        available: own.reduce((n, m) => n + (open.get(m.id) ?? 0), 0),
      };
    })
    .sort((a, b) => a.grade.localeCompare(b.grade, "ko") || b.held - a.held);
  const duplicated = duplicates.filter(
    (row) => row.questionNumber !== null && row._count._all > 1,
  );
  const origins = await tx.problem.findMany({
    where: { AND: [VISIBLE, source] },
    select: SLOT_CENSUS_SELECT,
  });
  const slotRows = await tx.problem.findMany({
    where: {
      AND: [
        VISIBLE,
        { source: "transformed", externalId: { startsWith: "tb-retry-v1:" } },
      ],
    },
    select: SLOT_CENSUS_SELECT,
  });
  const [withoutMaterial, withoutNumber, otherChildren] = await Promise.all([
    both(tx, { ...source, sourceMaterialId: null }),
    both(tx, { ...source, questionNumber: null }),
    // 교과서 원문에 매달린 변형 가운데 지정 슬롯이 아닌 것(과거 복구 자식 등) — 슬롯으로 세지 않는다
    both(tx, {
      source: "transformed",
      originProblem: { source: "school_textbook" },
      NOT: { externalId: { startsWith: "tb-retry-v1:" } },
    }),
  ]);
  return {
    books: {
      total: books.length,
      withProblems: perBook.filter((b) => b.held > 0).length,
      byCurriculum: tally(books, (b) => b.curriculum),
      withoutAuthor: books.filter((b) => !b.author).length,
    },
    materials: {
      total: materials.length,
      withProblems: materials.filter((m) => (held.get(m.id) ?? 0) > 0).length,
      byKind: tally(materials, (m) => m.kind),
      missing: nulls(materials, [
        "chapterNo",
        "middleNo",
        "sectionNo",
        "unitRaw",
        "semester",
        "round",
        "levelRaw",
        "sequence",
      ]),
      withDuplicateNumbers: new Set(duplicated.map((r) => r.sourceMaterialId))
        .size,
      duplicateNumberRows: duplicated.reduce((n, r) => n + r._count._all, 0),
      problemsOnUnknownMaterial: [...held.entries()].filter(
        ([id]) => id !== null && !materialOf.has(id),
      ).length,
    },
    problems: {
      ...(await both(tx, source)),
      withoutMaterial,
      withoutQuestionNumber: withoutNumber,
    },
    designatedSlots: summarizeSlotCensus(origins, slotRows),
    otherTransformedChildren: otherChildren,
    perBook,
  };
}

async function pastExam(tx: Tx) {
  const source = { source: "past_exam" as const };
  const [exams, questions, linked, mapped, bySubject, byYear, schools] =
    await Promise.all([
      tx.exam.count(),
      tx.examQuestion.count(),
      tx.examQuestion.count({ where: { problemId: { not: null } } }),
      tx.examQuestion.count({ where: { unitId: { not: null } } }),
      tx.exam.groupBy({ by: ["level", "subject"], _count: { _all: true } }),
      tx.exam.groupBy({ by: ["year"], _count: { _all: true } }),
      tx.exam.groupBy({ by: ["school"], _count: { _all: true } }),
    ]);
  const [problems, withoutSchool, withoutExamId, withoutNumber, variants] =
    await Promise.all([
      both(tx, source),
      both(tx, { ...source, school: null }),
      both(tx, { ...source, examId: null }),
      both(tx, { ...source, questionNumber: null }),
      both(tx, {
        source: "transformed",
        originProblem: { source: "past_exam" },
      }),
    ]);
  return {
    exams: {
      total: exams,
      schools: schools.length,
      bySubject: Object.fromEntries(
        bySubject
          .sort((a, b) => b._count._all - a._count._all)
          .map((r) => [`${r.level} ${r.subject}`, r._count._all]),
      ),
      byYear: Object.fromEntries(
        byYear
          .sort((a, b) => a.year - b.year)
          .map((r) => [String(r.year), r._count._all]),
      ),
    },
    examQuestions: {
      total: questions,
      linkedToProblem: linked,
      mappedToUnit: mapped,
    },
    problems: {
      ...problems,
      withoutSchool,
      withoutExamId,
      withoutQuestionNumber: withoutNumber,
    },
    transformedFromPastExam: variants,
  };
}

async function sources(tx: Tx) {
  const [held, available, manualWithoutFamily] = await Promise.all([
    tx.problem.groupBy({
      by: ["source"],
      where: VISIBLE,
      _count: { _all: true },
    }),
    tx.problem.groupBy({
      by: ["source"],
      where: ELIGIBLE,
      _count: { _all: true },
    }),
    both(tx, { source: "manual", familyKey: null }),
  ]);
  const of = (rows: typeof held, values: readonly string[]) =>
    rows
      .filter((r) => values.includes(r.source))
      .reduce((n, r) => n + r._count._all, 0);
  return {
    groups: Object.fromEntries(
      BANK_SOURCE_GROUPS.map((group) => [
        group,
        {
          held: of(held, BANK_SOURCE_GROUP_SOURCES[group]),
          available: of(available, BANK_SOURCE_GROUP_SOURCES[group]),
        },
      ]),
    ),
    // «엔진» 갈래는 manual 전부다 — 엔진 표지가 없는 옛 수작업 행이 섞여 있다
    engineWithoutFamilyKey: manualWithoutFamily,
  };
}

function markdown(report: Awaited<ReturnType<typeof collect>>): string {
  const t = report.textbook;
  const p = report.pastExam;
  const s = t.designatedSlots;
  const pair = (x: { held: number; available: number }) =>
    `${x.held.toLocaleString()} / ${x.available.toLocaleString()}`;
  const lines = [
    `# 문제은행 준비도 조사 (${report.measuredAt})`,
    "",
    "읽기 전용(`SET TRANSACTION READ ONLY`) · 공용 풀 기준. «보유 / 사용 가능» = 공용 풀에 보이는 행 / 출제 자격 있는 행.",
    "",
    "## 출처 갈래",
    "",
    "| 갈래 | 보유 / 사용 가능 |",
    "| --- | --- |",
    ...Object.entries(report.sources.groups).map(
      ([group, value]) => `| ${group} | ${pair(value)} |`,
    ),
    `| 엔진 갈래 중 엔진 표지 없음 | ${pair(report.sources.engineWithoutFamilyKey)} |`,
    "",
    "## 교과서",
    "",
    `- 책 ${t.books.total}권(문항 있는 책 ${t.books.withProblems}) · 개정 ${JSON.stringify(t.books.byCurriculum)} · 저자 없음 ${t.books.withoutAuthor}`,
    `- 자료 ${t.materials.total}편(문항 있는 자료 ${t.materials.withProblems}) · 종류 ${JSON.stringify(t.materials.byKind)}`,
    `- 자료 칸 누락: ${Object.entries(t.materials.missing)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")}`,
    `- 자료 안 번호가 겹치는 자료 ${t.materials.withDuplicateNumbers}편 · 그 행 ${t.materials.duplicateNumberRows}`,
    `- 문항 ${pair(t.problems)} · 자료 없음 ${pair(t.problems.withoutMaterial)} · 자료 안 번호 없음 ${pair(t.problems.withoutQuestionNumber)}`,
    "",
    "### 지정 두 슬롯(복습 변형)",
    "",
    `- 원문 ${s.origins} · 출제 가능 원문 ${s.eligibleOrigins}`,
    `- 원문 전부: 2/2 ${s.readiness.ready} · 1/2 ${s.readiness.partial} · 0/2 ${s.readiness.none}`,
    `- 출제 가능 원문: 2/2 ${s.readinessOfEligible.ready} · 1/2 ${s.readinessOfEligible.partial} · 0/2 ${s.readinessOfEligible.none}`,
    `- 슬롯 행 ${s.slots.total}: 준비 ${s.slots.ready} · 차시 어긋남 ${s.slots.unitMismatch} · 출제 불가 ${JSON.stringify(s.slots.ineligible)}`,
    `- 🔴 출제 불가 원문의 열린 슬롯 ${s.openSlotsOfIneligibleOrigin}(잠금 도구: \`scripts/import/textbook/lock-orphan-slots.ts\`)`,
    `- 지정 슬롯이 아닌 교과서 원문의 변형(과거 복구 자식 등) ${pair(t.otherTransformedChildren)}`,
    "",
    "### 책별",
    "",
    "| 과목 | 출판사 | 저자 | 개정 | 자료(문항 있음) | 보유 / 사용 가능 |",
    "| --- | --- | --- | --- | --- | --- |",
    ...t.perBook.map(
      (b) =>
        `| ${b.grade} | ${b.publisher} | ${b.author ?? "—"} | ${b.curriculum} | ${b.materials}(${b.materialsWithProblems}) | ${pair(b)} |`,
    ),
    "",
    "## 기출",
    "",
    `- 시험지 ${p.exams.total}편 · 학교 ${p.exams.schools} · 문항(시험지) ${p.examQuestions.total} · 문제은행 연결 ${p.examQuestions.linkedToProblem} · 차시 연결 ${p.examQuestions.mappedToUnit}`,
    `- 과목별 ${JSON.stringify(p.exams.bySubject)}`,
    `- 연도별 ${JSON.stringify(p.exams.byYear)}`,
    `- past_exam 문항 ${pair(p.problems)} · 학교 없음 ${pair(p.problems.withoutSchool)} · 시험 식별자 없음 ${pair(p.problems.withoutExamId)} · 번호 없음 ${pair(p.problems.withoutQuestionNumber)}`,
    `- 기출 원문의 변형 ${pair(p.transformedFromPastExam)}`,
    "",
  ];
  return lines.join("\n");
}

async function collect() {
  return prisma.$transaction(
    async (tx) => {
      // 🔴 이 트랜잭션은 쓰기를 못 한다 — 실수로 쓰는 질의가 섞여도 DB 가 거절한다
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const measuredAt = new Date().toISOString();
      const [src, tb, past] = [
        await sources(tx),
        await textbook(tx),
        await pastExam(tx),
      ];
      return { measuredAt, sources: src, textbook: tb, pastExam: past };
    },
    { timeout: 600_000, maxWait: 60_000 },
  );
}

async function main() {
  const report = await collect();
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "census.json"),
    JSON.stringify(report, null, 1) + "\n",
  );
  writeFileSync(join(out, "census.md"), markdown(report));
  console.log(`조사 끝 — ${join(out, "census.md")}`);
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "조사 실패",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
