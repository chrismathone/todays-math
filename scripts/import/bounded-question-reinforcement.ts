/** New existing-family operator. Old R2/R5 frozen138/no-existing-family protections are unchanged. */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { isProblemEligible } from "../../src/lib/problemEligibility";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";
import { familyKeyVariants } from "../../src/lib/generator/familyAliases";
import {
  parseQuestionExternalId,
  proveQuestionPair,
  type QuestionPairRow,
} from "../../src/lib/problem/questionPairProof";
import { parseNativeExternalId } from "../../src/contracts/nativeDescriptive.contract";
import {
  buildVerifiedCandidates,
  assertBatchIdentity,
  type UnitIdentity,
  type VerifiedCandidate,
} from "./verified-engine-batch";
import type { Plan } from "./load-engine-problems";
import {
  QUESTION_FORMAT_PLAN_SHA,
  assertCoordinatorWrite,
  assertNoReferences,
  digest,
  journal,
  lockedMaintenance,
  payloadDigest,
  readRows,
  referenceCounts,
  stableJson,
  valueDigest,
  verifyApproval,
  type ApprovalFiles,
  type DatabaseRow,
} from "./protected-question-maintenance";

export const BOUNDED_CONTENT_CAP = 96;
export const BOUNDED_ROW_CAP = 174;
export type BoundedTarget = {
  unitId: string;
  familyKey: string;
  grade: string;
  chapter: string;
  section: string;
  engine: "elem" | "middle" | "native-descriptive";
  generatorKey: string;
  auditDistinct: number;
  observedGeneratorDistinct: number;
  nativeChoiceConditions: boolean;
  target: Plan["targets"][number];
};
export type Candidate = VerifiedCandidate & {
  figureSpec: Record<string, unknown> | null;
  contentKey: string;
};
export type CandidateEntry = Omit<
  VerifiedCandidate,
  "content" | "answer" | "solution" | "figureSvg"
> & {
  payloadSha256: string;
  figureSvgSha256: string | null;
  contentKey: string;
};
export const candidateEntries = (
  rows: readonly Candidate[],
): CandidateEntry[] =>
  rows
    .map(
      ({
        content,
        answer,
        solution,
        figureSvg,
        figureSpec,
        contentKey,
        ...row
      }) => {
        void figureSpec;
        return {
          ...row,
          payloadSha256: payloadDigest({
            content,
            answer,
            solution,
            figureSvg,
          }),
          figureSvgSha256: figureSvg ? digest(figureSvg) : null,
          contentKey,
        };
      },
    )
    .sort((a, b) => a.externalId.localeCompare(b.externalId, "en"));
export type GenerationRequest = { plan: Plan; selectedExternalIds: string[] };
export type ContentContract = {
  familyKey: string;
  contentKey: string;
  externalIds: string[];
  rowCount: 1 | 2;
  contract:
    | "proven-short-mc-pair"
    | "native-multiple-choice"
    | "native-descriptive"
    | "source-short-only";
  pairProofKey: string | null;
  sortedSourceChoicesAreConditions: boolean;
};
export type Census = {
  unitId: string;
  familyKey: string;
  physicalRows: number;
  eligibleRows: number;
  projectedQuestions: number;
  provenPairs: number;
  distinctContents: number;
  shortfallToFive: number;
  formats: Record<string, number>;
};
export type BoundedManifest = {
  version: 1;
  kind: "bounded-family-reinforcement";
  planSha256: string;
  baselineStage: "review-before-backfill" | "final-after-backfill";
  sourceCommit: string;
  sourceDigests: Record<string, string>;
  targets: BoundedTarget[];
  requests: GenerationRequest[];
  rows: CandidateEntry[];
  contents: ContentContract[];
  beforeCensus: Census[];
  expectedAfterCensus: Census[];
  shortfalls: { familyKey: string; shortBy: number; reason: string }[];
  privateCandidatesSha256: string;
  independentVerificationSha256: string;
};
export type ScopeLedger = {
  version: 1;
  kind: "bounded-family-before";
  manifestSha256: string;
  unitIds: string[];
  privateBeforeSha256: string;
  rows: { id: string; fullRowSha256: string }[];
};
export type UuidLedger = {
  version: 1;
  kind: "bounded-family-new-uuids";
  manifestSha256: string;
  rows: (CandidateEntry & { id: string; ownership: "new" })[];
};
type AuditFamily = {
  unitId: string;
  familyKey: string;
  grade: string;
  chapter: string;
  section: string;
  distinctStems: number;
  generatedDistinctStems?: number;
  storedDistinctWithConditions?: number;
  observedGeneratedQuestionVariants?: number;
  generatorKey?: string;
  scope?: string;
};

