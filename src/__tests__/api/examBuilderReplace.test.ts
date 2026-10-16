/**
 * 시험지 만들기 «문항 교체»(W3 · Hi-fi 1)의 첫 층 «같은 문항류» — `familyOf=<문항 id>`.
 *
 *   ⑴ 같은 `(unitId, familyKey)` 의 다른 문항 — 바꾸는 문항 자신은 빠진다.
 *   ⑵ 다른 단원의 같은 키 문자열은 다른 류다(D-111 ⑴).
 *   ⑶ 키가 없는(NULL · 빈 값) 문항은 혼자다 — 형제가 없다(D-105 · D-111 ⑵). NULL 끼리 묶지 않는다.
 *   ⑷ 다른 조건(최근 출제 빼기 · 다른 자리의 문항류 빼기)과 함께 걸린다 — 바꾸는 자리의 문항류는 남는다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { loadUnifiedBank, UnifiedBankQueryError } from "@/lib/unifiedPreview";
import { bankQueryContext } from "@/lib/bankQueryContext";
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

const marker = "교체층확인";
const U0 = MOCK_UNITS[0].id;
const U1 = MOCK_UNITS[1].id;

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
      difficulty: "응용",
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
const list = (values: Record<string, string>, recentOwner?: string) =>
  loadUnifiedBank(
    new URLSearchParams({ q: marker, pageSize: "50", ...values }),
    recentOwner ? bankQueryContext(recentOwner, "2026-10-16") : undefined,
  );
const ids = (rows: readonly { id: string }[]) =>
  rows.map((row) => row.id).sort();

describe("같은 문항류 층 — familyOf", () => {
  it("같은 (단원, 문항류)의 다른 문항만 — 자신과 다른 단원의 같은 키는 빠진다", async () => {
    const original = await plant({ familyKey: "mid:1|A|01" });
    const siblings = [
      await plant({ familyKey: "mid:1|A|01" }),
      await plant({ familyKey: " mid:1|A|01 " }),
    ];
    await plant({ familyKey: "mid:1|B|01" });
    await plant({ unitId: U1, familyKey: "mid:1|A|01" });
    await plant();
    const result = await list({ familyOf: original.id });
    expect(ids(result.problems)).toEqual(ids(siblings));
  });

  it("키가 없는 문항은 형제가 없다 — NULL 끼리 묶지 않는다", async () => {
    const original = await plant();
    await plant();
    await plant({ familyKey: "" });
    const result = await list({ familyOf: original.id });
    expect(result.problems).toEqual([]);
  });

  it("최근 출제 빼기 · 다른 자리의 문항류 빼기와 함께 걸리고, 바꾸는 자리의 문항류는 남는다", async () => {
    const original = await plant({ familyKey: "mid:1|A|01" });
    const kept = await plant({ familyKey: "mid:1|A|01" });
    const recent = await plant({ familyKey: "mid:1|A|01" });
    const otherSlot = await plant({ familyKey: "mid:1|B|01" });
    const test = await db.test.create({
      data: {
        userId: USER_TEACHER_ID,
        classId: CLASS_OTHER_ID,
        testType: "daily",
        rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
        status: "draft",
        testDate: new Date("2026-10-12T00:00:00Z"),
      },
    });
    await db.testProblem.create({
      data: {
        testId: test.id,
        problemId: recent.id,
        orderIndex: 1,
        replaced: false,
      },
    });
    const result = await list(
      {
        familyOf: original.id,
        recent: "1",
        excludeIds: [original.id, otherSlot.id].join(","),
        excludeFamiliesOf: otherSlot.id,
      },
      USER_TEACHER_ID,
    );
    expect(ids(result.problems)).toEqual([kept.id]);
  });

  it("문항 id 꼴이 아니면 거절한다", async () => {
    await expect(list({ familyOf: "not-an-id" })).rejects.toBeInstanceOf(
      UnifiedBankQueryError,
    );
  });
});
