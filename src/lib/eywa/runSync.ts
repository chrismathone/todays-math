/**
 * eywa 학생별 진도 → 우리 DB 동기화 — **실행 본체** (계획 3판 §4 · §8-1).
 *
 * CLI(`scripts/sync/sync-eywa.ts`)와 서버(「지금 가져오기」 POST /api/eywa-sync)가
 * **같은 이 함수 하나**를 부른다 — 두 벌이 되면 한쪽만 고친 날 조용히 갈린다.
 * 다른 것은 원장 sink 뿐이다: CLI 는 회차별 파일, 서버는 `EywaSyncLedger` 표
 * (서버리스는 파일시스템이 read-only 라 파일 원장이 불가능하다).
 *
 * ## 구조 — 리뷰 3인이 정한 모양
 *
 * ① 수집: `EYWA_TRANSPORT`(db|api, 폴백 없음 — codex #12)로 전량을 메모리에 받고
 *    zod·total 을 검증한다. 비-200 은 «빈 것»이 아니라 실패다(grok #5).
 * ② 계획: 순수 함수(`syncPlan.ts`)가 반·학생·진도 행을 계산한다.
 * ③ 원장: 적용 **전에** 이번 실행이 바꿀 행의 before 를 sink 에 남긴다
 *    (회차 단위라 덮어쓰기가 구조적으로 없다 — 2026-08-20 교훈).
 * ④ 적용: advisory lock(동시 실행 금지 — codex #14) + **한 트랜잭션**
 *    (부분 적용 없음 — codex #13). 죽으면 다음 실행이 처음부터.
 *
 * 미분류·애매·수학반 밖 진도는 **건수+원문**으로 요약에 싣는다. 조용히 버리지 않는다.
 */
import { createHash } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { DEFAULT_DIFFICULTY_RATIO } from "@/contracts/difficulty";
import { createEywaClient } from "@/lib/eywa/client";
import { groupReportsByClassStudent, splitKey } from "@/lib/eywa/groupReports";
import {
  assertNoIdCollision,
  deriveClassProgress,
} from "@/lib/eywa/deriveClassProgress";
import { buildUnitIndex, type UnitRow } from "@/lib/eywa/resolveProgress";
import {
  classGradeOf,
  lastReportOf,
  planStudentProgress,
  primaryClassOf,
  schoolFieldsOf,
} from "@/lib/eywa/syncPlan";
import { scopeNameMismatches, scopedClassIds } from "@/lib/eywa/syncScope";
import {
  fetchViaApi,
  fetchViaDb,
  requiredTransport,
  type EywaSnapshot,
} from "@/lib/eywa/transport";

/** 우리 DB advisory lock 키 — 'eywa-sync' 의 해시 앞 15자리(안정적 상수). */
const LOCK_KEY = BigInt.asIntN(
  63,
  BigInt(
    "0x" + createHash("sha256").update("eywa-sync").digest("hex").slice(0, 15),
  ),
);

async function collect(): Promise<EywaSnapshot> {
  const transport = requiredTransport();
  if (transport === "api") return fetchViaApi();
  const eywa = createEywaClient();
  try {
    return await fetchViaDb(eywa);
  } finally {
    await eywa.$disconnect();
  }
}

export interface EywaSyncSummary {
  runId: string;
  applied: boolean;
  transport: string;
  /** 분모 셋(grok #6): 수학 재원 · 보고서 있는 학생 · 진도 행이 생기는 학생. */
  rosterTotal: number;
  studentsWithReports: number;
  studentsWithRows: number;
  classes: number;
  reports: number;
  plannedRows: number;
  ambiguous: number;
  examOnly: number;
  unresolvedLines: number;
  unresolvedKinds: number;
  outOfRosterReports: number;
  outOfRosterStudents: number;
  /** 적용했을 때만 — 검산 «연계 학생(활성) == roster» 결과 포함. */
  appliedCounts?: {
    classes: number;
    students: number;
    withdrawn: number;
    deleted: number;
    created: number;
    linkedAfter: number;
  };
}

