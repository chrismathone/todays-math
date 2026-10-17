// @vitest-environment node
/**
 * 월말평가 M1 — POST · GET /api/exam-publications · DELETE …/{id}/classes/{classId} (계획서 §9.4 ③ · §9.5).
 *
 * 작은 메모리 DB 로 돈다 — 이 길이 쓰는 표(발행본 · 반 시험 · 문항 · 결과 · 내 시험지 · 은행 문항 · 단원 · 학생)만.
 * 거래는 실패하면 통째로 되돌린다(DB 처럼). 소유 확인(`requireOwnedClass` · `assertClassWrite`)은 다른 시험이 잠근 헬퍼라
 * 여기서는 «내 반 / 남의 반 / 거래 안에서 막히는 반»만 흉내 낸다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => {
  const uuid = (n: number) =>
    `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
  return {
    uuid,
    TEACHER: uuid(900),
    CLASS_A: uuid(101),
    CLASS_B: uuid(102),
    CLASS_OTHER: uuid(103),
    /** 거래 안에서만 막히는 반 — 앞의 반이 이미 만들어진 뒤에 실패하게. */
    blockedInTx: null as string | null,
    db: null as unknown as {
      publications: Record<string, unknown>[];
      tests: Record<string, unknown>[];
      testProblems: Record<string, unknown>[];
      results: {
        testId: string;
        studentId: string;
        absent: boolean;
        takenAt: Date;
      }[];
      documents: Record<string, unknown>[];
      problems: Record<string, unknown>[];
      students: { id: string; classId: string }[];
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: async () => ({
    id: f.TEACHER,
    email: "t@example.test",
    name: "원장",
    branchId: null,
  }),
}));
vi.mock("@/lib/ownership", () => ({
  requireOwnedClass: async (classId: string) =>
    classId === f.CLASS_OTHER
      ? {
          ok: false,
          response: Response.json(
            { error: { code: "FORBIDDEN", message: "권한 없음" } },
            { status: 403 },
          ),
        }
      : { ok: true, data: { id: classId } },
}));
vi.mock("@/lib/classAccess", async (original) => {
  const real = await original<typeof import("@/lib/classAccess")>();
  return {
    ...real,
    assertClassWrite: async (
      _tx: unknown,
      _viewer: unknown,
      classId: string,
    ) => {
      if (classId === f.blockedInTx) throw new real.ClassAccessDenied();
    },
    studentsInClassWhere: (classId: string) => ({ classId }),
    accessibleClassesWhere: async () => ({ mine: true }),
  };
});
/* eslint-disable @typescript-eslint/no-explicit-any -- 메모리 DB 대역: Prisma 인자의 꼴을 다시 적지 않고 이 길이 쓰는 칸만 읽는다. */
vi.mock("@/lib/db", () => {
  const state = () => f.db;
  const names: Record<string, string> = {
    [f.CLASS_A]: "중2 A반",
    [f.CLASS_B]: "중2 B반",
  };
  const withTests = (p: Record<string, unknown> | undefined) =>
    p && {
      ...p,
      tests: state()
        .tests.filter((t) => t.publicationId === p.id)
        .map((t) => ({
          id: t.id,
          classId: t.classId,
          class: { name: names[t.classId as string] ?? "" },
        })),
    };
  const findPublication = (where: Record<string, any>) =>
    state().publications.find((p) =>
      where.id
        ? p.id === where.id
        : p.userId === where.userId_requestId.userId &&
          p.requestId === where.userId_requestId.requestId,
    );
  let n = 0;
  const id = () => f.uuid(5000 + ++n);
  const db: Record<string, any> = {
    examPublication: {
      findUnique: async ({ where }: any) =>
        withTests(findPublication(where)) ?? null,
      findUniqueOrThrow: async ({ where }: any) =>
        withTests(findPublication(where)),
      findMany: async ({ where }: any) =>
        state()
          .publications.filter((p) => p.userId === where.userId)
          .map(withTests),
      create: async ({ data }: any) => {
        if (
          state().publications.some(
            (p) => p.userId === data.userId && p.requestId === data.requestId,
          )
        )
          throw Object.assign(new Error("dup"), { code: "P2002" });
        const row = {
          id: id(),
          createdAt: new Date("2026-10-30T01:00:00Z"),
          ...data,
        };
        state().publications.push(row);
        return row;
      },
      delete: async ({ where }: any) => {
        f.db.publications = state().publications.filter(
          (p) => p.id !== where.id,
        );
      },
    },
    workspaceDocument: {
      findUnique: async ({ where }: any) =>
        state().documents.find(
          (d) =>
            d.userId === where.userId_id.userId && d.id === where.userId_id.id,
        ) ?? null,
    },
    problem: {
      findMany: async ({ where }: any) =>
        state().problems.filter((p) => where.id.in.includes(p.id)),
    },
    unit: {
      findMany: async ({ where }: any) =>
        where.id.in.map((u: string, i: number) => ({ id: u, orderIndex: i })),
    },
    test: {
      create: async ({ data }: any) => {
        const row = { id: id(), createdAt: new Date(), ...data };
        state().tests.push(row);
        return row;
      },
      findFirst: async ({ where }: any) =>
        state().tests.find(
          (t) =>
            t.publicationId === where.publicationId &&
            t.classId === where.classId &&
            state().publications.some(
              (p) =>
                p.id === t.publicationId &&
                p.userId === where.publication.userId,
            ),
        ) ?? null,
      delete: async ({ where }: any) => {
        f.db.tests = state().tests.filter((t) => t.id !== where.id);
        f.db.testProblems = state().testProblems.filter(
          (tp) => tp.testId !== where.id,
        );
      },
      count: async ({ where }: any) =>
        state().tests.filter((t) => t.publicationId === where.publicationId)
          .length,
    },
    testProblem: {
      createMany: async ({ data }: any) => {
        state().testProblems.push(...data);
      },
    },
    testResult: {
      findMany: async ({ where }: any) =>
        state()
          .results.filter((r) => where.testId.in.includes(r.testId))
          .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime()),
      count: async ({ where }: any) =>
        state().results.filter((r) => r.testId === where.testId).length,
    },
    student: {
      findMany: async ({ where }: any) =>
        state().students.filter((s) => s.classId === where.classId),
      count: async ({ where }: any) =>
        state().students.filter((s) => s.classId === where.classId).length,
    },
    class: {
      // 낼 수 있는 반 — 내 반 둘(남의 반은 범위 밖이라 오지 않는다).
      findMany: async () => [
        { id: f.CLASS_A, name: "중2 A반" },
        { id: f.CLASS_B, name: "중2 B반" },
      ],
    },
    $queryRaw: async () => [],
    async $transaction(work: (tx: unknown) => Promise<unknown>) {
      const before = structuredClone(f.db);
      try {
        return await work(db);
      } catch (error) {
        f.db = before;
        throw error;
      }
    },
  };
  return { db };
});