export function boundedTargets(repoDir: string): BoundedTarget[] {
  const elementary = JSON.parse(
    readFileSync(
      path.resolve(
        repoDir,
        "docs/reports/math-type-audit-20261018/elementary-variation.json",
      ),
      "utf8",
    ),
  ).results as AuditFamily[];
  const middle = JSON.parse(
    readFileSync(
      path.resolve(
        repoDir,
        "docs/reports/math-type-audit-20261018/engine-comparison.json",
      ),
      "utf8",
    ),
  ).thinStoredFamilyReview.rechecks as AuditFamily[];
  const selected = [
    ...elementary
      .filter(
        (row) =>
          row.distinctStems < 5 && (row.generatedDistinctStems ?? 0) >= 5,
      )
      .map((row) => ({ ...row, scope: "elem" })),
    ...middle.filter(
      (row) =>
        row.storedDistinctWithConditions! < 5 &&
        row.observedGeneratedQuestionVariants! >= 5,
    ),
  ];
  if (
    selected.length !== 53 ||
    new Set(selected.map((row) => row.unitId + row.familyKey)).size !== 53
  )
    throw new Error("Audit allowlist must be the exact 17+36 families");
  const repairs = JSON.parse(
    readFileSync(
      path.resolve(
        repoDir,
        "docs/planning/tracks/reports/math-question-formats-20261018/repair-preflight.json",
      ),
      "utf8",
    ),
  ).rows as { familyKey: string }[];
  return selected
    .map((row) => {
      if (
        repairs.some((repair) => repair.familyKey === row.familyKey) ||
        familyKeyVariants(row.unitId, row.familyKey).length !== 1
      )
        throw new Error("Repair/whole-family alias intersects bounded target");
      const engine: BoundedTarget["engine"] =
        row.scope === "elem"
          ? "elem"
          : row.scope === "native-descriptive"
            ? "native-descriptive"
            : "middle";
      const generatorKey =
        engine === "elem"
          ? row.familyKey.split("|").at(-1)!
          : row.generatorKey!;
      const target: Plan["targets"][number] =
        engine === "elem"
          ? {
              engine,
              grade: row.grade,
              chapter: row.chapter,
              sections: [row.section],
              formIds: [generatorKey],
              perTier: 5,
            }
          : engine === "middle"
            ? {
                engine,
                grade: row.grade,
                unitSection: row.section,
                typeKeys: [generatorKey],
                variants: 5,
              }
            : { engine, definitionIds: [generatorKey], variants: 5 };
      // These are authored MC source contracts, not derived numerical distractors.
      const nativeChoiceConditions =
        (engine === "middle" &&
          /\|(F02|R01|R02|R03|S01|S03|Q01|Q02)$/.test(row.familyKey)) ||
        (engine === "elem" &&
          row.grade === "초5" &&
          /2-1-[12] /.test(row.section) &&
          generatorKey === "21");
      return {
        unitId: row.unitId,
        familyKey: row.familyKey,
        grade: row.grade,
        chapter: row.chapter,
        section: row.section,
        engine,
        generatorKey,
        auditDistinct: row.storedDistinctWithConditions ?? row.distinctStems,
        observedGeneratorDistinct:
          row.observedGeneratedQuestionVariants ?? row.generatedDistinctStems!,
        nativeChoiceConditions,
        target,
      };
    })
    .sort((a, b) => a.familyKey.localeCompare(b.familyKey, "en"));
}
export function dbPairRow(row: DatabaseRow): QuestionPairRow {
  return {
    id: row.id,
    externalId: row.external_id as string | null,
    questionType: row.question_type as string | null,
    unitId: row.unit_id as string,
    source: row.source as string,
    familyKey: row.family_key as string | null,
    difficulty: row.difficulty as string,
    problemType: row.problem_type as string,
    originProblemId: row.origin_problem_id as string | null,
    sourceMaterialId: row.source_material_id as string | null,
    content: row.content as string,
    answer: row.answer as string,
    solution: row.solution as string | null,
    figureSvg: row.figure_svg as string | null,
    figureUrls: (row.figure_urls as string[]) ?? [],
    figureDims: (row.figure_dims as number[]) ?? [],
    figureSourceMm: (row.figure_source_mm as number[]) ?? [],
    choiceFigureIndex: (row.choice_figure_index as number[]) ?? [],
    figureSource: row.figure_source as string | null,
    questionGroupKey: (row.question_group_key as string | null) ?? null,
  };
}
export function candidatePairRow(
  row: VerifiedCandidate,
  id: string,
): QuestionPairRow {
  return {
    ...row,
    id,
    source: "manual",
    originProblemId: null,
    sourceMaterialId: null,
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
    figureSource: row.figureSvg ? "engine" : null,
    questionGroupKey: null,
  };
}
export function contentKey(
  row: Pick<QuestionPairRow, "content" | "figureSvg" | "figureUrls">,
  sourceChoices: boolean,
): string {
  const parsed = parseProblemContent(row.content);
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  return valueDigest([
    normalize(parsed.question),
    sourceChoices ? parsed.choices.map(normalize).sort() : null,
    row.figureSvg,
    row.figureUrls,
  ]);
}
export function questionGroups(
  rows: readonly QuestionPairRow[],
): QuestionPairRow[][] {
  const tuples = new Map<string, QuestionPairRow[]>();
  for (const row of rows) {
    const parsed = parseQuestionExternalId(row.externalId);
    const key = parsed ? JSON.stringify(parsed.tuple) : `row:${row.id}`;
    tuples.set(key, [...(tuples.get(key) ?? []), row]);
  }
  return [...tuples.values()].flatMap((group) =>
    proveQuestionPair(group).ok ? [group] : group.map((row) => [row]),
  );
}
const eligible = (row: DatabaseRow) =>
  isProblemEligible({
    pool: String(row.pool),
    reviewStatus: String(row.review_status),
    directUseAllowed: row.direct_use_allowed === true,
    answer: String(row.answer),
  });
