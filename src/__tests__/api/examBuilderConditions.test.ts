/**
 * 시험지 만들기 «구성 조건»(W4 · Hi-fi 2) — 서버가 지키는 두 조건.
 *
 *   ⑴ 최근 출제 빼기(D-20 그대로) — **지금 계정**의 시험 가운데 시험 날짜가 오늘(KST)부터 14일 전까지인
 *      시험의 문항을 뺀다. 목록(추가 · 교체 후보) · 가용량 · 구성이 같은 조건이다. 문항 id 목록은 브라우저가
 *      싣지 않는다 — 요청은 `recent=1` 하나이고 서버가 계정으로 찾는다.
 *   ⑵ 난이도 의도 — 범위마다 나눈 수 안에서 난이도별 수를 맞춘다. 빈 칸(지정 없음)과 0(내지 않음)은 다르다.
 *      모자란 난이도는 다른 난이도로 채우지 않고 알린다 · 같은 문항류는 난이도를 건너 다시 나오지 않는다(D-111).
 *
 * 이웃 `examBuilderFamilyRule.test.ts` 와 같은 대역(공유 인메모리 Prisma — 실제 WHERE 를 판정한다).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { loadUnifiedBank, UnifiedBankQueryError } from "@/lib/unifiedPreview";
import { composeUnifiedBankProblems } from "@/lib/unifiedBankSelection";
import { loadBankSourceAvailability } from "@/lib/bankSourceAvailability";
import { bankQueryContext, kstToday } from "@/lib/bankQueryContext";
import {
  CLASS_OTHER_ID,
  MOCK_CURRENT_PROGRESS_UNIT,
  MOCK_UNITS,
  USER_TEACHER_ID,
} from "@/mocks/data";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  const findProblems = db.problem.findMany.bind(db.problem);
  vi.spyOn(db.problem, "findMany").mockImplementation((async (
    args: Parameters<typeof db.problem.findMany>[0],
  ) => {
    if (!args?.select?.unit) return (await findProblems(args)) as never;
    const rows = await findProblems({
      ...args,
      select: { ...args.select, unit: false, unitId: true },
    });
    return (await Promise.all(
      rows.map(async (row) => {
        const unit = await db.unit.findUnique({ where: { id: row.unitId } });
        return {
          ...row,
          unit: {
            grade: unit!.grade,
            chapter: unit!.chapter,
            section: unit!.section,
          },
        };
      }),
    )) as never;
  }) as typeof db.problem.findMany);
  const findUnits = db.unit.findMany.bind(db.unit);
  vi.spyOn(db.unit, "findMany").mockImplementation((async (
    args: Parameters<typeof db.unit.findMany>[0],
  ) => {
    const units = await findUnits(args);
    if (!args?.select?._count) return units as never;
    return units.map((unit) => ({ ...unit, _count: { problems: 0 } })) as never;
  }) as typeof db.unit.findMany);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const marker = "구성조건확인";
const U0 = MOCK_UNITS[0].id;
const U1 = MOCK_UNITS[1].id;
const OTHER_USER = "99999999-9999-4999-8999-999999999999";
const TODAY = "2026-10-16";

async function plant(patch: Record<string, unknown> = {}) {
  // exam-wiring: 테스트 — 시험 대역(prismaTestDouble)에 픽스처를 심는다. 실 DB 가 아니다.
  return await db.problem.create({
    data: {
      userId: USER_TEACHER_ID,
      unitId: U0,
      source: "manual",
      content: marker,
      answer: "7",
      solution: "풀이 있음",
      difficulty: "기본",
      problemType: "계산",
      questionType: "단답형",
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
      familyKey: null,
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      ...patch,
    } as never,
  });
}
const many = (n: number, patch: Record<string, unknown> = {}) =>
  Promise.all(Array.from({ length: n }, () => plant(patch)));

/** 시험 하나에 문항들을 싣는다 — 날짜는 `YYYY-MM-DD`. */
async function issued(
  problemIds: string[],
  testDate: string,
  userId = USER_TEACHER_ID,
) {
  const test = await db.test.create({
    data: {
      userId,
      classId: CLASS_OTHER_ID,
      testType: "daily",
      rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
      status: "draft",
      testDate: new Date(`${testDate}T00:00:00Z`),
    },
  });
  for (const [index, problemId] of problemIds.entries())
    await db.testProblem.create({
      data: {
        testId: test.id,
        problemId,
        orderIndex: index + 1,
        replaced: false,
      },
    });
}

const mine = () => bankQueryContext(USER_TEACHER_ID, TODAY);
const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

