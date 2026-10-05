import "server-only";
import { randomUUID } from "node:crypto";
import type { TextbookItem } from "@/contracts/textbookExchange.contract";
import type { QuickCreateComponents } from "@/contracts/textbookQuickCreate.contract";
import type { TextbookSemantic } from "@/contracts/textbookSemantic.contract";
import { classifyFormat } from "@/lib/problem/provenance";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import {
  captureProblemSnapshot,
  type CapturedSnapshot,
  type ProblemSourceRow,
} from "../../snapshotFromProblem";
import { DEFAULT_ITEM_LAYOUT, loadProblemRows } from "../items";
import { activityText } from "../quickCreateRecovery";
import {
  QUICK_CREATE_DIFFICULTIES,
  type ItemPlan,
  type QuickCreateAssembly,
  type QuickCreateLesson,
  type QuickCreateStage,
} from "./context";

/** Every printed question, including an example's confirmation, consumes the shared quota. */
export function enabledProblemStages(
  components: QuickCreateComponents,
): QuickCreateStage[] {
  const options: QuickCreateStage[] = [
    {
      enabled: components.basicCheck,
      activity: "basicCheck",
      stage: "concept-check",
      title: "기본 확인",
    },
    {
      enabled: components.workedExamples,
      activity: "workedExamples",
      stage: "worked-example",
      title: "대표예제와 확인문제",
    },
    {
      enabled: components.practice,
      activity: "practice",
      stage: "type-practice",
      title: "유형 연습",
    },
    {
      enabled: components.reasoning,
      activity: "reasoning",
      stage: "application",
      title: "생각을 설명하기",
    },
    {
      enabled: components.review,
      activity: "review",
      stage: "cumulative-review",
      title: "누적 복습",
    },
    {
      enabled: components.assessment,
      activity: "assessment",
      stage: "unit-assessment",
      title: "단원 평가",
    },
    {
      enabled: components.written,
      activity: "written",
      stage: "written",
      title: "서술형",
    },
  ];
  return options.filter((stage) => stage.enabled);
}

/** New automatic items only. Existing saved layouts, including zero lines, are never updated. */
export function quickCreateItemLayout(
  stage: TextbookItem["learningStage"],
  questionType?: string | null,
): TextbookItem["layout"] {
  const written = stage === "written" || questionType === "서술형";
  const lines = written
    ? 6
    : stage === "application"
      ? 4
      : questionType === "객관식"
        ? 2
        : 3;
  return {
    ...DEFAULT_ITEM_LAYOUT,
    minWorkLines: written ? 4 : lines,
    preferredWorkLines: lines,
    maxWorkLines: written ? 10 : lines,
  };
}

/** Engine family identity is recorded provenance; neither a code nor a null/solo key is proof. */
export function verifiedExamplePairKey(row: ProblemSourceRow): string | null {
  if (
    !row.familyKey ||
    !/^(?:elem:|mid:).+/.test(row.familyKey) ||
    !row.solution?.trim()
  )
    return null;
  return JSON.stringify([
    row.unitId,
    row.familyKey,
    row.problemType,
    row.difficulty,
    classifyFormat(row),
  ]);
}