export function census(
  targets: readonly BoundedTarget[],
  scope: readonly DatabaseRow[],
): Census[] {
  return targets.map((target) => {
    const all = scope.filter(
      (row) =>
        row.unit_id === target.unitId && row.family_key === target.familyKey,
    );
    const rows = all.filter(eligible).map(dbPairRow);
    const groups = questionGroups(rows);
    const distinct = new Set(
      rows.map((row) => contentKey(row, target.nativeChoiceConditions)),
    ).size;
    return {
      unitId: target.unitId,
      familyKey: target.familyKey,
      physicalRows: all.length,
      eligibleRows: rows.length,
      projectedQuestions: groups.length,
      provenPairs: groups.filter((group) => group.length === 2).length,
      distinctContents: distinct,
      shortfallToFive: Math.max(0, 5 - distinct),
      formats: rows.reduce(
        (out, row) => {
          out[row.questionType!] = (out[row.questionType!] ?? 0) + 1;
          return out;
        },
        {} as Record<string, number>,
      ),
    };
  });
}
export function asDbCandidate(row: Candidate, id: string): DatabaseRow {
  return {
    id,
    external_id: row.externalId,
    unit_id: row.unitId,
    family_key: row.familyKey,
    question_type: row.questionType,
    difficulty: row.difficulty,
    problem_type: row.problemType,
    content: row.content,
    answer: row.answer,
    solution: row.solution,
    figure_svg: row.figureSvg,
    figure_urls: [],
    figure_dims: [],
    figure_source_mm: [],
    choice_figure_index: [],
    figure_source: row.figureSvg ? "engine" : null,
    source: "manual",
    pool: "shared",
    review_status: "approved",
    direct_use_allowed: true,
    origin_problem_id: null,
    source_material_id: null,
    question_group_key: null,
  };
}

