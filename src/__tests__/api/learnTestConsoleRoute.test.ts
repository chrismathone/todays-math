// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  session: null as unknown,
  loginId: "test_s",
  disabled: false,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  accountUpdates: [] as unknown[],
  lectureDeletes: 0,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
vi.mock("@/lib/db", () => ({
  db: {
    studentAccount: {
      findUnique: async () => ({
        loginId: f.loginId,
        disabledAt: f.disabled ? new Date() : null,
      }),
      update: async (args: unknown) => {
        f.accountUpdates.push(args);
        return {};
      },
    },
    student: {
      findUnique: async () => ({ name: "test_s", class: { name: "테스트반" } }),
    },
    conceptLectureView: {
      count: async () => 2,
      deleteMany: async () => {
        f.lectureDeletes++;
        return { count: 2 };
      },
    },
    studentSrsState: {
      findUnique: async ({ where }: { where: { studentId: string } }) =>
        structuredClone(f.rows.get(where.studentId) ?? null),
      create: async ({
        data,
      }: {
        data: { studentId: string; revision: number; payload: unknown };
      }) => {
        if (f.rows.has(data.studentId)) throw { code: "P2002" };
        f.rows.set(data.studentId, structuredClone(data));
        return data;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { studentId: string; revision: number };
        data: { payload: unknown };
      }) => {
        const row = f.rows.get(where.studentId);
        if (!row || row.revision !== where.revision) return { count: 0 };
        f.rows.set(where.studentId, {
          ...row,
          revision: row.revision + 1,
          payload: structuredClone(data.payload),
        });
        return { count: 1 };
      },
      deleteMany: async ({ where }: { where: { studentId: string } }) => {
        const had = f.rows.delete(where.studentId);
        return { count: had ? 1 : 0 };
      },
    },
  },
}));

import { GET, POST } from "@/app/api/learn/test-console/route";
import { testConsoleResponseSchema } from "@/contracts/testConsole.contract";
import { TEST_CLOCK_COOKIE } from "@/lib/learn/testConsole";
import { learnNow } from "@/lib/learn/testConsoleServer";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { emptyFading, pickFadingConcept } from "@/lib/fading/state";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const base = "http://localhost:3000";
const url = `${base}/api/learn/test-console`;
const read = (cookie?: string) =>
  GET(new Request(url, { headers: cookie ? { cookie } : {} }));
