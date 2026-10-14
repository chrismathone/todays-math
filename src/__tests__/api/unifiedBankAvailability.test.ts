/**
 * 🔴 문제은행 P0 — **같은 조건 F 의 수는 어디서 세도 같다** (2026-10-14 · goal-bank-arithmetic-brand §수량).
 *
 *   전역 재고(`GET …/problems/sources`)          D-161 — 다른 필터와 무관. 뜻을 바꾸지 않는다.
 *   현재 조건 가용량(`?view=available`)         held(원문 30) · available(사용 가능 24)
 *   목록 total · 랜덤 고르기 풀 · 구성 풀         available 과 같은 수(같은 `resolveUnifiedBankQuery` + 출제 자격)
 *
 * 이웃 `unifiedBankFilters.test.ts` 와 같은 대역(공유 인메모리 Prisma — 실제 WHERE 를 판정한다)을 쓰고,
 * 그 대역이 모르는 관계 투영(`unit` 글자 · `_count`)만 여기서 채운다. 심는 문항은 표지 글자(`marker`)로 가둔다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { loadUnifiedBank, UnifiedBankQueryError } from "@/lib/unifiedPreview";
import {
  composeUnifiedBankProblems,
  selectUnifiedBankProblems,
} from "@/lib/unifiedBankSelection";
import { loadBankSourceAvailability } from "@/lib/bankSourceAvailability";
import {
  GET as sourcesGET,
  POST as sourcesPOST,
} from "@/app/api/dev/unified/problems/sources/route";
import {
  bankSourceAvailabilitySchema,
  bankSourceCountsSchema,
  type BankSourceAvailability,
} from "@/contracts/bankSource.contract";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  const findUnits = db.unit.findMany.bind(db.unit);
  const findProblems = db.problem.findMany.bind(db.problem);
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
  vi.unstubAllEnvs();
});

const marker = "가용량짝확인";
const U0 = MOCK_UNITS[0].id;
const U1 = MOCK_UNITS[1].id;
const U2 = MOCK_UNITS[2].id;

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

let seq = 0;
async function book(grade = "중1", publisher = "천재교육") {
  seq += 1;
  return db.sourceBook.create({
    data: {
      externalKey: `avail/${publisher}/${grade}/${seq}`,
      kind: "school_textbook",
      publisher,
      author: null,
      title: `${grade} 수학`,
      grade,
      curriculum: "2022",
    },
  });
}
async function material(bookId: string, kind: string) {
  seq += 1;
  return db.sourceMaterial.create({
    data: {
      externalKey: `avail-${seq}`,
      bookId,
      kind,
      kindRaw: kind,
      title: `${kind} ${seq}`,
    },
  });
}

const params = (values: Record<string, string> = {}) =>
  new URLSearchParams({ q: marker, ...values });
const available = (values: Record<string, string> = {}) =>
  loadBankSourceAvailability(params({ view: "available", ...values }));
const tiers = (counts: Partial<DifficultyRatio> = {}): DifficultyRatio =>
  Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, counts[tier] ?? 0]),
  ) as DifficultyRatio;
const sumTiers = (counts: DifficultyRatio) =>
  Object.values(counts).reduce((total, n) => total + n, 0);

/** 30행 — 출제 가능 24 · 잠금 2 · 검수 대기 2 · 반려 1 · 정답 없음 1. 비공개 1 은 어디에도 안 든다. */
async function seedThirty() {
  await many(20);
  await many(4, { difficulty: "응용" });
  await many(2, { directUseAllowed: false });
  await many(2, { reviewStatus: "pending" });
  await plant({ reviewStatus: "rejected" });
  await plant({ answer: MISSING_ANSWER });
  await plant({ pool: "private" });
}