/* eslint-enable @typescript-eslint/no-explicit-any */

import { GET, POST } from "@/app/api/exam-publications/route";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { DELETE } from "@/app/api/exam-publications/[id]/classes/[classId]/route";
import {
  examPublicationCreatedResponseSchema,
  examPublicationListResponseSchema,
} from "@/contracts/examPublication.contract";

const P = (n: number) => f.uuid(n);
const bankProblem = (n: number) => ({
  id: P(n),
  content: `문항 ${n}`,
  answer: "③",
  solution: "풀이",
  grade: "중2",
  chapter: "식의 계산",
  section: "단항식",
  difficulty: "중",
  problemCode: `J-${n}`,
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
});
const DOC = "draft-monthly";

beforeEach(() => {
  f.blockedInTx = null;
  f.db = {
    publications: [],
    tests: [],
    testProblems: [],
    results: [],
    documents: [
      {
        userId: f.TEACHER,
        id: DOC,
        kind: "draft",
        title: "중2 10월 월말평가",
        revision: 3,
        payload: {
          problems: [bankProblem(1), bankProblem(2), bankProblem(3)],
          columns: 2,
          answers: true,
          printOptions: {},
          printMeta: {},
        },
      },
    ],
    problems: [1, 2, 3].map((n) => ({
      id: P(n),
      unitId: P(200 + n),
      problemCode: `J-${n}`,
      pool: DEFAULT_PROBLEM_POOL,
      reviewStatus: "approved",
      directUseAllowed: true,
      answer: "③",
    })),
    students: [
      { id: P(301), classId: f.CLASS_A },
      { id: P(302), classId: f.CLASS_A },
      { id: P(303), classId: f.CLASS_A },
      { id: P(311), classId: f.CLASS_B },
    ],
  };
});

