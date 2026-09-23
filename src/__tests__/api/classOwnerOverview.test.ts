// @vitest-environment node
/**
 * 🔴 RED → 🟢 — 작업실 개요 «최근 등록한 반»의 담당 (D-132) — `api/studio/overview` 와 dev 쌍둥이.
 *
 * `studioWorkspace.test.ts` 처럼 db 를 통째로 모킹한다 — 이 라우트는 `_count` · 진도 조인을 select 로
 * 읽어 공용 대역이 못 푼다. 그래서 **조회 인자**(담당 조인이 붙나)와 **응답 모양**(키가 있나)을 같이 본다.
 *
 * 짝: 같은 계정 · 같은 행 · 관리자 표시만 다르다.
 *   · 관리자     — 반마다 담당, 세 반 안에서 내 반이 맨 위(고르는 세 반은 지금처럼 최근 등록 셋)
 *   · 관리자 아님 — 조회 인자도 응답도 넓히기 전과 같다(`owner` 키 없음)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    class: { count: vi.fn(), findMany: vi.fn() },
    student: { count: vi.fn() },
  },
}));

import { GET as devOverview } from "@/app/api/dev/unified/overview/route";
import { GET as studioOverview } from "@/app/api/studio/overview/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

const VIEWER_ID = "owner-17";

/** 최근 등록 셋(createdAt desc) — 내 반이 가운데에 있다 */
const ROWS = [
  {
    id: "class-a",
    name: "이어반",
    grade: "중2",
    userId: "role-1",
    user: { name: "이어하기선생님" },
    _count: { students: 1 },
    progresses: [],
  },
  {
    id: "class-b",
    name: "목요 심화반",
    grade: "중2",
    userId: VIEWER_ID,
    user: { name: "원장님" },
    _count: { students: 6 },
    progresses: [
      { unit: { chapter: "연립방정식", section: "연립방정식의 풀이" } },
    ],
  },
  {
    id: "class-c",
    name: "걷기반",
    grade: "중2",
    userId: "role-2",
    user: { name: "걷기원장" },
    _count: { students: 1 },
    progresses: [],
  },
];

const ROUTES = [
  {
    route: "studio",
    GET: () =>
      studioOverview(new Request("https://math.example/api/studio/overview")),
    env: "production",
  },
  { route: "dev", GET: () => devOverview(), env: "development" },
] as const;

const CASES = [
  { who: "관리자 아님", isAdmin: false },
  { who: "관리자", isAdmin: true },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: VIEWER_ID, role: "director" },
  });
  vi.mocked(db.class.count).mockResolvedValue(7);
  vi.mocked(db.student.count).mockResolvedValue(23);
});
afterEach(() => vi.unstubAllEnvs());

describe.each(ROUTES)("overview($route)", ({ GET, env }) => {
  describe.each(CASES)("$who", ({ isAdmin }) => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", env);
      vi.mocked(getSessionUser).mockResolvedValue({
        id: VIEWER_ID,
        name: "Teacher",
        email: "teacher@example.test",
        isAdmin,
        isSuperAdmin: isAdmin,
      });
      // 관리자 아님이면 실제 DB 는 조인 칸을 안 준다 — 모킹도 그 모양으로
      vi.mocked(db.class.findMany).mockResolvedValue(
        (isAdmin
          ? ROWS
          : ROWS.map((row) => {
              const { userId, user, ...rest } = row;
              void userId;
              void user;
              return rest;
            })) as never,
      );
    });

    it(
      isAdmin
        ? "반마다 담당 — 세 반 안에서 내 반이 맨 위"
        : "🔴 조회 인자도 응답도 그대로 — owner 키가 없다",
      async () => {
        const res = await GET();
        expect(res.status).toBe(200);
        const text = await res.text();
        const body = JSON.parse(text) as {
          data: { classes: { id: string; owner?: unknown }[] };
        };
        const args = vi.mocked(db.class.findMany).mock.calls[0]![0] as {
          select: Record<string, unknown>;
          take: number;
          orderBy: unknown;
        };
        // 고르는 세 반은 지금 그대로 — 최근 등록 셋
        expect(args.take).toBe(3);
        expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "asc" }]);

        if (!isAdmin) {
          expect(args.select).not.toHaveProperty("user");
          expect(args.select).not.toHaveProperty("userId");
          expect(text).not.toContain('"owner"');
          expect(body.data.classes.map((c) => c.id)).toEqual([
            "class-a",
            "class-b",
            "class-c",
          ]);
          return;
        }

        expect(args.select).toMatchObject({
          userId: true,
          user: { select: { name: true } },
        });
        expect(body.data.classes.map((c) => [c.id, c.owner])).toEqual([
          ["class-b", { name: "원장님", mine: true }],
          ["class-a", { name: "이어하기선생님", mine: false }],
          ["class-c", { name: "걷기원장", mine: false }],
        ]);
      },
    );
  });
});
