/**
 * 🔴 D-111 — **한 시험지에 같은 문항류(`(unitId, familyKey)`)는 1개만**, 시험지 만들기(문제은행 경로)에도.
 *
 * 일일테스트 경로(`balanceDifficulty` · 교체)에는 걸려 있었는데 시험지 만들기의 은행 경로
 * (구성 · 난이도별 랜덤 · 추가/교체 후보 · 가용량)는 행 단위로만 골라 같은 갈래가 나란히 들어갈 수 있었다.
 *
 *   ⑴ 정체는 `(unitId, familyKey)` — 다른 단원의 같은 키는 접지 않는다.
 *   ⑵ 키가 없으면(NULL · 빈 값) 각자 혼자다 — NULL 을 한 무리로 묶지 않는다.
 *   ⑶ 시험지에 이미 있는 갈래는 후보 · 고르기에서 빠진다 — 교체하는 그 자리의 갈래만은 남는다.
 *   ⑷ 고르기를 막는 수(`available` · 차시별 가용량)는 행이 아니라 «갈래» 수다 — 다른 범위로 채우지 않는다.
 *
 * 이웃 `unifiedBankAvailability.test.ts` 와 같은 대역(공유 인메모리 Prisma — 실제 WHERE 를 판정한다).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import {
  composeUnifiedBankProblems,
  selectUnifiedBankProblems,
} from "@/lib/unifiedBankSelection";
import { loadBankSourceAvailability } from "@/lib/bankSourceAvailability";
import { bankSourceAvailabilitySchema } from "@/contracts/bankSource.contract";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { familyIdOf } from "@/lib/generator/familyKey";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  const findUnits = db.unit.findMany.bind(db.unit);
  vi.spyOn(db.unit, "findMany").mockImplementation((async (
    args: Parameters<typeof db.unit.findMany>[0],
  ) => {
    const units = await findUnits(args);
    if (!args?.select?._count) return units as never;
    const count = args.select._count as {
      select: { problems: { where: object } };
    };
    return (await Promise.all(
      units.map(async (unit) => ({
        ...unit,
        _count: {
          problems: await db.problem.count({
            where: { AND: [count.select.problems.where, { unitId: unit.id }] },
          }),
        },
      })),
    )) as never;
  }) as typeof db.unit.findMany);
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
});
afterEach(() => {
  vi.restoreAllMocks();
});

const marker = "문항류하나확인";
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
const params = (values: Record<string, string> = {}) =>
  new URLSearchParams({ q: marker, ...values });
const tiers = (counts: Partial<DifficultyRatio> = {}): DifficultyRatio =>
  Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, counts[tier] ?? 0]),
  ) as DifficultyRatio;
/** 서버가 돌려준 행(`BankProblem` — 타입에는 없지만 `unitId` 를 싣는다)의 문항류. */
const families = (rows: readonly object[]) =>
  (rows as { id: string; unitId: string; familyKey?: string | null }[]).map(
    familyIdOf,
  );
const unitOf = (row: object) => (row as { unitId: string }).unitId;

/** U0: 갈래 A 3행 · 갈래 B 2행 · 키 없음 2행(각자 혼자) — 7행 · 4갈래. */
async function seedUnit() {
  const a = await many(3, { familyKey: "mid:1|A|01" });
  const b = await many(2, { familyKey: "mid:1|B|01" });
  const legacy = await many(2, { familyKey: null });
  return { a, b, legacy };
}

describe("구성 — 한 차시 안에서 갈래당 1문항", () => {
  it("행 7 · 갈래 4 인 차시에서 6문항을 달라면 4문항만 낸다 · 부족은 갈래로 말하고 다른 범위로 채우지 않는다", async () => {
    const { legacy } = await seedUnit();
    await many(3, { unitId: U1, familyKey: "mid:1|C|01" });
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 6 }],
      filters: params().toString(),
    });
    expect(result.allocations).toEqual([
      { unitId: U0, requested: 6, available: 4, actual: 4 },
    ]);
    const ids = families(result.problems);
    expect(new Set(ids).size).toBe(4);
    expect(result.problems.every((row) => unitOf(row) === U0)).toBe(true);
    // 키 없는 레거시 둘은 한 무리로 접히지 않고 둘 다 들어간다
    for (const row of legacy)
      expect(result.problems.map((p) => p.id)).toContain(row.id);
  });

  it("다른 단원의 같은 키 문자열은 다른 갈래다 — 접지 않는다", async () => {
    const left = await plant({ familyKey: "mid:1|같은키|01" });
    const right = await plant({ unitId: U1, familyKey: "mid:1|같은키|01" });
    const result = await composeUnifiedBankProblems({
      allocations: [
        { unitId: U0, count: 1 },
        { unitId: U1, count: 1 },
      ],
      filters: params().toString(),
    });
    expect(result.problems.map((p) => p.id).sort()).toEqual(
      [left.id, right.id].sort(),
    );
  });

  it("시험지에 이미 있는 문항(excludeIds)의 갈래는 고르지 않는다", async () => {
    const { a, b } = await seedUnit();
    const result = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 6 }],
      excludeIds: [a[0].id],
      filters: params().toString(),
    });
    expect(result.allocations[0]).toMatchObject({ available: 3, actual: 3 });
    const picked = result.problems.map((p) => p.id);
    for (const row of a) expect(picked).not.toContain(row.id);
    expect(picked.filter((id) => b.some((row) => row.id === id))).toHaveLength(
      1,
    );
  });
});

