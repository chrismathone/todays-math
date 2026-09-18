/**
 * 출제 자격 문항을 **갈래(`familyKey`)를 골라** 심는다 — 가짜 Prisma(`prismaTestDouble`) 전용.
 *
 * 한 시험지의 상한은 행이 아니라 갈래다(D-105 · `src/lib/tests/draftCapacity.ts`).
 * 대역의 시드 문항은 전부 키가 없어(각자 한 갈래) 행 수와 갈래 수가 늘 같다 — 그래서
 * 「행은 넉넉한데 갈래가 모자란」 범위를 재려면 이렇게 따로 심어야 한다.
 *
 * 시드 행 하나를 본떠 **단원·갈래만** 바꾼다(자격 네 조건은 시드 행이 이미 갖췄다).
 */
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

type ProblemCreateData = Parameters<
  typeof prismaTestDouble.problem.create
>[0]["data"];

export async function seedFamilies(
  unitId: string,
  familyKeys: readonly string[],
): Promise<string[]> {
  const [seedRow] = (await prismaTestDouble.problem.findMany({
    where: problemEligibleWhere(),
    take: 1,
  })) as Record<string, unknown>[];
  if (!seedRow) throw new Error("본뜰 출제 자격 시드 문항이 없다");
  const base = { ...seedRow };
  delete base.id;
  delete base.problemCode;
  delete base.createdAt;
  delete base.updatedAt;

  const ids: string[] = [];
  for (const familyKey of familyKeys) {
    // exam-wiring: 테스트 — 픽스처다. 갈래 판정을 재려고 시드 행을 본뜬 것이고 기출이 아니다.
    const row = await prismaTestDouble.problem.create({
      data: {
        ...(base as ProblemCreateData),
        unitId,
        familyKey,
        reviewStatus: "approved",
        directUseAllowed: true,
      },
    });
    ids.push(row.id);
  }
  return ids;
}
