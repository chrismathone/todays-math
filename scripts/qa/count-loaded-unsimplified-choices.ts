/**
 * 문제은행에 **이미 실린** 엔진 객관식 가운데 «덜 정리된 오답»(`$0\sqrt{3}$` · `$1\sqrt{3}$` · `$\sqrt{4}$` ·
 * 약분 안 된 분수 · 분모의 근호)이 든 행을 센다. **읽기만 한다** — 읽기 전용 트랜잭션.
 *
 * 정답 보기부터 덜 정리된 꼴이면(그것이 묻는 것이면) 세지 않는다 — `deriveFormats.ts` 의 거름과 같은 기준.
 *
 *   node --env-file=<.env> node_modules/tsx/dist/cli.mjs scripts/qa/count-loaded-unsimplified-choices.ts [--out <json>]
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { exactChoiceValue } from "../../src/lib/math/exactChoiceValue";

const MARKS = "①②③④⑤";
const outIndex = process.argv.indexOf("--out");
const out = outIndex > 0 ? process.argv[outIndex + 1] : "";

function choiceTexts(content: string): string[] | null {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && MARKS.includes(l[0]!))
    .map((l) => l.slice(1).trim());
  return lines.length === 5 ? lines : null;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return tx.problem.findMany({
        where: {
          questionType: "객관식",
          externalId: { startsWith: "engine-" },
        },
        select: {
          id: true,
          externalId: true,
          familyKey: true,
          content: true,
          answer: true,
          directUseAllowed: true,
          reviewStatus: true,
        },
      });
    });
    const hits: {
      id: string;
      externalId: string | null;
      familyKey: string | null;
      directUseAllowed: boolean;
      detail: string;
    }[] = [];
    for (const r of rows) {
      const choices = choiceTexts(r.content);
      const correct = MARKS.indexOf(r.answer.trim());
      if (!choices || correct < 0) continue;
      const answerExact = exactChoiceValue(choices[correct]!);
      if (!answerExact || answerExact.unsimplified.length > 0) continue;
      const flagged = choices
        .map((c, i) => ({
          i,
          issues:
            i === correct ? [] : (exactChoiceValue(c)?.unsimplified ?? []),
        }))
        .filter((x) => x.issues.length > 0);
      if (flagged.length === 0) continue;
      hits.push({
        id: r.id,
        externalId: r.externalId,
        familyKey: r.familyKey,
        directUseAllowed: r.directUseAllowed,
        detail: flagged
          .map((x) => `${MARKS[x.i]}${choices[x.i]}:${x.issues.join("+")}`)
          .join(" "),
      });
    }
    const byFamily = new Map<string, number>();
    for (const h of hits)
      byFamily.set(
        h.familyKey ?? "?",
        (byFamily.get(h.familyKey ?? "?") ?? 0) + 1,
      );
    const summary = {
      kind: "loaded-engine-unsimplified-choices/v1",
      readOnlyTransaction: true,
      engineMcRows: rows.length,
      rowsWithUnsimplifiedWrongChoices: hits.length,
      directUseAllowed: hits.filter((h) => h.directUseAllowed).length,
      families: byFamily.size,
      byFamily: [...byFamily.entries()].sort((a, b) => b[1] - a[1]),
      hits,
      dbWrites: 0,
    };
    if (out) fs.writeFileSync(out, JSON.stringify(summary, null, 2) + "\n");
    console.log(
      JSON.stringify({
        engineMcRows: summary.engineMcRows,
        rowsWithUnsimplifiedWrongChoices:
          summary.rowsWithUnsimplifiedWrongChoices,
        directUseAllowed: summary.directUseAllowed,
        families: summary.families,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
