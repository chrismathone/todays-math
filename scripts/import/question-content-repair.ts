/** Exact 17-row repair; default preparation is read-only. Shared writes belong to root. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  elementaryUnits,
  generateElementaryForm,
} from "../../src/lib/elementary/generate";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import {
  assertCoordinatorWrite,
  assertNoReferences,
  digest,
  journal,
  lockedMaintenance,
  patchedRow,
  payloadDigest,
  payloadOf,
  readRows,
  referenceCounts,
  stableJson,
  valueDigest,
  updatePayloadCas,
  verifyApproval,
  type ApprovalFiles,
  type DatabaseRow,
  type Payload,
} from "./protected-question-maintenance";

export const REPAIR_PREFLIGHT =
  "docs/planning/tracks/reports/math-question-formats-20261018/repair-preflight.json";
export const REPAIR_SOURCE_FILES = [
  "src/lib/elementary/g4.ts",
  "src/lib/elementary/forms.ts",
  "src/lib/elementary/rng.ts",
  "scripts/figure/elementary.py",
  "scripts/figure/render_spec.py",
  "src/lib/figure/renderFigureSpec.ts",
  "src/lib/figure/mathjaxSubstitute.ts",
  "scripts/import/protected-question-maintenance.ts",
  "scripts/import/question-content-repair.ts",
  "scripts/qa/bank/verify-question-repairs.py",
  "scripts/qa/bank/math-question-repair.ts",
];
export type Repair = {
  id: string;
  externalId: string;
  problemCode: string;
  familyKey: string;
  questionType: string;
  repair: string;
  seed: number;
  beforePayloadSha256: string;
  afterPayloadSha256: string;
  payload: Payload;
  figureSpec: Record<string, unknown> | null;
};
export type RepairEntry = Omit<Repair, "payload" | "figureSpec"> & {
  figureSpecSha256: string;
};
export const repairEntries = (rows: readonly Repair[]): RepairEntry[] =>
  rows.map(({ payload, figureSpec, ...row }) => ({
    ...row,
    afterPayloadSha256: payloadDigest(payload),
    figureSpecSha256: valueDigest(figureSpec),
  }));
export type RepairManifest = {
  version: 1;
  kind: "17-row-content-repair";
  planSha256: string;
  sourceCommit: string;
  sourceDigests: Record<string, string>;
  rows: RepairEntry[];
  independentProofSha256: string;
  privateCandidatesSha256: string;
};
export type RepairBeforeLedger = {
  version: 1;
  kind: "17-row-repair-before";
  manifestSha256: string;
  privateBeforeSha256: string;
  rows: { id: string; fullRowSha256: string; payloadSha256: string }[];
};
const handlers: Record<string, string> = {
  "elem:초4|2-2-1 삼각형을 변의 길이에 따라 분류하기|09": "tri221PickIso",
  "elem:초4|2-2-2 이등변삼각형의 성질|09": "tri222Pick",
  "elem:초4|2-4-2 평행과 평행선|09": "quad242PerpCount",
  "elem:초4|2-4-4 사다리꼴|05": "quad244Pick",
  "elem:초4|2-6-3 대각선|10": "poly263Name",
};
export function assertPostDdlRepairSnapshot(
  rows: readonly DatabaseRow[],
): void {
  for (const row of rows)
    if (
      !Object.hasOwn(row, "question_group_key") ||
      row.question_group_key !== null
    )
      throw new Error(
        `Fresh post-DDL repair snapshot requires NULL question_group_key: ${row.id}`,
      );
}
export async function buildRepairs(
  before: readonly DatabaseRow[],
  repoDir: string,
): Promise<Repair[]> {
  assertPostDdlRepairSnapshot(before);
  const baseline = JSON.parse(
    readFileSync(path.resolve(repoDir, REPAIR_PREFLIGHT), "utf8"),
  ) as {
    rows: {
      id: string;
      familyKey: string;
      externalId: string;
      problemCode: string;
      payloadSha256: string;
    }[];
  };
  if (
    baseline.rows.length !== 17 ||
    before.length !== 17 ||
    new Set(before.map((row) => row.id)).size !== 17
  )
    throw new Error("Exact 17-row baseline required");
  const repairs: Repair[] = [];
  for (const expected of baseline.rows) {
    const old = before.find((row) => row.id === expected.id);
    if (
      !old ||
      old.external_id !== expected.externalId ||
      old.family_key !== expected.familyKey ||
      old.problem_code !== expected.problemCode ||
      payloadDigest(payloadOf(old)) !== expected.payloadSha256
    )
      throw new Error(
        `Repair preflight identity/payload drift: ${expected.id}`,
      );
    const parsed =
      /^engine-elem:([^|]+)\|([^|]+)\|([^|]+)\|f([^|]+)\|(단답형|객관식)\|s(-?\d+)$/.exec(
        expected.externalId,
      );
    if (!parsed || !handlers[expected.familyKey])
      throw new Error("Unsupported repair identity");
    const [, grade, chapter, section, formId, format, rawSeed] = parsed;
    const seed = Number(rawSeed);
    const unit = elementaryUnits().find(
      (item) =>
        item.grade === grade &&
        item.chapter === chapter &&
        item.section === section,
    );
    if (!unit) throw new Error("Repair source unit missing");
    const generated = generateElementaryForm(unit, seed, formId!);
    const repair = handlers[expected.familyKey]!;
    const original = payloadOf(old);
    if (generated.figureSpec?.kind === "namedShapes") {
      const labels = (generated.figureSpec.items as { label: string }[]).map(
        (item) => item.label,
      );
      const oldLabels = [
        ...(original.figureSvg ?? "").matchAll(/<text\b[^>]*>([^<]*)<\/text>/g),
      ].map((match) => match[1]);
      if (stableJson(oldLabels) !== stableJson(labels))
        throw new Error(`Original seed/SVG labels changed: ${old.id}`);
    }
    // Reuse original MC options and correct position. Only diagram changes in that family.
    if (repair !== "poly263Name") {
      const stem = original.content.split(/\n① /)[0]!.trimEnd();
      const expectedOldStem =
        repair === "quad242PerpCount"
          ? `평행한 두 직선 사이에 수선을 ${generated.answer}개 그었습니다. 수선은 몇 개인가?`
          : generated.content;
      if (stem !== expectedOldStem || original.solution !== generated.solution)
        throw new Error(
          `Source/text/solution correspondence failed: ${old.id}`,
        );
      if (format === "단답형" && original.answer !== generated.answer)
        throw new Error(`Seed answer changed: ${old.id}`);
      if (format === "객관식") {
        const options = [
          ...original.content.matchAll(/(?:^|\n)[①②③④⑤] ([^\n]*)/g),
        ].map((match) => match[1]!.trim());
        const index = "①②③④⑤".indexOf(original.answer);
        if (
          options.length !== 5 ||
          index < 0 ||
          options[index] !== generated.answer.trim()
        )
          throw new Error(`Original MC answer position mismatch: ${old.id}`);
      }
    } else if (
      original.content !==
        generated.content.replace(
          "모든 변의 길이가 같고 모든 각의 크기가 같은,",
          "모든 변의 길이가 같고",
        ) ||
      original.solution !==
        generated.solution.replace(
          "모든 변의 길이가 같고 모든 각의 크기가 같은",
          "모든 변의 길이가 같은",
        ) ||
      original.answer !== generated.answer
    )
      throw new Error(
        `Regular-polygon baseline correspondence failed: ${old.id}`,
      );
    let figureSvg: string | null = null;
    if (generated.figureSpec) {
      const drawn = await renderFigureSpec(generated.figureSpec, {
        strict: true,
      });
      if (!drawn.ok || drawn.droppedDimensions?.length)
        throw new Error(`Repair render failed: ${old.id}`);
      figureSvg = drawn.svg;
    }
    const payload =
      repair === "poly263Name"
        ? {
            content: generated.content,
            answer: original.answer,
            solution: generated.solution,
            figureSvg,
          }
        : {
            ...original,
            content:
              repair === "quad242PerpCount"
                ? generated.content +
                  original.content.slice(
                    original.content.split(/\n① /)[0]!.trimEnd().length,
                  )
                : original.content,
            figureSvg,
          };
    if (payloadDigest(payload) === expected.payloadSha256)
      throw new Error("Repair must change the defective payload");
    repairs.push({
      id: old.id,
      externalId: expected.externalId,
      problemCode: expected.problemCode,
      familyKey: expected.familyKey,
      questionType: format!,
      repair,
      seed,
      beforePayloadSha256: expected.payloadSha256,
      afterPayloadSha256: payloadDigest(payload),
      payload,
      figureSpec: generated.figureSpec,
    });
  }
  return repairs.sort((a, b) => a.id.localeCompare(b.id, "en"));
}
export function independentlyVerifyRepairs(
  rows: readonly Repair[],
  repoDir: string,
): object {
  return JSON.parse(
    execFileSync(
      process.env.PYTHON_BIN ?? "python3",
      ["scripts/qa/bank/verify-question-repairs.py"],
      {
        cwd: repoDir,
        input: JSON.stringify(rows),
        encoding: "utf8",
        maxBuffer: 2_000_000,
      },
    ),
  );
}
export function checkRepairManifest(
  manifest: RepairManifest,
  ledger: RepairBeforeLedger,
  privateBefore: readonly DatabaseRow[],
  repairs: readonly Repair[],
): void {
  if (
    manifest.version !== 1 ||
    manifest.kind !== "17-row-content-repair" ||
    ledger.version !== 1 ||
    ledger.kind !== "17-row-repair-before" ||
    manifest.rows.length !== 17 ||
    ledger.rows.length !== 17 ||
    new Set(manifest.rows.map((row) => row.id)).size !== 17
  )
    throw new Error("Invalid exact repair manifest/before ledger");
  if (
    privateBefore.length !== 17 ||
    repairs.length !== 17 ||
    stableJson(repairEntries(repairs)) !== stableJson(manifest.rows)
  )
    throw new Error("Private repair payload/manifest mismatch");
  for (const row of repairs) {
    const frozen = ledger.rows.find((before) => before.id === row.id);
    const old = privateBefore.find((before) => before.id === row.id);
    if (
      !old ||
      !frozen ||
      valueDigest(old) !== frozen.fullRowSha256 ||
      frozen.payloadSha256 !== row.beforePayloadSha256 ||
      payloadDigest(payloadOf(old)) !== row.beforePayloadSha256 ||
      payloadDigest(row.payload) !== row.afterPayloadSha256 ||
      old.external_id !== row.externalId ||
      old.family_key !== row.familyKey ||
      old.problem_code !== row.problemCode ||
      old.answer !== row.payload.answer
    )
      throw new Error(`Repair ledger mismatch: ${row.id}`);
  }
}
export function planRepairChanges(
  repairs: readonly Repair[],
  before: readonly DatabaseRow[],
  current: readonly DatabaseRow[],
  mode: "apply" | "revert",
) {
  if (
    current.length !== repairs.length ||
    before.length !== repairs.length ||
    new Set(current.map((row) => row.id)).size !== repairs.length
  )
    throw new Error("Repair target missing/duplicate");
  const work: { current: DatabaseRow; payload: Payload }[] = [];
  const matched: string[] = [];
  for (const repair of repairs) {
    const original = before.find((row) => row.id === repair.id)!;
    const changed = patchedRow(original, repair.payload);
    const row = current.find((item) => item.id === repair.id)!;
    const expected = mode === "apply" ? original : changed;
    const destination =
      mode === "apply" ? changed : patchedRow(changed, payloadOf(original));
    if (stableJson(row) === stableJson(destination)) {
      matched.push(row.id);
      continue;
    }
    if (stableJson(row) !== stableJson(expected))
      throw new Error(`Full-row ${mode} CAS conflict: ${row.id}`);
    work.push({
      current: row,
      payload: mode === "apply" ? repair.payload : payloadOf(original),
    });
  }
  return { work, matched };
}
export async function executeRepairs(
  options: {
    files: ApprovalFiles;
    manifest: RepairManifest;
    before: RepairBeforeLedger;
    privateBeforeBytes: Buffer;
    privateCandidateBytes: Buffer;
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
  const { manifest, before, files, mode } = options;
  if (
    digest(options.privateBeforeBytes) !== before.privateBeforeSha256 ||
    digest(options.privateCandidateBytes) !== manifest.privateCandidatesSha256
  )
    throw new Error("Private repair files differ from committed SHA bindings");
  const privateBefore = JSON.parse(
    options.privateBeforeBytes.toString(),
  ) as DatabaseRow[];
  const repairs = JSON.parse(
    options.privateCandidateBytes.toString(),
  ) as Repair[];
  checkRepairManifest(manifest, before, privateBefore, repairs);
  const frozen = verifyApproval(files, "17-row-content-repair", manifest);
  if (
    stableJson(JSON.parse(frozen.manifest.toString())) !==
      stableJson(manifest) ||
    stableJson(JSON.parse(frozen.before.toString())) !== stableJson(before) ||
    before.manifestSha256 !== digest(frozen.manifest)
  )
    throw new Error("Repair arguments differ from frozen artifacts");
  const regenerated = await buildRepairs(privateBefore, files.repoDir);
  if (
    stableJson(regenerated) !== stableJson(repairs) ||
    digest(
      JSON.stringify(independentlyVerifyRepairs(regenerated, files.repoDir)),
    ) !== manifest.independentProofSha256
  )
    throw new Error("Repair regeneration/coordinate proof mismatch");
  verifyApproval(files, "17-row-content-repair", manifest);
  journal(files, {
    kind: "started",
    mode,
    manifestSha256: digest(frozen.manifest),
  });
  try {
    const result = await lockedMaintenance(prisma, async (tx, refs) => {
      const ids = repairs.map((row) => row.id);
      const current = await readRows(tx, ids);
      if (current.length !== 17) throw new Error("Repair target missing");
      const references = await referenceCounts(tx, refs, ids);
      assertNoReferences(references); // Even an already-applied row with new history must stop.
      const { work, matched } = planRepairChanges(
        repairs,
        privateBefore,
        current,
        mode,
      );
      for (const item of work)
        await updatePayloadCas(tx, item.current, item.payload);
      const readback = await readRows(tx, ids);
      for (const repair of repairs) {
        const original = privateBefore.find((row) => row.id === repair.id)!;
        const expected = patchedRow(
          original,
          mode === "apply" ? repair.payload : payloadOf(original),
        );
        if (
          stableJson(readback.find((row) => row.id === repair.id)) !==
          stableJson(expected)
        )
          throw new Error(`Final repair readback mismatch: ${repair.id}`);
      }
      assertNoReferences(await referenceCounts(tx, refs, ids));
      return {
        changed: work.map((row) => row.current.id),
        matched,
        referenceColumns: refs,
        references,
        payloadReadback: readback.map((row) => ({
          id: row.id,
          sha256: payloadDigest(payloadOf(row)),
        })),
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