export function assertNewContentUniqueness(
  rows: readonly Candidate[],
  targets: readonly BoundedTarget[],
  baseline: readonly DatabaseRow[],
): void {
  const contracts = contractsFor(rows, targets);
  for (const contract of contracts) {
    const target = targets.find(
      (target) => target.familyKey === contract.familyKey,
    )!;
    const own = rows.find((row) => row.externalId === contract.externalIds[0])!;
    const key = contentKey(
      candidatePairRow(own, own.externalId),
      target.nativeChoiceConditions,
    );
    if (
      baseline.some(
        (old) =>
          old.unit_id === target.unitId &&
          eligible(old) &&
          contentKey(dbPairRow(old), target.nativeChoiceConditions) === key,
      )
    )
      throw new Error(
        "New content duplicates an existing eligible task in the unit",
      );
    for (const other of contracts) {
      if (other === contract) continue;
      const peer = rows.find((row) => row.externalId === other.externalIds[0])!;
      if (
        peer.unitId === own.unitId &&
        contentKey(
          candidatePairRow(peer, peer.externalId),
          target.nativeChoiceConditions,
        ) === key
      )
        throw new Error("New content duplicates another candidate in the unit");
    }
  }
}
export async function generateRequests(
  requests: readonly GenerationRequest[],
  units: readonly UnitIdentity[],
  targets: readonly BoundedTarget[],
): Promise<Candidate[]> {
  const rows: Candidate[] = [];
  for (const request of requests) {
    if (
      request.plan.targets.length !== 1 ||
      !targets.some(
        (target) =>
          stableJson(target.target) === stableJson(request.plan.targets[0]),
      )
    )
      throw new Error(
        "Generation request is outside exact existing generator contracts",
      );
    const built = await buildVerifiedCandidates(request.plan, units);
    const selected = built.filter((row) =>
      request.selectedExternalIds.includes(row.externalId),
    );
    if (
      selected.length !== request.selectedExternalIds.length ||
      new Set(request.selectedExternalIds).size !== selected.length
    )
      throw new Error("Exact deterministic candidate selector mismatch");
    for (const row of selected) {
      const target = targets.find(
        (target) =>
          target.familyKey === row.familyKey && target.unitId === row.unitId,
      );
      if (!target)
        throw new Error("Candidate outside frozen 53-family allowlist");
      rows.push({
        ...row,
        figureSpec: null,
        contentKey: contentKey(
          candidatePairRow(row, row.externalId),
          target.nativeChoiceConditions,
        ),
      });
    }
  }
  return rows.sort((a, b) => a.externalId.localeCompare(b.externalId, "en"));
}
export function contractsFor(
  rows: readonly Candidate[],
  targets: readonly BoundedTarget[],
): ContentContract[] {
  const byContent = new Map<string, Candidate[]>();
  for (const row of rows) {
    assertBatchIdentity(row);
    const key = row.familyKey + "|" + row.contentKey;
    byContent.set(key, [...(byContent.get(key) ?? []), row]);
  }
  if (
    rows.length > BOUNDED_ROW_CAP ||
    byContent.size > BOUNDED_CONTENT_CAP ||
    new Set(rows.map((row) => row.externalId)).size !== rows.length
  )
    throw new Error(
      "Bounded 96-content/174-row cap or external uniqueness violated",
    );
  return [...byContent.values()].map((group) => {
    const target = targets.find(
      (target) =>
        target.familyKey === group[0]!.familyKey &&
        target.unitId === group[0]!.unitId,
    );
    if (!target || ![1, 2].includes(group.length))
      throw new Error("Invalid content row multiplicity");
    const proof = proveQuestionPair(
      group.map((row) => candidatePairRow(row, row.externalId)),
    );
    let contract: ContentContract["contract"];
    if (group.length === 2) {
      if (
        !proof.ok ||
        target.nativeChoiceConditions ||
        target.engine === "native-descriptive"
      )
        throw new Error("Two rows require strict actual pair proof");
      contract = "proven-short-mc-pair";
    } else if (target.engine === "native-descriptive") {
      if (
        group[0]!.questionType !== "서술형" ||
        !parseNativeExternalId(group[0]!.externalId)
      )
        throw new Error("Native reasoning must stay native");
      contract = "native-descriptive";
    } else if (target.nativeChoiceConditions) {
      if (
        group[0]!.questionType !== "객관식" ||
        parseProblemContent(group[0]!.content).choices.length !== 5
      )
        throw new Error("Original MC choices must be retained");
      contract = "native-multiple-choice";
    } else {
      if (group[0]!.questionType !== "단답형")
        throw new Error("Unproved MC-only derived row forbidden");
      contract = "source-short-only";
    }
    if (
      target.engine === "elem" &&
      ["33", "39"].includes(target.generatorKey) &&
      contract !== "source-short-only"
    )
      throw new Error("f33/f39 prohibit multiple choice");
    return {
      familyKey: target.familyKey,
      contentKey: group[0]!.contentKey,
      externalIds: group.map((row) => row.externalId).sort(),
      rowCount: group.length as 1 | 2,
      contract,
      pairProofKey: proof.ok ? proof.key : null,
      sortedSourceChoicesAreConditions: target.nativeChoiceConditions,
    };
  });
}
export async function prepareBoundedCandidates(
  targets: readonly BoundedTarget[],
  scope: readonly DatabaseRow[],
  units: readonly UnitIdentity[],
) {
  const before = census(targets, scope);
  const requests: GenerationRequest[] = [],
    rows: Candidate[] = [],
    shortfalls: BoundedManifest["shortfalls"] = [];
  const used = new Map<string, Set<string>>();
  // Deduplicate against every currently eligible task in each target unit, not only this family.
  for (const target of targets)
    used.set(
      target.familyKey,
      new Set(
        scope
          .filter((row) => row.unit_id === target.unitId && eligible(row))
          .map((row) =>
            contentKey(dbPairRow(row), target.nativeChoiceConditions),
          ),
      ),
    );
  const globalNew = new Map<string, Set<string>>();
  for (const target of targets) {
    const required = before.find(
      (row) => row.familyKey === target.familyKey,
    )!.shortfallToFive;
    if (!required) continue;
    let needed = required;
    for (let seedOffset = 0; needed > 0 && seedOffset < 8; seedOffset++) {
      const plan: Plan = {
        label: "bounded-existing-family-20261018",
        seedBase: 20261118 + seedOffset * 104729,
        targets: [target.target],
      };
      const built = await buildVerifiedCandidates(plan, units);
      const groups = questionGroups(
        built.map((row) => candidatePairRow(row, row.externalId)),
      );
      const selectedExternalIds: string[] = [];
      for (const group of groups) {
        if (!needed) break;
        const first =
          group.find((row) => row.questionType === "단답형") ?? group[0]!;
        const key = contentKey(first, target.nativeChoiceConditions);
        const seenUnit = globalNew.get(target.unitId) ?? new Set<string>();
        if (used.get(target.familyKey)!.has(key) || seenUnit.has(key)) continue;
        if (
          group.some((row) =>
            scope.some((old) => old.external_id === row.externalId),
          )
        )
          continue;
        const candidates = group.map((row) => ({
          ...built.find((item) => item.externalId === row.externalId)!,
          figureSpec: null,
          contentKey: key,
        }));
        contractsFor(candidates, [target]);
        rows.push(...candidates);
        selectedExternalIds.push(...candidates.map((row) => row.externalId));
        used.get(target.familyKey)!.add(key);
        seenUnit.add(key);
        globalNew.set(target.unitId, seenUnit);
        needed--;
      }
      if (selectedExternalIds.length)
        requests.push({ plan, selectedExternalIds });
    }
    if (needed)
      shortfalls.push({
        familyKey: target.familyKey,
        shortBy: needed,
        reason:
          "No further unique valid tasks in bounded deterministic search; no fabricated format or definition added",
      });
  }
  rows.sort((a, b) => a.externalId.localeCompare(b.externalId, "en"));
  assertNewContentUniqueness(rows, targets, scope);
  const contracts = contractsFor(rows, targets);
  const after = census(targets, [
    ...scope,
    ...rows.map((row) => asDbCandidate(row, `candidate:${row.externalId}`)),
  ]);
  for (const row of after)
    if (
      row.distinctContents < 5 &&
      !shortfalls.some((shortfall) => shortfall.familyKey === row.familyKey)
    )
      throw new Error("Unreported content shortfall");
  return { rows, requests, contracts, before, after, shortfalls };
}
export async function readBoundedScope(
  tx: Prisma.TransactionClient,
  unitIds: readonly string[],
  ids: readonly string[] = [],
  externals: readonly string[] = [],
): Promise<DatabaseRow[]> {
  const found = await tx.$queryRawUnsafe<{ row: DatabaseRow }[]>(
    "SELECT to_jsonb(p) AS row FROM public.problem p WHERE unit_id::text=ANY($1::text[]) OR id::text=ANY($2::text[]) OR external_id=ANY($3::text[]) ORDER BY id",
    [...unitIds],
    [...ids],
    [...externals],
  );
  return found.map((item) => item.row);
}
export function validateFrozenScope(
  before: readonly DatabaseRow[],
  current: readonly DatabaseRow[],
  rows: readonly Candidate[],
  ledger: UuidLedger,
) {
  const baseline = new Map(before.map((row) => [row.id, row]));
  const owned = new Map(ledger.rows.map((row) => [row.id, row]));
  for (const old of before)
    if (
      stableJson(current.find((row) => row.id === old.id)) !== stableJson(old)
    )
      throw new Error(`Frozen existing-unit baseline CAS conflict: ${old.id}`);
  for (const row of current) {
    if (baseline.has(row.id)) continue;
    const uuid = owned.get(row.id),
      candidate = rows.find(
        (candidate) => candidate.externalId === uuid?.externalId,
      );
    if (!uuid || !candidate)
      throw new Error("Unexpected row in frozen unit/external/UUID scope");
    const expected = asDbCandidate(candidate, row.id);
    for (const [key, value] of Object.entries(expected))
      if (
        key !== "question_group_key" &&
        stableJson(row[key]) !== stableJson(value)
      )
        throw new Error(`Owned candidate CAS conflict: ${row.id}/${key}`);
    const contentGroup = rows.filter(
      (candidateRow) =>
        candidateRow.familyKey === candidate.familyKey &&
        candidateRow.contentKey === candidate.contentKey,
    );
    const proof = proveQuestionPair(
      contentGroup.map((candidateRow) =>
        candidatePairRow(
          candidateRow,
          ledger.rows.find(
            (item) => item.externalId === candidateRow.externalId,
          )!.id,
        ),
      ),
    );
    if (
      row.question_group_key !== null &&
      row.question_group_key !== undefined &&
      (!proof.ok || row.question_group_key !== proof.key)
    )
      throw new Error("Owned group key conflict");
  }
}
export const newUuidLedger = (
  manifestSha256: string,
  rows: readonly Candidate[],
): UuidLedger => ({
  version: 1,
  kind: "bounded-family-new-uuids",
  manifestSha256,
  rows: candidateEntries(rows).map((row) => ({
    ...row,
    id: randomUUID(),
    ownership: "new",
  })),
});

