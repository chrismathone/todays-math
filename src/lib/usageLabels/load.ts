import "server-only";

import { ARITHMETIC_SHEET_KIND } from "@/contracts/arithmetic.contract";
import {
  USAGE_LABEL_MAX_COPY_ROWS,
  USAGE_LABEL_MAX_DOCUMENTS,
  USAGE_LABEL_MAX_TEST_LINKS,
  USAGE_LABEL_MAX_TESTS,
  usageLabelsRequestSchema,
  usageLabelsResponseSchema,
  type UsageArithmeticTypeRequest,
  type UsageLabelPeriod,
  type UsageLabelsResponse,
} from "@/contracts/usageLabels.contract";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import { db } from "@/lib/db";
import type { ScopeViewer } from "@/lib/ownerScope";
import {
  problemIneligibleCode,
  type ProblemIneligibleCode,
} from "@/lib/problemEligibility";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import {
  assembleUsageLabels,
  usagePeriodWindow,
  type UsageArithmeticSide,
  type UsageArithmeticUse,
  type UsageProblemRecord,
  type UsageProblemSide,
} from "@/lib/usageLabels/assemble";
import { arithmeticUsageTypeKey } from "@/lib/usageLabels/typeKey";

export class UsageLabelsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageLabelsInputError";
  }
}

const PROBLEM_CHUNK = 500;

/**
 * 요청한 문항·연산 유형의 순위를 읽는다.
 * 쓰기는 없다. 상한을 넘기면 그 쪽은 unavailable 이고 순위를 만들지 않는다.
 */
export async function loadUsageLabels(
  viewer: ScopeViewer,
  body: unknown,
  now = new Date(),
): Promise<UsageLabelsResponse> {
  const parsed = usageLabelsRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new UsageLabelsInputError("순위 요청이 올바르지 않습니다.");
  }
  const period = parsed.data.period ?? "30d";
  const problemIds = parsed.data.problemIds ?? [];
  const arithmeticTypes = parsed.data.arithmeticTypes ?? [];
  const [problems, arithmetic] = await Promise.all([
    problemIds.length
      ? loadProblemSide(viewer, problemIds, period, now)
      : Promise.resolve(null),
    arithmeticTypes.length
      ? loadArithmeticSide(viewer, period, now)
      : Promise.resolve(null),
  ]);
  const response = assembleUsageLabels({
    viewer,
    period,
    now,
    problemIds,
    arithmeticTypes,
    problems,
    arithmetic,
  });
  const checked = usageLabelsResponseSchema.safeParse(response);
  if (!checked.success) {
    throw new Error("순위 응답이 계약과 같지 않습니다.");
  }
  return checked.data;
}

