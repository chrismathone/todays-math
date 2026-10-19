import { db } from "@/lib/db";

/**
 * 에이와 원생 상세 «오늘 수학» 탭에 보이는 **최근 시험 목록**(읽기 전용 · 2026-10-17).
 *
 * 에이와는 이 값을 저장하지 않고 탭을 열 때마다 묻는다 — 풀이 결과를 에이와 DB 에 쓰는 역방향 연동은 다음 단계다.
 * 대상 시험은 `getEywaStudentStatus` 가 센 «배정된 시험»과 같은 집합이다(같은 함수가 넘긴다 — 두 벌로 고르지 않는다).
 *
 * 🔴 결시와 «아직 안 봄»과 «0점»을 섞지 않는다 — `result` 가 null 이면 아직 채점 기록이 없고, 결시는 `absent: true`
 *    에 점수를 싣지 않는다(`scoreRollup.ts` 와 같은 규칙).
 */
export const RECENT_TESTS_LIMIT = 20;

export type RecentTestKind =
  | "daily"
  | "review"
  | "monthly"
  | "unit"
  | "school"
  | "other";

export interface RecentTestSource {
  id: string;
  classId: string;
  testType: "daily" | "review";
  testDate: Date;
  publicationId: string | null;
  rangeEndUnitId: string;
}

export interface RecentTestResultSource {
  id: string;
  testId: string;
  absent: boolean;
  score: number | null;
  takenAt: Date;
}

export interface RecentTest {
  testId: string;
  kind: RecentTestKind;
  /** 낸 시험지(발행본)의 제목 — 일일 · 확인테스트는 null(종류와 범위 단원으로 부른다). */
  title: string | null;
  /** 범위 끝 단원의 소단원 이름. */
  unitName: string | null;
  testDate: string;
  sourceClassId: string | null;
  className: string;
  questionCount: number;
  result:
    | null
    | { absent: true; takenAt: string }
    | {
        absent: false;
        score: number | null;
        correctCount: number | null;
        takenAt: string;
      };
}

const PUBLICATION_KINDS = new Set<RecentTestKind>([
  "monthly",
  "unit",
  "school",
  "other",
]);

/** 시험 종류 — 낸 시험지(발행본)면 발행본의 종류, 아니면 일일 · 확인. 결과 동기화(`managedTestResults.ts`)와 한 벌. */
export function testKind(
  test: Pick<RecentTestSource, "testType" | "publicationId">,
  examType: string | undefined,
): RecentTestKind {
  if (examType && PUBLICATION_KINDS.has(examType as RecentTestKind))
    return examType as RecentTestKind;
  return test.publicationId ? "other" : test.testType;
}

/** 한 시험에 채점 기록이 여럿이면 마지막 것이 지금 결과다(재채점). */
export function latestByTest(results: readonly RecentTestResultSource[]) {
  const latest = new Map<string, RecentTestResultSource>();
  for (const r of results) {
    const prev = latest.get(r.testId);
    if (
      !prev ||
      r.takenAt.getTime() > prev.takenAt.getTime() ||
      (r.takenAt.getTime() === prev.takenAt.getTime() && r.id > prev.id)
    )
      latest.set(r.testId, r);
  }
  return latest;
}

export async function buildRecentTests(
  tests: readonly RecentTestSource[],
  results: readonly RecentTestResultSource[],
): Promise<RecentTest[]> {
  const recent = [...tests]
    .sort(
      (a, b) =>
        b.testDate.getTime() - a.testDate.getTime() || b.id.localeCompare(a.id),
    )
    .slice(0, RECENT_TESTS_LIMIT);
  if (recent.length === 0) return [];
  const testIds = recent.map((t) => t.id);
  const latest = latestByTest(results.filter((r) => testIds.includes(r.testId)));
  const gradedIds = [...latest.values()]
    .filter((r) => !r.absent)
    .map((r) => r.id);
  const publicationIds = [
    ...new Set(recent.flatMap((t) => (t.publicationId ? [t.publicationId] : []))),
  ];
  const [classes, publications, units, problems, answers] = await Promise.all([
    db.class.findMany({
      where: { id: { in: [...new Set(recent.map((t) => t.classId))] } },
      select: { id: true, name: true, eywaClassId: true },
    }),
    publicationIds.length
      ? db.examPublication.findMany({
          where: { id: { in: publicationIds } },
          select: { id: true, title: true, examType: true },
        })
      : [],
    db.unit.findMany({
      where: { id: { in: [...new Set(recent.map((t) => t.rangeEndUnitId))] } },
      select: { id: true, section: true },
    }),
    db.testProblem.findMany({
      where: { testId: { in: testIds } },
      select: { testId: true },
    }),
    gradedIds.length
      ? db.problemAnswer.findMany({
          where: { testResultId: { in: gradedIds } },
          select: { testResultId: true, isCorrect: true },
        })
      : [],
  ]);
  const classById = new Map(classes.map((c) => [c.id, c]));
  const publicationById = new Map(publications.map((p) => [p.id, p]));
  const unitById = new Map(units.map((u) => [u.id, u.section]));
  const questionCount = new Map<string, number>();
  for (const p of problems)
    questionCount.set(p.testId, (questionCount.get(p.testId) ?? 0) + 1);
  const correct = new Map<string, { total: number; right: number }>();
  for (const a of answers) {
    const c = correct.get(a.testResultId) ?? { total: 0, right: 0 };
    c.total += 1;
    if (a.isCorrect) c.right += 1;
    correct.set(a.testResultId, c);
  }

  return recent.map((t) => {
    const publication = t.publicationId
      ? publicationById.get(t.publicationId)
      : undefined;
    const kind = testKind(t, publication?.examType);
    const cls = classById.get(t.classId);
    const r = latest.get(t.id);
    const c = r ? correct.get(r.id) : undefined;
    return {
      testId: t.id,
      kind,
      title: publication?.title ?? null,
      unitName: unitById.get(t.rangeEndUnitId) ?? null,
      testDate: t.testDate.toISOString().slice(0, 10),
      sourceClassId: cls?.eywaClassId ?? null,
      className: cls?.name ?? "",
      questionCount: questionCount.get(t.id) ?? 0,
      result: !r
        ? null
        : r.absent
          ? { absent: true as const, takenAt: r.takenAt.toISOString() }
          : {
              absent: false as const,
              score: r.score,
              // 응답이 없는 기록(옛 자료)은 맞은 수를 모른다 — 0 으로 채우지 않는다.
              correctCount: c ? c.right : null,
              takenAt: r.takenAt.toISOString(),
            },
    };
  });
}
