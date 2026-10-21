/** Shared DB READ ONLY — «교과서를 고르고 시험지를 만들면 그 출처의 문항만 담기는가» (2026-10-21 출처 고르기 지시 3).
 *
 * 화면(시험지 만들기)이 보내는 조건 그대로(`sourceGroup` · `books` · `materialKinds` · `materials`)를 서버의 실제 읽기 함수에
 * 넣는다 — 2단계 차시 수(`loadQuestionScopeCounts`) · 추가 후보 목록(`loadUnifiedBank` view=page) · 자동 구성
 * (`composeUnifiedBankProblems`). 담긴 문항은 **따로 짠 SQL** 로 출처 · 책 · 자료 종류 · 자료 · 출제 잠금을 다시 본다.
 * 시험지는 저장하지 않는다. 모든 읽기는 확인된 READ ONLY 트랜잭션 하나 안에서 돈다(쓰기 연산 · 쓰기 SQL 은 막는다 —
 * 막는 방식은 `measure-bank-first-call-demand-live.ts` 와 같다). 문항 본문은 밖으로 내지 않는다(id · 수만).
 *
 * node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs --conditions=react-server \
 *   scripts/qa/verify-textbook-compose-live.ts [output.json]
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { writeFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { safeCode } from "../db/problem-actual-format";
import { ACTUAL_FORMAT_VERSION } from "../../src/lib/problem/actualFormat";

const scope = new AsyncLocalStorage<Prisma.TransactionClient>();
const reads = new Set([
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);
const denied = () => new Error("READ_ONLY_GUARD");
function protect<T extends object>(client: T, transaction = false): T {
  return new Proxy(client, {
    get(target, key, receiver) {
      const current = scope.getStore();
      if (key === "$extends")
        return (extension: Parameters<PrismaClient["$extends"]>[0]) =>
          protect((target as unknown as PrismaClient).$extends(extension));
      if (key === "$transaction")
        return (run: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
          if (!current || typeof run !== "function") throw denied();
          return run(current);
        };
      if (typeof key !== "string") return Reflect.get(target, key, receiver);
      if (!transaction && current && !key.startsWith("$"))
        return Reflect.get(current, key);
      const value = Reflect.get(target, key, receiver);
      if (key === "$queryRaw")
        return async (query: Prisma.Sql) => {
          if (!transaction && current) return current.$queryRaw(query);
          if (
            !transaction ||
            !query?.text ||
            !/^\s*(SELECT|WITH)\b/i.test(query.text) ||
            /\b(INSERT|UPDATE|DELETE|MERGE|ALTER|DROP|CREATE|TRUNCATE|CALL|COPY|GRANT|REVOKE)\b/i.test(
              query.text,
            )
          )
            throw denied();
          return (value as (query: Prisma.Sql) => Promise<unknown[]>).call(
            target,
            query,
          );
        };
      if (key.startsWith("$")) throw denied();
      if (value && typeof value === "object")
        return new Proxy(value, {
          get(delegate, method) {
            if (
              !transaction ||
              typeof method !== "string" ||
              !reads.has(method)
            )
              throw denied();
            return (...args: unknown[]) =>
              (
                Reflect.get(delegate, method) as (
                  ...args: unknown[]
                ) => Promise<unknown>
              ).apply(delegate, args);
          },
        });
      return value;
    },
  });
}

type Pick = { books?: string[]; kinds?: string[]; materials?: string[] };
/** 화면(`MathExamBuilder` 의 `filters`)과 같은 직렬화. */
function filtersOf(pick: Pick) {
  const params = new URLSearchParams();
  params.set("sourceGroup", "school_textbook");
  if (pick.books?.length) params.set("books", pick.books.join(","));
  if (pick.kinds?.length) params.set("materialKinds", pick.kinds.join(","));
  if (pick.materials?.length) params.set("materials", pick.materials.join(","));
  return params.toString();
}
const condition = (
  pick: Pick,
) => Prisma.sql`p.pool = 'shared' AND p.source = 'school_textbook'
  ${pick.books?.length ? Prisma.sql`AND m.book_id = ANY(${pick.books}::uuid[])` : Prisma.empty}
  ${pick.kinds?.length ? Prisma.sql`AND m.kind = ANY(${pick.kinds}::text[])` : Prisma.empty}
  ${pick.materials?.length ? Prisma.sql`AND p.source_material_id = ANY(${pick.materials}::uuid[])` : Prisma.empty}`;