describe("원문 30 · 사용 가능 24 · 담긴 24 — 같은 조건이면 어디서 세도 같다", () => {
  it("보유 30 과 사용 가능 24 를 나란히 내고, 목록 · 랜덤 · 구성이 같은 24 를 본다", async () => {
    await seedThirty();
    const result = await available({ unitIds: U0 });
    expect(bankSourceAvailabilitySchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({ held: 30, available: 24 });

    // 목록 total(검수 상태를 고르지 않음) = 사용 가능
    expect((await loadUnifiedBank(params({ unitIds: U0 }))).total).toBe(24);
    // 검수 상태를 고른 검사 목록은 보유 쪽을 본다 — 고르기 · 구성 · 출력에는 안 쓴다
    expect(
      (await loadUnifiedBank(params({ unitIds: U0, reviewStatus: "pending" })))
        .total,
    ).toBe(2);
    expect(
      await available({ unitIds: U0, reviewStatus: "pending" }),
    ).toMatchObject({ held: 2, available: 0 });

    // 랜덤 고르기의 난이도별 풀 = 난이도 갈래
    const random = await selectUnifiedBankProblems({
      filters: params({ unitIds: U0 }).toString(),
      counts: tiers({ 기본: 1 }),
    });
    expect(sumTiers(random.available)).toBe(24);
    expect(random.available).toEqual(
      Object.fromEntries(
        DIFFICULTY_LADDER.map((tier) => [
          tier,
          result.facets!.difficulties[tier].available,
        ]),
      ),
    );

    // 구성의 차시별 풀 = 차시 갈래 · 24 를 다 담으면 24 가 담긴다
    const composed = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 24 }],
      filters: params().toString(),
    });
    expect(composed.allocations[0]).toEqual({
      unitId: U0,
      requested: 24,
      available: 24,
      actual: 24,
    });
    expect(new Set(composed.problems.map((row) => row.id)).size).toBe(24);
    expect(composed.problems.every((row) => row.eligible)).toBe(true);
    expect(result.facets!.units[U0]).toEqual({ held: 30, available: 24 });
  });

  it("전역 재고는 필터를 받아도 뜻이 안 바뀐다 — 보기를 달라고 해야 가용량이 온다", async () => {
    await seedThirty();
    vi.stubEnv("NODE_ENV", "development");
    const global = await sourcesGET(
      new Request(
        `https://math.example/api/dev/unified/problems/sources?${params({ unitIds: U0, difficulty: "응용" })}`,
      ),
    );
    expect(bankSourceCountsSchema.safeParse(await global.json()).success).toBe(
      true,
    );
    const scoped = await sourcesGET(
      new Request(
        `https://math.example/api/dev/unified/problems/sources?${params({ view: "available", version: "1", unitIds: U0, difficulty: "응용" })}`,
      ),
    );
    expect(scoped.status).toBe(200);
    expect(
      bankSourceAvailabilitySchema.parse(await scoped.json()),
    ).toMatchObject({ held: 4, available: 4 });
  });
});

describe("갈래(facet)는 자기 축만 빼고 센다", () => {
  it("차시 · 난이도 · 출처 갈래가 각자 자기 축만 풀고 나머지 조건은 지킨다", async () => {
    await many(3, { unitId: U0 });
    await many(2, { unitId: U1 });
    await plant({ unitId: U1, directUseAllowed: false });
    await many(2, { unitId: U0, difficulty: "응용" });
    await plant({ unitId: U0, source: "past_exam" });
    await plant({ unitId: U2, source: "past_exam", reviewStatus: "pending" });

    const result = await available({
      unitIds: U0,
      difficulty: "기본",
      sourceGroup: "engine",
    });
    // F 자체: U0 · 기본 · 엔진
    expect(result).toMatchObject({ held: 3, available: 3 });
    const facets = result.facets!;
    // 차시 갈래는 차시 고르기만 푼다 — 기본 · 엔진은 지킨다
    expect(facets.units).toEqual({
      [U0]: { held: 3, available: 3 },
      [U1]: { held: 3, available: 2 },
    });
    // 난이도 갈래는 난이도만 푼다 — U0 · 엔진은 지킨다
    expect(facets.difficulties.기본).toEqual({ held: 3, available: 3 });
    expect(facets.difficulties.응용).toEqual({ held: 2, available: 2 });
    expect(facets.difficulties.연산).toEqual({ held: 0, available: 0 });
    // 출처 갈래는 출처 축만 푼다 — U0 · 기본은 지킨다
    expect(facets.sources.engine).toEqual({ held: 3, available: 3 });
    expect(facets.sources.past_exam).toEqual({ held: 1, available: 1 });
    expect(facets.sources.total).toEqual({ held: 4, available: 4 });
    // 각 축은 문항당 값 하나 — 갈래 합 = 합집합
    const union = await available({
      difficulty: "기본",
      sourceGroup: "engine",
    });
    expect(union.available).toBe(
      Object.values(facets.units).reduce((n, t) => n + t.available, 0),
    );
  });

  it("교과서 갈래는 책 · 자료 종류별로 보유 · 사용 가능을 싣고, 자료 없는 교과서 문항은 합에만 든다", async () => {
    const kim = await book("중1", "천재교육");
    const ryu = await book("중2", "YBM");
    const unitTest = await material(kim.id, "대단원 평가");
    const form = await material(kim.id, "형성 평가");
    const ryuTest = await material(ryu.id, "대단원 평가");
    const textbook = (sourceMaterialId: string | null, patch = {}) =>
      plant({ source: "school_textbook", sourceMaterialId, ...patch });
    await textbook(unitTest.id);
    await textbook(unitTest.id, { directUseAllowed: false });
    await textbook(form.id);
    await textbook(ryuTest.id, { reviewStatus: "pending" });
    await textbook(null);
    await plant(); // 엔진 — 교과서 갈래에 안 든다

    // 출처를 엔진으로 골라 두어도 교과서 갈래는 출처 축을 풀고 센다(창은 초안을 고른다)
    const result = await available({ sourceGroup: "engine" });
    expect(result).toMatchObject({ held: 1, available: 1 });
    const { textbook: counts } = result.facets!;
    expect(counts).toMatchObject({ held: 5, available: 3 });
    expect(counts.books).toEqual(
      [
        {
          id: kim.id,
          held: 3,
          available: 2,
          kinds: {
            "대단원 평가": { held: 2, available: 1 },
            "형성 평가": { held: 1, available: 1 },
          },
        },
        {
          id: ryu.id,
          held: 1,
          available: 0,
          kinds: { "대단원 평가": { held: 1, available: 0 } },
        },
      ].sort((a, b) => a.id.localeCompare(b.id)),
    );

    // 책 × 종류를 실제로 고른 목록 total 과 같다
    const picked = params({
      sourceGroup: "school_textbook",
      books: kim.id,
      materialKinds: "대단원 평가",
    });
    expect((await loadUnifiedBank(picked)).total).toBe(1);
    expect(
      (
        await loadBankSourceAvailability(
          new URLSearchParams([...picked, ["view", "available"]]),
        )
      ).available,
    ).toBe(1);
  });
});

