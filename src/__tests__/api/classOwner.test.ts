/**
 * 🔴 RED → 🟢 — 관리자 화면의 «누구의 반» 담당 · 뒷단 짝 (D-132 · 05 §8.11).
 *
 * 헬퍼: src/lib/class/classOwner.ts (싣는 판정 한 곳) · 계약: `classOwnerSchema`
 * 브리프: docs/planning/tracks/briefs/class-owner-tag.md §1.1 · §3
 *
 * ## 짝으로 둔다 — 같은 픽스처 · 같은 계정 · **관리자 표시 하나만** 다르다 (`adminSeesAll.test.ts` 관례)
 *
 * 들어오는 계정은 `USER_OTHER_ID`(박강사) — 반 `CLASS_OTHER` 하나를 가진다. 대역의 반 행 순서가
 * [김원장 반 셋, 박강사 반] 이라 **내 반이 맨 뒤에 깔려 있다**. 그래서 «내 반 맨 위»가 대역의
 * 우연한 순서로 초록이 되지 않는다(김원장으로 들어오면 내 반이 원래 앞이라 정렬을 지워도 초록이다).
 *
 *   · 관리자     — 모든 행에 담당(계정 이름 · 내 반 여부), 내 반이 맨 위
 *   · 관리자 아님 — 응답이 **넓히기 전과 같다** — `owner`/`classOwner` 키가 아예 없다
 *
 * «관리자면 싣는다»만 보면 «늘 싣는다»가 초록이고, 반대만 보면 «안 싣는다»가 초록이다.
 * 변이 하네스 `scripts/qa/mutate-class-owner.ts` 가 두 방향을 다 뒤집는다.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({
  user: null as {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
  } | null,
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));
vi.mock("server-only", () => ({}));
const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock.auth }));

import {
  GET as listClasses,
  POST as createClass,
} from "@/app/api/classes/route";
import { GET as getBoard } from "@/app/api/concept/route";
import { GET as getTest } from "@/app/api/tests/[id]/route";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import {
  classListResponseSchema,
  classResponseSchema,
} from "@/contracts/class.contract";
import { conceptBoardResponseSchema } from "@/contracts/conceptAdmin.contract";
import { testDetailResponseSchema } from "@/contracts/test.contract";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  CLASS_OTHER_ID,
  CLASS_STARVED_ID,
  MOCK_CURRENT_PROGRESS_UNIT,
  MOCK_TEST_PROBLEMS_BY_TEST_ID,
  MOCK_UNITS,
  TEST_DRAFT_ID,
  USER_OTHER_ID,
} from "@/mocks/data";
import {
  prismaTestDouble as db,
  resetPrismaTestDouble,
} from "@/mocks/prismaTestDouble";
import { serializeClass } from "@/lib/serializers";

/** 들어오는 계정 — 대역 계정 행의 이름(`User.name`)은 «박강사». 세션 이름은 일부러 다르게 둔다. */
const VIEWER = {
  id: USER_OTHER_ID,
  email: "other-teacher@example.com",
  name: "세션에 적힌 이름",
};
const VIEWER_ACCOUNT_NAME = "박강사";
const OTHER_ACCOUNT_NAME = "김원장";

const CASES = [
  { who: "관리자 아님", isAdmin: false },
  { who: "관리자", isAdmin: true },
] as const;

