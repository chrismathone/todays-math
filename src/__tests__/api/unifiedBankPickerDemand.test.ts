import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";
import { MOCK_UNITS } from "@/mocks/data";
import {
  builderId,
  seedBuilderSpeedFixture,
} from "@/__tests__/helpers/builderSpeedFixture";
import {
  loadQuestionSourceCounts,
  loadQuestionSourceMaterials,
  loadQuestionPickerGroups,
  loadQuestionPickerBooks,
  loadQuestionPickerBookCounts,
  loadQuestionMaterialsPage,
} from "@/lib/bankSourceQuestions";
import { bankSourcesResponse } from "@/lib/bankSourceRoute";
import {
  unifiedBankPickerGroupsSchema,
  unifiedBankPickerBooksSchema,
  unifiedBankPickerBookCountsSchema,
  unifiedBankMaterialsPageSchema,
} from "@/contracts/unifiedBankBootstrap.contract";
import type { CountSql } from "@/lib/problem/questionCountSql";
import { ACTUAL_FORMAT_VERSION, actualFormatDigest } from "@/lib/problem/actualFormat";
import { classifyFormat } from "@/lib/problem/provenance";
vi.mock("server-only", () => ({}));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const bookIds = [builderId(90001), builderId(90002), builderId(90003)];
const materialId = (index: number) => builderId(91000 + index);
const params = (view: string, extra: Record<string, string> = {}) =>
  new URLSearchParams({ identity: "question", view, ...extra });

beforeEach(async () => {
  await seedBuilderSpeedFixture(12);
  for (const [index, id] of bookIds.entries())
    await db.sourceBook.create({
      data: {
        id,
        externalKey: `demand-book-${index}`,
        kind: "school_textbook",
        grade: `중${index + 1}`,
        publisher: `출판${index + 1}`,
        author: `저자${index + 1}`,
        title: `교과서 ${index + 1}`,
        curriculum: "2022",
      },
    });
  const template = (await db.problem.findMany())[1];
  for (let index = 0; index < 28; index++) {
    const bookIndex = index < 25 ? 0 : index < 27 ? 1 : 2;
    await db.sourceMaterial.create({
      data: {
        id: materialId(index),
        bookId: bookIds[bookIndex],
        externalKey: `demand-material-${index}`,
        kind: index % 2 ? "형성 평가" : "수업 자료",
        kindRaw: index % 2 ? "형성 평가" : "수업 자료",
        title: `자료 ${index + 1}`,
        chapterNo: index,
        middleNo: null,
        sectionNo: null,
        unitRaw: "단원",
        semester: null,
        round: null,
        levelRaw: null,
        sequence: index,
      },
    });
    // exam-wiring: 테스트 — 전역 Prisma 인메모리 대역에 교재 선택기 픽스처만 넣는다.
    await db.problem.create({
      data: {
        ...template,
        id: builderId(2000 + index),
        problemCode: `DEMAND-${index}`,
        questionGroupKey: null,
        source: "school_textbook",
        sourceMaterialId: materialId(index),
        unitId: MOCK_UNITS[0].id,
        pool: "shared",
        reviewStatus: "approved",
        directUseAllowed: index !== 26,
        answer: "7",
        content: `자료 안 문항 ${index}`,
        questionType: "단답형",
        problemType: "계산",
      } as never,
    });
  }
});

