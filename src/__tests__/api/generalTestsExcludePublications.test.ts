/**
 * 월말평가 M1 — 반에 낸 시험(`test.publication_id`)이 «일반 시험» 조회를 바꾸지 않는다(2026-10-17 · 계획서 §9.4 ②).
 *
 * 짝 시험: 같은 요청을 **낸 시험 행을 심기 전과 뒤**에 보내 응답이 글자 그대로 같은지 본다 —
 * 확인테스트 기본 범위 · 반 시험 목록(메인의 «오늘의 테스트») · 주간 지표.
 * 낸 시험 행은 일부러 가장 «이길» 꼴로 심는다: 같은 반 · 반 단위 · `review` · 인쇄됨 · 오늘 날짜 · 가장 뒤 단원까지의 범위.
 * 🔴 조건(`GENERAL_TESTS`)을 지우면 세 시험이 다 울어야 한다(조건이 실제로 막는지).
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const TEACHER = "10000000-0000-4000-8000-000000000001";
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  })),
}));

import { GET as getMetrics } from "@/app/api/metrics/route";
import { GET as defaultRange } from "@/app/api/tests/default-range/route";
import { GET as listTests } from "@/app/api/tests/route";
import { CLASS_A_ID, CLASS_B_ID, MOCK_UNITS } from "@/mocks/data";
import { seedPublicationTest } from "@/mocks/prismaTestDouble";

const PUBLICATION = "a0000000-0000-4000-8000-0000000000e1";
const get = (handler: (r: NextRequest) => Promise<Response>, url: string) =>
  handler(new NextRequest(`http://localhost${url}`)).then(async (res) => ({
    status: res.status,
    body: await res.json(),
  }));

function seedFor(classId: string) {
  return seedPublicationTest({
    userId: TEACHER,
    classId,
    studentId: null,
    testType: "review",
    rangeStartUnitId: MOCK_UNITS[0]!.id,
    rangeEndUnitId: MOCK_UNITS.at(-1)!.id,
    status: "printed",
    modified: false,
    testDate: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"),
    printedAt: new Date(),
    publicationId: PUBLICATION,
  });
}

describe("반에 낸 시험은 «일반 시험» 조회를 바꾸지 않는다", () => {
  it("확인테스트 기본 범위 — 반 A · 반 B", async () => {
    for (const classId of [CLASS_A_ID, CLASS_B_ID]) {
      const url = `/api/tests/default-range?classId=${classId}`;
      const before = await get(defaultRange, url);
      expect(before.status).toBe(200);
      seedFor(classId);
      expect(await get(defaultRange, url)).toEqual(before);
    }
  });

  it("반 시험 목록 — 메인의 «오늘의 테스트»가 고르는 목록에 섞이지 않는다", async () => {
    const url = "/api/tests?page=1&pageSize=100";
    const before = await get(listTests, url);
    expect(before.status).toBe(200);
    const id = seedFor(CLASS_A_ID);
    const after = await get(listTests, url);
    expect(after).toEqual(before);
    expect(JSON.stringify(after.body)).not.toContain(id);
  });

  it("주간 지표 — 인쇄한 시험 수에 세지 않는다", async () => {
    const url = "/api/metrics";
    const before = await get(getMetrics, url);
    expect(before.status).toBe(200);
    seedFor(CLASS_A_ID);
    expect(await get(getMetrics, url)).toEqual(before);
  });
});
