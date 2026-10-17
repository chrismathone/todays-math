import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { refreshManagedBinding } from "./managedAccounts";
import { EywaAccessError } from "./managedPolicy";
import { testKind, type RecentTestKind } from "./managedStudentRecentTests";

/**
 * 에이와로 보내는 **채점 결과 피드**(2026-10-17 · 역방향 2단계). 에이와가 10분마다 끌어간다(pull) — 이쪽은 쓰지 않는다.
 *
 * 두 단계다: ① 기간의 날짜별 지문(`resultDays`) ② 지문이 달라진 날의 행 전부(`resultDay`). 에이와는 그날 행을 통째로 갈아끼운다
 * (빠진 행 = 지워진 시험). 그래서 🔴 **연결이 꺼졌거나 확인이 안 되면 빈 목록이 아니라 오류**다 — 빈 목록을 주면 에이와가 그날
 * 결과를 지운다.
 *
 * 대상 = `getEywaStudentStatus` 가 세는 시험과 같은 조건(이 연결 · 이 지점의 반 · 예측 문제지 제외 · 확정/인쇄) × 이 연결의 학생.
 * 한 학생 · 한 시험에 채점 기록이 여럿이면 마지막 것(재채점). 채점 기록은 고치지 않고 새로 쌓이므로(`submitTestResult` ·
 * `gradeSheet` 가 create 만 한다) 지문은 «시험 · 학생 · 기록 번호»만으로 바뀜을 잡는다 — 문항 응답을 다 읽지 않는다.
 */
export const RESULT_WINDOW_MAX_DAYS = 120;

