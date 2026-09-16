/**
 * 🔴 RED → 🟢 — 시험지의 «어느 아침 기록이 만들었나» 칸 (`test.auto_draft_run_id`, D-133 ⑴).
 *
 * 구현: src/lib/tests/generateDraftTest.ts (서버 안 인자) · src/app/api/tests/generate/route.ts (단추 길)
 * 스키마: prisma/schema.prisma `Test.autoDraftRunId` · 마이그레이션 `20260917000000_test_auto_draft_run`
 * 브리프: docs/planning/tracks/briefs/plan-screen-followup.md §1.1
 *
 * 무엇을 잠그나
 * 1. 🔴 **단추 길은 NULL** — 「모두 출제」·직접 출제가 부르는 `POST /api/tests/generate` 는 같은 날 아침 회차가
 *    있어도 칸을 비운다. 시각으로 짐작해 붙이면(«그날 마지막 회차») 8시 무렵 손으로 낸 시험지에 «자동 출제»가 붙는다.
 * 2. 🔴 **요청 본문으로는 못 채운다** — 계약이 모르는 칸을 거절한다(400). 밖에서 채울 수 있으면 표지가 거짓말이 된다.
 * 3. 서버 안 인자(`autoDraftRunId`)로만 칸이 선다 — 아침 회차(`runAutoDraft`)만 넘긴다.
 * 4. 가짜 DB 도 FK 를 흉내 낸다 — 없는 회차 id 는 P2003 · 회차를 지우면 시험지는 남고 칸만 빈다(SET NULL).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
    isAdmin: false,
  })),
}));

import { POST as generateTest } from "@/app/api/tests/generate/route";
import { testGenerateResponseSchema } from "@/contracts/test.contract";
import {
  CLASS_A_ID,
  MOCK_REVIEW_RANGE_END_UNIT,
  MOCK_REVIEW_RANGE_START_UNIT,
  MOCK_TEACHER,
  STUDENT_IDS,
} from "@/mocks/data";
import {
  prismaTestDouble,
  resetPrismaTestDouble,
} from "@/mocks/prismaTestDouble";
import { generateDraftTest } from "@/lib/tests/generateDraftTest";

const DAY = "2026-08-21";

/** 「모두 출제」가 보내는 본문과 같은 모양 — 학생별 확인테스트 */
const REVIEW = {
  classId: CLASS_A_ID,
  studentId: STUDENT_IDS[0]!,
  testType: "review" as const,
  testDate: DAY,
  rangeStartUnitId: MOCK_REVIEW_RANGE_START_UNIT.id,
  rangeEndUnitId: MOCK_REVIEW_RANGE_END_UNIT.id,
};

const OWNER = {
  id: MOCK_TEACHER.id,
  email: MOCK_TEACHER.email,
  name: MOCK_TEACHER.name,
  isAdmin: false,
};

function post(body: unknown) {
  return generateTest(
    new NextRequest("http://localhost/api/tests/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** 그날 아침 회차 한 줄 — 합계는 상관없다(칸을 잇는 것만 본다) */
function morningRun() {
  return prismaTestDouble.autoDraftRun.create({
    data: {
      day: new Date(`${DAY}T00:00:00.000Z`),
      targets: 0,
      created: 0,
      skipped: 0,
      skips: [],
    },
  });
}

type LinkedTest = { id: string; autoDraftRunId: string | null };

async function testRow(id: string): Promise<LinkedTest | null> {
  return (await prismaTestDouble.test.findUnique({
    where: { id },
  })) as LinkedTest | null;
}

describe("[D-133] 시험지의 아침 회차 칸 — test.auto_draft_run_id", () => {
  beforeEach(() => {
    resetPrismaTestDouble();
  });

  it("🔴 단추 길(POST /api/tests/generate)로 선 시험지는 칸이 비어 있다 — 같은 날 아침 회차가 있어도", async () => {
    await morningRun();
    const res = await post(REVIEW);
    expect(res.status).toBe(201);
    const body = testGenerateResponseSchema.parse(await res.json());
    const row = await testRow(body.data.test.id);
    expect(row).not.toBeNull();
    expect(row!.autoDraftRunId).toBeNull();
  });

  it("🔴 요청 본문에 회차 id 를 넣으면 거절한다(400) — 시험지가 서지 않는다", async () => {
    const run = await morningRun();
    const before = await prismaTestDouble.test.count();
    const res = await post({ ...REVIEW, autoDraftRunId: run.id });
    expect(res.status).toBe(400);
    expect(await prismaTestDouble.test.count()).toBe(before);
    expect(
      await prismaTestDouble.test.count({ where: { autoDraftRunId: run.id } }),
    ).toBe(0);
  });

  it("응답 계약에는 칸이 없다 — 화면은 daily-review 의 autoDraft 만 본다", async () => {
    const res = await post(REVIEW);
    const json = (await res.json()) as { data: { test: object } };
    expect(Object.keys(json.data.test)).not.toContain("autoDraftRunId");
  });

  it("서버 안 인자로 넘긴 회차 id 만 시험지에 적힌다", async () => {
    const run = await morningRun();
    const res = await generateDraftTest(OWNER, REVIEW, {
      autoDraftRunId: run.id,
    });
    expect(res.status).toBe(201);
    const body = testGenerateResponseSchema.parse(await res.json());
    expect((await testRow(body.data.test.id))!.autoDraftRunId).toBe(run.id);
  });

  it("인자를 안 넘기면 칸이 비어 있다", async () => {
    const res = await generateDraftTest(OWNER, REVIEW);
    const body = testGenerateResponseSchema.parse(await res.json());
    expect((await testRow(body.data.test.id))!.autoDraftRunId).toBeNull();
  });

  it("없는 회차 id 는 FK 가 막는다(P2003) — 시험지도 문항도 남지 않는다", async () => {
    const before = await prismaTestDouble.test.count();
    await expect(
      generateDraftTest(OWNER, REVIEW, {
        autoDraftRunId: "a0000000-0000-4000-8000-00000000dead",
      }),
    ).rejects.toMatchObject({ code: "P2003" });
    expect(await prismaTestDouble.test.count()).toBe(before);
  });

  it("회차 행을 지우면 시험지는 남고 칸만 빈다 — ON DELETE SET NULL", async () => {
    const run = await morningRun();
    const res = await generateDraftTest(OWNER, REVIEW, {
      autoDraftRunId: run.id,
    });
    const body = testGenerateResponseSchema.parse(await res.json());
    await prismaTestDouble.autoDraftRun.delete({ where: { id: run.id } });
    const row = await testRow(body.data.test.id);
    expect(row).not.toBeNull();
    expect(row!.autoDraftRunId).toBeNull();
  });
});
