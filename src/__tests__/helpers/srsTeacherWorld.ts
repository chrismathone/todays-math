/**
 * 교사 쪽 기억 학습 · 탐험 끝점 경로 시험이 같이 쓰는 작은 세계 — 지점 둘 · 반 하나 · 학생 다섯.
 *
 * 🔴 DB 대역이 **where 를 실제로 읽는다**(`ownedStudentsWhere` · `ownedRowsWhere` 의 세 꼴 · `eywaWithdrawnAt: null`).
 *    조건을 안 읽는 대역은 «다른 지점»과 «탈퇴 제외»를 시험할 수 없다 — 질의가 조건을 빠뜨려도 초록이다.
 *
 * 쓰는 법(시험 파일):
 *   vi.mock("@/lib/auth", async () => (await import("../helpers/srsTeacherWorld")).authModule);
 *   vi.mock("@/lib/db", async () => (await import("../helpers/srsTeacherWorld")).dbModule);
 */
// 지점 id 는 운영처럼 UUID 다 — 응답 계약(`management.branchId`)이 UUID 를 요구한다.
// «branch-1» 같은 글이던 때는 명단 응답이 계약에서 걸려 200 을 낼 수 없었다(2026-10-06).
export const BRANCH_1 = "b1a00000-0000-4000-8000-000000000001";
export const BRANCH_2 = "b2a00000-0000-4000-8000-000000000002";

export const ids = {
  owner: "d56e582b-a5af-4763-8b0a-801ecff4b5a5",
  colleague: "6837f42f-9748-42d4-8ac9-f11e5c2b681b",
  sameBranchAdmin: "0b0e7d0c-5f3a-4c55-9c39-6f4f6a0f1a11",
  otherBranchAdmin: "9f2f6a53-0f0b-4d0e-8a57-3f5d3c0b2b22",
  classId: "7e7c388b-c264-4d39-809b-527723b8b74b",
  studied: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  noAccount: "ee7be323-de24-4c8c-b6d1-1da66f09efdf",
  withdrawn: "3a1d2a0e-6f7b-4a52-9a53-4c29f3a7c933",
  fresh: "5c0a7f1e-2b64-4f0e-b0a4-1d8e5b6f7a44",
  newAccount: "8e4b1c7a-9d35-4a6e-8f21-7b0c2d3e4f55",
} as const;

type Row = { studentId: string; revision: number; payload: unknown };

/** 계정의 지점 — `ownership.ts` 가 소유자의 지점을 `db.user` 에서 읽는다. */
const users = new Map<string, { branchId: string | null }>([
  [ids.owner, { branchId: BRANCH_1 }],
  [ids.colleague, { branchId: BRANCH_1 }],
  [ids.sameBranchAdmin, { branchId: BRANCH_1 }],
  [ids.otherBranchAdmin, { branchId: BRANCH_2 }],
]);
const cls = {
  id: ids.classId,
  name: "중1 A",
  userId: ids.owner,
  branchId: BRANCH_1,
  eywaBindingId: null,
};

const student = (
  id: string,
  name: string,
  order: number,
  extra: {
    account?: "on" | "off" | "none";
    withdrawn?: boolean;
    accountCreatedAt?: string;
  } = {},
) => ({
  id,
  name,
  classId: ids.classId,
  branchId: BRANCH_1,
  eywaBindingId: null,
  isTest: false,
  useIndividualProgress: false,
  eywaWithdrawnAt: extra.withdrawn ? new Date("2026-09-01") : null,
  createdAt: new Date(`2026-01-0${order}`),
  class: cls,
  studentAccount:
    extra.account === "none"
      ? null
      : {
          id: `account-${order}`,
          disabledAt: extra.account === "off" ? new Date("2026-09-01") : null,
          createdAt: new Date(extra.accountCreatedAt ?? "2026-08-01T00:00:00Z"),
        },
});
/**
 * 명단 순서(만든 날 순): 서연 · 민준(계정 없음) · 퇴원한 학생 · 하린(기록 없음) · 다온(기록 없음 · 막 만든 계정).
 * 다온의 계정은 KST 2026-10-03 01:00 에 만들었다 — UTC 로는 아직 10-02 다(날짜를 UTC 로 세면 하루 어긋난다).
 */
const students = [
  student(ids.studied, "서연", 1),
  student(ids.noAccount, "민준", 2, { account: "none" }),
  student(ids.withdrawn, "퇴원한 학생", 3, { withdrawn: true }),
  student(ids.fresh, "하린", 4),
  student(ids.newAccount, "다온", 5, {
    accountCreatedAt: "2026-10-02T16:00:00Z",
  }),
];

