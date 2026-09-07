import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import {
  E2E_ACCOUNTS,
  E2E_DATABASE_URL,
  E2E_TARGET_GRADE,
  E2E_TARGET_SECTION,
} from "../env";

import {
  DIFFICULTY_LADDER,
  E2E_DIFFICULTY_RATIO,
  E2E_SHORTFALL_STOCK,
  E2E_STOCK,
  totalOf,
  type TierCounts,
} from "./tiers";

const TYPES = ["계산", "개념", "활용", "서술형"] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function resetUser(db: PrismaClient, email: string) {
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) return;
  await db.test.deleteMany({ where: { userId: existing.id } });
  await db.problem.deleteMany({ where: { userId: existing.id } });
  await db.class.deleteMany({ where: { userId: existing.id } });
}

async function upsertUser(
  db: PrismaClient,
  account: { email: string; password: string; name: string },
) {
  await resetUser(db, account.email);
  const passwordHash = await hash(account.password, 10);
  const existing = await db.user.findUnique({
    where: { email: account.email },
  });
  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: { name: account.name, passwordHash },
    });
  }
  return db.user.create({
    data: {
      email: account.email,
      name: account.name,
      passwordHash,
    },
  });
}

async function createClassWithProgress(
  db: PrismaClient,
  userId: string,
  className: string,
  studentName: string,
  unitId: string,
) {
  const cls = await db.class.create({
    data: {
      userId,
      name: className,
      grade: E2E_TARGET_GRADE,
      defaultProblemCount: 8,
      difficultyRatio: E2E_DIFFICULTY_RATIO,
    },
  });
  await db.student.create({
    data: { classId: cls.id, name: studentName },
  });
  await db.progress.create({
    data: {
      classId: cls.id,
      studentId: null,
      unitId,
      recordedAt: new Date(),
    },
  });
  return cls;
}

async function createApprovedProblems(
  db: PrismaClient,
  userId: string,
  unitId: string,
  counts: TierCounts,
) {
  const created: { id: string }[] = [];
  let n = 0;
  for (const difficulty of DIFFICULTY_LADDER) {
    for (let i = 0; i < (counts[difficulty] ?? 0); i += 1) {
      n += 1;
      created.push(
        // exam-wiring: 테스트 — E2E 시드다. 제품 적재 경로가 아니다
        await db.problem.create({
          data: {
            userId,
            unitId,
            source: "manual",
            difficulty,
            problemType: TYPES[n % TYPES.length],
            content: `${difficulty} 문항 ${n}: $x+${n}$ 의 값을 구하시오.`,
            answer: String(n),
            solution: `풀이 ${n}`,
            reviewStatus: "approved",
            directUseAllowed: true,
          },
        }),
      );
    }
  }
  return created;
}

export async function seedE2eFixtures() {
  const db = new PrismaClient({
    datasources: { db: { url: E2E_DATABASE_URL } },
  });

  try {
    const unit = await db.unit.findFirst({
      where: { grade: E2E_TARGET_GRADE, section: E2E_TARGET_SECTION },
    });
    if (!unit) {
      throw new Error(
        `E2E 대상 단원(${E2E_TARGET_GRADE} ${E2E_TARGET_SECTION})이 없습니다. 시드를 확인하세요.`,
      );
    }

    const dailyUser = await upsertUser(db, E2E_ACCOUNTS.daily);
    const dailyClass = await createClassWithProgress(
      db,
      dailyUser.id,
      E2E_ACCOUNTS.daily.className,
      E2E_ACCOUNTS.daily.studentName,
      unit.id,
    );
    const dailyProblems = await createApprovedProblems(
      db,
      dailyUser.id,
      unit.id,
      E2E_STOCK,
    );
    // 🔴 분모를 못 박는다 — 재고를 줄이면 여정 B 의 「교체」가 조용히 못 하게 된다.
    if (dailyProblems.length !== totalOf(E2E_STOCK)) {
      throw new Error(
        `[e2e seed] 재고가 어긋난다: ${dailyProblems.length} != ${totalOf(E2E_STOCK)}`,
      );
    }
    const test = await db.test.create({
      data: {
        userId: dailyUser.id,
        classId: dailyClass.id,
        studentId: null,
        testType: "daily",
        rangeStartUnitId: null,
        rangeEndUnitId: unit.id,
        status: "draft",
        modified: false,
        testDate: new Date(`${todayIso()}T00:00:00.000Z`),
      },
    });
    for (const [index, problem] of dailyProblems.slice(0, 8).entries()) {
      await db.testProblem.create({
        data: {
          testId: test.id,
          problemId: problem.id,
          orderIndex: index + 1,
          replaced: false,
        },
      });
    }

    const shortfallUser = await upsertUser(db, E2E_ACCOUNTS.shortfall);
    await createClassWithProgress(
      db,
      shortfallUser.id,
      E2E_ACCOUNTS.shortfall.className,
      E2E_ACCOUNTS.shortfall.studentName,
      unit.id,
    );
    await createApprovedProblems(
      db,
      shortfallUser.id,
      unit.id,
      E2E_SHORTFALL_STOCK,
    );
  } finally {
    await db.$disconnect();
  }
}