describe("최근 출제 빼기 — D-20 과 같은 규칙", () => {
  it("오늘(KST)부터 14일 전까지의 내 시험만 뺀다 — 15일 전 · 내일 · 남의 시험은 남긴다", async () => {
    const [today, edge, old, tomorrow, others, fresh] = await many(6);
    await issued([today.id], TODAY);
    await issued([edge.id], "2026-10-02");
    await issued([old.id], "2026-10-01");
    await issued([tomorrow.id], "2026-10-17");
    await issued([others.id], TODAY, OTHER_USER);
    const listed = await loadUnifiedBank(
      new URLSearchParams({ q: marker, recent: "1", pageSize: "50" }),
      mine(),
    );
    expect(ids(listed.problems).sort()).toEqual(
      [old.id, tomorrow.id, others.id, fresh.id].sort(),
    );
    // 끄면(요청에 recent 가 없으면) 아무것도 빼지 않는다
    const all = await loadUnifiedBank(
      new URLSearchParams({ q: marker, pageSize: "50" }),
      mine(),
    );
    expect(all.problems).toHaveLength(6);
  });

  it("계정을 모르는 자리에서 recent=1 을 받으면 조용히 넘기지 않고 거절한다", async () => {
    await expect(
      loadUnifiedBank(new URLSearchParams({ q: marker, recent: "1" })),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
  });

  it("가용량도 같은 조건으로 센다 — 차시별 행 · 문항류 수에서 최근 출제가 빠진다", async () => {
    const a = await many(2, { familyKey: "mid:1|A|01" });
    const b = await plant({ familyKey: "mid:1|B|01" });
    await plant({ unitId: U1 });
    await issued([b.id, a[0].id], "2026-10-10");
    const view = await loadBankSourceAvailability(
      new URLSearchParams({
        view: "available",
        q: marker,
        families: "1",
        recent: "1",
      }),
      mine(),
    );
    expect(view.facets!.units[U0]).toEqual({ held: 1, available: 1 });
    // A 는 형제가 하나 남아 한 갈래로 살아 있고, B 는 통째로 빠졌다
    expect(view.facets!.unitFamilies![U0]).toBe(1);
    expect(view.facets!.unitFamilies![U1]).toBe(1);
  });

  it("구성도 같은 조건으로 고른다 — 빠진 문항은 나오지 않고 부족은 갈래로 말한다", async () => {
    const rows = await many(3);
    await issued([rows[0].id, rows[1].id], "2026-10-15");
    const result = await composeUnifiedBankProblems(
      {
        allocations: [{ unitId: U0, count: 3 }],
        recent: true,
        filters: `q=${marker}`,
      },
      mine(),
    );
    expect(ids(result.problems)).toEqual([rows[2].id]);
    expect(result.allocations[0]).toMatchObject({
      requested: 3,
      available: 1,
      actual: 1,
    });
  });

  it("오늘은 서울 날짜다", () => {
    expect(kstToday(new Date("2026-10-15T15:30:00Z"))).toBe("2026-10-16");
    expect(kstToday(new Date("2026-10-15T14:30:00Z"))).toBe("2026-10-15");
  });
});

describe("난이도 의도 — 범위마다 나눈 수 안에서", () => {
  const tierOf = (row: { difficulty: string }) => row.difficulty;
  const tally = (rows: readonly { difficulty: string }[]) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[tierOf(row)] = (acc[tierOf(row)] ?? 0) + 1;
      return acc;
    }, {});

  it("난이도별 수와 범위별 수를 둘 다 맞춘다", async () => {
    await many(3, { difficulty: "기본" });
    await many(3, { difficulty: "응용" });
    await many(2, { unitId: U1, difficulty: "기본" });
    await many(2, { unitId: U1, difficulty: "응용" });
    const result = await composeUnifiedBankProblems({
      allocations: [
        { unitId: U0, count: 3 },
        { unitId: U1, count: 2 },
      ],
      difficulty: { 기본: 2, 응용: 3 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 기본: 2, 응용: 3 });
    expect(
      result.problems.filter(
        (row) => (row as { unitId?: string }).unitId === U0,
      ),
    ).toHaveLength(3);
    expect(result.difficulty).toEqual([
      { tier: "기본", requested: 2, actual: 2 },
      { tier: "응용", requested: 3, actual: 3 },
    ]);
  });

  it("한 범위에만 있는 난이도는 그 범위로 몬다 — 칸마다 고르게가 아니라 둘 다 맞는 쪽으로", async () => {
    await many(3, { difficulty: "기본" });
    await many(3, { unitId: U1, difficulty: "응용" });
    const result = await composeUnifiedBankProblems({
      allocations: [
        { unitId: U0, count: 3 },
        { unitId: U1, count: 3 },
      ],
      difficulty: { 기본: 3, 응용: 3 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 기본: 3, 응용: 3 });
  });

  it("모자란 난이도는 다른 난이도로 채우지 않고 그 수를 알린다", async () => {
    await many(1, { difficulty: "심화하" });
    await many(5, { difficulty: "기본" });
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 3 }],
      difficulty: { 기본: 1, 심화하: 2 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 기본: 1, 심화하: 1 });
    expect(result.difficulty).toEqual([
      { tier: "기본", requested: 1, actual: 1 },
      { tier: "심화하", requested: 2, actual: 1 },
    ]);
  });

  it("빈 칸(지정 없음)은 남는 자리를 채우고, 0 은 그 난이도를 내지 않는다", async () => {
    await many(4, { difficulty: "연산" });
    await many(4, { difficulty: "기본" });
    await many(4, { difficulty: "응용" });
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 4 }],
      // 연산 0 · 기본 1 · 나머지(응용 · 심화…)는 지정 없음 → 남는 3자리는 응용에서
      difficulty: { 연산: 0, 기본: 1 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 기본: 1, 응용: 3 });
  });

  it("같은 문항류는 난이도를 건너 다시 나오지 않는다(D-111)", async () => {
    await plant({ difficulty: "기본", familyKey: "mid:1|X|01" });
    await plant({ difficulty: "응용", familyKey: "mid:1|X|01" });
    await plant({ difficulty: "응용", familyKey: "mid:1|Y|01" });
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 2 }],
      difficulty: { 기본: 1, 응용: 1 },
      filters: `q=${marker}`,
    });
    const keys = result.problems.map(
      (row) => (row as { familyKey?: string | null }).familyKey,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("난이도 합이 문항 수를 넘거나, 모든 칸을 정했는데 합이 다르면 거절한다", async () => {
    await many(4);
    await expect(
      composeUnifiedBankProblems({
        allocations: [{ unitId: U0, count: 2 }],
        difficulty: { 기본: 3 },
      }),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
    await expect(
      composeUnifiedBankProblems({
        allocations: [{ unitId: U0, count: 2 }],
        difficulty: {
          연산: 0,
          기본: 1,
          응용: 0,
          심화하: 0,
          심화중: 0,
          심화상: 0,
        },
      }),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
  });
});

describe("형식 의도(M3) — 객관식 · 단답형 · 서술형 수", () => {
  const formatOf = (row: unknown) =>
    (row as { questionTypeRaw?: string | null }).questionTypeRaw ?? "?";
  const tally = (rows: readonly unknown[]) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[formatOf(row)] = (acc[formatOf(row)] ?? 0) + 1;
      return acc;
    }, {});
  /** 한 문항류 = 같은 발문의 객관식 · 단답형 두 행(엔진 적재본과 같은 모양). */
  async function families(n: number, patch: Record<string, unknown> = {}) {
    for (let i = 0; i < n; i += 1) {
      const familyKey = `mid:fmt|${String(patch.difficulty ?? "기본")}|${i}`;
      await plant({ familyKey, questionType: "단답형", ...patch });
      await plant({ familyKey, questionType: "객관식", ...patch });
    }
  }

  it("형식별 수를 맞추고, 한 문항류는 한 번만 나온다", async () => {
    await families(5);
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 3 }],
      formats: { 객관식: 2, 단답형: 1 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 객관식: 2, 단답형: 1 });
    const keys = result.problems.map(
      (row) => (row as { familyKey?: string | null }).familyKey,
    );
    expect(new Set(keys).size).toBe(3);
    expect(result.formats).toEqual([
      { format: "객관식", requested: 2, actual: 2 },
      { format: "단답형", requested: 1, actual: 1 },
    ]);
  });

  it("모자란 형식은 다른 형식으로 채우지 않고 그 수를 알린다", async () => {
    await many(3, { questionType: "단답형" });
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 3 }],
      formats: { 객관식: 2, 단답형: 1 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 단답형: 1 });
    expect(result.formats).toEqual([
      { format: "객관식", requested: 2, actual: 0 },
      { format: "단답형", requested: 1, actual: 1 },
    ]);
  });

  it("지정 없음 자리는 정하지 않은 형식에서만 채운다", async () => {
    await families(5);
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 4 }],
      formats: { 객관식: 1 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 객관식: 1, 단답형: 3 });
  });

  it("난이도 의도와 같이 맞춘다", async () => {
    await families(3, { difficulty: "기본" });
    await families(3, { difficulty: "응용" });
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 4 }],
      difficulty: { 기본: 2, 응용: 2 },
      formats: { 객관식: 3, 단답형: 1 },
      filters: `q=${marker}`,
    });
    expect(tally(result.problems)).toEqual({ 객관식: 3, 단답형: 1 });
    expect(
      result.problems.filter((row) => row.difficulty === "기본"),
    ).toHaveLength(2);
  });

  it("형식 합이 문항 수를 넘거나, 세 칸을 다 정했는데 합이 다르면 거절한다", async () => {
    await families(3);
    await expect(
      composeUnifiedBankProblems({
        allocations: [{ unitId: U0, count: 2 }],
        formats: { 객관식: 3 },
      }),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
    await expect(
      composeUnifiedBankProblems({
        allocations: [{ unitId: U0, count: 2 }],
        formats: { 객관식: 1, 단답형: 0, 서술형: 0 },
      }),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
  });
});