async function loadProblemSide(
  viewer: ScopeViewer,
  requested: readonly string[],
  period: UsageLabelPeriod,
  now: Date,
): Promise<UsageProblemSide> {
  try {
    // «내 출제»는 이 계정이 만든 시험만 센다.
    // 반·지점으로 읽을 수 있는 다른 교사의 시험은 넣지 않는다.
    const window = usagePeriodWindow(period, now);
    const tests = await db.test.findMany({
      where: {
        userId: viewer.id,
        status: { in: ["confirmed", "printed"] },
        createdAt: window.from
          ? { gte: window.from, lte: window.to }
          : { lte: window.to },
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: USAGE_LABEL_MAX_TESTS + 1,
    });
    if (tests.length > USAGE_LABEL_MAX_TESTS) return incompleteProblems();
    const testIds = tests.map((test) => test.id);
    const links = testIds.length
      ? await db.testProblem.findMany({
          where: { testId: { in: testIds } },
          select: { testId: true, problemId: true },
          orderBy: { id: "asc" },
          take: USAGE_LABEL_MAX_TEST_LINKS + 1,
        })
      : [];
    if (links.length > USAGE_LABEL_MAX_TEST_LINKS) return incompleteProblems();
    const testsByProblem = new Map<string, Set<string>>();
    for (const link of links) {
      const ids = testsByProblem.get(link.problemId) ?? new Set<string>();
      ids.add(link.testId);
      testsByProblem.set(link.problemId, ids);
    }
    const wanted = [...new Set([...requested, ...testsByProblem.keys()])];
    const rows = await loadProblemRows(wanted);
    const found = new Set(rows.map((row) => row.id));
    for (const problemId of testsByProblem.keys()) {
      if (!found.has(problemId)) return incompleteProblems();
    }
    const records = [
      ...rows,
      ...requested
        .filter((problemId) => !found.has(problemId))
        .map((id): UsageProblemRecord => ({
          id,
          visible: false,
          eligible: false,
          ineligibleCode: null,
          unit: null,
        })),
    ];
    const recordMap = new Map(records.map((row) => [row.id, row]));
    for (const problemId of testsByProblem.keys()) {
      const record = recordMap.get(problemId);
      if (record?.visible && record.eligible && !record.unit) {
        return incompleteProblems();
      }
    }
    const uses = [...testsByProblem.entries()]
      .filter(([problemId]) => {
        const record = recordMap.get(problemId);
        return record?.visible === true && record.eligible && record.unit;
      })
      .map(([problemId, ids]) => ({
        problemId,
        testCount: ids.size,
      }));
    return { complete: true, records, uses };
  } catch {
    return incompleteProblems();
  }
}

async function loadProblemRows(
  ids: readonly string[],
): Promise<UsageProblemRecord[]> {
  const rows: UsageProblemRecord[] = [];
  for (let index = 0; index < ids.length; index += PROBLEM_CHUNK) {
    const slice = ids.slice(index, index + PROBLEM_CHUNK);
    const found = await db.problem.findMany({
      where: { id: { in: [...slice] } },
      select: {
        id: true,
        pool: true,
        reviewStatus: true,
        directUseAllowed: true,
        answer: true,
        unit: {
          select: { id: true, grade: true, chapter: true, section: true },
        },
      },
    });
    rows.push(...found.map(toProblemRecord));
  }
  return rows;
}

function toProblemRecord(row: {
  id: string;
  pool: string;
  reviewStatus: string;
  directUseAllowed: boolean;
  answer: string;
  unit: UsageProblemRecord["unit"];
}): UsageProblemRecord {
  const visible = row.pool === DEFAULT_PROBLEM_POOL;
  const ineligibleCode: ProblemIneligibleCode | null = visible
    ? problemIneligibleCode(row)
    : null;
  return {
    id: row.id,
    visible,
    eligible: visible && ineligibleCode === null,
    ineligibleCode,
    unit: row.unit,
  };
}

function incompleteProblems(): UsageProblemSide {
  return { complete: false, records: [], uses: [] };
}

async function loadArithmeticSide(
  viewer: ScopeViewer,
  period: UsageLabelPeriod,
  now: Date,
): Promise<UsageArithmeticSide> {
  try {
    const window = usagePeriodWindow(period, now);
    const [documents, audits] = await Promise.all([
      db.workspaceDocument.findMany({
        where: {
          userId: viewer.id,
          kind: ARITHMETIC_SHEET_KIND,
          createdAt: window.from
            ? { gte: window.from, lte: window.to }
            : { lte: window.to },
        },
        select: { id: true, payload: true },
        orderBy: { id: "asc" },
        take: USAGE_LABEL_MAX_DOCUMENTS + 1,
      }),
      db.accountAuditLog.findMany({
        where: { userId: viewer.id, action: "material.copied" },
        select: { details: true },
        orderBy: { id: "asc" },
        take: USAGE_LABEL_MAX_COPY_ROWS + 1,
      }),
    ]);
    if (
      documents.length > USAGE_LABEL_MAX_DOCUMENTS ||
      audits.length > USAGE_LABEL_MAX_COPY_ROWS
    ) {
      return { complete: false, uses: [] };
    }
    const copyIds = new Set<string>();
    for (const audit of audits) {
      const copyId = copiedDocumentId(audit.details);
      if (copyId) copyIds.add(copyId);
    }
    const counts = new Map<string, UsageArithmeticUse>();
    for (const document of documents) {
      if (isCopiedDocument(document.id, document.payload, copyIds)) continue;
      const types = typesInOriginal(document.payload);
      if (!types) continue;
      for (const use of types.values()) {
        const existing = counts.get(use.typeKey);
        if (existing) existing.documentCount += 1;
        else counts.set(use.typeKey, { ...use, documentCount: 1 });
      }
    }
    return { complete: true, uses: [...counts.values()] };
  } catch {
    return { complete: false, uses: [] };
  }
}

export function isCopiedDocument(
  id: string,
  payload: unknown,
  copyIds: ReadonlySet<string>,
): boolean {
  if (copyIds.has(id)) return true;
  if (!payload || typeof payload !== "object") return false;
  const source = (payload as { sourceDocumentId?: unknown }).sourceDocumentId;
  return typeof source === "string" && source.length > 0;
}

function copiedDocumentId(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const documentId = (details as { documentId?: unknown }).documentId;
  return typeof documentId === "string" && documentId.length > 0
    ? documentId
    : null;
}

function typesInOriginal(
  payload: unknown,
): Map<string, Omit<UsageArithmeticUse, "documentCount">> | null {
  let sheet;
  try {
    sheet = reopenArithmeticSheet(payload);
  } catch {
    return null;
  }
  const types = new Map<string, Omit<UsageArithmeticUse, "documentCount">>();
  for (const round of sheet.rounds) {
    for (const item of round.items) {
      const request = {
        skillId: item.spec.skillId,
        constraints: item.spec.constraints,
      } as UsageArithmeticTypeRequest;
      const typeKey = arithmeticUsageTypeKey({
        ...request,
        catalogVersion: item.spec.catalogVersion,
      });
      if (types.has(typeKey)) continue;
      types.set(typeKey, {
        typeKey,
        skillId: request.skillId,
        operator: item.spec.operator,
        constraints: request.constraints,
      });
    }
  }
  return types;
}