/** 조건 조합 — 축마다 몇 값. 이 곱 전부에서 가용량 = 목록 = 랜덤 = 구성. */
const VARIANTS: Record<string, string>[] = [];
for (const unitIds of ["", U0, `${U0},${U1}`])
  for (const difficulty of ["", "기본", "응용"])
    for (const sourceGroup of ["", "engine", "past_exam", "other"])
      for (const hasFigure of ["", "true"])
        VARIANTS.push(
          Object.fromEntries(
            Object.entries({
              unitIds,
              difficulty,
              sourceGroup,
              hasFigure,
            }).filter(([, value]) => value),
          ),
        );

describe("🔴 짝 — 조건 조합 전부에서 가용량 · 목록 total · 랜덤 풀 · 구성 풀이 같다", () => {
  it(`${VARIANTS.length}개 조합`, async () => {
    const units = [U0, U1, U2];
    const sources = ["manual", "past_exam", "transformed", "ai_generated"];
    const difficulties = ["기본", "응용", "연산"];
    const states: Record<string, unknown>[] = [
      {},
      {},
      { directUseAllowed: false },
      { reviewStatus: "pending" },
      { answer: MISSING_ANSWER },
      { pool: "private" },
    ];
    let n = 0;
    for (const unitId of units)
      for (const source of sources)
        for (const difficulty of difficulties) {
          n += 1;
          await plant({
            unitId,
            source,
            difficulty,
            ...(n % 3 === 0 ? { figureSvg: "<svg viewBox='0 0 1 1'/>" } : {}),
            ...states[n % states.length],
          });
        }
    const excluded = (
      await db.problem.findMany({
        where: { content: marker, unitId: U0 },
        select: { id: true },
      })
    )[0]!.id;

    for (const variant of VARIANTS)
      for (const excludeIds of ["", excluded]) {
        const filters: Record<string, string> = {
          ...variant,
          ...(excludeIds ? { excludeIds } : {}),
        };
        const label = JSON.stringify(filters);
        const scoped = await available(filters);
        // 목록 total
        expect((await loadUnifiedBank(params(filters))).total, label).toBe(
          scoped.available,
        );
        // 랜덤 고르기 — 난이도는 고르기 쪽이 정하므로 F 에서 빼고 난이도 갈래와 맞댄다
        const { difficulty, ...rest } = filters;
        const random = await selectUnifiedBankProblems({
          filters: params(rest).toString(),
          counts: tiers({ 기본: 1 }),
        });
        const facetsWithoutDifficulty = scoped.facets!.difficulties;
        for (const tier of DIFFICULTY_LADDER)
          expect(random.available[tier], `${label} ${tier}`).toBe(
            facetsWithoutDifficulty[tier].available,
          );
        if (difficulty)
          expect(
            random.available[difficulty as keyof DifficultyRatio],
            label,
          ).toBe(scoped.available);
        // 구성 — 할당이 차시를 정한다. 고른 차시 각각이 차시 갈래와 같다
        const { unitIds, excludeIds: _skip, ...composeFilters } = filters;
        void _skip;
        const scopedUnits = unitIds ? unitIds.split(",") : [U0, U1, U2];
        const composed = await composeUnifiedBankProblems({
          allocations: scopedUnits.map((unitId) => ({ unitId, count: 1 })),
          excludeIds: excludeIds ? [excludeIds] : [],
          filters: params(composeFilters).toString(),
        });
        for (const allocation of composed.allocations)
          expect(allocation.available, `${label} ${allocation.unitId}`).toBe(
            scoped.facets!.units[allocation.unitId]?.available ?? 0,
          );
        expect(
          composed.allocations.reduce((sum, a) => sum + a.available, 0),
          label,
        ).toBe(
          unitIds
            ? scoped.available
            : Object.values(scoped.facets!.units).reduce(
                (sum, t) => sum + t.available,
                0,
              ),
        );
      }
  });
});