describe("난이도별 랜덤 — 난이도를 가로질러 갈래당 1문항", () => {
  it("한 갈래가 두 난이도에 걸쳐 있어도 한 번만 · 난이도별 가능 수는 갈래 수", async () => {
    // 갈래 A: 기본 2 · 응용 1 / 갈래 B: 응용 2 / 레거시: 기본 2
    const aBasic = await many(2, { familyKey: "mid:1|A|01" });
    const aApplied = await plant({
      familyKey: "mid:1|A|01",
      difficulty: "응용",
    });
    await many(2, { familyKey: "mid:1|B|01", difficulty: "응용" });
    await many(2, { familyKey: null });
    const result = await selectUnifiedBankProblems({
      filters: params({ unitIds: U0 }).toString(),
      counts: tiers({ 기본: 5, 응용: 5 }),
    });
    expect(result.available).toEqual(tiers({ 기본: 3, 응용: 2 }));
    const ids = families(result.problems);
    expect(new Set(ids).size).toBe(ids.length);
    const aIds = [...aBasic, aApplied].map((row) => row.id);
    expect(result.problems.filter((p) => aIds.includes(p.id))).toHaveLength(1);
    // A 를 기본에서 썼으면 응용은 B 하나뿐이다 — 행으로는 3 이지만 갈래로는 2 → 합 4
    expect(result.problems).toHaveLength(4);
  });

  it("시험지에 담긴 문항의 갈래는 랜덤으로 다시 들어오지 않는다", async () => {
    const { a, legacy } = await seedUnit();
    const result = await selectUnifiedBankProblems({
      filters: params({ unitIds: U0 }).toString(),
      counts: tiers({ 기본: 10 }),
      excludeIds: [a[0].id, legacy[0].id],
    });
    // B · 남은 레거시 하나 — A 는 시험지에 있다
    expect(result.available).toEqual(tiers({ 기본: 2 }));
    const picked = result.problems.map((p) => p.id);
    for (const row of a) expect(picked).not.toContain(row.id);
    expect(picked).toContain(legacy[1].id);
  });
});

describe("추가 · 교체 후보 — 시험지의 갈래를 빼되 교체하는 자리는 남긴다", () => {
  it("excludeFamiliesOf 의 갈래는 목록 · 총수에서 빠지고 키 없는 행 · 다른 단원 같은 키는 남는다", async () => {
    const { a, b, legacy } = await seedUnit();
    const otherUnit = await plant({ unitId: U1, familyKey: "mid:1|A|01" });
    const list = await loadUnifiedBank(
      params({
        unitIds: `${U0},${U1}`,
        excludeIds: a[0].id,
        excludeFamiliesOf: [a[0].id, legacy[0].id].join(","),
        pageSize: "100",
      }),
    );
    const ids = list.problems.map((p) => p.id);
    for (const row of a) expect(ids).not.toContain(row.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        ...b.map((r) => r.id),
        legacy[1].id,
        otherUnit.id,
      ]),
    );
    // 키 없는 행은 «자기 자신»만 갈래다 — 같은 무리로 접혀 다른 레거시를 빼지 않는다
    expect(ids).not.toContain(legacy[0].id);
    expect(list.total).toBe(ids.length);
    expect(list.total).toBe(4);
  });

  it("교체는 그 자리를 갈래 제외에서 뺀다 — 같은 갈래의 형제가 후보로 남는다", async () => {
    const { a, b } = await seedUnit();
    // 시험지: a[0](교체 대상) · b[0]. 교체 후보는 시험지 id 는 다 빼고, 갈래는 b[0] 것만 뺀다.
    const list = await loadUnifiedBank(
      params({
        unitIds: U0,
        excludeIds: [a[0].id, b[0].id].join(","),
        excludeFamiliesOf: b[0].id,
        pageSize: "100",
      }),
    );
    const ids = list.problems.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining([a[1].id, a[2].id]));
    expect(ids).not.toContain(a[0].id);
    for (const row of b) expect(ids).not.toContain(row.id);
  });
});

describe("가용량 — 고르기를 막는 차시별 수는 갈래 수", () => {
  it("families=1 이면 차시별 출제 가능 갈래를 싣고 행 수(available)의 뜻은 그대로다", async () => {
    await seedUnit();
    await many(2, { unitId: U1, familyKey: "mid:1|A|01" });
    await plant({
      unitId: U1,
      familyKey: "mid:1|A|01",
      reviewStatus: "pending",
    });
    const result = await loadBankSourceAvailability(
      params({ view: "available", families: "1" }),
    );
    expect(bankSourceAvailabilitySchema.parse(result)).toEqual(result);
    expect(result.facets!.units[U0]).toEqual({ held: 7, available: 7 });
    expect(result.facets!.unitFamilies).toEqual({ [U0]: 4, [U1]: 1 });

    // 구성의 차시별 available 과 같은 수다
    const composed = await composeUnifiedBankProblems({
      allocations: [
        { unitId: U0, count: 1 },
        { unitId: U1, count: 1 },
      ],
      filters: params().toString(),
    });
    expect(composed.allocations.map((row) => row.available)).toEqual([4, 1]);
  });

  it("families 를 안 달라면 옛 모양 그대로다", async () => {
    await seedUnit();
    const result = await loadBankSourceAvailability(
      params({ view: "available" }),
    );
    expect(result.facets).not.toHaveProperty("unitFamilies");
  });
});
