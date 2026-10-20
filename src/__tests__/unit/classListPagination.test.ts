import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { MOCK_CLASS_A, MOCK_STUDENT_1 } from "@/mocks/data";
import { fetchClasses, fetchStudents } from "@/lib/class/classApi";

const id = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

describe("complete class and roster reads", () => {
  it("continues from the teaching first page without re-reading it, including a direct target on page two", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...MOCK_CLASS_A,
      id: id(index + 1),
      name: `반 ${index + 1}`,
    }));
    const pages: number[] = [];
    server.use(
      http.get("/api/classes", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        pages.push(page);
        return HttpResponse.json({
          data: rows.slice((page - 1) * 100, page * 100),
          meta: { page, pageSize: 100, total: rows.length },
        });
      }),
    );
    const firstPage = {
      data: rows.slice(0, 100),
      meta: { page: 1, pageSize: 100, total: rows.length },
    };
    expect(await fetchClasses({ firstPage })).toEqual(rows);
    expect(pages).toEqual([2]);
  });

  it("honors cancellation before using a first page or requesting another page", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchClasses({
        signal: controller.signal,
        firstPage: {
          data: [MOCK_CLASS_A],
          meta: { page: 1, pageSize: 100, total: 101 },
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("reads the 101st class instead of silently truncating a direct target", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...MOCK_CLASS_A,
      id: id(index + 1),
      name: `반 ${index + 1}`,
    }));
    const pages: number[] = [];
    server.use(
      http.get("/api/classes", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        pages.push(page);
        return HttpResponse.json({
          data: rows.slice((page - 1) * 100, page * 100),
          meta: { page, pageSize: 100, total: 101 },
        });
      }),
    );
    expect((await fetchClasses()).at(-1)?.id).toBe(id(101));
    expect(pages).toEqual([1, 2]);
  });

  it("reads the whole current roster, with its class scope on every page", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      ...MOCK_STUDENT_1,
      id: id(index + 1),
    }));
    server.use(
      http.get("/api/students", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(query.get("classId")).toBe(MOCK_STUDENT_1.classId);
        const page = Number(query.get("page"));
        return HttpResponse.json({
          data: rows.slice((page - 1) * 100, page * 100),
          meta: { page, pageSize: 100, total: 101 },
        });
      }),
    );
    expect(await fetchStudents(MOCK_STUDENT_1.classId)).toHaveLength(101);
  });

  it("rejects an incomplete list rather than presenting it as all classes", async () => {
    server.use(
      http.get("/api/classes", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json({
          data: page === 1 ? [MOCK_CLASS_A] : [],
          meta: { page, pageSize: 100, total: 2 },
        });
      }),
    );
    await expect(fetchClasses()).rejects.toThrow("전체 목록");
  });
});