describe("형식 조건 — 본문을 읽어 가르므로 갈래는 세지 않는다(0 이 아니라 null)", () => {
  it("두 수는 목록과 같은 함수로 세고 갈래는 null 이다", async () => {
    await many(3);
    await many(2, {
      content: `${marker}
① 가
② 나
③ 다
④ 라
⑤ 마`,
      answer: "③",
    });
    await plant({ directUseAllowed: false });
    const result: BankSourceAvailability = await available({
      format: "short_answer",
    });
    expect(result.facets).toBeNull();
    expect(result).toMatchObject({ held: 4, available: 3 });
    expect(result.available).toBe(
      (await loadUnifiedBank(params({ format: "short_answer" }))).total,
    );
  });
});

describe("요청의 모양", () => {
  it("모르는 보기 · 다른 판 · 틀린 조건은 400 — 조용히 0 을 내지 않는다", async () => {
    await expect(
      loadBankSourceAvailability(params({ view: "everything" })),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
    await expect(available({ version: "2" })).rejects.toBeInstanceOf(
      UnifiedBankQueryError,
    );
    await expect(
      available({ sourceGroup: "engine", books: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(UnifiedBankQueryError);
    vi.stubEnv("NODE_ENV", "development");
    const bad = await sourcesGET(
      new Request(
        "https://math.example/api/dev/unified/problems/sources?view=available&version=9",
      ),
    );
    expect(bad.status).toBe(400);
  });

  it("긴 차시 고르기는 POST 본문으로 — 보기 없는 POST 는 400, 운영 빌드에서는 dev 짝이 닫힌다", async () => {
    await many(2);
    vi.stubEnv("NODE_ENV", "development");
    const post = (body: unknown) =>
      sourcesPOST(
        new Request("https://math.example/api/dev/unified/problems/sources", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    const ok = await post({ view: "available", q: marker, unitIds: U0 });
    expect(ok.status).toBe(200);
    expect(bankSourceAvailabilitySchema.parse(await ok.json()).available).toBe(
      2,
    );
    expect((await post({ q: marker })).status).toBe(400);
    vi.stubEnv("NODE_ENV", "production");
    expect((await post({ view: "available" })).status).toBe(404);
  });
});

describe("구성 — 목록과 같은 조건을 받는다", () => {
  it("출처 · 난이도 조건을 지키고 출제 불가 행은 검수 상태를 골라도 담지 않는다", async () => {
    const engine = await many(2);
    await plant({ source: "past_exam" });
    await plant({ difficulty: "응용" });
    await plant({ reviewStatus: "pending" });
    const composed = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 5 }],
      filters: params({ sourceGroup: "engine", difficulty: "기본" }).toString(),
    });
    expect(composed.problems.map((row) => row.id).sort()).toEqual(
      engine.map((row) => row.id).sort(),
    );
    expect(composed.allocations[0]).toMatchObject({ available: 2, actual: 2 });
    const inspected = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 5 }],
      filters: params({ reviewStatus: "pending" }).toString(),
    });
    expect(inspected.problems).toEqual([]);
  });

  it("필터에 범위(차시 · id)를 실으면 할당과 겹치므로 400", async () => {
    for (const key of ["unitIds", "unitFrom", "unitTo", "ids"])
      await expect(
        composeUnifiedBankProblems({
          allocations: [{ unitId: U0, count: 1 }],
          filters: params({ [key]: U1 }).toString(),
        }),
      ).rejects.toBeInstanceOf(UnifiedBankQueryError);
  });

  it("형식 조건을 랜덤 고르기와 같이 지킨다", async () => {
    const short = await plant();
    await many(2, {
      content: `${marker}
① 가
② 나
③ 다
④ 라
⑤ 마`,
      answer: "③",
    });
    const filters = params({ format: "short_answer" }).toString();
    const composed = await composeUnifiedBankProblems({
      allocations: [{ unitId: U0, count: 5 }],
      filters,
    });
    expect(composed.problems.map((row) => row.id)).toEqual([short.id]);
    expect(composed.allocations[0]).toMatchObject({ available: 1, actual: 1 });
    const random = await selectUnifiedBankProblems({
      filters,
      counts: tiers({ 기본: 5 }),
    });
    expect(random.available.기본).toBe(1);
  });
});