function req(url: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers:
      body === undefined
        ? undefined
        : { "content-type": "application/json", origin: "http://localhost" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

function loginAs(isAdmin: boolean) {
  sessionState.user = { ...VIEWER, isAdmin, isSuperAdmin: isAdmin };
  authMock.auth.mockResolvedValue({
    user: {
      ...VIEWER,
      role: "director",
      isAdmin,
      isSuperAdmin: isAdmin,
      approvalStatus: "approved",
      menus: [...ALL_WORKSPACE_MENUS],
    },
  });
}

/** 박강사 반(`CLASS_OTHER`)의 초안 시험지 — 관리자 아님도 볼 수 있는 시험지로 짝을 세운다. */
async function seedViewerDraft(): Promise<string> {
  const draft = await db.test.create({
    data: {
      userId: USER_OTHER_ID,
      classId: CLASS_OTHER_ID,
      testType: "daily",
      rangeEndUnitId: MOCK_CURRENT_PROGRESS_UNIT.id,
      status: "draft",
      testDate: new Date("2026-08-13T00:00:00Z"),
    },
  });
  for (const item of MOCK_TEST_PROBLEMS_BY_TEST_ID[TEST_DRAFT_ID]!)
    await db.testProblem.create({
      data: {
        testId: draft.id,
        problemId: item.problemId,
        orderIndex: item.orderIndex,
        replaced: false,
      },
    });
  return draft.id;
}

beforeEach(() => {
  resetPrismaTestDouble();
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
});
afterEach(() => {
  sessionState.user = null;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ─────────────────────────────────────────────
// GET /api/classes
// ─────────────────────────────────────────────

describe.each(CASES)("GET /api/classes — $who", ({ isAdmin }) => {
  beforeEach(() => loginAs(isAdmin));

  it(
    isAdmin
      ? "모든 행에 담당(계정 이름 · 내 반) — 내 반이 맨 위"
      : "🔴 넓히기 전과 같다 — owner 키가 없다",
    async () => {
      const res = await listClasses(req("/api/classes?pageSize=100"));
      expect(res.status).toBe(200);
      const text = await res.text();
      const body = classListResponseSchema.parse(JSON.parse(text));

      if (!isAdmin) {
        expect(text).not.toContain('"owner"');
        const own = await db.class.findUnique({
          where: { id: CLASS_OTHER_ID },
        });
        expect(body).toEqual({
          // 대역 행은 Prisma 형과 칸 하나(eywaClassId)가 달라 형만 맞춘다 — 직렬화기는 그 칸을 안 읽는다
          data: [
            serializeClass(
              own as unknown as Parameters<typeof serializeClass>[0],
            ),
          ],
          meta: { page: 1, pageSize: 100, total: 1 },
        });
        return;
      }

      expect(body.data.map((c) => c.id)).toEqual([
        CLASS_OTHER_ID,
        CLASS_A_ID,
        CLASS_B_ID,
        CLASS_STARVED_ID,
      ]);
      expect(body.data[0]!.owner).toEqual({
        name: VIEWER_ACCOUNT_NAME, // 세션 이름이 아니라 계정 이름(User.name)
        mine: true,
      });
      for (const row of body.data.slice(1))
        expect(row.owner).toEqual({ name: OTHER_ACCOUNT_NAME, mine: false });
      expect(body.meta.total).toBe(4);
    },
  );

  it("담당 이름은 조회 한 번에 조인한다 — 반마다 계정을 따로 읽지 않는다", async () => {
    const findMany = vi.spyOn(db.class, "findMany");
    const userFindUnique = vi.spyOn(db.user, "findUnique");
    const userFindFirst = vi.spyOn(db.user, "findFirst");

    await listClasses(req("/api/classes?pageSize=100"));

    expect(userFindUnique).not.toHaveBeenCalled();
    expect(userFindFirst).not.toHaveBeenCalled();
    // 내 반 묶음 · 나머지 묶음 — 반이 몇 개든 두 번을 넘지 않는다
    expect(findMany.mock.calls.length).toBeLessThanOrEqual(isAdmin ? 2 : 1);
    for (const [args] of findMany.mock.calls) {
      // 묶음 안의 순서는 지금 그대로(createdAt desc)
      expect(args).toMatchObject({ orderBy: { createdAt: "desc" } });
      if (isAdmin)
        expect(args).toMatchObject({
          include: { user: { select: { name: true } } },
        });
      else expect(args).not.toHaveProperty("include");
    }
  });
});

describe("GET /api/classes — 관리자 페이지 넘김", () => {
  beforeEach(() => loginAs(true));

  it.each([1, 2, 3])(
    "pageSize=%i 로 끝까지 넘겨도 내 반 먼저 · 빠짐 · 겹침 없음",
    async (pageSize) => {
      const seen: string[] = [];
      for (let page = 1; page <= Math.ceil(4 / pageSize); page += 1) {
        const res = await listClasses(
          req(`/api/classes?page=${page}&pageSize=${pageSize}`),
        );
        const body = classListResponseSchema.parse(await res.json());
        expect(body.meta).toEqual({ page, pageSize, total: 4 });
        seen.push(...body.data.map((c) => c.id));
      }
      expect(seen).toEqual([
        CLASS_OTHER_ID,
        CLASS_A_ID,
        CLASS_B_ID,
        CLASS_STARVED_ID,
      ]);
    },
  );

  it("반이 0개인 관리자(공유 DB 의 원장님 계정 모양) — 전부 남의 반, «내 반» 없음", async () => {
    sessionState.user = {
      id: "10000000-0000-4000-8000-0000000000ad",
      email: "director@todaysmath.test",
      name: "원장",
      isAdmin: true,
      isSuperAdmin: true,
    };
    const body = classListResponseSchema.parse(
      await (await listClasses(req("/api/classes?pageSize=100"))).json(),
    );
    expect(body.data).toHaveLength(4);
    expect(body.data.every((c) => c.owner?.mine === false)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// POST /api/classes — 만든 반이 목록에 붙을 때 담당이 비지 않게
// ─────────────────────────────────────────────

describe.each(CASES)("POST /api/classes — $who", ({ isAdmin }) => {
  beforeEach(() => loginAs(isAdmin));

  it.each([
    { path: "반만", extra: {} },
    {
      path: "계획과 같이(트랜잭션)",
      extra: {
        progressPlan: {
          weekdays: [1, 3],
          unitsPerLesson: 1,
          startUnitId: MOCK_UNITS[0]!.id,
          startDate: "2026-09-14",
          active: true,
        },
      },
    },
  ])(
    isAdmin ? "$path — 내 반 담당이 실린다" : "$path — owner 키가 없다",
    async ({ extra }) => {
      const res = await createClass(
        req("/api/classes", "POST", { name: "새 반", grade: "중1", ...extra }),
      );
      expect(res.status).toBe(201);
      const text = await res.text();
      const body = classResponseSchema.parse(JSON.parse(text));
      expect(body.data.userId).toBe(USER_OTHER_ID);
      if (isAdmin)
        expect(body.data.owner).toEqual({
          name: VIEWER_ACCOUNT_NAME,
          mine: true,
        });
      else expect(text).not.toContain('"owner"');
    },
  );
});

// ─────────────────────────────────────────────
// GET /api/tests/{id} — 검토 머리
// ─────────────────────────────────────────────

describe.each(CASES)("GET /api/tests/{id} — $who", ({ isAdmin }) => {
  beforeEach(() => loginAs(isAdmin));

  it(
    isAdmin ? "내 반 시험지 — classOwner 는 내 반" : "🔴 classOwner 키가 없다",
    async () => {
      const draftId = await seedViewerDraft();
      const res = await getTest(req(`/api/tests/${draftId}`), withId(draftId));
      expect(res.status).toBe(200);
      const text = await res.text();
      const body = testDetailResponseSchema.parse(JSON.parse(text));
      expect(body.data.className).toBe("박강사의 반");
      if (isAdmin)
        expect(body.data.classOwner).toEqual({
          name: VIEWER_ACCOUNT_NAME,
          mine: true,
        });
      else expect(text).not.toContain('"classOwner"');
    },
  );
});

describe("GET /api/tests/{id} — 관리자가 남의 반 시험지", () => {
  it("classOwner 는 그 반 계정 이름 · 내 반 아님", async () => {
    loginAs(true);
    const res = await getTest(
      req(`/api/tests/${TEST_DRAFT_ID}`),
      withId(TEST_DRAFT_ID),
    );
    const body = testDetailResponseSchema.parse(await res.json());
    expect(body.data.classOwner).toEqual({
      name: OTHER_ACCOUNT_NAME,
      mine: false,
    });
  });
});

// ─────────────────────────────────────────────
// GET /api/concept — 오늘의 개념 판
// ─────────────────────────────────────────────

describe.each(CASES)("GET /api/concept — $who", ({ isAdmin }) => {
  beforeEach(() => loginAs(isAdmin));

  it(
    isAdmin
      ? "행마다 담당 — 내 반이 맨 위, 나머지는 지금 순서(학년 · 이름)"
      : "🔴 owner 키가 없다",
    async () => {
      const res = await getBoard(req("/api/concept"));
      expect(res.status).toBe(200);
      const text = await res.text();
      const board = conceptBoardResponseSchema.parse(JSON.parse(text)).data;

      if (!isAdmin) {
        expect(text).not.toContain('"owner"');
        expect(board.rows.map((r) => r.classId)).toEqual([CLASS_OTHER_ID]);
        return;
      }

      // 박강사 반은 중3 — 학년 순서로는 맨 뒤다. 내 반이라 맨 위로 온다.
      expect(board.rows[0]).toMatchObject({
        classId: CLASS_OTHER_ID,
        owner: { name: VIEWER_ACCOUNT_NAME, mine: true },
      });
      const rest = board.rows.slice(1);
      for (const row of rest)
        expect(row.owner).toEqual({ name: OTHER_ACCOUNT_NAME, mine: false });

      // 나머지 순서의 기준 — 반이 0개인 관리자가 보는 판(내 반이 없어 지금 순서 그대로)
      sessionState.user = null;
      authMock.auth.mockResolvedValue({
        user: {
          id: "10000000-0000-4000-8000-0000000000ad",
          email: "director@todaysmath.test",
          name: "원장",
          role: "director",
          isAdmin: true,
          isSuperAdmin: true,
          approvalStatus: "approved",
          menus: [...ALL_WORKSPACE_MENUS],
        },
      });
      const plain = conceptBoardResponseSchema.parse(
        await (await getBoard(req("/api/concept"))).json(),
      ).data;
      expect(plain.rows.map((r) => r.classId)).toContain(CLASS_OTHER_ID);
      expect(plain.rows.at(-1)!.classId).toBe(CLASS_OTHER_ID); // 중3 이라 원래 맨 뒤
      expect(rest.map((r) => r.classId)).toEqual(
        plain.rows.map((r) => r.classId).filter((id) => id !== CLASS_OTHER_ID),
      );
    },
  );
});
