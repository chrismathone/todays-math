import "server-only";
import { randomUUID } from "node:crypto";
import type { TextbookItem } from "@/contracts/textbookExchange.contract";
import type { QuickCreateComponents } from "@/contracts/textbookQuickCreate.contract";
import { classifyFormat } from "@/lib/problem/provenance";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import {
  captureProblemSnapshot,
  type CapturedSnapshot,
} from "../../snapshotFromProblem";
import { DEFAULT_ITEM_LAYOUT, loadProblemRows } from "../items";
import {
  QUICK_CREATE_DIFFICULTIES,
  text,
  type ItemPlan,
  type QuickCreateAssembly,
  type QuickCreateLesson,
  type QuickCreateStage,
} from "./context";

/** Enabled problem components in print order; the per-section quota is shared between them. */
export function enabledProblemStages(
  components: QuickCreateComponents,
): QuickCreateStage[] {
  const stageOptions: Array<{
    enabled: boolean;
    stage: TextbookItem["learningStage"];
    title: string;
  }> = [
    {
      enabled: components.workedExamples,
      stage: "worked-example",
      title: "대표예제로 익히기",
    },
    { enabled: components.practice, stage: "basic", title: "유형 연습" },
    {
      enabled: components.review,
      stage: "cumulative-review",
      title: "누적 복습",
    },
    {
      enabled: components.assessment,
      stage: "unit-assessment",
      title: "단원 평가",
    },
    { enabled: components.written, stage: "written", title: "서술형" },
  ];
  return stageOptions.filter((stage) => stage.enabled);
}

export const quickCreateItemLayout = (
  stage: TextbookItem["learningStage"],
): TextbookItem["layout"] =>
  stage === "written"
    ? {
        ...DEFAULT_ITEM_LAYOUT,
        minWorkLines: 4,
        preferredWorkLines: 6,
        maxWorkLines: 10,
      }
    : DEFAULT_ITEM_LAYOUT;

export async function appendProblemStages(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): Promise<void> {
  const {
    tx,
    input,
    deps,
    stages,
    warnings,
    items,
    concepts,
    assets,
    unitKey,
  } = ctx;
  const { unit, section } = lesson;
  if (stages.length) {
    const ids = await tx.query<{ id: string }>(
      `SELECT "id" FROM "problem" WHERE "unit_id" = $1::uuid AND "difficulty"::text IN
             (SELECT value FROM jsonb_array_elements_text($2::jsonb)) AND "pool"::text = $3::text
             AND "review_status"::text = 'approved' AND "direct_use_allowed" = true AND "answer" <> $4::text
             ORDER BY "problem_code", "id"`,
      [
        unit.id,
        JSON.stringify(QUICK_CREATE_DIFFICULTIES[input.difficulty]),
        DEFAULT_PROBLEM_POOL,
        MISSING_ANSWER,
      ],
    );
    const rows = [
      ...(
        await loadProblemRows(
          tx,
          ids.map((row) => row.id),
        )
      ).values(),
    ];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids
      .map((row) => byId.get(row.id)!)
      .filter((row) => row && !problemIneligibleReason(row));
    const captured: Array<{
      snapshot: CapturedSnapshot;
      written: boolean;
    }> = [];
    // Reserve written candidates first; otherwise earlier components can consume them.
    const wantedWritten = stages.findIndex(
      (stage) => stage.stage === "written",
    );
    const quota = (index: number) =>
      Math.floor(input.problemCountPerUnit / stages.length) +
      (index < input.problemCountPerUnit % stages.length ? 1 : 0);
    const writtenQuota = wantedWritten < 0 ? 0 : quota(wantedWritten);
    const candidates = writtenQuota
      ? [...ordered].sort(
          (a, b) =>
            Number(classifyFormat(b) === "descriptive") -
            Number(classifyFormat(a) === "descriptive"),
        )
      : ordered;
    for (const row of candidates) {
      const written = classifyFormat(row) === "descriptive";
      if (captured.length >= input.problemCountPerUnit) break;
      if (wantedWritten >= 0 && stages.length === 1 && !written) continue;
      const outcome = await captureProblemSnapshot(row, deps.loadFigure);
      if (!outcome.ok) {
        warnings.push(`${row.problemCode}: ${outcome.reason}`);
        continue;
      }
      captured.push({ snapshot: outcome.snapshot, written });
    }
    const actualCount = Math.min(input.problemCountPerUnit, captured.length);
    if (actualCount < input.problemCountPerUnit)
      warnings.push(
        `${unit.section}: 요청한 ${input.problemCountPerUnit}문항 중 선택한 난이도에서 출제 가능한 ${actualCount}문항을 넣었습니다.`,
      );
    const actualWrittenQuota = Math.min(
      writtenQuota,
      captured.filter((entry) => entry.written).length,
    );
    if (actualWrittenQuota < writtenQuota && stages.length > 1)
      warnings.push(
        `${unit.section}: 서술형 ${writtenQuota}문항 중 ${actualWrittenQuota}문항을 넣고, 부족한 수는 선택한 다른 문제 구성에 배분했습니다.`,
      );
    const writtenEntries = captured
      .filter((entry) => entry.written)
      .slice(0, actualWrittenQuota);
    const reserved = new Set(
      writtenEntries.map((entry) => entry.snapshot.source.problemId),
    );
    const otherEntries = captured.filter(
      (entry) => !reserved.has(entry.snapshot.source.problemId),
    );
    const otherStages = stages.filter((stage) => stage.stage !== "written");
    for (const stage of stages) {
      const otherIndex = otherStages.indexOf(stage);
      const otherCount = actualCount - actualWrittenQuota;
      const adjustedQuota = otherStages.length
        ? Math.floor(otherCount / otherStages.length) +
          (otherIndex < otherCount % otherStages.length ? 1 : 0)
        : 0;
      const selected =
        stage.stage === "written"
          ? writtenEntries
          : otherEntries.splice(0, adjustedQuota);
      if (!selected.length) continue;
      section.blocks.push(text(`### ${stage.title}`));
      for (const entry of selected) {
        const item: ItemPlan = {
          id: randomUUID(),
          unitKey,
          sectionId: section.id,
          stage: stage.stage,
          snapshot: entry.snapshot,
          orderIndex: items.filter((i) => i.sectionId === section.id).length,
          conceptKeys: concepts
            .filter((c) => c.unitId === unit.id)
            .map((c) => c.conceptKey),
        };
        items.push(item);
        section.blocks.push({
          blockId: randomUUID(),
          kind: "problem",
          itemId: item.id,
        });
        for (const asset of entry.snapshot.assets)
          assets.set(asset.assetId, { asset, kind: "figure" });
      }
    }
  }
}
