/**
 * Read-only census of every mathematics-bank row. Never persists question text.
 * Usage: tsx --env-file=<env> scripts/qa/bank/problem-bank-audit.ts [--out <dir>]
 * Flags are inspection candidates, not independent mathematical correctness proofs.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { circledValueRaw } from "../../../src/lib/math/circledNumber";
import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";
import { hasRealAnswer } from "../../../src/lib/missingAnswer";
import { hasUnlinkedFigureChoices } from "../../../src/lib/problem/choiceFigureIndex";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import { classifyFormatWithChoices } from "../../../src/lib/problem/provenance";
import { isProblemEligible } from "../../../src/lib/problemEligibility";
import { deadBackslashHits } from "../probe-middle-raw-latex";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = resolve(
  outAt < 0
    ? ".qa-artifacts/problem-bank-audit-20261018/math"
    : args[outAt + 1]!,
);
const prisma = new PrismaClient({ log: [] });
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const increment = (map: Record<string, number>, key: string, n = 1) => {
  map[key] = (map[key] ?? 0) + n;
};
const normalizeAnswer = (value: string) =>
  value
    .trim()
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .replace(/[①-⑳❶-❿➀-➉➊-➓⓵-⓾]/g, (ch) => `choice:${circledValueRaw(ch)}`);

type RowRef = {
  id: string;
  code: string;
  source: string;
  unitId: string;
  eligible: boolean;
};
type Flag = RowRef & { rule: string; field?: string; detail?: string };
type DuplicateRef = RowRef & { answerDigest: string };

async function main() {
  // Positive and negative controls prevent a silent all-zero audit.
  if (!hasUnlinkedFigureChoices(0, [], ["[그림]", "[그림]"]))
    throw new Error("figure-link positive control failed");
  if (hasUnlinkedFigureChoices(0, [], ["1", "2"]))
    throw new Error("figure-link negative control failed");
  if (
    deadBackslashHits("$angle C=90^circ$").length === 0 ||
    deadBackslashHits("$2\\times3=6$").length !== 0
  )
    throw new Error("raw-LaTeX controls failed");
  if (
    !renderMathHtml("$\\DefinitelyInvalidCommand{1}$").includes("math-raw") ||
    renderMathHtml("$\\frac{1}{2}$").includes("math-raw")
  )
    throw new Error("render controls failed");

  const report = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const measuredAt = new Date().toISOString();
      const [expected, units] = await Promise.all([
        tx.problem.count(),
        tx.unit.findMany({
          select: {
            id: true,
            grade: true,
            chapter: true,
            section: true,
            orderIndex: true,
            semester: true,
          },
        }),
      ]);
      const unitMap = new Map(units.map((unit) => [unit.id, unit]));
      const counts = {
        scanned: 0,
        visible: 0,
        eligible: 0,
        withUrlFigures: 0,
        withSvg: 0,
        withBothFigureKinds: 0,
      };
      const bySource: Record<
        string,
        { total: number; visible: number; eligible: number }
      > = {};
      const byGrade: Record<
        string,
        { total: number; visible: number; eligible: number }
      > = {};
      const byReview: Record<string, number> = {};
      const byPool: Record<string, number> = {};
      const byQuestionType: Record<string, number> = {};
      const byFormat: Record<string, number> = {};
      const byDifficulty: Record<string, number> = {};
      const unitStock = new Map<
        string,
        {
          held: number;
          eligible: number;
          formats: Record<string, number>;
          difficulties: Record<string, number>;
        }
      >();
      const flags: Flag[] = [];
      const duplicates = new Map<string, DuplicateRef[]>();
      const figureFiles = new Map<
        string,
        { exists: boolean; positiveSize: boolean; manifest: boolean }
      >();
      const manifest = JSON.parse(
        readFileSync(
          resolve("src/config/shared-figures.manifest.json"),
          "utf8",
        ),
      ) as { entries: Record<string, unknown> };
      const renderCache = new Map<string, boolean>();
      const digest = createHash("sha256");
      const fields = ["content", "answer", "solution"] as const;
      const renderedFields: Record<string, number> = {};
      let cursor: string | undefined;
      while (true) {
        const rows = await tx.problem.findMany({
          take: 1000,
          orderBy: { id: "asc" },
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            problemCode: true,
            source: true,
            unitId: true,
            pool: true,
            reviewStatus: true,
            directUseAllowed: true,
            content: true,
            answer: true,
            solution: true,
            solutionSource: true,
            questionType: true,
            problemType: true,
            familyKey: true,
            difficulty: true,
            figureUrls: true,
            figureSvg: true,
            figureDims: true,
            figureSourceMm: true,
            choiceFigureIndex: true,
            originProblemId: true,
            sourceMaterialId: true,
          },
        });
        if (rows.length === 0) break;
        for (const row of rows) {
          const visible = row.pool === "shared";
          const eligible = isProblemEligible(row);
          const ref: RowRef = {
            id: row.id,
            code: row.problemCode,
            source: row.source,
            unitId: row.unitId,
            eligible,
          };
          const flag = (rule: string, detail?: string, field?: string) =>
            flags.push({
              ...ref,
              rule,
              ...(detail ? { detail } : {}),
              ...(field ? { field } : {}),
            });
          counts.scanned++;
          if (visible) counts.visible++;
          if (eligible) counts.eligible++;
          const grade = unitMap.get(row.unitId)?.grade ?? "unknown";
          for (const [map, key] of [
            [bySource, row.source],
            [byGrade, grade],
          ] as const) {
            const group = (map[key] ??= { total: 0, visible: 0, eligible: 0 });
            group.total++;
            if (visible) group.visible++;
            if (eligible) group.eligible++;
          }
          increment(byReview, row.reviewStatus);
          increment(byPool, row.pool);
          increment(byQuestionType, row.questionType ?? "null");
          increment(byDifficulty, row.difficulty);
          digest.update(
            JSON.stringify([
              row.id,
              row.unitId,
              row.pool,
              row.reviewStatus,
              row.directUseAllowed,
              row.content,
              row.answer,
              row.solution,
              row.figureUrls,
              row.figureSvg,
              row.choiceFigureIndex,
            ]) + "\n",
          );
          if (!row.content.trim()) flag("emptyContent");
          if (!hasRealAnswer(row.answer)) flag("missingRealAnswer");
          if (!row.solution?.trim()) flag("missingSolution");
          if (!unitMap.has(row.unitId)) flag("missingUnit");
          if (row.source === "transformed" && !row.originProblemId)
            flag("transformedWithoutOrigin");
          if (row.source === "school_textbook" && !row.sourceMaterialId)
            flag("textbookWithoutMaterial");
          const parsed = parseProblemContent(row.content);
          const format = classifyFormatWithChoices(parsed.choices.length, row);
          increment(
            byFormat,
            `${eligible ? "eligible" : "ineligible"}:${format}`,
          );
          const stock = unitStock.get(row.unitId) ?? {
            held: 0,
            eligible: 0,
            formats: {},
            difficulties: {},
          };
          if (visible) stock.held++;
          if (eligible) {
            stock.eligible++;
            increment(stock.formats, format);
            increment(stock.difficulties, row.difficulty);
          }
          unitStock.set(row.unitId, stock);
          if (format === "unknown") flag("unclassifiedFormat");
          if (parsed.choices.length > 0 && parsed.choices.length !== 5)
            flag("choiceCountNotFive", String(parsed.choices.length));
          if (
            parsed.choices.length > 0 &&
            new Set(parsed.choices.map((choice) => choice.replace(/\s+/g, "")))
              .size < parsed.choices.length
          )
            flag("identicalChoiceTextCandidate");
          const answerMarks = [...row.answer]
            .map(circledValueRaw)
            .filter((n) => n > 0);
          if (answerMarks.length > 0 && parsed.choices.length === 0)
            flag("choiceAnswerWithoutChoicesCandidate");
          if (
            answerMarks.some((n) => n > parsed.choices.length) &&
            parsed.choices.length > 0
          )
            flag(
              "answerMarkOutsideChoicesCandidate",
              `${Math.max(...answerMarks)}/${parsed.choices.length}`,
            );
          if (
            hasUnlinkedFigureChoices(
              row.figureUrls.length,
              row.choiceFigureIndex,
              parsed.choices,
            )
          )
            flag("unlinkedFigureChoices");
          if (row.figureUrls.length > 0) {
            counts.withUrlFigures++;
            if (
              row.figureDims.length !== row.figureUrls.length * 2 ||
              row.figureDims.some((n) => n <= 0)
            )
              flag("unknownOrInvalidFigureDimensions");
            if (
              row.figureSourceMm.length !== row.figureUrls.length ||
              row.figureSourceMm.some((n) => !Number.isFinite(n) || n <= 0)
            )
              flag("unknownOrInvalidFigurePhysicalWidth");
            for (const url of row.figureUrls) {
              if (!url.startsWith("/") || url.startsWith("//")) {
                flag("externalFigureUrlUnverified");
                continue;
              }
              let file = figureFiles.get(url);
              if (!file) {
                let exists = false,
                  positiveSize = false;
                try {
                  const stat = statSync(resolve("public", `.${url}`));
                  exists = stat.isFile();
                  positiveSize = exists && stat.size > 0;
                } catch {
                  /* reported below */
                }
                file = {
                  exists,
                  positiveSize,
                  manifest: Object.hasOwn(manifest.entries, url),
                };
                figureFiles.set(url, file);
              }
              if (!file.positiveSize) flag("localFigureMissingOrEmpty", url);
              if (/^\/figures(?:-svg)?\//.test(url) && !file.manifest)
                flag("figureAbsentFromCdnManifest", url);
            }
          }
          if (row.figureSvg?.trim()) counts.withSvg++;
          if (row.figureSvg?.trim() && row.figureUrls.length)
            counts.withBothFigureKinds++;
          for (const field of fields) {
            const text = row[field];
            if (!text) continue;
            increment(renderedFields, field);
            if (
              /(?:\bNaN\b|\bundefined\b|\[object Object\]|\bTODO\b|\bFIXME\b)/.test(
                text,
              )
            )
              flag("placeholderTokenCandidate", undefined, field);
            if (deadBackslashHits(text).length)
              flag("rawLatexCandidate", undefined, field);
            if (/[\uE000-\uF8FF]/.test(text))
              flag("privateUseGlyphCandidate", undefined, field);
            const cacheKey = sha(text);
            let failed = renderCache.get(cacheKey);
            if (failed === undefined) {
              try {
                const html = renderMathHtml(text);
                failed =
                  html.includes('class="math-raw"') ||
                  html.includes("katex-error") ||
                  /#cc0000/i.test(html);
              } catch {
                failed = true;
              }
              if (renderCache.size >= 20000) renderCache.clear();
              renderCache.set(cacheKey, failed);
            }
            if (failed) flag("mathRenderFallback", undefined, field);
          }
          if (visible) {
            // Exact same stem, choices and visuals within one unit. Answer differences
            // remain candidates: equivalent expressions require mathematical inspection.
            const key = sha(
              JSON.stringify([
                row.unitId,
                row.content,
                row.figureSvg,
                row.figureUrls,
              ]),
            );
            const group = duplicates.get(key) ?? [];
            group.push({
              ...ref,
              answerDigest: sha(normalizeAnswer(row.answer)),
            });
            duplicates.set(key, group);
          }
        }
        cursor = rows.at(-1)!.id;
        if (counts.scanned % 10000 === 0)
          console.log(`Scanned ${counts.scanned}/${expected} rows`);
      }
      if (counts.scanned !== expected)
        throw new Error(`Incomplete scan: ${counts.scanned}/${expected}`);
      const duplicateGroups = [...duplicates.entries()]
        .filter(([, rows]) => rows.length > 1)
        .map(([digest, rows]) => ({
          digest,
          rows,
          distinctAnswers: new Set(rows.map((row) => row.answerDigest)).size,
        }));
      const flagCounts: Record<
        string,
        { total: number; eligible: number; bySource: Record<string, number> }
      > = {};
      for (const flag of flags) {
        const group = (flagCounts[flag.rule] ??= {
          total: 0,
          eligible: 0,
          bySource: {},
        });
        group.total++;
        if (flag.eligible) group.eligible++;
        increment(group.bySource, flag.source);
      }
      return {
        measuredAt,
        completedAt: new Date().toISOString(),
        readOnly: true,
        isolation: "RepeatableRead",
        counts,
        bySource,
        byGrade,
        byReview,
        byPool,
        byQuestionType,
        byFormat,
        byDifficulty,
        renderedFields,
        rowDigest: digest.digest("hex"),
        flagCounts,
        flags,
        figures: {
          uniquePaths: figureFiles.size,
          missingLocal: [...figureFiles]
            .filter(([, f]) => !f.positiveSize)
            .map(([url]) => url),
          notInManifest: [...figureFiles]
            .filter(([, f]) => !f.manifest)
            .map(([url]) => url),
        },
        duplicates: {
          groups: duplicateGroups.length,
          rows: duplicateGroups.reduce((n, group) => n + group.rows.length, 0),
          conflictingAnswerGroups: duplicateGroups.filter(
            (group) => group.distinctAnswers > 1,
          ).length,
          detail: duplicateGroups,
        },
        units: units.map((unit) => ({
          ...unit,
          ...(unitStock.get(unit.id) ?? {
            held: 0,
            eligible: 0,
            formats: {},
            difficulties: {},
          }),
        })),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 1_200_000, maxWait: 60_000 },
  );
  mkdirSync(out, { recursive: true });
  writeFileSync(
    resolve(out, "census.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        output: resolve(out, "census.json"),
        counts: report.counts,
        flags: report.flagCounts,
        duplicates: {
          groups: report.duplicates.groups,
          rows: report.duplicates.rows,
          conflictingAnswerGroups: report.duplicates.conflictingAnswerGroups,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "Audit failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
