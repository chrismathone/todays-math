// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => {
  const studentId = "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2";
  const otherStudentId = "ee7be323-de24-4c8c-b6d1-1da66f09efdf";
  const classId = "7e7c388b-c264-4d39-809b-527723b8b74b";
  const ownerId = "d56e582b-a5af-4763-8b0a-801ecff4b5a5";
  const otherOwnerId = "6837f42f-9748-42d4-8ac9-f11e5c2b681b";
  const unitId = "3c35064d-3c6a-4b53-9333-7e65992676c8";
  const otherUnitId = "775ac0bc-ea85-4fbf-af08-9b8c41014914";
  const cls = { id: classId, name: "중1 A", userId: ownerId };
  const students = [studentId, otherStudentId].map((id, index) => ({
    id,
    classId,
    name: index ? "민준" : "서연",
    useIndividualProgress: index === 1,
    eywaWithdrawnAt: null,
    createdAt: new Date("2026-01-01"),
    class: cls,
    studentAccount: { id: `account-${index}`, disabledAt: null },
  }));
  const progress = [
    {
      id: "p1",
      classId,
      studentId: null,
      unitId,
      recordedAt: new Date("2026-09-20"),
      createdAt: new Date("2026-09-20"),
    },
    {
      id: "p2",
      classId,
      studentId: otherStudentId,
      unitId: otherUnitId,
      recordedAt: new Date("2026-09-21"),
      createdAt: new Date("2026-09-21"),
    },
  ];
  const units = [
    {
      id: unitId,
      grade: "중1",
      chapter: "방정식",
      section: "등식의 성질",
      orderIndex: 375,
    },
    {
      id: otherUnitId,
      grade: "중1",
      chapter: "방정식",
      section: "일차방정식의 풀이",
      orderIndex: 376,
    },
  ];
  const lectures = [
    {
      id: "d0b879a1-8218-48f0-81dd-b486198fece0",
      title: "등식 강의",
      unitId,
      status: "published",
      videoUrl: "/video",
      sortOrder: 0,
    },
    {
      id: "60795c23-3f9d-40a1-9d8e-c7c5f7918eb7",
      title: "숨긴 강의",
      unitId,
      status: "draft",
      videoUrl: "/video",
      sortOrder: 1,
    },
    {
      id: "0788cf28-dd6f-4adf-a37f-be592d81195c",
      title: "다른 학생 강의",
      unitId: otherUnitId,
      status: "published",
      videoUrl: "/video",
      sortOrder: 0,
    },
  ];
  return {
    studentId,
    otherStudentId,
    ownerId,
    otherOwnerId,
    classId,
    unitId,
    otherUnitId,
    cls,
    students,
    progress,
    units,
    lectures,
    session: null as unknown,
    rows: new Map<
      string,
      { studentId: string; revision: number; payload: unknown }
    >(),
    missingTable: false,
    writes: 0,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => fixture.session) }));
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          fixture.students.find((s) => s.id === where.id) ?? null,
      ),
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { classId?: string; OR?: { classId?: string }[] };
        }) =>
          fixture.students.filter(
            (s) => s.classId === (where.classId ?? where.OR?.[0]?.classId),
          ),
      ),
    },
    class: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === fixture.classId ? fixture.cls : null,
      ),
    },
    progress: {
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: {
            classId?: string;
            studentId?: string | null;
            OR?: { studentId: string | null }[];
          };
        }) =>
          fixture.progress.filter(
            (p) =>
              (!where.classId || p.classId === where.classId) &&
              (!("studentId" in where) || p.studentId === where.studentId) &&
              (!where.OR || where.OR.some((o) => o.studentId === p.studentId)),
          ),
      ),
    },
    unit: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        fixture.units.filter((u) => where.id.in.includes(u.id)),
      ),
    },
    conceptLecture: {
      findMany: vi.fn(
        async ({ where }: { where: { unitId: { in: string[] } } }) =>
          fixture.lectures.filter((l) => where.unitId.in.includes(l.unitId)),
      ),
    },
    studentSrsState: {
      findUnique: async ({ where }: { where: { studentId: string } }) => {
        if (fixture.missingTable) throw { code: "P2021" };
        return structuredClone(fixture.rows.get(where.studentId) ?? null);
      },
      findMany: async ({
        where,
      }: {
        where: { studentId: { in: string[] } };
      }) => {
        if (fixture.missingTable) throw { code: "P2021" };
        return structuredClone(
          [...fixture.rows.values()].filter((s) =>
            where.studentId.in.includes(s.studentId),
          ),
        );
      },
      create: async ({
        data,
      }: {
        data: { studentId: string; revision: number; payload: unknown };
      }) => {
        if (fixture.rows.has(data.studentId)) throw { code: "P2002" };
        fixture.rows.set(data.studentId, structuredClone(data));
        fixture.writes++;
        return data;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { studentId: string; revision: number };
        data: { payload: unknown; revision: { increment: number } };
      }) => {
        const row = fixture.rows.get(where.studentId);
        if (!row || row.revision !== where.revision) return { count: 0 };
        fixture.rows.set(where.studentId, {
          ...row,
          payload: structuredClone(data.payload),
          revision: row.revision + data.revision.increment,
        });
        fixture.writes++;
        return { count: 1 };
      },
    },
  },
}));