export async function runEywaSync(opts: {
  prisma: PrismaClient;
  apply: boolean;
  /**
   * 되돌리기 원장 sink — 적용 **전에** before 전량을 받는다. 반드시 기록이 끝난
   * 뒤에만 적용으로 넘어간다(던지면 적용도 없다). dry-run 에서는 안 불린다.
   */
  writeLedger: (runId: string, payload: unknown) => Promise<void> | void;
}): Promise<EywaSyncSummary> {
  const { prisma, apply } = opts;
  const runId = `eywa-sync-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  // ── ① 수집·검증 ─────────────────────────────────────────────
  const snapshot = await collect();
  const { roster, reports, progressTotal } = snapshot;
  if (roster.students.length !== roster.total)
    throw new Error(
      `roster 불변식 위반: students ${roster.students.length} != total ${roster.total}`,
    );
  // 🔴 «빈 가드»의 축(grok #5): roster 가 통째로 비면 정상일 수 없다 — 멈춘다.
  //    progress 는 받은 수 < total 이면 경고만(스캔 중 삽입 — 다음 실행이 수렴).
  if (roster.total === 0)
    throw new Error("roster 가 비었다 — eywa 쪽 장애로 보고 중단한다.");
  const progressGap = progressTotal - reports.length;
  if (Math.abs(progressGap) > 0)
    console.warn(
      `⚠️ progress 받은 수 ${reports.length} != total ${progressTotal} (차이 ${progressGap}) — 다음 전량 실행이 수렴시킨다`,
    );

  const units = (await prisma.unit.findMany({
    select: {
      id: true,
      grade: true,
      chapter: true,
      section: true,
      orderIndex: true,
    },
  })) as UnitRow[];
  const index = buildUnitIndex(units);

  const owner = await prisma.user.findUnique({
    where: { email: process.env.EYWA_SYNC_OWNER_EMAIL ?? "" },
    select: { id: true, email: true },
  });
  if (!owner)
    throw new Error(
      `EYWA_SYNC_OWNER_EMAIL 계정이 없다: ${process.env.EYWA_SYNC_OWNER_EMAIL}`,
    );

  // ── ①-b 범위 (원장님 확정 2026-08-25) ────────────────────────
  // 예전에는 「활성 수학반 전부」(68반·341명)를 매일 가져왔다. 지금은 **허용 목록**
  // (`syncScope.ts`)에 적힌 반만 본다. ⚠️ **걸러 낸 것은 반드시 세어 찍는다** —
  // 조용히 빠지면 요약이 「전부 가져왔다」로 읽힌다.
  const 허용 = scopedClassIds();
  const 원본반이름 = new Map<string, string>();
  for (const s of roster.students)
    for (const c of s.classes) 원본반이름.set(c.id, c.name);
  const 범위밖반 = new Set(
    [...원본반이름.keys()].filter((id) => !허용.has(id)),
  );
  // 목록이 낡았는지 **본문 밖 근거**로 본다 — 허용 id 가 원본에 아예 없으면 그 반이
  // 사라졌거나 id 를 잘못 적은 것이다. 조용히 0건 동기화가 되는 것을 막는다.
  const 원본에없는허용 = [...허용].filter((id) => !원본반이름.has(id));
  for (const m of scopeNameMismatches(원본반이름))
    console.warn(
      `⚠️ 범위 목록의 이름이 원본과 다르다 — ${m.eywaClassId}: 적힌 이름 「${m.expected}」 ≠ 지금 「${m.actual}」. syncScope.ts 를 고칠 것`,
    );
  if (원본에없는허용.length > 0)
    console.warn(
      `⚠️ 허용 목록의 반 ${원본에없는허용.length}개가 **원본 명단에 없다**: ${원본에없는허용.join(", ")} — 종강했거나 id 가 틀렸다`,
    );

  const 범위밖학생 = roster.students.filter(
    (s) => !s.classes.some((c) => 허용.has(c.id)),
  ).length;
  // 학생의 소속 반 목록도 허용분만 남긴다 — 안 그러면 `primaryClassOf` 가 범위 밖 반을
  // 고를 수 있다(한 학생이 여러 반인 경우가 실측 69%다).
  const scopedRoster = {
    ...roster,
    students: roster.students
      .map((s) => ({ ...s, classes: s.classes.filter((c) => 허용.has(c.id)) }))
      .filter((s) => s.classes.length > 0),
  };

  // ── ② 계획 ──────────────────────────────────────────────────
  // 반: **범위 안** 활성 수학반. 학년은 소속 학생 학년의 최빈값.
  const classMembers = new Map<
    string,
    { name: string; grades: (string | null)[] }
  >();
  for (const student of scopedRoster.students)
    for (const cls of student.classes) {
      const entry = classMembers.get(cls.id) ?? { name: cls.name, grades: [] };
      entry.name = cls.name;
      entry.grades.push(student.grade);
      classMembers.set(cls.id, entry);
    }

  // 🔴 보고서를 **(반, 학생)** 으로 가른다 — 규칙과 실측 근거는 `groupReports.ts` 에.
  //    예전에는 학생 단위로만 묶어 특강 진도가 본수업을 덮었다(원장님 지적 2026-08-25).
  const rosterIds = new Set(scopedRoster.students.map((s) => s.id));
  const {
    byClassStudent,
    byStudent: byStudentReports,
    명단밖진도,
    명단밖학생,
    반없는보고서,
    범위밖반보고서,
  } = groupReportsByClassStudent(reports, rosterIds, 허용, 원본반이름);

  const progressPlans = new Map<
    string,
    ReturnType<typeof planStudentProgress>
  >();
  let 애매 = 0;
  let 시험기간만 = 0;
  const 미분류 = new Map<string, number>();
  for (const [key, list] of byClassStudent) {
    const plan = planStudentProgress(index, list);
    progressPlans.set(key, plan);
    애매 += plan.ambiguous;
    시험기간만 += plan.examOnly;
    for (const raw of plan.unresolved)
      미분류.set(raw, (미분류.get(raw) ?? 0) + 1);
  }

  // ── 요약 (dry-run 의 산출물이자 실쓰기의 전조) ────────────────
  const plannedRows = [...progressPlans.values()].reduce(
    (a, p) => a + p.rows.length,
    0,
  );
  const 진도있는학생 = [...progressPlans.values()].filter(
    (p) => p.rows.length > 0,
  ).length;
  const unresolvedLines = [...미분류.values()].reduce((a, b) => a + b, 0);
  console.log(
    `\n=== eywa 동기화 ${apply ? "(실쓰기)" : "(dry-run)"} · ${runId} ===`,
  );
  // 🔴 **범위를 분모 앞에 찍는다.** 이 줄이 없으면 「수학 재원 7명」이 «학원에 7명»으로
  //    읽힌다 — 실제로는 341명 중 범위 안이 7명이다. 걸러 낸 수를 같이 적어야
  //    「전부 가져왔다」로 안 읽힌다.
  console.log(
    `범위: 반 ${허용.size}개만 본다 (거른 반 ${범위밖반.size}개 · 거른 학생 ${범위밖학생}명) — src/lib/eywa/syncScope.ts`,
  );
  console.log(
    `분모 셋(grok #6): 범위 안 재원 ${scopedRoster.students.length}명 / 수학 재원 전체 ${roster.total}명 · 진도 보고서 있는 학생 ${byStudentReports.size}명 · 진도 행이 생기는 학생 ${진도있는학생}명`,
  );
  console.log(
    `반 ${classMembers.size}개 · 진도 보고서 ${reports.length}건 → 진도 행 ${plannedRows}개`,
  );
  // 🔴 **버린 보고서를 세어 찍는다.** 조용히 빠지면 「전부 가져왔다」로 읽힌다.
  //    특히 범위 밖 반(특강·개별반)은 **일부러** 버리는 것이라 근거가 보여야 한다.
  console.log(
    `버린 보고서: 반이 안 적힘 ${반없는보고서}건 · 범위 밖 반 ${[...범위밖반보고서.values()].reduce((a, b) => a + b, 0)}건`,
  );
  if (범위밖반보고서.size > 0)
    for (const [이름, n] of [...범위밖반보고서]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 8))
      console.log(`    ${n}건  «${이름}»`);
  console.log(
    `애매(자동 선택 안 함) ${애매}건 · 시험기간만 적힌 보고서 ${시험기간만}건 · 명단 밖 진도 ${명단밖진도}건(학생 ${명단밖학생.size}명)`,
  );
  console.log(`미분류 ${unresolvedLines}줄 / ${미분류.size}종 — 상위 10:`);
  for (const [raw, cnt] of [...미분류].sort((a, b) => b[1] - a[1]).slice(0, 10))
    console.log(`  ${String(cnt).padStart(4)}회  «${raw.slice(0, 64)}»`);

  const summary: EywaSyncSummary = {
    runId,
    applied: false,
    transport: requiredTransport(),
    rosterTotal: scopedRoster.students.length,
    studentsWithReports: byStudentReports.size,
    studentsWithRows: 진도있는학생,
    classes: classMembers.size,
    reports: reports.length,
    plannedRows,
    ambiguous: 애매,
    examOnly: 시험기간만,
    unresolvedLines,
    unresolvedKinds: 미분류.size,
    outOfRosterReports: 명단밖진도,
    outOfRosterStudents: 명단밖학생.size,
  };

  if (!apply) {
    console.log("\ndry-run — 아무것도 쓰지 않았다.");
    return summary;
  }

  // ── ③ 원장 (적용 전에, 회차 단위 sink 로) ─────────────────────
  const beforeStudents = await prisma.student.findMany({
    where: { eywaStudentId: { not: null } },
    select: {
      id: true,
      eywaStudentId: true,
      name: true,
      classId: true,
      eywaWithdrawnAt: true,
    },
  });
  const beforeClasses = await prisma.class.findMany({
    where: { eywaClassId: { not: null } },
    select: { id: true, eywaClassId: true, name: true, grade: true },
  });
  // 진도는 «전체 삭제 → createMany»로 적용하므로(행별 upsert 13,571번은 원격
  // 왕복 ~17분 — 트랜잭션 타임아웃을 넘는다) 원장에 **행 전체**를 남긴다.
  const beforeProgressRows = await prisma.progress.findMany({
    where: { eywaReportId: { not: null } },
    select: {
      eywaReportId: true,
      unitId: true,
      classId: true,
      studentId: true,
      recordedAt: true,
      createdAt: true,
    },
  });
  await opts.writeLedger(runId, {
    runId,
    transport: requiredTransport(),
    before: {
      students: beforeStudents,
      classes: beforeClasses,
      progressRows: beforeProgressRows,
    },
    planned: {
      classes: classMembers.size,
      // 범위 안 재원. 전체(roster.total)를 쓰면 원장이 「341명을 계획했다」로 읽힌다.
      students: scopedRoster.students.length,
      progressRows: plannedRows,
    },
  });

  // ── ④ 적용 — advisory lock + 한 트랜잭션 ─────────────────────
  const appliedCounts = {
    classes: 0,
    students: 0,
    withdrawn: 0,
    deleted: 0,
    created: 0,
    linkedAfter: 0,
  };
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`select pg_advisory_xact_lock(${LOCK_KEY})`);

      // 반 upsert — grade 는 최빈값. userId 는 생성 때만(소유 이관은 수동).
      const ourClassId = new Map<string, string>();
      for (const [eywaClassId, info] of classMembers) {
        const grade = classGradeOf(info.grades) ?? "중1";
        const row = await tx.class.upsert({
          where: { eywaClassId },
          create: {
            eywaClassId,
            name: info.name,
            grade,
            userId: owner.id,
            difficultyRatio: DEFAULT_DIFFICULTY_RATIO,
          },
          update: { name: info.name, grade },
          select: { id: true },
        });
        ourClassId.set(eywaClassId, row.id);
      }

      // 학생 upsert — 주반 규칙 + 학교 필드 + 개별 진도 켜기.
      const ourStudentId = new Map<string, string>();
      for (const student of scopedRoster.students) {
        const primary = primaryClassOf(student.classes);
        if (!primary) continue; // 활성 수학반이 없으면 이 연계의 대상이 아니다
        const school = schoolFieldsOf(student.grade);
        // D-64: 마지막 보고서 날짜·원문 — 시험기간만 적힌 날의 학생을 화면이
        // «자동 출제 제외 — 표시만»으로 보여 줄 유일한 근거다.
        const last = lastReportOf(byStudentReports.get(student.id) ?? []);
        const lastFields = {
          eywaLastReportDate: last ? new Date(`${last.date}T00:00:00Z`) : null,
          eywaLastReportText: last?.text ?? null,
        };
        const row = await tx.student.upsert({
          where: { eywaStudentId: student.id },
          create: {
            eywaStudentId: student.id,
            name: student.name,
            classId: ourClassId.get(primary.id)!,
            useIndividualProgress: true,
            schoolName: student.school?.slice(0, 50) ?? null,
            schoolLevel: school.schoolLevel,
            schoolGrade: school.schoolGrade,
            ...lastFields,
          },
          update: {
            name: student.name,
            classId: ourClassId.get(primary.id)!,
            useIndividualProgress: true,
            schoolName: student.school?.slice(0, 50) ?? null,
            schoolLevel: school.schoolLevel,
            schoolGrade: school.schoolGrade,
            eywaWithdrawnAt: null, // 돌아온 학생은 표시를 푼다
            ...lastFields,
          },
          select: { id: true },
        });
        ourStudentId.set(student.id, row.id);
      }

      // 대사 ①: roster 에 없는 연계 학생 → 퇴원 표시(삭제 아님 — 이력 보존).
      const withdrawn = await tx.student.updateMany({
        where: {
          eywaStudentId: { not: null, notIn: [...rosterIds] },
          eywaWithdrawnAt: null,
        },
        data: { eywaWithdrawnAt: new Date() },
      });

      // 진도 — **연계 행 전체 삭제 → createMany.** 행별 upsert 는 원격 왕복
      // 13,571번(~17분)이라 못 쓴다. Progress 를 가리키는 FK 는 없고(스키마 확인)
      // 소비자는 살아 있는 행만 읽으므로 행 id 가 갈려도 안전하다. 지워진·바뀐
      // 보고서의 대사(grok #9)도 전체 교체가 자동으로 해결한다.
      const deleted = await tx.progress.deleteMany({
        where: { eywaReportId: { not: null } },
      });
      const rowsToCreate: Array<{
        eywaReportId: string;
        unitId: string;
        classId: string;
        studentId: string;
        recordedAt: Date;
        createdAt: Date;
      }> = [];
      for (const [key, plan] of progressPlans) {
        // 🔴 반은 **그 보고서가 적어 둔 반**이다. 예전에는 `primaryClassOf` 로 주반
        //    하나에 몰아넣어 특강 진도가 본수업을 덮었다(원장님 지적 2026-08-25).
        const { classId: eywaClassId, studentId: eywaStudentId } =
          splitKey(key);
        const studentId = ourStudentId.get(eywaStudentId);
        const classId = ourClassId.get(eywaClassId);
        if (!studentId || !classId) continue;
        for (const row of plan.rows)
          rowsToCreate.push({
            eywaReportId: row.eywaReportId,
            unitId: row.unitId,
            classId,
            studentId,
            recordedAt: new Date(`${row.recordedAt}T00:00:00Z`),
            createdAt: row.createdAt,
          });
      }
      // 🔴 **반 진도를 여기서 유도한다.** eywa 에는 반 진도가 없고(원장님 확인)
      //    우리 쪽 읽는 자리 셋은 전부 `studentId: null` 만 본다 — 그래서 개별 진도를
      //    아무리 채워도 화면은 「어제 진도가 비어 있습니다」였고 출제는 404 였다.
      //    읽는 쪽 셋을 각각 고치면 규칙이 세 벌이 되므로 **쓰는 쪽에서 한 번** 만든다.
      //    학생마다 최신 단원이 갈리는 반(개별진도반)은 만들지 않는다.
      const classToEywa = new Map(
        [...ourClassId].map(([eywaId, ourId]) => [ourId, eywaId] as const),
      );
      const derived = deriveClassProgress(rowsToCreate, classToEywa);
      assertNoIdCollision(rowsToCreate, derived.rows);
      const allRows = [...rowsToCreate, ...derived.rows];
      for (let at = 0; at < allRows.length; at += 2000)
        await tx.progress.createMany({
          data: allRows.slice(at, at + 2000),
        });
      if (derived.diverged.length > 0)
        console.log(
          `⚠️ 학생마다 최신 단원이 갈려 반 진도를 안 만든 반 ${derived.diverged.length}개 ` +
            `— 개별진도반으로 봐야 한다: ${derived.diverged
              .map(
                (d) => `${d.classId}(단원 ${d.units}개/학생 ${d.students}명)`,
              )
              .join(", ")}`,
        );
      console.log(`유도한 반 진도 ${derived.rows.length}행`);

      // 실행 기록 — 화면의 「마지막 동기화」 스트립이 읽는다. 트랜잭션 안이라
      // 적용이 죽으면 기록도 남지 않는다(«성공한 실행»만 기록).
      await tx.eywaSyncRun.create({
        data: {
          transport: requiredTransport(),
          // 화면 「마지막 동기화」가 읽는 수 — 범위 안 재원이어야 실제와 맞는다.
          students: scopedRoster.students.length,
          classes: classMembers.size,
          progressRows: allRows.length,
          unresolvedLines,
          ambiguous: 애매,
          examOnly: 시험기간만,
        },
      });

      appliedCounts.classes = ourClassId.size;
      appliedCounts.students = ourStudentId.size;
      appliedCounts.withdrawn = withdrawn.count;
      appliedCounts.deleted = deleted.count;
      // 🔴 **실제로 쓴 수**를 찍는다. 유도한 반 진도를 빼고 찍으면 원장·표·화면이
      //    저마다 다른 수를 말한다 — 「분모가 셋이면 하나는 틀리다」의 자리다.
      appliedCounts.created = allRows.length;
      console.log(
        `적용: 반 ${ourClassId.size} · 학생 ${ourStudentId.size} · 퇴원 표시 ${withdrawn.count} · ` +
          `진도 삭제 ${deleted.count} → 생성 ${allRows.length}` +
          `(학생 ${rowsToCreate.length} + 유도한 반 ${derived.rows.length})`,
      );
    },
    { timeout: 300_000 },
  );

  // 검산 — 완료 조건 §7: 연계 학생 수 == roster.
  const linked = await prisma.student.count({
    where: { eywaStudentId: { not: null }, eywaWithdrawnAt: null },
  });
  appliedCounts.linkedAfter = linked;
  // ⚠️ 예전엔 `roster.total`(수학 재원 **전체**)과 댔다. 범위를 좁힌 뒤 그대로 두면
  //    **늘 ❌** 라 거짓 경보가 되고, 거짓 경보는 가드를 끈다(2026-08-20).
  //    분모를 **범위 안 재원**으로 맞춘다.
  const 범위재원 = scopedRoster.students.length;
  console.log(
    `\n검산: 연계 학생(활성) ${linked}명 == 범위 안 재원 ${범위재원}명 → ${linked === 범위재원 ? "✅" : "❌"}` +
      `  (수학 재원 전체 ${roster.total}명 — 범위 밖은 연계하지 않는다)`,
  );
  return { ...summary, applied: true, appliedCounts };
}
