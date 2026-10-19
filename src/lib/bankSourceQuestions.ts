import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cachedBankRead, publicBankQueryKey } from "./bankReadCache";
import { withBankReadFingerprint } from "./bankReadFingerprint";
import { problemVisibleWhere } from "@/lib/problemPool";
import { familyIdOf } from "@/lib/generator/familyKey";
import { SOURCE_MATERIAL_KINDS } from "@/contracts/sourceMaterial.contract";
import {
  QUESTION_FORMATS,
  type QuestionFormat,
} from "@/contracts/questionFormats.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import {
  BANK_AVAILABILITY_AXES,
  BANK_SOURCE_GROUPS,
  bankBookIdsParamSchema,
  type BankSourceAvailability,
  type BankSourceCounts,
  type BankSourceMaterials,
} from "@/contracts/bankSource.contract";
import type { BankQueryContext } from "@/lib/bankQueryContext";
import { questionReadMetadata } from "@/lib/problem/questionProjection";
import {
  resolveUnifiedBankQuery,
  UnifiedBankQueryError,
} from "./unifiedPreview";

import { loadQuestionCounts } from "./problem/questionCountProjection";
import { questionBucketTally } from "./problem/questionCountBuckets";
import type { CountBucket, CountDimension } from "./problem/questionCountSql";

const tally = questionBucketTally;
const axis = (buckets: readonly CountBucket[], name: string) =>
  buckets.filter((b) => b.axis === name);