import { GET, POST } from "@/app/api/learn/math-srs/route";
import { POST as hint } from "@/app/api/learn/math-srs/hint/route";
import { POST as attempt } from "@/app/api/learn/math-srs/attempts/route";
import { GET as dashboard } from "@/app/api/classes/[id]/math-srs/route";
import {
  mathSrsClassResponseSchema,
  mathSrsStateResponseSchema,
  type MathSrsState,
} from "@/contracts/mathSrs.contract";
import { studentGateFor } from "@/lib/studentRouteAccess";
import { parseSrsState } from "@/lib/math-srs/serverState";
import { correctSrsChoice } from "@/lib/math-srs/sharedAnswers";
import {
  GET as readGuide,
  POST as chooseGuideRoute,
} from "@/app/api/learn/math-srs/guide/route";
import { guideResponseSchema } from "@/contracts/mathSrsGuide.contract";

const origin = "http://localhost:3000";
const req = (
  path: string,
  method = "GET",
  body?: unknown,
  requestOrigin = origin,
) =>
  new Request(`${origin}${path}`, {
    method,
    headers: { origin: requestOrigin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const studentSession = (
  id = fixture.studentId,
  mustChangePassword = false,
) => ({
  student: {
    accountId: fixture.ownerId,
    studentId: id,
    name: "학생",
    mustChangePassword,
  },
});
const teacherSession = (overrides = {}) => ({
  user: {
    id: fixture.ownerId,
    name: "선생님",
    email: "teacher@example.test",
    approvalStatus: "approved",
    role: "director",
    menus: ["teaching"],
    isAdmin: false,
    ...overrides,
  },
});
const readState = async (response: Response): Promise<MathSrsState> =>
  mathSrsStateResponseSchema.parse(await response.json()).data;
const teacherRead = () =>
  dashboard(req(`/api/classes/${fixture.classId}/math-srs`), {
    params: Promise.resolve({ id: fixture.classId }),
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-23T01:00:00.000Z"));
  fixture.session = studentSession();
  fixture.rows.clear();
  fixture.writes = 0;
  fixture.missingTable = false;
  vi.stubEnv("AUTH_URL", origin);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("student SRS routes", () => {
  it("only opens the declared methods/routes for active students", () => {
    for (const [method, path] of [
      ["GET", "/learn/math-srs"],
      ["GET", "/api/learn/math-srs"],
      ["POST", "/api/learn/math-srs"],
      ["POST", "/api/learn/math-srs/hint"],
      ["POST", "/api/learn/math-srs/attempts"],
    ]) {
      expect(studentGateFor(false, method, path).kind).toBe("allow");
      expect(studentGateFor(true, method, path).kind).not.toBe("allow");
    }
    for (const [method, path] of [
      ["DELETE", "/api/learn/math-srs"],
      ["GET", "/api/learn/math-srs/hint"],
      ["POST", "/api/learn/math-srs/reset"],
      ["POST", "/learn/math-srs"],
    ])
      expect(studentGateFor(false, method, path).kind).toBe("forbidden");
  });

  it("rejects anonymous, director and first-password sessions at the route itself", async () => {
    for (const session of [null, teacherSession()]) {
      fixture.session = session;
      expect((await GET(req("/api/learn/math-srs"))).status).toBe(401);
      expect((await POST(req("/api/learn/math-srs", "POST", {}))).status).toBe(
        401,
      );
    }
    fixture.session = studentSession(fixture.studentId, true);
    expect((await GET(req("/api/learn/math-srs"))).status).toBe(403);
    expect(fixture.writes).toBe(0);
  });

  it("rejects cross-site writes and arbitrary client-selected student/correct fields", async () => {
    expect(
      (
        await POST(
          req("/api/learn/math-srs", "POST", {}, "https://outside.test"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          req("/api/learn/math-srs", "POST", {
            studentId: fixture.otherStudentId,
          }),
        )
      ).status,
    ).toBe(400);
    const response = await POST(req("/api/learn/math-srs", "POST", {}));
    const state = await readState(response);
    const body = {
      missionId: state.mission!.id,
      problemId: state.mission!.problems[0].id,
      submittedAnswer: "42",
      elapsedSeconds: 1,
      rating: "easy",
      correct: true,
    };
    expect(
      (await attempt(req("/api/learn/math-srs/attempts", "POST", body))).status,
    ).toBe(400);
    expect(fixture.writes).toBe(1);
  });

  it("loads real identity/progress, published accessible lectures and honest unassessed memory", async () => {
    const response = await GET(req("/api/learn/math-srs"));
    expect(response.headers.get("cache-control")).toContain("no-store");
    const state = await readState(response);
    expect(state.student).toMatchObject({
      id: fixture.studentId,
      name: "서연",
      className: "중1 A",
    });
    expect(state.currentProgress).toMatchObject({
      section: "등식의 성질",
      source: "class",
    });
    expect(state.lectures.map((l) => l.title)).toEqual(["등식 강의"]);
    expect(state.mission).toBeNull();
    expect(state.memories.every((m) => m.attempts === 0)).toBe(true);
    expect(fixture.rows.size).toBe(0);
  });

  it("persists ordered answers, marks server-issued hints, retries idempotently, and isolates students", async () => {
    let state = await readState(
      await POST(req("/api/learn/math-srs", "POST", {})),
    );
    const mission = state.mission!;
    expect(
      mission.problems.every((p) => p.feedback === null && p.hint === null),
    ).toBe(true);
    const target = { missionId: mission.id, problemId: mission.problems[0].id };
    const outOfOrder = await hint(
      req("/api/learn/math-srs/hint", "POST", {
        ...target,
        problemId: mission.problems[1].id,
      }),
    );
    expect(outOfOrder.status).toBe(409);
    expect((await outOfOrder.json()).error.code).toBe("CONFLICT");
    state = await readState(
      await hint(req("/api/learn/math-srs/hint", "POST", target)),
    );
    expect(state.mission!.problems[0].hint).not.toBeNull();
    const stored = parseSrsState(fixture.rows.get(fixture.studentId)!.payload);
    const submission = {
      ...target,
      // 학생 미션은 폰 «한 걸음» 보기형(2026-09-27) — 정답 보기 글자를 낸다
      submittedAnswer:
        correctSrsChoice(stored.missions[0].problems[0]) ??
        String(stored.missions[0].problems[0].answer),
      elapsedSeconds: 10,
      rating: "easy",
    };
    state = await readState(
      await attempt(req("/api/learn/math-srs/attempts", "POST", submission)),
    );
    expect(state.mission!.attempts[0]).toMatchObject({
      correct: true,
      usedHint: true,
      rating: "hard",
    });
    const retry = await readState(
      await attempt(req("/api/learn/math-srs/attempts", "POST", submission)),
    );
    expect(retry).toEqual(state);
    expect(
      (
        await attempt(
          req("/api/learn/math-srs/attempts", "POST", {
            ...submission,
            submittedAnswer: "999999",
          }),
        )
      ).status,
    ).toBe(409);
    fixture.session = studentSession(fixture.otherStudentId);
    expect(
      (await readState(await GET(req("/api/learn/math-srs")))).mission,
    ).toBeNull();
    expect(
      (await attempt(req("/api/learn/math-srs/attempts", "POST", submission)))
        .status,
    ).toBe(409);
    expect(fixture.rows.has(fixture.otherStudentId)).toBe(false);
  });

  it("returns a clear unavailable response when the dedicated table is not deployed", async () => {
    fixture.missingTable = true;
    const response = await POST(req("/api/learn/math-srs", "POST", {}));
    expect(response.status).toBe(503);
    expect((await response.json()).error.message).toContain("저장소");
    expect(fixture.writes).toBe(0);
  });
});

describe("teacher SRS dashboard authorization and real roster", () => {
  it("requires an approved teacher menu, role and existing class ownership", async () => {
    expect((await teacherRead()).status).toBe(401); // student
    for (const overrides of [
      { approvalStatus: "pending" },
      { menus: [] },
      { role: "reviewer" },
      { id: fixture.otherOwnerId },
    ]) {
      fixture.session = teacherSession(overrides);
      expect((await teacherRead()).status).toBe(403);
    }
    fixture.session = teacherSession({
      id: fixture.otherOwnerId,
      isAdmin: true,
      isSuperAdmin: true,
    });
    expect((await teacherRead()).status).toBe(200);
  });

  it("joins real students, their individual/class progress and only persisted SRS practice", async () => {
    await POST(req("/api/learn/math-srs", "POST", {}));
    fixture.session = teacherSession();
    const response = await teacherRead();
    expect(response.status).toBe(200);
    const data = mathSrsClassResponseSchema.parse(await response.json()).data;
    expect(data.students.map((s) => s.name)).toEqual(["서연", "민준"]);
    expect(data.students[0].today).toMatchObject({ answered: 0, correct: 0 });
    expect(data.students[1].today).toBeNull();
    expect(data.students[0].lastPracticedAt).toBeNull();
    expect(data.students[1].currentProgress?.source).toBe("individual");
    expect(data.students[0].currentProgress?.source).toBe("class");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});

describe("student guide choice (plan §2 decision 10)", () => {
  const guidePath = "/api/learn/math-srs/guide";
  const choose = (body: unknown, requestOrigin = origin) =>
    chooseGuideRoute(req(guidePath, "POST", body, requestOrigin));
  const guideOf = async (response: Response) => {
    expect(response.status).toBe(200);
    return guideResponseSchema.parse(await response.json()).data.guide;
  };

  it("lets active students read and choose, and nobody else", async () => {
    for (const method of ["GET", "POST"]) {
      expect(studentGateFor(false, method, guidePath).kind).toBe("allow");
      expect(studentGateFor(true, method, guidePath).kind).not.toBe("allow");
    }
    for (const session of [null, teacherSession()]) {
      fixture.session = session;
      expect((await readGuide(req(guidePath))).status).toBe(401);
      expect((await choose({ guideId: "marten" })).status).toBe(401);
    }
    expect(fixture.writes).toBe(0);
  });

  it("reads null before the first choice without writing a record", async () => {
    expect(await guideOf(await readGuide(req(guidePath)))).toBeNull();
    expect(fixture.writes).toBe(0);
  });

  it("saves the choice, keeps its first time on the same guide and replaces it on another", async () => {
    const first = await guideOf(await choose({ guideId: "marten" }));
    expect(first).toEqual({
      id: "marten",
      chosenAt: "2026-09-23T01:00:00.000Z",
    });
    expect(await guideOf(await readGuide(req(guidePath)))).toEqual(first);
    expect(
      parseSrsState(fixture.rows.get(fixture.studentId)!.payload).guide,
    ).toEqual(first);

    vi.setSystemTime(new Date("2026-09-24T01:00:00.000Z"));
    const writes = fixture.writes;
    expect(await guideOf(await choose({ guideId: "marten" }))).toEqual(first);
    expect(fixture.writes).toBe(writes);
    expect(await guideOf(await choose({ guideId: "wood-friend" }))).toEqual({
      id: "wood-friend",
      chosenAt: "2026-09-24T01:00:00.000Z",
    });
  });

  it("keeps the rest of the record when the guide changes", async () => {
    const mission = (
      await readState(await POST(req("/api/learn/math-srs", "POST", {})))
    ).mission;
    await choose({ guideId: "paper-swallow" });
    expect(
      (await readState(await GET(req("/api/learn/math-srs")))).mission,
    ).toEqual(mission);
  });

  it("rejects unknown guides, extra fields and cross-site choices without writing", async () => {
    for (const body of [
      { guideId: "dragon" },
      { guideId: "marten", studentId: fixture.otherStudentId },
      {},
    ])
      expect((await choose(body)).status).toBe(400);
    expect(
      (await choose({ guideId: "marten" }, "https://outside.test")).status,
    ).toBe(403);
    expect(fixture.writes).toBe(0);
  });
});
