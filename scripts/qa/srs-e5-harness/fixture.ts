// 로컬 격리 DB(127.0.0.1:54335/srs_e5)에 초5 학습 환경을 만든다.
// 공유 DB 는 읽기만 한다(초5 문항 행을 읽어 로컬에 복사). 공유 DB 에 쓰는 줄은 없다.
import { readFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54335/srs_e5";
if (!/^postgresql:\/\/[^@]+@127\.0\.0\.1:54335\//.test(LOCAL))
  throw new Error("local only");

// 로컬 계정의 비밀번호는 저장소에 적지 않는다 — 운영 시험 계정과 같은 아이디(test_s)를 쓰기 때문이다.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 를 넣어 주세요(로컬 계정의 비밀번호)`);
  return value;
}
const DIRECTOR_PASSWORD = required("SRS_E5_DIRECTOR_PASSWORD");
const STUDENT_PASSWORD = required("SRS_E5_STUDENT_PASSWORD");

function sharedUrl(): string {
  const text = readFileSync(
    process.env.SHARED_ENV_FILE ?? "D:/todays-math/.env",
    "utf8",
  );
  const line = text.split(/\r?\n/).find((l) => /^DATABASE_URL\s*=/.test(l));
  if (!line) throw new Error("no shared url");
  return line.replace(/^DATABASE_URL\s*=\s*/, "").replace(/^["']|["']$/g, "");
}

const local = new PrismaClient({ datasourceUrl: LOCAL });
const shared = new PrismaClient({ datasourceUrl: sharedUrl() });

async function main() {
  const grades = (process.argv[2] ?? "초5").split(",");
  // 1) 원장 · 반 · 학생 · 계정
  const email = "director@srs-e5.local";
  const user =
    (await local.user.findUnique({ where: { email } })) ??
    (await local.user.create({
      data: {
        email,
        name: "검수원장",
        passwordHash: await hash(DIRECTOR_PASSWORD, 10),
        approvalStatus: "approved",
      },
    }));
  let cls = await local.class.findFirst({
    where: { userId: user.id, name: "초5 기억반" },
  });
  if (!cls)
    cls = await local.class.create({
      data: {
        userId: user.id,
        name: "초5 기억반",
        grade: "초5",
        difficultyRatio: { 하: 3, 중: 4, 상: 3 },
      },
    });
  let student = await local.student.findFirst({
    where: { classId: cls.id, name: "검수학생" },
  });
  if (!student)
    student = await local.student.create({
      data: { classId: cls.id, name: "검수학생", isTest: true },
    });
  const account = await local.studentAccount.findUnique({
    where: { studentId: student.id },
  });
  if (!account)
    await local.studentAccount.create({
      data: {
        studentId: student.id,
        loginId: "test_s",
        passwordHash: await hash(STUDENT_PASSWORD, 10),
        mustChangePassword: false,
        issuedById: user.id,
      },
    });
  console.log(
    "원장",
    email,
    "· 학생 test_s · 반",
    cls.id,
    "· 학생",
    student.id,
  );

  // 2) 문항 복사 (공유 → 로컬, 읽기만)
  const localUnits = await local.unit.findMany({
    select: { id: true, grade: true, chapter: true, section: true },
  });
  const key = (u: { grade: string; chapter: string; section: string }) =>
    `${u.grade}|${u.chapter}|${u.section}`;
  const byKey = new Map(localUnits.map((u) => [key(u), u.id]));
  const already = await local.problem.count();
  if (already) {
    console.log("문항 이미 있음", already);
    return;
  }
  for (const grade of grades) {
    const units = await shared.unit.findMany({
      where: { grade },
      select: { id: true, grade: true, chapter: true, section: true },
    });
    let copied = 0;
    for (const u of units) {
      const localId = byKey.get(key(u));
      if (!localId) continue;
      const rows = await shared.problem.findMany({ where: { unitId: u.id } });
      const data = rows.map((r) => ({
        ...r,
        unitId: localId,
        userId: null,
        originProblemId: null,
        sourceMaterialId: null,
      }));
      for (let i = 0; i < data.length; i += 500)
        await local.problem.createMany({
          data: data.slice(i, i + 500) as never,
          skipDuplicates: true,
        });
      copied += data.length;
    }
    console.log(grade, "문항 복사", copied);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await local.$disconnect();
    await shared.$disconnect();
  });
