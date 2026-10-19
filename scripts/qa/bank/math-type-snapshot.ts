/** Private input for the type audit. No student/account records and no DB writes. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { isProblemEligible } from "../../../src/lib/problemEligibility";

const prisma = new PrismaClient({ log: [] });
const at = process.argv.indexOf("--out");
const out = resolve(
  at < 0 ? ".qa-artifacts/math-type-audit-20261018" : process.argv[at + 1],
);
mkdirSync(out, { recursive: true, mode: 0o700 });
const digest = createHash("sha256");
const save = (file: string, data: unknown) =>
  writeFileSync(resolve(out, file), JSON.stringify(data, null, 2) + "\n", {
    mode: 0o600,
  });

async function main() {
  if (process.argv.includes("--metadata-only")) {
    const metadata = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const books = await tx.sourceBook.findMany({
          select: {
            id: true,
            externalKey: true,
            kind: true,
            publisher: true,
            author: true,
            title: true,
            grade: true,
            curriculum: true,
          },
        });
        const materials = await tx.sourceMaterial.findMany({
          select: {
            id: true,
            externalKey: true,
            bookId: true,
            kind: true,
            kindRaw: true,
            title: true,
            chapterNo: true,
            middleNo: true,
            sectionNo: true,
            unitRaw: true,
            semester: true,
            round: true,
            levelRaw: true,
            sequence: true,
            sourceFile: true,
          },
        });
        save("books.json", books);
        save("materials-extra.json", materials);
        return {
          measuredAt: new Date().toISOString(),
          readOnly: true,
          books: books.length,
          materials: materials.length,
          sha256: createHash("sha256")
            .update(JSON.stringify([books, materials]))
            .digest("hex"),
          note: "Supplemental metadata read after snapshot, does not replace the frozen problem snapshot",
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 60000 },
    );
    save("metadata-extra.json", metadata);
    console.log(JSON.stringify(metadata));
    return;
  }
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const meta = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const measuredAt = new Date().toISOString();
      const units = await tx.unit.findMany({
        select: {
          id: true,
          grade: true,
          chapter: true,
          section: true,
          orderIndex: true,
          semester: true,
        },
        orderBy: [{ grade: "asc" }, { orderIndex: "asc" }],
      });
      const families = await tx.problemFamily.findMany({
        select: {
          unitId: true,
          familyKey: true,
          familyCode: true,
          nextSeq: true,
        },
        orderBy: [{ unitId: "asc" }, { familyKey: "asc" }],
      });
      const materials = await tx.sourceMaterial.findMany({
        select: {
          id: true,
          externalKey: true,
          bookId: true,
          kind: true,
          kindRaw: true,
          title: true,
          unitRaw: true,
          levelRaw: true,
          sourceFile: true,
        },
      });
      save("units.json", units);
      save("families.json", families);
      save("materials.json", materials);
      const temp = resolve(out, "snapshot.partial.jsonl");
      writeFileSync(temp, "", { mode: 0o600 });
      let cursor: string | undefined;
      let total = 0;
      let eligible = 0;
      const sources: Record<string, { total: number; eligible: number }> = {};
      while (true) {
        const rows = await tx.problem.findMany({
          take: 1000,
          orderBy: { id: "asc" },
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            problemCode: true,
            unitId: true,
            source: true,
            difficulty: true,
            familyKey: true,
            problemType: true,
            questionType: true,
            content: true,
            answer: true,
            solution: true,
            solutionSource: true,
            figureSvg: true,
            figureUrls: true,
            figureDims: true,
            figureSourceMm: true,
            choiceFigureIndex: true,
            figureSource: true,
            externalId: true,
            originProblemId: true,
            sourceMaterialId: true,
            questionNumber: true,
            examId: true,
            sourceFile: true,
            pool: true,
            reviewStatus: true,
            directUseAllowed: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!rows.length) break;
        let chunk = "";
        for (const row of rows) {
          const ok = isProblemEligible(row);
          const line = JSON.stringify({ ...row, eligible: ok }) + "\n";
          digest.update(line);
          chunk += line;
          total++;
          if (ok) eligible++;
          const source = (sources[row.source] ??= { total: 0, eligible: 0 });
          source.total++;
          if (ok) source.eligible++;
        }
        appendFileSync(temp, chunk);
        cursor = rows.at(-1)!.id;
      }
      renameSync(temp, resolve(out, "snapshot.jsonl"));
      return {
        measuredAt,
        completedAt: new Date().toISOString(),
        head,
        readOnly: true,
        isolation: "RepeatableRead",
        total,
        eligible,
        units: units.length,
        familyRegistry: families.length,
        materials: materials.length,
        sources,
        sha256: digest.digest("hex"),
        excludes: ["student records", "account records", "credentials"],
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 600000, maxWait: 60000 },
  );
  save("snapshot-meta.json", meta);
  console.log(JSON.stringify(meta));
}
main().finally(() => prisma.$disconnect());