const body = (o: Record<string, unknown> = {}) => ({
  documentId: DOC,
  expectedRevision: 3,
  classIds: [f.CLASS_A, f.CLASS_B],
  examType: "monthly",
  testDate: "2026-10-30",
  requestId: P(777),
  ...o,
});
const post = (o: Record<string, unknown> = {}) =>
  POST(
    new Request("http://localhost/api/exam-publications", {
      method: "POST",
      body: JSON.stringify(body(o)),
    }),
  );
const errorOf = async (res: Response) =>
  [
    res.status,
    ((await res.json()) as { error: { message: string } }).error.message,
  ] as const;

describe("반에 내기", () => {
  it("반마다 확정된 반 시험 한 행 · 문항은 낸 차례 · 발행본은 낸 그대로", async () => {
    const res = await post();
    expect(res.status).toBe(201);
    const data = examPublicationCreatedResponseSchema.parse(
      await res.json(),
    ).data;
    expect(data.tests.map((t) => t.className)).toEqual(["중2 A반", "중2 B반"]);
    expect(data.problemCount).toBe(3);
    expect(f.db.tests).toHaveLength(2);
    for (const t of f.db.tests)
      expect(t).toMatchObject({
        status: "confirmed",
        studentId: null,
        publicationId: data.publicationId,
        testType: "review",
      });
    expect(
      f.db.testProblems
        .filter((tp) => tp.testId === data.tests[0]!.testId)
        .map((tp) => [tp.problemId, tp.orderIndex]),
    ).toEqual([
      [P(1), 1],
      [P(2), 2],
      [P(3), 3],
    ]);
    const publication = f.db.publications[0]!;
    expect(publication).toMatchObject({
      documentId: DOC,
      sourceRevision: 3,
      examType: "monthly",
      title: "중2 10월 월말평가",
    });
    expect(
      (publication.payload as { problems: unknown[] }).problems,
    ).toHaveLength(3);
  });

  it("같은 요청 번호의 재전송은 같은 답이고 아무것도 더 만들지 않는다 · 다른 내용이면 409", async () => {
    const first = examPublicationCreatedResponseSchema.parse(
      await (await post()).json(),
    );
    const again = await post();
    expect(again.status).toBe(200);
    expect(
      examPublicationCreatedResponseSchema.parse(await again.json()),
    ).toEqual(first);
    expect(f.db.tests).toHaveLength(2);
    expect((await post({ classIds: [f.CLASS_A] })).status).toBe(409);
  });

  it("그사이 바뀐 시험지는 409 — 아무것도 만들지 않는다", async () => {
    expect((await post({ expectedRevision: 2 })).status).toBe(409);
    expect(f.db.publications).toHaveLength(0);
  });

  it("직접 가져온 문항 · 같은 문항 · 은행에 없는 문항 · 낼 수 없는 문항은 번호를 알려 주고 거절한다", async () => {
    const doc = f.db.documents[0]!;
    const payload = doc.payload as { problems: Record<string, unknown>[] };
    payload.problems = [
      bankProblem(1),
      { ...bankProblem(2), studioCrop: { id: "c" } },
      bankProblem(1),
    ];
    let [status, text] = await errorOf(await post());
    expect(status).toBe(422);
    expect(text).toContain("직접 가져온 문항(2번)");
    expect(text).toContain("같은 문항이 두 번 들어 있습니다(3번)");

    payload.problems = [bankProblem(1), bankProblem(9)];
    [status, text] = await errorOf(await post());
    expect([status, text]).toEqual([
      422,
      expect.stringContaining("찾지 못한 문항(2번)"),
    ]);

    payload.problems = [bankProblem(1), bankProblem(2)];
    f.db.problems[1]!.directUseAllowed = false;
    [status, text] = await errorOf(await post());
    expect([status, text]).toEqual([422, expect.stringContaining("2번(")]);
    expect(f.db.publications).toHaveLength(0);
  });

  it("남의 반이 하나라도 있으면 403 · 거래 안에서 한 반이 막히면 앞의 반까지 전부 되돌린다", async () => {
    expect((await post({ classIds: [f.CLASS_A, f.CLASS_OTHER] })).status).toBe(
      403,
    );
    f.blockedInTx = f.CLASS_B;
    expect((await post()).status).toBe(403);
    expect(f.db.publications).toHaveLength(0);
    expect(f.db.tests).toHaveLength(0);
    expect(f.db.testProblems).toHaveLength(0);
  });
});

