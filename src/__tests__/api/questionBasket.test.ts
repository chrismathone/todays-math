import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "강사",
  })),
}));
import { GET, POST, PATCH } from "@/app/api/basket/route";
import { POST as issue } from "@/app/api/basket/test/route";
import { PATCH as reviewStatus } from "@/app/api/problems/[id]/review-status/route";
import { db } from "@/lib/db";
import {
  QUESTION_REVISION_SELECT,
  questionSelectionOf,
} from "@/lib/problem/questionSelection";
import { MOCK_CLASSES, MOCK_PROBLEMS, USER_TEACHER_ID } from "@/mocks/data";

const sa = MOCK_PROBLEMS[0].id,
  mc = MOCK_PROBLEMS[1].id;
const group = `q:v1:${"a".repeat(64)}`;
const req = (url: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    ...(body
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
async function selection(id: string) {
  const row = await db.problem.findUnique({
    where: { id },
    select: QUESTION_REVISION_SELECT,
  });
  const chosen = questionSelectionOf(row!);
  if (!chosen) throw new Error("fixture has no actual format");
  return chosen;
}
async function seed(id: string, orderIndex: number) {
  await db.basketItem.upsert({
    where: { userId_problemId: { userId: USER_TEACHER_ID, problemId: id } },
    create: { userId: USER_TEACHER_ID, problemId: id, orderIndex },
    update: {},
  });
}
beforeEach(async () => {
  const common = {
    unitId: MOCK_PROBLEMS[0].unitId,
    difficulty: "기본" as const,
    familyKey: "format-fixture",
    questionGroupKey: group,
    content: "$2+3$을 구하시오.",
    answer: "5",
    solution: "$2+3=5$",
    reviewStatus: "approved" as const,
    directUseAllowed: true,
    pool: "shared" as const,
    figureSvg: null,
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
  };
  await db.problem.update({
    where: { id: sa },
    data: { ...common, questionType: "단답형" },
  });
  await db.problem.update({
    where: { id: mc },
    data: {
      ...common,
      questionType: "객관식",
      content: `${common.content}\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5`,
      answer: "⑤",
    },
  });
});

describe("one question in the account basket", () => {
  it("keeps per-expression review status when a grouped preview is approved", async () => {
    for (const id of [sa, mc])
      await db.problem.update({
        where: { id },
        data: { reviewStatus: "pending" },
      });
    const res = await reviewStatus(
      req(`/api/problems/${sa}/review-status?identity=question`, "PATCH", {
        reviewStatus: "approved",
      }),
      { params: Promise.resolve({ id: sa }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(sa);
    expect(body.data.questionId).toBe(group);
    expect(
      body.data.questionFormats.find(
        (r: { problemId: string }) => r.problemId === sa,
      ).state,
    ).toBe("available");
    expect(
      body.data.questionFormats.find(
        (r: { problemId: string }) => r.problemId === mc,
      ).state,
    ).toBe("blocked");
    expect(
      (await db.problem.findUnique({ where: { id: mc } }))?.reviewStatus,
    ).toBe("pending");
  });
  it("shows an old double-format basket as one unresolved question and does not clean it on GET", async () => {
    await seed(sa, 2);
    await seed(mc, 9);
    const grouped = await (
      await GET(req("/api/basket?identity=question", "GET"))
    ).json();
    expect(grouped.data.total).toBe(1);
    expect(grouped.data.conflictCount).toBe(1);
    expect(grouped.data.items[0].conflictProblemIds).toEqual([sa, mc]);
    expect(
      await db.basketItem.count({ where: { userId: USER_TEACHER_ID } }),
    ).toBe(2);
    const changed = await PATCH(
      req("/api/basket", "PATCH", {
        fromProblemId: sa,
        selection: await selection(mc),
      }),
    );
    expect(changed.status).toBe(200);
    const body = await changed.json();
    expect(body.data.total).toBe(1);
    expect(body.data.conflictCount).toBe(0);
    expect(body.data.items[0].problem.id).toBe(mc);
    expect(body.data.items[0].orderIndex).toBe(2);
    expect(body.data.items[0].problem.answer).toBe("⑤");
  });
  it("rejects an alternate format as an extra item; an explicit switch preserves its seat", async () => {
    const first = await POST(
      req("/api/basket", "POST", {
        identity: "question",
        problemId: sa,
        selection: await selection(sa),
      }),
    );
    expect(first.status).toBe(200);
    const duplicate = await POST(
      req("/api/basket", "POST", {
        identity: "question",
        problemId: mc,
        selection: await selection(mc),
      }),
    );
    expect(duplicate.status).toBe(409);
    const changed = await PATCH(
      req("/api/basket", "PATCH", {
        fromProblemId: sa,
        selection: await selection(mc),
      }),
    );
    expect(changed.status).toBe(200);
    const body = await changed.json();
    expect(body.data.total).toBe(1);
    expect(body.data.items[0].orderIndex).toBe(1);
  });
  it("keeps the basket and creates no test when the actual selection became stale", async () => {
    await seed(sa, 1);
    const chosen = await selection(sa);
    await db.problem.update({ where: { id: sa }, data: { answer: "9" } });
    const res = await issue(
      req("/api/basket/test", "POST", {
        classId: MOCK_CLASSES[0].id,
        testDate: "2026-10-18",
        identity: "question",
        selections: [chosen],
      }),
    );
    expect(res.status).toBe(409);
    expect(
      await db.basketItem.count({ where: { userId: USER_TEACHER_ID } }),
    ).toBe(1);
    expect(
      await db.test.count({
        where: {
          userId: USER_TEACHER_ID,
          testDate: new Date("2026-10-18T00:00:00.000Z"),
        },
      }),
    ).toBe(0);
  });
  it("blocks duplicate-format issuance even for a legacy request without new metadata", async () => {
    await seed(sa, 1);
    await seed(mc, 2);
    const res = await issue(
      req("/api/basket/test", "POST", {
        classId: MOCK_CLASSES[0].id,
        testDate: "2026-10-18",
      }),
    );
    expect(res.status).toBe(422);
    expect(
      await db.basketItem.count({ where: { userId: USER_TEACHER_ID } }),
    ).toBe(2);
  });
});