type Selection = {
  snapshot: CapturedSnapshot;
  pair?: number;
  example?: boolean;
};
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
  if (!stages.length) return;
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
  const byId = await loadProblemRows(
    tx,
    ids.map((row) => row.id),
  );
  const ordered = ids.flatMap(({ id }) => {
    const row = byId.get(id);
    return row && !problemIneligibleReason(row) ? [row] : [];
  });
  const quota = stages.map(
    (_, index) =>
      Math.floor(input.problemCountPerUnit / stages.length) +
      Number(index < input.problemCountPerUnit % stages.length),
  );
  const workedIndex = stages.findIndex(
    (stage) => stage.activity === "workedExamples",
  );
  if (workedIndex >= 0 && quota[workedIndex] === 1) {
    const donor = quota.findIndex(
      (count, index) => index !== workedIndex && count > 1,
    );
    if (donor >= 0) {
      quota[donor]--;
      quota[workedIndex]++;
    }
  }
  const selected: Selection[][] = stages.map(() => []);
  const usedIds = new Set<string>(),
    usedContent = new Set<string>();
  const captures = new Map<string, CapturedSnapshot | null>();
  const capture = async (row: ProblemSourceRow) => {
    if (captures.has(row.id)) return captures.get(row.id)!;
    const result = await captureProblemSnapshot(row, deps.loadFigure);
    if (!result.ok) warnings.push(`${row.problemCode}: ${result.reason}`);
    const value = result.ok ? result.snapshot : null;
    captures.set(row.id, value);
    return value;
  };
  const available = (row: ProblemSourceRow) =>
    !usedIds.has(row.id) && !usedContent.has(row.content.trim());
  const commit = (
    row: ProblemSourceRow,
    snapshot: CapturedSnapshot,
    index: number,
    pair?: number,
    example?: boolean,
  ) => {
    usedIds.add(row.id);
    usedContent.add(row.content.trim());
    selected[index].push({
      snapshot,
      ...(pair === undefined ? {} : { pair, example }),
    });
  };
  const matches = (row: ProblemSourceRow, stage: QuickCreateStage) =>
    stage.activity === "written"
      ? classifyFormat(row) === "descriptive"
      : stage.activity === "reasoning"
        ? classifyFormat(row) === "descriptive" || row.problemType === "활용"
        : true;
  const take = async (index: number, count: number) => {
    for (const row of ordered) {
      if (count <= 0) break;
      if (!available(row) || !matches(row, stages[index])) continue;
      const snapshot = await capture(row);
      if (!snapshot) continue;
      commit(row, snapshot, index);
      count--;
    }
  };
  // Reserve scarce formats and complete pairs before general practice can consume them.
  for (const activity of ["written", "reasoning"] as const) {
    const index = stages.findIndex((stage) => stage.activity === activity);
    if (index >= 0) await take(index, quota[index]);
  }
  if (workedIndex >= 0) {
    const families = new Map<string, ProblemSourceRow[]>();
    for (const row of ordered) {
      const key = verifiedExamplePairKey(row);
      if (key) families.set(key, [...(families.get(key) ?? []), row]);
    }
    let pair = 0;
    for (const family of families.values()) {
      if (selected[workedIndex].length + 2 > quota[workedIndex]) break;
      const viable: Array<{
        row: ProblemSourceRow;
        snapshot: CapturedSnapshot;
      }> = [];
      for (const row of family) {
        if (
          !available(row) ||
          viable.some(
            (entry) => entry.row.content.trim() === row.content.trim(),
          )
        )
          continue;
        const snapshot = await capture(row);
        if (snapshot) viable.push({ row, snapshot });
        if (viable.length === 2) break;
      }
      if (viable.length !== 2) continue;
      commit(viable[0].row, viable[0].snapshot, workedIndex, pair, true);
      commit(viable[1].row, viable[1].snapshot, workedIndex, pair++, false);
    }
  }
  for (const [index, stage] of stages.entries()) {
    if (!["workedExamples", "written", "reasoning"].includes(stage.activity))
      await take(index, quota[index]);
  }
  for (const [index, stage] of stages.entries()) {
    if (selected[index].length < quota[index])
      warnings.push(
        `${unit.section}: ${stage.title} ${quota[index]}문항 중 ${selected[index].length}문항을 넣었습니다.${
          stage.activity === "workedExamples"
            ? " 같은 유형·난이도의 서로 다른 예제와 확인문제가 모두 준비된 짝만 사용합니다."
            : " 부족한 수는 선택한 다른 문제 구성에 배분합니다."
        }`,
      );
  }
  let remaining =
    input.problemCountPerUnit -
    selected.reduce((sum, entries) => sum + entries.length, 0);
  // Only selected components may receive a shortage, without exceeding the maximum.
  while (remaining > 0) {
    const before = remaining;
    for (const [index, stage] of stages.entries()) {
      if (!remaining) break;
      if (stage.activity === "workedExamples") continue;
      const count = selected[index].length;
      await take(index, 1);
      remaining -= selected[index].length - count;
    }
    if (before === remaining) break;
  }
  const actual = input.problemCountPerUnit - remaining;
  if (remaining)
    warnings.push(
      `${unit.section}: 요청한 최대 ${input.problemCountPerUnit}문항 중 출제 가능한 서로 다른 ${actual}문항을 넣었습니다.`,
    );
  const conceptKeys = concepts
    .filter((c) => c.unitId === unit.id)
    .map((c) => c.conceptKey);
  for (const [index, stage] of stages.entries()) {
    if (!selected[index].length) continue;
    section.blocks.push(
      activityText(stage.activity, stage.title, `### ${stage.title}`),
    );
    const plans: ItemPlan[] = selected[index].map((entry, offset) => ({
      id: randomUUID(),
      unitKey,
      sectionId: section.id,
      stage: entry.example === false ? "concept-check" : stage.stage,
      snapshot: entry.snapshot,
      orderIndex:
        items.filter((item) => item.sectionId === section.id).length + offset,
      conceptKeys,
    }));
    for (const [offset, entry] of selected[index].entries()) {
      const item = plans[offset];
      let semantic: TextbookSemantic = {
        activity: stage.activity,
        title: stage.title,
      };
      if (entry.pair !== undefined) {
        const pairIndexes = selected[index].flatMap((candidate, i) =>
          candidate.pair === entry.pair ? [i] : [],
        );
        const example = pairIndexes.find((i) => selected[index][i].example)!;
        const node = {
          kind: "exampleGroup" as const,
          groupId: `example-${plans[example].id}`,
          title: `${unit.section} · ${entry.snapshot.problemType}`,
          // Captured source solution is the verified explanation; no general strategy is invented.
          strategy: plans[example].snapshot.payload.solution!,
          exampleItemId: plans[example].id,
          strategyKind: "captured-solution" as const,
          confirmItemIds: pairIndexes
            .filter((i) => i !== example)
            .map((i) => plans[i].id),
        };
        semantic = { activity: "workedExamples", node };
        if (entry.example)
          section.blocks.push({
            blockId: randomUUID(),
            kind: "text",
            markdown: `### ${node.title}`,
            semantic,
          });
      }
      items.push(item);
      section.blocks.push({
        blockId: randomUUID(),
        kind: "problem",
        itemId: item.id,
        semantic,
      });
      for (const asset of entry.snapshot.assets)
        assets.set(asset.assetId, { asset, kind: "figure" });
    }
  }
}
