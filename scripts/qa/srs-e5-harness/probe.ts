// 로컬 DB 에서 3일차 시작이 503 이 된 자리를 찾는다.
import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { db } from "@/lib/db";

async function main() {
  if (!process.env.DATABASE_URL?.includes("127.0.0.1:54335"))
    throw new Error("local only");
  try {
    const c = await loadCourseBankCandidates("5-2-1-1");
    console.log("candidates", c.length);
  } catch (e) {
    console.log(
      "bank error",
      (e as { code?: string }).code,
      String((e as Error).message).slice(0, 600),
    );
  }
  const student = await db.student.findFirst({ where: { name: "검수학생" } });
  try {
    const s = await readSrsState(student!.id);
    console.log("srs revision", s.revision, Object.keys(s.state));
  } catch (e) {
    console.log(
      "srs error",
      (e as { code?: string }).code,
      String((e as Error).message).slice(0, 600),
    );
  }
  await db.$disconnect();
}
main();