export interface TestResultRow {
  sourceTestId: string;
  sourceStudentId: string;
  sourceClassId: string | null;
  kind: RecentTestKind;
  title: string | null;
  unitName: string | null;
  testDate: string;
  questionCount: number;
  absent: boolean;
  score: number | null;
  correctCount: number | null;
  takenAt: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(value: string | null): Date {
  if (!value || !DATE.test(value)) throw new EywaAccessError("invalid_date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new EywaAccessError("invalid_date");
  return date;
}

/** 꺼짐 · 확인 실패는 던진다(빈 결과로 위장하지 않는다). */
async function requireActiveBinding(bindingId: string) {
  let binding = await db.eywaBinding.findUnique({ where: { id: bindingId } });
  if (
    binding &&
    !binding.retiredAt &&
    (!binding.leaseExpiresAt || binding.leaseExpiresAt.getTime() <= Date.now())
  ) {
    await refreshManagedBinding(binding.id);
    binding = await db.eywaBinding.findUnique({ where: { id: bindingId } });
  }
  if (
    !binding ||
    binding.retiredAt ||
    !binding.enabled ||
    !binding.healthy ||
    binding.mode !== "active" ||
    !binding.leaseExpiresAt ||
    binding.leaseExpiresAt.getTime() <= Date.now()
  )
    throw new EywaAccessError("binding_inactive");
  return binding;
}

interface LatestResult {
  id: string;
  testId: string;
  studentId: string;
  absent: boolean;
  score: number | null;
  takenAt: Date;
}

/** 기간 안의 대상 시험과 (시험 × 학생)별 마지막 채점 기록 — 지문과 행이 같은 집합을 본다. */
async function loadLatest(bindingId: string, from: Date, to: Date) {
  const binding = await requireActiveBinding(bindingId);
  const tests = await db.test.findMany({
    where: {
      predictionRunId: null,
      status: { in: ["confirmed", "printed"] },
      testDate: { gte: from, lte: to },
      class: { eywaBindingId: bindingId, branchId: binding.targetBranchId },
    },
    select: {
      id: true,
      classId: true,
      testType: true,
      testDate: true,
      publicationId: true,
      rangeEndUnitId: true,
    },
  });
  if (tests.length === 0) return { tests, latest: [], students: new Map<string, string>() };
  const results = await db.testResult.findMany({
    where: { testId: { in: tests.map((t) => t.id) } },
    select: { id: true, testId: true, studentId: true, absent: true, score: true, takenAt: true },
  });
  const linked = await db.student.findMany({
    where: {
      id: { in: [...new Set(results.map((r) => r.studentId))] },
      eywaBindingId: bindingId,
      branchId: binding.targetBranchId,
      isTest: false,
      eywaStudentId: { not: null },
    },
    select: { id: true, eywaStudentId: true },
  });
  const students = new Map(linked.map((s) => [s.id, s.eywaStudentId!]));
  const byKey = new Map<string, LatestResult>();
  for (const r of results) {
    if (!students.has(r.studentId)) continue;
    const key = `${r.testId}:${r.studentId}`;
    const prev = byKey.get(key);
    if (
      !prev ||
      r.takenAt.getTime() > prev.takenAt.getTime() ||
      (r.takenAt.getTime() === prev.takenAt.getTime() && r.id > prev.id)
    )
      byKey.set(key, r);
  }
  return { tests, latest: [...byKey.values()], students };
}

const day = (date: Date) => date.toISOString().slice(0, 10);

function digest(entries: string[]): string {
  return createHash("sha256").update(entries.sort().join("\n")).digest("hex");
}

function digestEntry(r: LatestResult, eywaStudentId: string) {
  return `${r.testId}:${eywaStudentId}:${r.id}`;
}

export async function resultDays(bindingId: string, fromText: string | null, toText: string | null) {
  const from = parseDate(fromText);
  const to = parseDate(toText);
  const span = (to.getTime() - from.getTime()) / 86_400_000;
  if (span < 0 || span >= RESULT_WINDOW_MAX_DAYS) throw new EywaAccessError("invalid_window");
  const { tests, latest, students } = await loadLatest(bindingId, from, to);
  const testDate = new Map(tests.map((t) => [t.id, day(t.testDate)]));
  const entries = new Map<string, string[]>();
  for (const r of latest) {
    const date = testDate.get(r.testId)!;
    const list = entries.get(date) ?? [];
    list.push(digestEntry(r, students.get(r.studentId)!));
    entries.set(date, list);
  }
  return {
    bindingId,
    from: day(from),
    to: day(to),
    days: [...entries.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => ({ date, count: list.length, sha256: digest(list) })),
  };
}

export async function resultDay(bindingId: string, dateText: string | null) {
  const date = parseDate(dateText);
  const { tests, latest, students } = await loadLatest(bindingId, date, date);
  if (latest.length === 0)
    return { bindingId, date: day(date), sha256: digest([]), rows: [] as TestResultRow[] };
  const usedTests = tests.filter((t) => latest.some((r) => r.testId === t.id));
  const testIds = usedTests.map((t) => t.id);
  const publicationIds = [...new Set(usedTests.flatMap((t) => (t.publicationId ? [t.publicationId] : [])))];
  const gradedIds = latest.filter((r) => !r.absent).map((r) => r.id);
  const [classes, publications, units, problems, answers] = await Promise.all([
    db.class.findMany({
      where: { id: { in: [...new Set(usedTests.map((t) => t.classId))] } },
      select: { id: true, eywaClassId: true },
    }),
    publicationIds.length
      ? db.examPublication.findMany({
          where: { id: { in: publicationIds } },
          select: { id: true, title: true, examType: true },
        })
      : [],
    db.unit.findMany({
      where: { id: { in: [...new Set(usedTests.map((t) => t.rangeEndUnitId))] } },
      select: { id: true, section: true },
    }),
    db.testProblem.findMany({ where: { testId: { in: testIds } }, select: { testId: true } }),
    gradedIds.length
      ? db.problemAnswer.findMany({
          where: { testResultId: { in: gradedIds } },
          select: { testResultId: true, isCorrect: true },
        })
      : [],
  ]);
  const testById = new Map(usedTests.map((t) => [t.id, t]));
  const classById = new Map(classes.map((c) => [c.id, c.eywaClassId]));
  const publicationById = new Map(publications.map((p) => [p.id, p]));
  const unitById = new Map(units.map((u) => [u.id, u.section]));
  const questionCount = new Map<string, number>();
  for (const p of problems) questionCount.set(p.testId, (questionCount.get(p.testId) ?? 0) + 1);
  const correct = new Map<string, number>();
  const answered = new Set<string>();
  for (const a of answers) {
    answered.add(a.testResultId);
    if (a.isCorrect) correct.set(a.testResultId, (correct.get(a.testResultId) ?? 0) + 1);
  }
  const rows: TestResultRow[] = latest.map((r) => {
    const t = testById.get(r.testId)!;
    const publication = t.publicationId ? publicationById.get(t.publicationId) : undefined;
    return {
      sourceTestId: t.id,
      sourceStudentId: students.get(r.studentId)!,
      sourceClassId: classById.get(t.classId) ?? null,
      kind: testKind(t, publication?.examType),
      title: publication?.title ?? null,
      unitName: unitById.get(t.rangeEndUnitId) ?? null,
      testDate: day(t.testDate),
      questionCount: questionCount.get(t.id) ?? 0,
      absent: r.absent,
      // 🔴 결시는 점수 · 맞은 수가 없다(0 이 아니다). 응답이 없는 기록(옛 자료)은 맞은 수를 모른다.
      score: r.absent ? null : r.score,
      correctCount: r.absent || !answered.has(r.id) ? null : (correct.get(r.id) ?? 0),
      takenAt: r.takenAt.toISOString(),
    };
  });
  rows.sort((a, b) => a.sourceTestId.localeCompare(b.sourceTestId) || a.sourceStudentId.localeCompare(b.sourceStudentId));
  return {
    bindingId,
    date: day(date),
    sha256: digest(latest.map((r) => digestEntry(r, students.get(r.studentId)!))),
    rows,
  };
}