export const world = {
  session: null as unknown,
  rows: new Map<string, Row>(),
  missingTable: false,
  writes: 0,
  /** 마지막으로 받은 where — 시험이 «지점 조건이 실렸나»를 본다 */
  studentWhere: null as unknown,
  classWhere: null as unknown,
  reset() {
    world.session = null;
    world.rows.clear();
    world.missingTable = false;
    world.writes = 0;
    world.studentWhere = null;
    world.classWhere = null;
  },
};

type Where = Record<string, unknown>;
const matches = (row: Record<string, unknown>, where: Where = {}): boolean =>
  Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true;
    if (key === "OR" || key === "AND") {
      const list = (cond as Where[]).map((part) => matches(row, part));
      return key === "OR" ? list.some(Boolean) : list.every(Boolean);
    }
    if (cond && typeof cond === "object") {
      if ("in" in cond) return (cond.in as unknown[]).includes(row[key]);
      if ("not" in cond) return row[key] !== cond.not;
      return matches((row[key] ?? {}) as Where, cond as Where);
    }
    return (row[key] ?? null) === cond;
  });
export const db = {
  eywaManagedAccount: { findUnique: async () => null },
  async $transaction<T>(work: (tx: object) => Promise<T>): Promise<T> {
    return work(this);
  },
  user: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      users.get(where.id) ?? null,
  },
  class: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      where.id === cls.id ? cls : null,
    findMany: async ({ where }: { where: Where }) => {
      world.classWhere = where;
      return matches(cls, where) ? [{ id: cls.id, name: cls.name }] : [];
    },
  },
  student: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      students.find((s) => s.id === where.id) ?? null,
    findMany: async ({ where }: { where: Where }) => {
      world.studentWhere = where;
      return students.filter((s) => matches(s, where));
    },
  },
  progress: { findMany: async () => [] },
  unit: { findMany: async () => [], findFirst: async () => null },
  conceptLecture: { findMany: async () => [] },
  problem: { findMany: async () => [] },
  studentSrsState: {
    findUnique: async ({ where }: { where: { studentId: string } }) => {
      if (world.missingTable) throw { code: "P2021" };
      return structuredClone(world.rows.get(where.studentId) ?? null);
    },
    findMany: async ({ where }: { where: { studentId: { in: string[] } } }) => {
      if (world.missingTable) throw { code: "P2021" };
      return where.studentId.in.flatMap((id) =>
        world.rows.has(id) ? [structuredClone(world.rows.get(id)!)] : [],
      );
    },
    create: async ({ data }: { data: Row }) => {
      if (world.missingTable) throw { code: "P2021" };
      if (world.rows.has(data.studentId)) throw { code: "P2002" };
      world.rows.set(data.studentId, structuredClone(data));
      world.writes++;
      return data;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { studentId: string; revision: number };
      data: { payload: unknown };
    }) => {
      if (world.missingTable) throw { code: "P2021" };
      const row = world.rows.get(where.studentId);
      if (!row || row.revision !== where.revision) return { count: 0 };
      world.rows.set(where.studentId, {
        ...row,
        revision: row.revision + 1,
        payload: structuredClone(data.payload),
      });
      world.writes++;
      return { count: 1 };
    },
  },
};

export const dbModule = { db };
export const authModule = { auth: async () => world.session };

/** 반을 가진 지점 강사 — 메뉴는 «수업 · 학생 관리»와 «오늘의 기억 · SRS» 둘 다. */
export function teacherSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: ids.owner,
      name: "선생님",
      email: "teacher@example.test",
      approvalStatus: "approved",
      role: "director",
      menus: ["teaching", "srs"],
      isAdmin: false,
      isSuperAdmin: false,
      branchId: BRANCH_1,
      branchRole: "teacher",
      ...overrides,
    },
  };
}
/** 같은 지점의 관리자 — 소유 울타리를 넘는다(D-130 · D-136). */
export const sameBranchAdmin = (overrides: Record<string, unknown> = {}) =>
  teacherSession({
    id: ids.sameBranchAdmin,
    isAdmin: true,
    branchRole: "owner",
    ...overrides,
  });
/** 🔴 다른 지점의 관리자 — 관리자여도 이 반 · 이 학생은 범위 밖이다. */
export const otherBranchAdmin = (overrides: Record<string, unknown> = {}) =>
  teacherSession({
    id: ids.otherBranchAdmin,
    isAdmin: true,
    branchId: BRANCH_2,
    branchRole: "owner",
    ...overrides,
  });
export const studentSession = (studentId: string = ids.studied) => ({
  student: {
    accountId: "account-1",
    studentId,
    name: "학생",
    mustChangePassword: false,
  },
});

const origin = "http://localhost:3000";
export const req = (path: string, method = "GET", body?: unknown) =>
  new Request(`${origin}${path}`, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
export const params = (id: string) => ({ params: Promise.resolve({ id }) });
