// 로컬 격리 DB(127.0.0.1:54335/srs_e5)의 test_s 학습 기록을 비운다 — 첫날부터 다시 걷기.
// 공유 DB 에는 닿지 않는다(주소를 로컬로 묶는다).
import { PrismaClient } from "@prisma/client";

const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54335/srs_e5";
if (!/^postgresql:\/\/[^@]+@127\.0\.0\.1:54335\//.test(LOCAL))
  throw new Error("local only");
const db = new PrismaClient({ datasourceUrl: LOCAL });

async function main() {
  const account = await db.studentAccount.findFirst({
    where: { loginId: "test_s" },
    select: { studentId: true },
  });
  if (!account) throw new Error("test_s 없음");
  const before = await db.studentSrsState.findUnique({
    where: { studentId: account.studentId },
    select: { revision: true },
  });
  const removed = await db.studentSrsState.deleteMany({
    where: { studentId: account.studentId },
  });
  const student = await db.student.findUnique({
    where: { id: account.studentId },
    select: {
      name: true,
      isTest: true,
      class: { select: { grade: true, name: true } },
    },
  });
  console.log(
    JSON.stringify({
      studentId: account.studentId,
      before,
      removed: removed.count,
      student,
    }),
  );
}
main().finally(() => db.$disconnect());