function unitFamilyCounts(buckets: readonly CountBucket[]) {
  const units = axis(buckets, "unit")
    .filter((b) => b.available > 0)
    .sort(
      (a, b) => (a.firstAvailable ?? Infinity) - (b.firstAvailable ?? Infinity),
    );
  const keyed = new Map<string, Set<string>>();
  const solo = new Map<string, number>();
  for (const bucket of axis(buckets, "family")) {
    if (!bucket.available) continue;
    if (!bucket.extra?.trim())
      solo.set(bucket.key, (solo.get(bucket.key) ?? 0) + bucket.rowCount);
    else {
      const keys = keyed.get(bucket.key) ?? new Set<string>();
      keys.add(
        familyIdOf({ id: "", unitId: bucket.key, familyKey: bucket.extra }),
      );
      keyed.set(bucket.key, keys);
    }
  }
  return Object.fromEntries(
    units.map((bucket) => [
      bucket.key,
      Math.min(
        (keyed.get(bucket.key)?.size ?? 0) + (solo.get(bucket.key) ?? 0),
        bucket.available,
      ),
    ]),
  );
}
function clean(params: URLSearchParams, omit: readonly string[] = []) {
  const copy = new URLSearchParams(params);
  for (const key of [
    "view",
    "version",
    "page",
    "pageSize",
    "families",
    ...omit,
  ])
    copy.delete(key);
  return copy;
}
function check(params: URLSearchParams) {
  if (
    params.get("identity") !== "question" ||
    (params.has("version") && params.get("version") !== "2")
  )
    throw new UnifiedBankQueryError("문항 보기의 판을 확인해 주세요.");
}
/** One repeatable read and one content-classification cache for all facet scopes. */
export async function loadQuestionSourceAvailability(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<BankSourceAvailability> {
  check(params);
  const key = publicBankQueryKey(params);
  return db.$transaction(
    (tx) =>
      withBankReadFingerprint(tx, () =>
        key === null
          ? readQuestionSourceAvailability(params, context, tx)
          : cachedBankRead(`availability:${key}`, () =>
              readQuestionSourceAvailability(params, context, tx),
            ),
      ),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
async function readQuestionSourceAvailability(
  params: URLSearchParams,
  context?: BankQueryContext,
  tx?: Prisma.TransactionClient,
): Promise<BankSourceAvailability> {
  const filters = clean(params);
  const [main, units, difficulties, sources] = await Promise.all([
    resolveUnifiedBankQuery(filters, context),
    resolveUnifiedBankQuery(
      clean(filters, BANK_AVAILABILITY_AXES.units),
      context,
    ),
    resolveUnifiedBankQuery(
      clean(filters, BANK_AVAILABILITY_AXES.difficulties),
      context,
    ),
    resolveUnifiedBankQuery(
      clean(filters, BANK_AVAILABILITY_AXES.sources),
      context,
    ),
  ]);
  const read = async (
    tx: Prisma.TransactionClient,
  ): Promise<BankSourceAvailability> => {
    const cache = new Map<
      string,
      ReturnType<typeof import("@/lib/problem/provenance").classifyFormat>
    >();
    // Equal facet scopes share one SQL aggregate with the union of dimensions.
    const scans = new Map<
      string,
      {
        where: Prisma.ProblemWhereInput;
        format?: QuestionFormat;
        dimensions: Set<CountDimension>;
        result?: CountBucket[];
      }
    >();
    const plan = (
      selection: Prisma.ProblemWhereInput[],
      format: QuestionFormat | undefined,
      dimensions: CountDimension[],
    ) => {
      const where = { AND: [problemVisibleWhere(), ...selection] };
      const key = JSON.stringify([where, format]);
      const scan = scans.get(key) ?? {
        where,
        format,
        dimensions: new Set<CountDimension>(),
        result: undefined as CountBucket[] | undefined,
      };
      for (const dimension of dimensions) scan.dimensions.add(dimension);
      scans.set(key, scan);
      return scan;
    };
    const mainScan = plan(main.selection, main.format, []);
    const unitScan = plan(units.selection, units.format, [
      "unit",
      ...(params.get("families") === "1" ? ["family" as const] : []),
    ]);
    const difficultyScan = plan(difficulties.selection, difficulties.format, [
      "difficulty",
    ]);
    const sourceScan = plan(sources.selection, sources.format, [
      "source",
      "book",
      "kind",
    ]);
    for (const scan of scans.values())
      scan.result = await loadQuestionCounts(
        scan.where,
        tx,
        [...scan.dimensions],
        scan.format,
        cache,
        scan === mainScan,
      );
    const mainBuckets = mainScan.result!,
      unitBuckets = unitScan.result!,
      difficultyBuckets = difficultyScan.result!,
      sourceBuckets = sourceScan.result!;
    return {
      view: "available",
      ...questionReadMetadata(params),
      ...tally(mainBuckets),
      formatAvailable: Object.fromEntries(
        QUESTION_FORMATS.map((f) => [
          f,
          tally(mainBuckets, "format", f).available,
        ]),
      ) as Record<(typeof QUESTION_FORMATS)[number], number>,
      facets: {
        units: Object.fromEntries(
          axis(unitBuckets, "unit").map((b) => [
            b.key,
            { held: b.held, available: b.available },
          ]),
        ),
        ...(params.get("families") === "1"
          ? { unitFamilies: unitFamilyCounts(unitBuckets) }
          : {}),
        difficulties: Object.fromEntries(
          DIFFICULTY_LADDER.map((tier) => [
            tier,
            tally(difficultyBuckets, "difficulty", tier),
          ]),
        ) as NonNullable<BankSourceAvailability["facets"]>["difficulties"],
        sources: {
          total: tally(sourceBuckets),
          ...Object.fromEntries(
            BANK_SOURCE_GROUPS.map((g) => [
              g,
              tally(sourceBuckets, "source", g),
            ]),
          ),
        } as NonNullable<BankSourceAvailability["facets"]>["sources"],
        textbook: {
          ...tally(sourceBuckets, "source", "school_textbook"),
          books: axis(sourceBuckets, "book")
            .sort((a, b) => a.key.localeCompare(b.key))
            .map((b) => ({
              id: b.key,
              held: b.held,
              available: b.available,
              kinds: Object.fromEntries(
                axis(sourceBuckets, "kind")
                  .filter((k) => k.key === b.key)
                  .map((k) => [
                    k.extra!,
                    { held: k.held, available: k.available },
                  ]),
              ),
            })),
        },
      },
    };
  };
  return tx
    ? read(tx)
    : db.$transaction(read, {
        isolationLevel: "RepeatableRead",
        timeout: 30000,
      });
}

/** Global source picker scope stays global; every union is counted by question. */
export async function loadQuestionSourceCounts(
  params: URLSearchParams,
): Promise<BankSourceCounts> {
  check(params);
  const key = publicBankQueryKey(params);
  return db.$transaction(
    (tx) =>
      withBankReadFingerprint(tx, () =>
        key === null
          ? readQuestionSourceCounts(params, tx)
          : cachedBankRead(`counts:${key}`, () =>
              readQuestionSourceCounts(params, tx),
            ),
      ),
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
async function readQuestionSourceCounts(
  params: URLSearchParams,
  tx: Prisma.TransactionClient,
): Promise<BankSourceCounts> {
  const [buckets, books, units] = await Promise.all([
    loadQuestionCounts(
      problemVisibleWhere(),
      tx,
      ["source", "book", "kind", "material"],
      undefined,
      undefined,
      false,
    ),
    tx.sourceBook.findMany({
      where: { kind: "school_textbook" },
      select: {
        id: true,
        grade: true,
        publisher: true,
        author: true,
        title: true,
      },
    }),
    tx.unit.findMany({
      select: { grade: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    }),
  ]);
  const materials = books.length
    ? await tx.sourceMaterial.findMany({
        where: { bookId: { in: books.map((b) => b.id) } },
        select: { id: true, bookId: true, kind: true },
      })
    : [];
  const first = new Map<string, number>();
  for (const u of units)
    if (!first.has(u.grade)) first.set(u.grade, u.orderIndex);
  const listed = books.flatMap((book) => {
    const count = tally(buckets, "book", book.id);
    if (!count.held) return [];
    return [
      {
        ...book,
        count: count.held,
        open: count.available,
        materials: materials.filter(
          (m) =>
            m.bookId === book.id && tally(buckets, "material", m.id).held > 0,
        ).length,
        kinds: Object.fromEntries(
          axis(buckets, "kind")
            .filter((k) => k.key === book.id)
            .map((k) => [k.extra!, k.held]),
        ),
      },
    ];
  });
  const grades = [...new Set(listed.map((b) => b.grade))].sort(
    (a, b) =>
      (first.get(a) ?? Infinity) - (first.get(b) ?? Infinity) ||
      a.localeCompare(b, "ko"),
  );
  return {
    ...questionReadMetadata(params),
    sources: {
      total: tally(buckets).held,
      ...Object.fromEntries(
        BANK_SOURCE_GROUPS.map((g) => [g, tally(buckets, "source", g).held]),
      ),
    } as BankSourceCounts["sources"],
    textbook: {
      total: tally(buckets, "source", "school_textbook").held,
      grades,
      kinds: [...SOURCE_MATERIAL_KINDS],
      books: listed.sort(
        (a, b) =>
          grades.indexOf(a.grade) - grades.indexOf(b.grade) ||
          b.count - a.count ||
          a.publisher.localeCompare(b.publisher, "ko") ||
          (a.author ?? "").localeCompare(b.author ?? "", "ko"),
      ),
    },
  };
}
const nullsLast = (a: number | null, b: number | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a - b;
export async function loadQuestionSourceMaterials(
  params: URLSearchParams,
  context?: BankQueryContext,
): Promise<BankSourceMaterials> {
  check(params);
  const books = bankBookIdsParamSchema.safeParse(params.get("books") ?? "");
  if (!books.success)
    throw new UnifiedBankQueryError("자료를 볼 책을 골라 주세요.");
  const query = await resolveUnifiedBankQuery(
    clean(params, BANK_AVAILABILITY_AXES.sources),
    context,
  );
  return db.$transaction(
    async (tx) => {
      const [materials, buckets] = await Promise.all([
        tx.sourceMaterial.findMany({
          where: { bookId: { in: books.data } },
          select: {
            id: true,
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
          },
        }),
        loadQuestionCounts(
          {
            AND: [
              problemVisibleWhere(),
              ...query.selection,
              { source: "school_textbook" },
              { sourceMaterial: { bookId: { in: books.data } } },
            ],
          },
          tx,
          ["material"],
          query.format,
          undefined,
          false,
        ),
      ]);
      const order = new Map(books.data.map((id, i) => [id, i]));
      return {
        view: "materials",
        ...questionReadMetadata(params),
        materials: materials
          .map((m) => ({ ...m, ...tally(buckets, "material", m.id) }))
          .sort(
            (a, b) =>
              order.get(a.bookId)! - order.get(b.bookId)! ||
              nullsLast(a.chapterNo, b.chapterNo) ||
              nullsLast(a.middleNo, b.middleNo) ||
              nullsLast(a.sectionNo, b.sectionNo) ||
              a.kind.localeCompare(b.kind, "ko") ||
              nullsLast(a.sequence, b.sequence) ||
              a.title.localeCompare(b.title, "ko") ||
              a.id.localeCompare(b.id),
          ),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 30000 },
  );
}
