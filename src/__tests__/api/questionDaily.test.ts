import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "강사",
  })),
}));
import { POST } from "@/app/api/tests/generate/route";
import { PUT } from "@/app/api/tests/[id]/problems/[seq]/route";
import { db } from "@/lib/db";
import { MOCK_CLASSES, MOCK_PROBLEMS } from "@/mocks/data";

const unitId = MOCK_PROBLEMS[0].unitId;
const ids = MOCK_PROBLEMS.slice(0, 3).map((p) => p.id);
const request = (formats: unknown, count = 2) =>
  new NextRequest("http://localhost/api/tests/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      classId: MOCK_CLASSES[0].id,
      testType: "review",
      testDate: "2026-10-18",
      problemCount: count,
      rangeStartUnitId: unitId,
      rangeEndUnitId: unitId,
      formats,
    }),
  });
beforeEach(async () => {
  for (const [i, id] of ids.entries()) {
    const question = `$${i + 1}+${4 - i}$을 구하시오.`;
    await db.problem.update({
      where: { id },
      data: {
        unitId,
        difficulty: "기본",
        familyKey: `format-case-${i}`,
        questionGroupKey: null,
        content: i < 2 ? `${question}\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5` : question,
        answer: i < 2 ? "⑤" : "5",
        questionType: i < 2 ? "객관식" : "단답형",
        solution: "합은5",
        reviewStatus: "approved",
        directUseAllowed: true,
        pool: "shared",
      },
    });
  }
});
describe("daily/review issuance formats", () => {
  it("issues actual choice rows and keeps that format on replacement", async () => {
    const response = await POST(
      request({ 객관식: 1, 단답형: 0, 서술형: 0 }, 1),
    );
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.data.problems[0].problem.questionType).toBe("객관식");
    expect(created.data.problems[0].problem.answer).toBe("⑤");
    const id = created.data.test.id;
    const changed = await PUT(
      new NextRequest(`http://localhost/api/tests/${id}/problems/1`, {
        method: "PUT",
      }),
      { params: Promise.resolve({ id, seq: "1" }) },
    );
    expect(changed.status).toBe(200);
    const body = await changed.json();
    expect(body.data.problem.problem.questionType).toBe("객관식");
    expect(body.data.problem.problem.id).not.toBe(
      created.data.problems[0].problem.id,
    );
  });
  it("reports unavailable reasoning format rather than filling with short answers", async () => {
    const response = await POST(request({ 객관식: 0, 단답형: 0, 서술형: 2 }));
    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toContain("형식");
  });
  it("rejects a format allocation whose sum differs from the requested size", async () => {
    const response = await POST(
      request({ 객관식: 1, 단답형: 0, 서술형: 0 }, 2),
    );
    expect(response.status).toBe(400);
  });
});