const post = (body: unknown, origin = base) =>
  POST(
    new Request(url, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
const view = async (response: Response) => {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return testConsoleResponseSchema.parse(await response.json()).data;
};
const stored = () =>
  parseSrsState(structuredClone(f.rows.get(f.studentId)!.payload));

beforeEach(() => {
  f.session = {
    student: {
      accountId: "a0000000-0000-4000-8000-000000000001",
      studentId: f.studentId,
      name: "test_s",
      mustChangePassword: false,
    },
  };
  f.loginId = "test_s";
  f.disabled = false;
  f.rows.clear();
  f.accountUpdates = [];
  f.lectureDeletes = 0;
});

describe("🔴 테스트 도구판 — 시험용 계정에만 열린다", () => {
  it("로그인 안 한 요청은 401", async () => {
    f.session = null;
    expect((await read()).status).toBe(401);
  });

  it("다른 학생에게는 있는지조차 말하지 않는다(404) — 읽기·쓰기 모두", async () => {
    f.loginId = "kim01";
    expect((await read()).status).toBe(404);
    expect((await post({ type: "reset", part: "all" })).status).toBe(404);
  });

  it("끈 시험 계정도 404", async () => {
    f.disabled = true;
    expect((await read()).status).toBe(404);
  });

  it("다른 사이트에서 온 쓰기는 403", async () => {
    expect(
      (await post({ type: "reset", part: "all" }, "https://evil.example"))
        .status,
    ).toBe(403);
  });

  it("첫 로그인 상태에서도 열린다(도구판이 만든 상태를 되돌려야 하니)", async () => {
    f.session = {
      student: {
        ...(f.session as { student: object }).student,
        mustChangePassword: true,
      },
    };
    expect((await read()).status).toBe(200);
  });
});

describe("상태 읽기", () => {
  it("기록이 없으면 비어 있고 스냅샷 원본도 null", async () => {
    const data = await view(await read());
    expect(data.loginId).toBe("test_s");
    expect(data.revision).toBe(0);
    expect(data.explorer).toBeNull();
    expect(data.payload).toBeNull();
    expect(data.offsetDays).toBe(0);
    expect(data.today).toBe(data.realToday);
    expect(data.counts.lectureViews).toBe(2);
    expect(data.sections.length).toBeGreaterThan(10);
  });
});

describe("바꾸기", () => {
  it("별·기지 단계·학년을 바꾸면 저장된다", async () => {
    const data = await view(
      await post({ type: "explorer", stars: 120, level: 3, grade: 5 }),
    );
    expect(data.explorer).toMatchObject({ stars: 120, level: 3, grade: 5 });
    expect(stored().explorers?.profile.stars).toBe(120);
    expect(data.message).toBeTruthy();
  });

  it("바꿀 값이 없는 탐험 요청은 400", async () => {
    expect((await post({ type: "explorer" })).status).toBe(400);
  });

  it("전체 초기화는 행을 지운다", async () => {
    await post({ type: "explorer", stars: 3 });
    expect(f.rows.has(f.studentId)).toBe(true);
    const data = await view(await post({ type: "reset", part: "all" }));
    expect(f.rows.has(f.studentId)).toBe(false);
    expect(data.revision).toBe(0);
  });

  it("부분 초기화 — 탐험만 지운다", async () => {
    await post({ type: "explorer", stars: 3 });
    await view(await post({ type: "reset", part: "explorers" }));
    expect(stored().explorers).toBeUndefined();
  });

  it("부분 초기화 — 오늘의 기억(새 앱)의 칸만 지운다", async () => {
    await post({ type: "explorer", stars: 3 });
    const row = f.rows.get(f.studentId)!;
    row.payload = {
      ...(row.payload as object),
      fading: pickFadingConcept(emptyFading(), "m2-01-01-c1", "2026-10-06"),
    };
    expect(stored().fading).toBeDefined();
    await view(await post({ type: "reset", part: "fading" }));
    expect(stored().fading).toBeUndefined();
    expect(stored().explorers).toBeDefined();
  });

  it("스냅샷 되돌리기 — 계약에 맞는 원본만 받는다", async () => {
    const snapshot = {
      ...emptySrsState(),
      explorers: createExplorerState(f.studentId, 4),
    };
    snapshot.explorers.profile.stars = 77;
    snapshot.explorers.profile.earned = 77;
    const data = await view(await post({ type: "restore", payload: snapshot }));
    expect(data.explorer?.stars).toBe(77);

    const bad = await post({ type: "restore", payload: { version: 9 } });
    expect(bad.status).toBe(400);
    expect(stored().explorers?.profile.stars).toBe(77);
  });

  it("첫 로그인 상태로 · 강의 시청 기록 지우기", async () => {
    await view(await post({ type: "must-change-password" }));
    expect(f.accountUpdates).toEqual([
      {
        where: { studentId: f.studentId },
        data: { mustChangePassword: true },
      },
    ]);
    await view(await post({ type: "clear-lecture-views" }));
    expect(f.lectureDeletes).toBe(1);
  });
});

describe("시간 이동", () => {
  it("날 수를 쿠키로 내려 주고, 도구판의 오늘이 그만큼 옮겨진다", async () => {
    const response = await post({ type: "clock", offsetDays: 3 });
    const data = await view(response);
    expect(data.offsetDays).toBe(3);
    expect(data.today).not.toBe(data.realToday);
    const cookie = response.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain(`${TEST_CLOCK_COOKIE}=3`);
    expect(cookie).toContain("HttpOnly");

    const again = await view(await read(`${TEST_CLOCK_COOKIE}=3`));
    expect(again.offsetDays).toBe(3);
  });

  it("0 으로 되돌리면 쿠키를 지운다", async () => {
    const response = await post({ type: "clock", offsetDays: 0 });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("범위 밖은 400", async () => {
    expect((await post({ type: "clock", offsetDays: 400 })).status).toBe(400);
  });

  it("🔴 학습 API 의 «지금» — 시험 계정만 옮겨지고, 다른 학생은 쿠키를 지어 보내도 그대로", async () => {
    const real = new Date("2026-09-28T03:00:00.000Z");
    const req = new Request(url, {
      headers: { cookie: `${TEST_CLOCK_COOKIE}=2` },
    });
    expect((await learnNow(f.studentId, req, real)).toISOString()).toBe(
      "2026-09-30T03:00:00.000Z",
    );
    f.loginId = "kim01";
    expect(await learnNow(f.studentId, req, real)).toBe(real);
    expect(await learnNow(f.studentId, new Request(url), real)).toBe(real);
  });
});
