/**
 * **보기가 그림뿐인데 어느 그림이 몇 번인지 모르는 문항이 «출제 가능»으로 남아 있는가** — 공유 DB(D-31)를 읽어서 본다.
 *
 *   npx tsx scripts/qa/checkFigureChoiceLinks.ts          # 검사 (pre-push 가 돌린다)
 *   npx tsx scripts/qa/checkFigureChoiceLinks.ts --list   # 걸린 문항 전량을 찍는다
 *
 * ## 왜 있나 (2026-10-03 3자 합의 A2 — 두 검토자가 짚은 가장 큰 위험)
 *
 * 그런 문항은 학생이 못 푼다 — 지면에 `① [그림] ② [그림] …` 과 번호 없는 그림 줄이 따로 선다.
 * 기출 적재기는 그런 행의 출제 허용을 끈 채 싣는다(`load-exam-paper.ts` · `hasUnlinkedFigureChoices`).
 * 그런데 **다른 입력 길**(손 입력 · AI 생성 · 작업실 가져오기 · 검수 화면의 본문 수정)은 그 검사를 안 한다.
 * 출제 자격은 DB 조회 조건(`problemEligibleWhere`)이라 «본문을 파싱해 짝을 견주는» 판정을 넣을 수 없다 —
 * 그래서 자격 규칙을 두 벌로 만드는 대신, **지금 DB** 에 그런 행이 0 인지를 미는 길목에서 본다
 * (`checkLoadedRawLatex.ts` 와 같은 자리 · 같은 까닭).
 *
 * 걸리면: 그 문항의 짝을 채우거나(`choiceFigureIndex`) 출제에서 뺀다(`lock-problems.ts`).
 *
 * ## 참을 어디서 가져오는가
 *
 * 판정을 옮겨 적지 않는다 — 조판 · 자 · 적재기가 쓰는 `hasUnlinkedFigureChoices` 와 `parseProblemContent` 를 그대로 부른다.
 *
 * ## 0 이 «깨끗»인지 «못 셈»인지
 *
 * 판정 전에 **일부러 걸리는 문항**과 **안 걸려야 하는 문항**을 같은 함수에 대 본다(양성 · 음성 대조).
 * 어긋나면 검사를 거부한다 — 도장은 «아니오»를 낼 수 없다(20번 교훈 2026-08-23).
 * DB 에서 고를 때는 `[그림]` 글자로 먼저 좁힌다 — 그 글자가 없는 본문에는 그림뿐인 보기가 있을 수 없다.
 */
import { PrismaClient } from "@prisma/client";

import { hasUnlinkedFigureChoices } from "../../src/lib/problem/choiceFigureIndex";
import { FIGURE_MARKER } from "../../src/lib/problem/figureMarker";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";
import { problemEligibleWhere } from "../../src/lib/problemEligibility";

const LIST = process.argv.includes("--list");

function unlinked(row: {
  content: string;
  figureUrls: readonly string[];
  choiceFigureIndex: readonly number[];
}): boolean {
  return hasUnlinkedFigureChoices(
    row.figureUrls.length,
    row.choiceFigureIndex,
    parseProblemContent(row.content).choices,
  );
}

/** 검출기가 «예»도 «아니오»도 낼 수 있는가. */
function assertDetectorAlive(): void {
  const figureOnly = `알맞은 그래프는?\n① ${FIGURE_MARKER}\n② ${FIGURE_MARKER}\n③ ${FIGURE_MARKER}\n④ ${FIGURE_MARKER}\n⑤ ${FIGURE_MARKER}`;
  const urls = ["a", "b", "c", "d", "e"];
  const cases: [string, boolean, boolean][] = [
    [
      "짝 없음",
      unlinked({
        content: figureOnly,
        figureUrls: urls,
        choiceFigureIndex: [],
      }),
      true,
    ],
    [
      "짝 온전",
      unlinked({
        content: figureOnly,
        figureUrls: urls,
        choiceFigureIndex: [1, 2, 3, 4, 5],
      }),
      false,
    ],
    [
      "글 보기",
      unlinked({
        content: "값은?\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$",
        figureUrls: ["a"],
        choiceFigureIndex: [],
      }),
      false,
    ],
  ];
  for (const [name, got, want] of cases)
    if (got !== want)
      throw new Error(
        `검출기 대조 실패(${name}: ${got} ≠ ${want}) — 이 검사의 0 은 믿을 수 없다`,
      );
}

async function main(): Promise<void> {
  assertDetectorAlive();
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.problem.findMany({
      where: {
        AND: [problemEligibleWhere(), { content: { contains: FIGURE_MARKER } }],
      },
      select: {
        id: true,
        problemCode: true,
        externalId: true,
        content: true,
        figureUrls: true,
        choiceFigureIndex: true,
      },
    });
    const hits = rows.filter(unlinked);
    console.log(
      `출제 가능하고 본문에 ${FIGURE_MARKER} 이 있는 문항 ${rows.length}건 · 그 가운데 그림뿐인 보기의 짝이 온전하지 않은 것 ${hits.length}건`,
    );
    if (hits.length === 0) {
      console.log(
        "✅ 번호를 알 수 없는 그림 보기가 출제 가능으로 남아 있지 않다.",
      );
      return;
    }
    for (const row of LIST ? hits : hits.slice(0, 10))
      console.log(
        `   ${row.problemCode}  ${row.externalId ?? row.id}  그림 ${row.figureUrls.length}장 · 짝 [${row.choiceFigureIndex.join(",")}]`,
      );
    if (!LIST && hits.length > 10)
      console.log(`   … ${hits.length - 10}건 더 (--list 로 전량)`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    `\n🔴 ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
