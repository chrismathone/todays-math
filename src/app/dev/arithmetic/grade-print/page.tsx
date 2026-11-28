import { notFound } from "next/navigation";
import { connection } from "next/server";
import { devPageVisible } from "@/lib/devPageAccess";
import {
  listArithmeticV2Types,
  buildArithmeticV2Sheet,
  listArithmeticV2PrintItems,
  getArithmeticV2Definition,
} from "@/lib/arithmetic-v2";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
} from "@/contracts/arithmeticV2.contract";
import { gradeArithmeticPaperPages } from "@/components/arithmetic/GradeArithmeticPaper";
import { arithmeticToNodeStudioProblems } from "@/lib/arithmeticOutput.server";

/** Every implemented family on actual A4; deterministic, development only, no DB. */
export default async function GradeArithmeticPrintFixture({
  searchParams,
}: {
  searchParams: Promise<{
    density?: string;
    title?: string;
    grade?: string;
    type?: string;
    count?: string;
    stress?: string;
  }>;
}) {
  await connection();
  if (!(await devPageVisible())) notFound();
  const params = await searchParams;
  const types = listArithmeticV2Types().filter(
    (type) =>
      (!params.grade || type.grade === params.grade) &&
      (!params.type || type.id === params.type),
  );
  if (!types.length) notFound();
  const requestedCount = Number(params.count);
  const count =
    types.length === 1 &&
    Number.isInteger(requestedCount) &&
    requestedCount >= 1 &&
    requestedCount <= 100
      ? Math.min(requestedCount, types[0].domainSize)
      : 1;
  const sheet = buildArithmeticV2Sheet({
    engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
    seed: "grade-arithmetic-paper-20261014",
    rounds: [
      { allocations: types.map((type) => ({ typeId: type.id, count })) },
    ],
  });
  if (params.stress === "1") {
    const stress: Record<string, number> = {
      "elem-g5-mixed-unlike-add": 12399,
      "elem-g5-fraction-mul": 28425,
      "elem-g6-fraction-div": 28431,
      "elem-g6-decimal-div": 5553,
      "elem-g5-decimal-mul": 980098,
      "m2-polynomial-add": 0,
      "m2-polynomial-subtract": 0,
      "m2-polynomial-monomial-divide": 1,
      "m3-radical-add": 529,
      "m3-radical-subtract": 529,
      "m3-radical-rationalize": 13,
    };
    sheet.rounds[0].items = sheet.rounds[0].items.map((item) => {
      const domainIndex = stress[item.typeId];
      return domainIndex === undefined
        ? item
        : {
            ...item,
            domainIndex,
            ...getArithmeticV2Definition(item.typeId).problemAt(domainIndex),
          };
    });
  }
  const items = listArithmeticV2PrintItems(sheet);
  return (
    <main style={{ margin: 0, padding: 0 }}>
      {gradeArithmeticPaperPages({
        problems: arithmeticToNodeStudioProblems(sheet),
        rounds: sheet.rounds.map((round) => ({
          round: round.round,
          items: items.filter((item) => item.round === round.round),
        })),
        title: params.title?.slice(0, 200) || "연산 실력 다지기",
        mode: "both",
        density: params.density === "12" ? 12 : 24,
      }).map((page) => page.node)}
    </main>
  );
}
