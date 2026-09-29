/**
 * 오늘의 영어 — 시험 소유 조회 (D-148). **임시 우회** — 트랙 english-ai 소유.
 *
 * 🔴 Prisma 모델 `EnglishExam` 은 base 트랙(`english-base`)이 만들고 이 워크트리에는 없다. 그래서 `db.englishExam`
 *    을 형으로 부를 수 없어 이 파일 **한 곳**에서만 구조적 형으로 좁혀 부른다. `/api/english/generate` 는 이 함수
 *    하나만 쓰고, 시험은 이 모듈을 모킹한다(`src/__tests__/api/englishGenerate.test.ts`).
 *
 *    리드가 base 를 병합하면 `ownership.ts` 의 `requireOwnedEnglishExam(viewer, id)`(없으면 404 · 범위 밖 403)로
 *    바꾸고 이 파일을 지운다 — 보고서 `docs/planning/tracks/reports/english-ai.md` «리드가 정할 것».
 *
 * 소유 판정은 여기서 하지 않는다 — 라우트가 `withinOwnerScope(viewer, userId, ownerBranchId)`(D-130) 로 본다.
 */
import {
  englishGradeSchema,
  type EnglishGrade,
} from "@/contracts/english.contract";
import type { db as prismaDb } from "@/lib/db";

export interface EnglishExamOwnership {
  id: string;
  grade: EnglishGrade;
  userId: string;
  /** 소유자의 지점 — 지점 관리자가 넘을 수 있는지(`withinOwnerScope`) 가르는 값. 없으면 null */
  ownerBranchId: string | null;
}

type EnglishExamRow = { id: string; grade: string; userId: string };
type EnglishExamDelegate = {
  findUnique(args: {
    where: { id: string };
    select: { id: true; grade: true; userId: true };
  }): Promise<EnglishExamRow | null>;
};

/** 시험의 학년 · 소유자 · 소유자 지점. 없으면 null. */
export async function findEnglishExamGrade(
  db: typeof prismaDb,
  id: string,
): Promise<EnglishExamOwnership | null> {
  const exams = (db as unknown as { englishExam?: EnglishExamDelegate })
    .englishExam;
  if (!exams)
    throw new Error(
      "Prisma 모델 englishExam 이 없습니다 — english-base 병합 · prisma generate 뒤에 쓸 수 있습니다.",
    );
  const row = await exams.findUnique({
    where: { id },
    select: { id: true, grade: true, userId: true },
  });
  if (!row) return null;
  const owner = await db.user.findUnique({
    where: { id: row.userId },
    select: { branchId: true },
  });
  return {
    id: row.id,
    grade: englishGradeSchema.parse(row.grade),
    userId: row.userId,
    ownerBranchId: owner?.branchId ?? null,
  };
}