describe("source picker scope and parity", () => {
  it("reuses selected-book results only after a fresh enabled revision check and refreshes changed eligibility", async () => {
    // The enabled-production fast path requires the already backfilled format
    // facts. The other fixture cases deliberately exercise uncomputed facts.
    for (const row of await db.problem.findMany({ where: { pool: "shared" } }))
      await db.problem.update({ where: { id: row.id }, data: {
        actualFormat: classifyFormat(row), actualFormatVersion: ACTUAL_FORMAT_VERSION,
        actualFormatDigest: actualFormatDigest(row),
      } as never });
    vi.stubEnv("BANK_READ_REVISION", "on");
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const bookReads = vi.spyOn(db.sourceBook, "findMany");
    const query = params("picker-book-counts", { grade: "중1" });
    const first = await loadQuestionPickerBookCounts(query);
    expect(await loadQuestionPickerBookCounts(query)).toEqual(first);
    expect(bookReads).toHaveBeenCalledOnce();
    await db.problem.update({ where: { id: builderId(2000) }, data: { directUseAllowed: false } });
    const changed = await loadQuestionPickerBookCounts(query);
    expect(changed.books[0].count).toBe(first.books[0].count);
    expect(changed.books[0].open).toBe(first.books[0].open - 1);
    expect(bookReads).toHaveBeenCalledTimes(2);
    expect(raw.mock.calls.filter(([sql]) => (sql as { bankReadRevision?: boolean }).bankReadRevision)).toHaveLength(3);
    expect(raw.mock.calls.some(([sql]) => (sql as CountSql).questionCountRead?.mode === "formats")).toBe(false);
  });

  it("returns identical source totals using only source buckets and no hidden books, materials or unit metadata", async () => {
    const original = await loadQuestionSourceCounts(
      new URLSearchParams({ identity: "question" }),
    );
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const bookReads = vi.spyOn(db.sourceBook, "findMany");
    const materialReads = vi.spyOn(db.sourceMaterial, "findMany");
    const unitReads = vi.spyOn(db.unit, "findMany");
    const value = await loadQuestionPickerGroups(params("picker-groups"));
    expect(unifiedBankPickerGroupsSchema.parse(value)).toEqual(value);
    expect(value.sources).toEqual(original.sources);
    expect(bookReads).not.toHaveBeenCalled();
    expect(materialReads).not.toHaveBeenCalled();
    expect(unitReads).not.toHaveBeenCalled();
    expect(
      raw.mock.calls.filter(
        ([sql]) =>
          (sql as { bankHeldSourceGroups?: boolean }).bankHeldSourceGroups,
      ),
    ).toHaveLength(1);
    expect(
      raw.mock.calls.every(([sql]) => !(sql as CountSql).questionCountRead),
    ).toBe(true);
  });

  it("reads only grade labels before selecting a textbook grade, then current grade and already selected book metadata", async () => {
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const materials = vi.spyOn(db.sourceMaterial, "findMany");
    const first = await loadQuestionPickerBooks(params("picker-books"));
    expect(unifiedBankPickerBooksSchema.parse(first)).toEqual(first);
    expect(new Set(first.grades)).toEqual(new Set(["중1", "중2", "중3"]));
    expect(first.books).toEqual([]);
    const second = await loadQuestionPickerBooks(
      params("picker-books", { grade: "중2", books: bookIds[0] }),
    );
    expect(second.books.map((book) => book.id).sort()).toEqual([
      bookIds[0],
      bookIds[1],
    ]);
    expect(second.books.every((book) => !Object.hasOwn(book, "count"))).toBe(
      true,
    );
    expect(raw).not.toHaveBeenCalled();
    expect(materials).not.toHaveBeenCalled();
  });

  it("preserves held/open/kind counts for only the open grade and selected books, without material/other grade buckets", async () => {
    const original = await loadQuestionSourceCounts(
      new URLSearchParams({ identity: "question" }),
    );
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const value = await loadQuestionPickerBookCounts(
      params("picker-book-counts", { grade: "중2", books: bookIds[0] }),
    );
    expect(unifiedBankPickerBookCountsSchema.parse(value)).toEqual(value);
    expect(value.books.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
      original.textbook.books
        .filter((book) => book.id !== bookIds[2])
        .map(({ id, count, open, kinds }) => ({ id, count, open, kinds }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
    for (const [sql] of raw.mock.calls) {
      const read = (sql as CountSql).questionCountRead;
      if (read?.mode !== "counts") continue;
      expect(read.dimensions).toEqual(["book", "kind"]);
      expect(JSON.stringify(read.where)).toContain(bookIds[0]);
      expect(JSON.stringify(read.where)).toContain(bookIds[1]);
      expect(JSON.stringify(read.where)).not.toContain(bookIds[2]);
    }
  });
});

describe("material pages scope and parity", () => {
  it("returns the same ordered native material rows while counting only page rows plus selected IDs", async () => {
    const selectedBooks = bookIds.slice(0, 2).join(",");
    const old = await loadQuestionSourceMaterials(
      params("materials", { books: selectedBooks }),
    );
    const raw = vi.spyOn(prismaTestDouble, "$queryRaw");
    const first = await loadQuestionMaterialsPage(
      params("materials-page", { books: selectedBooks }),
    );
    expect(unifiedBankMaterialsPageSchema.parse(first)).toEqual(first);
    expect(first.total).toBe(old.materials.length);
    expect(JSON.stringify(first.materials)).toBe(
      JSON.stringify(old.materials.slice(0, 20)),
    );
    const selected = [materialId(1), materialId(26)];
    raw.mockClear();
    const second = await loadQuestionMaterialsPage(
      params("materials-page", {
        books: selectedBooks,
        page: "2",
        materials: selected.join(","),
      }),
    );
    expect(second.materials).toEqual(old.materials.slice(20, 40));
    expect(second.selectedAvailable).toEqual([selected[0]]);
    for (const [sql] of raw.mock.calls) {
      const read = (sql as CountSql).questionCountRead;
      if (read?.mode !== "counts") continue;
      expect(read.dimensions).toEqual(["material"]);
      const query = JSON.stringify(read.where);
      expect(query).toContain(selected[0]);
      expect(query).toContain(materialId(20));
      expect(query).not.toContain(materialId(2));
    }
    raw.mockClear();
    const search = await loadQuestionMaterialsPage(
      params("materials-page", {
        books: selectedBooks,
        q: "자료 25",
        materials: selected[0],
      }),
    );
    expect(search.materials).toEqual(
      old.materials.filter((row) => row.title.includes("자료 25")),
    );
    expect(search.selectedAvailable).toEqual([selected[0]]);
    const byBook = await loadQuestionMaterialsPage(
      params("materials-page", {
        books: selectedBooks,
        q: "중2 · 출판2 · 저자2",
      }),
    );
    expect(byBook.materials).toEqual(
      old.materials.filter((row) => row.bookId === bookIds[1]),
    );
    const byKind = await loadQuestionMaterialsPage(
      params("materials-page", {
        books: selectedBooks,
        materialKinds: "형성 평가",
      }),
    );
    expect(byKind.materials).toEqual(
      old.materials.filter((row) => row.kind === "형성 평가"),
    );
  });

  it.each([
    { identity: "question", view: "picker-book-counts" },
    { identity: "question", view: "picker-books", books: "invalid" },
    { identity: "question", view: "picker-groups", version: "1" },
    { identity: "question", view: "materials-page" },
    {
      identity: "question",
      view: "materials-page",
      books: bookIds[0],
      pageSize: "21",
    },
    {
      identity: "question",
      view: "materials-page",
      books: bookIds[0],
      page: "0",
    },
  ])(
    "routes invalid demand queries to the existing 400 error state: %j",
    async (body) => {
      const value = await bankSourcesResponse(
        new Request("http://localhost/api/studio/problems/sources", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        { "Cache-Control": "no-store" },
      );
      expect(value.status).toBe(400);
      expect(await value.json()).toHaveProperty("error");
    },
  );

  it("dispatches new GET and read-only POST views without changing the existing no-store headers", async () => {
    for (const query of [
      params("picker-groups"),
      params("picker-books"),
      params("picker-book-counts", { grade: "중1" }),
      params("materials-page", { books: bookIds[0] }),
    ]) {
      const headers = { "Cache-Control": "no-store" };
      const get = await bankSourcesResponse(
        new Request(`http://localhost/api/studio/problems/sources?${query}`),
        headers,
      );
      const post = await bankSourcesResponse(
        new Request("http://localhost/api/studio/problems/sources", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.fromEntries(query)),
        }),
        headers,
      );
      expect(get.status).toBe(200);
      expect(post.status).toBe(200);
      expect(get.headers.get("cache-control")).toBe("no-store");
      expect(await get.json()).toEqual(await post.json());
    }
  });
});
