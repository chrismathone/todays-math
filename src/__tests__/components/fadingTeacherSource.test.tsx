import { describe, expect, it, vi } from "vitest";
import { fadingCatalog } from "@/lib/fading/catalog";
import { buildTeacherWireFixture } from "@/components/fading/teacher/fixture";
import { createTeacherFadingApiSource } from "@/components/fading/teacher/apiSource";
import { createTeacherFixtureSource } from "@/components/fading/teacher/fixtureSource";
import { TeacherFadingSourceError } from "@/components/fading/teacher/source";

const fixture = buildTeacherWireFixture(fadingCatalog());
const branchId = fixture.dashboard.management!.branchId!;
describe("교사 현황 읽기 구현", () => {
  it("명단·상세를 GET으로만 읽으며 지점·반 범위를 전달한다", async () => {
    const row = fixture.dashboard.students[0]!;
    const local = createTeacherFixtureSource(fixture);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(await local.getDashboard()))
      .mockResolvedValueOnce(
        Response.json(await local.getStudent(row.id, row.classId)),
      );
    const source = createTeacherFadingApiSource({
      branchId,
      fetcher,
    });
    expect(await source.getDashboard()).toEqual(await local.getDashboard());
    expect(await source.getStudent(row.id, row.classId)).toEqual(
      await local.getStudent(row.id, row.classId),
    );
    const [url, options] = fetcher.mock.calls[1]!;
    expect(url).toBe(
      `/api/students/${row.id}/math-srs/fading?branchId=${branchId}&classId=${row.classId}`,
    );
    expect(options).toEqual({ method: "GET", cache: "no-store" });
  });
  it.each([403, 404, 500])("HTTP %s를 상태로 보존한다", async (status) => {
    const source = createTeacherFadingApiSource({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status })),
    });
    await expect(source.getDashboard()).rejects.toEqual(
      new TeacherFadingSourceError(status),
    );
  });
  it("계약을 벗어난 응답은 성공으로 취급하지 않는다", async () => {
    const source = createTeacherFadingApiSource({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ data: { ...fixture.dashboard, extraScore: 99 } }),
        ),
    });
    await expect(source.getDashboard()).rejects.toThrow();
  });
});