/** Prisma binds string parameters as text; PostgreSQL requires the enum cast. */
export const BOUNDED_INSERT_SQL = `INSERT INTO public.problem(id,external_id,unit_id,family_key,question_type,difficulty,problem_type,content,answer,solution,figure_svg,source,pool,origin_problem_id,review_status,direct_use_allowed,solution_source,figure_source,updated_at) VALUES($1::uuid,$2,$3::uuid,$4,$5,$6::public.difficulty,$7,$8,$9,$10,$11,'manual','shared',NULL,'approved',true,'none',$12,CURRENT_TIMESTAMP)`;

export const boundedInsertParameters = (id: string, row: Candidate) => [
  id,
  row.externalId,
  row.unitId,
  row.familyKey,
  row.questionType,
  row.difficulty,
  row.problemType,
  row.content,
  row.answer,
  row.solution,
  row.figureSvg,
  row.figureSvg ? "engine" : null,
];

export async function executeBounded(
  options: {
    files: ApprovalFiles;
    manifest: BoundedManifest;
    before: ScopeLedger;
    uuids: UuidLedger;
    privateBeforeBytes: Buffer;
    privateCandidateBytes: Buffer;
    units: UnitIdentity[];
    mode: "apply" | "revert";
    apply: boolean;
    allowSharedImport?: string;
    writer?: string;
  },
  prisma: PrismaClient,
) {
  assertCoordinatorWrite(
    options.apply,
    options.allowSharedImport,
    options.writer,
  );
  const { files, manifest, before, uuids, mode } = options;
  if (
    manifest.version !== 1 ||
    manifest.kind !== "bounded-family-reinforcement" ||
    manifest.planSha256 !== QUESTION_FORMAT_PLAN_SHA ||
    manifest.baselineStage !== "final-after-backfill" ||
    before.version !== 1 ||
    before.kind !== "bounded-family-before" ||
    stableJson(manifest.targets) !==
      stableJson(boundedTargets(files.repoDir)) ||
    stableJson(before.unitIds) !==
      stableJson(
        [...new Set(manifest.targets.map((target) => target.unitId))].sort(),
      )
  )
    throw new Error(
      "Exact audited 53-family/20-unit manifest contract mismatch",
    );
  const frozen = verifyApproval(
    files,
    "bounded-family-reinforcement",
    manifest,
  );
  if (
    digest(options.privateBeforeBytes) !== before.privateBeforeSha256 ||
    digest(options.privateCandidateBytes) !==
      manifest.privateCandidatesSha256 ||
    before.manifestSha256 !== digest(frozen.manifest) ||
    uuids.manifestSha256 !== digest(frozen.manifest) ||
    stableJson(JSON.parse(frozen.manifest.toString())) !==
      stableJson(manifest) ||
    stableJson(JSON.parse(frozen.before.toString())) !== stableJson(before) ||
    !files.prewrite
  )
    throw new Error("Frozen bounded artifact/private SHA mismatch");
  if (
    stableJson(
      JSON.parse(
        readFileSync(path.resolve(files.repoDir, files.prewrite), "utf8"),
      ),
    ) !== stableJson(uuids) ||
    uuids.kind !== "bounded-family-new-uuids" ||
    uuids.version !== 1 ||
    new Set(uuids.rows.map((row) => row.id)).size !== uuids.rows.length ||
    uuids.rows.some(
      (row) =>
        row.ownership !== "new" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
          row.id,
        ),
    )
  )
    throw new Error("Invalid precommitted exact UUID ledger");
  const baseline = JSON.parse(
    options.privateBeforeBytes.toString(),
  ) as DatabaseRow[];
  if (baseline.some((row) => !("question_group_key" in row)))
    throw new Error(
      "Final baseline must be read after the question identity DDL",
    );
  const rows = await generateRequests(
    manifest.requests,
    options.units,
    manifest.targets,
  );
  assertNewContentUniqueness(rows, manifest.targets, baseline);
  if (
    uuids.rows.some((owned) =>
      baseline.some(
        (old) => old.id === owned.id || old.external_id === owned.externalId,
      ),
    )
  )
    throw new Error("New UUID ledger may not own an existing row");
  const beforeCensus = census(manifest.targets, baseline);
  if (stableJson(beforeCensus) !== stableJson(manifest.beforeCensus))
    throw new Error("Frozen baseline census mismatch");
  for (const target of manifest.targets)
    if (
      new Set(
        rows
          .filter((row) => row.familyKey === target.familyKey)
          .map((row) => row.contentKey),
      ).size >
      beforeCensus.find((row) => row.familyKey === target.familyKey)!
        .shortfallToFive
    )
      throw new Error("Candidate family exceeds its actual deficit");
  const { verifyCandidateTasks } =
    await import("../qa/bank/verify-question-reinforcement");
  if (
    digest(
      JSON.stringify(
        await verifyCandidateTasks(rows, manifest.targets),
        null,
        2,
      ) + "\n",
    ) !== manifest.independentVerificationSha256
  )
    throw new Error(
      "Independent actual-task verification differs from manifest",
    );
  if (
    stableJson(rows) !==
      stableJson(JSON.parse(options.privateCandidateBytes.toString())) ||
    stableJson(candidateEntries(rows)) !== stableJson(manifest.rows) ||
    stableJson(candidateEntries(rows)) !==
      stableJson(
        uuids.rows.map(({ id, ownership, ...row }) => {
          void id;
          void ownership;
          return row;
        }),
      ) ||
    stableJson(contractsFor(rows, manifest.targets)) !==
      stableJson(manifest.contents) ||
    stableJson(before.rows) !==
      stableJson(
        baseline.map((row) => ({
          id: row.id,
          fullRowSha256: valueDigest(row),
        })),
      )
  )
    throw new Error("Bounded regeneration/baseline/UUID/contract mismatch");
  verifyApproval(files, "bounded-family-reinforcement", manifest);
  journal(files, {
    kind: "started",
    mode,
    manifestSha256: digest(frozen.manifest),
  });
  try {
    const result = await lockedMaintenance(prisma, async (tx, refs) => {
      const ids = uuids.rows.map((row) => row.id),
        externals = rows.map((row) => row.externalId);
      const current = await readBoundedScope(
        tx,
        before.unitIds,
        ids,
        externals,
      );
      validateFrozenScope(baseline, current, rows, uuids);
      const changed: string[] = [],
        matched: string[] = [];
      if (mode === "apply") {
        for (const owned of uuids.rows) {
          if (current.some((row) => row.id === owned.id)) {
            matched.push(owned.id);
            continue;
          }
          const row = rows.find((row) => row.externalId === owned.externalId)!;
          await tx.$executeRawUnsafe(
            BOUNDED_INSERT_SQL,
            ...boundedInsertParameters(owned.id, row),
          );
          changed.push(owned.id);
        }
        // Set a key only after proving the actual persisted pair, never from family/seed alone.
        const inserted = await readRows(tx, ids);
        for (const group of questionGroups(inserted.map(dbPairRow))) {
          const proof = proveQuestionPair(group);
          if (!proof.ok) {
            if (group.length !== 1)
              throw new Error("Persisted pair proof failed");
            continue;
          }
          if (
            group.some(
              (row) =>
                row.questionGroupKey !== null &&
                row.questionGroupKey !== proof.key,
            )
          )
            throw new Error("Persisted group conflict");
          await tx.$executeRawUnsafe(
            "UPDATE public.problem SET question_group_key=$2 WHERE id::text=ANY($1::text[]) AND question_group_key IS NULL",
            proof.ids,
            proof.key,
          );
        }
        const back = await readBoundedScope(tx, before.unitIds, ids, externals);
        validateFrozenScope(baseline, back, rows, uuids);
        if (!ids.every((id) => back.some((row) => row.id === id)))
          throw new Error("Incomplete bounded readback");
        for (const group of questionGroups(
          back.filter((row) => ids.includes(row.id)).map(dbPairRow),
        )) {
          const proof = proveQuestionPair(group);
          if (
            proof.ok &&
            group.some((row) => row.questionGroupKey !== proof.key)
          )
            throw new Error("Persisted proven pair key readback mismatch");
          if (!proof.ok && group.some((row) => row.questionGroupKey !== null))
            throw new Error("Unproved single row must remain independent");
        }
        const after = census(manifest.targets, back);
        if (stableJson(after) !== stableJson(manifest.expectedAfterCensus))
          throw new Error("Final unique content/format census mismatch");
        return {
          inserted: changed,
          matched,
          census: after,
          readback: back
            .filter((row) => ids.includes(row.id))
            .map((row) => ({
              id: row.id,
              problemCode: row.problem_code,
              fullRowSha256: valueDigest(row),
            })),
          referenceColumns: refs,
        };
      }
      const ownedRows = current.filter((row) => ids.includes(row.id));
      assertNoReferences(
        await referenceCounts(
          tx,
          refs,
          ownedRows.map((row) => row.id),
        ),
      );
      for (const row of ownedRows) {
        const deleted = await tx.$executeRawUnsafe(
          "DELETE FROM public.problem p WHERE id::text=$1 AND to_jsonb(p)=$2::jsonb",
          row.id,
          JSON.stringify(row),
        );
        if (deleted !== 1) throw new Error("Owned bounded revert CAS conflict");
        changed.push(row.id);
      }
      const back = await readBoundedScope(tx, before.unitIds, ids, externals);
      if (stableJson(back) !== stableJson(baseline))
        throw new Error(
          "Bounded revert did not restore exact existing-unit baseline",
        );
      return {
        deleted: changed,
        alreadyAbsent: ids.filter((id) => !changed.includes(id)),
        referenceColumns: refs,
      };
    });
    journal(files, { kind: "committed", mode, result });
    return result;
  } catch (error) {
    journal(files, {
      kind: "failed",
      mode,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