const eligible = Prisma.sql`p.review_status = 'approved' AND p.direct_use_allowed AND p.answer <> '(정답 없음)'`;
/** 서버의 «출제 가능»은 자격 + 형식이 확인된 것(`actual_format <> 'unknown'`)이다. 판이 안 맞는 행은 서버가 본문으로
 * 가른다 — SQL 로는 못 가르므로 따로 센다(0 이 아니면 SQL 수는 아래 한계일 뿐이다). */
const formatKnown = Prisma.sql`p.actual_format_version = ${ACTUAL_FORMAT_VERSION} AND p.actual_format IS NOT NULL AND p.actual_format <> 'unknown'`;
const formatUnverified = Prisma.sql`(p.actual_format_version IS DISTINCT FROM ${ACTUAL_FORMAT_VERSION} OR p.actual_format IS NULL)`;

async function main() {
  const raw = new PrismaClient({ log: [] });
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma =
    protect(raw);
  try {
    const { loadUnifiedBank } = await import("../../src/lib/unifiedPreview");
    const {
      loadQuestionScopeCounts,
      loadQuestionPickerBookCounts,
      loadQuestionPickerKindCounts,
    } = await import("../../src/lib/bankSourceQuestions");
    const { composeUnifiedBankProblems } =
      await import("../../src/lib/unifiedBankSelection");
    const result = await raw.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const [proof] = await tx.$queryRaw<
          { readOnly: string }[]
        >`SELECT current_setting('transaction_read_only') AS "readOnly"`;
        if (proof.readOnly !== "on") throw denied();
        const q = <T>(sql: Prisma.Sql) => tx.$queryRaw<T[]>(sql);
        const ro = protect(tx, true);
        return scope.run(ro, async () => {
          // ── 고정물: 교과서 문항이 가장 많은 과목 · 그 과목의 책 둘 · 자료 종류 둘 · 차시 셋 · 자료 하나 ──
          const [grade] = await q<{ grade: string; n: number }>(Prisma.sql`
          SELECT b.grade, count(*)::int AS n FROM public.problem p
          JOIN public.source_material m ON m.id = p.source_material_id JOIN public.source_book b ON b.id = m.book_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook' AND ${eligible}
          GROUP BY b.grade ORDER BY n DESC, b.grade LIMIT 1`);
          const books = await q<{ id: string; n: number }>(Prisma.sql`
          SELECT m.book_id AS id, count(*)::int AS n FROM public.problem p
          JOIN public.source_material m ON m.id = p.source_material_id JOIN public.source_book b ON b.id = m.book_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook' AND ${eligible} AND b.grade = ${grade.grade}
          GROUP BY m.book_id ORDER BY n DESC, m.book_id LIMIT 2`);
          const kinds = await q<{ kind: string; n: number }>(Prisma.sql`
          SELECT m.kind, count(*)::int AS n FROM public.problem p JOIN public.source_material m ON m.id = p.source_material_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook' AND ${eligible} AND m.book_id = ${books[0].id}::uuid
          GROUP BY m.kind ORDER BY n DESC, m.kind LIMIT 2`);
          const unitsFor = async (pick: Pick) =>
            (
              await q<{ id: string }>(Prisma.sql`
          SELECT p.unit_id AS id FROM public.problem p JOIN public.source_material m ON m.id = p.source_material_id
          WHERE ${condition(pick)} AND ${eligible} GROUP BY p.unit_id ORDER BY count(*) DESC, p.unit_id LIMIT 3`)
            ).map((u) => u.id);
          const [material] = await q<{ id: string }>(Prisma.sql`
          SELECT p.source_material_id AS id FROM public.problem p JOIN public.source_material m ON m.id = p.source_material_id
          WHERE ${condition({ books: [books[0].id], kinds: [kinds[0].kind] })} AND ${eligible}
          GROUP BY p.source_material_id ORDER BY count(*) DESC, p.source_material_id LIMIT 1`);
          const scenarios: { name: string; pick: Pick }[] = [
            { name: "교과서 · 책 전부 · 자료 전부", pick: {} },
            {
              name: "책 1권 · 자료 종류 1",
              pick: { books: [books[0].id], kinds: [kinds[0].kind] },
            },
            {
              name: "책 2권 · 자료 종류 2",
              pick: {
                books: books.map((b) => b.id),
                kinds: kinds.map((k) => k.kind),
              },
            },
            {
              name: "책 1권 · 자료 종류 1 · 자료 고르기 1편",
              pick: {
                books: [books[0].id],
                kinds: [kinds[0].kind],
                materials: [material.id],
              },
            },
          ];
          const out = [];
          for (const { name, pick } of scenarios) {
            const units = await unitsFor(
              pick.books?.length
                ? pick
                : { books: [books[0].id], kinds: [kinds[0].kind] },
            );
            const filters = filtersOf(pick);
            const base = new URLSearchParams(filters);
            base.set("identity", "question");
            // ① 2단계 차시 수 — 화면 `demandScopes` 와 같은 요청
            const countParams = new URLSearchParams(base);
            countParams.set("view", "scope-counts");
            countParams.set("unitIds", [...units].sort().join(","));
            countParams.set("families", "1");
            const counts = await loadQuestionScopeCounts(countParams);
            // ② 따로 짠 SQL — 같은 조건의 출제 가능 행 · 잠긴 행 · 같은 차시의 다른 출처 출제 가능 행
            const [sql] = await q<{
              eligibleRows: number;
              eligibleQuestions: number;
              formatUnknownRows: number;
              formatUnverifiedRows: number;
              lockedRows: number;
              otherSourceEligible: number;
            }>(Prisma.sql`
            SELECT
              (SELECT count(*)::int FROM public.problem p LEFT JOIN public.source_material m ON m.id = p.source_material_id
                WHERE ${condition(pick)} AND ${eligible} AND ${formatKnown} AND p.unit_id = ANY(${units}::uuid[])) AS "eligibleRows",
              (SELECT count(DISTINCT COALESCE(p.question_group_key, 'row:' || p.id::text))::int FROM public.problem p
                LEFT JOIN public.source_material m ON m.id = p.source_material_id
                WHERE ${condition(pick)} AND ${eligible} AND ${formatKnown} AND p.unit_id = ANY(${units}::uuid[])) AS "eligibleQuestions",
              (SELECT count(*)::int FROM public.problem p LEFT JOIN public.source_material m ON m.id = p.source_material_id
                WHERE ${condition(pick)} AND ${eligible} AND NOT ${formatUnverified} AND p.actual_format = 'unknown'
                  AND p.unit_id = ANY(${units}::uuid[])) AS "formatUnknownRows",
              (SELECT count(*)::int FROM public.problem p LEFT JOIN public.source_material m ON m.id = p.source_material_id
                WHERE ${condition(pick)} AND ${eligible} AND ${formatUnverified} AND p.unit_id = ANY(${units}::uuid[])) AS "formatUnverifiedRows",
              (SELECT count(*)::int FROM public.problem p LEFT JOIN public.source_material m ON m.id = p.source_material_id
                WHERE ${condition(pick)} AND NOT p.direct_use_allowed AND p.unit_id = ANY(${units}::uuid[])) AS "lockedRows",
              (SELECT count(*)::int FROM public.problem p
                WHERE p.pool = 'shared' AND p.source <> 'school_textbook' AND ${eligible} AND p.unit_id = ANY(${units}::uuid[])) AS "otherSourceEligible"`);
            // ③ 추가 후보 목록 — 화면 `list()` 와 같은 요청(첫 쪽 100개)
            const listParams = new URLSearchParams(base);
            listParams.set("unitIds", units.join(","));
            listParams.set("view", "page");
            listParams.set("page", "1");
            listParams.set("pageSize", "100");
            const list = await loadUnifiedBank(listParams);
            // ④ 자동 구성 — 차시마다 출제 가능 갈래 수만큼(화면이 허용하는 최대) · 그보다 2개 더(서버의 모자람)
            const families = units.map((id) => counts.unitFamilies[id] ?? 0);
            const fit = await composeUnifiedBankProblems({
              identity: "question",
              filters,
              allocations: units.flatMap((unitId, i) =>
                families[i]
                  ? [{ unitId, count: Math.min(families[i], 30) }]
                  : [],
              ),
            });
            const over = await composeUnifiedBankProblems({
              identity: "question",
              filters,
              allocations: units.map((unitId, i) => ({
                unitId,
                count: Math.min((families[i] ?? 0) + 2, 30),
              })),
            });
            // ⑤ 담긴 문항 · 목록 문항을 따로 짠 SQL 로 다시 본다
            const ids = [
              ...new Set(
                [...fit.problems, ...over.problems, ...list.problems].map(
                  (p) => p.id,
                ),
              ),
            ];
            const rows = ids.length
              ? await q<{
                  id: string;
                  source: string;
                  bookId: string | null;
                  kind: string | null;
                  materialId: string | null;
                  direct: boolean;
                  review: string;
                  unitId: string;
                }>(Prisma.sql`
            SELECT p.id, p.source::text AS source, m.book_id AS "bookId", m.kind, p.source_material_id AS "materialId",
                   p.direct_use_allowed AS direct, p.review_status::text AS review, p.unit_id AS "unitId"
            FROM public.problem p LEFT JOIN public.source_material m ON m.id = p.source_material_id
            WHERE p.id = ANY(${ids}::uuid[])`)
              : [];
            const bad = rows.filter(
              (r) =>
                r.source !== "school_textbook" ||
                !r.direct ||
                r.review !== "approved" ||
                !units.includes(r.unitId) ||
                (pick.books?.length && !pick.books.includes(r.bookId ?? "")) ||
                (pick.kinds?.length && !pick.kinds.includes(r.kind ?? "")) ||
                (pick.materials?.length &&
                  !pick.materials.includes(r.materialId ?? "")),
            );
            out.push({
              name,
              units: units.length,
              filters: filters.replace(/[0-9a-f-]{36}/g, "<id>"),
              scopeCounts: {
                questions: units.reduce(
                  (s, id) => s + (counts.unitCounts[id] ?? 0),
                  0,
                ),
                families: families.reduce((s, n) => s + n, 0),
              },
              sql,
              list: { total: list.total, firstPage: list.problems.length },
              countsAgree:
                sql.formatUnverifiedRows === 0 &&
                units.reduce((s, id) => s + (counts.unitCounts[id] ?? 0), 0) ===
                  sql.eligibleQuestions &&
                list.total === sql.eligibleQuestions,
              composeFit: {
                status: fit.status,
                requested: fit.allocations.reduce((s, a) => s + a.requested, 0),
                actual: fit.problems.length,
              },
              composeOver: {
                status: over.status,
                requested: over.allocations.reduce(
                  (s, a) => s + a.requested,
                  0,
                ),
                actual: over.problems.length,
              },
              checkedRows: rows.length,
              missingRows: ids.length - rows.length,
              violations: bad.length,
            });
            console.log(
              `${name}: list ${list.total} · fit ${fit.status} ${fit.problems.length} · over ${over.status} ${over.problems.length} · violations ${bad.length}`,
            );
          }
          // ── 지시 2 — 책별 자료 종류 수의 합이 문항 단위 합집합과 같은가(과목 하나 · 전체) ──
          const gradeParams = new URLSearchParams({
            identity: "question",
            view: "picker-book-counts",
            grade: grade.grade,
          });
          const picker = await loadQuestionPickerBookCounts(gradeParams);
          const union = await q<{ kind: string; n: number }>(Prisma.sql`
          SELECT m.kind, count(DISTINCT COALESCE(p.question_group_key, 'row:' || p.id::text))::int AS n FROM public.problem p
          JOIN public.source_material m ON m.id = p.source_material_id JOIN public.source_book b ON b.id = m.book_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook' AND b.grade = ${grade.grade} GROUP BY m.kind`);
          const summed = Object.fromEntries(
            union.map(({ kind }) => [
              kind,
              picker.books.reduce((s, b) => s + (b.kinds[kind] ?? 0), 0),
            ]),
          );
          const globalUnion = await q<{ kind: string; n: number }>(Prisma.sql`
          SELECT m.kind, count(DISTINCT COALESCE(p.question_group_key, 'row:' || p.id::text))::int AS n FROM public.problem p
          JOIN public.source_material m ON m.id = p.source_material_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook' GROUP BY m.kind`);
          const [gradeMismatch] = await q<{ n: number }>(Prisma.sql`
          SELECT count(*)::int AS n FROM public.problem p JOIN public.source_material m ON m.id = p.source_material_id
          JOIN public.source_book b ON b.id = m.book_id JOIN public.unit u ON u.id = p.unit_id
          WHERE p.pool = 'shared' AND p.source = 'school_textbook' AND u.grade <> b.grade`);
          const [nullFormat] = await q<{ n: number }>(Prisma.sql`
          SELECT count(*)::int AS n FROM public.problem p WHERE p.pool = 'shared' AND p.source = 'school_textbook' AND p.actual_format IS NULL`);
          return {
            measuredAt: new Date().toISOString(),
            readOnly: true,
            grade: grade.grade,
            books: books.length,
            kinds: kinds.map((k) => k.kind),
            scenarios: out,
            kindSums: {
              grade: grade.grade,
              books: picker.books.length,
              perKind: union.map(({ kind, n }) => ({
                kind,
                union: n,
                sumOfBooks: summed[kind],
                equal: n === summed[kind],
              })),
              global: globalUnion,
              // 책을 안 고른 때의 자료 종류 열(`picker-kind-counts`)이 전역 합집합과 같은가
              pickerKindCountsEqualsGlobal: await (async () => {
                const view = await loadQuestionPickerKindCounts(
                  new URLSearchParams({
                    identity: "question",
                    view: "picker-kind-counts",
                  }),
                );
                return (
                  Object.keys(view.kinds).length === globalUnion.length &&
                  globalUnion.every(({ kind, n }) => view.kinds[kind] === n)
                );
              })(),
            },
            textbookRowsWhoseUnitGradeDiffersFromBook: gradeMismatch.n,
            textbookRowsWithNullActualFormat: nullFormat.n,
          };
        });
      },
      { isolationLevel: "RepeatableRead", timeout: 300_000, maxWait: 20_000 },
    );
    const output =
      process.argv[2] ??
      "docs/planning/tracks/reports/source-picker-20261021/textbook-compose-live.json";
    await writeFile(output, JSON.stringify(result, null, 2) + "\n");
    console.log(`wrote ${output}`);
  } finally {
    await raw.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    `TEXTBOOK_COMPOSE_VERIFY_FAILED:${safeCode(error)} (connection/error details omitted)`,
  );
  process.exitCode = 1;
});
