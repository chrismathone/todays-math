import type { Prisma } from "@prisma/client";
import { parseSrsState } from "@/lib/math-srs/serverState";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { scopeProblemWhere } from "@/lib/problemVisibility";
import { kstDateOf } from "@/lib/kstDate";
import {
  authorizeMathOntologySourceRead,
  MathOntologySourceAccessDenied,
  type MathOntologyDatabaseReadInput,
  type MathOntologySourceTransaction,
} from "./databaseAccess";
import { projectRetainedMathOntologyLearning } from "./retainedLearning";
import { sourceDigest, freezeSourceValue } from "./canonical";
const transactionBindings = new WeakMap<
  object,
  MathOntologySourceTransaction
>();
/** The returned object must be the actual source read created inside this exact transaction, not JSON supplied by an actor/model. */
export function assertMathOntologySourceSnapshotTransaction(
  snapshot: object,
  tx: MathOntologySourceTransaction,
): void {
  if (transactionBindings.get(snapshot) !== tx)
    throw new Error("Source snapshot is not bound to this transaction");
}
export async function readMathOntologyDatabaseSourcesInTransaction(
  tx: MathOntologySourceTransaction,
  input: MathOntologyDatabaseReadInput,
) {
  const access = await authorizeMathOntologySourceRead(tx, input);
  const stateRow = await tx.studentSrsState.findUnique({
    where: { studentId: input.target.studentId },
    select: { revision: true, payload: true, updatedAt: true },
  });
  const state = stateRow ? parseSrsState(stateRow.payload) : null;
  const learning = projectRetainedMathOntologyLearning(
    state,
    input.now,
    input.observedAfter,
  );
  const [plans, progress] = await Promise.all([
    tx.progressPlan.findMany({
      where: {
        classId: input.target.classId,
        OR: [{ studentId: null }, { studentId: input.target.studentId }],
      },
      select: {
        id: true,
        studentId: true,
        weekdays: true,
        unitsPerLesson: true,
        startUnitId: true,
        startDate: true,
        active: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
    }),
    tx.progress.findMany({
      where: {
        classId: input.target.classId,
        retiredAt: null,
        OR: [{ studentId: null }, { studentId: input.target.studentId }],
        recordedAt: { lte: new Date(kstDateOf(input.now) + "T00:00:00.000Z") },
      },
      select: {
        id: true,
        studentId: true,
        unitId: true,
        recordedAt: true,
        createdAt: true,
      },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      take: 101,
    }),
  ]);
  const sectionIds = new Set([
    ...(state?.course ? Object.keys(state.course.learner.progress) : []),
    ...(state?.course?.plan ? [state.course.plan.startSectionId] : []),
    ...(state?.course ? [state.course.learner.selectedSectionId] : []),
    ...learning.firstAttempts.map((a) => a.sectionId),
  ]);
  const sections = [...sectionIds]
    .map(getCourseSection)
    .filter((s): s is NonNullable<typeof s> => !!s);
  const explicitUnitIds = [
    ...new Set([
      ...plans.map((p) => p.startUnitId),
      ...progress.map((p) => p.unitId),
    ]),
  ];
  const units =
    sections.length || explicitUnitIds.length
      ? await tx.unit.findMany({
          where: {
            OR: [
              ...(explicitUnitIds.length
                ? [{ id: { in: explicitUnitIds } }]
                : []),
              ...sections.map((s) => ({
                grade: s.unit.grade,
                chapter: s.unit.chapter,
                section: s.unit.section,
              })),
            ],
          },
          select: {
            id: true,
            grade: true,
            chapter: true,
            section: true,
            orderIndex: true,
          },
          orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
        })
      : [];
  const unitBindings = sections.map((s) => {
    const matches = units.filter(
      (u) =>
        u.grade === s.unit.grade &&
        u.chapter === s.unit.chapter &&
        u.section === s.unit.section,
    );
    return {
      courseSectionId: s.id,
      sourceSectionKey: [s.unit.grade, s.unit.chapter, s.unit.section].join(
        "::",
      ),
      unitIds: matches.map((u) => u.id),
      status:
        matches.length === 1
          ? "exact-native-triple"
          : matches.length
            ? "ambiguous"
            : "missing",
    };
  });
  const unitIds = units.map((u) => u.id);
  const problemRows = unitIds.length
    ? await tx.problem.findMany({
        where: scopeProblemWhere("findMany", {
          AND: [problemEligibleWhere(), { unitId: { in: unitIds } }],
        }) as Prisma.ProblemWhereInput,
        select: {
          id: true,
          unitId: true,
          source: true,
          externalId: true,
          familyKey: true,
          difficulty: true,
          questionType: true,
          problemType: true,
          updatedAt: true,
          sourceMaterial: {
            select: {
              id: true,
              kind: true,
              semester: true,
              book: { select: { id: true, kind: true, curriculum: true } },
            },
          },
        },
        orderBy: { id: "asc" },
        take: 201,
      })
    : [];
  const operationalPlans = plans.map((p) => ({
    id: p.id,
    scope: p.studentId ? "student" : "class",
    weekdays: p.weekdays,
    unitsPerLesson: p.unitsPerLesson,
    startUnitId: p.startUnitId,
    startDate: p.startDate.toISOString().slice(0, 10),
    active: p.active,
    updatedAt: p.updatedAt.toISOString(),
  }));
  const progressRows = progress.slice(0, 100).map((p) => ({
    id: p.id,
    scope: p.studentId ? "student" : "class",
    unitId: p.unitId,
    recordedAt: p.recordedAt.toISOString().slice(0, 10),
    createdAt: p.createdAt.toISOString(),
  }));
  const problems = problemRows.slice(0, 200).map((p) => ({
    id: p.id,
    unitId: p.unitId,
    source: p.source,
    externalId: p.externalId,
    familyKey: p.familyKey,
    difficulty: p.difficulty,
    questionType: p.questionType,
    problemType: p.problemType,
    updatedAt: p.updatedAt.toISOString(),
    sourceReference: p.sourceMaterial
      ? {
          materialId: p.sourceMaterial.id,
          materialKind: p.sourceMaterial.kind,
          semester: p.sourceMaterial.semester,
          bookId: p.sourceMaterial.book.id,
          bookKind: p.sourceMaterial.book.kind,
          curriculumEdition: ["2015", "2022"].includes(
            p.sourceMaterial.book.curriculum,
          )
            ? p.sourceMaterial.book.curriculum
            : "unknown",
          licenseStatus: "unknown",
          distribution: "actor-scoped-reference-only",
        }
      : null,
  }));
  const sourceWatermarks = {
    studentSrsState: stateRow
      ? String(stateRow.revision) + ":" + stateRow.updatedAt.toISOString()
      : "missing",
    progressPlans: sourceDigest(operationalPlans),
    progress: sourceDigest(progressRows),
    problemMetadata: sourceDigest(problems),
    unitBindings: sourceDigest({ units, unitBindings }),
  };
  const value = {
    graphVersion: input.graphVersion,
    contextHash: access.contextHash,
    authorizationStamp: access.authorizationStamp,
    asOf: input.now.toISOString(),
    studentRevision: stateRow?.revision ?? 0,
    studentStatePresent: !!stateRow,
    sourceWatermarks,
    learning,
    operationalPlans,
    progress: progressRows,
    units,
    unitBindings,
    problemMetadata: problems,
    coverage: {
      progressTruncated: progress.length > 100,
      progressLimit: 100,
      problemMetadataTruncated: problemRows.length > 200,
      problemMetadataLimit: 200,
      actualTotalProblemInstances: null,
      problemPracticeSupply: "unverified-without-course-candidate-gate",
      storedCourseProblemIdsAreDatabaseProblemIds: false,
      learningHistoryComplete: false,
      learningEventClassOrigin: "not-recorded-student-global-retained-domain",
      distribution: "actor-student-private",
      modelTransmission: "not-authorized-by-source-reader",
    },
  };
  const snapshot = freezeSourceValue({
    ...value,
    snapshotDigest: sourceDigest(value),
  });
  transactionBindings.set(snapshot, tx);
  return snapshot;
}
export type MathOntologyDatabaseSourceSnapshot = Awaited<
  ReturnType<typeof readMathOntologyDatabaseSourcesInTransaction>
>;
/** Production read composition. No create/upsert/reset, schema changes, source refresh or model call. */
export async function readMathOntologyDatabaseSources(
  input: MathOntologyDatabaseReadInput,
) {
  const { db } = await import("@/lib/db");
  const snapshot = await db.$transaction(
    async (tx) =>
      readMathOntologyDatabaseSourcesInTransaction(tx, {
        ...input,
        authorizationNow: new Date(),
      }),
    { isolationLevel: "RepeatableRead", maxWait: 2000, timeout: 10000 },
  );
  // A current authorization recheck prevents a completed read from escaping after a revocation during the snapshot read.
  const latest = await db.$transaction(
    async (tx) =>
      authorizeMathOntologySourceRead(tx, {
        ...input,
        authorizationNow: new Date(),
      }),
    { isolationLevel: "RepeatableRead", maxWait: 2000, timeout: 5000 },
  );
  if (
    latest.authorizationStamp !== snapshot.authorizationStamp ||
    latest.contextHash !== snapshot.contextHash
  )
    throw new MathOntologySourceAccessDenied();
  return snapshot;
}