describe("낸 기록 · 지우기", () => {
  it("반마다 학생 · 채점 · 결시 · 남음 — 학생마다 가장 최근 결과 하나", async () => {
    const created = examPublicationCreatedResponseSchema.parse(
      await (await post()).json(),
    ).data;
    const a = created.tests[0]!.testId;
    f.db.results.push(
      {
        testId: a,
        studentId: P(301),
        absent: true,
        takenAt: new Date("2026-10-30T01:00:00Z"),
      },
      {
        testId: a,
        studentId: P(301),
        absent: false,
        takenAt: new Date("2026-10-30T02:00:00Z"),
      },
      {
        testId: a,
        studentId: P(302),
        absent: true,
        takenAt: new Date("2026-10-30T02:00:00Z"),
      },
    );
    const list = examPublicationListResponseSchema.parse(
      await (await GET()).json(),
    ).data;
    expect(list.classes).toEqual([
      { id: f.CLASS_A, name: "중2 A반", students: 3 },
      { id: f.CLASS_B, name: "중2 B반", students: 1 },
    ]);
    expect(list.publications).toHaveLength(1);
    expect(list.publications[0]!.classes).toEqual([
      expect.objectContaining({
        className: "중2 A반",
        students: 3,
        graded: 1,
        absent: 1,
        remaining: 1,
      }),
      expect.objectContaining({
        className: "중2 B반",
        students: 1,
        graded: 0,
        absent: 0,
        remaining: 1,
      }),
    ]);
  });

  it("채점 전이면 지운다 — 마지막 반을 지우면 발행본도 지운다 · 결시라도 기록이 있으면 409", async () => {
    const created = examPublicationCreatedResponseSchema.parse(
      await (await post()).json(),
    ).data;
    const del = (classId: string) =>
      DELETE(new Request("http://localhost", { method: "DELETE" }), {
        params: Promise.resolve({ id: created.publicationId, classId }),
      });
    f.db.results.push({
      testId: created.tests[1]!.testId,
      studentId: P(311),
      absent: true,
      takenAt: new Date(),
    });
    expect((await del(f.CLASS_B)).status).toBe(409);
    expect((await del(f.CLASS_A)).status).toBe(200);
    expect(f.db.tests).toHaveLength(1);
    expect(f.db.publications).toHaveLength(1);
    f.db.results = [];
    expect((await del(f.CLASS_B)).status).toBe(200);
    expect(f.db.publications).toHaveLength(0);
    expect((await del(f.CLASS_B)).status).toBe(404);
  });
});
